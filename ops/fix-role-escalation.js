#!/usr/bin/env node
/* Stop a signed-in user from giving themselves — or a colleague — a higher role.
 *
 * Run ON 142.93.121.121:   node fix-role-escalation.js
 *
 * THE HOLE
 * --------
 * POST /api/user/update/:uuid?  and  POST /api/user/assign-role-bulk-users
 * both sit behind AuthMiddleware only. That middleware establishes WHO the
 * caller is and never WHAT they may do — there is no authorisation middleware
 * anywhere in this service. Both handlers scope their target lookup to the
 * caller's company, so this cannot cross companies, but neither checks the
 * caller's own role. Any signed-in person can therefore raise their own role,
 * or anyone else's in their company, to ADMIN.
 *
 * THE RULES APPLIED HERE
 * ---------------------
 *   1. Only ADMIN and SUB-ADMIN may change anyone's role.
 *   2. Nobody may change their OWN role, at any level. This is what actually
 *      closes self-escalation.
 *   3. Only ADMIN may grant the ADMIN role. Without this a SUB-ADMIN could
 *      promote a colleague to ADMIN and escalate by proxy.
 *
 * WHY THE CHECK IS ON THE ROLE NAME
 * ---------------------------------
 * `users.role` is inconsistent — roughly half the rows hold a role uuid rather
 * than a name. Checked against the live database on 29 Aug 2026:
 *
 *     uuid -> MANAGER   2001      MANAGER     1994
 *     SUB-ADMIN           33      ADMIN         18
 *     uuid -> SUB-ADMIN    3      AGENT          4
 *
 * Every actual administrator holds the literal string "ADMIN", none of the
 * uuid-valued rows resolve to ADMIN, and none are unresolved. So a name check
 * is safe TODAY. If that column is ever cleaned up, re-check this assumption —
 * a uuid-valued ADMIN would be silently denied by rule 1.
 *
 * In update() the role fields are STRIPPED rather than the request rejected, so
 * an ordinary profile save that echoes the current role back still succeeds.
 * The bulk endpoint exists only to change roles, so it refuses outright.
 *
 * Safe to run twice. Backs up first. Refuses if the code is not as expected.
 */
'use strict';
const fs = require('fs');

const PATH = '/var/www/prod/default-api/dist/controllers/UserController.js';
const BACKUP = PATH + '.bak-role-escalation';
const MARK = 'callerMayAssignRoles';

let src = fs.readFileSync(PATH, 'utf8');

if (src.includes(MARK)) {
  console.log('Already patched. Nothing changed.');
  process.exit(0);
}

const edits = [];
function replaceOnce(find, replace, label) {
  const n = src.split(find).length - 1;
  if (n !== 1) {
    console.error(`FAILED: "${label}" matched ${n} times, expected exactly 1.`);
    console.error('The file is not what this script expects. Nothing written.');
    process.exit(1);
  }
  src = src.replace(find, replace);
  edits.push(label);
}

/* ---- 1. update(): decide once, right after the body is destructured ---- */
const destructure =
  'let { first_name, last_name, profile, job_title, settings, greetings, caller_id, role_uuid = null, custom_role_uuid = null, call_forwarding, } = req.body;';

replaceOnce(
  destructure,
  destructure + `
            /* Who may change a role. See the header of this patch for the rules
               and for why the check is on the role NAME. */
            const callerRole = String((userData === null || userData === void 0 ? void 0 : userData.role) || "");
            const callerMayAssignRoles = ["ADMIN", "SUB-ADMIN"].includes(callerRole);
            const isSelfEdit = String(uuid || "") === String((userData === null || userData === void 0 ? void 0 : userData.uuid) || "");
            const roleChangeAllowed = callerMayAssignRoles && !isSelfEdit;
            if (!roleChangeAllowed) {
                role_uuid = null;
                custom_role_uuid = null;
            }`,
  'update(): compute permission and strip role uuids'
);

/* ---- 2. update(): the settings.role path (a plain name string) ---- */
replaceOnce(
  'if (roleFromSettings && !isRoleUuidLike) {',
  'if (roleChangeAllowed && roleFromSettings && !isRoleUuidLike) {',
  'update(): gate the settings.role path'
);

/* ---- 3. update(): the resolved-label path, plus rule 3 ---- */
replaceOnce(
  `            if (resolvedRoleLabel) {
                obj["role"] = resolvedRoleLabel;`,
  `            /* Rule 3: only an ADMIN may grant ADMIN, so a SUB-ADMIN cannot
               escalate by promoting somebody else. */
            if (resolvedRoleLabel && String(resolvedRoleLabel).toUpperCase() === "ADMIN" && callerRole !== "ADMIN") {
                resolvedRoleLabel = null;
                role_uuid = null;
                custom_role_uuid = null;
            }
            if (roleChangeAllowed && resolvedRoleLabel) {
                obj["role"] = resolvedRoleLabel;`,
  'update(): gate the resolved-label path and restrict granting ADMIN'
);

/* ---- 4. the bulk endpoint: refuse outright ---- */
replaceOnce(
  `            const userData = req.auth;
            const { role_uuid, users } = req === null || req === void 0 ? void 0 : req.body;`,
  `            const userData = req.auth;
            const { role_uuid, users } = req === null || req === void 0 ? void 0 : req.body;
            /* This endpoint exists only to change roles, so it refuses rather
               than silently stripping. */
            const callerRole = String((userData === null || userData === void 0 ? void 0 : userData.role) || "");
            if (!["ADMIN", "SUB-ADMIN"].includes(callerRole)) {
                return _super.sendError.call(this, res, "You do not have permission to change roles");
            }`,
  'assignBulkRoleToUser: require ADMIN or SUB-ADMIN'
);

/* ---- 5. the bulk endpoint: no self-promotion, and only ADMIN grants ADMIN ---- */
replaceOnce(
  `            if (systemRole) {
                roleLabel = systemRole.name;`,
  `            if (userUuids.includes(String((userData === null || userData === void 0 ? void 0 : userData.uuid) || ""))) {
                return _super.sendError.call(this, res, "You cannot change your own role");
            }
            if (systemRole && String(systemRole.name).toUpperCase() === "ADMIN" && callerRole !== "ADMIN") {
                return _super.sendError.call(this, res, "Only an administrator can grant the administrator role");
            }
            if (systemRole) {
                roleLabel = systemRole.name;`,
  'assignBulkRoleToUser: block self-promotion and non-admin ADMIN grants'
);

fs.copyFileSync(PATH, BACKUP);
fs.writeFileSync(PATH, src);

console.log('Patched ' + PATH);
console.log('Backup:  ' + BACKUP);
edits.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
console.log('\nNext:');
console.log('  node --check ' + PATH);
console.log('  pm2 restart default-api');

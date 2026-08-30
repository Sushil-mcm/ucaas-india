"""Stop somebody rewriting the permissions of the role they are signed in as.

WHY

`POST /api/user/role/custom/upsert` is mounted with `AuthMiddleware` and nothing
else, and the handler updates any role matching `{ uuid, company_uuid }`. So any
signed-in person could rewrite the permission tree of any custom role in their
company - including the one they are currently assigned.

Today that only buys extra menu items, because nothing server-side reads the
permission tree. It becomes a real privilege escalation the moment the API
starts enforcing permissions, which is exactly the direction this product is
going. The order matters: close it before enforcement lands, not after.

WHY THIS RULE, AND NOT "ADMINS ONLY"

The obvious guard is to require ADMIN or SUB-ADMIN, the way the role-assignment
patch does. It is the wrong tool here. Roughly half the user records hold a raw
uuid in the `role` column instead of a role name, so a name check reads as "not
an admin" for those people. Applied to role editing, that would lock real
administrators out of managing roles at all - a functional break, to close a
hole that has a narrower fix.

The narrower fix is the one that matches the actual danger: **you may not edit
the role you are currently assigned.** That removes the escalation path without
gating on a column that cannot be trusted. Editing other roles still works, so
nobody legitimate is stopped.

It closes fully because the two halves are already covered: this stops you
raising your own role, and the existing role-assignment guard stops you giving
yourself a different one (`callerMayAssignRoles && !isSelfEdit` in
UserController). Creating a powerful new role remains possible and remains
useless, because you cannot assign it to yourself.

Written to verify its own assumptions and to be a no-op if already applied.
"""

import pathlib
import sys

path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "Roles/index.js")
source = path.read_text()

MARKER = "callerOwnRoleUuids"
if MARKER in source:
    print("already patched - nothing to do")
    sys.exit(0)

# The first two lines of the handler, exactly as they are today. Matching both
# means a file that has drifted fails here rather than being half-patched.
anchor = """            const { company_uuid } = req.auth;
            const { uuid, name, role_uuid, permission, description } = req.body;"""

if source.count(anchor) != 1:
    raise SystemExit(
        "ABORT: expected exactly one upsertCustomRole opening, found %d - the file has changed"
        % source.count(anchor)
    )

guard = """            const { company_uuid } = req.auth;
            const { uuid, name, role_uuid, permission, description } = req.body;
            /* You may not edit the role you are signed in as.
               Without this, anybody signed in could rewrite their own role's
               permissions. The check is on which role the caller holds rather
               than on their role NAME, because about half of all user records
               carry a raw uuid in the name column - a name check would lock
               real administrators out of managing roles at all. */
            const callerOwnRoleUuids = [req.auth?.custom_role_uuid, req.auth?.role_uuid]
                .map((value) => String(value || "").trim())
                .filter(Boolean);
            if (uuid && callerOwnRoleUuids.includes(String(uuid).trim())) {
                return res.status(403).send({
                    success: false,
                    error: {
                        message: "You cannot change the permissions of the role you are signed in as. Ask another administrator to make this change.",
                    },
                });
            }"""

source = source.replace(anchor, guard, 1)

# Twice: once declared, once used. Asserting on the count rather than mere
# presence is what would catch the guard being inserted twice.
assert source.count(MARKER) == 2, "expected the guard declared once and used once"
assert source.count("You cannot change the permissions") == 1, "expected one refusal message"

path.write_text(source)
print("patched: a person can no longer edit the role they are signed in as")

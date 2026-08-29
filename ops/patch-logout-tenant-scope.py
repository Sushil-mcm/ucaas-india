#!/usr/bin/env python3
"""Scope admin force-logout to the admin's own company.

Run ON 142.93.121.121:   python3 patch-logout-tenant-scope.py

Background
----------
AuthController.logout() already stops a normal user ending anyone else's
sessions: a non-privileged caller falls back to their own uuid. But logOutUser
(line ~3248) builds `whereCond = { user_uuid }` and calls destroy() with no
company_uuid anywhere. So an ADMIN of one company who has a uuid belonging to
another company can destroy that person's sessions.

This adds the missing check: a company ADMIN may only target people in their own
company. GLOBAL is platform-level and stays unscoped.

Safe to run twice — it detects its own work and exits without changing anything.
Takes a .bak first. Verify with `node --check` before restarting.
"""
import shutil, sys

PATH = '/var/www/prod/default-api/dist/controllers/AuthController.js'
BACKUP = PATH + '.bak-logout-tenant-scope'

NEW = '''                /* A company ADMIN may only end sessions for people in their own
                   company. GLOBAL is platform-level and stays unscoped. Without
                   this, logOutUser scopes on user_uuid alone, so an admin holding
                   a uuid from another customer can destroy that person's sessions. */
                if (requestedUuid && String((authUser === null || authUser === void 0 ? void 0 : authUser.role) || "") !== "GLOBAL") {
                    const targetUser = yield User_1.default.findOne({
                        where: {
                            uuid: String(requestedUuid).trim(),
                            company_uuid: authUser === null || authUser === void 0 ? void 0 : authUser.company_uuid,
                        },
                        attributes: ["uuid"],
                    });
                    if (!targetUser) {
                        return _super.sendError.call(this, res, "User not found");
                    }
                }'''

lines = open(PATH).read().split('\n')

try:
    i = next(k for k, l in enumerate(lines)
             if 'const isPrivileged = ' in l and 'ADMIN' in l)
except StopIteration:
    sys.exit('Could not find the isPrivileged line. The file has changed — '
             'stop and re-read logout() before patching by hand.')

if 'company_uuid' in '\n'.join(lines[i:i + 20]):
    print('Already patched. Nothing changed.')
    sys.exit(0)

if 'requestedUuid' not in lines[i + 1] or 'normalizedUserUuid = ' not in lines[i + 2]:
    sys.exit('The two lines after isPrivileged are not what was expected.\n'
             f'  +1: {lines[i + 1].strip()[:90]}\n'
             f'  +2: {lines[i + 2].strip()[:90]}\n'
             'Stop and patch by hand.')

shutil.copy2(PATH, BACKUP)
lines[i + 2:i + 2] = NEW.split('\n')
open(PATH, 'w').write('\n'.join(lines))

print(f'Patched. Backup: {BACKUP}')
print('Next:')
print('  node --check ' + PATH)
print('  pm2 restart default-api')
print('  # then confirm the process started AFTER the file was written:')
print(f'  stat -c "file:    %y" {PATH}')
print('  ps -o lstart= -p $(pm2 pid default-api)')

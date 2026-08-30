"""Require a sign-in before the server's log files can be read.

WHY

`/api/logs/file` listed every log file on the server, and `/api/logs/<name>`
served its contents, to anybody who asked. No token, no session, nothing:

    curl https://api2.mycountrymobile.com/api/logs/file
      -> ["api.log","combined-2026-08-27.log", ... ,"requests-2026-08-30.log"]

    curl https://api2.mycountrymobile.com/api/logs/requests-2026-08-30.log
      -> 200, 1,466,659 bytes

Request logs carry the URLs, headers and bodies of real customer traffic. This
was a live data exposure, not a theoretical one, and it needed no account to
reach.

The three routes were mounted with no middleware at all while every other route
in this service carries `AuthMiddleware`. Nothing in the web app calls these
endpoints and no request for them appears in the service's own logs, so
requiring a sign-in breaks nothing that was working.

WHY NOT ADMIN-ONLY

Ideally reading server logs would be restricted further than "any signed-in
user". That check is a bigger change with more ways to be wrong, and this file
is compiled output that cannot be rebuilt from source. Closing an anonymous hole
today is worth more than closing a narrower one next week; tightening to admin
is the obvious follow-up.

This patch is written to verify its own assumptions and to be a no-op if it has
already been applied.
"""

import pathlib
import sys

path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "logRoute.js")
source = path.read_text()

AUTH_IMPORT = (
    'const AuthMiddleware_1 = __importDefault(require("../middlewares/AuthMiddleware"));\n'
)

if "AuthMiddleware" in source:
    print("already patched - nothing to do")
    sys.exit(0)

# The three routes exactly as they are today. Matching the whole line means a
# file that has drifted fails loudly here rather than being half-patched.
ROUTES = [
    ('logRoute.get("/", (0, responseHelper_1.catchErrors)(Main.view));',
     'logRoute.get("/", AuthMiddleware_1.default, (0, responseHelper_1.catchErrors)(Main.view));'),
    ('logRoute.get("/file", (0, responseHelper_1.catchErrors)(Main.list));',
     'logRoute.get("/file", AuthMiddleware_1.default, (0, responseHelper_1.catchErrors)(Main.list));'),
    ('logRoute.get("/:filename", (0, responseHelper_1.catchErrors)(Main.fileDetail));',
     'logRoute.get("/:filename", AuthMiddleware_1.default, (0, responseHelper_1.catchErrors)(Main.fileDetail));'),
]

for old, _ in ROUTES:
    if source.count(old) != 1:
        raise SystemExit("ABORT: expected exactly one %r, found %d - the file has changed"
                         % (old[:48], source.count(old)))

# The import goes beside the other requires, before the router is built.
anchor = 'const LogController_1 = __importDefault(require("../controllers/log/LogController"));\n'
if source.count(anchor) != 1:
    raise SystemExit("ABORT: could not find the controller import to anchor to")
source = source.replace(anchor, anchor + AUTH_IMPORT, 1)

for old, new in ROUTES:
    source = source.replace(old, new, 1)

# Prove the result rather than trusting the replacements.
assert source.count("AuthMiddleware_1.default") == 3, "expected three guarded routes"
assert source.count('require("../middlewares/AuthMiddleware")') == 1, "expected one import"

path.write_text(source)
print("patched: three log routes now require a sign-in")

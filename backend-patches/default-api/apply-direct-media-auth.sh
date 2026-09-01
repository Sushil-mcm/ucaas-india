#!/usr/bin/env bash
#
# Close the media route that serves files to anybody, with no login.
#
# NOT APPLIED. Written 1 Sep 2026. The write to the API box was refused by a
# permission rule in the session that wrote it, so this is ready and unrun.
#
# THE HOLE
#
# default-api mounts six media routes. Five carry AuthMiddleware. One does not:
#
#   dist/routers/mediaRoute.js:17
#   mediaRoute.get("/direct/:uuid/:type/:file_name", catchErrors(getDirectMediaFile));
#
# Confirmed in the RUNNING dist on api2, not only in source - the file is plain
# readable JS and line 17 is the only GET with no middleware.
#
# Proved live from the open internet, no credentials of any kind:
#
#   GET https://api.mycountrymobile.com/api/media/direct/default/recording/<file>.mp3
#     -> HTTP 200, 12068 bytes, real MP3 (LAME header in the body)
#
#   Control, the sibling route one path segment away:
#   GET https://api.mycountrymobile.com/api/media/<uuid>/recording/<file>.wav
#     -> HTTP 401 {"message":"Authorization header missing"}
#
#   Second control, that the open route reaches storage rather than being
#   blocked somewhere upstream:
#   GET .../api/media/direct/<company_uuid>/recording/nonexistent.wav
#     -> HTTP 404 "Request failed with status code 404","service":"MEDIA"
#      - a storage miss, so a real file name would have been served.
#
# The 200 above is a system default announcement, not a customer's audio. The
# point is the route: it takes :uuid and :type from the URL and asks storage for
# `<uuid>/<type>/<file>` with nobody checked. A company uuid is not a secret -
# it is in the URL bar and in most API responses. So call recordings, greetings,
# logos, MMS and chat attachments are all one guessed file name from being
# public. Recordings are the reason this matters now: nothing has recorded yet,
# so the exposure is currently theoretical for call audio and real for
# everything else already in the bucket.
#
# WHY IT IS UNAUTHENTICATED - it is not an oversight, it is one narrow need
# generalised too far. Two callers legitimately need an outside party to fetch:
#
#   fax             src/pages/inbox/send-fax-modal/index.tsx:158 builds this URL
#                   and hands it to the fax carrier, which has no token.
#   video_recording video-api MeetingRepository.ts:1553,1694 builds it for
#                   meeting recording links opened by people with no account.
#
# Those are the only two consumers anywhere in the frontend or the 20 backend
# repos. So an allow-list breaks nothing and closes everything else.
#
# WHAT THIS DOES NOT DO. fax and video_recording stay fetchable by anyone with
# the URL. That is unguessable-URL security, which is the normal shape for a
# carrier callback, but it is not a lock. Making those two safe needs signed,
# expiring URLs - a design change, not a guard, and a separate decision.
#
set -euo pipefail
HOST="${1:-root@142.93.121.121}"
F=/var/www/prod/default-api/dist/routers/mediaRoute.js

echo "== before =="
ssh "$HOST" "grep -n 'direct/:uuid' $F"

echo "== backup =="
ssh "$HOST" "cp $F $F.bak-directguard-\$(date +%Y%m%d-%H%M%S) && ls -1t $F.bak-* | head -1"

echo "== patch =="
ssh "$HOST" "python3 - <<'PY'
import io
p = \"$F\"
s = io.open(p, encoding='utf-8').read()
old = 'mediaRoute.get(\"/direct/:uuid/:type/:file_name\", (0, responseHelper_1.catchErrors)(getDirectMediaFile));'
new = '''// Media served with NO login at all. This route exists so an outside party can
// fetch a file, and only two kinds of file genuinely need that:
//   fax             - the URL is handed to the fax carrier, which has no token
//   video_recording - meeting links are opened by people with no account here
// Every other type used to be fetchable by anyone who knew a company uuid and a
// file name, call recordings included. Those now need a signed-in caller and the
// authenticated route above.
const DIRECT_PUBLIC_TYPES = new Set([\"fax\", \"video_recording\"]);
const directTypeGuard = (request, response, next) => {
    const type = String((request.params && request.params.type) || \"\");
    if (DIRECT_PUBLIC_TYPES.has(type)) {
        return next();
    }
    return response.status(401).json({
        success: false,
        error: { message: \"Authentication required\", service: \"MEDIA\" },
    });
};
mediaRoute.get(\"/direct/:uuid/:type/:file_name\", directTypeGuard, (0, responseHelper_1.catchErrors)(getDirectMediaFile));'''
assert s.count(old) == 1, 'expected 1 occurrence, found %d' % s.count(old)
io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
print('    edited')
PY"

echo "== syntax =="
ssh "$HOST" "node --check $F && echo '    ok'"

echo "== restart =="
ssh "$HOST" "pm2 restart default-api && sleep 3 && pm2 describe default-api | grep -i status"

cat <<'CHECKS'

== verify from anywhere, no credentials ==

  # was 200 with real audio, must now be 401
  curl -s -o /dev/null -w '%{http_code}\n' \
    https://api.mycountrymobile.com/api/media/direct/default/recording/ad98d65d-fcf8-4d4d-bc77-ee1426c34333.mp3

  # control - fax must still reach storage (404 on a made-up name, NOT 401)
  curl -s -o /dev/null -w '%{http_code}\n' \
    https://api.mycountrymobile.com/api/media/direct/00000000-0000-0000-0000-000000000000/fax/nope.pdf

  # control - the authenticated sibling is unchanged
  curl -s -o /dev/null -w '%{http_code}\n' \
    https://api.mycountrymobile.com/api/media/00000000-0000-0000-0000-000000000000/recording/nope.wav

A 401 on the first, 404 on the second and 401 on the third is the pass. A 401 on
the second means fax sending has been broken and this must be rolled back.

== also needed ==

  * The same file on the other API boxes - api3 (151.106.57.254) and api4
    (167.99.4.91) serve unified3/5 and unified2/4. Check each before assuming
    api2 is the whole exposure.
  * The same one-line change in source, mcm-repos/default-api/src/routers/
    mediaRoute.ts:23, or the next build reopens it. See F8 in the audit tracker:
    the running dist is already ahead of source in four places.

== revert ==

  ssh HOST "cp \$(ls -1t $F.bak-directguard-* | head -1) $F && pm2 restart default-api"
CHECKS

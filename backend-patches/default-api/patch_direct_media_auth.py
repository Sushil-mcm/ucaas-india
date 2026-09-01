"""Require a login on the media route that currently asks nobody who they are.

default-api mounts six media routes. Five carry AuthMiddleware. This one does
not, so anyone who knows a company uuid and a file name can download the file:

    mediaRoute.get("/direct/:uuid/:type/:file_name", catchErrors(getDirectMediaFile));

Proved 1 Sep 2026 from the open internet with no credentials: a real file came
back 200 with real audio bytes, while the authenticated route one path segment
away answered 401, and a made-up name on the open route answered 404 from
storage - so a real name really would have been served.

It is unauthenticated for a reason, though, so it cannot simply be closed. Two
callers need an outsider to fetch a file and neither has a token:

    fax             the URL is handed to the fax carrier
    video_recording meeting links are opened by people with no account

Those are the only two consumers in the frontend or in any of the 20 backend
repos, so an allow-list of the two closes everything else - call recordings,
greetings, logos, MMS, chat attachments - and breaks nothing.

NOT closed by this: fax and video_recording stay fetchable by anyone holding the
URL. That is unguessable-URL security, normal for a carrier callback, but it is
not a lock. Making those private needs signed expiring URLs - a design decision.

Run:  python3 patch_direct_media_auth.py <path-to-dist/routers/mediaRoute.js>
Idempotent: exits 0 saying "already patched" if the guard is present.
Asserts a single match, so it either applies cleanly or writes nothing.
"""
import io
import sys

OLD = 'mediaRoute.get("/direct/:uuid/:type/:file_name", (0, responseHelper_1.catchErrors)(getDirectMediaFile));'

NEW = '''// Media served with NO login at all. This route exists so an outside party can
// fetch a file, and only two kinds of file genuinely need that:
//   fax             - the URL is handed to the fax carrier, which has no token
//   video_recording - meeting links are opened by people with no account here
// Every other type used to be fetchable by anyone who knew a company uuid and a
// file name, call recordings included. Those now need a signed-in caller and the
// authenticated route above.
const DIRECT_PUBLIC_TYPES = new Set(["fax", "video_recording"]);
const directTypeGuard = (request, response, next) => {
    const type = String((request.params && request.params.type) || "");
    if (DIRECT_PUBLIC_TYPES.has(type)) {
        return next();
    }
    return response.status(401).json({
        success: false,
        error: { message: "Authentication required", service: "MEDIA" },
    });
};
mediaRoute.get("/direct/:uuid/:type/:file_name", directTypeGuard, (0, responseHelper_1.catchErrors)(getDirectMediaFile));'''


def main(path):
    s = io.open(path, encoding="utf-8").read()
    if "DIRECT_PUBLIC_TYPES" in s:
        print("already patched, nothing to do")
        return
    found = s.count(OLD)
    if found != 1:
        raise SystemExit("REFUSING TO WRITE: %d matches (want 1) in %s" % (found, path))
    io.open(path, "w", encoding="utf-8").write(s.replace(OLD, NEW))
    print("patched")


if __name__ == "__main__":
    main(sys.argv[1])

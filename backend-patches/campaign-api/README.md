# campaign-api — its source, recovered from the bundle

`campaign-api` owns call queues. Like `default-api`, it ships only a build:
`/var/www/prod/campaign-api/dist/src/index.js`, a single 789KB webpack bundle,
with no `src` directory, no `.git` and no source maps. That made every change to
it look like hand-editing a minified blob on a live call path — which is not
something anybody should do.

It turns out that is not the situation. The bundle was built with an eval-based
devtool: each of the 86 modules sits inside its own `eval("…")` string, is
ordinary readable JavaScript rather than minified, and ends with a
`//# sourceURL=webpack://campaign-api/./src/…` comment naming the file it came
from.

So the code is recoverable, file by file, with its original tree shape.
`recovered-src/` is that recovery. `extract-modules.py` is how it was done, and
can be re-run whenever the service is rebuilt:

    scp mcm-new:/var/www/prod/campaign-api/dist/src/index.js ./bundle.js
    python3 extract-modules.py bundle.js recovered-src

## What this is, and what it is not

**It is** the compiled output of each original TypeScript file, readable and
reviewable. A change can be worked out and diffed against a named 262-line file
instead of guessed at inside a bundle.

**It is not** the TypeScript, and it is not buildable. Nothing here compiles
back into the running service. Do not treat `recovered-src/` as a checkout,
do not edit it expecting a build, and do not let it drift — re-run the extractor
rather than editing these files by hand.

To actually change the service, the module's text has to be edited **inside the
bundle**, where it lives as an escaped string inside `eval("…")`. That is a
surgical edit rather than a rewrite: find the module by its `sourceURL`, change
the one thing, keep the escaping intact, and check the result parses with
`node --check` before it goes anywhere near a restart. Always leave a dated
backup of the bundle beside it.

## The change this was recovered for

`recovered-src/src/schemas/queue.js` holds `settingsSchema`, which decides what a
queue is allowed to store. It accepts exactly:

    operational_hours, recording, display_number, ai_call_monitoring,
    transcription, wrapup_time, skills, ring_strategy, leave_room_if_no_agent,
    media

It is a plain `joi.object()` with no `.unknown()`, and the validator is called
with only `{ abortEarly: false }` — no `stripUnknown`, no `allowUnknown`. Joi
refuses unknown keys by default, so a save carrying anything else **fails
outright**; it is not quietly dropped.

The website was sending three keys that are not on that list — `waiting`,
`after_call` and `escalation` — so saving a queue was being refused. The website
has stopped sending them as a stopgap; the real fix is to add them here, with
bounds matching `WAITING_LIMITS` in
`src/pages/admin-settings/phone-systems/call-queue/constant.ts` so the two ends
cannot disagree.

One trap worth knowing before anybody greps: `waiting` **does** already appear in
this schema. It is `media.waiting` — a hold-audio file, `{ enabled, label, value }`
— and has nothing to do with announcing a caller's position. Finding it and
concluding the key exists is the easy mistake here.

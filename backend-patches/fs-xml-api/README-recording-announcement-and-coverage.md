# Recording, part two — announcement + coverage gaps

Companion to `apply-call-recording.sh`. That first patch made **one** thing work:
an **inbound call to a person** records both legs → uploads to Wasabi on hangup →
links to the call log. This patch closes the three gaps the on-screen note names.

Script: `apply-recording-announcement-and-coverage.sh`.

---

## The gaps, and how each is closed

| Gap | Cause (confirmed in the dialplan) | Fix in this patch |
|---|---|---|
| **Caller is never told** | `recording_actions()` starts the recorder but plays nothing; the switch holds **zero audio files** | Install one announcement clip on the switch; `recording_actions()` now plays it on the correct leg |
| **Outbound not recorded** | The recorder gate exists **only** on the EXTENSION branch, before its bridge | Add the same gate to the OUTBOUND branch, direction `"outbound"` |
| **Menu (IVR) / queue not recorded** | Same — no gate on the IVR or QUEUE branches | Add the gate to the IVR and QUEUE branches, direction `"inbound"` |

---

## Why the announcement plays on a different leg per direction

The party who must be told is always the **customer**, never the agent.

- **Inbound:** the customer is the **A-leg** (the caller). The notice is played
  inline *before* the bridge — the caller hears "this call may be recorded", then
  ringback. Implemented as a `playback` action in `recording_actions()`.
- **Outbound:** the customer is the **answered B-leg**. Playing inline would
  announce to the *agent placing the call* and leave the customer untold, so the
  notice is armed with `execute_on_answer=playback …` and fires when the far end
  answers.

The clip path lives in `config.lua` as `recording_announcement_path`. If the file
is ever missing, the call still records and FreeSWITCH logs a missing-file error —
a lost notice must never become a lost call.

---

## The one thing that cannot be guessed — the three branch anchors

`apply-call-recording.sh` only ever touched the EXTENSION branch, so its exact
bridge line is known and reused here as the template. The OUTBOUND / IVR / QUEUE
branches were never touched, and their exact bridge lines are **not** in this
repo (the dialplan lives on the switch at
`142.93.121.121:/opt/fs-xml-api-1.2.5/dialplan_service.py`).

So the script will **not** run its edits until you confirm them:

1. Run it once — **step 0 is read-only** and prints every `route_type == …`
   branch, every `bridge` line, and the current `recording_actions` definition:

   ```bash
   ./apply-recording-announcement-and-coverage.sh root@142.93.121.121
   ```

   It stops after step 0 (because `CONFIRMED` is not set) and changes nothing.

2. Compare the output to the three `branches` entries in **step 5** of the script.
   Fill in each branch's `bridge_anchor` (currently `None`) with the exact line
   from step 0 — the line the recorder must be inserted *before* (the outbound
   bridge to the gateway/sofia; the IVR entry app; the queue/`callcenter` app).
   The head anchors (`if route_type == "OUTBOUND":` etc.) are the expected shape —
   adjust if step 0 shows different text.

3. Re-run with confirmation:

   ```bash
   CONFIRMED=1 ./apply-recording-announcement-and-coverage.sh root@142.93.121.121
   ```

Every edit asserts it matched **exactly once** or aborts and changes nothing —
the same guard style as the first patch. A wrong or loosened anchor cannot
silently patch the wrong place.

---

## Announcement audio

Step 2 downloads the platform's **default "automatic recording" announcement**
(`…/api/media/default/recording/ad98d65d-…c34333.mp3`, the clip the Company Phone
Preferences dialog already references) and transcodes it to 8 kHz / 16-bit / mono
PCM with `sox` (or `ffmpeg`) at `/etc/freeswitch/sounds/mcm/recording-announcement.wav`.

**Confirm the clip actually says a recording notice** before trusting it in
production — if it does not, point `ANNOUNCE_SRC` at your own file. The step
refuses a sub-4 KB result so a failed transcode can't ship silence as a notice.

---

## BLOCKER before enabling for real customers (not fixed here, on purpose)

"Who may listen to call recordings" is enforced **in the browser only**. Until the
`media-api` retrieval endpoint checks that permission **server-side**, any
signed-in user could fetch any recording. This patch deliberately does not touch
the recording on/off policy — it only makes recording *behave correctly* for a
company that has already opted in for testing. **Do not switch recording on for
real customers until the server-side listen check lands.**

This is a separate change in `media-api` (the retrieval / `getMediaFile` path),
not in the dialplan. Worth doing in the same release as this patch.

---

## Verify after applying

The final step prints:

- `recording gates total` — was **1** after patch one; expect **4** now
  (EXTENSION + OUTBOUND + IVR + QUEUE).
- `announces (playback)` and `announcement wav present` — the notice is wired and
  the file exists.

Then place a **real test call in each path** — inbound to a person, outbound,
into an IVR, into a queue — and confirm: (a) the far party hears the notice, and
(b) the recording appears against the call in the call log.

## Rollback

Backups are stamped before any edit. To revert:

```bash
ssh root@142.93.121.121 "cp \$(ls -1t /opt/fs-xml-api-1.2.5/dialplan_service.py.bak-* | head -1) /opt/fs-xml-api-1.2.5/dialplan_service.py
   cp \$(ls -1t /etc/freeswitch/scripts/config.lua.bak-* | head -1) /etc/freeswitch/scripts/config.lua
   rm -f /etc/freeswitch/sounds/mcm/recording-announcement.wav
   systemctl restart fs-xml-api && systemctl is-active fs-xml-api"
```

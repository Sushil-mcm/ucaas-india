# Company — every section, what works, what to build

Control-by-control audit of `/admin-settings/company`, traced through to the
switch. Written as a build list for whoever picks the work up.

Every "does not work" below was checked against the running switch with a
control — a second search on the same file for something known to be present —
because a zero from a wrong path looks exactly like a real finding. Where a
control was used it is named.

The through-line: **the switch reads almost nothing this area writes.** Of
everything on these eleven sections, exactly one control changes what a caller
experiences — outgoing caller ID.

---

## The honesty problem, before the build problem

Sections carry a status badge: `active`, `app-only`, `coming-soon`. Most are
accurate. Two categories are not, and they matter more than the missing features,
because an admin acting on a wrong badge does not know they need a workaround.

**Labelled `active`, is not:**

| Screen | Badge says | Actually |
|---|---|---|
| Ringing & voicemail — Default ring time | Active | The switch hardcodes its ring duration: `call_timeout=30` (internal, line 255), `60` (outbound, 285), `30` (inbound, 327). It reads no stored value — `ring_time`, `company_ring_time`, `call_forwarding`, `ring_duration`, `timeout_seconds` all return 0, against a control of `EXTENSION` = 1. The setting is read only to pre-fill a box in the app. Set 15 seconds, callers still get 30. |
| Calling — the two transfer switches | "Active. …people are stopped from transferring" | True inside this app only. A registered SIP device never touches the web app, and there is a live registration today. |

**No badge at all, and nothing works.** These are worse than a wrong badge:
the screen makes no claim either way, so an admin assumes it works.

| Screen | Control | Reaches the switch? |
|---|---|---|
| Phone rules | When you are open (opening hours) | `business_hours` is read once as a destination. No clock comparison anywhere, no `after_hours`, no `closed`. A 2am call takes the daytime route. |
| Phone rules | Where this company works (country and time zone) | `timezone` — 0 |
| Phone rules | Call recording — automatic, on-demand, announce on start/stop | `record` / `recording` — 0. See below. |
| Phone rules | Transcription — write calls out as text | `transcri` — 0 |
| Phone rules | Call monitoring — look through transcripts automatically | `monitor` — 0 |
| Greetings | The whole section | `greeting`, `playback`, `media`, `welcome`, `moh`, `hold_music` — all 0. No company greeting is ever played to anybody. |
| Holidays | The whole section | `holiday` — 0 |

All of the above against the same control, `EXTENSION` = 1 on the same file.

**Call recording deserves its own note**, because it looks wired and is not.
Four recording scripts exist on the switch — `dual_leg_record.lua`,
`on_demand_recording.lua`, `record_with_prompt.lua`, `start_record.lua` — and a
naive search shows them "referenced by 4 files". Those references are the scripts
citing *each other*; no dialplan or config invokes any of them. FreeSWITCH does
have `record_session` available. Nothing calls it. There are **zero recordings on
disk**, which is the corroboration: not one call has ever been recorded.

---

## Section by section

### Phone rules — the default landing section
Five control groups, none carrying a badge, none reaching the switch: opening
hours, country/timezone, call recording, transcription, call monitoring.
**One control here works: "The number people see" (outgoing caller ID)** —
`caller_id` 9 and `effective_caller_id` 4 in the dialplan, and it is set on both
the internal and outbound legs.

### Greetings
Shares one form and one record with Phone rules. Stored correctly, played never.

### Ringing & voicemail
- Default ring time and "who it applies to" — badged `active`, see above.
- **Voicemail itself does not work.** `mod_voicemail` is commented out in
  `/etc/freeswitch/autoload_configs/modules.conf.xml` line 26:
  `<!--<load module="mod_voicemail"/>-->`. Not in `show modules`; nothing in
  `show application` starting `voicemail`; control `mod_dptools` returns 154 and
  `bridge` is listed, so the searches are sound. The `.so` is present and
  `voicemail.conf` is served correctly (200, unlike `callcenter.conf` at 400).
  Zero `.wav` files under the voicemail store.
- The other three controls are honest and need nothing: who may change voicemail
  settings (`app-only`), voicemail to text (`app-only`), voicemail PIN
  (`coming-soon`).

### Emergency address
Honest, and the pattern worth copying everywhere else: it warns on screen that it
does not route emergency calls, and will not save until you tick a box confirming
you understand.

### Holidays
No badge; never evaluated.

### Calling
The country list is honest — "no call is stopped by it yet". The two transfer
switches claim Active; scope that to this app.

### Messaging
All three accurate. "Outbound SMS/MMS from unregistered numbers" is badged
`active` and that is fair — its note says precisely what it does, which is warn
you before you send.

### Policies
All six accurate. Default language and default country are badged `active` and
genuinely are: language is read when greeting audio is generated, country when a
phone number is parsed. Recording access is `app-only`; voicemail policy, call
recording policy and data retention are `coming-soon`.

### Apply to people · Profile fields · Security
Honest throughout. Security correctly marks idle timeout `app-only` (it works)
and MFA, the IP allowlist and SAML `coming-soon`. Profile fields says its fields
"don't appear on anyone's profile yet".

---

## Build order

Sequenced by what unblocks the most, then by what an admin is most likely to be
burned by.

1. **Load `mod_voicemail`.** One commented line. Do it first because it is the
   destination everything else falls back to — queues, hours, call rules and
   number forwarding all end at voicemail, so building routing to a destination
   that does not exist buys nothing. Do not simply uncomment and walk away:
   whoever disabled it may have had a reason, and it can fail to load the way
   `mod_callcenter` does. Confirm with
   `show application | grep '^voicemail'` before testing a call.

2. **Correct the labels that are wrong.** Ring time from `active` to `app-only`
   with a note that the switch still rings for a fixed time; scope the two
   transfer switches to this app; give Phone rules, Greetings and Holidays the
   badges they have never had. This is an afternoon, and until the features
   land it is the only thing standing between an admin and a wrong decision.

3. **Evaluate the clock.** Business hours, after-hours and holidays. The data is
   already stored and already the right shape — `releaseDidForwarding` in
   default-api parses both `business_hours` and `closed_hours`, so this is a
   missing branch, not missing data.

4. **Call recording.** The scripts exist and FreeSWITCH has `record_session`;
   nothing invokes them. Automatic, on-demand and the two announcements are one
   feature, and the Policies section already has the access rules waiting.

5. **Ring time to the switch.** Replace the hardcoded 30/60/30 with the stored
   value, then flip the badge back to `active` in the same change.

6. **Company greetings.** Welcome and hold music, once there is a route that
   plays anything.

7. **Transcription and call monitoring.** Lowest priority of the set — both are
   about what happens after a call, and everything above is about whether the
   call works at all.

---

## The rule for whoever closes these

Change the badge in the **same commit** that changes the behaviour, in either
direction. Every wrong label in this document started as an accurate one that was
left behind when something moved. The ring-time file says it best in its own
header: *"An admin who believes they have shortened the ring and has not will
read every missed call as a fault somewhere else."*

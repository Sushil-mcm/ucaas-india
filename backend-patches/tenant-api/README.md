# tenant-api — making two company settings actually do something

**Not applied. Nothing on 142.93.121.121 has been changed.**

Admin screens in this product let people set company-wide rules that are saved
and then read by nothing. This patch takes the ones that can honestly be enforced
by `tenant-api` and enforces them, and fixes the storage bug that was quietly
splitting every company-wide rule in two.

`tenant-api` was chosen over `default-api` for a simple reason: it has source
code. `default-api` does not — only compiled output — so anything put there
cannot be rebuilt or maintained by anybody.

---

## What this changes, in one paragraph each

### 1. The company's rules stop being split in half

Company-wide settings are kept on one reserved row of the `user_template` table,
named `Company Default`. The list that row is fetched through only ever returned
rows created by the person asking. So the second admin to open Company info saw
nothing, was told "nothing has been saved yet", and saved a **second** copy. From
then on the company's rules sat across two records, neither admin able to see the
other's, and nothing able to say which was real.

This is not a worry, it is already happening. On 30 August 2026, of the nineteen
live companies:

| company database | `Company Default` rows | different authors |
|---|---|---|
| `mcm_1785312032037` | 1 | 1 |
| `mcm_1787814329776` | **2** | 2 |
| `mcm_1787817157170` | **2** | 2 |

On `mcm_1787814329776` one row held the call-recording and policy rules and the
other held the voicemail, holiday and display-number rules.

After this patch, every `Company Default` row is folded into one answer — most
recently saved wins, section by section — and that single folded record is what
every admin sees and what the server reads. Nothing is deleted. The older copy
simply stops winning. The first time anybody saves from any Company info screen,
the folded answer is written back to one row and the split heals itself.

One visible side effect, and it is the intended one. The template picker on the
Add/Edit person form reads the same list, so `Company Default` will now appear
there for every admin instead of only for whoever created it. That was expected
when the reserved row was designed — the comment at the top of
`src/lib/company-defaults.ts` says the name was chosen precisely because "it
reads correctly if it ever shows up in the ordinary template list, because it
will". Applying it to a person applies the company's own settings, which is a
sensible thing for it to do.

### 2. "Who may listen to call recordings" starts being obeyed

Admin ▸ Company info ▸ Policies has two switches: may people play back their own
calls, and may admins play back anybody's. Until now the only thing that read
them was the browser, which hid a play button — while the name of the recording
file was still sitting in the API response behind it.

Now `tenant-api` blanks the recording file name on its way out, for any call the
asking person is not allowed to hear. One gate on the way out, rather than the
same check copied onto the dozen endpoints that carry a recording, because a
check copied twelve times is a check somebody forgets on the thirteenth.

**Only a deliberate `false` restricts anything.** A company that has never opened
the Policies screen — which is nearly all of them — has no saved answer, and no
saved answer means allowed, which is exactly how the product behaves today. So
does an unreadable record, and so does a database that will not answer. Nothing
changes anywhere until an admin switches something off on purpose.

---

## What this does **not** do

Say this out loud before anybody tells a customer their recordings are private.

- **The audio file itself is still open.** Recordings are served by a different
  service from a plain web address, and that service does not ask who is
  requesting. Anyone who kept an old link can still play the file. Closing that
  is a separate job on the media service. What this patch buys is that the file
  name is no longer handed to people the company said should not have it, and
  that the admin's decision stops being decorative.
- **It does not touch anything `default-api` serves.** People, numbers, billing
  and sign-in all live there.
- **It does not change the website.** The "Who may listen to call recordings"
  card still says what it said. See "Then, in the website" at the bottom.

---

## Files

| File | Change |
|---|---|
| `src/helpers/recordingAccess.ts` | **new.** The rule itself. No database, no express, no imports at all — which is what lets it be tested on its own. |
| `src/helpers/companyDefaults.ts` | **new.** Reads the company's rules out of the company's own database, folds a split record into one, and holds the answer for a minute. Never throws. |
| `src/middlewares/RecordingAccessFilter.ts` | **new.** The gate on the way out. |
| `src/routers/api.ts` | **changed.** Two lines: an import, and one `this.router.use(...)` at the top of the route list. |
| `src/repositories/UserTemplateRepository.ts` | **changed.** The folded company row is put into the template list; the held copy is forgotten whenever a template is saved or deleted. |

The copies here are the complete files as they should end up, so you can read or
diff them directly against the server. `apply.sh` refuses to run if the two
changed files on the server are not the ones this patch was written against.

---

## What it costs

For a company that has switched nothing off — which is all of them today — the
filter reads one value from memory and hands the request straight on. Same
answer, same shape, same code path. The company's rules are re-read from the
database at most once a minute per company, and immediately after anybody saves.

Only when an admin has deliberately switched something off does the filter take
the answer apart, and then only for answers that mention a recording at all.

---

## Applying it

```
bash backend-patches/tenant-api/apply.sh
```

It backs up first, refuses to start if somebody else has edited either changed
file, builds, restarts through pm2, checks the service answers, and runs a smoke
test against the build that is now live. If the build fails or the service does
not come back, it puts everything back on its own and tells you so.

To undo, with the stamp it printed:

```
bash backend-patches/tenant-api/rollback.sh 20260830-141500
```

---

## Proving it works on a real company

Do both of these before telling anybody the recording rule is switched on.

**Check one — nothing broke.** Sign in as an ordinary person at a company that
has never opened the Policies screen. Open Reports ▸ Call logs. Every recording
that had a play button before must still have one. This is the check that
matters most: this patch is only worth having if it changes nothing until
somebody asks it to.

**Check two — it actually bites.** On a test company:

1. Sign in as an admin, open Admin ▸ Company info ▸ Policies, and switch
   **"Admins can play anyone's calls"** off. Save.
2. Open Reports ▸ Call logs and find a call that belongs to somebody else.
3. The play button is gone. Open the browser's network tab, find the
   `report/call-list` response, and look at that call's row: `recording_file`
   must be `null`. Before this patch it held a file name.
4. Find one of your **own** calls. It must still play.
5. Switch the setting back on, save, reload. Everything comes back — within a few
   seconds, not a minute, because saving forgets the held copy.

**Check three — the split record heals.** On `mcm_1787814329776`, which has two
`Company Default` rows, sign in as each of the two admins in turn and open
Company info. Both must now see the same settings, including the ones the other
one saved. Save once from either. Afterwards:

```
SELECT uuid, created_by, updated_at, JSON_KEYS(settings)
FROM mcm_1787814329776.user_template WHERE name = 'Company Default';
```

The newer row now holds every section. The older row can be deleted by hand at
any time after that, or left alone — it will never be read again.

---

## Then, in the website

Do this in the same change that makes each one real, not before.

The card **"Who may listen to call recordings"** in
`src/pages/admin-settings/company/company-policies.tsx` is marked `app-only`,
with a note saying it "does not stop somebody who already has a direct link to
the file". That note is still true, so the card should stay honest rather than be
promoted. What should change is the first half of it: the server now withholds
the recording as well as the button. Suggested wording:

> Works. Turning one off stops this app handing out those recordings — the play
> button goes, and the file name is no longer sent. It still does not stop
> somebody who already has a direct link to the audio; the recording store does
> not yet check who is asking.

`src/hooks/use-recording-access.ts` needs no change. The server copy of the rule
in `src/helpers/recordingAccess.ts` here is a deliberate line-for-line mirror of
it, including the parts that look over-cautious. **If you change one, change
both** — otherwise somebody sees a play button that plays nothing, or no button
next to a recording they are entitled to.

---

## Tests

Plain Node, no framework, the same style as `/tests` in this repo.

```
node backend-patches/tenant-api/tests/recording-access-test.cjs     # 59 checks
node backend-patches/tenant-api/tests/company-defaults-test.cjs     # 20 checks
```

Rebuild them after changing the TypeScript:

```
npx esbuild backend-patches/tenant-api/src/helpers/recordingAccess.ts \
  --format=cjs --outfile=backend-patches/tenant-api/tests/recording-access.build.cjs
npx esbuild backend-patches/tenant-api/src/helpers/companyDefaults.ts \
  --format=cjs --outfile=backend-patches/tenant-api/tests/company-defaults.build.cjs
```

And the whole thing running against a build, with a pretend database — this is
the one that checks a broken database still lets the call log load:

```
node backend-patches/tenant-api/tests/filter-smoke-test.cjs /path/to/tenant-api/dist   # 12 checks
```

`apply.sh` runs that last one for you against the build it has just put live.

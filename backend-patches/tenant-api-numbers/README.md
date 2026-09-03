# tenant-api — numbers you own, and the trunk they arrive on

**Not applied. Nothing on the server has been changed by this directory.**

The front end no longer buys numbers. Removing the DIDWW integration removed the
only way a number could ever enter the system, so this patch adds the two things
that replace it: registering numbers the operator already holds, and configuring
the SIP trunk they arrive over.

---

## Why tenant-api and not default-api

`/api/numbers/list` is served by `default-api` on :3000, which is where nginx
sends every `/api/*` request. That is the natural home for these endpoints and
it is not available: `/var/www/prod/default-api` contains `dist` and no `src`.
Anything added there could not be rebuilt or maintained by anybody.

`tenant-api` has source, so the new endpoints go there and nginx routes the
three new prefixes to it. This is the same reasoning, and the same trade-off,
as `backend-patches/tenant-api`.

The split is ugly and worth naming: after this patch `/api/numbers/list` is
answered by one service and `/api/numbers/register` by another. The alternative
was to put maintainable code into a directory nobody can rebuild. When
`default-api` gets its source back, these three routes should move there and the
nginx locations should be deleted.

---

## What it adds

### `POST /api/numbers/register`

```jsonc
{
  "numbers": ["+919876543210", "+919876543211"],  // E.164, required
  "label": "Mumbai sales",                         // optional, applied to the batch
  "trunk_uuid": "…"                                // optional
}
```

Validates every entry as an Indian subscriber number, rejects the request if any
is malformed, and inserts the ones not already on the account. Numbers already
held are reported back rather than duplicated, so a repeated paste is a no-op
with an honest answer instead of a second row.

The client validates the same rule in `src/lib/owned-numbers.ts`. That is a
courtesy so an admin sees the bad rows before saving; this is the control.

### `POST /api/numbers/release`

Takes the number off the account. It does not tell the carrier anything — the
range still belongs to the operator — so this is closer to "stop answering for
this" than to a release.

### `POST /api/numbers/trunk/{list,upsert,delete,status}`

CRUD for the carrier connection, plus a live registration read. `upsert` omits
the password when the field is left blank so editing a trunk's name cannot
silently blank its credentials.

---

## The part this patch does NOT do, and must not pretend to

**Provisioning the trunk into FreeSWITCH.** Saving a row in `sip_trunk` does not
make calls flow. A gateway has to be written into the FreeSWITCH configuration
and the profile reloaded, and inbound calls on those numbers have to be mapped to
the right tenant in the dialplan.

Right now FreeSWITCH has exactly one gateway — `internal::127.0.0.1`, state
`NOREG` — so there is no working example on this box to copy, and nothing here
was tested end to end against a real carrier. Writing that provisioning blind
would produce code that looks finished and silently drops calls.

What is needed, concretely:

1. A writer that renders each `sip_trunk` row into a `sofia` gateway XML file.
2. `sofia profile external rescan` (or a targeted gateway restart) after a write.
3. An inbound dialplan rule keying on the destination number so a call on a
   registered DID reaches the tenant that owns it.
4. `/api/numbers/trunk/status` reading real gateway state from
   `sofia status gateway` rather than the stored `register` flag.

Until that exists the UI will save trunks and numbers correctly and report a
registration state of "Unknown", which is the truth.

---

## Applying

`apply.sh` refuses to run if the files on the server differ from what this patch
was written against, backs up `src` and `dist` first, and rolls back if the build
fails or the service does not come back. `rollback.sh` restores the last backup.

The nginx change is separate and in `nginx/numbers-to-tenant-api.conf`. Add the
three locations to the `api.ucaas.in` server block *above* the catch-all
`location /`, then `nginx -t && systemctl reload nginx`.

Run the migration before restarting the service — the endpoints select from
`sip_trunk` and will 500 without it.

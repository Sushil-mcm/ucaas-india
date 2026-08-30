# Moving to DIDWW properly

Everything needed to migrate number management onto DIDWW directly — including
the trap that makes the job look finished when nothing has changed.

Verified on production (`UCaaS-Live`, 142.93.121.121) on 30 August 2026.

---

## Start here: there is no misconfiguration to fix

It looks like there is. `.env` says one thing and the code says another:

| | |
|---|---|
| `.env` | `DID_WW_URL=https://api.didww.com/v3/` — the real carrier |
| `dist/helpers/DidwwHelper.js` | hardcodes `https://wholesale-api.mycountrymobile.com/api/` |

That reads as "somebody hardcoded the wrong host". It is not. There are **two
clients, for two different jobs, and both are live**:

- **`helpers/didHelper.js`** — the real carrier. Uses `DID_WW_URL`, an `Api-Key`
  header and `application/vnd.api+json`, which is DIDWW's own JSON:API dialect.
  Imported by **11 controllers**.
- **`helpers/DidwwHelper.js`** — the in-house middle layer. 37 lines, one axios
  call, imported by **3 controllers**.

So the environment variable is not being ignored. It is used by the larger of the
two paths.

### What each path actually carries

**Through the wholesale middle layer** (`callDidwwRequestWholeSaleApi`), from
`IdentityController` and `DidController`:

    did/requirements          identity/add           identity/address/add
    did/proof/types           identity/update        identity/address/update
    did/order/status          identity/delete        identity/address/delete

That is regulatory identity work — who owns a number, proof documents,
addresses — plus order status polling.

**Direct to DIDWW** (`didHelper`): everything else, across 11 controllers.

---

## THE TRAP

**`DidwwHelper.js` has the DIDWW line commented out immediately above the
hardcoded one:**

```js
// url: `${DID_WW_URL}${url}`,
// url: `http://localhost:9000/api/identity/upload/proof`,
url: `https://wholesale-api.mycountrymobile.com/api/${url}`,
```

Somebody switched this away from DIDWW deliberately and left the original in
place. The consequence for anybody doing this migration:

> You change `DID_WW_URL` in `.env`, restart, see the variable set correctly,
> and conclude the migration is done. **Nothing has moved.** Those three
> controllers still call the wholesale API, because the URL never came from the
> environment in that file.

There is no error, no warning, and no failed request to tell you. The identity
flow keeps working — through the old path — and looks like proof that the change
took effect.

**How to know for certain**, rather than trusting the config:

```bash
ssh mcm-new "grep -n 'wholesale-api' /var/www/prod/default-api/dist/helpers/DidwwHelper.js"
```

An empty result means the migration is real. Any result means it is not,
whatever `.env` says.

### The second trap: swapping the URL is not enough

The two APIs do not speak the same language. Pointing `DidwwHelper` at DIDWW
without rewriting its callers gives 9 broken operations, not 9 migrated ones:

| | wholesale API | DIDWW |
|---|---|---|
| Style | plain JSON, POST-only | JSON:API (`application/vnd.api+json`) |
| Auth | `WW_HEADER2` | `Api-Key` header |
| Paths | `identity/add` | `/identities` with typed resource objects |
| Errors | plain body | JSON:API `errors[]` |

Every one of the nine operations needs its request body reshaped, its response
parsing rewritten, and its errors re-read. This is a rewrite of three
controllers, not a configuration change.

---

## Current state, measured not assumed

Checked on 30 August 2026:

- **DIDWW answers.** `GET /balance` with the configured key → HTTP 200,
  balance **2520.57**. The key is valid and the account is funded.
- **The wholesale API is up.** Returns 401 unauthenticated, so it is running and
  enforcing auth.
- **58 numbers live at the carrier**, 29 in this product's database (27 active,
  2 released).

### Do not read 58 vs 29 as a leak

That DIDWW account is **shared with Callmama**. Most of those 58 numbers are not
this product's. Reading the gap as 29 leaked numbers has been done before and is
wrong.

The honest check is only against numbers we ourselves released:

| Number | Released | Still billing? |
|---|---|---|
| +12057321111 | 28 Aug 2026 | No — gone from the carrier |
| +12568081285 | 29 Aug 2026 | No — gone from the carrier |

**Leaking: zero.**

This matters because there is a standing audit finding that says releasing a
number never tells the carrier, so we keep paying. The code reading behind it is
fair — `CommonHelper.releaseDidForwarding` soft-deletes locally and makes no
carrier call — but it does not match what happened to those two numbers.
Something else completes the release, or they were released by hand. The claim
has now been checked twice and found not to be happening either time. Re-run the
reconciliation before repeating it.

---

## If you do the migration

In this order, because each step is verifiable on its own:

1. **Decide whether it is worth it.** The wholesale layer is working. The reason
   to move is owning the carrier relationship directly, not fixing a fault.
2. **Rewrite one operation first** — `did/requirements` is the smallest and is
   read-only. Prove the JSON:API shape end to end before touching anything that
   creates or deletes.
3. **Leave `did/order/status` until last.** It appears at four separate call
   sites in `DidController` and each needs its response parsing checked.
4. **Never migrate identity delete or address delete without a dry run.** Those
   destroy regulatory records at the carrier; getting the resource id wrong
   deletes somebody else's identity.
5. **Delete the commented-out lines in `DidwwHelper.js` as part of the change.**
   They are what makes this look done when it is not, and the next person will
   fall into the same hole.

### Note on the source

`default-api` ships **compiled output only** — there is no TypeScript for it on
any machine here. Any change above is an edit to `dist/`, which cannot be
rebuilt. Take a dated backup, run `node --check`, and verify the process start
time is later than the file mtime afterwards, or the change is not running.

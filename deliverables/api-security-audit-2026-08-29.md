# default-api — security audit against the running code

Checked 29 August 2026 against what is actually running on 142.93.121.121
(`/var/www/prod/default-api/dist`), not against notes. `default-api` was
restarted at 05:18:12 that morning, so the file on disk and the running process
match.

Everything below is in **compiled JavaScript**. There is no TypeScript source
for this service anywhere on the server, so each fix is an edit to `dist/`. That
is acceptable for a few lines. It is not a way to work long term — getting the
source is the single most valuable thing anyone can do here.

## Summary

| # | Issue | State |
|---|---|---|
| 0 | Any signed-in user could end any colleague's sessions | **Fixed** |
| 5 | Any user could list colleagues' devices, IPs and emails | **Not a defect** — narrowing is present |
| 1 | A normal user can give themselves an administrator role | **OPEN** |
| 2 | Any signed-in user can delete or rewrite any role, for any customer | **OPEN — worst of the four** |
| 3 | Any customer can read every phone number on the platform | **OPEN** |
| 4 | Releasing a number never tells the carrier, so billing continues | **OPEN** |
| 6 | A company admin can end sessions for users in other companies | **OPEN — new, narrow** |

Two things on the old list turned out not to need work, and one new gap was
found while confirming the logout fix.

---

## Fixed — logout identity

`AuthController.js`, `logout()`. Now reads:

```js
const isPrivileged = ["ADMIN", "GLOBAL"].includes(String(authUser?.role || ""));
const requestedUuid = isPrivileged ? user_uuid : undefined;
const normalizedUserUuid = String(requestedUuid ?? authUser?.uuid ?? "").trim();
```

A non-privileged caller gets `undefined` and falls back to their own uuid, so
they can only sign themselves out. `payload` then overwrites `user_uuid`, so the
request body cannot smuggle a value past it either. This is a better fix than
the one-line version originally proposed, because it keeps admin force-logout
working as a real feature.

## Not a defect — device list

`UserController.getDeviceSecurities` scopes to the caller's company, and then:

```js
if (role !== "ADMIN") { whereCond.user_uuid = uuid; }
```

Non-admins see only their own devices. An earlier note claiming otherwise was
wrong.

---

## OPEN 6 — a company admin can end sessions in other companies

**Where:** `AuthController.js` lines 792-794, and `logOutUser` at line 3248.

`logOutUser` builds `whereCond = { user_uuid: normalizedUserUuid }` and calls
`DeviceSecurityModel.destroy({ where: whereCond })`. There is no `company_uuid`
anywhere in it. So an `ADMIN` of one company who knows a uuid belonging to
another company can destroy that person's sessions.

Not guessable, but uuids leak through other endpoints — including issue 3 below.
`GLOBAL` doing this is presumably intended; a company `ADMIN` doing it is not.

**Fix** — replace lines 792-794 with:

```js
                const isPrivileged = ["ADMIN", "GLOBAL"].includes(String((authUser === null || authUser === void 0 ? void 0 : authUser.role) || ""));
                const requestedUuid = isPrivileged ? user_uuid : undefined;
                /* A company ADMIN may only end sessions for their own people.
                   GLOBAL is platform-level and stays unscoped. */
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
                }
                const normalizedUserUuid = String((_a = requestedUuid !== null && requestedUuid !== void 0 ? requestedUuid : authUser === null || authUser === void 0 ? void 0 : authUser.uuid) !== null && _a !== void 0 ? _a : "").trim();
```

`User_1` is already imported at line 47, and `_super.sendError` is already in
scope inside `logout()`.

---

## OPEN 2 — any signed-in user can delete any role, for any customer

**Worst of the four. Fix this first.**

**Where:** `controllers/Roles/index.js`, and `routers/roleRoute.js` line 18.

```js
roleRoute.delete("/delete/:uuid", AuthMiddleware, catchErrors(remove));
```

```js
remove(req, res) {
    const { uuid } = req.params;
    yield Role_1.default.destroy({ where: { uuid } });
    return sendSuccess(res, SUCCESS);
}
```

No role check and no tenant scope. Any authenticated user — the lowest role,
any customer — can delete any role on the platform by its uuid. The same
pattern appears at lines 128 (`Role.update`), 164 (`CustomRole.update`) and
182 (`CustomRole.destroy`). The file mentions `company_uuid` 21 times
elsewhere, so the scoping was simply not applied to these four.

**Fix:** add the caller's company to all four `where` clauses, and gate the
route on an administrator role. Deleting a *system* role should almost
certainly not be reachable by customers at all.

---

## OPEN 1 — a normal user can give themselves an administrator role

**Where:** `routers/userRoute.js` lines 32 and 35 →
`UserController.update` (line 1367) and `assignBulkRoleToUser` (line 2164).

Both sit behind `AuthMiddleware` only. That middleware establishes *who you
are*, never *what you may do*. There is no authorisation middleware in this
service at all — `isAdmin`, `requireRole`, `checkPermission`,
`hasPermission` and `requirePermission` return zero files.

Both handlers **are** tenant-scoped — the target user lookup filters on
`company_uuid: userData.company_uuid`, so this cannot cross companies. But
neither checks the *caller's* role. `update()` accepts `role_uuid`,
`custom_role_uuid`, and a `role` inside `settings`, with the target defaulting
to the caller's own uuid. So a person can raise their own role, or anyone
else's in their company.

**Consequence:** the entire permission tree in the admin console is decoration.
The front end hides what you may not do; the API does not enforce it.

**Fix:** an authorisation middleware that resolves the caller's effective
permissions and gates each route. This is the largest piece of backend work on
the list and cannot be faked from the front end. As an interim measure, gate
just these two routes on an administrator role.

---

## OPEN 3 — any customer can read every phone number on the platform

**Where:** `controllers/DID/DidController.js`, `list()` at line 121.

```js
const { company_uuid, role, uuid } = req.auth;
const where = { company_uuid };            // tenant scope set first
...
filter.forEach((_value) => {
    const { key, value } = _value;
    where[key] = { [Op.like]: `${value}%` };   // caller chooses the key
});
```

`key` comes straight from the request body with no allow-list, so
`filter: [{ key: "company_uuid", value: "" }]` overwrites the tenant scope with
`company_uuid LIKE '%'` and returns every DID on the platform.

**Fix:** allow-list the filterable columns, and re-apply `company_uuid` after
the caller's filters rather than before:

```js
const FILTERABLE = ["did_number", "did_name", "type", "status", "user_uuid"];
filter.forEach(({ key, value }) => {
    if (!FILTERABLE.includes(key)) return;
    where[key] = { [Op.like]: `${value}%` };
});
where.company_uuid = company_uuid;   // last word, always
```

The same `where[key]` pattern is worth grepping for across the service.

---

## OPEN 4 — releasing a number never stops the carrier billing

**Where:** `helpers/CommonHelper.js` line 2306, `releaseDidForwarding`.

The function opens a transaction, finds the DID, parses `forward_call_actions`,
collects IVRs and unwires them. It never contacts DIDWW — no HTTP client
appears anywhere in it. Releasing a number through the admin therefore tidies
our own database and leaves the number live and billable at the carrier.

It also looks the number up with `where: { did_number }` and **no
`company_uuid`**, so given a number string it will operate on another
customer's DID. Whether that is reachable depends on the callers, which is
worth tracing.

**Fix:** call the carrier terminate endpoint as part of release, and add
`company_uuid` to that lookup.

**Worth checking commercially:** compare the DIDWW invoice against numbers
marked released in our database. The difference is money already being spent.

---

## Order

1. **Issue 2** — one line each in four places. Largest exposure, smallest fix.
2. **Issue 3** — allow-list plus moving one line.
3. **Issue 6** — the block above, ready to paste.
4. **Issue 4** — carrier call, plus the billing reconciliation.
5. **Issue 1** — the real authorisation layer. A project, not a patch.

1, 2 and 3 are each a few lines and can go out together. Take a `.bak` of every
file first, run `node --check` on each, restart `default-api`, and confirm the
process start time is later than the file mtime — that check is what showed the
earlier patch had never gone live.

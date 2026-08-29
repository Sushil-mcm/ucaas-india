# default-api — security audit against the running code

Checked 29 August 2026 against what is actually running, not against notes.

**`default-api` runs on three servers, not one.** All three carry the same
`dist/`, and all three need every fix applied in the same session:

| SSH alias | Address | Logout fix live? |
|---|---|---|
| `mcm-new` | 142.93.121.121 | yes — process 05:18:12 UTC, file 05:18:12 |
| `mcm-switch` | 167.99.4.91 | yes — process 05:19:38 UTC, file 05:19:37 |
| `mcm-ucaas3` | 151.106.57.254 | yes — process 05:19:27 UTC, file 05:19:27 |

Verified on each by comparing the process start time against the file mtime —
the check that caught the first patch sitting dead on disk for 20 hours. All
three are confirmed identical for every finding below.

Everything below is in **compiled JavaScript**. There is no TypeScript source
for this service anywhere on the server, so each fix is an edit to `dist/`. That
is acceptable for a few lines. It is not a way to work long term — getting the
source is the single most valuable thing anyone can do here.

## Summary

| # | Issue | State |
|---|---|---|
| 0 | Any signed-in user could end any colleague's sessions | **Fixed** |
| 5 | Any user could list colleagues' devices, IPs and emails | **Not a defect for ordinary users** — but admins leak cross-tenant via issue 3 |
| 1 | A normal user can give themselves an administrator role | **OPEN** |
| 2 | Any signed-in user can delete or rewrite any role, for any customer | **OPEN — worst of the four** |
| 3 | Filter injection — any customer reads every company's rows | **OPEN — service-wide, 8 sites** |
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

**Where:** `controllers/Roles/index.js`, and `routers/rolesRoute.js` line 18.
**Reachable at:** `DELETE /api/user/role/delete/:uuid` — `userRoute.js:36`
does `userRoute.use("/role", rolesRoute)`, so the path is nested under `/user`.

```js
rolesRoute.delete("/delete/:uuid", AuthMiddleware, catchErrors(remove));
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

**Fix:** `scripts/fix-role-tenant-scope.sh`. Both `Role` and `CustomRole` carry
a `company_uuid` column and roles are created with it, so scoping is the correct
fix and not a workaround. The script adds `company_uuid` to all four `where`
clauses. Two of the handlers already destructure it from `req.auth`; the other
two read only `req.params`, so it inserts the read first. It refuses to edit
unless all four anchors match verbatim, backs up, runs `node --check`, and rolls
back on failure. Dry-run against the real file produces exactly a four-site diff
and parses clean.

**What it deliberately does not do:** gate the routes on an administrator role.
Managing roles should almost certainly be admin-only, but *which* of your roles
may do it is a product decision, and guessing it would lock people out of a
working screen. This closes the cross-customer damage — the severe half. Issue 1
is the real answer to the in-company half.

---

## OPEN 1 — a normal user can give themselves an administrator role

**Where:** `routers/userRoute.js` lines 32 and 35 →
`UserController.update` (line 1367) and `assignBulkRoleToUser` (line 2164).

Both sit behind `AuthMiddleware` only. That middleware establishes *who you
are*, never *what you may do*. There is no authorisation middleware in this
service at all. Grepped service-wide, `isAdmin|requireRole|checkPermission|
hasPermission|requirePermission` hits exactly three files — `CronController.js`,
`MetaOnboardingService.js` and `Stripe/PaymentController.js`. None is a
middleware and none is wired to a route, so the conclusion stands, but an
earlier draft of this document said "zero files", which came from grepping only
`middlewares/` and `routers/`. Anyone rerunning it service-wide will see three.

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

## OPEN 3 — filter injection: a house style, not one endpoint

This was written up as a DID bug. It is not. The same shape appears across the
service, and fixing `DidController` alone leaves billing wide open.

**The pattern:**

```js
let where = { company_uuid };              // tenant scope set FIRST
filter.forEach(({ key, value }) => {
    where[key] = { [Op.like]: `%${value}%` };   // caller chooses the key
});
```

`key` comes straight from the request body. Sending
`filter: [{ key: "company_uuid", value: "" }]` overwrites the tenant scope with
`company_uuid LIKE '%'` and returns every customer's rows.

**Where it appears.** `(where|whereCond)[key] =` matches **19 sites in 12
files**. They are not all vulnerable — several already dispatch on the key:

| Site | State |
|---|---|
| `helpers/filterHelper.js` (4 sites) | **Safe** — `switch (key)` with named cases, effectively an allow-list. The four controllers that go through it are not exposed this way. |
| `Tenant/TenantController.js:1615` | **Safe** — guarded by `if (key === 'name')`. |
| `DID/DidController.js:135` | **Vulnerable** — confirmed, tenant scope overwritten. |
| `BillingController.js:37` | **Vulnerable** — confirmed. Identical shape. Returns every company's billing records. |
| `Roles/index.js:71` | **Vulnerable** — overrides the `name != "ADMIN"` guard set just above it, exposing the ADMIN role. |
| `CRMController.js:194` | **Vulnerable** — the `else` branch is unguarded and `where` carries `company_uuid`. |
| `UserController.js:587` | **Vulnerable** — the `else` branch of a key chain. |
| `UserController.js:2623` | **Vulnerable, admin-only** — see below. |
| `DID/DidController.js:1938` | **Vulnerable** — `where: {}`, no tenant scope at all. |
| `Admin/` (4 sites: `PlansController`, `AiController`, `DidController`, `SiteController`, `UserController`) | **Lower severity** — behind `AdminMiddleware`, but the same defect. |

**The device-list nuance.** `UserController.js:2622-2627` sets the company
scope, runs the filter loop, and *then* narrows:

```js
if (role !== "ADMIN") { whereCond.user_uuid = uuid; }
```

A non-admin who overwrites `company_uuid` still gets their own uuid forced
afterwards, so they see only their own devices — harmless. An **ADMIN**
overwriting `company_uuid` is not narrowed, and reads every device on the
platform: extension, IP address, user agent, and the joined user's email and
name, for every customer. So the device list is safe for ordinary users and
leaks across tenants for admins.

**Fix — a sweep, not a patch.** Doing this per-endpoint guarantees one gets
missed. `scripts/fix-filter-injection.sh` inserts a guard at the top of every
vulnerable loop refusing the columns that carry scope:

```js
if (["company_uuid","user_uuid","website_uuid","tenant_uuid","uuid","id"].includes(String(key))) { return; }
```

All eight non-helper sites were checked and every one sits inside a
`filter.forEach(...)` arrow callback, so `return` skips that iteration rather
than exiting the handler. The script backs each file up, runs `node --check`,
and rolls back any file that fails.

This is a denylist. An allow-list of each endpoint's real filterable columns is
the better shape, and it is what should be written once the TypeScript source
exists — it needs per-endpoint judgement that does not belong in a mechanical
patch against compiled output. The denylist closes the actual exploit now.

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

1. **Issue 2** — `scripts/fix-role-tenant-scope.sh --apply`. Largest exposure,
   smallest fix.
2. **Issue 3** — run `scripts/fix-filter-injection.sh --apply` on all three
   servers. Treat it as a sweep; patching one endpoint leaves billing open.
3. **Issue 6** — the block above, ready to paste.
4. **Issue 4** — carrier call, plus the billing reconciliation.
5. **Issue 1** — the real authorisation layer. A project, not a patch.

1, 2 and 3 can go out together. Take a `.bak` of every
file first, run `node --check` on each, restart `default-api`, and confirm the
process start time is later than the file mtime — that check is what showed the
earlier patch had never gone live.

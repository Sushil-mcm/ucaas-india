# Compliance — what to build, who builds it, what it needs

Written 31 August 2026, from the platform audit of 29–30 August.

Covers SOC 2, GDPR and HIPAA together, because they overlap heavily: roughly
70% of the technical work satisfies all three. Where they differ, it is said.

Each control below states **what** it is, **why** it is required, **who** can do
it, **what access** that needs, and **what currently blocks it**.

---

## The honest starting position

Three things from the audit shape everything below.

**1. Authorisation is not enforced.** The permission tree is handed to the
browser at sign-in and never checked again. All three frameworks treat access
control as foundational, so this single gap fails all of them. It is the first
thing any auditor tests and the first thing to fix.

**2. Credentials sit in plain text.** Plaintext SMTP passwords were found in
`notification-api/logs/`. Service `.env` files hold the database password, the
token signing secret and the encryption secret in the clear. Credentials in logs
is an automatic audit finding.

**3. Most services have no source.** Twelve of fifteen. Change management is a
named SOC 2 requirement, and you cannot demonstrate control over code you cannot
read. The source is arriving — this is being resolved.

None of this is unusual for a platform at this stage. All of it is fixable.

---

## Part 1 — Technical controls

### 1.1 Server-side authorisation
**Required by:** SOC 2 · GDPR · HIPAA — all three, non-negotiable

**What:** Every API endpoint must verify, on the server, that the caller is
permitted to perform that action on that record.

**Why:** Today the permission tree is advisory. All three uses of `rbac` in
`default-api` are in the login response — it goes to the browser and is never
consulted again. Any authenticated user can call any endpoint for any customer.
Under HIPAA that is a reportable breach waiting to happen.

**I can:** design the authorisation layer, write the middleware, map every route
to its required permission, write the tests.

**Access needed:** `default-api` source *(arriving)*, a test environment.

**Blocked by:** source code. This is the single largest piece of work here.

---

### 1.2 Audit logging
**Required by:** SOC 2 · HIPAA *(explicitly)* · GDPR *(for breach detection)*

**What:** An append-only record of who did what, when, to which record. Must
cover authentication, permission changes, and every access to personal or health
data — including playing a call recording.

**Why:** HIPAA §164.312(b) requires recording **and reviewing** access to health
information. SOC 2 asks how you would detect misuse. Right now you could not
answer either.

**I can:** design the schema, write the middleware, build the review interface,
define what is logged and what is deliberately not.

**Access needed:** source for each service, database write access for the log
table.

**Note:** logs must not contain the sensitive values themselves — record *that*
a recording was played, never its contents.

---

### 1.3 Get credentials out of logs and code
**Required by:** all three

**What:** No password, token or key in any log file, source file or committed
config.

**Why:** Plaintext SMTP passwords are already in `notification-api/logs/`. Logs
get swept into backups, pasted into support threads, and are often readable by
more people than the service itself.

**I can:** find every occurrence, patch the logging, purge existing logs, set up
a secrets pattern going forward.

**Access needed:** server access, service source for the logging change.

**Do first, and separately:** rotate the exposed SMTP password. Assume it is
leaked — it has been sitting readable in a log directory.

---

### 1.4 Encryption at rest and in transit
**Required by:** SOC 2 · GDPR Art.32 · HIPAA

**What:** TLS everywhere in transit; AES-256 at rest for the database, backups,
call recordings and voicemail.

**Why:** Under HIPAA, encryption is what turns a lost device or stolen backup
from a reportable breach into a non-event.

**I can:** verify what is actually encrypted today *(rather than assumed)*,
configure the gaps, document it for the auditor.

**Access needed:** server access, DigitalOcean database settings, storage config.

**Unverified today:** whether the managed database has encryption at rest
switched on, and whether backups are encrypted. Both need checking, not
assuming.

---

### 1.5 Data export — right of access
**Required by:** GDPR Art.15 and Art.20

**What:** Produce everything you hold on one person, in a portable format,
within 30 days of them asking.

**Why:** It is a legal right. Being unable to do it is a violation regardless of
whether anyone has asked yet.

**I can:** build the export across every service and store — user record,
calls, recordings, voicemails, messages, contacts.

**Access needed:** source for each service holding personal data.

**Harder than it sounds:** personal data is spread across MySQL, MongoDB, call
records, recordings and logs. The data inventory (1.9) has to come first.

---

### 1.6 Data deletion — right to erasure
**Required by:** GDPR Art.17

**What:** Genuinely delete a person's data on request, everywhere, including
backups within a stated window.

**Why:** Legal right. And "we soft-deleted it" is not deletion.

**I can:** build the deletion across services, define what must be retained for
legal reasons *(billing records, usually)* and what must go.

**Access needed:** source, database.

**Watch for:** the number release path already uses soft delete
(`deleted_at`). That pattern is fine for numbers and wrong for personal data.

---

### 1.7 Retention and automatic deletion
**Required by:** GDPR *(storage limitation)* · HIPAA *(retention rules)*

**What:** Every category of data has a defined lifetime and is deleted
automatically at the end of it.

**Why:** GDPR forbids keeping personal data longer than needed. Call recordings
are the sharp case — indefinite retention is hard to justify and increases
breach exposure.

**I can:** build the retention engine and the admin screens to configure it.

**Access needed:** source, database.

**Note:** the Policies screen already has a data retention section marked
"coming soon". This makes it real.

---

### 1.8 Multi-factor authentication
**Required by:** SOC 2 *(expected)* · HIPAA *(strongly expected)*

**What:** A second factor for sign-in, enforced by the server.

**Why:** The screen exists and is honestly labelled as not working. Stolen
passwords are the most common breach cause.

**I can:** build it end to end.

**Access needed:** `default-api` source.

---

### 1.9 Data inventory
**Required by:** GDPR Art.30 *(Records of Processing Activities)* · SOC 2 ·
HIPAA risk analysis

**What:** A written register: what personal data you hold, where it lives, why,
the lawful basis, how long you keep it, who it is shared with.

**Why:** It is a GDPR requirement in its own right, and every other control
depends on it. You cannot protect, export or delete data you have not catalogued.

**I can:** build it — this is the one substantial item needing **no source code
and no new access**. Everything needed was already mapped during the audit.

**Do this first.** It is the foundation, and it is available today.

---

### 1.10 Access reviews
**Required by:** SOC 2 *(quarterly)* · HIPAA

**What:** A periodic, signed-off review of who has access to what — including
staff, agents and service accounts.

**I can:** build the report that makes the review possible.

**Access needed:** source, database.

---

### 1.11 Backup and tested recovery
**Required by:** all three · HIPAA contingency plan

**What:** Backups, off-site, encrypted, and **restore-tested**.

**Status: partly done.** As of 30 August the repository backs up hourly to two
servers and private GitHub, and the restore was tested rather than assumed. A
nightly database backup runs at 02:40 with 14-day retention.

**Still needed:** backups encrypted at rest, the database backup copied
off-box *(it currently lives on the same machine it protects)*, and a documented,
tested restore procedure.

---

### 1.12 Vulnerability management
**Required by:** SOC 2

**What:** Regular scanning, a patching schedule, and a record of both.

**Why:** The web server currently reports 115 pending updates and a required
restart.

**I can:** set up scanning and produce the schedule.

**Access needed:** server access.

---

## Part 2 — What I cannot do

Stated plainly, because compliance work fails when these are assumed.

**I cannot be your auditor.** SOC 2 requires an accredited firm. Nothing I
produce substitutes for their report.

**I cannot give legal advice.** GDPR lawful basis, HIPAA applicability, the
emergency-calling exclusion — all need a qualified lawyer. I can draft technical
content for their review; I cannot tell you what the law requires of you.

**I cannot sign anything.** BAAs, DPAs and vendor agreements need a person with
authority.

**I cannot certify what I have not verified.** Where this document says
"unverified", it means exactly that.

**I cannot make policy decisions.** How long you keep recordings, which
customers you accept, your risk appetite — those are business decisions.

**I cannot act on production without your say-so.** Anything touching live
servers, the database, or the carrier account remains a decision you make.

---

## Part 3 — Agreements and legal work

Needs a lawyer. Two specialisms, and they are usually different people: a
**privacy/data protection lawyer** for GDPR and HIPAA, and a **US telecoms
lawyer** for the emergency-calling position.

| Document | Purpose | Priority |
|---|---|---|
| **Terms of Service** | Must carry the emergency-calling exclusion. This is what defines what the product is and is not | **First** |
| **Emergency services disclosure** | Shown at signup and actively acknowledged — not only on an admin screen | **First** |
| **Privacy Policy** | GDPR requirement | High |
| **Data Processing Agreement** | Signed with every customer. Enterprise buyers will ask before signing anything else | High |
| **Sub-processor list** | Published: DIDWW, DigitalOcean, Stripe, Microsoft Azure | High |
| **BAA template** | Only if taking healthcare customers | If applicable |
| **Vendor BAAs** | **You need these, not just your customers.** Microsoft *(Azure speech)*, DigitalOcean, DIDWW. A missing vendor BAA is itself a violation | If applicable |
| **Standard Contractual Clauses** | For personal data leaving the EU | If applicable |
| **DPIA** | Required for high-risk processing. **Call recording qualifies** | If recording |

**Start the vendor BAAs now if healthcare is a target market.** Microsoft and
DigitalOcean both take weeks, and no amount of engineering shortens that.

---

## Part 4 — Written policies

No code. They need writing, approving and following. An auditor asks for the
document *and* for evidence it is used.

Information security · Access control · Incident response · Business continuity
and disaster recovery · Change management · Vendor management · Acceptable use ·
Data retention · **Sanction policy** *(HIPAA specifically requires one)*

**Plus, and most commonly missed:**

- **Security Risk Analysis** — mandatory under HIPAA, annual, written. The first
  thing a regulator asks for.
- **Named Security Official** — one person, named in writing.

---

## Part 5 — Order of work

**Today, no blockers:**
1. Rotate the exposed SMTP password
2. Purge credentials from logs and stop the logging at source
3. Build the data inventory *(1.9)* — the foundation for everything else

**This week:**
4. Engage a privacy lawyer and a US telecoms lawyer
5. Request vendor BAAs — Microsoft, DigitalOcean, DIDWW
6. Verify encryption at rest, database and backups
7. Begin the Security Risk Analysis

**As the source arrives:**
8. Server-side authorisation *(1.1)* — the largest and most important
9. Audit logging *(1.2)* — same piece of work, build together
10. Data export and deletion *(1.5, 1.6)*
11. MFA *(1.8)*
12. Retention *(1.7)*

**Before any certification attempt:**
13. Policies written and adopted
14. Three months of evidence collected
15. A readiness assessment before the real audit

---

## One rule throughout

**Do not claim compliance you do not hold.** Say "working towards SOC 2" until
the report is in your hand. Enterprise buyers ask for evidence, and being caught
short is materially worse than never having claimed it.

This is the same principle the product audit has applied all along: a screen
that says what it actually does is worth more than one that says what it wishes
it did.

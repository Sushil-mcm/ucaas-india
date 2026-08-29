# Genesys Cloud CX — how it is actually built

Internal study notes for the UCaaS project. Reference only.
**Never put the name "Genesys" (or any rival's name) into product UI text, code comments, or customer docs.**

Sources actually read (not guessed):
- Public Platform API spec — `api.mypurecloud.com/api/v2/docs/swagger` (22.9 MB, no auth needed).
  2,178 URL paths, 3,215 operations, 87 product domains. This is the real object model.
- Their design system source — npm `genesys-spark-components` v4.262.6 (open source, `MyPureCloud/genesys-spark`).
- help.genesys.cloud, developer.genesys.cloud, voicebootcamp CX training outline.

Note on the help site: `help.genesys.cloud` is a Next.js app that loads article text over GraphQL
*after* the page renders. Plain fetching returns an empty shell. To read articles you must render
them in a real browser. The API spec and the npm package are the reliable machine-readable sources.

---

## 1. The shape of the system

It is not one product. It is ~87 separate services behind one API and one shell UI.
Sizes below = number of API operations, which is a good proxy for how much product is in each area.

| Big | Medium | Small |
|---|---|---|
| Workforce Mgmt 341 | Analytics 125 | Presence 27 |
| Conversations 300 | Journey 92 | Voicemail 27 |
| Outbound 176 | Integrations 86 | Telephony 25 |
| Routing 174 | Gamification 78 | Web Deployments 21 |
| Architect 147 | Quality 76 | Greetings 19 |
| External Contacts 134 | Recording 57 | Groups 14 |
| Knowledge 127 | Authorization 59 | Teams 10 |
| Telephony Edge 127 | | Locations 8 |

Take-away: **routing + architect + telephony edge = 448 operations.** That is the core of a UCaaS/CCaaS
product. Everything else is bolted on around it.

### Architecture
- Runs on AWS. Close to a thousand small services talking over REST.
- Each service sits behind its own load balancer with its own auto-scaling rule (CPU, response time).
- Continuous delivery: many small releases, not big versioned upgrades.
- Media (voice) is its own tier. It used to be a box in the customer's building (the "Edge").
  They pulled that apart into cloud microservices so it can auto-scale like the rest.
- Multi-region, with per-region rules for places like India and UAE.

**The lesson for us:** the media path and the config path are separate concerns. Config is ordinary
CRUD. Media is a scaling problem. Do not let them share a codebase or a deploy.

---

## 2. The object model (the part worth copying)

### 2.1 Telephony chain

```
Location (a real street address)
   └── Site (a telephony zone; has timezone, media model, caller ID)
         ├── Number Plan   (ordered rules: what does a dialled string mean?)
         ├── Outbound Route (per classification → which trunk to use)
         └── Edge / Edge Group (the media engine)
               ├── Trunk Base Settings  (type: EXTERNAL | PHONE | EDGE)
               └── Phone  → Phone Base Settings → Line → Station → User
DID Pool        (a range of real numbers: start → end)
Extension Pool  (a range of internal numbers: start → end)
```

Key details we do not have and should steal:

- **Site is the unit, not the company.** Timezone, caller ID, caller name, media regions, and
  emergency behaviour all hang off the Site. A company with 3 offices = 3 Sites.
- **Number Plan** is an ordered list of match rules on a Site. Each rule has:
  `match`, `matchType`, `digitLength`, `normalizedFormat`, `priority`, `classification`.
  So "911", "9 + 10 digits", "4-digit extension" are all just rules that produce a
  **classification** string (Emergency, International, Local, Extension…).
- **Outbound Route** then maps `classificationTypes[] → externalTrunkBases[]`, with
  `distribution: SEQUENTIAL | RANDOM` and an `enabled` flag.

  This two-step split is the smart bit. *Classify the number, then route the classification.*
  It means "block international calling" is one permission on one classification, not a regex
  scattered through the dial path. **We have neither number plans nor outbound routes.**
- **Pools are ranges, not lists.** `startPhoneNumber`/`endPhoneNumber`. Cheap to store, cheap to validate.
- **Station** sits between Phone and User. A user logs *into* a station. That is what makes
  hot-desking, WebRTC, and desk phones all one concept instead of three.

### 2.2 Routing chain (the queue)

The `Queue` object is the single richest object in the whole platform. Fields that matter:

| Field | What it does |
|---|---|
| `mediaSettings` | per-channel settings: call / callback / chat / email / message. Each has `alertingTimeoutSeconds`, `serviceLevel`, `enableAutoAnswer` |
| `skillEvaluationMethod` | `NONE` / `BEST` / `ALL` — how hard skill matching is enforced |
| `bullseye.rings[]` | progressive widening. Each ring: `expansionCriteria` (TIMEOUT_SECONDS + threshold), `memberGroups`, `actions.skillsToRemove` |
| `routingRules[]` | `operator: MEETS_THRESHOLD \| ANY`, `threshold`, `waitSeconds` |
| `conditionalGroupRouting` | overflow to another group when a condition (e.g. wait time) is met |
| `scoringMethod` | `TimestampAndPriority` / `PriorityOnly` |
| `lastAgentRoutingMode` | `Disabled` / `QueueMembersOnly` / `AnyAgent` — "get me the person I spoke to last" |
| `acwSettings.wrapupPrompt` | `MANDATORY`, `OPTIONAL`, `MANDATORY_TIMEOUT`, `MANDATORY_FORCED_TIMEOUT`, `AGENT_REQUESTED` |
| `agentOwnedRouting` | agent owns the callback, with max hours to hold it |
| `directRouting` | ring a named person first, fall back to `backupQueueId` after `agentWaitSeconds` |
| `queueFlow` / `emailInQueueFlow` / `messageInQueueFlow` | what plays *while waiting*, per channel |
| `whisperPrompt` / `onHoldPrompt` | audio to agent / audio to caller |
| `enableTranscription`, `enableAudioMonitoring`, `enableManualAssignment` | supervisor + AI switches |
| `callingPartyName` / `callingPartyNumber` | outbound identity for the queue |

**Bullseye is the idea to understand.** Ring 1 = your best people. After N seconds it *widens* to
ring 2, and can *drop a skill requirement* to do it. It degrades gracefully instead of failing.
That is much better than "ring everyone" or "ring in order", which is all we have today.

Separately: **Utilization** caps how many interactions one agent can hold at once, per media type.
That is what stops an agent getting a call, two chats and an email at the same moment.

### 2.3 Skills — the missing layer
- `routing/skills` — a skill has a name; a user has the skill **with a proficiency rating**.
- `routing/skillgroups` — dynamic groups defined by a rule, not a hand-picked list.
- `routing/skillexpressions` — a validated expression language (there is a `/validate` endpoint).
- Languages are modelled exactly like skills, separately.

So the routing target is never "these 8 people". It is "anyone matching this expression, best first".

### 2.4 Time — schedules
- `Schedule` — one time span with an **RFC 5545 `rrule`**. They did not invent a recurrence format.
- `ScheduleGroup` — a timezone plus three buckets: `openSchedules`, `closedSchedules`, `holidaySchedules`.
- `IVR` — binds `dnis[]` (the numbers dialled) to `openHoursFlow`, `closedHoursFlow`,
  `holidayHoursFlow`, and a `scheduleGroup`.
- `EmergencyGroup` — a big switch that overrides everything ("snow day", "outage").

**This is the cleanest part of their design.** The number does not point at a flow.
It points at a *schedule group plus three flows*. Open/closed/holiday is never an `if` inside the IVR.

### 2.5 Architect — flows
One flow engine, 21 flow types, one editor:

`INBOUNDCALL, INBOUNDCHAT, INBOUNDEMAIL, INBOUNDSHORTMESSAGE, INQUEUECALL, INQUEUEEMAIL,
INQUEUESHORTMESSAGE, OUTBOUNDCALL, SECURECALL, VOICEMAIL, SURVEYINVITE, VOICESURVEY, SPEECH,
BOT, DIGITALBOT, WORKFLOW, WORKITEM, COMMONMODULE, EMAILSEND, VOICE`

Flows are treated like **source code**, not settings:
- versions with `SAVE` / `CHECKIN` / `PUBLISH` states, `publishedVersion` vs `savedVersion` vs `debugVersion`
- an editing **lock** (`lockedUser`, `lockedClient`) so two admins cannot clash
- typed `inputSchema` / `outputSchema` (JSON Schema) — flows can call each other like functions
- `COMMONMODULE` = a reusable subroutine
- `supportedLanguages[]` on the flow itself

**This is the biggest structural difference from us.** Our IVR menus are rows in a table.
Theirs is a versioned, lockable, publishable, typed program.

### 2.6 Conversation model
One `Conversation` holds many `Participant`s; each participant holds the media it is using
(`calls`, `chats`, `emails`, `messages`, `callbacks`, `cobrowsesessions`).

- Conversation `state`: `alerting, dialing, contacting, offering, connected, disconnected, terminated,
  converting, uploading, transmitting, parked, none`
- `disconnectType` is genuinely detailed: `endpoint.donotdisturb`, `transfer.noanswer`,
  `transfer.notavailable`, `transfer.forward`, `transport.failure`, `spam`, `peer`, …

  Rich disconnect reasons are why their reporting can answer "why did we lose that call".
  Ours cannot, because we collapse everything to success/fail.
- Real-time is a **websocket channel + topic subscription** model
  (`/notifications/channels`, `/channels/{id}/subscriptions`, `/availabletopics`), not polling.

---

## 3. Permissions — the model we should adopt

Extracted **1,430 distinct permission strings across 72 domains** from the spec.

Format is always three parts: **`domain:entity:action`**
e.g. `routing:queue:edit`, `telephony:extensionPool:add`, `authorization:role:delete`.

Actions, by frequency: `view` 446, `edit` 281, `add` 247, `delete` 203, then `search`, `assign`,
`upload`, `execute`, `publish`, `manage`.

Two refinements worth copying:
1. **`self` vs `other` are different permissions.**
   `telephony:selfStationAssociation:edit` vs `telephony:otherStationAssociation:edit`.
   `routing:directRoutingBackup:selfEdit` vs `:edit`.
   This is exactly the class of bug we hit in My Account — one permission covering both
   "edit me" and "edit anyone" is a privilege-escalation hole waiting to happen.
2. **Divisions.** A Division is a slice of the org. Every major object carries a `division` field.
   A role is granted to a user **per division**:
   `POST /authorization/subjects/{subjectId}/divisions/{divisionId}/roles/{roleId}`

   So "supervisor" is not global — you are supervisor *of the Delhi division*. There is a
   `homeDivision` for everything else. Roles carry `baseLicense` + `addonLicenses`, so
   **entitlement and permission are one system, not two.**

   We have no division concept at all (3 stray mentions, none of them this).

---

## 4. Setup order they enforce

From their own training sequence. Each step needs the one before it:

1. Organization settings (name, default language, default country)
2. **Locations** (real addresses)
3. **Sites** (telephony zones on those locations)
4. Edges / trunks (media path + carrier)
5. **DID pools and extension pools** (number inventory)
6. **Number plans** then **outbound routes** (dial rules, per site)
7. People, then groups
8. **Roles and divisions** (before people can do anything)
9. Phones / stations, assign extensions and DIDs
10. Skills, wrap-up codes, queues
11. Schedules → schedule groups
12. Architect flows, then bind numbers to flows
13. Scripts, outbound campaigns, quality, WFM

Note where **number plans (6)** sit: *before* any user or queue exists. We currently never
build that layer, so dial-string meaning gets decided ad hoc later, in several places.

---

## 5. Their design system — Spark

Package: `genesys-spark-components` v4.262.6. Web Components (Stencil), prefix `gux-`.
Runtime deps are small and telling: `@floating-ui/dom` (positioning),
`google-libphonenumber` (phone input), `@vvo/tzdb` (timezones), `intl-messageformat` (i18n),
`@js-temporal/polyfill` (dates), `sortablejs`.

**105 components, in three explicit maturity tiers:**
- **stable (49)** — `gux-table`, `gux-modal`, `gux-dropdown`, `gux-form-field`, `gux-tabs`,
  `gux-pagination`, `gux-toast`, `gux-tooltip`, `gux-column-manager`, `gux-blank-state`, …
- **beta (48)** — `gux-side-panel`, `gux-stepper`, `gux-tree`, `gux-phone-input`,
  `gux-time-zone-picker`, `gux-rich-text-editor`, `gux-segmented-control`, `gux-selector-cards`,
  and the AI set: `gux-ai-indicator`, `gux-ai-powered-badge`, `gux-sparkle-indicator`
- **legacy (8)** — kept working, clearly marked as on the way out

The tiering is a product decision, not a folder name. It lets them ship unfinished components
without pretending they are final, and delete old ones without breaking anyone.

### Tokens — 4,213 of them, in three layers
```
--gse-core-*      raw values      --gse-core-color-azureBlue-500: #2954cb
--gse-semantic-*  meaning         --gse-semantic-background-container-canvas
--gse-ui-*        per component   --gse-ui-button-*, --gse-ui-globalNav-*, --gse-ui-charts-*
```
Components only ever read `--gse-ui-*`. Those read `--gse-semantic-*`. Those read `--gse-core-*`.
Light and dark are swapped **only at the semantic layer** — the same token name gets a different
value. Components contain no colour logic at all.

Biggest token groups tell you where the design effort went:
`charts` (916), `theme` (562), `dataTableItems` (393), `background` (332), `globalNav` (306),
`avatar` (230), `rte` (199), `formControl` (189).

**Nearly a quarter of the entire design system is charts and data tables.** For an admin/analytics
product, that is the correct place to spend design effort. Worth remembering for our reports pages.

### Scales
- **Spacing** (8px-ish, with fine-grain low end): 1, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48
- **Font size**: 10, 12, 14, 16, 18, 24, 36, 48, 56, 60, 72
- **Font weight**: 400 / 600 / 700 only — three weights, no more
- **Line height**: paired to size (14, 16, 20, 24, 27, 32, 44, 58, 64, 72, 86)
- **Radius**: none, xs, sm, md, 2md, lg, xl, full
- **Border width**: 1, 2, 3
- **Fonts**: Urbanist (display), Noto Sans (UI), Roboto, Noto Sans Mono
- **Icon sizes**: 8 / 16 / 24 / 32 / 48

### Palette
Named hues, each with a 50→1000 ramp:
`genesysNavy, genesysOrange, azureBlue, emerald, coral, honey, haze, mineral, island, jade,
mango, pear, pepper, plum, raspberry, violet`

Anchors: navy `#141c34` (900) / `#596ea6` (500) · orange `#ff451a` · azureBlue `#2954cb`
· emerald `#09b581` · coral `#ff5c77` · honey `#f8c73e`

Semantic system colours come in 5 roles — `primary, success, warning, error, info` — each with
background / border / foreground variants for light and dark.

---

## 6. Where MCM stands (checked against the code, not assumed)

| Concept | Genesys | MCM today |
|---|---|---|
| Queue routing | bullseye rings, skill evaluation, conditional group routing, last-agent, direct routing, per-channel media settings | **7 ring strategies** (ring all, longest idle, round robin, top down, least talk time, fewest calls, random) but no skills, no tiered escalation, no last-agent, no overflow |
| Skills | skills + proficiency + skill groups + validated expressions | 4 files mention the word; no skill model |
| Divisions | every object scoped; roles granted per division | 3 unrelated mentions; no model |
| Number plans | ordered match rules → classification | **none** |
| Outbound routes | classification → trunk, sequential/random | **none** |
| Wrap-up codes / ACW | 5 prompt modes + timeout + codes per queue | partial (22 files touch wrapup) |
| Schedules | rrule + open/closed/holiday groups + emergency override | present (81/56 files) — check it has the 3-bucket shape |
| IVR | versioned, lockable, typed, publishable flows; 21 types | menu rows in a table |
| Utilization | per-media concurrency cap per agent | 3 mentions; no cap model |
| Permissions | 1,430 strings, `domain:entity:action`, self vs other split | flat roles |
| Disconnect reasons | ~20 typed reasons | collapsed |

### The five I would fix first, in order
1. **Permission strings + self/other split.** Cheapest, and it closes real security holes we
   already know about (see the outstanding-blockers note).
2. **Number plan → classification → outbound route.** Turns dial rules into data. Makes
   "no international calling" a one-line policy instead of scattered regex.
3. **Skills with proficiency**, then wire them into the queue.
4. **Bullseye rings on queues.** We already have 7 flat ring strategies; what is missing is tiered escalation that widens over time. Big perceived-quality jump for one new sub-object.
5. **Flow versioning** (save / check in / publish + edit lock) before the IVR builder grows further.
   Retrofitting versioning later is very expensive.

### On design
Adopt the **three-layer token model** (core → semantic → ui) even if we keep our own components.
It is what makes dark mode and re-theming a config change instead of a rewrite. And budget real
design time on **tables and charts** — that is where an admin product is actually judged.

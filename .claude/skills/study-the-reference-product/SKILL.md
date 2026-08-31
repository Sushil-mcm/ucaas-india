---
name: study-the-reference-product
description: "How to learn a competitor or reference product deeply enough to build against it - sourcing their documentation, extracting the reasoning behind their design rather than copying screens, auditing your own product section by section, and mapping their vocabulary onto yours. Use when asked to match, compare against, or build something the way another product does it. Not needed when the requirement is already specified."
---

## What this is for

"Build it like they do" is a request to understand a product well enough to reproduce its *judgement*, not its screenshots. A feature list copied without the reasoning produces a product that has the same parts arranged so they do not work.

The goal is to be able to answer: **why does that capability sit at that level, on that screen, at that price?** Once you can answer that, you can decide the things their documentation never covers, and you can decide them the same way they would.

---

## 1. Get a corpus you can actually search

Fetching a competitor's pages one at a time as you need them does not work, and fails in ways that waste hours:

- Help centres are often behind Cloudflare and return a challenge to a plain fetch.
- Documentation sites frequently render entirely client-side — you get an empty shell.
- You cannot grep across pages you have not fetched, so you never find the article that answers the question.

**Mirror the documentation locally first, then search it offline.** A few hundred articles on disk turns "I think they do X" into a citation in seconds.

Where the front door resists:
- A browser user-agent plus a primed cookie jar gets past most bot checks.
- If a docs site renders nothing, look for the machine-readable artefacts instead: a public OpenAPI/Swagger spec, an SDK package on npm or PyPI, a published Postman collection. An API spec is often a *better* source than prose — it is exhaustive, precise, and cannot hand-wave.

Keep the corpus in a known place and say where it is, so nobody re-fetches it.

---

## 2. Read for the rule, not the feature

The feature list is the least valuable thing in the documentation. Anyone can see the features by looking at the product.

**What you are mining for is the principle that decides where a capability goes.** These are rarely stated outright; you infer them by reading several sections and noticing what they have in common.

Worked example — reading one product's admin tiers side by side showed the tier descriptions were near word-for-word repeats. Only the *objects* changed. That single observation yielded five rules that decided every remaining question:

1. **Money and account shape sit above ordinary admin.** Operations get delegated; the card does not.
2. **Identity versus membership.** Creating or deleting a person belongs to whoever owns the staff list. Adding an existing person to a queue belongs to whoever runs the queue. That one line separates two admin tiers more cleanly than any screen list.
3. **Configuration versus supervision, and supervision reaches further down.** Listening or marking someone unavailable lasts one shift; changing routing lasts until somebody changes it back. Their supervisor is *an agent promoted*, not an admin demoted, and configures nothing.
4. **Data defaults to "your own".** Broader access is opened deliberately, on two axes: read vs delete, own vs everyone.
5. **A person's own settings are walled off from admins.**

Five rules like that are worth more than a hundred screenshots. They let you place a feature the reference does not have.

Other structural rules worth looking for, because they recur:

- **What is the dividing line between two similar objects?** In telephony, a ring group and a queue differ by whether the system records agent on/off duty. Every advanced capability — service level, wrap-up, dispositions, live dashboards — hangs off that one record existing. Decide the dividing line first and the feature list follows.
- **What is enabled centrally and configured locally?** A master switch at company level that unlocks an editor elsewhere keeps the central record thin as features are added.
- **What is deliberately impossible?** Structural guarantees beat validation messages. One product auto-creates an undeletable default branch on every menu and refuses to publish while it is unconnected — dead ends cannot exist, rather than being caught in review.

---

## 3. Comparison tables tell you the commercial model

A plan-comparison table is the single densest artefact in any SaaS documentation. It tells you, per tier, what is included, what costs extra, and what does not exist.

Look specifically at **what they give away**. In one case transcripts, call summaries and snippets were free on *every* tier including the cheapest, while scoring, satisfaction measurement and live coaching were paid add-ons.

That is a deliberate line: the transcript is a by-product once speech-to-text is running, and the **judgement built on top of it** is the product. Charging for the by-product loses deals without earning much.

Mine these for:
- **Included vs paid** — usually a distinct marker in the table
- **What is a licence rather than a switch** — add-ons sold per seat are a different mental model from features toggled on
- **Where metering appears and disappears** — one product meters minutes on its entry tier and goes unlimited above it, so the constraint sits where volume is lowest

---

## 4. Audit your own product against it, section by section

Produce a gap table per area. The columns that matter:

| Their feature | What exists here | Does anything act on it | What is missing | Buildable now |
|---|---|---|---|---|

The third column is the one people skip and the one that matters. A setting that saves and is read by nothing is not a feature — and if the screen does not say so, it is worse than absent.

**Two things to establish for every gap:**

- **Is this a gap, or a regression?** These have completely different costs. A regression means it worked once, so working code exists as a specification — restoring proven behaviour instead of designing it. Diffing an old build against the current one settles it in minutes and can reclassify half a backlog. In one case that diff showed timezone handling, greetings, hold music and holiday routing had all worked and been dropped in a rewrite, while after-hours routing genuinely never existed. Same list, two very different jobs.
- **Where would it have to be enforced?** In the app, in an API, or somewhere else entirely such as a switch or worker. This decides whether it is achievable at all right now.

---

## 5. Map their vocabulary onto yours — never import it

The reference calls it an *office*; you call it a *location*. They say *department*; you may mean a ring group.

Translate deliberately, and write the mapping down. Two failures to avoid:

- **Importing their word** into your product, so your UI now has two names for one thing.
- **Assuming the word means the same thing.** Their "department" may be a full phone line with its own numbers, hours and hold queue, while yours is a list of people who ring together. Same word, different object, and the word sets a customer expectation you then fail.

Check your own product for the inverse too — one codebase called the same object "Department" in the menu and "Group" in every forwarding dropdown, while a *different* object was also called "group" elsewhere.

**Never write the competitor's name into the product**: not in UI text, not in code comments, not in commit messages. Study them; do not name them.

---

## 6. Their prices are evidence, not your prices

A published price tells you what the market accepts and how they structure charging. It is not a number to copy into your product.

**Never present a competitor's rates as your own.** Where you need real figures — per-country rates, for instance — use your own, and link to the screen that has them.

Do use their structure as a check on yours. If your overage rate is a third of theirs for something with a genuine per-unit cost, that is worth raising before launch: rates are far harder to raise than to set, because customers anchor on the first one they see.

---

## 7. Turn the reasoning into something testable

The most durable output of studying a reference product is not a screen. It is a **tested rules module**: the precedence order, the allowance logic, the routing decision, written down with its reasoning and proven.

That way the reasoning survives the person who did the reading, and the backend reuses it instead of re-deriving it differently. A rule with a test and a comment explaining *why* is worth more than a screenshot folder.

Write the *why* into the code:

```
/* The company's list is the ceiling; a person can be refused a country the
   company allows, never granted one it forbids. Ordering it this way makes the
   ceiling structural rather than something the next reader has to remember. */
```

---

## 8. Report honestly, including what you did not check

- **Cite the article or spec** you drew a conclusion from.
- **Separate "they do X" from "I infer they do X".**
- **Say when their model does not fit.** Not every convention transfers; a product with one location does not need their multi-office hierarchy, and adopting it early adds cost with no benefit.
- **Flag decisions rather than making them silently.** "Is a location an address or a tenant?" is a question for the product owner. Every field added before it is answered makes it harder to unpick.

---
name: verify-before-claiming
description: "Checks for work on live systems: proving a change is running, proving an absence is real, and keeping screens honest about what does not work yet. Use when deploying to a server, patching a running service, auditing whether a feature works, or building UI over a backend that cannot yet do what the screen implies. Not needed for ordinary local code changes with no deployment or claim of liveness attached."
---

## What this is for

Work on a running system fails in a particular way: **the check passes and the claim is still false.** The deploy succeeded, on the wrong machine. The grep returned zero, from the wrong directory. The endpoint returned 200, with an empty body. The file was edited, and the process never restarted.

Every rule here comes from one of those actually happening. They cost hours each, and none of them looked like a mistake at the time — each one produced a confident, well-evidenced, wrong report.

Two questions run through all of it:

1. **Am I proving the thing I am claiming, or something adjacent to it?**
2. **Does the screen tell the truth about what the system can actually do?**

---

## 1. A zero proves nothing without a control

Searching for something and finding nothing has two explanations: it is absent, or you looked in the wrong place. They are indistinguishable from the result alone.

**So every zero needs a control: search the same scope for something you know is there.**

```bash
grep -c "do_not_disturb" service.py     # 0 — absent, or wrong file?
grep -c "user_call" service.py          # 1 — the file and the search both work
```

Now the zero means something.

Real cases from one project:
- A grep over `routes/*.js` returned nothing. The directory was `routers/`. The conclusion happened to be right and the reasoning was worthless.
- "Nothing imports this helper" — a too-narrow pattern. Eleven files imported it.
- "No transfer UI reads these permissions" — the hooks read the *stored* shape, not the form field names. They were enforced all along.

The same trap inverted: **a reference count is not usage.** Four files referenced a recording script; all four were the other recording scripts citing each other. Nothing invoked any of them.

---

## 2. A file edited is not a change running

A service holds its code in memory. Editing the file changes nothing until it restarts.

**Proof: process start time must be later than file mtime.**

```bash
ls -l --time-style=+%H:%M:%S service.py     # file:    10:36:06
ps -o lstart= -p $(pgrep -f service.py)     # process: 10:36:07   ✓ newer
```

This single check caught three separate "it's live" reports that were not, including a codec fix edited days earlier that had never once run.

---

## 3. Confirm the machine before the change

Where several machines run the same stack, deploying to the wrong one succeeds perfectly and changes nothing. Every check passes. Nothing is wrong except the box.

A whole chain of fixes once went to a server named `mcm-switch` — reasonably, since it ran the switch software. Production was a different box. The name was the entire basis for the choice, and it was wrong.

**Identify production by something behavioural, not by name:**

```bash
hostname                                    # UCaaS-Live vs Ucaas-backend2
fs_cli -x 'show registrations' | tail -1    # 1 total  vs  0 total
```

Live registrations, live traffic, live connections. A name is a label somebody chose once.

Worse: one machine had a **fake `systemctl` that always exits 0**. Every service command reported success and did nothing.

---

## 4. Verify the served artifact, not the local one

After deploying a web build, fetch the file over HTTP and search it for a string from your change.

**Two ways this check passes while being worthless:**

- **Verifying the entry bundle when your change is in a lazy chunk.** The entry hash is unchanged, matches, and proves nothing. Find the chunk that actually contains your change and fetch that.
- **Choosing a marker that does not survive.** Function names get minified. Strings built at runtime (`` `Unlimited ${unit}` ``) never appear as literals. Comments are stripped. Pick a literal that ships.

```bash
f=$(grep -rl "a distinctive phrase from your change" dist/assets/*.js | head -1)
curl -s "https://site/assets/$(basename $f)" -o /tmp/c.js
grep -q "a distinctive phrase from your change" /tmp/c.js && echo LIVE
```

A verification that fails loudly on a bad marker is doing its job. One that passes on a bad marker is worse than none.

---

## 5. A status code is not a body

`200` means the request was handled. It does not mean an answer came back.

One config service returned **HTTP 200 with a zero-byte body** for several lookups. "It returns 200" read as "it works" and meant nothing. Check size and content:

```bash
curl -s "$url" | wc -c
```

---

## 6. Patch scripts must refuse to run on a file they do not recognise

When editing a file you did not write — compiled output, a config on a server, a generated bundle — the danger is a half-applied change on a file that has drifted.

Every patch script should:

- **Assert its anchors exist, and exactly once.** Abort loudly otherwise.
- **Be a no-op if already applied**, so re-running is safe.
- **Assert the result** rather than trusting the replacement.
- **Leave a dated backup** beside the original.
- **Syntax-check** before restarting anything (`node --check`, `python3 -m py_compile`).

```python
if source.count(anchor) != 1:
    raise SystemExit("ABORT: expected one %r, found %d" % (anchor, source.count(anchor)))
```

Get the assertion right too. A check for a marker that legitimately appears twice — once declared, once used — fails on correct work. Assert on the specific thing, not the loose one. When an assertion does fire before writing, the file is untouched: that is the design working.

---

## 7. Say what does not work, on the screen

Building UI over a backend that cannot yet do the thing is normal. Shipping a screen that *implies* it can is not.

Give every control an honest state:

| State | Means |
|---|---|
| **Active** | It works |
| **In this app only** | Works here; nothing behind it re-checks. Not a security boundary |
| **Coming soon** | The platform cannot do this yet. Your choice is saved and waiting |
| **Off** | You have not switched it on |

Three rules:

- **Change the badge in the same commit as the behaviour**, in either direction. Every wrong label starts accurate and gets left behind.
- **"Works in the app only" is not "coming soon".** Labelling a working control as unbuilt makes someone rebuild it.
- **A control with no badge claims to work by saying nothing.** Silence is a claim.

Real examples: a Do Not Disturb setting promising "all calls go to voicemail" when nothing in the call path read it. A ring-time setting badged Active while the switch hardcoded the value. Six controls badged Active that only worked in the browser.

---

## 8. Never render zero when the truth is unknown

**A zero reads as a fact.** "You used 0 AI minutes and owe nothing" is a different statement from "nobody counted".

On anything involving money this is the expensive one — a wrong figure becomes a refund conversation, and the customer is right.

```js
// Number(null) is 0. Check before converting - the conversion loses the difference.
if (value === null || value === undefined) return 'Not available yet';
```

Cases found in one sweep: a seat removal offering **$0.00** off the bill, storage sold at **$0.00** with a working buy button, a green **"Free"** badge on any number with unknown cost, and a **"Pay $0"** button.

The same applies to totals: a total that silently omits an unmeasured service while looking complete is the number somebody disputes. Report what was counted and what was not.

---

## 9. Sentinels fail in a direction — choose the safe one

When a value like "unlimited" must live in a numeric column, every option is wrong somehow. Pick the one that is wrong *safely*.

| | |
|---|---|
| `0` | Charges from the first unit — the opposite of unlimited |
| `null` | Becomes `NaN`; comparisons are false, so it looks free until some other sum turns it into a charge |
| `-1` | Makes `used > included` true at once — bills everything |
| A very large number | Any comparison says "still inside" — **fails towards not charging** |

Then define a named threshold and render the word, so nobody is shown `999,999,999 minutes`.

---

## 10. Decidable logic goes in a tested module, not a component

Rules — what an allowance covers, who may be removed, which agent a call rings — belong in a plain module with tests, not inside a screen.

- It can be proven before the backend exists.
- The server reuses it instead of re-deriving it differently.
- Hardcode real figures in tests. When a price changes, tests fail — **that is the safety net, not a nuisance.** A price change that breaks no test means nothing was checking it.

Tests written as sentences about behaviour double as the specification: `is('the eleventh minute is charged, not the whole call', ...)`.

---

## 11. Reporting

- **Say which check you ran and what it returned.** "Verified" alone is not a report.
- **Correct your own reasoning even when the conclusion survives.** A right answer from a bad check will be trusted next time, when it is wrong.
- **Distinguish "I could not determine this" from "this is absent."** Both are useful; confusing them is not.
- **Never report a peer's finding as your own verification.** Re-check the load-bearing ones — several confident cross-checks in one project turned out to be measuring different things, and both parties were right about different artifacts.
- When something is not done, say so plainly and say what is missing. A clear "this cannot be done without X" is worth more than an optimistic "done".

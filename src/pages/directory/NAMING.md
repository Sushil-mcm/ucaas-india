# Directory naming — the checked-in record

One word per concept, everywhere a person can read it. The API keeps its own words;
this table is the only place the two vocabularies are allowed to meet.

Decided 2026-08-23. Add a row here **before** shipping a label for a new concept.

## The table

| Concept                                              | Word we use         | Retired words                                   | API path                                                                | Payload field                           | Type in code |
| ---------------------------------------------------- | ------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------- | ------------ |
| A physical place — address, timezone, business hours | **Location**        | Site                                            | `/api/site/list`, `/api/site/upsert`, `/api/site/delete`                | `site_uuid`, `site.name`, `site_detail` | `Location`   |
| A team; a person can be in several                   | **Group**           | Department                                      | `/api/tenant/department/list`, `/upsert`, `/delete`, `/role-based-list` | `department`, `members`                 | `Group`      |
| Someone inside the org                               | **Person** / People | User, Member, Extension (when it meant a human) | `/api/user/list`, `/api/user/update`, `/api/user/add-member`            | `uuid`, `user_uuid`                     | `Person`     |
| The number a person answers on                       | **Extension**       | — (keeps its name; never means a human)         | —                                                                       | `extension`                             | `Extension`  |
| Someone outside the org                              | **Contact**         | Lead                                  | `/api/contact/list`, `/api/contact/upsert`                              | `_id`                                   | `Contact`    |
| The tenant — it is the default Location's record     | **Company**         | Account, Organisation                           | `company_info` on the auth user                                         | `company_info.uuid`                     | `Company`    |

## Rules

1. **Only `services/api` speaks the wire.** Past that boundary nothing says `site_uuid` —
   it is a `locationId` on a `Location`.
2. **No third word.** If a concept needs a name it is in the table above, or it is a new
   concept and gets a row first.
3. **Query keys start with the API name**, then the surface:
   `['getDepartmentList', 'directoryGroups']`. The prefix is what lets the platform's
   existing writes refresh a console screen — inventing a key instead is what caused
   newly created groups and contacts not to appear.
4. **A label never shows a wire word.** No heading, placeholder, tooltip or error says
   "site" or "department" to a person.
5. **Extension is the number, not the human.** A list of humans is People, including in
   Admin.

## Known drift, not yet renamed

These still use a retired word in a **user-visible label** and are safe to change — none
of them touches a request body:

- `Site` → `Location`: ~27 files carry a visible label.
- `Department` → `Group`: ~16 files, including the whole Admin ▸ Users ▸ Department area.
- Admin ▸ Users ▸ `Extension` list → `People`: ~23 files reference the label.
- `External` → `Contacts`: ~4 files. Deliberate departure from the console mock, because
  "external" names a property rather than a thing.

Directory (`src/pages/directory/`) is already consistent with the table; the rename works
outward from there, one concept per deploy.

**Update 2026-08-24 — the Directory view is titled "External Contacts".** The *record* is
still a Contact; "external" qualifies which contacts the view lists (people outside the org),
so this is a view name rather than a second word for the entity. Retired: "Lead".

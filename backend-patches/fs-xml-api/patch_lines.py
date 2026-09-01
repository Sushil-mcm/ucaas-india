"""Honour the holiday and away dates set on each line, not only the company's.

Company holidays became real on 1 Sep 2026. Everything below the company did
not: a person's own hours and holidays, a number's own hours and holidays, and
an IVR menu's own hours were all stored by the portal and read by nothing, so
"this agent is off that week" changed no call. This adds the three that can be
answered from MySQL:

  * The NUMBER's own opening hours, alongside the company's. Either one saying
    closed is enough - a branch line can shut while head office is open.
  * The PERSON being rung: their own opening hours and holidays, and an away
    period (annual leave). Applied to a call arriving on a number that rings
    them AND to a colleague dialling their extension, because being on leave
    does not stop at the front door.
  * The IVR MENU's own opening hours, so a menu can send after-hours callers
    somewhere else without the company having to be shut too.

Call QUEUES are deliberately absent. There is no queue table in this database -
a queue's record travels inside the number's `forward_call_actions`, and its
agent list lives outside MySQL - so there is nothing here to read. That gap is
named on screen rather than half-built.

The existing rule is kept everywhere: only a definite "closed" changes a call.
Anything unknown - no hours, an unusable timezone, an unreadable date - behaves
exactly as it does today and the call connects. Guessing "closed" sends a real
caller to voicemail on a working day, and nobody finds out until a customer
complains.
"""

import io
import sys

PATH = sys.argv[1]
with io.open(PATH, encoding="utf-8") as handle:
    text = handle.read()

# ---------------------------------------------------------------- new helpers
ANCHOR = '''def company_operational_hours(db_name):'''

HELPERS = '''def _as_date(value):
    """A DATE column, a datetime, or a "YYYY-MM-DD" string -> a date."""
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    return _one_date(value)


def person_is_away(user_row, today):
    """Is this person on leave on `today`?

    Two stores are read because two exist. `settings.away` is where the portal
    writes an away period. `holiday_start_date` / `holiday_end_date` are columns
    that have been on the users table all along, returned by the API and written
    by nothing - honoured here so that if anything ever does write them they
    work, rather than being a second silent dead end.

    BOTH ends are required. A start with no end would mean "away until somebody
    remembers to clear this", and an admin who sets a start date and moves on
    would take that person off the phones permanently without being told. A
    half-filled period is treated as not set.
    """
    if not isinstance(user_row, dict):
        return False

    periods = []
    settings = _as_object(user_row.get("settings"))
    away = _as_object(settings.get("away"))
    if away:
        periods.append((away.get("from"), away.get("to")))
    periods.append((user_row.get("holiday_start_date"), user_row.get("holiday_end_date")))

    for raw_from, raw_to in periods:
        start = _as_date(raw_from)
        end = _as_date(raw_to)
        if start is None or end is None or end < start:
            continue
        if start <= today <= end:
            return True
    return False


def _today_in(operational_hours):
    """Today's date in the company's own timezone, UTC if it has none."""
    settings = _as_object(operational_hours)
    tz_name = str((_as_object(_as_object(settings.get("regional")).get("timezone"))).get("value") or "").strip()
    tz = None
    if tz_name and ZoneInfo is not None:
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = None
    return datetime.datetime.now(tz or datetime.timezone.utc).date()


def person_unavailable(domain, extension):
    """Is the person on this extension unreachable right now - on leave, or
    outside their own working hours? Returns a short reason, or "" for reachable.

    Anything that cannot be answered returns "" and the call rings as it does
    today. A lookup that fails must never be the thing that stops a phone
    ringing.
    """
    try:
        user_row = lookup_user_by_extension_full(domain, extension)
    except Exception as e:
        log("error", "person availability lookup failed, ringing anyway: %s" % e)
        return ""
    if not user_row:
        return ""

    settings = _as_object(user_row.get("settings"))
    hours = _as_object(settings.get("operational_hours"))

    if person_is_away(user_row, _today_in(hours)):
        return "away"
    if business_hours_state(hours) == OPERATIONAL_HOURS_CLOSED:
        return "own-hours"
    return ""


_person_cache = {}
_person_cache_time = {}


def lookup_user_by_extension_full(domain, extension):
    """The columns the availability check needs, which the routing lookup does
    not select. Cached for the same few seconds as the other call-path reads;
    an away period does not change between two rings."""
    key = "%s|%s" % (domain, extension)
    now = time.time()
    if key in _person_cache and (now - _person_cache_time.get(key, 0)) < CALLING_RULES_CACHE_SECONDS:
        return _person_cache[key]

    db_name = domain_to_dbname(domain)
    row = None
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT u.uuid, u.extension, u.settings,
                   u.holiday_start_date, u.holiday_end_date
            FROM users u
            JOIN companies c ON c.uuid = u.company_uuid
            WHERE c.db_name = %s AND u.extension = %s AND u.status = 'ACTIVE'
            LIMIT 1
        """, (db_name, extension))
        row = cur.fetchone()

    _person_cache[key] = row
    _person_cache_time[key] = now
    return row


_ivr_cache = {}
_ivr_cache_time = {}


def ivr_operational_hours(db_name, ivr_uuid):
    """A menu's own opening hours. Missing or unreadable returns nothing, which
    the caller reads as "unknown" and therefore as today's behaviour."""
    if not db_name or not ivr_uuid:
        return {}
    key = "%s|%s" % (db_name, ivr_uuid)
    now = time.time()
    if key in _ivr_cache and (now - _ivr_cache_time.get(key, 0)) < CALLING_RULES_CACHE_SECONDS:
        return _ivr_cache[key]

    hours = {}
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("SELECT settings FROM `%s`.ivrs WHERE uuid = %%s LIMIT 1" % db_name,
                        (ivr_uuid,))
            row = cur.fetchone() or {}
            hours = _as_object(_as_object(row.get("settings")).get("operational_hours"))
    except Exception as e:
        log("error", "IVR hours lookup failed, treating as unknown: %s" % e)
        return {}

    _ivr_cache[key] = hours
    _ivr_cache_time[key] = now
    return hours


def closed_action_route(operational_hours):
    """The (type, value) a line is set to use when it is shut, read from the
    flat shape the portal stores. Both halves must be present: a type with no
    value is not a destination, and sending a call at one would drop it."""
    hours = _as_object(operational_hours)
    for key in ("holidays_action", "closed_hour_action"):
        action = _as_object(hours.get(key))
        kind = str(action.get("type") or "").strip().upper()
        value = action.get("value")
        if kind and value:
            return kind, str(value)
    return "", ""


def company_operational_hours(db_name):'''

assert text.count(ANCHOR) == 1, "anchor"
text = text.replace(ANCHOR, HELPERS)

with io.open(PATH, "w", encoding="utf-8") as handle:
    handle.write(text)
print("helpers added to %s" % PATH)

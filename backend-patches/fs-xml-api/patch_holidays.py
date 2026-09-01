"""Make the holiday check read the dates the portal actually stores.

Three edits, all inside the opening-hours block of dialplan_service.py:

  1. `_holiday_dates` read the day off the keys `date`, `day`, `value` and
     `start`. A stored holiday has none of them: it is `{title, from, to, type,
     type_label, name, value, personal}`, where `value` is the ACTION's value -
     an extension number - and never a day. So `fromisoformat("1001")` raised,
     the entry was skipped, and every holiday in the system silently missed.
     It now reads `from`..`to`, which is the shape every screen has always
     written, and fills in each day in between.

  2. A company holiday marked "repeats every year" is matched on month and day
     rather than the exact date it was entered on, so 25 December keeps working
     in 2027 without anyone re-typing it.

  3. The Holidays screen writes its list to `settings.company_holidays`, a
     different key from `settings.operational_hours.holidays`. Nothing read it,
     which is why that page had to tell admins it did nothing. The lookup now
     merges the two, so the declared company list closes lines on its own.
"""

import io
import sys

PATH = sys.argv[1]

with io.open(PATH, encoding="utf-8") as handle:
    text = handle.read()

OLD_DATES = '''def _holiday_dates(holidays):
    """Several plausible stored shapes are accepted rather than assumed.
    Anything unreadable is skipped - a holiday nobody can parse must not turn
    into a closed day by accident."""
    out = set()
    if not isinstance(holidays, list):
        return out
    for entry in holidays:
        raw = None
        if isinstance(entry, str):
            raw = entry
        elif isinstance(entry, dict):
            for key in ("date", "day", "value", "start"):
                if isinstance(entry.get(key), str):
                    raw = entry[key]
                    break
        if not raw:
            continue
        try:
            out.add(datetime.date.fromisoformat(raw.strip()[:10]))
        except ValueError:
            continue
    return out
'''

NEW_DATES = '''# A range longer than this is read as a typo rather than a year-long closure,
# and only its first day is taken. Nobody shuts a phone line for two years by
# intent, but a mistyped year turns one day into exactly that.
HOLIDAY_RANGE_LIMIT_DAYS = 366


def _one_date(value):
    """"2026-12-25" -> a date. None if it is not one.

    Ten characters minimum, so a time ("09:00") or an extension ("1001") is
    refused rather than half-parsed.
    """
    if not isinstance(value, str):
        return None
    text = value.strip()
    if len(text) < 10:
        return None
    try:
        return datetime.date.fromisoformat(text[:10])
    except ValueError:
        return None


def _holiday_dates(holidays):
    """Every day the company has declared closed.

    Returns two sets: the exact dates, and the (month, day) pairs of holidays
    marked as repeating every year, which are matched whatever the year is.

    A holiday is stored as a range - `from` and `to`, the same date twice for a
    single day - and that is the shape every screen in the portal writes, and
    always has. `value` is deliberately NOT read as a day: on a stored holiday
    that key holds the action's value, an extension number. Reading it as a date
    is what made every holiday miss.

    Anything unreadable is skipped. A holiday nobody can parse must not turn
    into a closed day by accident: the cost of a wrong "closed" is a real caller
    sent to voicemail on a working day, and nobody finds out until a customer
    complains.
    """
    exact = set()
    yearly = set()
    if not isinstance(holidays, list):
        return exact, yearly

    for entry in holidays:
        repeats = False
        if isinstance(entry, str):
            start = _one_date(entry)
            end = start
        elif isinstance(entry, dict):
            start = None
            for key in ("from", "date", "day", "start"):
                start = _one_date(entry.get(key))
                if start:
                    break
            end = None
            for key in ("to", "till", "end"):
                end = _one_date(entry.get(key))
                if end:
                    break
            repeats = bool(entry.get("repeats_yearly"))
        else:
            continue

        if start is None:
            continue
        if end is None or end < start:
            end = start
        span = (end - start).days
        if span > HOLIDAY_RANGE_LIMIT_DAYS:
            span = 0

        for offset in range(span + 1):
            day = start + datetime.timedelta(days=offset)
            if repeats:
                yearly.add((day.month, day.day))
            else:
                exact.add(day)

    return exact, yearly
'''

OLD_CALL = '''    if local.date() in _holiday_dates(settings.get("holidays")):
        return OPERATIONAL_HOURS_CLOSED
'''

NEW_CALL = '''    today = local.date()
    exact_holidays, yearly_holidays = _holiday_dates(settings.get("holidays"))
    if today in exact_holidays or (today.month, today.day) in yearly_holidays:
        return OPERATIONAL_HOURS_CLOSED
'''

OLD_LOOKUP = '''            row = cur.fetchone() or {}
            hours = _as_object(_as_object(row.get("settings")).get("operational_hours"))
'''

NEW_LOOKUP = '''            row = cur.fetchone() or {}
            settings = _as_object(row.get("settings"))
            hours = dict(_as_object(settings.get("operational_hours")))
            # Company > Holidays keeps its list under its own key, separate from
            # the holidays typed into the opening-hours dialog. Both are the
            # company saying "we are shut on this day", so both are honoured and
            # neither overwrites the other.
            declared = settings.get("company_holidays")
            declared_items = declared.get("items") if isinstance(declared, dict) else declared
            if isinstance(declared_items, list) and declared_items:
                existing = hours.get("holidays")
                hours["holidays"] = (existing if isinstance(existing, list) else []) + declared_items
'''

for old, new, label in (
    (OLD_DATES, NEW_DATES, "_holiday_dates"),
    (OLD_CALL, NEW_CALL, "holiday check"),
    (OLD_LOOKUP, NEW_LOOKUP, "company settings lookup"),
):
    if text.count(old) != 1:
        raise SystemExit("no single match for %s (found %d)" % (label, text.count(old)))
    text = text.replace(old, new)

with io.open(PATH, "w", encoding="utf-8") as handle:
    handle.write(text)

print("patched %s" % PATH)

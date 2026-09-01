"""A declared holiday beats the weekly schedule, including "open 24 hours".

Before this, the holiday check sat after the schedule branch, so a company set
to 24 hours never observed one, and a company that had never filled in a weekly
schedule never observed one either - the function returned "unknown" and left
the call alone before it ever looked at the dates. Both are wrong for the same
reason: a holiday is not a gap in a schedule, it is the owner saying outright
"we are shut that day", and that statement should not need a timetable behind it
to count.

The timezone is still needed to know which day "today" is. A schedule of times
is meaningless without a real one, so the weekly branch below still refuses to
guess; but for a whole-day holiday, UTC is close enough to read a calendar date
by, and the alternative is the feature silently doing nothing.
"""

import io
import sys

PATH = sys.argv[1]
with io.open(PATH, encoding="utf-8") as handle:
    text = handle.read()

OLD = '''    settings = _as_object(operational_hours)
    if not settings:
        return OPERATIONAL_HOURS_UNKNOWN

    kind = str(settings.get("type") or "").strip().lower()
    if not kind:
        return OPERATIONAL_HOURS_UNKNOWN
    if kind in ("24_hours", "24hours", "24"):
        return OPERATIONAL_HOURS_OPEN
    if kind != "weekly":
        return OPERATIONAL_HOURS_UNKNOWN

    tz_name = str((_as_object(_as_object(settings.get("regional")).get("timezone"))).get("value") or "").strip()
    if not tz_name or ZoneInfo is None:
        return OPERATIONAL_HOURS_UNKNOWN
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        return OPERATIONAL_HOURS_UNKNOWN

    if now_utc is None:
        now_utc = datetime.datetime.now(datetime.timezone.utc)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=datetime.timezone.utc)
    local = now_utc.astimezone(tz)

    today = local.date()
    exact_holidays, yearly_holidays = _holiday_dates(settings.get("holidays"))
    if today in exact_holidays or (today.month, today.day) in yearly_holidays:
        return OPERATIONAL_HOURS_CLOSED

    day = _as_object(_as_object(settings.get("value")).get(_HOURS_DAYS[local.weekday()]))
'''

NEW = '''    settings = _as_object(operational_hours)
    if not settings:
        return OPERATIONAL_HOURS_UNKNOWN

    if now_utc is None:
        now_utc = datetime.datetime.now(datetime.timezone.utc)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=datetime.timezone.utc)

    # The company clock, when there is one. A whole-day holiday only needs to
    # know today's date, so an unusable timezone falls back to UTC rather than
    # abandoning the check; the weekly times below are a different matter and
    # still refuse to run without a real one.
    tz_name = str((_as_object(_as_object(settings.get("regional")).get("timezone"))).get("value") or "").strip()
    tz = None
    if tz_name and ZoneInfo is not None:
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = None
    local = now_utc.astimezone(tz or datetime.timezone.utc)

    # First, before any schedule. A holiday is the owner saying "we are shut
    # that day", and that beats the weekly timetable, beats "open 24 hours",
    # and holds even for a company that never filled a timetable in.
    today = local.date()
    exact_holidays, yearly_holidays = _holiday_dates(settings.get("holidays"))
    if today in exact_holidays or (today.month, today.day) in yearly_holidays:
        return OPERATIONAL_HOURS_CLOSED

    kind = str(settings.get("type") or "").strip().lower()
    if not kind:
        return OPERATIONAL_HOURS_UNKNOWN
    if kind in ("24_hours", "24hours", "24"):
        return OPERATIONAL_HOURS_OPEN
    if kind != "weekly":
        return OPERATIONAL_HOURS_UNKNOWN

    if tz is None:
        return OPERATIONAL_HOURS_UNKNOWN

    day = _as_object(_as_object(settings.get("value")).get(_HOURS_DAYS[local.weekday()]))
'''

if text.count(OLD) != 1:
    raise SystemExit("no single match (found %d)" % text.count(OLD))

with io.open(PATH, "w", encoding="utf-8") as handle:
    handle.write(text.replace(OLD, NEW))
print("patched %s" % PATH)

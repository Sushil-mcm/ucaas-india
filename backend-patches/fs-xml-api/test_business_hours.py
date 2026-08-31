"""Business hours, including the cases that only happen at awkward times.

The point of these is that "unknown" is a real answer. Anything the settings do
not clearly say must come back unknown, so the call connects - a wrongly
refused call inside business hours is lost business, a wrongly connected one
outside them is a nuisance.
"""

import datetime
from business_hours import business_hours_state, OPEN, CLOSED, UNKNOWN

passed = 0
failed = 0


def is_(name, actual, expected):
    global passed, failed
    if actual == expected:
        passed += 1
    else:
        failed += 1
        print("FAIL  %s\n        expected %r\n        got      %r" % (name, expected, actual))


def utc(text):
    return datetime.datetime.fromisoformat(text).replace(tzinfo=datetime.timezone.utc)


WEEKDAY = {"open": True, "start": "10:00", "end": "23:00"}
CLOSED_DAY = {"open": False, "start": "", "end": ""}

# The real settings from a live company, Asia/Kolkata, 10:00-23:00, weekend off.
KOLKATA = {
    "type": "weekly",
    "regional": {"timezone": {"value": "Asia/Kolkata"}},
    "holidays": [],
    "value": {
        "monday": dict(WEEKDAY), "tuesday": dict(WEEKDAY), "wednesday": dict(WEEKDAY),
        "thursday": dict(WEEKDAY), "friday": dict(WEEKDAY),
        "saturday": dict(CLOSED_DAY), "sunday": dict(CLOSED_DAY),
    },
}

# Kolkata is UTC+5:30, so 04:30 UTC is 10:00 local - the moment it opens.
is_("open exactly when it opens",      business_hours_state(KOLKATA, utc("2026-08-31T04:30")), OPEN)
is_("one minute before opening",       business_hours_state(KOLKATA, utc("2026-08-31T04:29")), CLOSED)
is_("mid-afternoon",                   business_hours_state(KOLKATA, utc("2026-08-31T09:00")), OPEN)
is_("one minute before closing",       business_hours_state(KOLKATA, utc("2026-08-31T17:29")), OPEN)
is_("exactly at closing time",         business_hours_state(KOLKATA, utc("2026-08-31T17:30")), CLOSED)
is_("the middle of the night",         business_hours_state(KOLKATA, utc("2026-08-31T20:30")), CLOSED)

# The bug this whole change exists to fix: 2am must not be treated as 2pm.
is_("2am local is closed",             business_hours_state(KOLKATA, utc("2026-08-30T20:30")), CLOSED)

# 31 Aug 2026 is a Monday, so 5 Sep is the Saturday.
is_("Saturday is closed all day",      business_hours_state(KOLKATA, utc("2026-09-05T09:00")), CLOSED)
is_("Sunday too",                      business_hours_state(KOLKATA, utc("2026-09-06T09:00")), CLOSED)

# The timezone has to decide which DAY it is, not just the hour. A timezone
# behind UTC is what shows this: 02:00 UTC on Tuesday is still Monday 22:00 in
# New York, inside Monday's hours. Read as UTC it would be Tuesday at 2am and
# the call would be refused.
NEW_YORK = {
    "type": "weekly",
    "regional": {"timezone": {"value": "America/New_York"}},
    "holidays": [],
    "value": {
        "monday": dict(WEEKDAY), "tuesday": dict(WEEKDAY), "wednesday": dict(WEEKDAY),
        "thursday": dict(WEEKDAY), "friday": dict(WEEKDAY),
        "saturday": dict(CLOSED_DAY), "sunday": dict(CLOSED_DAY),
    },
}
is_("the timezone decides the day, not just the hour",
    business_hours_state(NEW_YORK, utc("2026-09-08T02:00")), OPEN)
is_("and the same clock reading later is genuinely shut",
    business_hours_state(NEW_YORK, utc("2026-09-08T06:00")), CLOSED)

# Always open needs no clock at all.
is_("24 hours is always open",
    business_hours_state({"type": "24_hours"}, utc("2026-08-31T20:30")), OPEN)
is_("even on a Sunday",
    business_hours_state({"type": "24_hours"}, utc("2026-09-06T03:00")), OPEN)

# Overnight shifts: 22:00 to 06:00 crosses midnight.
NIGHT = {
    "type": "weekly",
    "regional": {"timezone": {"value": "UTC"}},
    "value": {d: {"open": True, "start": "22:00", "end": "06:00"} for d in
              ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]},
}
is_("open late at night",              business_hours_state(NIGHT, utc("2026-08-31T23:00")), OPEN)
is_("still open after midnight",       business_hours_state(NIGHT, utc("2026-08-31T02:00")), OPEN)
is_("closed once morning comes",       business_hours_state(NIGHT, utc("2026-08-31T07:00")), CLOSED)
is_("closed in the afternoon",         business_hours_state(NIGHT, utc("2026-08-31T15:00")), CLOSED)

# Holidays close the day regardless of the weekly pattern.
HOLIDAY = dict(KOLKATA)
HOLIDAY["holidays"] = ["2026-09-02"]
is_("a holiday closes an open weekday",
    business_hours_state(HOLIDAY, utc("2026-09-02T09:00")), CLOSED)
is_("but only on that date",
    business_hours_state(HOLIDAY, utc("2026-09-03T09:00")), OPEN)

HOLIDAY_OBJ = dict(KOLKATA)
HOLIDAY_OBJ["holidays"] = [{"date": "2026-09-02", "name": "Something"}]
is_("holidays stored as objects also work",
    business_hours_state(HOLIDAY_OBJ, utc("2026-09-02T09:00")), CLOSED)

HOLIDAY_JUNK = dict(KOLKATA)
HOLIDAY_JUNK["holidays"] = ["not-a-date", {"nope": 1}, None]
is_("an unreadable holiday is ignored, not treated as closed",
    business_hours_state(HOLIDAY_JUNK, utc("2026-09-02T09:00")), OPEN)

# --- everything below must answer UNKNOWN, so the call still connects ---

is_("nothing configured",              business_hours_state(None, utc("2026-08-31T20:30")), UNKNOWN)
is_("empty settings",                  business_hours_state({}, utc("2026-08-31T20:30")), UNKNOWN)
is_("no type",                         business_hours_state({"value": {}}, utc("2026-08-31T20:30")), UNKNOWN)
is_("a type we do not handle",
    business_hours_state({"type": "custom_ranges"}, utc("2026-08-31T20:30")), UNKNOWN)

NO_TZ = {"type": "weekly", "value": {"monday": dict(WEEKDAY)}}
is_("no timezone means no honest answer",
    business_hours_state(NO_TZ, utc("2026-08-31T20:30")), UNKNOWN)

BAD_TZ = {"type": "weekly", "regional": {"timezone": {"value": "Mars/Olympus"}},
          "value": {"monday": dict(WEEKDAY)}}
is_("an unresolvable timezone likewise",
    business_hours_state(BAD_TZ, utc("2026-08-31T20:30")), UNKNOWN)

NO_DAY = {"type": "weekly", "regional": {"timezone": {"value": "UTC"}}, "value": {}}
is_("no entry for today",              business_hours_state(NO_DAY, utc("2026-08-31T12:00")), UNKNOWN)

BAD_TIMES = {"type": "weekly", "regional": {"timezone": {"value": "UTC"}},
             "value": {"monday": {"open": True, "start": "nine", "end": "five"}}}
is_("times that will not parse",       business_hours_state(BAD_TIMES, utc("2026-08-31T12:00")), UNKNOWN)

HALF = {"type": "weekly", "regional": {"timezone": {"value": "UTC"}},
        "value": {"monday": {"open": True, "start": "09:00", "end": ""}}}
is_("only one of the two times",       business_hours_state(HALF, utc("2026-08-31T12:00")), UNKNOWN)

SAME = {"type": "weekly", "regional": {"timezone": {"value": "UTC"}},
        "value": {"monday": {"open": True, "start": "09:00", "end": "09:00"}}}
is_("start equal to end is ambiguous", business_hours_state(SAME, utc("2026-08-31T12:00")), UNKNOWN)

OUT_OF_RANGE = {"type": "weekly", "regional": {"timezone": {"value": "UTC"}},
                "value": {"monday": {"open": True, "start": "25:00", "end": "17:00"}}}
is_("an impossible hour",              business_hours_state(OUT_OF_RANGE, utc("2026-08-31T12:00")), UNKNOWN)

# A day explicitly marked closed is a real answer, not unknown.
SHUT = {"type": "weekly", "regional": {"timezone": {"value": "UTC"}},
        "value": {"monday": {"open": False, "start": "", "end": ""}}}
is_("explicitly closed is closed, not unknown",
    business_hours_state(SHUT, utc("2026-08-31T12:00")), CLOSED)

# A naive datetime must not throw.
is_("a naive time is treated as UTC",
    business_hours_state(KOLKATA, datetime.datetime(2026, 8, 31, 9, 0)), OPEN)

print("\n%d passed, %d failed" % (passed, failed))
raise SystemExit(1 if failed else 0)

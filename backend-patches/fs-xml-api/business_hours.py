"""Is the company open right now?

Pure decision, no database and no clock of its own - the settings and the
current time are both passed in, so every case below can be tested without
waiting for Tuesday.

THREE ANSWERS, NOT TWO

"open", "closed", and "unknown". The third one carries the weight. A company
that has never configured hours, a timezone we cannot resolve, or a day whose
times will not parse must NOT be guessed at, because guessing "closed" sends a
real caller to voicemail during business hours and nobody finds out until a
customer complains. Every uncertain case answers "unknown", and the caller
treats unknown exactly as today's behaviour treats everything: put the call
through.

That is the safe direction here. Wrongly connecting a call outside hours is a
nuisance; wrongly refusing one inside hours is lost business.
"""

import datetime

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover - Python < 3.9
    ZoneInfo = None

OPEN = "open"
CLOSED = "closed"
UNKNOWN = "unknown"

_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def _as_object(value):
    if isinstance(value, dict):
        return value
    return {}


def _parse_hhmm(text):
    """"09:30" -> 570 minutes past midnight. None if it is not a time."""
    if not isinstance(text, str):
        return None
    parts = text.strip().split(":")
    if len(parts) != 2:
        return None
    try:
        hours, minutes = int(parts[0]), int(parts[1])
    except (TypeError, ValueError):
        return None
    if not (0 <= hours <= 23 and 0 <= minutes <= 59):
        return None
    return hours * 60 + minutes


def _holiday_dates(holidays):
    """The stored shape has never been seen populated, so several plausible
    ones are accepted rather than assuming. Anything unrecognised is skipped -
    a holiday we cannot read must not turn into a closed day by accident."""
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
        text = raw.strip()[:10]
        try:
            out.add(datetime.date.fromisoformat(text))
        except ValueError:
            continue
    return out


def business_hours_state(operational_hours, now_utc=None):
    """"open", "closed" or "unknown" for the settings given."""
    settings = _as_object(operational_hours)
    if not settings:
        return UNKNOWN

    kind = str(settings.get("type") or "").strip().lower()
    if not kind:
        return UNKNOWN

    # Always open. No clock needed, so no way for a timezone to go wrong.
    if kind in ("24_hours", "24hours", "24"):
        return OPEN

    if kind != "weekly":
        # A shape this code was not written for. Saying so beats guessing.
        return UNKNOWN

    tz_name = str(
        ((_as_object(settings.get("regional")).get("timezone")) or {}).get("value") or ""
    ).strip()
    if not tz_name or ZoneInfo is None:
        # Without a timezone the same settings mean different things in
        # different places, so there is no honest answer.
        return UNKNOWN
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        return UNKNOWN

    if now_utc is None:
        now_utc = datetime.datetime.now(datetime.timezone.utc)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=datetime.timezone.utc)
    local = now_utc.astimezone(tz)

    # A holiday closes the day whatever the weekly pattern says.
    if local.date() in _holiday_dates(settings.get("holidays")):
        return CLOSED

    day = _as_object(_as_object(settings.get("value")).get(_DAYS[local.weekday()]))
    if not day:
        return UNKNOWN

    if not day.get("open"):
        return CLOSED

    start = _parse_hhmm(day.get("start"))
    end = _parse_hhmm(day.get("end"))
    if start is None or end is None:
        # Marked open but with times nobody can read. Refusing to guess.
        return UNKNOWN

    minutes = local.hour * 60 + local.minute

    if start == end:
        # Identical times are ambiguous - it could mean closed all day or open
        # all day, and the UI does not say which. Unknown, so the call connects.
        return UNKNOWN

    if start < end:
        return OPEN if start <= minutes < end else CLOSED

    # end before start means the day runs past midnight, e.g. 22:00 to 06:00.
    return OPEN if (minutes >= start or minutes < end) else CLOSED

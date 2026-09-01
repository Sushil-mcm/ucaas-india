"""What the holiday check must do, proved without a database or a phone call.

Every case here was chosen because getting it wrong has a cost a customer would
notice: a line shut on a working day, or open on Christmas.
"""

import datetime
import importlib.util
import sys
import types
import unittest

# The service imports pymysql at module level and only opens a connection from
# main(), so a stub is enough to import it and call the pure functions.
if "pymysql" not in sys.modules:
    stub = types.ModuleType("pymysql")
    stub.cursors = types.ModuleType("pymysql.cursors")
    stub.cursors.DictCursor = object
    sys.modules["pymysql"] = stub
    sys.modules["pymysql.cursors"] = stub.cursors

spec = importlib.util.spec_from_file_location("dps", sys.argv[1] if len(sys.argv) > 1 else "dialplan_service.patched.py")
dps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dps)

OPEN, CLOSED, UNKNOWN = dps.OPERATIONAL_HOURS_OPEN, dps.OPERATIONAL_HOURS_CLOSED, dps.OPERATIONAL_HOURS_UNKNOWN

WEEKDAY = {"open": True, "start": "09:00", "end": "17:00"}
ALL_WEEK = {d: dict(WEEKDAY) for d in
            ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]}


def hours(holidays=None, company=None):
    return {
        "type": "weekly",
        "regional": {"timezone": {"value": "UTC"}},
        "value": ALL_WEEK,
        "holidays": holidays if holidays is not None else [],
    }


def at(iso):
    """A UTC instant inside the 09:00-17:00 working day."""
    return datetime.datetime.fromisoformat(iso + "T11:00:00+00:00")


# 25 Dec 2026 is a Friday, 26 Dec a Saturday, 28 Dec a Monday.
STORED = {"title": "Christmas Day", "from": "2026-12-25", "to": "2026-12-25",
          "type": "VOICEMAIL", "type_label": "Send to Voicemail",
          "name": "", "value": "1001", "personal": ""}


class TheBugItself(unittest.TestCase):
    def test_a_stored_holiday_now_closes_the_day(self):
        # This is the whole defect: before the fix the day read as OPEN,
        # because the parser looked at "value" ("1001") for the date.
        self.assertEqual(dps.business_hours_state(hours([STORED]), at("2026-12-25")), CLOSED)

    def test_the_action_value_is_never_read_as_a_date(self):
        # An extension that happens to look like a date must not close a day.
        row = dict(STORED, **{"from": "", "to": "", "value": "2026-07-04"})
        self.assertEqual(dps.business_hours_state(hours([row]), at("2026-07-04")), OPEN)

    def test_an_ordinary_working_day_is_untouched(self):
        self.assertEqual(dps.business_hours_state(hours([STORED]), at("2026-12-23")), OPEN)


class Ranges(unittest.TestCase):
    def test_every_day_of_a_range_is_closed(self):
        row = dict(STORED, **{"title": "Christmas week", "from": "2026-12-24", "to": "2026-12-28"})
        for day in ("2026-12-24", "2026-12-25", "2026-12-27", "2026-12-28"):
            self.assertEqual(dps.business_hours_state(hours([row]), at(day)), CLOSED, day)
        self.assertEqual(dps.business_hours_state(hours([row]), at("2026-12-29")), OPEN)

    def test_a_missing_end_is_one_day_not_forever(self):
        row = dict(STORED, to="")
        self.assertEqual(dps.business_hours_state(hours([row]), at("2026-12-25")), CLOSED)
        self.assertEqual(dps.business_hours_state(hours([row]), at("2026-12-26")), OPEN)

    def test_an_end_before_its_start_is_one_day(self):
        row = dict(STORED, **{"from": "2026-12-25", "to": "2026-12-01"})
        self.assertEqual(dps.business_hours_state(hours([row]), at("2026-12-25")), CLOSED)
        self.assertEqual(dps.business_hours_state(hours([row]), at("2026-12-10")), OPEN)

    def test_a_mistyped_year_does_not_shut_the_line_for_two_years(self):
        row = dict(STORED, **{"from": "2026-12-25", "to": "2028-12-25"})
        self.assertEqual(dps.business_hours_state(hours([row]), at("2026-12-25")), CLOSED)
        self.assertEqual(dps.business_hours_state(hours([row]), at("2027-06-01")), OPEN)


class RepeatsEveryYear(unittest.TestCase):
    def test_a_repeating_holiday_holds_in_later_years(self):
        row = dict(STORED, repeats_yearly=True)
        self.assertEqual(dps.business_hours_state(hours([row]), at("2029-12-25")), CLOSED)

    def test_a_one_off_holiday_does_not(self):
        self.assertEqual(dps.business_hours_state(hours([STORED]), at("2029-12-25")), OPEN)

    def test_a_repeating_holiday_closes_only_its_own_day(self):
        row = dict(STORED, repeats_yearly=True)
        self.assertEqual(dps.business_hours_state(hours([row]), at("2029-12-24")), OPEN)


class Rubbish(unittest.TestCase):
    """Anything unreadable must leave the day exactly as it was."""

    def test_unparseable_rows_are_ignored(self):
        for bad in ([{"from": "not a date"}], [{"from": None}], [{}], ["nonsense"],
                    [None], [42], "not a list", None, [{"from": "2026-13-45"}]):
            self.assertIn(dps.business_hours_state(hours(bad), at("2026-12-25")), (OPEN, UNKNOWN), bad)

    def test_a_bare_date_string_still_works(self):
        self.assertEqual(dps.business_hours_state(hours(["2026-12-25"]), at("2026-12-25")), CLOSED)

    def test_the_older_date_key_still_works(self):
        self.assertEqual(dps.business_hours_state(hours([{"date": "2026-12-25"}]), at("2026-12-25")), CLOSED)


class NothingElseMoved(unittest.TestCase):
    def test_no_hours_is_still_unknown(self):
        self.assertEqual(dps.business_hours_state({}), UNKNOWN)
        self.assertEqual(dps.business_hours_state({"type": ""}), UNKNOWN)

    def test_open_all_hours_is_still_open(self):
        self.assertEqual(dps.business_hours_state({"type": "24_hours"}), OPEN)

    def test_a_bad_timezone_still_means_unknown_on_an_ordinary_day(self):
        # Times of day are meaningless without a real clock, so the weekly
        # schedule refuses to guess. A whole-day holiday is the one exception -
        # see AHolidayBeatsTheSchedule below.
        bad = dict(hours([STORED]), regional={"timezone": {"value": "Mars/Olympus"}})
        self.assertEqual(dps.business_hours_state(bad, at("2026-12-23")), UNKNOWN)

    def test_outside_the_working_day_is_still_closed(self):
        night = datetime.datetime.fromisoformat("2026-12-23T22:00:00+00:00")
        self.assertEqual(dps.business_hours_state(hours(), night), CLOSED)

    def test_a_closed_weekday_is_still_closed(self):
        shut = dict(hours(), value=dict(ALL_WEEK, friday={"open": False}))
        self.assertEqual(dps.business_hours_state(shut, at("2026-12-25")), CLOSED)

    def test_the_holiday_is_read_in_the_company_timezone(self):
        # 20:00 UTC on the 24th is already the 25th in Auckland (UTC+13).
        nz = dict(hours([STORED]), regional={"timezone": {"value": "Pacific/Auckland"}},
                  value={d: {"open": True, "start": "00:00", "end": "23:59"} for d in ALL_WEEK})
        self.assertEqual(
            dps.business_hours_state(nz, datetime.datetime.fromisoformat("2026-12-24T20:00:00+00:00")),
            CLOSED)


class AHolidayBeatsTheSchedule(unittest.TestCase):
    """A holiday is the owner saying "we are shut", not a gap in a timetable."""

    def test_it_closes_a_company_that_is_open_24_hours(self):
        always = {"type": "24_hours",
                  "regional": {"timezone": {"value": "UTC"}},
                  "holidays": [STORED]}
        self.assertEqual(dps.business_hours_state(always, at("2026-12-25")), CLOSED)
        self.assertEqual(dps.business_hours_state(always, at("2026-12-23")), OPEN)

    def test_it_closes_a_company_that_never_set_a_timetable(self):
        bare = {"regional": {"timezone": {"value": "UTC"}}, "holidays": [STORED]}
        self.assertEqual(dps.business_hours_state(bare, at("2026-12-25")), CLOSED)
        self.assertEqual(dps.business_hours_state(bare, at("2026-12-23")), UNKNOWN)

    def test_it_works_without_a_usable_timezone(self):
        # The date is all a whole-day holiday needs; UTC is close enough to read
        # a calendar by, and the alternative is the holiday doing nothing.
        for regional in ({}, {"timezone": {"value": ""}}, {"timezone": {"value": "Mars/Olympus"}}):
            hrs = {"type": "weekly", "regional": regional, "value": ALL_WEEK, "holidays": [STORED]}
            self.assertEqual(dps.business_hours_state(hrs, at("2026-12-25")), CLOSED, regional)

    def test_a_bad_timezone_still_blocks_the_weekly_times(self):
        hrs = {"type": "weekly", "regional": {"timezone": {"value": "Mars/Olympus"}},
               "value": ALL_WEEK, "holidays": []}
        self.assertEqual(dps.business_hours_state(hrs, at("2026-12-23")), UNKNOWN)

    def test_completely_empty_settings_are_still_unknown(self):
        self.assertEqual(dps.business_hours_state({}, at("2026-12-25")), UNKNOWN)


class TheSets(unittest.TestCase):
    def test_shape(self):
        exact, yearly = dps._holiday_dates([STORED, dict(STORED, repeats_yearly=True)])
        self.assertEqual(exact, {datetime.date(2026, 12, 25)})
        self.assertEqual(yearly, {(12, 25)})


if __name__ == "__main__":
    unittest.main(argv=sys.argv[:1], verbosity=2)

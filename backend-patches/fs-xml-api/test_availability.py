"""Per-line availability: a person on leave, their own hours, a menu's hours.

These are pure-function tests. The database reads around them are exercised
separately against the live service; what is proved here is the decision itself.
"""

import datetime
import importlib.util
import sys
import types
import unittest

if "pymysql" not in sys.modules:
    stub = types.ModuleType("pymysql")
    stub.cursors = types.ModuleType("pymysql.cursors")
    stub.cursors.DictCursor = object
    sys.modules["pymysql"] = stub
    sys.modules["pymysql.cursors"] = stub.cursors

spec = importlib.util.spec_from_file_location(
    "dps", sys.argv[1] if len(sys.argv) > 1 else "dialplan_service.patched.py")
dps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dps)

D = datetime.date


class AwayPeriod(unittest.TestCase):
    def row(self, **kw):
        base = {"settings": {}, "holiday_start_date": None, "holiday_end_date": None}
        base.update(kw)
        return base

    def test_inside_the_period(self):
        r = self.row(settings={"away": {"from": "2026-09-05", "to": "2026-09-12"}})
        for day in (D(2026, 9, 5), D(2026, 9, 8), D(2026, 9, 12)):
            self.assertTrue(dps.person_is_away(r, day), day)

    def test_outside_the_period(self):
        r = self.row(settings={"away": {"from": "2026-09-05", "to": "2026-09-12"}})
        for day in (D(2026, 9, 4), D(2026, 9, 13), D(2027, 9, 8)):
            self.assertFalse(dps.person_is_away(r, day), day)

    def test_a_half_filled_period_is_not_a_period(self):
        # A start with no end would take somebody off the phones for good the
        # first time an admin set one and moved on.
        for away in ({"from": "2026-09-05"}, {"to": "2026-09-12"}, {}, None):
            self.assertFalse(dps.person_is_away(self.row(settings={"away": away}), D(2026, 9, 8)), away)

    def test_an_end_before_its_start_is_ignored(self):
        r = self.row(settings={"away": {"from": "2026-09-12", "to": "2026-09-05"}})
        self.assertFalse(dps.person_is_away(r, D(2026, 9, 8)))

    def test_the_legacy_columns_are_honoured(self):
        # Written by nothing today; honoured so they are not a second dead end.
        r = self.row(holiday_start_date=D(2026, 9, 5), holiday_end_date=D(2026, 9, 12))
        self.assertTrue(dps.person_is_away(r, D(2026, 9, 8)))
        self.assertFalse(dps.person_is_away(r, D(2026, 9, 13)))

    def test_datetimes_and_strings_both_read(self):
        r = self.row(holiday_start_date=datetime.datetime(2026, 9, 5, 0, 0),
                     holiday_end_date="2026-09-12")
        self.assertTrue(dps.person_is_away(r, D(2026, 9, 8)))

    def test_rubbish_never_marks_somebody_away(self):
        for away in ({"from": "nope", "to": "nope"}, {"from": 5, "to": 9}, "not an object"):
            self.assertFalse(dps.person_is_away(self.row(settings={"away": away}), D(2026, 9, 8)), away)
        self.assertFalse(dps.person_is_away(None, D(2026, 9, 8)))
        self.assertFalse(dps.person_is_away({}, D(2026, 9, 8)))


class ClosedDestination(unittest.TestCase):
    def test_the_holiday_action_wins_over_closed_hours(self):
        hours = {"holidays_action": {"type": "ivr", "value": "menu-uuid"},
                 "closed_hour_action": {"type": "VOICEMAIL", "value": "1001"}}
        self.assertEqual(dps.closed_action_route(hours), ("IVR", "menu-uuid"))

    def test_closed_hours_is_the_fallback(self):
        hours = {"closed_hour_action": {"type": "VOICEMAIL", "value": "1001"}}
        self.assertEqual(dps.closed_action_route(hours), ("VOICEMAIL", "1001"))

    def test_a_type_with_no_value_is_not_a_destination(self):
        # Routing a call at a half-set action drops it silently.
        for hours in ({"closed_hour_action": {"type": "VOICEMAIL", "value": ""}},
                      {"closed_hour_action": {"type": "", "value": "1001"}},
                      {"closed_hour_action": {}}, {}, None):
            self.assertEqual(dps.closed_action_route(hours), ("", ""), hours)


class TodayInTheCompanyClock(unittest.TestCase):
    def test_a_usable_timezone_is_used(self):
        d = dps._today_in({"regional": {"timezone": {"value": "Pacific/Auckland"}}})
        self.assertIsInstance(d, datetime.date)

    def test_rubbish_falls_back_to_utc_rather_than_failing(self):
        for hours in ({"regional": {"timezone": {"value": "Mars/Olympus"}}}, {}, None):
            self.assertEqual(dps._today_in(hours), datetime.datetime.now(datetime.timezone.utc).date())


if __name__ == "__main__":
    unittest.main(argv=sys.argv[:1], verbosity=1)

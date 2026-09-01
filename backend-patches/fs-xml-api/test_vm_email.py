"""Who a voicemail email goes to, and when none is sent.

Every case here exists because getting it wrong sends somebody's voicemail to
the wrong inbox, which cannot be undone.
"""

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

spec = importlib.util.spec_from_file_location("dps", sys.argv[1] if len(sys.argv) > 1 else "vm.py")
dps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dps)


def with_settings(notify, owner_email="owner@example.com"):
    """Stub the two database reads so the decision can be tested on its own."""
    dps.company_voicemail_notify = lambda db: notify
    dps.user_email = lambda db, ext: owner_email
    return dps.voicemail_notify_actions("mcm_1", "1001")


def address_of(actions):
    for action in actions:
        if action["data"].startswith("vm_notify_email="):
            return action["data"].split("=", 1)[1]
    return None


def attach_of(actions):
    for action in actions:
        if action["data"].startswith("vm_notify_attach="):
            return action["data"].split("=", 1)[1]
    return None


class NothingIsSent(unittest.TestCase):
    def test_when_it_is_off(self):
        for notify in ({}, None, {"enabled": False}, {"enabled": "yes"}, {"send_to": "person"}):
            self.assertEqual(with_settings(notify), [], notify)

    def test_when_a_fixed_address_is_asked_for_but_none_is_stored(self):
        self.assertEqual(with_settings({"enabled": True, "send_to": "address", "address": "  "}), [])
        self.assertEqual(with_settings({"enabled": True, "send_to": "address"}), [])

    def test_when_the_mailbox_owner_has_no_address(self):
        self.assertEqual(with_settings({"enabled": True, "send_to": "person"}, owner_email=""), [])

    def test_when_the_stored_address_is_not_one(self):
        for bad in ("not-an-address", "two words@example.com", "@", "a b"):
            self.assertEqual(
                with_settings({"enabled": True, "send_to": "address", "address": bad}), [], bad)


class WhoItGoesTo(unittest.TestCase):
    def test_the_mailbox_owner_by_default(self):
        actions = with_settings({"enabled": True, "send_to": "person"})
        self.assertEqual(address_of(actions), "owner@example.com")

    def test_the_fixed_address_when_asked_for(self):
        actions = with_settings(
            {"enabled": True, "send_to": "address", "address": "  reception@example.com  "})
        self.assertEqual(address_of(actions), "reception@example.com")

    def test_an_unrecognised_target_falls_back_to_the_owner(self):
        # Never to a fixed address: one nobody can see on screen must not be
        # reached by a value we did not write.
        actions = with_settings(
            {"enabled": True, "send_to": "everyone", "address": "all@example.com"})
        self.assertEqual(address_of(actions), "owner@example.com")

    def test_the_target_is_read_case_insensitively(self):
        actions = with_settings(
            {"enabled": True, "send_to": "ADDRESS", "address": "ops@example.com"})
        self.assertEqual(address_of(actions), "ops@example.com")


class TheAttachmentFlag(unittest.TestCase):
    def test_off_unless_explicitly_true(self):
        for value in (None, False, "true", 1, "yes"):
            actions = with_settings({"enabled": True, "send_to": "person", "attach_audio": value})
            self.assertEqual(attach_of(actions), "false", value)

    def test_on_when_true(self):
        actions = with_settings({"enabled": True, "send_to": "person", "attach_audio": True})
        self.assertEqual(attach_of(actions), "true")


class TheShapeItReturns(unittest.TestCase):
    def test_two_set_actions_the_dialplan_can_use(self):
        actions = with_settings({"enabled": True, "send_to": "person"})
        self.assertEqual(len(actions), 2)
        for action in actions:
            self.assertEqual(action["application"], "set")


if __name__ == "__main__":
    unittest.main(argv=sys.argv[:1], verbosity=1)

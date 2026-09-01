"""Which number an outbound call presents, and when it is hidden.

Every case exists because getting it wrong either leaks a number somebody asked
to withhold, or lets a handset present a number that is not the company's.
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

spec = importlib.util.spec_from_file_location("dps", sys.argv[1] if len(sys.argv) > 1 else "cid.py")
dps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dps)

OWN = "+14155550123"          # the caller's own number
OFFICE = "+14155559000"       # a number the company owns
STRANGER = "+12025550111"     # a number it does not


class FakeCursor:
    """Just enough of the pymysql cursor the ownership check uses, so the REAL
    query path is exercised rather than a stub that agrees with itself."""

    def __init__(self, rows):
        self._rows = rows

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, *_args, **_kwargs):
        return None

    def fetchall(self):
        return [{"did_number": number} for number in self._rows]


class FakeConnection:
    def __init__(self, rows):
        self._rows = rows

    def cursor(self):
        return FakeCursor(self._rows)


def resolve(perms, presented, owns=(OFFICE, OWN)):
    dps.company_caller_id_permissions = lambda db: perms
    dps.get_db = lambda: FakeConnection(owns)
    return dps.resolve_outbound_caller_id("mcm_1", "co-uuid", OWN, presented)


class NothingChangesByDefault(unittest.TestCase):
    def test_no_permissions_at_all(self):
        for perms in ({}, None, {"allow_hidden": False, "allow_office_or_group_number": False}):
            self.assertEqual(resolve(perms, OFFICE), (OWN, False), perms)

    def test_a_permission_that_is_not_exactly_true_is_off(self):
        # "true", 1 and "yes" are what a hand-edited record looks like.
        for value in ("true", 1, "yes", None):
            self.assertEqual(resolve({"allow_office_or_group_number": value}, OFFICE), (OWN, False))
            self.assertEqual(resolve({"allow_hidden": value}, "anonymous"), (OWN, False))

    def test_presenting_nothing_keeps_the_stored_number(self):
        perms = {"allow_office_or_group_number": True}
        for presented in ("", None, "   "):
            self.assertEqual(resolve(perms, presented), (OWN, False), presented)


class PresentingACompanyNumber(unittest.TestCase):
    perms = {"allow_office_or_group_number": True}

    def test_a_number_the_company_owns_is_used(self):
        self.assertEqual(resolve(self.perms, OFFICE), (OFFICE, False))

    def test_a_number_it_does_not_own_is_refused(self):
        # The whole point of checking at the switch rather than in the app.
        self.assertEqual(resolve(self.perms, STRANGER), (OWN, False))

    def test_spelling_does_not_decide_it(self):
        # The same number is written several ways across this product, and which
        # screen happened to save it must not decide whether the permission
        # works. The company owns it as '+14155559000'.
        for spelling in ('+14155559000', '14155559000', '4155559000', '(415) 555-9000'):
            self.assertEqual(resolve(self.perms, spelling), (spelling, False), spelling)

    def test_a_short_number_cannot_match_the_tail_of_a_real_one(self):
        # Without the 10-digit floor, an extension or a short code would match
        # the end of a company number and be presented as it.
        for short in ('9000', '559000', '5559000', '55559000'):
            self.assertEqual(resolve(self.perms, short), (OWN, False), short)

    def test_presenting_their_own_number_is_a_no_op(self):
        self.assertEqual(resolve(self.perms, OWN), (OWN, False))

    def test_permission_off_refuses_even_a_company_number(self):
        self.assertEqual(resolve({"allow_office_or_group_number": False}, OFFICE), (OWN, False))


class Withholding(unittest.TestCase):
    perms = {"allow_hidden": True}

    def test_the_words_a_client_sends(self):
        for token in ("anonymous", "Anonymous", "RESTRICTED", "private", "withheld", "unavailable"):
            self.assertEqual(resolve(self.perms, token), (OWN, True), token)

    def test_the_number_still_travels(self):
        # Carriers need one for billing and for emergency calls; what changes is
        # that the far end is told not to show it.
        number, hidden = resolve(self.perms, "anonymous")
        self.assertEqual(number, OWN)
        self.assertTrue(hidden)

    def test_permission_off_shows_the_number(self):
        self.assertEqual(resolve({"allow_hidden": False}, "anonymous"), (OWN, False))

    def test_a_number_containing_the_word_is_not_a_withhold(self):
        self.assertEqual(resolve({"allow_hidden": True}, "anonymous-ish"), (OWN, False))


class BothAtOnce(unittest.TestCase):
    perms = {"allow_hidden": True, "allow_office_or_group_number": True}

    def test_withholding_wins_over_choosing(self):
        self.assertEqual(resolve(self.perms, "anonymous"), (OWN, True))

    def test_choosing_still_works(self):
        self.assertEqual(resolve(self.perms, OFFICE), (OFFICE, False))


class TheDigitsHelper(unittest.TestCase):
    def test_strips_everything_that_is_not_a_digit(self):
        self.assertEqual(dps._digits("+1 (415) 555-9000"), "14155559000")
        self.assertEqual(dps._digits(None), "")
        self.assertEqual(dps._digits("anonymous"), "")


if __name__ == "__main__":
    unittest.main(argv=sys.argv[:1], verbosity=1)

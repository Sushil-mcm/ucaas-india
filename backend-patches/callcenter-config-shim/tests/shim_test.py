"""Proves the shim answers the one request it owns and forwards the rest.

The cases that matter are the ones where being wrong is invisible: forwarding a
directory lookup incorrectly would break calls that work today, and answering
callcenter.conf with anything FreeSWITCH cannot parse leaves the module exactly
as broken as it was.
"""

import io
import os
import sys
import unittest
import urllib.error
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import callcenter_config_shim as shim  # noqa: E402


class FakeRequest(io.BytesIO):
    def makefile(self, *args, **kwargs):
        return self


class Recorder:
    """Stands in for the HTTP plumbing so the handler can be driven directly."""

    def __init__(self):
        self.status = None
        self.headers = {}
        self.body = b""


def run(handler_cls, command, path, body, proxy=None):
    rec = Recorder()

    class Driven(handler_cls):
        def __init__(self):
            self.command = command
            self.path = path
            self.headers = {"Content-Length": str(len(body)), "Content-Type": "x"}
            self.rfile = io.BytesIO(body)
            self.wfile = io.BytesIO()

        def send_response(self, code):
            rec.status = code

        def send_header(self, k, v):
            rec.headers[k] = v

        def end_headers(self):
            pass

        if proxy is not None:
            def _proxy(self, b):
                proxy.append(b)
                rec.status = 599

    h = Driven()
    getattr(h, "do_" + command)()
    rec.body = h.wfile.getvalue()
    return rec


FORM = "hostname=Ucaas-backend2&section=configuration&tag_name=configuration&key_name=name&key_value=%s"


class TheRequestItOwns(unittest.TestCase):
    def test_callcenter_conf_is_answered_here(self):
        rec = run(shim.Handler, "POST", "/v1/configuration", (FORM % "callcenter.conf").encode())
        self.assertEqual(rec.status, 200)

    def test_the_answer_is_xml_freeswitch_can_parse(self):
        rec = run(shim.Handler, "POST", "/v1/configuration", (FORM % "callcenter.conf").encode())
        root = ET.fromstring(rec.body.decode())
        self.assertEqual(root.attrib.get("type"), "freeswitch/xml")

    def test_it_names_the_configuration_the_module_asked_for(self):
        rec = run(shim.Handler, "POST", "/v1/configuration", (FORM % "callcenter.conf").encode())
        root = ET.fromstring(rec.body.decode())
        conf = root.find("./section/configuration")
        self.assertIsNotNone(conf, "no <configuration> element")
        self.assertEqual(conf.attrib.get("name"), "callcenter.conf")

    def test_it_carries_an_empty_queue_list_rather_than_none(self):
        # An absent <queues> element is not the same as an empty one; the module
        # reads this section, and leaving it out invites a different failure.
        rec = run(shim.Handler, "POST", "/v1/configuration", (FORM % "callcenter.conf").encode())
        root = ET.fromstring(rec.body.decode())
        queues = root.find("./section/configuration/queues")
        self.assertIsNotNone(queues, "no <queues> element")
        self.assertEqual(len(list(queues)), 0)

    def test_settings_are_left_empty_so_the_module_keeps_its_defaults(self):
        rec = run(shim.Handler, "POST", "/v1/configuration", (FORM % "callcenter.conf").encode())
        root = ET.fromstring(rec.body.decode())
        settings = root.find("./section/configuration/settings")
        self.assertIsNotNone(settings)
        self.assertEqual(len(list(settings)), 0)


class EverythingElseIsForwarded(unittest.TestCase):
    def test_a_different_configuration_is_not_answered_here(self):
        seen = []
        run(shim.Handler, "POST", "/v1/configuration", (FORM % "sofia.conf").encode(), proxy=seen)
        self.assertEqual(len(seen), 1, "sofia.conf must go upstream")

    def test_ivr_conf_is_not_answered_here(self):
        seen = []
        run(shim.Handler, "POST", "/v1/configuration", (FORM % "ivr.conf").encode(), proxy=seen)
        self.assertEqual(len(seen), 1)

    def test_a_directory_lookup_is_forwarded(self):
        seen = []
        run(shim.Handler, "POST", "/v1/directory", b"section=directory&user=1001", proxy=seen)
        self.assertEqual(len(seen), 1)

    def test_a_get_is_forwarded(self):
        seen = []
        run(shim.Handler, "GET", "/health", b"", proxy=seen)
        self.assertEqual(len(seen), 1)

    def test_the_body_is_passed_on_untouched(self):
        seen = []
        body = (FORM % "sofia.conf").encode()
        run(shim.Handler, "POST", "/v1/configuration", body, proxy=seen)
        self.assertEqual(seen[0], body)


class ReadingTheRequest(unittest.TestCase):
    def test_the_wanted_file_is_read_from_the_form(self):
        self.assertEqual(shim.wanted_key((FORM % "callcenter.conf").encode()), "callcenter.conf")

    def test_an_empty_body_asks_for_nothing(self):
        self.assertEqual(shim.wanted_key(b""), "")

    def test_rubbish_does_not_raise(self):
        # A malformed request must not take the service down; it is on the path
        # of every directory lookup the switch makes.
        self.assertEqual(shim.wanted_key(b"\xff\xfe not form data"), "")

    def test_a_near_miss_is_not_treated_as_ours(self):
        # Only the exact file. "callcenter.conf.bak" or a prefix match would
        # silently swallow a request meant for the original service.
        self.assertNotEqual(shim.wanted_key((FORM % "callcenter.conf.bak").encode()), shim.OWNED_KEY)


class WhenTheOriginalIsDown(unittest.TestCase):
    def test_it_answers_not_found_rather_than_an_error(self):
        # FreeSWITCH understands "not found". It does not understand a stack
        # trace, and an error here would break lookups that work today.
        class Broken(shim.Handler):
            pass

        original = shim.urllib.request.urlopen

        def refuse(*a, **k):
            raise OSError("connection refused")

        shim.urllib.request.urlopen = refuse
        try:
            rec = run(Broken, "POST", "/v1/configuration", (FORM % "sofia.conf").encode())
        finally:
            shim.urllib.request.urlopen = original

        self.assertEqual(rec.status, 200)
        root = ET.fromstring(rec.body.decode())
        self.assertEqual(root.find("./section/result").attrib.get("status"), "not found")


if __name__ == "__main__":
    unittest.main(verbosity=2)

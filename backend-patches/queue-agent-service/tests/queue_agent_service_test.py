#!/usr/bin/env python3
"""Tests for the queue agent service.

Run:  python3 tests/queue_agent_service_test.py

The database is faked out throughout, so these run anywhere - no driver, no
server, no network. Three things are being proven:

  * the answers match, field for field, what the switch actually reads;
  * the choice of who to ring follows the queue rules the rest of the product
    already shows on screen; and
  * the questions put to the database match the records as they are really
    stored, including that a queue is pointed at by a record id and not by text.
"""

import json
import os
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import queue_agent_service as svc  # noqa: E402


NOW = 1_800_000_000
DOMAIN = "1785148080251.mycountrymobile.com"
QUEUE_ID = "6a6c9063cbd65b771cae87e5"


class FakeObjectId(object):
    """Stands in for a database record id, so the tests do not need the driver."""

    def __init__(self, value):
        if not isinstance(value, str) or len(value) != 24:
            raise ValueError("not an id")
        self.value = value

    def __eq__(self, other):
        return isinstance(other, FakeObjectId) and other.value == self.value

    def __hash__(self):
        return hash(self.value)

    def __repr__(self):
        return "FakeObjectId(%s)" % self.value


def agent(extension="1000", status="Available", state="Waiting", **overrides):
    """One record shaped exactly like the agent records on the platform."""
    row = {
        "queue_uuid": FakeObjectId(QUEUE_ID),
        "name": "%s@%s" % (extension, DOMAIN),
        "user_detail": {"name": "Ramandeep Kaur", "extension": extension,
                        "timeout": "30", "skills": ["en"]},
        "type": "callback",
        "contact": "user/%s_web@%s" % (extension, DOMAIN),
        "status": status,
        "state": state,
        "max_no_answer": 3,
        # Every agent record on the platform holds nought here; the real
        # wrap-up time is saved against the queue.
        "wrap_up_time": 0,
        "last_bridge_start": 0,
        "last_bridge_end": 0,
        "last_offered_call": 0,
        "last_status_change": 0,
        "no_answer_count": 0,
        "calls_answered": 0,
        "talk_time": 0,
        "ready_time": 0,
    }
    row.update(overrides)
    return row


def queue_record(**overrides):
    row = {
        "_id": FakeObjectId(QUEUE_ID),
        "name": "Sales",
        "extension": "1975",
        "domain": DOMAIN,
        "type": "QUEUE",
        "wrap_seconds": 0,
        "settings": {"wrapup_time": 30, "ring_strategy": {"value": "ring-all"}},
    }
    row.update(overrides)
    return row


def names(rows):
    return [r["name"] for r in rows]


class DutyStateTest(unittest.TestCase):
    """What the stored status and state mean in the words the product uses."""

    def test_available_is_ringable(self):
        self.assertEqual(svc.duty_state(agent(), NOW), svc.AVAILABLE)
        self.assertTrue(svc.is_ringable(agent(), NOW))

    def test_signed_out_is_not_ringable(self):
        row = agent(status="Logged Out", state="Logged Out")
        self.assertEqual(svc.duty_state(row, NOW), svc.OFF_DUTY)
        self.assertFalse(svc.is_ringable(row, NOW))

    def test_on_a_break_is_not_ringable(self):
        self.assertEqual(svc.duty_state(agent(status="On Break", state="Idle"), NOW), svc.BUSY)
        # The platform stores this label both ways, so both must mean the same thing.
        self.assertEqual(svc.duty_state(agent(status="On break", state="Idle"), NOW), svc.BUSY)

    def test_on_a_queue_call_is_not_ringable(self):
        row = agent(status="On Queue Call", state="Busy")
        self.assertEqual(svc.duty_state(row, NOW), svc.ON_A_CALL)
        self.assertFalse(svc.is_ringable(row, NOW))

    def test_an_unknown_label_is_treated_as_unavailable(self):
        self.assertEqual(svc.duty_state(agent(status="Gardening leave"), NOW), svc.OFF_DUTY)

    def test_somebody_with_nowhere_to_ring_is_skipped(self):
        self.assertFalse(svc.is_ringable(agent(contact=""), NOW))

    def test_too_many_missed_calls_takes_somebody_out(self):
        row = agent(no_answer_count=3, max_no_answer=3, last_status_change=NOW - 60)
        self.assertTrue(svc.missed_too_many(row, NOW))
        self.assertFalse(svc.is_ringable(row, NOW))

    def test_an_old_missed_call_count_does_not_lock_somebody_out(self):
        row = agent(no_answer_count=9, max_no_answer=3,
                    last_status_change=NOW - int(svc.NO_ANSWER_WINDOW_SECONDS) - 60)
        self.assertFalse(svc.missed_too_many(row, NOW))
        self.assertTrue(svc.is_ringable(row, NOW))


class WrapUpTest(unittest.TestCase):
    """Time to write up notes is saved against the queue, not against the person.

    Every agent record on the platform holds nought, so reading only the agent
    record would mean nobody was ever given a moment to finish.
    """

    def test_the_queue_setting_is_used_when_the_person_has_none(self):
        row = agent(last_bridge_end=NOW - 10)
        self.assertEqual(svc.duty_state(row, NOW), svc.AVAILABLE, "no queue setting, no wrap-up")
        self.assertEqual(svc.duty_state(row, NOW, wrap_default=30), svc.WRAPPING_UP)
        self.assertEqual(svc.seconds_until_free(row, NOW, wrap_default=30), 20)
        self.assertTrue(svc.is_ringable(row, NOW + 21, wrap_default=30))

    def test_a_persons_own_setting_wins_when_they_have_one(self):
        row = agent(wrap_up_time=5, last_bridge_end=NOW - 10)
        self.assertEqual(svc.duty_state(row, NOW, wrap_default=600), svc.AVAILABLE)

    def test_read_from_the_queue_record(self):
        self.assertEqual(svc.queue_wrap_seconds(queue_record()), 30)
        self.assertEqual(
            svc.queue_wrap_seconds(queue_record(settings={}, wrap_seconds=45)), 45)
        self.assertEqual(svc.queue_wrap_seconds({}), 0)
        self.assertEqual(svc.queue_wrap_seconds(None), 0)

    def test_the_queues_own_ring_order_is_read_too(self):
        self.assertEqual(svc.queue_ring_strategy(queue_record()), "ring-all")
        self.assertEqual(svc.queue_ring_strategy({}), "")
        self.assertEqual(svc.queue_ring_strategy(None), "")


class ExtensionTest(unittest.TestCase):
    """The extension has to be worked out the same way the switch works it out,
    or the number on screen and the number that rings disagree."""

    def test_taken_from_the_stored_detail_first(self):
        self.assertEqual(svc.resolve_extension(agent("1731"), {"extension": "1731"}), "1731")

    def test_falls_back_to_the_name_with_the_device_tag_removed(self):
        row = agent()
        row["name"] = "1000_web@" + DOMAIN
        self.assertEqual(svc.resolve_extension(row, {}), "1000")

    def test_falls_back_to_the_contact(self):
        row = agent()
        row["name"] = ""
        self.assertEqual(svc.resolve_extension(row, {}), "1000")


class StrategyNameTest(unittest.TestCase):
    """Every spelling the product has used has to land on one name, matching the
    switch exactly."""

    def test_known_spellings(self):
        cases = {
            "": "top-down",
            "linear": "top-down",
            "call_linear": "top-down",
            "sequentially by agent order": "top-down",
            "ringall": "ring-all",
            "ring-all": "ring-all",
            "longest_idle": "longest-idle-agent",
            "least talk time": "agent-with-least-talk-time",
            "fewest-calls": "agent-with-fewest-calls",
            "random": "random",
        }
        for given, expected in cases.items():
            self.assertEqual(svc.normalize_strategy(given), expected, given)


class DecisionTest(unittest.TestCase):
    """Who gets rung, in what order, and why."""

    def test_nobody_free_is_a_normal_empty_answer(self):
        rows = [agent("1000", status="Logged Out"), agent("1001", status="On Break")]
        decision = svc.decide_ring(rows, {}, "ring-all", 0, now=NOW)
        self.assertEqual(decision["agents"], [])
        self.assertIn("signed out", decision["reason"])

    def test_an_empty_queue_says_so(self):
        decision = svc.decide_ring([], {}, "ring-all", 0, now=NOW)
        self.assertEqual(decision["agents"], [])
        self.assertEqual(decision["reason"], "Nobody is in this queue at all.")

    def test_ring_all_offers_everybody_together(self):
        rows = [agent("1000"), agent("1001")]
        decision = svc.decide_ring(rows, {}, "ring-all", 0, now=NOW)
        self.assertTrue(decision["rings_together"])
        self.assertEqual(len(decision["agents"]), 2)

    def test_one_at_a_time_skips_whoever_was_just_tried(self):
        rows = [agent("1000"), agent("1001")]
        tried = {"1000@" + DOMAIN}
        decision = svc.decide_ring(rows, {}, "top-down", 5, already_tried=tried, now=NOW)
        self.assertFalse(decision["rings_together"])
        self.assertEqual(names(decision["agents"]), ["1001@" + DOMAIN])

    def test_once_everybody_has_been_tried_the_list_starts_again(self):
        rows = [agent("1000"), agent("1001")]
        tried = {"1000@" + DOMAIN, "1001@" + DOMAIN}
        decision = svc.decide_ring(rows, {}, "top-down", 5, already_tried=tried, now=NOW)
        self.assertEqual(len(decision["agents"]), 2)

    def test_ring_all_never_skips_anybody(self):
        rows = [agent("1000"), agent("1001")]
        tried = {"1000@" + DOMAIN}
        decision = svc.decide_ring(rows, {}, "ring-all", 5, already_tried=tried, now=NOW)
        self.assertEqual(len(decision["agents"]), 2)

    def test_longest_idle_goes_first(self):
        rows = [agent("1000", last_bridge_end=NOW - 10), agent("1001", last_bridge_end=NOW - 900)]
        decision = svc.decide_ring(rows, {}, "longest-idle-agent", 0, now=NOW)
        self.assertEqual(names(decision["agents"])[0], "1001@" + DOMAIN)

    def test_least_talk_time_goes_first(self):
        rows = [agent("1000", talk_time=600), agent("1001", talk_time=5)]
        decision = svc.decide_ring(rows, {}, "agent-with-least-talk-time", 0, now=NOW)
        self.assertEqual(names(decision["agents"])[0], "1001@" + DOMAIN)

    def test_fewest_calls_goes_first(self):
        rows = [agent("1000", calls_answered=9), agent("1001", calls_answered=1)]
        decision = svc.decide_ring(rows, {}, "agent-with-fewest-calls", 0, now=NOW)
        self.assertEqual(names(decision["agents"])[0], "1001@" + DOMAIN)

    def test_top_down_follows_the_order_the_queue_was_set_up_in(self):
        rows = [agent("1002"), agent("1000"), agent("1001")]
        tiers = {
            "1000@" + DOMAIN: {"level": 0, "position": 2},
            "1001@" + DOMAIN: {"level": 0, "position": 1},
            "1002@" + DOMAIN: {"level": 0, "position": 0},
        }
        decision = svc.decide_ring(rows, tiers, "top-down", 0, now=NOW)
        self.assertEqual(names(decision["agents"]),
                         ["1002@" + DOMAIN, "1001@" + DOMAIN, "1000@" + DOMAIN])

    def test_the_second_group_is_added_once_the_first_round_is_up(self):
        rows = [agent("1000"), agent("1001")]
        tiers = {
            "1000@" + DOMAIN: {"level": 0, "position": 0},
            "1001@" + DOMAIN: {"level": 1, "position": 0},
        }
        first = svc.decide_ring(rows, tiers, "ring-all", 0, now=NOW, step_seconds=15)
        self.assertEqual(names(first["agents"]), ["1000@" + DOMAIN])
        self.assertEqual(first["step"], 1)
        self.assertEqual(first["steps"], 2)
        self.assertEqual(first["changes_in_seconds"], 15)

        later = svc.decide_ring(rows, tiers, "ring-all", 20, now=NOW, step_seconds=15)
        self.assertEqual(len(later["agents"]), 2, "the first group must keep ringing")
        self.assertEqual(later["step"], 2)
        self.assertIsNone(later["changes_in_seconds"])

    def test_it_says_when_the_answer_changes_on_its_own(self):
        rows = [agent("1000", last_bridge_end=NOW - 25)]
        decision = svc.decide_ring(rows, {}, "ring-all", 0, now=NOW, wrap_default=30)
        self.assertEqual(decision["agents"], [])
        self.assertEqual(decision["changes_in_seconds"], 5)
        self.assertIn("finishing notes", decision["reason"])


class PayloadTest(unittest.TestCase):
    """The two fields the switch cannot survive without."""

    def test_the_switch_gets_a_name_and_something_to_dial(self):
        payload = svc.agent_payload(agent())
        self.assertEqual(payload["name"], "1000@" + DOMAIN)
        self.assertEqual(payload["contact"], "user/1000_web@" + DOMAIN)
        self.assertEqual(payload["extension"], "1000")
        self.assertEqual(payload["user_detail"]["name"], "Ramandeep Kaur")

    def test_a_missing_name_is_never_sent_as_nothing(self):
        row = agent()
        row["name"] = None
        payload = svc.agent_payload(row)
        self.assertTrue(payload["name"])
        self.assertIsInstance(payload["name"], str)

    def test_no_empty_values_are_ever_sent(self):
        row = agent()
        row["user_detail"] = {"name": None, "first_name": "Ramandeep", "last_name": None}
        payload = svc.agent_payload(row)
        self.assertEqual(payload["user_detail"], {"first_name": "Ramandeep"})
        for key, value in payload.items():
            self.assertIsNotNone(value, key)

    def test_stored_detail_may_arrive_as_text(self):
        row = agent()
        row["user_detail"] = json.dumps({"name": "Ramandeep Kaur", "timeout": "30"})
        self.assertEqual(svc.agent_payload(row)["user_detail"]["timeout"], "30")

    def test_the_record_id_never_leaks_into_the_answer(self):
        # It is not a plain value and would not survive being turned into text.
        payload = svc.agent_payload(agent())
        self.assertNotIn("queue_uuid", payload)
        json.dumps(payload)


class DatabaseQuestionTest(unittest.TestCase):
    """The questions put to the database, checked against how the records are
    really stored. A queue is pointed at by a record id, not by text, so asking
    with text alone would quietly find nobody."""

    def setUp(self):
        self.found_docs = []
        self.found_one = []
        self.updates = []
        self.original = (svc.find_docs, svc.find_one_doc, svc.update_doc)

    def tearDown(self):
        svc.find_docs, svc.find_one_doc, svc.update_doc = self.original

    def test_a_reference_is_looked_for_as_both_a_record_id_and_as_text(self):
        values = svc.reference_values(QUEUE_ID, oid=FakeObjectId)
        self.assertEqual(values, [FakeObjectId(QUEUE_ID), QUEUE_ID])

    def test_text_that_is_not_a_record_id_is_left_as_it_is(self):
        self.assertEqual(svc.reference_values("1975@" + DOMAIN, oid=FakeObjectId),
                         ["1975@" + DOMAIN])

    def test_nothing_is_looked_for_when_nothing_was_asked(self):
        self.assertEqual(svc.reference_values("", oid=FakeObjectId), [])
        self.assertEqual(svc.reference_values(None, oid=FakeObjectId), [])

    def test_the_roster_is_read_by_queue_then_joined_to_the_running_order(self):
        def fake_find_one(collection, query, projection=None):
            self.found_one.append((collection, query))
            return queue_record()

        def fake_find(collection, query, projection=None, limit=0, sort=None):
            self.found_docs.append((collection, query))
            if collection == svc.AGENTS:
                return [agent("1000")]
            return [{"agent": "1000@" + DOMAIN, "level": 1, "position": 2, "state": "Ready"}]

        svc.find_one_doc = fake_find_one
        svc.find_docs = fake_find

        rows, tiers, queue = svc.load_queue_roster(QUEUE_ID)
        self.assertEqual(len(rows), 1)
        self.assertEqual(tiers["1000@" + DOMAIN]["level"], 1)
        self.assertEqual(tiers["1000@" + DOMAIN]["position"], 2)
        self.assertEqual(queue["extension"], "1975")

        agents_query = [q for c, q in self.found_docs if c == svc.AGENTS][0]
        self.assertIn("queue_uuid", agents_query)
        # The people are found by the queue's own record id, which is what the
        # database is indexed on.
        self.assertIn(FakeObjectId(QUEUE_ID), agents_query["queue_uuid"]["$in"])

        tiers_query = [q for c, q in self.found_docs if c == svc.TIERS][0]
        self.assertIn("1975@" + DOMAIN, tiers_query["queue"]["$in"])

    def test_a_queue_called_by_its_extension_is_still_found(self):
        seen = []

        def fake_find_one(collection, query, projection=None):
            seen.append(query)
            return None if "_id" in query else queue_record()

        svc.find_one_doc = fake_find_one
        svc.find_docs = lambda *a, **k: []
        svc.load_queue_roster("1975@" + DOMAIN)
        self.assertEqual(seen[-1], {"extension": "1975", "domain": DOMAIN})

    def test_a_missing_queue_record_does_not_stop_the_lookup(self):
        svc.find_one_doc = lambda *a, **k: None
        svc.find_docs = lambda collection, query, projection=None, limit=0, sort=None: (
            [agent("1000")] if collection == svc.AGENTS else [])
        rows, tiers, queue = svc.load_queue_roster(QUEUE_ID)
        self.assertEqual(len(rows), 1)
        self.assertEqual(queue, {})

    def test_an_update_is_written_as_a_set_and_a_count(self):
        def fake_update(collection, query, changes):
            self.updates.append((collection, query, changes))
            return True

        svc.update_doc = fake_update
        svc.update_agent("1000@" + DOMAIN, QUEUE_ID,
                         {"last_status_change": NOW}, {"no_answer_count": 1})
        collection, query, changes = self.updates[0]
        self.assertEqual(collection, svc.AGENTS)
        self.assertEqual(query["name"], "1000@" + DOMAIN)
        self.assertIn("queue_uuid", query)
        self.assertEqual(changes["$set"], {"last_status_change": NOW})
        self.assertEqual(changes["$inc"], {"no_answer_count": 1})

    def test_a_database_that_is_down_is_reported_as_nobody_free(self):
        def explode(*args, **kwargs):
            raise RuntimeError("no connection")
        svc.find_one_doc = explode
        svc.find_docs = explode
        svc.update_doc = explode
        rows, tiers, queue = svc.load_queue_roster(QUEUE_ID)
        self.assertEqual(rows, [])
        self.assertEqual(tiers, {})
        self.assertFalse(svc.update_agent("1000@" + DOMAIN, None, {"state": "Idle"}))


class HttpTest(unittest.TestCase):
    """The service answered over HTTP, exactly as the switch asks it."""

    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), svc.QueueAgentHandler)
        cls.server.daemon_threads = True
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.original_roster = svc.load_queue_roster
        self.original_by_name = svc.load_agent_by_name
        self.original_update = svc.update_agent
        svc._agent_cache.clear()
        svc._calls.clear()
        self.updates = []
        svc.update_agent = lambda name, queue_id, assignments, increments=None: (
            self.updates.append((name, queue_id, assignments, increments)) or True
        )

    def tearDown(self):
        svc.load_queue_roster = self.original_roster
        svc.load_agent_by_name = self.original_by_name
        svc.update_agent = self.original_update
        svc._agent_cache.clear()
        svc._calls.clear()

    def get(self, path, method="GET", body=None):
        url = "http://127.0.0.1:%d%s" % (self.port, path)
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = Request(url, data=data, method=method)
        if data is not None:
            request.add_header("Content-Type", "application/json")
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except HTTPError as e:
            return e.code, json.loads(e.read().decode("utf-8"))

    def test_health(self):
        status, payload = self.get("/health")
        self.assertEqual(status, 200)
        self.assertEqual(payload["status"], "ok")

    def test_the_queue_answer_has_the_agents_list_the_switch_reads(self):
        svc.load_queue_roster = lambda key: ([agent("1000")], {}, queue_record())
        status, payload = self.get(
            "/api/callcenter/queues/%s/agents?strategy=ring-all&call_uuid=c1&call_timeout=45" % QUEUE_ID)
        self.assertEqual(status, 200)
        self.assertIsInstance(payload["agents"], list)
        self.assertEqual(payload["agents"][0]["name"], "1000@" + DOMAIN)
        self.assertEqual(payload["agents"][0]["contact"], "user/1000_web@" + DOMAIN)
        self.assertEqual(payload["strategy"], "ring-all")

    def test_nobody_free_is_an_empty_list_and_still_a_good_answer(self):
        svc.load_queue_roster = lambda key: ([agent("1000", status="Logged Out")], {}, queue_record())
        status, payload = self.get("/api/callcenter/queues/q/agents?strategy=ring-all")
        self.assertEqual(status, 200)
        self.assertEqual(payload["agents"], [])
        self.assertTrue(payload["reason"])

    def test_a_broken_database_never_breaks_a_call(self):
        def explode(key):
            raise RuntimeError("database is down")
        svc.load_queue_roster = explode
        status, payload = self.get("/api/callcenter/queues/q/agents?strategy=ring-all")
        self.assertEqual(status, 200)
        self.assertEqual(payload["agents"], [])

    def test_the_queues_own_ring_order_is_used_when_the_switch_sends_none(self):
        svc.load_queue_roster = lambda key: ([agent("1000"), agent("1001")], {}, queue_record())
        status, payload = self.get("/api/callcenter/queues/q/agents")
        self.assertEqual(status, 200)
        self.assertEqual(payload["strategy"], "ring-all")
        self.assertTrue(payload["rings_together"])

    def test_the_queues_wrap_up_time_keeps_somebody_out_of_the_next_call(self):
        just_finished = agent("1000", last_bridge_end=int(__import__("time").time()) - 5)
        svc.load_queue_roster = lambda key: ([just_finished], {}, queue_record())
        status, payload = self.get("/api/callcenter/queues/q/agents?strategy=ring-all")
        self.assertEqual(status, 200)
        self.assertEqual(payload["agents"], [])
        self.assertIn("finishing notes", payload["reason"])

    def test_the_same_caller_is_walked_down_the_list(self):
        svc.load_queue_roster = lambda key: ([agent("1000"), agent("1001")], {}, queue_record())
        _, first = self.get(
            "/api/callcenter/queues/q/agents?strategy=top-down&call_uuid=c9&call_timeout=45")
        svc._agent_cache.clear()
        _, second = self.get(
            "/api/callcenter/queues/q/agents?strategy=top-down&call_uuid=c9&call_timeout=45")
        self.assertNotEqual(first["agents"][0]["name"], second["agents"][0]["name"])

    def test_a_different_caller_starts_at_the_top(self):
        svc.load_queue_roster = lambda key: ([agent("1000"), agent("1001")], {}, queue_record())
        _, first = self.get(
            "/api/callcenter/queues/q/agents?strategy=top-down&call_uuid=a1&call_timeout=45")
        svc._agent_cache.clear()
        _, other = self.get(
            "/api/callcenter/queues/q/agents?strategy=top-down&call_uuid=b2&call_timeout=45")
        self.assertEqual(first["agents"][0]["name"], other["agents"][0]["name"])

    def test_the_switch_missed_call_report_arrives_with_nothing_in_it(self):
        # The switch's web helper drops the details it means to send, so this
        # arrives empty. It still has to be answered cleanly.
        status, payload = self.get("/api/callcenter/agents/no-answer")
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        self.assertFalse(payload["recorded"])

    def test_a_missed_call_with_details_is_counted(self):
        status, payload = self.get(
            "/api/callcenter/agents/no-answer", "POST",
            {"extension": "1000_web", "domain": DOMAIN, "queue_id": QUEUE_ID})
        self.assertEqual(status, 200)
        self.assertTrue(payload["recorded"])
        name, queue_id, assignments, increments = self.updates[0]
        self.assertEqual(name, "1000@" + DOMAIN)
        self.assertEqual(queue_id, QUEUE_ID)
        self.assertEqual(increments["no_answer_count"], 1)

    def test_answering_a_call_clears_the_run_of_missed_ones(self):
        self.get("/api/callcenter/agents/call-start", "POST",
                 {"extension": "1000", "domain": DOMAIN, "queue_id": QUEUE_ID})
        _, _, assignments, increments = self.updates[0]
        self.assertEqual(assignments["no_answer_count"], 0)
        self.assertEqual(increments["calls_answered"], 1)

    def test_talk_time_is_added_up_when_a_call_ends(self):
        self.get("/api/callcenter/agents/call-end", "PUT",
                 {"extension": "1000", "domain": DOMAIN, "talk_time_seconds": 125})
        _, _, assignments, increments = self.updates[0]
        self.assertEqual(increments["talk_time"], 125)
        # The finish time has to be written down, because it is what says when
        # somebody writing up their notes is ready for the next call.
        self.assertGreater(assignments["last_bridge_end"], 0)

    def test_a_status_change_is_written_down(self):
        self.get("/api/callcenter/agents/status", "PUT",
                 {"extension": "1000", "domain": DOMAIN, "status": "Available", "state": "Waiting"})
        _, _, assignments, _ = self.updates[0]
        self.assertEqual(assignments["status"], "Available")
        self.assertEqual(assignments["state"], "Waiting")

    def test_one_persons_record_can_be_looked_up_by_name(self):
        svc.load_agent_by_name = lambda name: agent("1000")
        status, payload = self.get("/api/callcenter/agents/1000%40" + DOMAIN)
        self.assertEqual(status, 200)
        self.assertEqual(payload["user_detail"]["name"], "Ramandeep Kaur")

    def test_an_unknown_person_is_reported_as_not_found(self):
        svc.load_agent_by_name = lambda name: None
        status, _ = self.get("/api/callcenter/agents/9999%40" + DOMAIN)
        self.assertEqual(status, 404)

    def test_an_unknown_address_still_answers_in_the_shape_the_switch_reads(self):
        status, payload = self.get("/api/callcenter/nothing/here")
        self.assertEqual(status, 404)
        self.assertEqual(payload["agents"], [])


class CacheTest(unittest.TestCase):
    """Repeated questions inside a couple of seconds are answered from memory, so
    a queue full of waiting callers does not hammer the database."""

    def setUp(self):
        svc._agent_cache.clear()

    def tearDown(self):
        svc._agent_cache.clear()

    def test_a_repeated_question_is_answered_from_memory(self):
        calls = []

        def loader(key):
            calls.append(key)
            return [agent("1000")], {}, {}

        svc.cached_queue_agents("q", loader, NOW)
        svc.cached_queue_agents("q", loader, NOW + 1)
        self.assertEqual(len(calls), 1)

    def test_the_memory_does_not_last(self):
        calls = []

        def loader(key):
            calls.append(key)
            return [agent("1000")], {}, {}

        svc.cached_queue_agents("q", loader, NOW)
        svc.cached_queue_agents("q", loader, NOW + svc.AGENT_CACHE_SECONDS + 1)
        self.assertEqual(len(calls), 2)

    def test_finished_callers_are_forgotten(self):
        svc._calls.clear()
        svc.call_memory("old-call", NOW - svc.CALL_MEMORY_SECONDS - 10)
        svc.call_memory("new-call", NOW)
        svc.prune_calls(NOW)
        self.assertNotIn("old-call", svc._calls)
        self.assertIn("new-call", svc._calls)
        svc._calls.clear()


if __name__ == "__main__":
    unittest.main(verbosity=2)

"""Add the PHONE and HANGUP inbound route types.

The admin screens offer eleven forwarding types (src/constants/forwarding-consts.ts:
DEVICE, VOICEMAIL, GREETING, EXTENSION, PHONE, IVR, QUEUE, DEPARTMENT, MESSAGE,
AI, HANGUP). The dialplan handled four - EXTENSION, VOICEMAIL, IVR, QUEUE.
Everything else fell through to `log("warn", "unhandled route type")` and
NOT_FOUND_TPL, which fails the call. An admin could point a number at an outside
phone, save it, see it saved, and every caller would get a failure.

This adds the two that can be done correctly and completely today:

  PHONE   forward to an ordinary outside number. Reuses get_outbound_provider()
          and format_outbound_number() - the same pair the outbound branch uses -
          so prefix handling, codec forcing and the route to Kamailio stay
          defined in one place rather than copied.

  HANGUP  the owner chose not to take the call. Said cleanly, rather than
          failing as though the system were broken.

DELIBERATELY NOT DONE HERE, and why:

  GREETING, MESSAGE  need audio to play, and this switch has no sound files at
                     all - see F1a. Adding a branch that plays a file that does
                     not exist would fail the call in a way that looks like a
                     fault. Blocked on the audio decision, not on code.
  DEPARTMENT         needs a member lookup that does not exist in this service.
  DEVICE             route_value's meaning is not established; guessing it would
                     ring the wrong person, which is worse than a clear failure.
  AI                 a LiveKit handoff, its own piece of work.

CALLER ID ON A FORWARD. The forwarded leg goes out as the number that was
dialled, not the original caller's number. The dialled number is one this
company owns, so the carrier accepts it; passing a stranger's number through is
what carriers reject, and a rejected forward is a lost call. The cost is that
the person receiving the forward sees the company's number rather than the
caller's - the usual trade, and the safe side of it.

Run:  python3 patch_route_types.py <path-to-dialplan_service.py>
Idempotent, and asserts a single anchor match, so it either applies whole or
writes nothing.
"""
import io
import sys

ANCHOR = '    log("warn", "unhandled route type", route_type=route_type, did=dest)'

NEW = '''    if route_type == "PHONE":
        # Forward to an ordinary outside number. Everything about reaching the
        # carrier - prefixes, codecs, the route via Kamailio - is reused from the
        # outbound branch rather than restated, so there is one place to fix it.
        target = str(route_value or "").strip()
        if not target:
            log("warn", "number is forwarded to a phone but no number is set", did=dest)
            return NOT_FOUND_TPL

        provider = get_outbound_provider()
        if not provider:
            log("error", "cannot forward to a phone, no outbound provider", did=dest)
            return NOT_FOUND_TPL

        provider_ip = provider["host_ip_outbound"]
        formatted = format_outbound_number(target, provider)
        # The dialled number is one this company owns, so the carrier will accept
        # it as caller ID. Passing the original caller's number through is what
        # gets a forward rejected, and a rejected forward is a lost call.
        fwd_caller_id = re.sub(r"^\\\\+", "", str(dest or ""))

        log("info", "forwarding to an outside number", did=dest, to=target,
            formatted=formatted, provider=provider["name"])

        actions = [
            {"application": "export", "data": f"sip_h_X-Domain={domain}"},
            {"application": "set", "data": f"company_uuid={company_uuid}"},
            {"application": "set", "data": f"effective_caller_id_number={fwd_caller_id}"},
            {"application": "export", "data": "sip_h_X-Billable=Y"},
            {"application": "export", "data": f"sip_h_X-Billing-Owner-UUID={company_uuid}"},
            {"application": "export", "data": "sip_h_X-Outbound=Y"},
            {"application": "export", "data": f"sip_h_X-Outbound-Row-Owner={company_uuid}"},
            {"application": "set", "data": f"provider_uuid={provider['uuid']}"},
            {"application": "set", "data": f"call_timeout={company_ring_seconds(db_name, company_uuid)}"},
            {"application": "set", "data": "continue_on_fail=true"},
            {"application": "set", "data": "hangup_after_bridge=true"},
        ] + (recording_actions(company_uuid) if should_record(company_recording_policy(db_name), "inbound") else []) + [
            {"application": "bridge", "data": f"{{sip_h_X-Outbound=Y,absolute_codec_string='PCMU,PCMA',sip_route_uri=sip:127.0.0.1:5060,sip_from_uri=sip:{fwd_caller_id}@{SERVER_IP}}}sofia/internal/{formatted}@{provider_ip}"},
        ]
        return build_internal_xml("public", f"forward-{dest}", actions)

    if route_type == "HANGUP":
        # The owner chose not to take calls on this number. Refusing plainly is
        # not the same as breaking: NORMAL_CLEARING is what a phone reports as an
        # ended call rather than a fault.
        log("info", "number is set to hang up", did=dest)
        actions = [
            {"application": "set", "data": "call_blocked=owner-set-hangup"},
            {"application": "hangup", "data": "NORMAL_CLEARING"},
        ]
        return build_internal_xml("public", f"hangup-{dest}", actions)

''' + ANCHOR


def main(path):
    s = io.open(path, encoding="utf-8").read()
    if 'route_type == "PHONE"' in s:
        print("already patched, nothing to do")
        return
    found = s.count(ANCHOR)
    if found != 1:
        raise SystemExit("REFUSING TO WRITE: %d anchor matches (want 1)" % found)
    io.open(path, "w", encoding="utf-8").write(s.replace(ANCHOR, NEW))
    print("added PHONE and HANGUP branches")


if __name__ == "__main__":
    main(sys.argv[1])

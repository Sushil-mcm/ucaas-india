"""Wire the per-line availability checks into the two paths a call takes."""

import io
import sys

PATH = sys.argv[1]
with io.open(PATH, encoding="utf-8") as handle:
    text = handle.read()

# ------------------------------------------- inbound: company AND the number
OLD = """    # Outside opening hours, a number pointed at a desk phone goes to that
    # extension'''s voicemail rather than ringing an empty office. Only
    # EXTENSION is diverted: there is no stored closed-hours target for an IVR
    # or a queue, and inventing one would be guessing.
    #
    # Only a definite "closed" diverts. "unknown" - no hours set, an
    # unresolvable timezone, unparseable times - behaves exactly as before.
    if business_hours_state(company_operational_hours(db_name)) == OPERATIONAL_HOURS_CLOSED:"""

NEW = '''    # Two sets of opening hours can shut this call: the company's, and the
    # number's own. Either is enough - a branch line closes for its own holiday
    # while head office stays open, and a company holiday closes every line
    # whatever each one says. Only a definite "closed" diverts; "unknown" - no
    # hours set, an unresolvable timezone, unparseable times - behaves exactly
    # as before and the call connects.
    number_hours = _as_object(_as_object(forward_actions.get("condition")).get("operational_hours"))
    shut_by = ""
    if business_hours_state(company_operational_hours(db_name)) == OPERATIONAL_HOURS_CLOSED:
        shut_by = "company"
    elif business_hours_state(number_hours) == OPERATIONAL_HOURS_CLOSED:
        shut_by = "this number"

    if shut_by:
        log("info", "closed today", did=dest, closed_by=shut_by)'''
assert text.count(OLD) == 1, "inbound guard"
text = text.replace(OLD, NEW)

# ---------------------------------------- inbound: the menu's own hours, and
# ---------------------------------------- the person the number rings
OLD = '''        else:
            # A menu or a queue with no closed-hours destination. Nothing to
            # infer, so it rings through as it does today - said out loud rather
            # than failing quietly.
            log("info", "outside opening hours but no closed-hours destination for this route type",
                did=dest, route_type=route_type)

    if route_type == "EXTENSION":'''

NEW = '''        else:
            # A menu or a queue with no closed-hours destination. Nothing to
            # infer, so it rings through as it does today - said out loud rather
            # than failing quietly.
            log("info", "outside opening hours but no closed-hours destination for this route type",
                did=dest, route_type=route_type)

    # A menu can be shut when the company is open - a support line that stops
    # taking calls at six while the office works on. Its own closed-hours
    # destination is the only thing that can be used, because a menu that is
    # shut has nowhere else to send a caller.
    if route_type == "IVR":
        if business_hours_state(ivr_operational_hours(db_name, route_value)) == OPERATIONAL_HOURS_CLOSED:
            menu_type, menu_value = closed_action_route(ivr_operational_hours(db_name, route_value))
            if menu_type and menu_value:
                log("info", "the menu is closed today, using its closed-hours destination",
                    did=dest, ivr=route_value, closed_type=menu_type)
                route_type, route_value = menu_type, menu_value
            else:
                log("info", "the menu is closed today but has no closed-hours destination set",
                    did=dest, ivr=route_value)

    # The person this number rings may be on leave, or outside their own working
    # hours, while the company is open. Ringing an empty desk in that case is
    # the thing an away setting exists to prevent, so the caller gets their
    # voicemail instead.
    if route_type == "EXTENSION":
        reason = person_unavailable(domain, route_value)
        if reason:
            log("info", "the person is not available, using their voicemail",
                did=dest, extension=route_value, reason=reason)
            route_type = "VOICEMAIL"

    if route_type == "EXTENSION":'''
assert text.count(OLD) == 1, "inbound ivr/person"
text = text.replace(OLD, NEW)

# --------------------------------- internal: a colleague dialling the extension
OLD = '''    if is_extension:
        dest_user = lookup_user_by_extension(domain, dest_clean)
        if dest_user:
            log("info", "internal call", src=caller_ext, dst=dest_clean, domain=domain)'''

NEW = '''    if is_extension:
        dest_user = lookup_user_by_extension(domain, dest_clean)
        if dest_user:
            # Being on leave does not stop at the front door. A colleague
            # dialling the extension gets the same answer an outside caller
            # would - the person's voicemail, not forty seconds of ringing.
            reason = person_unavailable(domain, dest_clean)
            if reason:
                log("info", "internal call to somebody not available, using their voicemail",
                    src=caller_ext, dst=dest_clean, domain=domain, reason=reason)
                actions = [
                    {"application": "set", "data": f"sip_h_X-Domain={domain}"},
                    {"application": "set", "data": f"company_uuid={company_uuid}"},
                    # The recording script files the message by accountcode, so
                    # this is what keeps one company's voicemail off another's.
                    {"application": "set", "data": f"accountcode={company_uuid}"},
                    {"application": "set", "data": f"vm_target_extension={dest_clean}"},
                    {"application": "answer", "data": ""},
                    {"application": "lua", "data": "save-voicemail.lua"},
                ]
                return build_internal_xml(context, f"voicemail-{dest_clean}", actions)

            log("info", "internal call", src=caller_ext, dst=dest_clean, domain=domain)'''
assert text.count(OLD) == 1, "internal"
text = text.replace(OLD, NEW)

with io.open(PATH, "w", encoding="utf-8") as handle:
    handle.write(text)
print("routes wired in %s" % PATH)

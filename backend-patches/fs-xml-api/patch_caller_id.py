"""Honour the two caller-ID permissions on outbound calls.

Both switches on Company > Calling have been stored since that screen shipped
and neither has ever changed a call, because the outbound dialplan sets

    effective_caller_id_number = <the number on the user's own record>

and never looks at anything else. The picker in the app can offer a group number
all it likes; the switch overwrites the choice on the way out.

WHAT EACH PERMISSION MEANS HERE

  caller_id.allow_office_or_group_number
      The caller may present a number other than their own. The number offered
      is checked against the company's OWN active DIDs before it is used - the
      app decides which of those to show a given person, but the switch is what
      stops a handset presenting a number belonging to somebody else's company.
      Refusing at the switch is the only refusal that counts.

  caller_id.allow_hidden
      The caller may withhold their number. FreeSWITCH is told through
      `origination_privacy` and a `Privacy: id` header; the number itself still
      travels, because carriers need one for billing and for emergency calls,
      and the far end is told not to show it.

Anything uncertain - permission absent, number not recognised, lookup failed -
falls through to exactly today's behaviour: the caller's own number, shown. A
caller ID that silently becomes somebody else's is worse than one that never
changes.
"""

import io
import sys

PATH = sys.argv[1]
with io.open(PATH, encoding="utf-8") as handle:
    text = handle.read()

ANCHOR = "def company_recording_policy(db_name):"

HELPERS = '''_caller_id_perm_cache = {}
_caller_id_perm_cache_time = {}

# What a client sends when the person asked to withhold their number. Kept as a
# set rather than a substring test so a number containing the word cannot match.
WITHHELD_TOKENS = {"anonymous", "restricted", "private", "unavailable", "withheld"}


def company_caller_id_permissions(db_name):
    """`settings.company_calling_permissions.caller_id`, or {} when unset."""
    if not db_name:
        return {}
    now = time.time()
    if db_name in _caller_id_perm_cache and (now - _caller_id_perm_cache_time.get(db_name, 0)) < CALLING_RULES_CACHE_SECONDS:
        return _caller_id_perm_cache[db_name]

    perms = {}
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT settings FROM `%s`.user_template WHERE name = %%s LIMIT 1" % db_name,
                (COMPANY_DEFAULT_TEMPLATE,),
            )
            row = cur.fetchone() or {}
            settings = _as_object(row.get("settings"))
            perms = _as_object(_as_object(settings.get("company_calling_permissions")).get("caller_id"))
    except Exception as e:
        log("error", "caller id permission lookup failed, using the stored number: %s" % e)
        return {}

    _caller_id_perm_cache[db_name] = perms
    _caller_id_perm_cache_time[db_name] = now
    return perms


def _digits(value):
    return re.sub(r"[^0-9]", "", str(value or ""))


def company_owns_number(company_uuid, number):
    """Is this an active DID on this company's account?

    Compared on digits alone. The same number is stored as +14155550123,
    14155550123 and 4155550123 in different places, and a caller ID that works
    or not depending on which spelling a screen happened to save is not a
    permission model - it is a coin toss.
    """
    wanted = _digits(number)
    if not company_uuid or len(wanted) < 7:
        return False

    def same(a, b):
        # Equal digits, or one is the other with a country code in front. The
        # 10-digit floor is what stops an extension or a short code matching the
        # tail of a real number. Only ever compared against numbers this company
        # already owns, so the widest this can reach is their own list.
        if a == b:
            return True
        short, long_ = (a, b) if len(a) <= len(b) else (b, a)
        return len(short) >= 10 and long_.endswith(short)
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT did_number FROM did_numbers
                WHERE company_uuid = %s AND status = 'A'
            """, (company_uuid,))
            rows = cur.fetchall() or []
    except Exception as e:
        log("error", "DID ownership check failed, using the stored number: %s" % e)
        return False
    return any(same(_digits(row.get("did_number")), wanted) for row in rows)


def resolve_outbound_caller_id(db_name, company_uuid, stored_caller_id, presented):
    """(number to present, hide it?) for one outbound call.

    `presented` is what the handset put in its From header - the choice the
    person made in the app's caller-ID picker.
    """
    # `_as_object` because a lookup that fell over, or a hand-written record,
    # can hand back None - and a permission check that raises on the call path
    # would fail the call rather than the permission.
    perms = _as_object(company_caller_id_permissions(db_name))
    presented_text = str(presented or "").strip()

    if perms.get("allow_hidden") is True and presented_text.lower() in WITHHELD_TOKENS:
        # The number still goes to the carrier; the far end is told to hide it.
        return stored_caller_id, True

    if (
        perms.get("allow_office_or_group_number") is True
        and presented_text
        and presented_text.lower() not in WITHHELD_TOKENS
        and _digits(presented_text) != _digits(stored_caller_id)
        and company_owns_number(company_uuid, presented_text)
    ):
        log("info", "presenting a company number the caller chose", presented=presented_text)
        return presented_text, False

    return stored_caller_id, False


def company_recording_policy(db_name):'''

assert text.count(ANCHOR) == 1, "anchor"
text = text.replace(ANCHOR, HELPERS)

OLD = """    provider_ip = provider["host_ip_outbound"]
    formatted_dest = format_outbound_number(dest, provider)"""
NEW = """    provider_ip = provider["host_ip_outbound"]
    formatted_dest = format_outbound_number(dest, provider)

    # The two caller-ID permissions, applied. Until this existed the picker in
    # the app could offer a group number and the switch overwrote the choice.
    caller_id, hide_caller_id = resolve_outbound_caller_id(
        domain_to_dbname(domain), company_uuid, caller_id,
        params.get("Caller-Caller-ID-Number", ""))"""
assert text.count(OLD) == 1, "outbound head"
text = text.replace(OLD, NEW)

OLD = """        {"application": "set", "data": f"effective_caller_id_number={caller_id}"},
        {"application": "export", "data": f"sip_h_X-Billable=Y"},"""
NEW = """        {"application": "set", "data": f"effective_caller_id_number={caller_id}"},
    ] + ([
        # Told to FreeSWITCH and to the far end both ways round, because
        # carriers honour one or the other and rarely document which.
        {"application": "set", "data": "origination_privacy=hide_name:hide_number"},
        {"application": "export", "data": "sip_h_Privacy=id"},
        {"application": "set", "data": "privacy=yes"},
    ] if hide_caller_id else []) + [
        {"application": "export", "data": f"sip_h_X-Billable=Y"},"""
assert text.count(OLD) == 1, "privacy actions"
text = text.replace(OLD, NEW)

with io.open(PATH, "w", encoding="utf-8") as handle:
    handle.write(text)
print("patched %s" % PATH)

#!/usr/bin/env python3
"""Present the outbound caller ID in the format the trunk asks for.

THE ASYMMETRY. build_outbound_dialplan() runs the destination through
format_outbound_number() (line 204), which strips a leading '+' and applies the
provider's prefix rules. The caller ID goes through nothing at all, so on a
trunk configured for "E.164 (NO +)" we send a well-formed To and a malformed
From in the same INVITE:

    To:   sip:917666718264@45.126.188.28       <- correct
    From: sip:+918037683127@185.100.212.46     <- carries the '+'

Tata's trunk (45.126.188.28, UDP, "E.164 (NO +)") wants both without it.

WHY NOT FIX THE STORED VALUE. users.caller_id and did_numbers.did_number hold
'+918037683127', and the '+' is right there - it is what the dialpad shows and
what every other screen matches on. This is a trunk presentation detail, so it
belongs at the point the From URI is built, not in the database.

WHAT THIS DOES NOT DO. It does not decide whether the CLI is one Tata will
accept. The trunk only authorises numbers registered against it; presenting a
correctly formatted number the carrier does not know still fails, just with a
different response.

Idempotent. Writes a .bak-clifmt-<stamp> beside the file.
"""
import shutil
import sys
import time
from pathlib import Path

STAMP = time.strftime("%Y%m%d-%H%M%S")

TARGET = "/opt/fs-xml-api-1.2.5/dialplan_service.py"

# Anchor on the provider lookup that already exists, and add the normalised
# caller ID next to the destination it has to agree with.
ANCHOR = """    provider_ip = provider["host_ip_outbound"]
    formatted_dest = format_outbound_number(dest, provider)
"""

REPLACEMENT = """    provider_ip = provider["host_ip_outbound"]
    formatted_dest = format_outbound_number(dest, provider)
    # The trunk is configured for E.164 with no '+'. The destination already
    # loses its plus in format_outbound_number(); the caller ID has to lose it
    # in the same way or we send a well-formed To beside a malformed From.
    # Only the presentation changes - the stored caller_id keeps its '+'.
    caller_id_trunk = re.sub(r'^\\+', '', str(caller_id or ''))
"""

OLD_NUMBER = '{"application": "set", "data": f"effective_caller_id_number={caller_id}"},\n        {"application": "export", "data": f"sip_h_X-Billable=Y"},'
NEW_NUMBER = '{"application": "set", "data": f"effective_caller_id_number={caller_id_trunk}"},\n        {"application": "export", "data": f"sip_h_X-Billable=Y"},'

OLD_FROM = "sip_from_uri=sip:{caller_id}@{SERVER_IP}"
NEW_FROM = "sip_from_uri=sip:{caller_id_trunk}@{SERVER_IP}"


def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else TARGET)
    if not path.is_file():
        raise SystemExit(f"missing {path}")
    src = path.read_text()

    if "caller_id_trunk" in src:
        print("already patched, left alone")
        return

    for label, needle in (("provider anchor", ANCHOR),
                          ("effective_caller_id_number", OLD_NUMBER),
                          ("sip_from_uri", OLD_FROM)):
        if src.count(needle) != 1:
            raise SystemExit(
                f"{label}: expected exactly 1 occurrence, found {src.count(needle)} - not patching"
            )

    if "\nimport re" not in src and not src.startswith("import re"):
        raise SystemExit("module does not import re - not patching")

    shutil.copy2(path, path.with_name(f"{path.name}.bak-clifmt-{STAMP}"))
    src = src.replace(ANCHOR, REPLACEMENT, 1)
    src = src.replace(OLD_NUMBER, NEW_NUMBER, 1)
    src = src.replace(OLD_FROM, NEW_FROM, 1)
    path.write_text(src)
    print("patched: outbound caller ID now sent without a leading '+'")
    print("run: systemctl restart fs-xml-api")


if __name__ == "__main__":
    main()

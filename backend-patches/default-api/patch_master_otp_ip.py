#!/usr/bin/env python3
"""Let master OTP work in production again, gated on an IP allowlist.

WHY IT STOPPED. The build deployed 3 Sep 2026 09:58 - the same one that dropped
trusted-device support - also reduced the master OTP to:

    const masterOtp = isProduction ? "" : String(process.env.MASTER_OTP || "").trim();

ENVIRONMENT=production, so masterOtp is forced empty and the bypass can never
match, whatever MASTER_OTP is set to. The build before it (kept in
dist.rollback-20260903-095606) allowed it in production for allow-listed client
IPs, which is where the `[MASTER_OTP] bypass used ... env=production` lines in
the error log come from. Both .env keys are already present and empty.

This restores that earlier behaviour verbatim, at both call sites (verify-otp
and the signup variant).

WHAT THIS IS. Master OTP is a full second-factor bypass: anyone who knows the
code and comes from an allow-listed address signs in as any account whose
password they hold. It is an operator escape hatch, not a feature. Two things
follow:

  - MASTER_OTP_ALLOWED_IPS should list specific addresses. "*" is accepted by
    the code and means every IP on the internet - it makes the allowlist
    decorative. Do not use it in production.
  - Set MASTER_OTP back to empty when you no longer need it. Empty disables the
    bypass completely, whatever the allowlist says.

Both accepted and rejected attempts are logged with the client IP, so the error
log is the record of who used it.

Idempotent. Writes a .bak-masterotp-<stamp> beside the file.
"""
import shutil
import sys
import time
from pathlib import Path

STAMP = time.strftime("%Y%m%d-%H%M%S")
TARGET = "/var/www/prod/default-api/dist/controllers/AuthController.js"

OLD = '''            const masterOtp = isProduction ? "" : String(process.env.MASTER_OTP || "").trim();
            const isMasterOtp = masterOtp !== "" && normalizedOtp === masterOtp;
            try {
                const clientIp = yield CommonHelper_1.default.getClientIp(req);
                const scopeCountry = yield CommonHelper_1.default.getClientIpGeolocation(req, clientIp);
'''

NEW = '''            const masterOtp = String(process.env.MASTER_OTP || "").trim();
            const masterOtpAllowedIps = String(process.env.MASTER_OTP_ALLOWED_IPS || "").split(",").map((ip) => ip.trim()).filter(Boolean);
            let isMasterOtp = false;
            try {
                const clientIp = yield CommonHelper_1.default.getClientIp(req);
                const scopeCountry = yield CommonHelper_1.default.getClientIpGeolocation(req, clientIp);
                const normalizedClientIp = String(clientIp || "").trim().replace(/^::ffff:/, "");
                const masterOtpIpAllowed = masterOtpAllowedIps.includes("*") || masterOtpAllowedIps.includes(normalizedClientIp);
                const masterOtpEnabled = masterOtp !== "" && (!isProduction || masterOtpIpAllowed);
                isMasterOtp = masterOtpEnabled && normalizedOtp === masterOtp;
                if (!isMasterOtp && masterOtp !== "" && normalizedOtp === masterOtp) {
                    console.warn(`[MASTER_OTP] rejected: correct code, ip not allowed ip=${normalizedClientIp} allowlist_size=${masterOtpAllowedIps.length} production=${isProduction}`);
                }
                if (isMasterOtp) {
                    console.warn(`[MASTER_OTP] bypass used email=${normalizedEmail} device=${normalizedDeviceId} ip=${normalizedClientIp} env=${process.env.ENVIRONMENT || ""}`);
                }
'''

EXPECTED_SITES = 2


def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else TARGET)
    if not path.is_file():
        raise SystemExit(f"missing {path}")
    src = path.read_text()

    if "masterOtpAllowedIps" in src:
        print("already patched, left alone")
        return

    found = src.count(OLD)
    if found != EXPECTED_SITES:
        raise SystemExit(
            f"expected {EXPECTED_SITES} master-OTP sites, found {found} - not patching"
        )

    shutil.copy2(path, path.with_name(f"{path.name}.bak-masterotp-{STAMP}"))
    path.write_text(src.replace(OLD, NEW))
    print(f"patched {found} master-OTP sites: production allowed when the client IP is allow-listed")
    print("now set MASTER_OTP and MASTER_OTP_ALLOWED_IPS, then: pm2 restart default-api --update-env")


if __name__ == "__main__":
    main()

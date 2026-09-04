#!/usr/bin/env python3
"""Restore trusted-device support in default-api's send-otp path.

The build deployed on 3 Sep 2026 09:58 lost two pieces the build before it had
(kept in dist.rollback-20260903-095606):

  validators/AuthValidator.js    sendOtpValidation had `remember_device`
  controllers/AuthController.js  sendOtp() had the trusted-device short-circuit

The frontend login page sends `remember_device` on every sign-in, so with the
validator key gone Joi rejects the whole request and NOBODY can log in:

  POST /api/send-otp {"email":...,"device_id":...,"remember_device":true}
  -> {"message":"\"remember_device\" is not allowed"}

Both edits are lifted verbatim from the previous build. Idempotent: running
twice is a no-op. Writes a .bak-trusteddevice-<stamp> beside each file.
"""
import re
import shutil
import sys
import time
from pathlib import Path

STAMP = time.strftime("%Y%m%d-%H%M%S")

VALIDATOR_ANCHOR = """    device_id: joi_1.default.string().required().messages({
        "string.base": "device_id should be of type string",
        "string.empty": "device_id can not be empty",
        "any.required": "device_id is required",
    }),
});
exports.sendOtpSignupValidation"""

VALIDATOR_REPLACEMENT = """    device_id: joi_1.default.string().required().messages({
        "string.base": "device_id should be of type string",
        "string.empty": "device_id can not be empty",
        "any.required": "device_id is required",
    }),
    remember_device: joi_1.default.boolean().optional(),
});
exports.sendOtpSignupValidation"""

CONTROLLER_ANCHOR = "            const normalizedDeviceId = String(device_id).trim();\n"

CONTROLLER_BLOCK = """            /* Trusted device: skip the second factor if this email+device already
               completed an OTP within TRUSTED_DEVICE_DAYS. The password has already
               been checked by /login before this endpoint is reached, so this only
               relaxes the second factor, never the first. Any failure here falls
               through to the normal OTP path. */
            try {
                const rememberDevice = ((req && req.body) || {}).remember_device === true;
                const trustDays = parseInt(String(process.env.TRUSTED_DEVICE_DAYS || "30"), 10) || 30;
                const [trustedRows] = yield Otp_1.default.sequelize.query(
                    "select created_at from otp where otp_receiver = ? and device_id = ? and verified = 1 and created_at >= (now() - interval ? day) order by created_at desc limit 1",
                    { replacements: [normalizedEmail, normalizedDeviceId, trustDays] }
                );
                if (rememberDevice && trustedRows && trustedRows.length > 0) {
                    console.warn(`[TRUSTED_DEVICE] otp skipped email=${normalizedEmail} device=${normalizedDeviceId} verified_at=${trustedRows[0].created_at} days=${trustDays}`);
                    return res.status(200).json({
                        success: true,
                        message: "Device already verified",
                        otp_required: false,
                        data: { otp_required: false },
                    });
                }
            }
            catch (trustErr) {
                console.error("[TRUSTED_DEVICE] check failed, falling back to OTP:", trustErr);
            }
"""


def backup(path: Path) -> None:
    shutil.copy2(path, path.with_name(f"{path.name}.bak-trusteddevice-{STAMP}"))


def patch_validator(path: Path) -> str:
    src = path.read_text()
    if "remember_device" in src:
        return "validator: already allows remember_device, left alone"
    if src.count(VALIDATOR_ANCHOR) != 1:
        raise SystemExit(
            f"validator: expected exactly 1 sendOtpValidation anchor, "
            f"found {src.count(VALIDATOR_ANCHOR)} - not patching"
        )
    backup(path)
    path.write_text(src.replace(VALIDATOR_ANCHOR, VALIDATOR_REPLACEMENT))
    return "validator: added remember_device to sendOtpValidation"


def patch_controller(path: Path) -> str:
    src = path.read_text()
    if "TRUSTED_DEVICE" in src:
        return "controller: trusted-device block already present, left alone"

    # The anchor line appears in four OTP methods; take the first one that
    # follows the sendOtp method opening, so the block lands in sendOtp only.
    m = re.search(r"^    sendOtp\(req, res\) \{$", src, re.M)
    if not m:
        raise SystemExit("controller: sendOtp(req, res) not found - not patching")
    idx = src.find(CONTROLLER_ANCHOR, m.end())
    if idx == -1:
        raise SystemExit("controller: normalizedDeviceId anchor not found in sendOtp")

    # Guard against landing in a later method: another method opening between
    # sendOtp and the anchor would mean sendOtp has already ended.
    between = src[m.end():idx]
    if re.search(r"^    \w+\(req, res\) \{$", between, re.M):
        raise SystemExit("controller: anchor is past the end of sendOtp - not patching")

    cut = idx + len(CONTROLLER_ANCHOR)
    backup(path)
    path.write_text(src[:cut] + CONTROLLER_BLOCK + src[cut:])
    return "controller: inserted trusted-device short-circuit into sendOtp"


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "/var/www/prod/default-api/dist")
    validator = root / "validators" / "AuthValidator.js"
    controller = root / "controllers" / "AuthController.js"
    for f in (validator, controller):
        if not f.is_file():
            raise SystemExit(f"missing {f}")
    print(patch_validator(validator))
    print(patch_controller(controller))


if __name__ == "__main__":
    main()

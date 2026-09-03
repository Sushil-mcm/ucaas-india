import * as yup from "yup";

/* Ten digits opening 1-9, optionally carrying +91 / 91 / a trunk 0.
   Mobiles take 6-9 and landline STD codes take 1-8; the only opening digit
   ruled out is a 0, which is a trunk prefix and is stripped before this runs.

   The same rule is spelled in the browser (src/lib/owned-numbers.ts) so an
   admin sees a bad row before saving. That copy is a courtesy. This one is the
   control, and the two must agree — if this changes, change that. */
export const INDIAN_NUMBER = /^[1-9]\d{9}$/;

export const toNationalDigits = (value: unknown): string => {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (!digits) return "";
    const withoutCountry =
        digits.startsWith("91") && digits.length > 10 ? digits.slice(2) : digits;
    const national = withoutCountry.startsWith("0")
        ? withoutCountry.slice(1)
        : withoutCountry;
    return national.length === 10 ? national : "";
};

export const registerNumbers = yup.object({
    numbers: yup
        .array()
        .of(yup.string().required())
        .min(1, "Give at least one number")
        .max(500, "Register at most 500 numbers at a time")
        .required()
        .test(
            "indian-numbers",
            "Every number must be a valid Indian subscriber number",
            (values) =>
                Array.isArray(values) &&
                values.every((value) => INDIAN_NUMBER.test(toNationalDigits(value)))
        ),
    label: yup.string().max(120).optional(),
    trunk_uuid: yup.string().uuid().optional(),
});

export const releaseNumber = yup.object({
    did_uuid: yup.string().uuid().required(),
});

export const upsertTrunk = yup.object({
    uuid: yup.string().uuid().optional(),
    name: yup.string().trim().min(1).max(120).required(),
    host: yup.string().trim().min(1).max(255).required(),
    port: yup.number().integer().min(1).max(65535).default(5060),
    username: yup.string().trim().max(191).optional(),
    /* Absent means "leave the stored password alone". An empty string would
       mean "set it to nothing", which is why the two are not treated alike. */
    password: yup.string().min(1).max(255).optional(),
    proxy: yup.string().trim().max(255).optional(),
    register: yup.boolean().default(true),
});

export const deleteTrunk = yup.object({
    uuid: yup.string().uuid().required(),
});

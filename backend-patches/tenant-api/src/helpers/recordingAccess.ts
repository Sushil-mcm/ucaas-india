/* Who is allowed to hear a recorded call back.
 *
 * WHAT THIS IS FOR
 *
 * An admin can already answer two questions on the Company info > Policies
 * screen: may people play their own calls, and may admins play anybody's. The
 * answers are saved. Until now the only thing that read them was the browser,
 * which hides a play button. The file name of the recording was still sitting in
 * the API response behind that button, so the decision was a suggestion.
 *
 * This module is the same decision, written so the server can make it before the
 * answer leaves the building. It is deliberately pure: no database, no express,
 * no imports at all. That is what lets it be tested on its own, and it is why the
 * rule can be read start to finish without knowing anything about this service.
 *
 * THE ONE RULE THAT MATTERS MOST
 *
 * Missing means allowed.
 *
 * Almost no company has ever opened the Policies screen. Those companies have no
 * saved answer at all. If "no answer" were read as "not allowed", every one of
 * them would lose the ability to hear their own calls the moment this shipped —
 * a feature they pay for, taken away by a setting nobody ever touched. That is a
 * far worse outcome than the gap this closes. So only a deliberate `false`
 * restricts anything. Everything else — absent, null, a stray string, a company
 * record that does not exist, a database that did not answer — reads as allowed,
 * which is exactly how the platform behaves today.
 *
 * WHY IT MIRRORS THE BROWSER LINE FOR LINE
 *
 * The browser copy of this rule lives in the website at
 * `src/hooks/use-recording-access.ts`. If the two disagree, somebody sees a play
 * button that returns nothing, or no button next to a recording they are entitled
 * to. So this file copies that one's decisions exactly, including the parts that
 * look over-cautious. Change one, change both.
 */

/** The two answers an admin gives on the Policies screen. */
export interface RecordingAccessPolicy {
    /** May a person play back a call they were on themselves? */
    own: boolean;
    /** May an admin play back a call that belongs to somebody else? */
    adminsAll: boolean;
}

/** Exactly how the platform behaves when nothing has been decided. */
export const PERMISSIVE_RECORDING_ACCESS: RecordingAccessPolicy = {
    own: true,
    adminsAll: true,
};

/* Where the Policies screen writes its answers inside the company record's
   free-form `settings` blob. Two levels, matching the website exactly. */
const POLICIES_KEY = "company_policies";
const RECORDING_ACCESS_KEY = "recording_access";

/* The existing call-log columns treat anything up to five characters as one of
   our own extensions and anything longer as an outside phone number. Copied here
   so this file and those columns agree on what an extension looks like. */
const MAX_EXTENSION_LENGTH = 5;

/* How deep the response scrubber will walk. Call-log responses are three or four
   levels deep; this is generous enough for all of them and stops a strange
   payload turning into a long walk. */
const MAX_SCRUB_DEPTH = 12;

/** Whose call this is, as far as the row lets us tell. */
export type RecordingOwnership = "own" | "other" | "unknown";

const isPlainObject = (value: unknown): boolean =>
    !!value && typeof value === "object" && !Array.isArray(value);

/* Only a real, stored boolean counts. See "Missing means allowed" above. */
const readStoredBoolean = (value: unknown, fallback: boolean): boolean =>
    typeof value === "boolean" ? value : fallback;

/** Trim a value into the plain string an extension is compared as. */
export const normalizeExtension = (value: unknown): string =>
    String(value === null || value === undefined ? "" : value).trim();

/* Strip a dial target down to the part that could be an extension: drop a
   `sip:` prefix, drop anything after an `@`, drop a `_web` device suffix. */
const normalizeDialTargetUserPart = (value: unknown): string => {
    const normalized = String(value === null || value === undefined ? "" : value)
        .replace(/\s+/g, "")
        .trim();
    if (!normalized) return "";

    const withoutSipPrefix = normalized.toLowerCase().startsWith("sip:")
        ? normalized.slice(4)
        : normalized;
    const userPart = (withoutSipPrefix.split("@")[0] || "").replace(/_web$/i, "");

    return userPart.trim();
};

/** True when this value looks like one of our own extensions rather than an
 *  outside phone number or a star code. */
export const isExtensionDialTarget = (
    value: unknown,
    maxLength: number = MAX_EXTENSION_LENGTH,
): boolean => {
    const userPart = normalizeDialTargetUserPart(value);
    if (!userPart) return false;
    if (userPart.startsWith("*") || userPart.startsWith("#")) return false;
    if (!/^\+?\d+$/.test(userPart)) return false;

    const digitsOnly = userPart.replace(/\D/g, "");
    return Boolean(digitsOnly) && digitsOnly.length <= maxLength;
};

/**
 * Pull the two answers out of a company record's `settings` blob.
 *
 * Hand it anything at all — undefined, a string, half a record. Anything it
 * cannot read comes back as "allowed", which is today's behaviour.
 */
export const readRecordingAccessPolicy = (settings: unknown): RecordingAccessPolicy => {
    if (!isPlainObject(settings)) return { ...PERMISSIVE_RECORDING_ACCESS };

    const policies = (settings as any)[POLICIES_KEY];
    if (!isPlainObject(policies)) return { ...PERMISSIVE_RECORDING_ACCESS };

    const access = (policies as any)[RECORDING_ACCESS_KEY];
    if (!isPlainObject(access)) return { ...PERMISSIVE_RECORDING_ACCESS };

    return {
        own: readStoredBoolean((access as any).own, PERMISSIVE_RECORDING_ACCESS.own),
        adminsAll: readStoredBoolean(
            (access as any).admins_all,
            PERMISSIVE_RECORDING_ACCESS.adminsAll,
        ),
    };
};

/**
 * Has anybody actually switched something off?
 *
 * This is the cheap question the request path asks first. When the answer is no —
 * which it is for every company that has never opened the Policies screen — the
 * request is left completely alone and nothing else in this file runs.
 */
export const isRecordingAccessRestricted = (policy: RecordingAccessPolicy): boolean =>
    policy.own === false || policy.adminsAll === false;

/* The people from our own company named on a call row.
 *
 * A call-log row carries no user id, so an extension is the only thread back to a
 * person. Only values that look like an extension are kept: an outside number in
 * `destination_number` says nothing about which of our people was on the call. */
const internalPartiesOf = (row: any): string[] => {
    const candidates: unknown[] = [
        /* The "from" side, filled in when one of our people placed the call. */
        row?.extension,
        row?.caller_id_number,
        /* The "to" side. On a call dialled straight to somebody, this is them. */
        row?.destination_number,
    ];

    /* A forwarded call records where it really ended up. Only EXTENSION and
       VOICEMAIL name a person — DEPARTMENT, QUEUE and IVR hold the id of a
       shared thing that belongs to nobody in particular. */
    const forwardType = String(row?.forward_type || "").toUpperCase();
    if (forwardType === "EXTENSION" || forwardType === "VOICEMAIL") {
        candidates.push(row?.forward_value);
    }

    const parties: string[] = [];
    candidates.forEach((candidate) => {
        const value = normalizeExtension(candidate);
        if (value && isExtensionDialTarget(value)) parties.push(value);
    });

    return parties;
};

/**
 * Whose call is this?
 *
 * Three answers, not two, and the third is the important one. A call that came in
 * on a public number and was answered out of a queue names the queue, not the
 * person who picked it up — so quite ordinary rows genuinely cannot be matched to
 * anybody. Guessing "theirs" would hand over a recording the policy meant to
 * withhold. Guessing "somebody else's" would deny people their own calls, which
 * is the failure this whole design exists to avoid. So it says "unknown", and the
 * decision below treats unknown as allowed.
 */
export const ownershipOf = (row: any, viewerExtension: string): RecordingOwnership => {
    if (!row || !viewerExtension) return "unknown";

    const parties = internalPartiesOf(row);
    if (!parties.length) return "unknown";
    if (parties.indexOf(viewerExtension) !== -1) return "own";

    return "other";
};

/**
 * The decision itself, for one person looking at one call.
 *
 * The order of these three tests is not arbitrary:
 *
 *  1. An admin allowed to hear everybody's calls is of course allowed to hear
 *     their own. Without this first, an admin who switched off self-listening for
 *     the company would lock themselves out of the very recordings they keep the
 *     right to audit.
 *
 *  2. "People may play their own calls" switched off blocks a call we know is
 *     theirs.
 *
 *  3. "Admins may play anybody's" switched off blocks an admin from a call we
 *     know belongs to somebody else. A non-admin listening to a colleague's call
 *     is not covered by either answer, so it is left exactly as it is today — the
 *     existing role flag decides that one. Blocking it here would be this file
 *     inventing a third rule nobody asked for.
 */
export const mayHearRecording = (
    policy: RecordingAccessPolicy,
    ownership: RecordingOwnership,
    isAdmin: boolean,
): boolean => {
    if (isAdmin && policy.adminsAll) return true;
    if (ownership === "own" && !policy.own) return false;
    if (isAdmin && ownership === "other" && !policy.adminsAll) return false;
    return true;
};

/** Who is asking. */
export interface RecordingViewer {
    /** Their extension, as the call rows spell it. Empty when we do not know it. */
    extension: string;
    /** True only for the ADMIN role, which is the same test the website makes. */
    isAdmin: boolean;
}

/* The two fields that let somebody play a recording. `recording_file` is the file
   name; every list in the website builds the audio address out of it by hand.
   `recording_duration`, `size` and the transcript are left alone on purpose —
   they are facts about the call, and this policy is about listening to it. */
const RECORDING_POINTER_FIELDS = ["recording_file", "recording_file_url"];

const hasRecordingPointer = (value: any): boolean => {
    for (let index = 0; index < RECORDING_POINTER_FIELDS.length; index += 1) {
        if (Object.prototype.hasOwnProperty.call(value, RECORDING_POINTER_FIELDS[index])) {
            return true;
        }
    }
    return false;
};

/**
 * Walk a response and blank the recording file name on every call this person is
 * not allowed to hear.
 *
 * It works on the already-serialised, plain-object form of the response, so it
 * does not care which endpoint produced it or how deeply the rows are nested. Any
 * object anywhere in the payload that carries a recording file name is judged on
 * its own fields; everything else is left untouched.
 *
 * The value is set to null rather than deleted, because the website checks
 * whether the field is truthy and a missing key and an empty one read the same,
 * while a deleted key can upset code that copies rows around.
 *
 * Returns how many recordings were withheld, which is what the caller logs.
 */
export const scrubRecordings = (
    payload: any,
    policy: RecordingAccessPolicy,
    viewer: RecordingViewer,
): number => {
    let withheld = 0;

    const walk = (node: any, depth: number): void => {
        if (depth > MAX_SCRUB_DEPTH || !node || typeof node !== "object") return;

        if (Array.isArray(node)) {
            for (let index = 0; index < node.length; index += 1) walk(node[index], depth + 1);
            return;
        }

        if (hasRecordingPointer(node)) {
            const ownership = ownershipOf(node, viewer.extension);
            if (!mayHearRecording(policy, ownership, viewer.isAdmin)) {
                let blanked = false;
                RECORDING_POINTER_FIELDS.forEach((field) => {
                    if (Object.prototype.hasOwnProperty.call(node, field) && node[field]) {
                        node[field] = null;
                        blanked = true;
                    }
                });
                /* One call counted once, however many of its fields pointed at
                   the audio, so the log reads as a number of recordings. */
                if (blanked) withheld += 1;
            }
        }

        const keys = Object.keys(node);
        for (let index = 0; index < keys.length; index += 1) {
            walk(node[keys[index]], depth + 1);
        }
    };

    walk(payload, 0);
    return withheld;
};

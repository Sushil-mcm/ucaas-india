/* Changing one setting for many people at once.
 *
 * The company screens save a company-wide answer to questions like "are calls
 * recorded?" and "how long does a phone ring?". Two readers already exist for
 * those answers — src/lib/company-new-user-defaults.ts and
 * src/lib/company-ring-time.ts — but BOTH of them only run when a person is
 * being created. Nobody who already works here is touched.
 *
 * So an admin who turns recording on for the company, on a company of two
 * hundred people, changes the settings of exactly nobody. To make it real today
 * they must open two hundred people one at a time. That is the gap this file
 * closes: pick the settings, pick the people, write them.
 *
 * Be clear about what this does and does not do. These settings are the same
 * fields the per-person settings drawer writes, on the same records, and this
 * writes them the same way — so whatever the drawer achieves for one person,
 * this achieves for hundreds. But a check of the call switch found that NONE of
 * them currently changes what happens on a live call: the switch plays no
 * recording prompt from a stored setting, ring length is a fixed number in its
 * dial plan rather than one read from a person's devices, and no country check
 * runs on an outbound call at all. So what is being made consistent here is the
 * record, not yet the call.
 *
 * That is still worth having, and it is worth having honestly. An admin asked
 * to state the company's position on recording should be able to state it once
 * rather than two hundred times, and the day the switch starts reading these
 * fields the answer is already in place. The screen using this module says so
 * on every setting, in those words. Please keep those notes accurate: if the
 * switch begins honouring one of these, that note is what has to change first.
 *
 * Four rules it will not bend:
 *
 *   1. Only a setting the admin actually chose is written. An unchosen setting
 *      is not defaulted, not cleared, not touched. This matters more than it
 *      sounds: the endpoint behind this REPLACES the whole person record, so a
 *      field left out of the payload is a field deleted from the record.
 *   2. The payload is the person's own record echoed back with only the chosen
 *      slots changed. Never a payload built from assumptions about what a
 *      person record contains. This codebase has already lost settings that
 *      way once.
 *   3. A person who is already on the wanted value is reported as unchanged and
 *      is NOT written. Two hundred pointless writes is two hundred chances to
 *      break something, and each one regenerates routing on the switch.
 *   4. A setting with nowhere to go on a particular person is reported as
 *      skipped, by name, rather than invented. A person with no devices on
 *      their record has no ring time to set; making devices up for them would
 *      be inventing their phone setup.
 *
 * Deliberately pure: no React, no network, no query client. Give it a person
 * record and the admin's choices, get back a payload and plain sentences.
 */

import {
  buildPersonInternationalRule,
  readPersonInternationalRule,
  type PersonInternationalRule,
} from '@/lib/international-calling';

/** The shortest and longest ring time the product's own screens allow. */
export const RING_MIN_SECONDS = 5;
export const RING_MAX_SECONDS = 60;

/**
 * The longest ring time a BULK change may set, which is deliberately shorter
 * than what one person may choose for themselves.
 *
 * Setting one phone to ring for a minute is a preference. Setting every phone
 * in the company to ring for a minute is an outage that looks like a working
 * system: callers wait, nobody answers, and whoever made the change is the last
 * to hear about it. One person choosing sixty seconds is reversible by that
 * person; two hundred people set to sixty seconds is a support queue.
 *
 * So the ceiling is lower here than on the individual screen. It is a different
 * constant rather than a smaller RING_MAX_SECONDS, because the individual limit
 * is a real product choice and should not be quietly reduced to serve this one.
 */
export const RING_BULK_MAX_SECONDS = 45;

/** Five seconds is one ring — how the shipped ring-time labels count. */
const SECONDS_PER_RING = 5;

/**
 * The two values voicemail-to-text is ever stored as. It is a string, not a
 * boolean: every reader in the product compares against the literal 'YES', so
 * writing `true` here would silently switch transcription off.
 */
const VOICEMAIL_TO_TEXT_ON = 'YES';
const VOICEMAIL_TO_TEXT_OFF = 'NO';

/**
 * What automatic recording can be set to.
 *
 * 'off' means the switch is off. The other three are the exact values the
 * per-person recording dialog writes, with the exact labels it writes beside
 * them — see src/components/common-settings/automatic-call-recording. Sending a
 * value that dialog does not use would show the admin a blank box next time
 * somebody opened that person.
 */
export type RecordingDirection = 'off' | 'all' | 'incoming' | 'outgoing';

const RECORDING_LABELS: Record<Exclude<RecordingDirection, 'off'>, string> = {
  all: 'All',
  incoming: 'Incoming',
  outgoing: 'Outgoing',
};

/**
 * Whether a person may phone other countries.
 *
 * Three answers rather than a switch, because "follow the company setting" is a
 * real answer and is not the same as "yes" — see src/lib/international-calling.ts.
 * It matters most here: a bulk run that could only say yes or no would hand a
 * personal permission to two hundred people who had never been given one, and
 * every one of them would then stop tracking the company's own answer.
 */
export type InternationalCallingChoice = 'inherit' | 'allow' | 'block';

const INTERNATIONAL_LABELS: Record<InternationalCallingChoice, string> = {
  inherit: 'following the company setting',
  allow: 'allowed to call other countries',
  block: 'not allowed to call other countries',
};

/** Every setting that can be changed for many people at once. */
export type BulkFieldId =
  | 'recording_automatic'
  | 'recording_on_demand'
  | 'voicemail_to_text'
  | 'transcription'
  | 'ring_seconds'
  | 'international_calling';

/**
 * The admin's choices. A key that is absent means "leave this one alone" — it
 * is the difference between "set recording to off" and "do not touch
 * recording", and the two must never be confused.
 */
export interface BulkChoices {
  recording_automatic?: RecordingDirection;
  recording_on_demand?: boolean;
  voicemail_to_text?: boolean;
  transcription?: boolean;
  ring_seconds?: number;
  international_calling?: InternationalCallingChoice;
}

/** One thing that happened to one person, in a sentence an admin can read. */
export interface BulkNote {
  field: BulkFieldId;
  message: string;
}

export interface BulkUserPlan {
  /**
   * 'changed'   — something differs and a payload is ready to send.
   * 'unchanged' — the person is already exactly as asked. Nothing is sent.
   * 'skipped'   — nothing could be applied to this person at all.
   */
  outcome: 'changed' | 'unchanged' | 'skipped';
  /** What would change. Empty unless the outcome is 'changed'. */
  changes: BulkNote[];
  /** What was already right, so an admin can see the run did consider it. */
  unchanged: BulkNote[];
  /** What could not be applied to this person, and why. */
  skipped: BulkNote[];
  /**
   * The whole record, ready to POST. Null whenever nothing would change, so a
   * caller cannot accidentally write a person it had no reason to touch.
   */
  payload: Record<string, any> | null;
}

/** Stored JSON columns come back as objects on some endpoints, strings on others. */
export const asObject = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, any>;
  try {
    const parsed: unknown = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : {};
  } catch {
    return {};
  }
};

/** '30' -> '6 times / 30 secs', the wording the shipped ring-time list uses. */
export const ringTimeLabel = (seconds: number): string => {
  const rings = Math.round(seconds / SECONDS_PER_RING);
  return `${rings} ${rings === 1 ? 'time' : 'times'} / ${seconds} secs`;
};

/**
 * Pull a typed ring time out of whatever an admin has entered.
 *
 * Returns null rather than guessing. A blank box, a word, a fraction or a
 * number outside the range the product's own screens allow is not a ring time,
 * and quietly rounding one into range would set a number nobody chose.
 */
export const parseRingSeconds = (
  raw: unknown,
  maxSeconds: number = RING_MAX_SECONDS,
): number | null => {
  if (raw === null || typeof raw === 'undefined' || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value < RING_MIN_SECONDS || value > maxSeconds) return null;
  return value;
};

/** What automatic recording is set to on a person right now. */
export const readRecordingDirection = (settings: unknown): RecordingDirection => {
  const automatic = asObject(asObject(settings).recording).automatic;
  const node = asObject(automatic);
  if (node.enabled !== true) return 'off';
  const value = String(node.value || '');
  return value === 'all' || value === 'incoming' || value === 'outgoing' ? value : 'all';
};

/** Whether an agent may start a recording themselves mid-call. */
export const readOnDemandRecording = (settings: unknown): boolean =>
  asObject(asObject(asObject(settings).recording).on_demand).enabled === true;

/** Whether this person's voicemail is turned into text. */
export const readVoicemailToText = (settings: unknown): boolean =>
  String(asObject(asObject(settings).voicemail_pin).voicemail_to_text || '').toUpperCase() ===
  VOICEMAIL_TO_TEXT_ON;

/** Whether this person's calls are transcribed. */
export const readTranscription = (settings: unknown): boolean =>
  asObject(settings).transcription === true;

/** What this person's record currently says about calling other countries. */
export const readInternationalCalling = (settings: unknown): InternationalCallingChoice => {
  const { allowed } = readPersonInternationalRule(settings);
  return allowed === true ? 'allow' : allowed === false ? 'block' : 'inherit';
};

/**
 * The devices a person's phone rings on, as stored.
 *
 * Empty for a person whose record has never been saved through the call-rules
 * drawer. That is a real state, not an error, and it is why ring time reports
 * itself as skipped for those people instead of inventing a device list.
 */
export const readDeviceOptions = (callForwarding: unknown): any[] => {
  const devices = asObject(asObject(callForwarding).incoming_calls).device_options;
  return Array.isArray(devices) ? devices : [];
};

/**
 * The ring times currently on a person's devices, as whole seconds.
 *
 * A device saved before ring times existed carries no `timeout` at all, so it
 * contributes nothing here rather than a zero.
 */
export const readRingSeconds = (callForwarding: unknown): number[] =>
  readDeviceOptions(callForwarding)
    .map((device) => Number(asObject(device).timeout))
    .filter((seconds) => Number.isFinite(seconds) && seconds > 0);

const describeRecording = (direction: RecordingDirection): string =>
  direction === 'off' ? 'not recorded' : `recorded (${RECORDING_LABELS[direction].toLowerCase()})`;

const onOff = (value: boolean): string => (value ? 'on' : 'off');

/**
 * Whether the admin has asked for anything at all.
 *
 * A run with no settings chosen would walk every person and write none of them,
 * which reads to an admin as "it did not work". The screen refuses instead.
 */
export const hasAnyChoice = (choices: BulkChoices): boolean =>
  (Object.keys(choices) as BulkFieldId[]).some(
    (key) => typeof choices[key] !== 'undefined' && choices[key] !== null,
  );

/**
 * Work out what would happen to one person, and build the payload to do it.
 *
 * `person` is the row as the server handed it back. It is only read, never
 * mutated, and every value not being changed is copied straight out of it into
 * the payload — see rule 2 in the header.
 */
export const planBulkUserUpdate = (person: any, choices: BulkChoices): BulkUserPlan => {
  const settings = asObject(person?.settings);
  const callForwarding = asObject(person?.call_forwarding);

  const changes: BulkNote[] = [];
  const unchanged: BulkNote[] = [];
  const skipped: BulkNote[] = [];

  /* Built up as the chosen settings are checked, then folded over the person's
     own settings at the end so untouched keys survive. */
  let nextSettings: Record<string, any> = settings;
  let nextCallForwarding: Record<string, any> = callForwarding;

  if (typeof choices.recording_automatic !== 'undefined') {
    const current = readRecordingDirection(settings);
    const wanted = choices.recording_automatic;
    if (current === wanted) {
      unchanged.push({
        field: 'recording_automatic',
        message: `Calls are already ${describeRecording(current)}.`,
      });
    } else {
      const recording = asObject(nextSettings.recording);
      const automatic = asObject(recording.automatic);
      nextSettings = {
        ...nextSettings,
        recording: {
          ...recording,
          automatic:
            wanted === 'off'
              ? /* Only the switch moves. The direction and the prompt filenames
                   already on the record are left exactly as found, so turning
                   recording back on later restores what they had before. */
                { ...automatic, enabled: false }
              : {
                  ...automatic,
                  enabled: true,
                  value: wanted,
                  label: RECORDING_LABELS[wanted],
                },
        },
      };
      changes.push({
        field: 'recording_automatic',
        message: `Calls go from ${describeRecording(current)} to ${describeRecording(wanted)}.`,
      });
    }
  }

  if (typeof choices.recording_on_demand !== 'undefined') {
    const current = readOnDemandRecording(settings);
    const wanted = choices.recording_on_demand;
    if (current === wanted) {
      unchanged.push({
        field: 'recording_on_demand',
        message: `Starting a recording mid-call is already ${onOff(current)}.`,
      });
    } else {
      const recording = asObject(nextSettings.recording);
      const onDemand = asObject(recording.on_demand);
      nextSettings = {
        ...nextSettings,
        recording: { ...recording, on_demand: { ...onDemand, enabled: wanted } },
      };
      changes.push({
        field: 'recording_on_demand',
        message: `Starting a recording mid-call goes ${onOff(current)} to ${onOff(wanted)}.`,
      });
    }
  }

  if (typeof choices.voicemail_to_text !== 'undefined') {
    const current = readVoicemailToText(settings);
    const wanted = choices.voicemail_to_text;
    if (current === wanted) {
      unchanged.push({
        field: 'voicemail_to_text',
        message: `Voicemail to text is already ${onOff(current)}.`,
      });
    } else {
      const voicemailPin = asObject(nextSettings.voicemail_pin);
      nextSettings = {
        ...nextSettings,
        voicemail_pin: {
          ...voicemailPin,
          /* The PIN itself is carried through untouched. Rewriting somebody's
             mailbox PIN from a bulk screen would lock them out of it. */
          voicemail_to_text: wanted ? VOICEMAIL_TO_TEXT_ON : VOICEMAIL_TO_TEXT_OFF,
        },
      };
      changes.push({
        field: 'voicemail_to_text',
        message: `Voicemail to text goes ${onOff(current)} to ${onOff(wanted)}.`,
      });
    }
  }

  if (typeof choices.transcription !== 'undefined') {
    const current = readTranscription(settings);
    const wanted = choices.transcription;
    if (current === wanted) {
      unchanged.push({
        field: 'transcription',
        message: `Call transcription is already ${onOff(current)}.`,
      });
    } else {
      nextSettings = { ...nextSettings, transcription: wanted };
      changes.push({
        field: 'transcription',
        message: `Call transcription goes ${onOff(current)} to ${onOff(wanted)}.`,
      });
    }
  }

  if (typeof choices.international_calling !== 'undefined') {
    const current = readInternationalCalling(settings);
    const wanted = choices.international_calling;
    if (current === wanted) {
      unchanged.push({
        field: 'international_calling',
        message: `This person is already ${INTERNATIONAL_LABELS[current]}.`,
      });
    } else {
      /* Any per-country list already on the record is read back off it and
         written through untouched. This screen does not show one, and a screen
         that cannot show a value has no business deleting it. */
      const existing: PersonInternationalRule = readPersonInternationalRule(nextSettings);
      const block = buildPersonInternationalRule({
        allowed: wanted === 'allow' ? true : wanted === 'block' ? false : null,
        countries: wanted === 'allow' ? existing.countries : [],
      });

      if (block) {
        nextSettings = { ...nextSettings, international_calling: block };
      } else {
        /* "Follow the company" is stored as no block at all, so the key is
           taken out rather than left behind holding nothing. The copy is made
           first: `nextSettings` may still be the person's own stored object at
           this point, and deleting from that would edit the record we were
           handed. */
        nextSettings = { ...nextSettings };
        delete nextSettings.international_calling;
      }

      changes.push({
        field: 'international_calling',
        message: `Goes from ${INTERNATIONAL_LABELS[current]} to ${INTERNATIONAL_LABELS[wanted]}.`,
      });
    }
  }

  if (typeof choices.ring_seconds !== 'undefined') {
    const wanted = parseRingSeconds(choices.ring_seconds, RING_BULK_MAX_SECONDS);
    const devices = readDeviceOptions(callForwarding);

    if (wanted === null) {
      skipped.push({
        field: 'ring_seconds',
        message: `A ring time set for many people at once must be a whole number of seconds between ${RING_MIN_SECONDS} and ${RING_BULK_MAX_SECONDS}. One person can still choose up to ${RING_MAX_SECONDS} on their own settings.`,
      });
    } else if (devices.length === 0) {
      skipped.push({
        field: 'ring_seconds',
        message:
          'This person has no phones or devices saved yet, so there is no ring time to set. Open their call rules once and it will apply from then on.',
      });
    } else {
      const already = devices.every((device) => Number(asObject(device).timeout) === wanted);
      if (already) {
        unchanged.push({
          field: 'ring_seconds',
          message: `Every device already rings for ${wanted} seconds.`,
        });
      } else {
        const incoming = asObject(nextCallForwarding.incoming_calls);
        nextCallForwarding = {
          ...nextCallForwarding,
          incoming_calls: {
            ...incoming,
            /* Each device is copied field for field with only the two ring-time
               fields replaced. The label travels with the number because that
               is what the settings screen shows the admin next time; leaving a
               stale label would show a time the phone no longer rings for. */
            device_options: devices.map((device) => ({
              ...asObject(device),
              timeout: String(wanted),
              label: ringTimeLabel(wanted),
            })),
          },
        };
        changes.push({
          field: 'ring_seconds',
          message: `Every device rings for ${wanted} seconds${
            devices.length > 1 ? ` (${devices.length} devices)` : ''
          }.`,
        });
      }
    }
  }

  if (changes.length === 0) {
    return {
      outcome: unchanged.length > 0 ? 'unchanged' : 'skipped',
      changes,
      unchanged,
      skipped,
      payload: null,
    };
  }

  const roleId = person?.custom_role_uuid || person?.role_uuid;
  const siteUuid = person?.site_uuid || person?.site?.uuid;

  return {
    outcome: 'changed',
    changes,
    unchanged,
    skipped,
    payload: {
      first_name: person?.first_name,
      last_name: person?.last_name,
      job_title: person?.job_title,
      /* Omitted when absent rather than sent empty. A blank here reads as
         "clear this", not "we could not find it" — and a caller ID written back
         in a different form than it was stored stops matching the person's
         assigned numbers, after which their calls go out from a number they
         never picked. */
      ...(person?.caller_id ? { caller_id: person.caller_id } : {}),
      ...(siteUuid ? { site_uuid: siteUuid } : {}),
      ...(person?.custom_role_uuid ? { custom_role_uuid: roleId } : { role_uuid: roleId }),
      greetings: asObject(person?.greetings),
      call_forwarding: nextCallForwarding,
      settings: nextSettings,
      uuid: person?.uuid,
      userID: person?.uuid,
    },
  };
};

/** A run's totals, for the line an admin reads when it finishes. */
export interface BulkRunTally {
  changed: number;
  unchanged: number;
  skipped: number;
  failed: number;
}

/**
 * One plain sentence saying how a finished run went.
 *
 * Written so the ordinary case reads as a success and the awkward cases cannot
 * hide inside it — a run where nothing changed says so in those words, rather
 * than reporting "0 updated" and leaving an admin to work out whether that was
 * a failure.
 */
export const describeRun = (tally: BulkRunTally): string => {
  const people = (count: number) => `${count} ${count === 1 ? 'person' : 'people'}`;
  const parts: string[] = [];

  if (tally.changed > 0) parts.push(`Updated ${people(tally.changed)}.`);
  if (tally.unchanged > 0) parts.push(`${people(tally.unchanged)} were already set that way.`);
  if (tally.skipped > 0) parts.push(`${people(tally.skipped)} could not be changed.`);
  if (tally.failed > 0) parts.push(`${people(tally.failed)} failed to save — please try again.`);

  if (parts.length === 0) return 'Nothing to do — no people were selected.';
  return parts.join(' ');
};

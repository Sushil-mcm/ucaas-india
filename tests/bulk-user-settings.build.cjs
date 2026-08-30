var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var bulk_user_settings_exports = {};
__export(bulk_user_settings_exports, {
  RING_MAX_SECONDS: () => RING_MAX_SECONDS,
  RING_MIN_SECONDS: () => RING_MIN_SECONDS,
  asObject: () => asObject,
  describeRun: () => describeRun,
  hasAnyChoice: () => hasAnyChoice,
  parseRingSeconds: () => parseRingSeconds,
  planBulkUserUpdate: () => planBulkUserUpdate,
  readDeviceOptions: () => readDeviceOptions,
  readOnDemandRecording: () => readOnDemandRecording,
  readRecordingDirection: () => readRecordingDirection,
  readRingSeconds: () => readRingSeconds,
  readTranscription: () => readTranscription,
  readVoicemailToText: () => readVoicemailToText,
  ringTimeLabel: () => ringTimeLabel
});
module.exports = __toCommonJS(bulk_user_settings_exports);
const RING_MIN_SECONDS = 5;
const RING_MAX_SECONDS = 60;
const SECONDS_PER_RING = 5;
const VOICEMAIL_TO_TEXT_ON = "YES";
const VOICEMAIL_TO_TEXT_OFF = "NO";
const RECORDING_LABELS = {
  all: "All",
  incoming: "Incoming",
  outgoing: "Outgoing"
};
const asObject = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};
const ringTimeLabel = (seconds) => {
  const rings = Math.round(seconds / SECONDS_PER_RING);
  return `${rings} ${rings === 1 ? "time" : "times"} / ${seconds} secs`;
};
const parseRingSeconds = (raw) => {
  if (raw === null || typeof raw === "undefined" || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value < RING_MIN_SECONDS || value > RING_MAX_SECONDS) return null;
  return value;
};
const readRecordingDirection = (settings) => {
  const automatic = asObject(asObject(settings).recording).automatic;
  const node = asObject(automatic);
  if (node.enabled !== true) return "off";
  const value = String(node.value || "");
  return value === "all" || value === "incoming" || value === "outgoing" ? value : "all";
};
const readOnDemandRecording = (settings) => asObject(asObject(asObject(settings).recording).on_demand).enabled === true;
const readVoicemailToText = (settings) => String(asObject(asObject(settings).voicemail_pin).voicemail_to_text || "").toUpperCase() === VOICEMAIL_TO_TEXT_ON;
const readTranscription = (settings) => asObject(settings).transcription === true;
const readDeviceOptions = (callForwarding) => {
  const devices = asObject(asObject(callForwarding).incoming_calls).device_options;
  return Array.isArray(devices) ? devices : [];
};
const readRingSeconds = (callForwarding) => readDeviceOptions(callForwarding).map((device) => Number(asObject(device).timeout)).filter((seconds) => Number.isFinite(seconds) && seconds > 0);
const describeRecording = (direction) => direction === "off" ? "not recorded" : `recorded (${RECORDING_LABELS[direction].toLowerCase()})`;
const onOff = (value) => value ? "on" : "off";
const hasAnyChoice = (choices) => Object.keys(choices).some(
  (key) => typeof choices[key] !== "undefined" && choices[key] !== null
);
const planBulkUserUpdate = (person, choices) => {
  const settings = asObject(person?.settings);
  const callForwarding = asObject(person?.call_forwarding);
  const changes = [];
  const unchanged = [];
  const skipped = [];
  let nextSettings = settings;
  let nextCallForwarding = callForwarding;
  if (typeof choices.recording_automatic !== "undefined") {
    const current = readRecordingDirection(settings);
    const wanted = choices.recording_automatic;
    if (current === wanted) {
      unchanged.push({
        field: "recording_automatic",
        message: `Calls are already ${describeRecording(current)}.`
      });
    } else {
      const recording = asObject(nextSettings.recording);
      const automatic = asObject(recording.automatic);
      nextSettings = {
        ...nextSettings,
        recording: {
          ...recording,
          automatic: wanted === "off" ? (
            /* Only the switch moves. The direction and the prompt filenames
               already on the record are left exactly as found, so turning
               recording back on later restores what they had before. */
            { ...automatic, enabled: false }
          ) : {
            ...automatic,
            enabled: true,
            value: wanted,
            label: RECORDING_LABELS[wanted]
          }
        }
      };
      changes.push({
        field: "recording_automatic",
        message: `Calls go from ${describeRecording(current)} to ${describeRecording(wanted)}.`
      });
    }
  }
  if (typeof choices.recording_on_demand !== "undefined") {
    const current = readOnDemandRecording(settings);
    const wanted = choices.recording_on_demand;
    if (current === wanted) {
      unchanged.push({
        field: "recording_on_demand",
        message: `Starting a recording mid-call is already ${onOff(current)}.`
      });
    } else {
      const recording = asObject(nextSettings.recording);
      const onDemand = asObject(recording.on_demand);
      nextSettings = {
        ...nextSettings,
        recording: { ...recording, on_demand: { ...onDemand, enabled: wanted } }
      };
      changes.push({
        field: "recording_on_demand",
        message: `Starting a recording mid-call goes ${onOff(current)} to ${onOff(wanted)}.`
      });
    }
  }
  if (typeof choices.voicemail_to_text !== "undefined") {
    const current = readVoicemailToText(settings);
    const wanted = choices.voicemail_to_text;
    if (current === wanted) {
      unchanged.push({
        field: "voicemail_to_text",
        message: `Voicemail to text is already ${onOff(current)}.`
      });
    } else {
      const voicemailPin = asObject(nextSettings.voicemail_pin);
      nextSettings = {
        ...nextSettings,
        voicemail_pin: {
          ...voicemailPin,
          /* The PIN itself is carried through untouched. Rewriting somebody's
             mailbox PIN from a bulk screen would lock them out of it. */
          voicemail_to_text: wanted ? VOICEMAIL_TO_TEXT_ON : VOICEMAIL_TO_TEXT_OFF
        }
      };
      changes.push({
        field: "voicemail_to_text",
        message: `Voicemail to text goes ${onOff(current)} to ${onOff(wanted)}.`
      });
    }
  }
  if (typeof choices.transcription !== "undefined") {
    const current = readTranscription(settings);
    const wanted = choices.transcription;
    if (current === wanted) {
      unchanged.push({
        field: "transcription",
        message: `Call transcription is already ${onOff(current)}.`
      });
    } else {
      nextSettings = { ...nextSettings, transcription: wanted };
      changes.push({
        field: "transcription",
        message: `Call transcription goes ${onOff(current)} to ${onOff(wanted)}.`
      });
    }
  }
  if (typeof choices.ring_seconds !== "undefined") {
    const wanted = parseRingSeconds(choices.ring_seconds);
    const devices = readDeviceOptions(callForwarding);
    if (wanted === null) {
      skipped.push({
        field: "ring_seconds",
        message: `A ring time must be a whole number of seconds between ${RING_MIN_SECONDS} and ${RING_MAX_SECONDS}.`
      });
    } else if (devices.length === 0) {
      skipped.push({
        field: "ring_seconds",
        message: "This person has no phones or devices saved yet, so there is no ring time to set. Open their call rules once and it will apply from then on."
      });
    } else {
      const already = devices.every((device) => Number(asObject(device).timeout) === wanted);
      if (already) {
        unchanged.push({
          field: "ring_seconds",
          message: `Every device already rings for ${wanted} seconds.`
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
              label: ringTimeLabel(wanted)
            }))
          }
        };
        changes.push({
          field: "ring_seconds",
          message: `Every device rings for ${wanted} seconds${devices.length > 1 ? ` (${devices.length} devices)` : ""}.`
        });
      }
    }
  }
  if (changes.length === 0) {
    return {
      outcome: unchanged.length > 0 ? "unchanged" : "skipped",
      changes,
      unchanged,
      skipped,
      payload: null
    };
  }
  const roleId = person?.custom_role_uuid || person?.role_uuid;
  const siteUuid = person?.site_uuid || person?.site?.uuid;
  return {
    outcome: "changed",
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
      ...person?.caller_id ? { caller_id: person.caller_id } : {},
      ...siteUuid ? { site_uuid: siteUuid } : {},
      ...person?.custom_role_uuid ? { custom_role_uuid: roleId } : { role_uuid: roleId },
      greetings: asObject(person?.greetings),
      call_forwarding: nextCallForwarding,
      settings: nextSettings,
      uuid: person?.uuid,
      userID: person?.uuid
    }
  };
};
const describeRun = (tally) => {
  const people = (count) => `${count} ${count === 1 ? "person" : "people"}`;
  const parts = [];
  if (tally.changed > 0) parts.push(`Updated ${people(tally.changed)}.`);
  if (tally.unchanged > 0) parts.push(`${people(tally.unchanged)} were already set that way.`);
  if (tally.skipped > 0) parts.push(`${people(tally.skipped)} could not be changed.`);
  if (tally.failed > 0) parts.push(`${people(tally.failed)} failed to save \u2014 please try again.`);
  if (parts.length === 0) return "Nothing to do \u2014 no people were selected.";
  return parts.join(" ");
};

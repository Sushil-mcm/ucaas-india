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

// src/lib/bulk-user-settings.ts
var bulk_user_settings_exports = {};
__export(bulk_user_settings_exports, {
  RING_MAX_SECONDS: () => RING_MAX_SECONDS,
  RING_MIN_SECONDS: () => RING_MIN_SECONDS,
  asObject: () => asObject2,
  describeRun: () => describeRun,
  hasAnyChoice: () => hasAnyChoice,
  parseRingSeconds: () => parseRingSeconds,
  planBulkUserUpdate: () => planBulkUserUpdate,
  readDeviceOptions: () => readDeviceOptions,
  readInternationalCalling: () => readInternationalCalling,
  readOnDemandRecording: () => readOnDemandRecording,
  readRecordingDirection: () => readRecordingDirection,
  readRingSeconds: () => readRingSeconds,
  readTranscription: () => readTranscription,
  readVoicemailToText: () => readVoicemailToText,
  ringTimeLabel: () => ringTimeLabel
});
module.exports = __toCommonJS(bulk_user_settings_exports);

// src/lib/international-calling.ts
var import_libphonenumber_js = require("libphonenumber-js");
var COMPANY_PERMISSIONS_KEY = "company_calling_permissions";
var COMPANY_INTERNATIONAL_KEY = "international_calling";
var COMPANY_INTERNATIONAL_PATH = `${COMPANY_PERMISSIONS_KEY}.${COMPANY_INTERNATIONAL_KEY}`;
var PERSON_INTERNATIONAL_KEY = "international_calling";
var EMERGENCY_NUMBERS = [
  "000",
  "08",
  "100",
  "101",
  "102",
  "106",
  "108",
  "110",
  "111",
  "112",
  "113",
  "114",
  "115",
  "117",
  "118",
  "119",
  "122",
  "911",
  "912",
  "991",
  "992",
  "993",
  "994",
  "995",
  "996",
  "997",
  "998",
  "999",
  "1122"
];
var EMERGENCY_SET = new Set(EMERGENCY_NUMBERS);
var asObject = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};
var toCountryCode = (value) => {
  const candidate = String(value ?? "").trim().toUpperCase();
  if (candidate.length !== 2) return "";
  return (0, import_libphonenumber_js.isSupportedCountry)(candidate) ? candidate : "";
};
var toCountryList = (value) => {
  const raw = Array.isArray(value) ? value : typeof value === "string" && value.trim() ? (() => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })() : [];
  const codes = raw.map(
    (entry) => toCountryCode(typeof entry === "string" ? entry : entry?.country_code_iso2 ?? entry?.code)
  ).filter(Boolean);
  return codes.filter((code, index) => codes.indexOf(code) === index);
};
var readPersonInternationalRule = (userSettings) => {
  const block = asObject(asObject(userSettings)[PERSON_INTERNATIONAL_KEY]);
  const allowed = block.allowed;
  return {
    allowed: allowed === true ? true : allowed === false ? false : null,
    countries: toCountryList(block.countries)
  };
};
var buildPersonInternationalRule = (rule, now = /* @__PURE__ */ new Date()) => {
  if (rule.allowed === null) return void 0;
  return {
    allowed: rule.allowed === true,
    /* A list kept under "not allowed" would read to a later maintainer as a set
       of countries somebody was granted. It is dropped, not hidden. */
    countries: rule.allowed ? toCountryList(rule.countries) : [],
    updated_at: now.toISOString()
  };
};

// src/lib/bulk-user-settings.ts
var RING_MIN_SECONDS = 5;
var RING_MAX_SECONDS = 60;
var SECONDS_PER_RING = 5;
var VOICEMAIL_TO_TEXT_ON = "YES";
var VOICEMAIL_TO_TEXT_OFF = "NO";
var RECORDING_LABELS = {
  all: "All",
  incoming: "Incoming",
  outgoing: "Outgoing"
};
var INTERNATIONAL_LABELS = {
  inherit: "following the company setting",
  allow: "allowed to call other countries",
  block: "not allowed to call other countries"
};
var asObject2 = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};
var ringTimeLabel = (seconds) => {
  const rings = Math.round(seconds / SECONDS_PER_RING);
  return `${rings} ${rings === 1 ? "time" : "times"} / ${seconds} secs`;
};
var parseRingSeconds = (raw) => {
  if (raw === null || typeof raw === "undefined" || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value < RING_MIN_SECONDS || value > RING_MAX_SECONDS) return null;
  return value;
};
var readRecordingDirection = (settings) => {
  const automatic = asObject2(asObject2(settings).recording).automatic;
  const node = asObject2(automatic);
  if (node.enabled !== true) return "off";
  const value = String(node.value || "");
  return value === "all" || value === "incoming" || value === "outgoing" ? value : "all";
};
var readOnDemandRecording = (settings) => asObject2(asObject2(asObject2(settings).recording).on_demand).enabled === true;
var readVoicemailToText = (settings) => String(asObject2(asObject2(settings).voicemail_pin).voicemail_to_text || "").toUpperCase() === VOICEMAIL_TO_TEXT_ON;
var readTranscription = (settings) => asObject2(settings).transcription === true;
var readInternationalCalling = (settings) => {
  const { allowed } = readPersonInternationalRule(settings);
  return allowed === true ? "allow" : allowed === false ? "block" : "inherit";
};
var readDeviceOptions = (callForwarding) => {
  const devices = asObject2(asObject2(callForwarding).incoming_calls).device_options;
  return Array.isArray(devices) ? devices : [];
};
var readRingSeconds = (callForwarding) => readDeviceOptions(callForwarding).map((device) => Number(asObject2(device).timeout)).filter((seconds) => Number.isFinite(seconds) && seconds > 0);
var describeRecording = (direction) => direction === "off" ? "not recorded" : `recorded (${RECORDING_LABELS[direction].toLowerCase()})`;
var onOff = (value) => value ? "on" : "off";
var hasAnyChoice = (choices) => Object.keys(choices).some(
  (key) => typeof choices[key] !== "undefined" && choices[key] !== null
);
var planBulkUserUpdate = (person, choices) => {
  const settings = asObject2(person?.settings);
  const callForwarding = asObject2(person?.call_forwarding);
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
      const recording = asObject2(nextSettings.recording);
      const automatic = asObject2(recording.automatic);
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
      const recording = asObject2(nextSettings.recording);
      const onDemand = asObject2(recording.on_demand);
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
      const voicemailPin = asObject2(nextSettings.voicemail_pin);
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
  if (typeof choices.international_calling !== "undefined") {
    const current = readInternationalCalling(settings);
    const wanted = choices.international_calling;
    if (current === wanted) {
      unchanged.push({
        field: "international_calling",
        message: `This person is already ${INTERNATIONAL_LABELS[current]}.`
      });
    } else {
      const existing = readPersonInternationalRule(nextSettings);
      const block = buildPersonInternationalRule({
        allowed: wanted === "allow" ? true : wanted === "block" ? false : null,
        countries: wanted === "allow" ? existing.countries : []
      });
      if (block) {
        nextSettings = { ...nextSettings, international_calling: block };
      } else {
        nextSettings = { ...nextSettings };
        delete nextSettings.international_calling;
      }
      changes.push({
        field: "international_calling",
        message: `Goes from ${INTERNATIONAL_LABELS[current]} to ${INTERNATIONAL_LABELS[wanted]}.`
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
      const already = devices.every((device) => Number(asObject2(device).timeout) === wanted);
      if (already) {
        unchanged.push({
          field: "ring_seconds",
          message: `Every device already rings for ${wanted} seconds.`
        });
      } else {
        const incoming = asObject2(nextCallForwarding.incoming_calls);
        nextCallForwarding = {
          ...nextCallForwarding,
          incoming_calls: {
            ...incoming,
            /* Each device is copied field for field with only the two ring-time
               fields replaced. The label travels with the number because that
               is what the settings screen shows the admin next time; leaving a
               stale label would show a time the phone no longer rings for. */
            device_options: devices.map((device) => ({
              ...asObject2(device),
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
      greetings: asObject2(person?.greetings),
      call_forwarding: nextCallForwarding,
      settings: nextSettings,
      uuid: person?.uuid,
      userID: person?.uuid
    }
  };
};
var describeRun = (tally) => {
  const people = (count) => `${count} ${count === 1 ? "person" : "people"}`;
  const parts = [];
  if (tally.changed > 0) parts.push(`Updated ${people(tally.changed)}.`);
  if (tally.unchanged > 0) parts.push(`${people(tally.unchanged)} were already set that way.`);
  if (tally.skipped > 0) parts.push(`${people(tally.skipped)} could not be changed.`);
  if (tally.failed > 0) parts.push(`${people(tally.failed)} failed to save \u2014 please try again.`);
  if (parts.length === 0) return "Nothing to do \u2014 no people were selected.";
  return parts.join(" ");
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RING_MAX_SECONDS,
  RING_MIN_SECONDS,
  asObject,
  describeRun,
  hasAnyChoice,
  parseRingSeconds,
  planBulkUserUpdate,
  readDeviceOptions,
  readInternationalCalling,
  readOnDemandRecording,
  readRecordingDirection,
  readRingSeconds,
  readTranscription,
  readVoicemailToText,
  ringTimeLabel
});

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
var recordingAccess_exports = {};
__export(recordingAccess_exports, {
  PERMISSIVE_RECORDING_ACCESS: () => PERMISSIVE_RECORDING_ACCESS,
  isExtensionDialTarget: () => isExtensionDialTarget,
  isRecordingAccessRestricted: () => isRecordingAccessRestricted,
  mayHearRecording: () => mayHearRecording,
  normalizeExtension: () => normalizeExtension,
  ownershipOf: () => ownershipOf,
  readRecordingAccessPolicy: () => readRecordingAccessPolicy,
  scrubRecordings: () => scrubRecordings
});
module.exports = __toCommonJS(recordingAccess_exports);
const PERMISSIVE_RECORDING_ACCESS = {
  own: true,
  adminsAll: true
};
const POLICIES_KEY = "company_policies";
const RECORDING_ACCESS_KEY = "recording_access";
const MAX_EXTENSION_LENGTH = 5;
const MAX_SCRUB_DEPTH = 12;
const isPlainObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const readStoredBoolean = (value, fallback) => typeof value === "boolean" ? value : fallback;
const normalizeExtension = (value) => String(value === null || value === void 0 ? "" : value).trim();
const normalizeDialTargetUserPart = (value) => {
  const normalized = String(value === null || value === void 0 ? "" : value).replace(/\s+/g, "").trim();
  if (!normalized) return "";
  const withoutSipPrefix = normalized.toLowerCase().startsWith("sip:") ? normalized.slice(4) : normalized;
  const userPart = (withoutSipPrefix.split("@")[0] || "").replace(/_web$/i, "");
  return userPart.trim();
};
const isExtensionDialTarget = (value, maxLength = MAX_EXTENSION_LENGTH) => {
  const userPart = normalizeDialTargetUserPart(value);
  if (!userPart) return false;
  if (userPart.startsWith("*") || userPart.startsWith("#")) return false;
  if (!/^\+?\d+$/.test(userPart)) return false;
  const digitsOnly = userPart.replace(/\D/g, "");
  return Boolean(digitsOnly) && digitsOnly.length <= maxLength;
};
const readRecordingAccessPolicy = (settings) => {
  if (!isPlainObject(settings)) return { ...PERMISSIVE_RECORDING_ACCESS };
  const policies = settings[POLICIES_KEY];
  if (!isPlainObject(policies)) return { ...PERMISSIVE_RECORDING_ACCESS };
  const access = policies[RECORDING_ACCESS_KEY];
  if (!isPlainObject(access)) return { ...PERMISSIVE_RECORDING_ACCESS };
  return {
    own: readStoredBoolean(access.own, PERMISSIVE_RECORDING_ACCESS.own),
    adminsAll: readStoredBoolean(
      access.admins_all,
      PERMISSIVE_RECORDING_ACCESS.adminsAll
    )
  };
};
const isRecordingAccessRestricted = (policy) => policy.own === false || policy.adminsAll === false;
const internalPartiesOf = (row) => {
  const candidates = [
    /* The "from" side, filled in when one of our people placed the call. */
    row?.extension,
    row?.caller_id_number,
    /* The "to" side. On a call dialled straight to somebody, this is them. */
    row?.destination_number
  ];
  const forwardType = String(row?.forward_type || "").toUpperCase();
  if (forwardType === "EXTENSION" || forwardType === "VOICEMAIL") {
    candidates.push(row?.forward_value);
  }
  const parties = [];
  candidates.forEach((candidate) => {
    const value = normalizeExtension(candidate);
    if (value && isExtensionDialTarget(value)) parties.push(value);
  });
  return parties;
};
const ownershipOf = (row, viewerExtension) => {
  if (!row || !viewerExtension) return "unknown";
  const parties = internalPartiesOf(row);
  if (!parties.length) return "unknown";
  if (parties.indexOf(viewerExtension) !== -1) return "own";
  return "other";
};
const mayHearRecording = (policy, ownership, isAdmin) => {
  if (isAdmin && policy.adminsAll) return true;
  if (ownership === "own" && !policy.own) return false;
  if (isAdmin && ownership === "other" && !policy.adminsAll) return false;
  return true;
};
const RECORDING_POINTER_FIELDS = ["recording_file", "recording_file_url"];
const hasRecordingPointer = (value) => {
  for (let index = 0; index < RECORDING_POINTER_FIELDS.length; index += 1) {
    if (Object.prototype.hasOwnProperty.call(value, RECORDING_POINTER_FIELDS[index])) {
      return true;
    }
  }
  return false;
};
const scrubRecordings = (payload, policy, viewer) => {
  let withheld = 0;
  const walk = (node, depth) => {
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

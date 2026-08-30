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

// src/lib/number-labels.ts
var number_labels_exports = {};
__export(number_labels_exports, {
  LABEL_MAX_LENGTH: () => LABEL_MAX_LENGTH,
  buildLabelPatch: () => buildLabelPatch,
  canEditLabel: () => canEditLabel,
  checkLabel: () => checkLabel,
  groupByLine: () => groupByLine,
  isRouted: () => isRouted,
  isSmsCapable: () => isSmsCapable,
  labelOf: () => labelOf,
  lineOf: () => lineOf,
  matchesLineSearch: () => matchesLineSearch,
  normaliseLabel: () => normaliseLabel,
  numberTypeOf: () => numberTypeOf,
  numbersWithoutLine: () => numbersWithoutLine,
  parseActions: () => parseActions
});
module.exports = __toCommonJS(number_labels_exports);

// src/constants/forwarding-consts.ts
var FORWARD_TYPES = {
  DEVICE: "DEVICE",
  VOICEMAIL: "VOICEMAIL",
  GREETING: "GREETING",
  EXTENSION: "EXTENSION",
  PHONE: "PHONE",
  IVR: "IVR",
  QUEUE: "QUEUE",
  DEPARTMENT: "DEPARTMENT",
  MESSAGE: "MESSAGE",
  AI: "AI",
  HANGUP: "HANGUP"
};
var RING_TYPE_LABELS = {
  sequential: "Ring in order",
  simultaneously: "Ring all at once"
};
var RING_MODE_OPTIONS = [
  {
    label: RING_TYPE_LABELS.sequential,
    value: "sequential"
  },
  {
    label: RING_TYPE_LABELS.simultaneously,
    value: "simultaneously"
  }
];
var RINGING_OPTIONS = [
  {
    label: "6 times / 30 secs",
    value: "30"
  },
  {
    label: "3 times / 15 secs",
    value: "15"
  }
];
var DEVICE_OPTIONS_CONSTANT = {
  web: {
    status: true,
    value: RINGING_OPTIONS?.[0],
    options: {
      label: "",
      value: ""
    }
  }
};

// src/lib/number-labels.ts
var LABEL_MAX_LENGTH = 30;
var parseActions = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};
var normaliseLabel = (raw) => String(raw ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
var checkLabel = (raw) => {
  const label = normaliseLabel(raw);
  if (label.length > LABEL_MAX_LENGTH) {
    return { ok: false, reason: `Keep it to ${LABEL_MAX_LENGTH} characters or fewer.` };
  }
  if (/[<>]/.test(label)) {
    return { ok: false, reason: "Angle brackets are not allowed in a label." };
  }
  return { ok: true };
};
var labelOf = (did) => {
  const fromActions = parseActions(did?.forward_call_actions)?.did_info?.did_name;
  return normaliseLabel(fromActions) || normaliseLabel(did?.did_name);
};
var DID_TYPE_NAMES = {
  L: "Local",
  N: "National",
  T: "Toll free",
  M: "Mobile"
};
var numberTypeOf = (did) => {
  if (did?.is_fax_enabled) return "Fax";
  const key = String(did?.did_type ?? "").trim().toUpperCase();
  return DID_TYPE_NAMES[key] ?? "--";
};
var isSmsCapable = (did) => Array.isArray(did?.features) && did.features.some((f) => f === "sms_in" || f === "sms_out");
var LINE_TYPES = [
  FORWARD_TYPES.DEPARTMENT,
  FORWARD_TYPES.QUEUE,
  FORWARD_TYPES.IVR,
  FORWARD_TYPES.AI
];
var lineOf = (did) => {
  const hours = parseActions(did?.forward_call_actions)?.call_handling?.business_hours;
  const type = String(hours?.type || "").trim();
  if (!LINE_TYPES.includes(type)) return null;
  const value = String(hours?.value || "").trim();
  if (!value) return null;
  return {
    key: `${type}:${value}`,
    type,
    value,
    name: normaliseLabel(hours?.name || hours?.label) || value
  };
};
var isRouted = (did) => Boolean(parseActions(did?.forward_call_actions)?.call_handling?.business_hours?.type);
var canEditLabel = (did) => {
  if (!did?.uuid) return { ok: false, reason: "This number has no record to save against." };
  if (!parseActions(did?.forward_call_actions)) {
    return {
      ok: false,
      reason: "Point this number somewhere first. A number with no call handling has nowhere to keep a label."
    };
  }
  return { ok: true };
};
var buildLabelPatch = (did, rawLabel) => {
  if (!canEditLabel(did).ok) return null;
  if (!checkLabel(rawLabel).ok) return null;
  const actions = parseActions(did?.forward_call_actions);
  const site = actions?.did_info?.site || did?.site_uuid || "";
  return {
    uuid: String(did.uuid),
    forward_call_actions: {
      ...actions,
      did_info: {
        did_name: normaliseLabel(rawLabel),
        ...site ? { site } : {}
      }
    }
  };
};
var groupByLine = (dids) => {
  const groups = /* @__PURE__ */ new Map();
  for (const did of Array.isArray(dids) ? dids : []) {
    const line = lineOf(did);
    if (!line) continue;
    const existing = groups.get(line.key);
    if (existing) existing.numbers.push(did);
    else groups.set(line.key, { line, numbers: [did] });
  }
  return [...groups.values()].sort(
    (a, b) => b.numbers.length - a.numbers.length || a.line.name.localeCompare(b.line.name)
  );
};
var numbersWithoutLine = (dids) => (Array.isArray(dids) ? dids : []).filter((did) => !lineOf(did));
var matchesLineSearch = (group, query) => {
  const needle = normaliseLabel(query).toLowerCase();
  if (!needle) return true;
  if (group.line.name.toLowerCase().includes(needle)) return true;
  return group.numbers.some(
    (did) => String(did?.did_number || "").toLowerCase().includes(needle) || labelOf(did).toLowerCase().includes(needle)
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LABEL_MAX_LENGTH,
  buildLabelPatch,
  canEditLabel,
  checkLabel,
  groupByLine,
  isRouted,
  isSmsCapable,
  labelOf,
  lineOf,
  matchesLineSearch,
  normaliseLabel,
  numberTypeOf,
  numbersWithoutLine,
  parseActions
});

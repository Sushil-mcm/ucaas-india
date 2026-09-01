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

// src/lib/queue-numbers.ts
var queue_numbers_exports = {};
__export(queue_numbers_exports, {
  buildQueueAttachPatch: () => buildQueueAttachPatch,
  buildQueueDetachPatch: () => buildQueueDetachPatch,
  canAttach: () => canAttach,
  currentRouteOf: () => currentRouteOf,
  numbersOnQueue: () => numbersOnQueue,
  planBulkAttach: () => planBulkAttach,
  poolSummary: () => poolSummary,
  queueIdOf: () => queueIdOf
});
module.exports = __toCommonJS(queue_numbers_exports);

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
var LINE_TYPES = [
  FORWARD_TYPES.DEPARTMENT,
  FORWARD_TYPES.QUEUE,
  FORWARD_TYPES.IVR,
  FORWARD_TYPES.AI
];

// src/lib/queue-numbers.ts
var businessHoursOf = (did) => parseActions(did?.forward_call_actions)?.call_handling?.business_hours ?? null;
var queueIdOf = (did) => {
  const hours = businessHoursOf(did);
  if (String(hours?.type || "").trim() !== FORWARD_TYPES.QUEUE) return "";
  return String(hours?.value || "").trim();
};
var numbersOnQueue = (dids, queueId) => {
  const wanted = String(queueId ?? "").trim();
  if (!wanted) return [];
  return (Array.isArray(dids) ? dids : []).filter((did) => queueIdOf(did) === wanted);
};
var currentRouteOf = (did) => {
  const hours = businessHoursOf(did);
  const type = String(hours?.type || "").trim();
  if (!type) return { type: "", name: "", busy: false };
  return {
    type,
    name: normaliseLabel(hours?.name || hours?.label || hours?.value) || "",
    busy: true
  };
};
var canAttach = (did) => {
  if (!did?.uuid) return { ok: false, reason: "This number has no record to save against." };
  return { ok: true };
};
var buildQueueAttachPatch = (did, queue) => {
  if (!canAttach(did).ok) return null;
  const queueId = String(queue?.id ?? "").trim();
  if (!queueId) return null;
  if (queueIdOf(did) === queueId) return null;
  const actions = parseActions(did?.forward_call_actions) ?? {};
  const hours = actions?.call_handling?.business_hours ?? {};
  const name = normaliseLabel(queue?.name) || queueId;
  const extension = String(queue?.extension ?? "").trim();
  return {
    uuid: String(did.uuid),
    forward_call_actions: {
      ...actions,
      call_handling: {
        ...actions?.call_handling ?? {},
        business_hours: {
          ...hours,
          type: FORWARD_TYPES.QUEUE,
          value: queueId,
          label: name,
          name,
          ...extension ? { extension } : {}
        }
      }
    }
  };
};
var buildQueueDetachPatch = (did) => {
  if (!did?.uuid) return null;
  if (!queueIdOf(did)) return null;
  const actions = parseActions(did?.forward_call_actions) ?? {};
  const hours = { ...actions?.call_handling?.business_hours ?? {} };
  delete hours.extension;
  return {
    uuid: String(did.uuid),
    forward_call_actions: {
      ...actions,
      call_handling: {
        ...actions?.call_handling ?? {},
        business_hours: { ...hours, type: "", value: "", label: "", name: "" }
      }
    }
  };
};
var poolSummary = (dids, queueId) => {
  const numbers = numbersOnQueue(dids, queueId).map((did) => String(did?.did_number || "").trim());
  return { count: numbers.length, primary: numbers[0] || "", numbers };
};
var planBulkAttach = (dids, queue) => {
  const queueId = String(queue?.id ?? "").trim();
  const moving = [];
  const adding = [];
  const unchanged = [];
  for (const did of Array.isArray(dids) ? dids : []) {
    if (!queueId || !canAttach(did).ok || queueIdOf(did) === queueId) {
      unchanged.push(did);
      continue;
    }
    if (currentRouteOf(did).busy) moving.push(did);
    else adding.push(did);
  }
  return { moving, adding, unchanged };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildQueueAttachPatch,
  buildQueueDetachPatch,
  canAttach,
  currentRouteOf,
  numbersOnQueue,
  planBulkAttach,
  poolSummary,
  queueIdOf
});

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
var addons_exports = {};
__export(addons_exports, {
  ADD_ONS: () => ADD_ONS,
  STATE_LABEL: () => STATE_LABEL,
  addOnState: () => addOnState,
  canPurchaseHere: () => canPurchaseHere,
  countByState: () => countByState,
  priceText: () => priceText
});
module.exports = __toCommonJS(addons_exports);
const ADD_ONS = [
  {
    id: "international",
    name: "International calling bundle",
    summary: "A monthly allowance of international minutes shared across your company.",
    replaces: "Replaces per-minute charges for calls abroad, up to the allowance.",
    billing: "Bought per seat, monthly.",
    featureKey: "calling_rates",
    detail: [
      "Calls abroad are charged per minute today. A bundle turns that into one predictable monthly figure.",
      "Once the allowance is used, calls carry on and are charged at your usual rates rather than being blocked.",
      "Unused minutes do not carry over to the following month."
    ]
  },
  {
    id: "ai",
    name: "AI assistance",
    summary: "Live transcription, call summaries and the AI receptionist.",
    replaces: "Replaces writing up calls by hand, and having somebody answer and transfer every call.",
    billing: "Bought per seat, monthly.",
    featureKey: "ai"
  },
  {
    id: "monitoring",
    name: "Live monitoring and coaching",
    summary: "Listen to a live call, whisper to the agent, or join it.",
    replaces: "Replaces sitting next to somebody to train them.",
    billing: "Bought per seat, monthly, for the people who supervise.",
    featureKey: "monitoring"
  },
  {
    id: "campaigns",
    name: "Outbound campaigns",
    summary: "Work through a list of numbers automatically instead of dialling each one.",
    replaces: "Replaces dialling from a spreadsheet.",
    billing: "Bought per seat, monthly, for the people making the calls.",
    featureKey: "campaign"
  },
  {
    id: "omni_channel",
    name: "Messaging channels",
    summary: "Handle social and messaging conversations beside your calls.",
    replaces: "Replaces watching several separate inboxes.",
    billing: "Bought per seat, monthly.",
    featureKey: "omni_channel"
  },
  {
    id: "video",
    name: "Video meetings",
    summary: "Meetings with screen sharing, from the same app as the phone.",
    replaces: "Replaces a separate meetings subscription.",
    billing: "Bought per seat, monthly.",
    featureKey: "video"
  }
];
const addOnState = (features, addOn) => {
  if (!features || typeof features !== "object") return "unknown";
  const node = features[addOn.featureKey];
  if (node === void 0 || node === null) return "not-included";
  if (typeof node === "boolean") return node ? "included" : "not-included";
  if (typeof node === "object") {
    const shown = node.IS_SHOW;
    if (shown === void 0) return "included";
    return shown ? "included" : "not-included";
  }
  return "unknown";
};
const STATE_LABEL = {
  included: "On your plan",
  "not-included": "Not on your plan",
  unknown: "Not available yet"
};
const countByState = (features, addOns = ADD_ONS) => {
  const counts = { included: 0, notIncluded: 0, unknown: 0 };
  addOns.forEach((addOn) => {
    const state = addOnState(features, addOn);
    if (state === "included") counts.included += 1;
    else if (state === "not-included") counts.notIncluded += 1;
    else counts.unknown += 1;
  });
  return counts;
};
const priceText = () => "Not available yet";
const canPurchaseHere = () => false;

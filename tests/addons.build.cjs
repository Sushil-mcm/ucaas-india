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

// src/lib/addons.ts
var addons_exports = {};
__export(addons_exports, {
  ADD_ONS: () => ADD_ONS,
  STATE_LABEL: () => STATE_LABEL,
  addOnState: () => addOnState,
  canPurchaseHere: () => canPurchaseHere,
  countByState: () => countByState,
  estimateMonthlyCost: () => estimateMonthlyCost,
  priceText: () => priceText
});
module.exports = __toCommonJS(addons_exports);

// src/lib/plan-catalogue.ts
var PLAN_ADD_ONS = [
  {
    id: "ai_voice_agent",
    name: "AI voice agent",
    summary: "An AI voice that answers and speaks to callers.",
    monthlyPrice: 45,
    per: "seat",
    included: { units: 100, unit: "minutes" },
    overageRate: 0.25,
    maps: {
      ai_call_free_minutes: "100",
      ai_call_rate: "0.25"
    },
    notes: [
      "Every minute costs real money to run - speech recognition, the model, and the voice - so the rate here is set to cover that rather than to look cheap."
    ]
  },
  {
    id: "ai_copilot",
    name: "AI copilot",
    summary: "Transcription, call summaries, sentiment and topic tracking.",
    monthlyPrice: 10,
    per: "seat",
    maps: {
      ai_message_free_reply: "see plan",
      ai_message_rate: "0.08"
    },
    notes: [
      "Transcripts and summaries are given away by most of the market, so this is priced for the analysis on top of them rather than for the transcript itself."
    ]
  },
  {
    id: "call_recording",
    name: "Call recording",
    summary: "Record calls and keep them.",
    monthlyPrice: 0,
    per: "seat",
    overageRate: 5e-3,
    maps: { per_gb_price: "storage beyond the plan allowance" },
    notes: ["Charged per minute recorded rather than as a monthly fee."]
  },
  {
    id: "spam_watch",
    name: "Spam monitoring",
    summary: "Watch whether your numbers get flagged as spam, and get them cleared.",
    monthlyPrice: 15,
    per: "number",
    maps: {}
  }
];

// src/lib/addons.ts
var CATALOGUE_AI_VOICE = PLAN_ADD_ONS.find((entry) => entry.id === "ai_voice_agent");
var estimateMonthlyCost = (addOn, used) => {
  if (addOn.monthlyPrice === void 0) return null;
  const base = addOn.monthlyPrice;
  const allowance = addOn.included ?? 0;
  const rate = addOn.overageRate ?? 0;
  const consumed = Number.isFinite(used) ? Math.max(0, used) : 0;
  const overUnits = Math.max(0, consumed - allowance);
  const overage = Math.round(overUnits * rate * 100) / 100;
  return { total: Math.round((base + overage) * 100) / 100, base, overage, overUnits };
};
var ADD_ONS = [
  {
    id: "international",
    name: "Global unlimited calling",
    summary: "8,000 international minutes a month, instead of paying for each one.",
    replaces: "Replaces per-minute charges for calls abroad, up to 8,000 minutes.",
    billing: "Bought per seat, monthly.",
    featureKey: "calling_rates",
    monthlyPrice: 20,
    included: 8e3,
    includedUnit: "minutes",
    overageRate: 0.02,
    detail: [
      "Calls abroad are charged per minute today. This turns that into one predictable monthly figure.",
      "Past 8,000 minutes, calls carry on at your usual per-country rate rather than being blocked.",
      "Unused minutes do not carry over to the following month."
    ]
  },
  {
    id: "numbers",
    name: "Extra and toll-free numbers",
    summary: "More numbers than your plan includes, including toll-free ones.",
    replaces: "Replaces buying numbers one at a time as you need them.",
    billing: "Bought per number, monthly.",
    featureKey: "virtual_numbers"
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
    id: "ai_voice",
    name: "AI voice",
    /* The allowance is written into the sentence from the catalogue, not
       alongside it. This card used to promise 50 minutes in its summary and
       charge for anything past 100 two lines further down - the same card
       disagreeing with itself about what somebody had bought. */
    summary: `${(CATALOGUE_AI_VOICE?.included?.units ?? 0).toLocaleString()} minutes a month of an AI voice answering and speaking to callers.`,
    replaces: "Replaces somebody having to pick up simply to find out what a caller wants.",
    billing: "Bought per seat, monthly.",
    /* No featureKey on purpose. This is bought separately from AI assistance and
       the platform reports no flag of its own for it, so the card says it cannot
       tell rather than borrowing the AI flag and claiming you have it. */
    monthlyPrice: CATALOGUE_AI_VOICE?.monthlyPrice,
    included: CATALOGUE_AI_VOICE?.included?.units,
    includedUnit: CATALOGUE_AI_VOICE?.included?.unit,
    overageRate: CATALOGUE_AI_VOICE?.overageRate,
    detail: [
      "Past the included minutes it keeps working, and each further minute is charged at the rate shown above.",
      "Every minute costs real money to run - speech recognition, the model and the voice - so the rate covers that rather than being set to look cheap."
    ]
  },
  {
    id: "quality",
    name: "Quality scoring and coaching",
    summary: "Score calls automatically, measure how satisfied callers were, and prompt agents while they talk.",
    replaces: "Replaces listening back to calls one at a time to mark them.",
    billing: "Bought per seat, monthly, for the people being scored.",
    featureKey: "monitoring_features",
    detail: [
      "Calls are scored against your own checklist rather than a supervisor working through recordings.",
      "Caller satisfaction is worked out from the conversation, so you hear about a bad call without waiting for a survey."
    ]
  },
  {
    id: "monitoring",
    name: "Live monitoring",
    summary: "Listen to a live call, whisper to the agent, or join it.",
    replaces: "Replaces sitting next to somebody to train them.",
    billing: "Bought per seat, monthly, for the people who supervise.",
    featureKey: "monitoring"
  },
  {
    id: "contact_centre",
    name: "Advanced call handling",
    summary: "Route by skill, offer callers a call back instead of holding, and give agents time to write up.",
    replaces: "Replaces a single queue that rings everybody the same way.",
    billing: "Bought per seat, monthly, for the people answering.",
    featureKey: "advance_call_management",
    detail: [
      "Skills routing sends a caller to somebody who can actually help rather than whoever is free.",
      "A call back means somebody keeps their place in the queue without holding the line.",
      "Wrap-up time keeps the next call away until the last one is written up."
    ]
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
    id: "reports",
    name: "Advanced reporting",
    summary: "Deeper reporting on calls, queues and people than the standard screens.",
    replaces: "Replaces exporting call logs and building the report yourself.",
    billing: "Bought per company, monthly.",
    featureKey: "reports"
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
    id: "fax",
    name: "Internet fax",
    summary: "Send and receive faxes without a fax machine or a separate line.",
    replaces: "Replaces a physical fax line.",
    billing: "Bought per number, monthly.",
    featureKey: "messages"
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
var addOnState = (features, addOn) => {
  if (!addOn.featureKey) return "unknown";
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
var STATE_LABEL = {
  included: "On your plan",
  "not-included": "Not on your plan",
  unknown: "Not available yet"
};
var countByState = (features, addOns = ADD_ONS) => {
  const counts = { included: 0, notIncluded: 0, unknown: 0 };
  addOns.forEach((addOn) => {
    const state = addOnState(features, addOn);
    if (state === "included") counts.included += 1;
    else if (state === "not-included") counts.notIncluded += 1;
    else counts.unknown += 1;
  });
  return counts;
};
var priceText = () => "Not available yet";
var canPurchaseHere = () => false;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ADD_ONS,
  STATE_LABEL,
  addOnState,
  canPurchaseHere,
  countByState,
  estimateMonthlyCost,
  priceText
});

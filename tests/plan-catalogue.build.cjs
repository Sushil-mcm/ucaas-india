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
var plan_catalogue_exports = {};
__export(plan_catalogue_exports, {
  PLANS: () => PLANS,
  PLAN_ADD_ONS: () => PLAN_ADD_ONS,
  UNLIMITED: () => UNLIMITED,
  UNLIMITED_STORED_THRESHOLD: () => UNLIMITED_STORED_THRESHOLD,
  allowanceLeft: () => allowanceLeft,
  describeAllowance: () => describeAllowance,
  describeStoredAllowance: () => describeStoredAllowance,
  isUnlimited: () => isUnlimited,
  monthlyCostForSeat: () => monthlyCostForSeat,
  ratesForPlan: () => ratesForPlan,
  storedAllowanceIsUnlimited: () => storedAllowanceIsUnlimited
});
module.exports = __toCommonJS(plan_catalogue_exports);
const UNLIMITED = "unlimited";
const isUnlimited = (allowance) => allowance === UNLIMITED;
const allowanceLeft = (allowance, used) => {
  if (isUnlimited(allowance)) return UNLIMITED;
  const total = Number(allowance) || 0;
  const spent = Number(used) || 0;
  return Math.max(0, total - spent);
};
const describeAllowance = (allowance, unit) => isUnlimited(allowance) ? `Unlimited ${unit}` : `${Number(allowance).toLocaleString()} ${unit}`;
const PLANS = [
  {
    id: "basic",
    name: "Basic",
    monthlyPerSeat: 0,
    summary: "Pay only for the numbers you keep. No monthly seat charge.",
    includes: { domesticMinutes: 0, sms: 0, numbers: 0 },
    overage: { domesticMinuteRate: 0.02, smsRate: 0.04 },
    maps: {
      cost: "0",
      free_calls: "0",
      free_sms: "0",
      outbound_ratecard_uuid: "standard outbound card",
      sms_rate_card_uuid: "standard SMS card"
    },
    notes: [
      "Costs nothing to hold, so somebody can try the product before committing.",
      "Every minute and text is charged from the first one."
    ]
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPerSeat: 18,
    summary: "1,000 domestic minutes and 100 texts a month, per seat.",
    includes: { domesticMinutes: 1e3, sms: 100, numbers: 1 },
    overage: { domesticMinuteRate: 0.02, smsRate: 0.04 },
    maps: {
      cost: "18",
      free_calls: "1000",
      free_sms: "100",
      did_count: "1"
    }
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPerSeat: 30,
    summary: "Unlimited domestic calling and 500 texts a month, per seat.",
    includes: { domesticMinutes: UNLIMITED, sms: 500, numbers: 1 },
    /* No minute rate: domestic calling cannot run out on this plan. */
    overage: { smsRate: 0.04 },
    maps: {
      cost: "30",
      free_calls: "unlimited - see note",
      free_sms: "500",
      did_count: "1"
    },
    notes: [
      "The platform stores allowances as numbers, so unlimited needs a deliberate representation on the plan record rather than a very large figure."
    ]
  },
  {
    id: "ultimate",
    name: "Ultimate",
    monthlyPerSeat: 42,
    summary: "Unlimited domestic calling and 1,000 texts a month, per seat.",
    includes: { domesticMinutes: UNLIMITED, sms: 1e3, numbers: 1 },
    overage: { smsRate: 0.04 },
    maps: {
      cost: "42",
      free_calls: "unlimited - see note",
      free_sms: "1000",
      did_count: "1"
    }
  }
];
const PLAN_ADD_ONS = [
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
const monthlyCostForSeat = (planId, addOnIds = []) => {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  const addOns = (addOnIds ?? []).map((id) => PLAN_ADD_ONS.find((a) => a.id === id)).filter((a) => Boolean(a) && a.per === "seat").reduce((sum, a) => sum + a.monthlyPrice, 0);
  return {
    plan: plan.monthlyPerSeat,
    addOns: Math.round(addOns * 100) / 100,
    total: Math.round((plan.monthlyPerSeat + addOns) * 100) / 100
  };
};
const ratesForPlan = (planName) => {
  const wanted = String(planName ?? "").trim().toLowerCase();
  if (!wanted) return null;
  const plan = PLANS.find(
    (p) => p.name.toLowerCase() === wanted || p.id.toLowerCase() === wanted
  );
  if (!plan) return null;
  return {
    planId: plan.id,
    domesticMinuteRate: plan.overage?.domesticMinuteRate,
    smsRate: plan.overage?.smsRate
  };
};
const UNLIMITED_STORED_THRESHOLD = 999999999;
const storedAllowanceIsUnlimited = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= UNLIMITED_STORED_THRESHOLD;
};
const describeStoredAllowance = (value, unit) => {
  if (value === null || value === void 0 || value === "") return "Not available yet";
  if (storedAllowanceIsUnlimited(value)) return `Unlimited ${unit}`;
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString()} ${unit}` : "Not available yet";
};

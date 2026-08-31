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

// src/lib/plan-catalogue.ts
var plan_catalogue_exports = {};
__export(plan_catalogue_exports, {
  PLANS: () => PLANS,
  PLAN_ADD_ONS: () => PLAN_ADD_ONS,
  UNLIMITED: () => UNLIMITED,
  UNLIMITED_STORED_THRESHOLD: () => UNLIMITED_STORED_THRESHOLD,
  allowanceLeft: () => allowanceLeft,
  describeAllowance: () => describeAllowance,
  describeIncludedAllowance: () => describeIncludedAllowance,
  describeStoredAllowance: () => describeStoredAllowance,
  isUnlimited: () => isUnlimited,
  monthlyCostForSeat: () => monthlyCostForSeat,
  planByName: () => planByName,
  ratesForPlan: () => ratesForPlan,
  storedAllowanceIsUnlimited: () => storedAllowanceIsUnlimited,
  yearlySavingPercent: () => yearlySavingPercent
});
module.exports = __toCommonJS(plan_catalogue_exports);
var UNLIMITED = "unlimited";
var isUnlimited = (allowance) => allowance === UNLIMITED;
var allowanceLeft = (allowance, used) => {
  if (isUnlimited(allowance)) return UNLIMITED;
  const total = Number(allowance) || 0;
  const spent = Number(used) || 0;
  return Math.max(0, total - spent);
};
var describeAllowance = (allowance, unit) => isUnlimited(allowance) ? `Unlimited ${unit}` : `${Number(allowance).toLocaleString()} ${unit}`;
var describeIncludedAllowance = (allowance, unit) => {
  if (isUnlimited(allowance)) return `Unlimited ${unit}`;
  return Number(allowance) === 0 ? "Pay as you go" : `${Number(allowance).toLocaleString()} ${unit}`;
};
var PLANS = [
  {
    id: "basic",
    name: "Basic",
    monthlyPerSeat: 0,
    yearlyPerSeat: null,
    summary: "No monthly fee. You pay for the numbers you keep and the calls you make.",
    /* Nothing is included, which is the point of this plan - it is not an
       allowance of zero that ran out, it is pay-as-you-go from the first
       minute. The screens say so in words rather than printing "0 minutes",
       which reads like something went wrong. */
    includes: { domesticMinutes: 0, sms: 0, numbers: 0 },
    overage: { domesticMinuteRate: 0.02, smsRate: 0.04 },
    maps: {
      cost: "0 monthly",
      free_calls: "0",
      free_sms: "0",
      did_count: "0"
    },
    notes: [
      "There is no seat charge, so a number costs the same whether one person uses it or nobody does."
    ]
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPerSeat: 18,
    yearlyPerSeat: null,
    summary: "1,000 domestic minutes and 100 texts a month, per seat.",
    includes: { domesticMinutes: 1e3, sms: 100, numbers: 1 },
    overage: { domesticMinuteRate: 0.02, smsRate: 0.04 },
    maps: {
      cost: "18 monthly, 162 yearly",
      free_calls: "1000",
      free_sms: "100",
      did_count: "1"
    }
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPerSeat: 30,
    yearlyPerSeat: null,
    summary: "Unlimited domestic calling and 500 texts a month, per seat.",
    includes: { domesticMinutes: UNLIMITED, sms: 500, numbers: 1 },
    /* No minute rate: domestic calling cannot run out on this plan. */
    overage: { smsRate: 0.04 },
    maps: {
      cost: "30 monthly, 270 yearly",
      free_calls: "999999999 - the stored form of unlimited",
      free_sms: "500",
      did_count: "1"
    }
  },
  {
    id: "ultimate",
    name: "Ultimate",
    monthlyPerSeat: 42,
    yearlyPerSeat: null,
    summary: "Unlimited domestic calling and 1,000 texts a month, per seat.",
    includes: { domesticMinutes: UNLIMITED, sms: 1e3, numbers: 1 },
    overage: { smsRate: 0.04 },
    maps: {
      cost: "42 monthly, 378 yearly",
      free_calls: "999999999 - the stored form of unlimited",
      free_sms: "1000",
      did_count: "1"
    }
  }
];
var planByName = (planName) => {
  const wanted = String(planName ?? "").trim().toLowerCase();
  if (!wanted) return null;
  return PLANS.find((p) => p.name.toLowerCase() === wanted || p.id.toLowerCase() === wanted) ?? null;
};
var yearlySavingPercent = (plan) => {
  const yearly = plan.yearlyPerSeat;
  if (yearly === null || yearly === void 0) return null;
  const twelve = plan.monthlyPerSeat * 12;
  if (!(twelve > 0) || !(yearly > 0) || yearly >= twelve) return null;
  return Math.round((twelve - yearly) / twelve * 100);
};
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
var monthlyCostForSeat = (planId, addOnIds = []) => {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  const addOns = (addOnIds ?? []).map((id) => PLAN_ADD_ONS.find((a) => a.id === id)).filter((a) => Boolean(a) && a.per === "seat").reduce((sum, a) => sum + a.monthlyPrice, 0);
  return {
    plan: plan.monthlyPerSeat,
    addOns: Math.round(addOns * 100) / 100,
    total: Math.round((plan.monthlyPerSeat + addOns) * 100) / 100
  };
};
var ratesForPlan = (planName) => {
  const plan = planByName(planName);
  if (!plan) return null;
  return {
    planId: plan.id,
    domesticMinuteRate: plan.overage?.domesticMinuteRate,
    smsRate: plan.overage?.smsRate
  };
};
var UNLIMITED_STORED_THRESHOLD = 999999999;
var storedAllowanceIsUnlimited = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= UNLIMITED_STORED_THRESHOLD;
};
var describeStoredAllowance = (value, unit) => {
  if (value === null || value === void 0 || value === "") return "Not available yet";
  if (storedAllowanceIsUnlimited(value)) return `Unlimited ${unit}`;
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString()} ${unit}` : "Not available yet";
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PLANS,
  PLAN_ADD_ONS,
  UNLIMITED,
  UNLIMITED_STORED_THRESHOLD,
  allowanceLeft,
  describeAllowance,
  describeIncludedAllowance,
  describeStoredAllowance,
  isUnlimited,
  monthlyCostForSeat,
  planByName,
  ratesForPlan,
  storedAllowanceIsUnlimited,
  yearlySavingPercent
});

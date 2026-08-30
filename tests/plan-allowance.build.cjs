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
var plan_allowance_exports = {};
__export(plan_allowance_exports, {
  canStart: () => canStart,
  chargeFor: () => chargeFor,
  periodTotal: () => periodTotal
});
module.exports = __toCommonJS(plan_allowance_exports);
const money = (value) => Math.round(value * 100) / 100;
const clean = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const chargeFor = (plan, units, wallet) => {
  const wantedUnits = clean(units);
  if (plan?.included === "unlimited") {
    return {
      fromAllowance: wantedUnits,
      charged: 0,
      cost: 0,
      affordable: true,
      shortfall: 0,
      allowanceLeft: Infinity,
      message: `Included \u2014 your plan has unlimited ${plan?.unit || "units"}.`
    };
  }
  const included = clean(plan?.included);
  const alreadyUsed = clean(plan?.used);
  const rate = clean(plan?.rate);
  const balance = clean(wallet?.balance);
  const wanted = clean(units);
  const remainingAllowance = Math.max(0, included - alreadyUsed);
  const fromAllowance = Math.min(wanted, remainingAllowance);
  const charged = Math.max(0, wanted - fromAllowance);
  const cost = money(charged * rate);
  const affordable = cost <= balance;
  const shortfall = affordable ? 0 : money(cost - balance);
  const unit = plan?.unit || "units";
  let message;
  if (charged === 0) {
    message = `Covered by your plan. ${money(remainingAllowance - fromAllowance)} ${unit} left this month.`;
  } else if (fromAllowance > 0) {
    message = `${fromAllowance} ${unit} covered by your plan, then ${charged} charged at ${rate.toFixed(2)} each \u2014 $${cost.toFixed(2)} from your balance.`;
  } else if (affordable) {
    message = `Your plan's allowance is used up, so this is charged at ${rate.toFixed(2)} per ${unit.replace(/s$/, "")} \u2014 $${cost.toFixed(2)} from your balance.`;
  } else {
    message = `Your allowance is used up and your balance is $${balance.toFixed(2)}, which is $${shortfall.toFixed(2)} short of the $${cost.toFixed(2)} this would cost.`;
  }
  return {
    fromAllowance,
    charged,
    cost,
    affordable,
    shortfall,
    allowanceLeft: Math.max(0, remainingAllowance - fromAllowance),
    message
  };
};
const canStart = (plan, wallet) => {
  if (plan?.included === "unlimited") {
    return {
      decision: "included",
      reason: `Your plan includes unlimited ${plan?.unit || "units"}.`
    };
  }
  const included = clean(plan?.included);
  const used = clean(plan?.used);
  const rate = clean(plan?.rate);
  const balance = clean(wallet?.balance);
  const remaining = Math.max(0, included - used);
  if (remaining > 0) {
    return {
      decision: "included",
      reason: `${remaining} ${plan?.unit || "units"} left on your plan this month.`
    };
  }
  if (rate === 0) {
    return {
      decision: "charged",
      reason: "Your plan allowance is used up. No rate is set for this, so nothing is being charged."
    };
  }
  if (balance >= rate) {
    return {
      decision: "charged",
      reason: `Your plan allowance is used up. This is charged at ${rate.toFixed(2)} per ${(plan?.unit || "unit").replace(/s$/, "")} from your balance.`
    };
  }
  return {
    decision: "refused",
    reason: `Your plan allowance is used up and your balance of $${balance.toFixed(2)} does not cover ${rate.toFixed(2)} for the next ${(plan?.unit || "unit").replace(/s$/, "")}. Top up to carry on.`
  };
};
const periodTotal = (lines) => {
  let total = 0;
  let counted = 0;
  const uncounted = [];
  (lines ?? []).forEach(({ plan, units, wallet }) => {
    if (units === void 0 || units === null || !Number.isFinite(Number(units))) {
      uncounted.push(plan.service);
      return;
    }
    total += chargeFor(plan, Number(units), wallet).cost;
    counted += 1;
  });
  return { total: money(total), counted, uncounted };
};

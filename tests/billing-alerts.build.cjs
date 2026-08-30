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

// src/lib/billing-alerts.ts
var billing_alerts_exports = {};
__export(billing_alerts_exports, {
  billingAlert: () => billingAlert,
  isBalanceLow: () => isBalanceLow
});
module.exports = __toCommonJS(billing_alerts_exports);

// src/lib/billing-money.ts
var knownNumber = (value) => {
  if (value === null || value === void 0 || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};
var MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var formatBillingDate = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${day} ${MONTHS[month - 1]} ${year}`;
};
var daysBetween = (fromISO, toISO) => {
  const parse = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s ?? "").trim());
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  const a = parse(fromISO);
  const b = parse(toISO);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 864e5);
};
var cardExpiresSoon = (expMonth, expYear, todayISO, withinDays = 30) => {
  const m = knownNumber(expMonth);
  const y = knownNumber(expYear);
  if (m === null || y === null || m < 1 || m > 12) return null;
  if (typeof todayISO !== "string") return null;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const expiryISO = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const gap = daysBetween(todayISO, expiryISO);
  if (gap === null) return null;
  return gap <= withinDays;
};

// src/lib/billing-alerts.ts
var SUSPENDED_STATES = ["S", "SUSPENDED", "D", "DISABLED"];
var EXPIRED_STATES = ["E", "EXPIRED"];
var CREDIT_PATH = "/admin-settings/billing/purchase";
var PLAN_PATH = "/admin-settings/billing/plan";
var upper = (v) => String(v ?? "").trim().toUpperCase();
var cardExpiresSoonByDate = (targetISO, todayISO, withinDays) => {
  const parse = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s ?? "").trim());
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  const a = parse(todayISO);
  const b = parse(targetISO);
  if (a === null || b === null) return false;
  const days = Math.round((b - a) / 864e5);
  return days <= withinDays;
};
var billingAlert = (snapshot) => {
  const status = upper(snapshot.planStatus);
  if (SUSPENDED_STATES.includes(status)) {
    return {
      tone: "danger",
      title: "This account is suspended",
      detail: "Calls are not connecting and numbers cannot be used while the account is suspended. Renewing the plan restores service.",
      actionLabel: "Renew plan",
      actionHref: PLAN_PATH
    };
  }
  if (EXPIRED_STATES.includes(status)) {
    return {
      tone: "danger",
      title: "The plan has expired",
      detail: "Calls are not connecting on an expired plan. Renewing puts the same numbers and settings straight back into service \u2014 nothing has been deleted.",
      actionLabel: "Renew plan",
      actionHref: PLAN_PATH
    };
  }
  if (upper(snapshot.lastPaymentStatus) === "FAILED") {
    return {
      tone: "warning",
      title: "The last payment did not go through",
      detail: "Calls are still connecting, but new numbers cannot be purchased until payment is updated. Adding a working card and retrying clears it.",
      actionLabel: "Update payment method",
      actionHref: CREDIT_PATH
    };
  }
  if (snapshot.hasPaymentMethod === false) {
    return {
      tone: "warning",
      title: "No payment method saved",
      detail: "Everything works today, but the next bill has nothing to charge and the account will go on hold when it is due. Saving a card now avoids that.",
      actionLabel: "Add a card",
      actionHref: CREDIT_PATH
    };
  }
  if (cardExpiresSoon(snapshot.cardExpMonth, snapshot.cardExpYear, snapshot.todayISO) === true) {
    return {
      tone: "warning",
      title: "The saved card is about to expire",
      detail: "Calls are still connecting. If the card expires before the next bill the payment will fail and the account will go on hold, so it is worth replacing now.",
      actionLabel: "Replace card",
      actionHref: CREDIT_PATH
    };
  }
  if (upper(snapshot.isTrial) === "Y" || snapshot.isTrial === true) {
    const expiry = snapshot.planExpiryISO;
    const soon = typeof expiry === "string" && cardExpiresSoonByDate(expiry, snapshot.todayISO, 7);
    if (soon) {
      const when = formatBillingDate(expiry);
      return {
        tone: "warning",
        title: "The trial ends soon",
        detail: `Calls stop connecting when the trial ends${when ? ` on ${when}` : ""}. Choosing a plan before then keeps the same numbers and settings.`,
        actionLabel: "Choose a plan",
        actionHref: PLAN_PATH
      };
    }
  }
  return null;
};
var isBalanceLow = (balance, threshold = 10) => {
  if (balance === null || balance === void 0 || balance === "") return null;
  const n = Number(balance);
  const limit = Number(threshold);
  if (!Number.isFinite(n) || !Number.isFinite(limit)) return null;
  return n <= limit;
};

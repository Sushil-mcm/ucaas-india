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

// src/lib/billing-money.ts
var billing_money_exports = {};
__export(billing_money_exports, {
  BILLING_CURRENCY: () => BILLING_CURRENCY,
  DAYS_PER_BILLING_MONTH: () => DAYS_PER_BILLING_MONTH,
  MINIMUM_CHARGE: () => MINIMUM_CHARGE,
  UNAVAILABLE: () => UNAVAILABLE,
  cardExpiresSoon: () => cardExpiresSoon,
  dateOrUnavailable: () => dateOrUnavailable,
  formatBillingDate: () => formatBillingDate,
  formatMoney: () => formatMoney,
  knownNumber: () => knownNumber,
  licenceQuote: () => licenceQuote,
  moneyOrUnavailable: () => moneyOrUnavailable,
  planDays: () => planDays,
  prorate: () => prorate,
  remainingDays: () => remainingDays,
  roundMoney: () => roundMoney
});
module.exports = __toCommonJS(billing_money_exports);
var BILLING_CURRENCY = "USD";
var CURRENCY_SYMBOL = "$";
var DAYS_PER_BILLING_MONTH = 30;
var MINIMUM_CHARGE = 0.51;
var knownNumber = (value) => {
  if (value === null || value === void 0 || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};
var roundMoney = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;
var formatMoney = (value) => {
  const n = knownNumber(value);
  if (n === null) return null;
  const rounded = roundMoney(n);
  const negative = rounded < 0;
  const body = Math.abs(rounded).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${negative ? "-" : ""}${CURRENCY_SYMBOL}${body}`;
};
var UNAVAILABLE = "Not available yet";
var moneyOrUnavailable = (value) => formatMoney(value) ?? UNAVAILABLE;
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
var dateOrUnavailable = (value) => formatBillingDate(value) ?? UNAVAILABLE;
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
var planDays = (planDurationMonths) => {
  const months = knownNumber(planDurationMonths);
  if (months === null || months <= 0) return null;
  return Math.round(months) * DAYS_PER_BILLING_MONTH;
};
var remainingDays = (planExpiryISO, todayISO) => {
  if (typeof planExpiryISO !== "string" || typeof todayISO !== "string") return null;
  const gap = daysBetween(todayISO, planExpiryISO);
  if (gap === null) return null;
  if (gap <= 0) return 0;
  const parse = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  };
  const start = parse(todayISO);
  const end = parse(planExpiryISO);
  let fullMonths = (end.y - start.y) * 12 + (end.m - start.m);
  if (end.d < start.d) fullMonths -= 1;
  if (fullMonths < 0) fullMonths = 0;
  const shifted = new Date(Date.UTC(start.y, start.m - 1 + fullMonths, 1));
  const shiftedYear = shifted.getUTCFullYear();
  const shiftedMonth = shifted.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(shiftedYear, shiftedMonth, 0)).getUTCDate();
  const shiftedDay = Math.min(start.d, lastDay);
  const leftover = daysBetween(
    `${shiftedYear}-${String(shiftedMonth).padStart(2, "0")}-${String(shiftedDay).padStart(2, "0")}`,
    planExpiryISO
  );
  if (leftover === null) return null;
  const total = fullMonths * DAYS_PER_BILLING_MONTH + leftover;
  return total > 0 ? total : 1;
};
var prorate = (fullCycleCost, cycleDays, daysLeft) => {
  const cost = knownNumber(fullCycleCost);
  const days = knownNumber(cycleDays);
  const left = knownNumber(daysLeft);
  if (cost === null || days === null || left === null) return null;
  if (days <= 0) return null;
  if (left <= 0) return 0;
  const amount = roundMoney(cost / days * left);
  if (amount > 0 && amount < MINIMUM_CHARGE) return MINIMUM_CHARGE;
  return amount;
};
var licenceQuote = (input) => {
  const perLicence = knownNumber(input.costPerLicencePerCycle);
  const count = knownNumber(input.licences);
  const cycleDays = planDays(input.planDurationMonths);
  const left = remainingDays(input.planExpiryISO, input.todayISO);
  if (perLicence === null || count === null || cycleDays === null || left === null) return null;
  if (count <= 0) return null;
  const fullCycle = roundMoney(perLicence * count);
  const chargedToday = prorate(fullCycle, cycleDays, left);
  if (chargedToday === null) return null;
  const nextBill = typeof input.nextBillDateISO === "string" && input.nextBillDateISO ? input.nextBillDateISO : typeof input.planExpiryISO === "string" ? input.planExpiryISO : null;
  return {
    chargedToday,
    monthlyFromNextBill: fullCycle,
    daysCovered: left,
    nextBillDate: nextBill
  };
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BILLING_CURRENCY,
  DAYS_PER_BILLING_MONTH,
  MINIMUM_CHARGE,
  UNAVAILABLE,
  cardExpiresSoon,
  dateOrUnavailable,
  formatBillingDate,
  formatMoney,
  knownNumber,
  licenceQuote,
  moneyOrUnavailable,
  planDays,
  prorate,
  remainingDays,
  roundMoney
});

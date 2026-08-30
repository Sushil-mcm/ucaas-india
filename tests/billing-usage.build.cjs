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

// src/lib/billing-usage.ts
var billing_usage_exports = {};
__export(billing_usage_exports, {
  WARNING_AT_PERCENT: () => WARNING_AT_PERCENT,
  hasAnyUsage: () => hasAnyUsage,
  isFullyIncluded: () => isFullyIncluded,
  isUnlimitedAllowance: () => isUnlimitedAllowance,
  makeUsageRow: () => makeUsageRow,
  overageCost: () => overageCost,
  overageUnits: () => overageUnits,
  percentUsed: () => percentUsed,
  sortUsageRows: () => sortUsageRows,
  unavailableCount: () => unavailableCount,
  usageBand: () => usageBand
});
module.exports = __toCommonJS(billing_usage_exports);

// src/lib/billing-money.ts
var knownNumber = (value) => {
  if (value === null || value === void 0 || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};
var roundMoney = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

// src/lib/plan-catalogue.ts
var UNLIMITED_STORED_THRESHOLD = 999999999;
var storedAllowanceIsUnlimited = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= UNLIMITED_STORED_THRESHOLD;
};

// src/lib/billing-usage.ts
var WARNING_AT_PERCENT = 80;
var percentUsed = (included, used) => {
  const inc = knownNumber(included);
  const use = knownNumber(used);
  if (inc === null || use === null || inc <= 0) return null;
  if (storedAllowanceIsUnlimited(inc)) return null;
  return Math.round(use / inc * 100);
};
var isUnlimitedAllowance = (included) => {
  const inc = knownNumber(included);
  return inc !== null && storedAllowanceIsUnlimited(inc);
};
var usageBand = (included, used) => {
  const pct = percentUsed(included, used);
  if (pct === null) return null;
  if (pct >= 100) return "over";
  if (pct >= WARNING_AT_PERCENT) return "warning";
  return "ok";
};
var overageUnits = (included, used) => {
  const inc = knownNumber(included);
  const use = knownNumber(used);
  if (inc === null || use === null) return null;
  if (storedAllowanceIsUnlimited(inc)) return 0;
  return Math.max(0, use - inc);
};
var overageCost = (included, used, ratePerUnit) => {
  const over = overageUnits(included, used);
  const rate = knownNumber(ratePerUnit);
  if (over === null || rate === null) return null;
  return roundMoney(over * rate);
};
var isFullyIncluded = (row) => row.over !== null && row.over === 0;
var makeUsageRow = (input) => {
  const included = knownNumber(input.included);
  const used = knownNumber(input.used);
  const rate = knownNumber(input.rate);
  return {
    service: input.service,
    unit: input.unit,
    included,
    used,
    over: overageUnits(included, used),
    rate,
    cost: overageCost(included, used, rate),
    note: input.note
  };
};
var sortUsageRows = (rows) => [...rows].sort((a, b) => {
  const rank = (r) => {
    if (r.cost !== null && r.cost > 0) return 0;
    if (r.over !== null && r.over > 0) return 1;
    if (r.used !== null) return 2;
    return 3;
  };
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return (b.cost ?? 0) - (a.cost ?? 0);
  if (ra === 1) return (b.over ?? 0) - (a.over ?? 0);
  if (ra === 2) return (percentUsed(b.included, b.used) ?? -1) - (percentUsed(a.included, a.used) ?? -1);
  return a.service.localeCompare(b.service);
});
var hasAnyUsage = (rows) => rows.some((r) => r.used !== null || r.included !== null);
var unavailableCount = (rows) => rows.filter((r) => r.used === null).length;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WARNING_AT_PERCENT,
  hasAnyUsage,
  isFullyIncluded,
  isUnlimitedAllowance,
  makeUsageRow,
  overageCost,
  overageUnits,
  percentUsed,
  sortUsageRows,
  unavailableCount,
  usageBand
});

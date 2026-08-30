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

// src/lib/allowance-meter.ts
var allowance_meter_exports = {};
__export(allowance_meter_exports, {
  RUNNING_LOW_PERCENT: () => RUNNING_LOW_PERCENT,
  allowanceMeter: () => allowanceMeter,
  isRunningLow: () => isRunningLow
});
module.exports = __toCommonJS(allowance_meter_exports);

// src/lib/billing-money.ts
var knownNumber = (value) => {
  if (value === null || value === void 0 || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};
var UNAVAILABLE = "Not available yet";

// src/lib/plan-catalogue.ts
var UNLIMITED_STORED_THRESHOLD = 999999999;
var storedAllowanceIsUnlimited = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= UNLIMITED_STORED_THRESHOLD;
};

// src/lib/allowance-meter.ts
var RUNNING_LOW_PERCENT = 80;
var withUnit = (value, unit) => unit ? `${value.toLocaleString()} ${unit}` : value.toLocaleString();
var allowanceMeter = (included, used, unit) => {
  const inc = knownNumber(included);
  const use = knownNumber(used);
  const usedText = use === null ? UNAVAILABLE : withUnit(use, unit);
  if (inc === null) {
    return {
      kind: "unknown",
      includedText: UNAVAILABLE,
      usedText,
      leftText: UNAVAILABLE,
      percent: null,
      over: false
    };
  }
  if (storedAllowanceIsUnlimited(inc)) {
    return {
      kind: "unlimited",
      includedText: `Unlimited ${unit}`.trim(),
      usedText,
      /* "No limit" rather than a number: subtracting from unlimited gives a
         figure that is arithmetically true and completely meaningless. */
      leftText: "No limit",
      percent: null,
      over: false
    };
  }
  if (inc <= 0) {
    return {
      kind: "none",
      includedText: "None included",
      usedText,
      leftText: "None included",
      percent: null,
      over: false
    };
  }
  if (use === null) {
    return {
      kind: "metered",
      includedText: withUnit(inc, unit),
      usedText,
      leftText: UNAVAILABLE,
      percent: null,
      over: false
    };
  }
  const left = Math.max(0, inc - use);
  return {
    kind: "metered",
    includedText: withUnit(inc, unit),
    usedText,
    leftText: withUnit(left, unit),
    percent: Math.max(0, Math.round(use / inc * 100)),
    over: use > inc
  };
};
var isRunningLow = (meter) => meter.percent !== null && meter.percent >= RUNNING_LOW_PERCENT;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RUNNING_LOW_PERCENT,
  allowanceMeter,
  isRunningLow
});

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

// src/lib/spend-breakdown.ts
var spend_breakdown_exports = {};
__export(spend_breakdown_exports, {
  chargeOf: () => chargeOf,
  destinationOf: () => destinationOf,
  directionOf: () => directionOf,
  isBreakdownComplete: () => isBreakdownComplete,
  onlyCharged: () => onlyCharged,
  readDuration: () => readDuration,
  readTotals: () => readTotals,
  secondsOf: () => secondsOf,
  shareOf: () => shareOf,
  spendByDestination: () => spendByDestination,
  spendByDirection: () => spendByDirection,
  spendByPerson: () => spendByPerson,
  topN: () => topN
});
module.exports = __toCommonJS(spend_breakdown_exports);
var import_libphonenumber_js = require("libphonenumber-js");
var money = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
var chargeOf = (row) => money(row?.chargeTotal ?? row?.charge);
var secondsOf = (row) => money(row?.billsectotal);
var directionOf = (row) => {
  const d = String(row?.direction ?? "").toLowerCase();
  if (d === "outbound") return "Outbound";
  if (d === "inbound" || d === "missed" || d === "voicemail") return "Inbound";
  return "Other";
};
var destinationOf = (row) => {
  const raw = String(row?.destination_number ?? "").trim();
  if (!raw) return { key: "unknown", label: "Not recorded" };
  if (!raw.startsWith("+") && raw.replace(/\D/g, "").length <= 6) {
    return { key: "internal", label: "Internal" };
  }
  const parsed = (0, import_libphonenumber_js.parsePhoneNumberFromString)(raw.startsWith("+") ? raw : `+${raw}`);
  if (parsed?.country) {
    return { key: parsed.country, label: parsed.country };
  }
  if (parsed?.countryCallingCode) {
    return { key: `+${parsed.countryCallingCode}`, label: `+${parsed.countryCallingCode}` };
  }
  return { key: "unknown", label: "Not recorded" };
};
var groupBy = (rows, pick) => {
  const totals = /* @__PURE__ */ new Map();
  (rows ?? []).forEach((row) => {
    const at = pick(row);
    if (!at) return;
    const current = totals.get(at.key) ?? {
      key: at.key,
      label: at.label,
      amount: 0,
      calls: 0,
      seconds: 0
    };
    current.amount += chargeOf(row);
    current.calls += 1;
    current.seconds += secondsOf(row);
    totals.set(at.key, current);
  });
  return [...totals.values()].sort((a, b) => b.amount - a.amount || b.calls - a.calls);
};
var spendByPerson = (rows) => groupBy(rows, (row) => {
  const ext = String(row?.extension ?? "").trim();
  if (!ext) return null;
  const name = String(row?.contact_name ?? "").trim();
  return { key: ext, label: name ? `${name} (${ext})` : `Extension ${ext}` };
});
var spendByDestination = (rows) => groupBy(rows, destinationOf);
var spendByDirection = (rows) => groupBy(rows, (row) => {
  const d = directionOf(row);
  return { key: d, label: d === "Other" ? "Internal" : d };
});
var onlyCharged = (groups) => groups.filter((g) => g.amount > 0);
var topN = (groups, n) => groups.slice(0, Math.max(0, n));
var shareOf = (amount, total) => {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.round(money(amount) / total * 100);
};
var readTotals = (callStats) => ({
  amount: money(callStats?.total_charge),
  calls: money(callStats?.total_calls),
  seconds: money(callStats?.total_duration),
  outboundCalls: money(callStats?.outbound_calls),
  inboundCalls: money(callStats?.inbound_calls)
});
var isBreakdownComplete = (rowsRead, totals) => !Number.isFinite(totals.calls) || totals.calls <= 0 || rowsRead >= totals.calls;
var readDuration = (seconds) => {
  const s = Math.max(0, Math.round(money(seconds)));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  chargeOf,
  destinationOf,
  directionOf,
  isBreakdownComplete,
  onlyCharged,
  readDuration,
  readTotals,
  secondsOf,
  shareOf,
  spendByDestination,
  spendByDirection,
  spendByPerson,
  topN
});

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
var cost_centres_exports = {};
__export(cost_centres_exports, {
  CODE_MAX: () => CODE_MAX,
  MAX_PARTS: () => MAX_PARTS,
  checkAllocation: () => checkAllocation,
  checkCentre: () => checkCentre,
  isAllocationUsable: () => isAllocationUsable,
  normaliseCode: () => normaliseCode,
  resolveAllocation: () => resolveAllocation,
  splitAmount: () => splitAmount
});
module.exports = __toCommonJS(cost_centres_exports);
const MAX_PARTS = 10;
const CODE_MAX = 20;
const normaliseCode = (raw) => String(raw ?? "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, CODE_MAX);
const checkCentre = (centre, existing = []) => {
  const problems = [];
  const code = normaliseCode(centre.code ?? "");
  if (!code) {
    problems.push({
      field: "code",
      message: "Give it a code. Letters, numbers, hyphens and underscores only."
    });
  } else if (existing.some((c) => c.code === code && c !== centre)) {
    problems.push({
      field: "code",
      message: `${code} is already in use. Two centres with one code cannot be told apart on a report.`
    });
  }
  if (!String(centre.name ?? "").trim()) {
    problems.push({
      field: "name",
      message: "Give it a name. The code alone means nothing to anybody reading the report."
    });
  }
  return problems;
};
const checkAllocation = (parts, directory = []) => {
  const problems = [];
  const rows = (parts ?? []).filter((p) => p && p.code);
  if (rows.length === 0) return problems;
  if (rows.length > MAX_PARTS) {
    problems.push({
      blocking: true,
      message: `Split between at most ${MAX_PARTS}. Past that the report stops being readable.`
    });
  }
  const total = rows.reduce((sum, p) => sum + (Number(p.percent) || 0), 0);
  if (total !== 100) {
    const off = total > 100 ? total - 100 : 100 - total;
    problems.push({
      blocking: true,
      message: total > 100 ? `This adds up to ${total}%, which is ${off}% more than the spend. Take ${off}% off somewhere.` : `This adds up to ${total}%. The remaining ${off}% would not be accounted for anywhere.`
    });
  }
  const seen = /* @__PURE__ */ new Set();
  rows.forEach((p) => {
    if (seen.has(p.code)) {
      problems.push({
        blocking: true,
        message: `${p.code} appears twice. Add the two shares together into one line.`
      });
    }
    seen.add(p.code);
  });
  rows.forEach((p) => {
    if (Number(p.percent) <= 0) {
      problems.push({
        blocking: true,
        message: `${p.code} is set to ${p.percent}%. Remove the line rather than allocating nothing to it.`
      });
    }
  });
  rows.forEach((p) => {
    const centre = directory.find((c) => c.code === p.code);
    if (centre?.archived) {
      problems.push({
        blocking: false,
        message: `${p.code} is archived. Old reports still show it, but it is probably not where you want new spend going.`
      });
    }
  });
  return problems;
};
const isAllocationUsable = (problems) => !problems.some((p) => p.blocking);
const resolveAllocation = (levels) => {
  const order = ["person", "licence", "location"];
  for (const level of order) {
    const parts = levels[level];
    if (Array.isArray(parts) && parts.length > 0) {
      return { parts, from: level };
    }
  }
  return { parts: [], from: "none" };
};
const splitAmount = (amount, parts) => {
  const rows = (parts ?? []).filter((p) => p && p.code && Number(p.percent) > 0);
  if (!rows.length || !Number.isFinite(amount)) return [];
  const cents = Math.round(amount * 100);
  const split = rows.map((p) => ({
    code: p.code,
    percent: Number(p.percent),
    cents: Math.floor(cents * Number(p.percent) / 100)
  }));
  const remainder = cents - split.reduce((s, r) => s + r.cents, 0);
  if (remainder !== 0) {
    const biggest = split.reduce((a, b) => b.percent > a.percent ? b : a, split[0]);
    biggest.cents += remainder;
  }
  return split.map((r) => ({ code: r.code, amount: r.cents / 100 }));
};

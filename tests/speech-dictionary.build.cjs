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

// src/lib/speech-dictionary.ts
var speech_dictionary_exports = {};
__export(speech_dictionary_exports, {
  buildDictionary: () => buildDictionary,
  includedTerms: () => includedTerms,
  summarise: () => summarise
});
module.exports = __toCommonJS(speech_dictionary_exports);
var TOO_COMMON = /* @__PURE__ */ new Set([
  "test",
  "user",
  "admin",
  "demo",
  "sales",
  "support",
  "info",
  "team",
  "the",
  "and",
  "call",
  "phone",
  "main",
  "new",
  "none",
  "null",
  "na"
]);
var collapse = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
var judge = (text) => {
  const trimmed = collapse(text);
  if (!trimmed) {
    return { included: false, excludedBecause: "Empty" };
  }
  if (trimmed.length < 3) {
    return {
      included: false,
      excludedBecause: "Too short to recognise reliably \u2014 two letters sound like too many other things"
    };
  }
  const words = trimmed.toLowerCase().split(" ").filter(Boolean);
  if (words.length > 0 && words.every((word) => TOO_COMMON.has(word))) {
    return {
      included: false,
      excludedBecause: "An everyday word \u2014 teaching it would make the transcript worse, not better"
    };
  }
  if (/^\d+$/.test(trimmed)) {
    return { included: false, excludedBecause: "Only digits" };
  }
  if (/\d/.test(trimmed)) {
    return {
      included: true,
      excludedBecause: void 0
    };
  }
  return { included: true };
};
var looksLikeScaffolding = (text) => /\d/.test(collapse(text));
var buildDictionary = (input) => {
  const out = [];
  const seen = /* @__PURE__ */ new Map();
  const add = (text, source, extra = {}) => {
    const clean = collapse(text);
    const key = clean.toLowerCase();
    if (!key) return;
    const existing = seen.get(key);
    if (existing !== void 0) {
      if (source === "custom") {
        out[existing] = { ...out[existing], ...extra, source: "custom", text: clean };
      }
      return;
    }
    const verdict = judge(clean);
    seen.set(key, out.length);
    out.push({
      text: clean,
      source,
      included: verdict.included,
      ...verdict.excludedBecause ? { excludedBecause: verdict.excludedBecause } : {},
      ...extra
    });
  };
  for (const person of input.people ?? []) {
    const first = collapse(person?.first_name);
    const last = collapse(person?.last_name);
    if (first) add(first, "people");
    if (last) add(last, "people");
    if (first && last) add(`${first} ${last}`, "people");
  }
  if (input.companyName) add(input.companyName, "company");
  for (const line of input.lines ?? []) {
    if (line?.name) add(line.name, "line");
  }
  for (const term of input.custom ?? []) {
    add(term.text, "custom", {
      ...term.hint ? { hint: term.hint } : {},
      ...term.language ? { language: term.language } : {}
    });
  }
  return out;
};
var includedTerms = (terms) => terms.filter((t) => t.included);
var summarise = (terms) => ({
  total: terms.length,
  included: terms.filter((t) => t.included).length,
  excluded: terms.filter((t) => !t.included).length,
  derived: terms.filter((t) => t.source !== "custom").length,
  handWritten: terms.filter((t) => t.source === "custom").length,
  /* Included, but with something odd about it - digits in a name, usually.
     Worth an admin's eye without blocking anything. */
  needingAttention: terms.filter((t) => t.included && looksLikeScaffolding(t.text)).length
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildDictionary,
  includedTerms,
  summarise
});

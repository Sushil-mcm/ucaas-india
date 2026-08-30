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
var contact_labels_exports = {};
__export(contact_labels_exports, {
  LABEL_MAX_LENGTH: () => LABEL_MAX_LENGTH,
  MAX_LABELS_PER_CONTACT: () => MAX_LABELS_PER_CONTACT,
  addLabel: () => addLabel,
  checkLabel: () => checkLabel,
  entryFor: () => entryFor,
  labelIndex: () => labelIndex,
  labelKey: () => labelKey,
  matchesLabelSearch: () => matchesLabelSearch,
  normaliseLabel: () => normaliseLabel,
  parseEntries: () => parseEntries,
  pruneEntries: () => pruneEntries,
  rankLabels: () => rankLabels,
  removeLabel: () => removeLabel,
  writeEntries: () => writeEntries
});
module.exports = __toCommonJS(contact_labels_exports);
const MAX_LABELS_PER_CONTACT = 20;
const LABEL_MAX_LENGTH = 30;
const normaliseLabel = (raw) => String(raw ?? "").replace(/\|/g, " ").replace(/\s+/g, " ").trim().slice(0, LABEL_MAX_LENGTH).trim();
const labelKey = (raw) => normaliseLabel(raw).toLowerCase();
const checkLabel = (existing, raw) => {
  const label = normaliseLabel(raw);
  const problems = [];
  if (!label) {
    problems.push({ blocking: true, message: "Type a label first." });
    return problems;
  }
  if (existing.some((entry) => labelKey(entry) === labelKey(label))) {
    problems.push({
      blocking: true,
      message: `This contact already has the label \u201C${label}\u201D.`
    });
  }
  if (existing.length >= MAX_LABELS_PER_CONTACT) {
    problems.push({
      blocking: true,
      message: `A contact can carry ${MAX_LABELS_PER_CONTACT} labels. Remove one first.`
    });
  }
  if (String(raw ?? "").trim().length > LABEL_MAX_LENGTH) {
    problems.push({
      blocking: false,
      message: `Shortened to ${LABEL_MAX_LENGTH} characters.`
    });
  }
  return problems;
};
const addLabel = (existing, raw) => {
  if (checkLabel(existing, raw).some((problem) => problem.blocking)) return existing;
  return [...existing, normaliseLabel(raw)];
};
const removeLabel = (existing, raw) => {
  const key = labelKey(raw);
  return existing.filter((entry) => labelKey(entry) !== key);
};
const labelIndex = (byContact) => {
  const seen = /* @__PURE__ */ new Map();
  Object.values(byContact || {}).forEach((labels) => {
    const unique = new Set((labels || []).map((label) => labelKey(label)));
    unique.forEach((key) => {
      const original = (labels || []).find((label) => labelKey(label) === key) || key;
      const entry = seen.get(key);
      if (entry) entry.count += 1;
      else seen.set(key, { label: normaliseLabel(original), count: 1 });
    });
  });
  return [...seen.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
};
const matchesLabelSearch = (labels, query) => {
  const needle = labelKey(query);
  if (!needle) return true;
  return (labels || []).some((label) => labelKey(label).includes(needle));
};
const rankLabels = (labels, query) => {
  const needle = labelKey(query);
  if (!needle) return [...labels || []];
  const score = (label) => {
    const key = labelKey(label);
    if (key === needle) return 0;
    if (key.startsWith(needle)) return 1;
    if (key.includes(needle)) return 2;
    return 3;
  };
  return [...labels || []].map((label, index) => ({ label, index, score: score(label) })).sort((a, b) => a.score - b.score || a.index - b.index).map((entry) => entry.label);
};
const entryFor = (contactId, label) => `${contactId}|${normaliseLabel(label)}`;
const parseEntries = (entries) => {
  const byContact = {};
  (entries || []).forEach((entry) => {
    const separator = String(entry).indexOf("|");
    if (separator <= 0) return;
    const contactId = entry.slice(0, separator);
    const label = normaliseLabel(entry.slice(separator + 1));
    if (!label) return;
    const existing = byContact[contactId] || [];
    if (existing.some((current) => labelKey(current) === labelKey(label))) return;
    byContact[contactId] = [...existing, label];
  });
  return byContact;
};
const writeEntries = (entries, contactId, labels) => [
  ...(entries || []).filter((entry) => !String(entry).startsWith(`${contactId}|`)),
  ...labels.map((label) => entryFor(contactId, label))
];
const pruneEntries = (entries, liveContactIds) => {
  const live = new Set(liveContactIds.map((id) => String(id)));
  return (entries || []).filter((entry) => {
    const separator = String(entry).indexOf("|");
    return separator > 0 && live.has(entry.slice(0, separator));
  });
};

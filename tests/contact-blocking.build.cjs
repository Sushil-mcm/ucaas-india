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
var contact_blocking_exports = {};
__export(contact_blocking_exports, {
  DEFAULT_BLOCK_CHOICE: () => DEFAULT_BLOCK_CHOICE,
  SCOPE_LABELS: () => SCOPE_LABELS,
  TREATMENT_DESCRIPTIONS: () => TREATMENT_DESCRIPTIONS,
  TREATMENT_LABELS: () => TREATMENT_LABELS,
  blockedContacts: () => blockedContacts,
  canBlock: () => canBlock,
  contactName: () => contactName,
  contactsForNumber: () => contactsForNumber,
  describeChoice: () => describeChoice,
  isEmergencyNumber: () => isEmergencyNumber,
  isSameNumber: () => isSameNumber,
  isShortCode: () => isShortCode,
  matchKey: () => matchKey,
  numberDigits: () => numberDigits,
  planBlock: () => planBlock,
  tagRequest: () => tagRequest,
  unstoredParts: () => unstoredParts
});
module.exports = __toCommonJS(contact_blocking_exports);
const DEFAULT_BLOCK_CHOICE = {
  scope: "both",
  treatment: "voicemail",
  line: "personal"
};
const TREATMENT_LABELS = {
  voicemail: "Send to voicemail",
  spam: "Mark as spam",
  reject: "Block everything"
};
const TREATMENT_DESCRIPTIONS = {
  voicemail: "Calls go straight to voicemail. You still see the conversation in your inbox and in recent calls.",
  spam: "Calls go straight to voicemail, and calls and messages are filed under spam instead of your inbox.",
  reject: "Your number reads as out of service to this caller. Nothing reaches you at all."
};
const SCOPE_LABELS = {
  calls: "Calls and faxes",
  messages: "Messages",
  both: "Calls, faxes and messages"
};
const EMERGENCY_NUMBERS = /* @__PURE__ */ new Set([
  "000",
  "100",
  "101",
  "102",
  "108",
  "110",
  "111",
  "112",
  "113",
  "117",
  "118",
  "119",
  "911",
  "912",
  "933",
  "999"
]);
const SHORT_CODE_MAX_DIGITS = 6;
const numberDigits = (raw) => String(raw ?? "").replace(/\D/g, "");
const matchKey = (raw) => {
  const digits = numberDigits(raw);
  return digits.length > 9 ? digits.slice(-9) : digits;
};
const isSameNumber = (a, b) => {
  const left = matchKey(a);
  const right = matchKey(b);
  return Boolean(left) && left === right;
};
const isEmergencyNumber = (raw) => EMERGENCY_NUMBERS.has(numberDigits(raw));
const isShortCode = (raw) => {
  const digits = numberDigits(raw);
  return digits.length > 0 && digits.length <= SHORT_CODE_MAX_DIGITS;
};
const contactName = (contact) => `${contact?.name?.first || ""} ${contact?.name?.last || ""}`.trim();
const contactsForNumber = (contacts, number) => {
  const key = matchKey(number);
  if (!key) return [];
  return contacts.filter((contact) => matchKey(contact?.contact?.phone) === key);
};
const blockedContacts = (contacts) => contacts.filter((contact) => Boolean(contact?.is_blocked));
const canBlock = (plan) => !plan.needsContact && !plan.problems.some((problem) => problem.blocking);
const planBlock = (choice, contacts, ownNumbers = []) => {
  const problems = [];
  const digits = numberDigits(choice.number);
  if (!digits) {
    problems.push({ blocking: true, message: "Enter a number to block." });
  } else if (isEmergencyNumber(choice.number)) {
    problems.push({
      blocking: true,
      message: "Emergency numbers cannot be blocked."
    });
  } else if (isShortCode(choice.number)) {
    problems.push({
      blocking: true,
      message: "Short codes and service numbers cannot be blocked."
    });
  } else if (ownNumbers.some((own) => isSameNumber(own, choice.number))) {
    problems.push({
      blocking: true,
      message: "This is one of your own numbers."
    });
  }
  const targets = digits ? contactsForNumber(contacts, choice.number) : [];
  const needsContact = problems.every((problem) => !problem.blocking) && targets.length === 0;
  if (needsContact) {
    problems.push({
      blocking: true,
      message: "Save this number as a contact first \u2014 a block is recorded against a contact."
    });
  }
  if (targets.length > 1) {
    problems.push({
      blocking: false,
      message: `${targets.length} contacts share this number, and all of them will be marked as blocked.`
    });
  }
  if (targets.some((contact) => contact?.is_vip)) {
    problems.push({
      blocking: false,
      message: "This contact is marked VIP. Blocking replaces that."
    });
  }
  return {
    problems,
    targets,
    needsContact,
    notStored: unstoredParts(choice)
  };
};
const unstoredParts = (choice) => {
  const lost = [];
  if (choice.scope !== "both") lost.push(SCOPE_LABELS[choice.scope]);
  if (choice.treatment !== DEFAULT_BLOCK_CHOICE.treatment)
    lost.push(TREATMENT_LABELS[choice.treatment]);
  if (choice.line !== "personal") lost.push("Shared line only");
  return lost;
};
const tagRequest = (contacts, tag) => ({
  contact_uuid: contacts.map((contact) => String(contact?._id || "")).filter(Boolean),
  tag
});
const describeChoice = (choice) => {
  const what = SCOPE_LABELS[choice.scope].toLowerCase();
  const where = choice.line === "shared" ? "this shared line" : "your line";
  const outcome = TREATMENT_DESCRIPTIONS[choice.treatment];
  return `${what.charAt(0).toUpperCase()}${what.slice(1)} from this number to ${where} will be blocked. ${outcome}`;
};

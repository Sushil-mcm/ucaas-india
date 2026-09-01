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
var queue_naming_exports = {};
__export(queue_naming_exports, {
  FULL_PREFIX: () => FULL_PREFIX,
  INBOUND_PREFIX: () => INBOUND_PREFIX,
  PREFIX_SEPARATOR: () => PREFIX_SEPARATOR,
  QUEUE_NAME_MAX_LENGTH: () => QUEUE_NAME_MAX_LENGTH,
  TYPED_NAME_MIN_LENGTH: () => TYPED_NAME_MIN_LENGTH,
  buildQueueName: () => buildQueueName,
  checkQueueName: () => checkQueueName,
  hasInboundPrefix: () => hasInboundPrefix,
  stripInboundPrefix: () => stripInboundPrefix,
  tidyName: () => tidyName
});
module.exports = __toCommonJS(queue_naming_exports);
const INBOUND_PREFIX = "Inbound";
const PREFIX_SEPARATOR = " - ";
const FULL_PREFIX = `${INBOUND_PREFIX}${PREFIX_SEPARATOR}`;
const QUEUE_NAME_MAX_LENGTH = 50;
const TYPED_NAME_MIN_LENGTH = 2;
const PREFIX_PATTERN = new RegExp(`^${INBOUND_PREFIX}\\s*-\\s*`, "i");
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const tidyName = (raw) => String(raw ?? "").replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
const hasInboundPrefix = (raw) => PREFIX_PATTERN.test(tidyName(raw));
const stripInboundPrefix = (raw) => tidyName(tidyName(raw).replace(PREFIX_PATTERN, ""));
const buildQueueName = (raw) => {
  const typed = stripInboundPrefix(raw);
  if (!typed) return "";
  return `${FULL_PREFIX}${typed}`;
};
const checkQueueName = (raw) => {
  const typed = stripInboundPrefix(raw);
  if (!typed) {
    return { ok: false, reason: "Give this queue a name, so it can be told apart in reports." };
  }
  if (typed.length < TYPED_NAME_MIN_LENGTH) {
    return {
      ok: false,
      reason: `Use at least ${TYPED_NAME_MIN_LENGTH} characters, so the name means something in a report.`
    };
  }
  if (buildQueueName(raw).length > QUEUE_NAME_MAX_LENGTH) {
    const room = QUEUE_NAME_MAX_LENGTH - FULL_PREFIX.length;
    return {
      ok: false,
      reason: `That is too long. "${FULL_PREFIX}" is added in front, which leaves ${room} characters.`
    };
  }
  return { ok: true };
};

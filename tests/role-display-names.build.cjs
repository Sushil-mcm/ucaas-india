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

// src/lib/role-display-names.ts
var role_display_names_exports = {};
__export(role_display_names_exports, {
  ROLE_NAMES: () => ROLE_NAMES,
  isBuiltInRole: () => isBuiltInRole,
  roleDisplayDescription: () => roleDisplayDescription,
  roleDisplayName: () => roleDisplayName
});
module.exports = __toCommonJS(role_display_names_exports);
var BUILT_IN = {
  ADMIN: {
    name: "Account owner",
    description: "Runs the whole account. Everything the company has."
  },
  MANAGER: {
    name: "Account admin",
    description: "Runs the account day to day. Everything the company has."
  },
  "SUB-ADMIN": {
    name: "People admin",
    description: "Adds and removes people, and looks after numbers."
  },
  AGENT: {
    name: "Call reviewer",
    description: "Listens to recordings and reads reports."
  }
};
var looksLikeUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
var roleDisplayName = (stored) => {
  const raw = String(stored ?? "").trim();
  if (!raw) return "No role";
  if (looksLikeUuid(raw)) return "Unknown role";
  return BUILT_IN[raw.toUpperCase()]?.name ?? raw;
};
var roleDisplayDescription = (stored, fallback) => {
  const raw = String(stored ?? "").trim();
  const built = BUILT_IN[raw.toUpperCase()];
  if (built) return built.description;
  const given = String(fallback ?? "").trim();
  if (!given || /this is test description/i.test(given)) return "";
  return given;
};
var ROLE_NAMES = [
  "Account owner",
  "Account admin",
  "People admin",
  "Call reviewer",
  "Call flow builder"
];
var isBuiltInRole = (stored) => Boolean(BUILT_IN[String(stored ?? "").trim().toUpperCase()]);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ROLE_NAMES,
  isBuiltInRole,
  roleDisplayDescription,
  roleDisplayName
});

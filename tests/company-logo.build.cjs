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

// src/lib/company-logo.ts
var company_logo_exports = {};
__export(company_logo_exports, {
  ACCEPTED_LOGO_TYPES: () => ACCEPTED_LOGO_TYPES,
  LARGE_LOGO_BYTES: () => LARGE_LOGO_BYTES,
  LOGO_SCHEMA_VERSION: () => LOGO_SCHEMA_VERSION,
  LOGO_SETTINGS_KEY: () => LOGO_SETTINGS_KEY,
  MAX_LOGO_BYTES: () => MAX_LOGO_BYTES,
  buildStoredLogo: () => buildStoredLogo,
  checkLogoFile: () => checkLogoFile,
  logoMediaUrl: () => logoMediaUrl,
  readStoredLogo: () => readStoredLogo
});
module.exports = __toCommonJS(company_logo_exports);
var LOGO_SETTINGS_KEY = "company_logo";
var LOGO_SCHEMA_VERSION = 1;
var ACCEPTED_LOGO_TYPES = ["image/png"];
var MAX_LOGO_BYTES = 30 * 1024 * 1024;
var LARGE_LOGO_BYTES = 1 * 1024 * 1024;
var formatBytes = (bytes) => {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024) * 10) / 10} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
};
var checkLogoFile = (file) => {
  if (!file) {
    return { ok: false, reason: "No file was chosen." };
  }
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, reason: "That file is empty. Try exporting it again." };
  }
  const type = String(file.type || "").toLowerCase();
  if (!ACCEPTED_LOGO_TYPES.includes(type)) {
    return {
      ok: false,
      reason: "A logo has to be a PNG. That is the format that keeps a transparent background, so your logo sits on the header rather than in a white box."
    };
  }
  if (size > MAX_LOGO_BYTES) {
    return {
      ok: false,
      reason: `That file is ${formatBytes(size)}. The most a logo can be is ${formatBytes(MAX_LOGO_BYTES)}.`
    };
  }
  if (size > LARGE_LOGO_BYTES) {
    return {
      ok: true,
      advice: `That will work, but at ${formatBytes(size)} it is much larger than a logo needs to be. It is shown about the height of this text, and everyone in your company downloads it every time they open the app \u2014 a smaller file makes that quicker for all of them.`
    };
  }
  return { ok: true };
};
var readStoredLogo = (settings) => {
  const raw = settings?.[LOGO_SETTINGS_KEY];
  if (typeof raw === "string") return raw.trim();
  const fileName = raw?.file_name;
  return typeof fileName === "string" ? fileName.trim() : "";
};
var buildStoredLogo = (fileName, now = /* @__PURE__ */ new Date()) => ({
  version: LOGO_SCHEMA_VERSION,
  updated_at: now.toISOString(),
  file_name: String(fileName ?? "").trim()
});
var logoMediaUrl = (params) => {
  const file = String(params.fileName ?? "").trim();
  const company = String(params.companyUuid ?? "").trim();
  const base = String(params.apiBaseUrl ?? "").replace(/\/+$/, "");
  if (!file || !company || !base) return "";
  return `${base}/api/media/${encodeURIComponent(company)}/logo/${encodeURIComponent(file)}`;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACCEPTED_LOGO_TYPES,
  LARGE_LOGO_BYTES,
  LOGO_SCHEMA_VERSION,
  LOGO_SETTINGS_KEY,
  MAX_LOGO_BYTES,
  buildStoredLogo,
  checkLogoFile,
  logoMediaUrl,
  readStoredLogo
});

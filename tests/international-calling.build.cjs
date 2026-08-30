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

// src/lib/international-calling.ts
var international_calling_exports = {};
__export(international_calling_exports, {
  COMPANY_INTERNATIONAL_KEY: () => COMPANY_INTERNATIONAL_KEY,
  COMPANY_INTERNATIONAL_PATH: () => COMPANY_INTERNATIONAL_PATH,
  COMPANY_PERMISSIONS_KEY: () => COMPANY_PERMISSIONS_KEY,
  EMERGENCY_NUMBERS: () => EMERGENCY_NUMBERS,
  FOLLOW_COMPANY: () => FOLLOW_COMPANY,
  INTERNAL_MAX_DIGITS: () => INTERNAL_MAX_DIGITS,
  NO_COMPANY_RESTRICTION: () => NO_COMPANY_RESTRICTION,
  PERSON_INTERNATIONAL_KEY: () => PERSON_INTERNATIONAL_KEY,
  buildCompanyInternationalRule: () => buildCompanyInternationalRule,
  buildPersonInternationalRule: () => buildPersonInternationalRule,
  checkInternationalCall: () => checkInternationalCall,
  classifyDialled: () => classifyDialled,
  countryName: () => countryName,
  describeCompanyRule: () => describeCompanyRule,
  describePersonRule: () => describePersonRule,
  listCountryNames: () => listCountryNames,
  readCompanyInternationalRule: () => readCompanyInternationalRule,
  readPersonInternationalRule: () => readPersonInternationalRule,
  toCountryCode: () => toCountryCode,
  toCountryList: () => toCountryList,
  writePersonInternationalRule: () => writePersonInternationalRule
});
module.exports = __toCommonJS(international_calling_exports);
var import_libphonenumber_js = require("libphonenumber-js");
var COMPANY_PERMISSIONS_KEY = "company_calling_permissions";
var COMPANY_INTERNATIONAL_KEY = "international_calling";
var COMPANY_INTERNATIONAL_PATH = `${COMPANY_PERMISSIONS_KEY}.${COMPANY_INTERNATIONAL_KEY}`;
var PERSON_INTERNATIONAL_KEY = "international_calling";
var INTERNAL_MAX_DIGITS = 4;
var EMERGENCY_NUMBERS = [
  "000",
  "08",
  "100",
  "101",
  "102",
  "106",
  "108",
  "110",
  "111",
  "112",
  "113",
  "114",
  "115",
  "117",
  "118",
  "119",
  "122",
  "911",
  "912",
  "991",
  "992",
  "993",
  "994",
  "995",
  "996",
  "997",
  "998",
  "999",
  "1122"
];
var EMERGENCY_SET = new Set(EMERGENCY_NUMBERS);
var asObject = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};
var toCountryCode = (value) => {
  const candidate = String(value ?? "").trim().toUpperCase();
  if (candidate.length !== 2) return "";
  return (0, import_libphonenumber_js.isSupportedCountry)(candidate) ? candidate : "";
};
var toCountryList = (value) => {
  const raw = Array.isArray(value) ? value : typeof value === "string" && value.trim() ? (() => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })() : [];
  const codes = raw.map(
    (entry) => toCountryCode(typeof entry === "string" ? entry : entry?.country_code_iso2 ?? entry?.code)
  ).filter(Boolean);
  return codes.filter((code, index) => codes.indexOf(code) === index);
};
var NO_COMPANY_RESTRICTION = { restricted: false, countries: [] };
var FOLLOW_COMPANY = { allowed: null, countries: [] };
var readCompanyInternationalRule = (companySettings) => {
  const block = asObject(asObject(asObject(companySettings)[COMPANY_PERMISSIONS_KEY])[COMPANY_INTERNATIONAL_KEY]);
  return {
    restricted: block.restricted === true,
    countries: toCountryList(block.countries)
  };
};
var readPersonInternationalRule = (userSettings) => {
  const block = asObject(asObject(userSettings)[PERSON_INTERNATIONAL_KEY]);
  const allowed = block.allowed;
  return {
    allowed: allowed === true ? true : allowed === false ? false : null,
    countries: toCountryList(block.countries)
  };
};
var buildCompanyInternationalRule = (rule, now = /* @__PURE__ */ new Date()) => ({
  restricted: rule.restricted === true,
  countries: rule.restricted ? toCountryList(rule.countries) : [],
  updated_at: now.toISOString()
});
var buildPersonInternationalRule = (rule, now = /* @__PURE__ */ new Date()) => {
  if (rule.allowed === null) return void 0;
  return {
    allowed: rule.allowed === true,
    /* A list kept under "not allowed" would read to a later maintainer as a set
       of countries somebody was granted. It is dropped, not hidden. */
    countries: rule.allowed ? toCountryList(rule.countries) : [],
    updated_at: now.toISOString()
  };
};
var writePersonInternationalRule = (userSettings, rule, now = /* @__PURE__ */ new Date()) => {
  const settings = { ...asObject(userSettings) };
  const block = buildPersonInternationalRule(rule, now);
  if (!block) {
    delete settings[PERSON_INTERNATIONAL_KEY];
    return settings;
  }
  settings[PERSON_INTERNATIONAL_KEY] = block;
  return settings;
};
var regionNames;
var countryName = (code) => {
  const iso = String(code ?? "").trim().toUpperCase();
  if (!iso) return "";
  if (regionNames === void 0) {
    try {
      regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      regionNames = null;
    }
  }
  if (!regionNames) return iso;
  try {
    return regionNames.of(iso) || iso;
  } catch {
    return iso;
  }
};
var MAX_NAMED_COUNTRIES = 6;
var listCountryNames = (codes) => {
  const names = codes.map(countryName).filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length > MAX_NAMED_COUNTRIES) {
    const shown = names.slice(0, MAX_NAMED_COUNTRIES);
    const rest = names.length - MAX_NAMED_COUNTRIES;
    return `${shown.join(", ")} and ${rest} more ${rest === 1 ? "country" : "countries"}`;
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};
var classifyDialled = (dialled, { homeCountry, internalDigits = INTERNAL_MAX_DIGITS } = {}) => {
  const empty = { kind: "empty", country: "", country_name: "", e164: "" };
  const raw = String(dialled ?? "").trim();
  if (!raw) return empty;
  if (raw.startsWith("*") || raw.startsWith("#")) {
    return { kind: "feature-code", country: "", country_name: "", e164: "" };
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { kind: "unrecognised", country: "", country_name: "", e164: "" };
  if (EMERGENCY_SET.has(digits)) {
    return { kind: "emergency", country: "", country_name: "", e164: "" };
  }
  if (digits.length <= Math.max(1, internalDigits)) {
    return { kind: "internal", country: "", country_name: "", e164: "" };
  }
  const home = toCountryCode(homeCountry);
  let parsed;
  try {
    parsed = (0, import_libphonenumber_js.parsePhoneNumberFromString)(raw, home || void 0);
  } catch {
    parsed = void 0;
  }
  if (!parsed || !parsed.isValid()) {
    return { kind: "unrecognised", country: "", country_name: "", e164: "" };
  }
  const country = toCountryCode(parsed.country);
  if (!country) {
    return { kind: "country-unknown", country: "", country_name: "", e164: parsed.number || "" };
  }
  if (home && country === home) {
    return {
      kind: "domestic",
      country,
      country_name: countryName(country),
      e164: parsed.number || ""
    };
  }
  return {
    kind: "international",
    country,
    country_name: countryName(country),
    e164: parsed.number || ""
  };
};
var checkInternationalCall = ({
  dialled,
  homeCountry,
  internalDigits,
  company,
  person,
  personName
}) => {
  const number = classifyDialled(dialled, { homeCountry, internalDigits });
  const who = String(personName || "").trim() || "This person";
  const allow = (reason, message, decidedBy = "none") => ({ allowed: true, reason, message, dialled: number, decidedBy });
  const refuse = (reason, message, decidedBy) => ({ allowed: false, reason, message, dialled: number, decidedBy });
  switch (number.kind) {
    case "empty":
      return allow("no-number", "No number was dialled, so there is nothing to check.");
    case "feature-code":
      return allow(
        "feature-code",
        "This is a phone system code, not a phone number, so it is always allowed."
      );
    case "internal":
      return allow(
        "internal-number",
        "This is an internal extension, not a call to another country."
      );
    case "emergency":
      return allow("emergency", "Emergency numbers are always allowed and are never restricted.");
    case "unrecognised":
      return allow(
        "unrecognised",
        "We could not read this as a phone number, so it is not treated as an international call."
      );
    case "country-unknown":
      return allow(
        "country-unknown",
        "This number does not belong to any one country, so it cannot be matched against your allowed countries."
      );
    case "domestic":
      return allow("domestic", "This is a call inside your own country.");
    default:
      break;
  }
  const companyRule = company || NO_COMPANY_RESTRICTION;
  const personRule = person || FOLLOW_COMPANY;
  const destination = number.country_name || number.country;
  if (companyRule.restricted) {
    if (companyRule.countries.length === 0) {
      return refuse(
        "company-allows-nowhere",
        `Your company does not allow calls to other countries, so this call to ${destination} cannot go through.`,
        "company"
      );
    }
    if (!companyRule.countries.includes(number.country)) {
      return refuse(
        "company-country-not-allowed",
        `Your company does not allow calls to ${destination}. The countries you can call are ${listCountryNames(
          companyRule.countries
        )}.`,
        "company"
      );
    }
  }
  if (personRule.allowed === false) {
    return refuse(
      "person-not-allowed",
      `${who} is not allowed to make calls to other countries, so this call to ${destination} cannot go through.`,
      "person"
    );
  }
  if (personRule.countries.length > 0 && !personRule.countries.includes(number.country)) {
    const own = companyRule.restricted ? personRule.countries.filter((code) => companyRule.countries.includes(code)) : personRule.countries;
    return refuse(
      "person-country-not-allowed",
      own.length ? `${who} can only call ${listCountryNames(own)}, so this call to ${destination} cannot go through.` : `${who} is not allowed to make calls to other countries, so this call to ${destination} cannot go through.`,
      "person"
    );
  }
  return companyRule.restricted ? allow(
    "company-allows",
    `${destination} is one of the countries your company allows.`,
    personRule.allowed === true ? "person" : "company"
  ) : allow(
    "no-restriction",
    `Your company has not limited which countries can be called, so calls to ${destination} are allowed.`,
    personRule.allowed === true ? "person" : "none"
  );
};
var describeCompanyRule = (rule) => {
  if (!rule.restricted) {
    return "Calls can be made to any country. Nothing is restricted.";
  }
  if (rule.countries.length === 0) {
    return "No countries are chosen, so no calls to other countries would be allowed at all.";
  }
  return `Calls to other countries are limited to ${listCountryNames(rule.countries)}.`;
};
var describePersonRule = (rule, company = NO_COMPANY_RESTRICTION) => {
  if (rule.allowed === null) {
    return `Follows the company setting. ${describeCompanyRule(company)}`;
  }
  if (rule.allowed === false) {
    return "This person cannot call other countries, even ones the company allows.";
  }
  if (rule.countries.length > 0) {
    return `This person can call ${listCountryNames(rule.countries)}, as long as the company allows those countries too.`;
  }
  return "This person can call any country the company allows.";
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  COMPANY_INTERNATIONAL_KEY,
  COMPANY_INTERNATIONAL_PATH,
  COMPANY_PERMISSIONS_KEY,
  EMERGENCY_NUMBERS,
  FOLLOW_COMPANY,
  INTERNAL_MAX_DIGITS,
  NO_COMPANY_RESTRICTION,
  PERSON_INTERNATIONAL_KEY,
  buildCompanyInternationalRule,
  buildPersonInternationalRule,
  checkInternationalCall,
  classifyDialled,
  countryName,
  describeCompanyRule,
  describePersonRule,
  listCountryNames,
  readCompanyInternationalRule,
  readPersonInternationalRule,
  toCountryCode,
  toCountryList,
  writePersonInternationalRule
});

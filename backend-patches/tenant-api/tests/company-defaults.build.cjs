var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var companyDefaults_exports = {};
__export(companyDefaults_exports, {
  COMPANY_DEFAULT_TEMPLATE_NAME: () => COMPANY_DEFAULT_TEMPLATE_NAME,
  fetchCompanyDefaults: () => fetchCompanyDefaults,
  invalidateCompanyDefaults: () => invalidateCompanyDefaults,
  mergeCompanyDefaultRows: () => mergeCompanyDefaultRows,
  readCompanyDefaults: () => readCompanyDefaults,
  withCompanyDefaultRow: () => withCompanyDefaultRow
});
module.exports = __toCommonJS(companyDefaults_exports);
var import_sequelize = require("sequelize");
var import_database = __toESM(require("@/config/database"), 1);
const COMPANY_DEFAULT_TEMPLATE_NAME = "Company Default";
const CACHE_TTL_MS = 60 * 1e3;
const FAILURE_CACHE_TTL_MS = 10 * 1e3;
const cache = {};
const toObject = (value) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) return value;
  return {};
};
const byUpdatedAtAscending = (left, right) => {
  const leftTime = new Date(left?.updated_at || 0).getTime() || 0;
  const rightTime = new Date(right?.updated_at || 0).getTime() || 0;
  return leftTime - rightTime;
};
const mergeCompanyDefaultRows = (rows) => {
  if (!Array.isArray(rows) || !rows.length) return null;
  const ordered = rows.slice().sort(byUpdatedAtAscending);
  const newest = ordered[ordered.length - 1];
  const settings = {};
  const greetings = {};
  ordered.forEach((row) => {
    Object.assign(settings, toObject(row?.settings));
    Object.assign(greetings, toObject(row?.greetings));
  });
  return {
    uuid: String(newest?.uuid || ""),
    name: COMPANY_DEFAULT_TEMPLATE_NAME,
    settings,
    greetings,
    created_by: newest?.created_by ? String(newest.created_by) : null,
    updated_at: newest?.updated_at || null,
    sourceRowCount: ordered.length
  };
};
const fetchCompanyDefaults = async (tenantDbName) => {
  if (!tenantDbName) return null;
  try {
    const sequelize = (0, import_database.default)(tenantDbName);
    const rows = await sequelize.query(
      "SELECT uuid, name, settings, greetings, created_by, updated_at FROM user_template WHERE name = :name",
      {
        replacements: { name: COMPANY_DEFAULT_TEMPLATE_NAME },
        type: import_sequelize.QueryTypes.SELECT
      }
    );
    return mergeCompanyDefaultRows(rows);
  } catch (error) {
    console.error(
      `companyDefaults: could not read the company record for ${tenantDbName}.`,
      error?.message || error
    );
    return null;
  }
};
const readCompanyDefaults = async (tenantDbName) => {
  if (!tenantDbName) return null;
  const cached = cache[tenantDbName];
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  const value = await fetchCompanyDefaults(tenantDbName);
  cache[tenantDbName] = {
    value,
    expiresAt: now + (value ? CACHE_TTL_MS : FAILURE_CACHE_TTL_MS)
  };
  return value;
};
const invalidateCompanyDefaults = (tenantDbName) => {
  if (tenantDbName) {
    delete cache[tenantDbName];
    return;
  }
  Object.keys(cache).forEach((key) => delete cache[key]);
};
const withCompanyDefaultRow = async (tenantDbName, rows, page, nameFilter) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  try {
    if (Number(page || 1) !== 1) return { rows: safeRows, added: 0 };
    const filter = String(nameFilter || "").trim().toLowerCase();
    if (filter && COMPANY_DEFAULT_TEMPLATE_NAME.toLowerCase().indexOf(filter) === -1) {
      return { rows: safeRows, added: 0 };
    }
    const merged = await fetchCompanyDefaults(tenantDbName);
    if (!merged || !merged.uuid) return { rows: safeRows, added: 0 };
    const existingIndex = safeRows.findIndex(
      (row) => String(row?.name || "") === COMPANY_DEFAULT_TEMPLATE_NAME
    );
    if (existingIndex !== -1) {
      const next = safeRows.slice();
      next[existingIndex] = merged;
      return { rows: next, added: 0 };
    }
    return { rows: [merged].concat(safeRows), added: 1 };
  } catch (error) {
    console.error(
      `companyDefaults: could not add the company record to the template list for ${tenantDbName}.`,
      error?.message || error
    );
    return { rows: safeRows, added: 0 };
  }
};

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
var user_roster_export_exports = {};
__export(user_roster_export_exports, {
  EXPORT_COLUMNS: () => EXPORT_COLUMNS,
  EXPORT_LIMITS: () => EXPORT_LIMITS,
  buildRosterCsv: () => buildRosterCsv,
  default: () => user_roster_export_default,
  escapeCell: () => escapeCell,
  exportDate: () => exportDate,
  numbersOf: () => numbersOf,
  roleOf: () => roleOf,
  rosterFileName: () => rosterFileName,
  toExportRow: () => toExportRow
});
module.exports = __toCommonJS(user_roster_export_exports);
const EXPORT_COLUMNS = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "role", header: "Role" },
  { key: "jobTitle", header: "Job title" },
  { key: "location", header: "Location" },
  { key: "extension", header: "Extension" },
  { key: "numbers", header: "Numbers" },
  { key: "groups", header: "Groups" },
  { key: "addedOn", header: "Added on" }
];
const text = (value) => String(value ?? "").trim();
const exportDate = (value) => {
  const raw = text(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};
const numbersOf = (person) => {
  const found = [];
  const push = (value) => {
    const number = text(value);
    if (number && !found.includes(number)) found.push(number);
  };
  push(person?.caller_id);
  const assigned = person?.assigned_did;
  if (Array.isArray(assigned)) {
    assigned.forEach((entry) => push(entry?.did_number ?? entry?.number ?? entry));
  } else if (assigned && typeof assigned === "object") {
    push(assigned?.did_number ?? assigned?.number);
  } else {
    push(assigned);
  }
  return found;
};
const roleOf = (person) => text(person?.custom_role_data?.name) || text(person?.role_data?.name) || text(person?.role);
const toExportRow = (person, groups = []) => ({
  name: [text(person?.first_name), text(person?.last_name)].filter(Boolean).join(" "),
  email: text(person?.email),
  role: roleOf(person),
  jobTitle: text(person?.job_title),
  location: text(person?.site?.name),
  extension: text(person?.extension),
  numbers: numbersOf(person),
  groups: (Array.isArray(groups) ? groups : []).map(text).filter(Boolean),
  addedOn: exportDate(person?.created_at ?? person?.createdAt)
});
const escapeCell = (value) => {
  const raw = Array.isArray(value) ? value.map(text).filter(Boolean).join(" ") : text(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};
const buildRosterCsv = (rows) => {
  const header = EXPORT_COLUMNS.map((column) => escapeCell(column.header)).join(",");
  const body = (Array.isArray(rows) ? rows : []).map(
    (row) => EXPORT_COLUMNS.map((column) => escapeCell(row?.[column.key])).join(",")
  );
  return [header, ...body].join("\r\n");
};
const rosterFileName = (companyName, on) => {
  const slug = text(companyName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const day = exportDate(on) || "export";
  return `${slug ? `${slug}-` : ""}people-${day}.csv`;
};
const EXPORT_LIMITS = [
  {
    id: "state",
    label: "Whether somebody has signed in yet",
    why: "Everybody added here is switched on straight away \u2014 there is no invitation to accept, so there is no waiting state to report. Every row in the file is an active person."
  },
  {
    id: "licence",
    label: "Which licence each person uses",
    why: "Licences are counted against the company rather than named on a person, so there is one kind and no per-person type to put in a column. The Billing screen is where seats are matched to people."
  },
  {
    id: "removed",
    label: "People who have been removed",
    why: "Removed people are hidden from the list this file is built from, so they cannot appear here. Nothing in the product lists them."
  }
];
var user_roster_export_default = buildRosterCsv;

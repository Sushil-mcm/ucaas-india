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
var invite_duplicates_exports = {};
__export(invite_duplicates_exports, {
  blocksInvite: () => blocksInvite,
  clashForField: () => clashForField,
  clashesForRow: () => clashesForRow,
  default: () => invite_duplicates_default,
  explainTakenEmail: () => explainTakenEmail,
  findInviteClashes: () => findInviteClashes,
  nameOfPerson: () => nameOfPerson,
  summariseClashes: () => summariseClashes
});
module.exports = __toCommonJS(invite_duplicates_exports);
const normaliseEmail = (value) => String(value ?? "").trim().toLowerCase();
const normaliseExtension = (value) => String(value ?? "").replace(/\D+/g, "").trim();
const normalisePhone = (value) => String(value ?? "").replace(/\D+/g, "").trim();
const nameOfPerson = (person) => {
  const full = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  const email = String(person?.email || "").trim();
  return email || "somebody already on the account";
};
const placeOf = (person) => {
  const site = String(person?.site?.name || "").trim();
  return site ? ` at ${site}` : "";
};
const findInviteClashes = ({ rows, roster }) => {
  const list = Array.isArray(rows) ? rows : [];
  const existing = Array.isArray(roster) ? roster : [];
  if (!list.length) return [];
  const takenEmail = /* @__PURE__ */ new Map();
  const takenExtension = /* @__PURE__ */ new Map();
  existing.forEach((person) => {
    const email = normaliseEmail(person?.email);
    if (email && !takenEmail.has(email)) takenEmail.set(email, person);
    const extension = normaliseExtension(person?.extension);
    if (extension && !takenExtension.has(extension)) takenExtension.set(extension, person);
  });
  const seenEmail = /* @__PURE__ */ new Map();
  const seenExtension = /* @__PURE__ */ new Map();
  const seenPhone = /* @__PURE__ */ new Map();
  const found = [];
  list.forEach((row, index) => {
    const email = normaliseEmail(row?.email);
    if (email) {
      const firstAt = seenEmail.get(email);
      if (firstAt === void 0) {
        seenEmail.set(email, index);
        const already = takenEmail.get(email);
        if (already) {
          found.push({
            row: index,
            field: "email",
            kind: "email-taken",
            message: `${nameOfPerson(already)} already signs in with ${email}${placeOf(already)}. A person belongs to one location, so they cannot be added a second time \u2014 open them on the People page and change their location instead.`,
            blocking: true
          });
        }
      } else {
        found.push({
          row: index,
          field: "email",
          kind: "email-twice",
          message: `${email} is already on row ${firstAt + 1} of this invite. One person, one email address \u2014 remove this row or correct the address.`,
          blocking: true
        });
      }
    }
    const extension = normaliseExtension(row?.extension);
    if (extension) {
      const firstAt = seenExtension.get(extension);
      if (firstAt === void 0) {
        seenExtension.set(extension, index);
        const already = takenExtension.get(extension);
        if (already) {
          found.push({
            row: index,
            field: "extension",
            kind: "extension-taken",
            message: `Extension ${extension} already rings ${nameOfPerson(already)}${placeOf(already)}. Two people on one extension means calls reach whichever the platform picks \u2014 choose a different one.`,
            blocking: true
          });
        }
      } else {
        found.push({
          row: index,
          field: "extension",
          kind: "extension-twice",
          message: `Extension ${extension} is already on row ${firstAt + 1} of this invite. Give this person a different one.`,
          blocking: true
        });
      }
    }
    const phone = normalisePhone(row?.phone);
    if (phone) {
      const firstAt = seenPhone.get(phone);
      if (firstAt === void 0) {
        seenPhone.set(phone, index);
      } else {
        found.push({
          row: index,
          field: "phone",
          kind: "phone-twice",
          message: `This phone number is already on row ${firstAt + 1} of this invite. It is where the platform reaches this person, so two people cannot share one.`,
          blocking: true
        });
      }
    }
  });
  return found;
};
const clashesForRow = (clashes, row) => (Array.isArray(clashes) ? clashes : []).filter((clash) => clash.row === row);
const clashForField = (clashes, row, field) => (Array.isArray(clashes) ? clashes : []).find(
  (clash) => clash.row === row && clash.field === field
) || null;
const blocksInvite = (clashes) => (Array.isArray(clashes) ? clashes : []).some((clash) => clash.blocking);
const summariseClashes = (clashes) => {
  const list = Array.isArray(clashes) ? clashes : [];
  if (!list.length) return "";
  const alreadyHere = list.filter(
    (clash) => clash.kind === "email-taken" || clash.kind === "extension-taken"
  ).length;
  const repeated = list.length - alreadyHere;
  if (alreadyHere && repeated) {
    return "Some of these people are already on the account, and some appear twice in this list. Fix the rows marked below before adding anybody.";
  }
  if (alreadyHere) {
    return alreadyHere === 1 ? "One of these people is already on the account. Nobody is added twice, so fix the row marked below." : "Some of these people are already on the account. Nobody is added twice, so fix the rows marked below.";
  }
  return repeated === 1 ? "One row repeats something from another row. Fix it before adding anybody." : "Some rows repeat something from another row. Fix them before adding anybody.";
};
const explainTakenEmail = (email, roster) => {
  const wanted = normaliseEmail(email);
  if (!wanted) return "";
  const here = (Array.isArray(roster) ? roster : []).find(
    (person) => normaliseEmail(person?.email) === wanted
  );
  if (here) {
    return `${nameOfPerson(here)} already signs in with ${wanted}${placeOf(here)}. A person belongs to one location, so they cannot be added a second time \u2014 open them on the People page and change their location instead.`;
  }
  return `${wanted} is already in use, but not by anybody in your company \u2014 the platform checks the address against every organisation it hosts. This person will need a different address here.`;
};
var invite_duplicates_default = findInviteClashes;

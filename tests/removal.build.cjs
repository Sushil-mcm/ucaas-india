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
var removal_impact_exports = {};
__export(removal_impact_exports, {
  blocksRemoval: () => blocksRemoval,
  checkRemoval: () => checkRemoval,
  countByLevel: () => countByLevel,
  isAdmin: () => isAdmin,
  isSamePerson: () => isSamePerson,
  nameOf: () => nameOf,
  sortImpacts: () => sortImpacts,
  summarise: () => summarise
});
module.exports = __toCommonJS(removal_impact_exports);
const idsOf = (person) => {
  const ids = /* @__PURE__ */ new Set();
  [person?.uuid, person?.user_uuid].forEach((id) => {
    const value = String(id ?? "").trim();
    if (value) ids.add(value);
  });
  return ids;
};
const extensionOf = (person) => String(person?.extension ?? "").trim();
const nameOf = (person) => {
  const full = `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim();
  return full || String(person?.email ?? "").trim() || "this person";
};
const isMember = (member, ids, extension) => {
  if (!member) return false;
  if (ids.has(String(member.user_uuid ?? "").trim())) return true;
  if (ids.has(String(member.uuid ?? "").trim())) return true;
  return extension !== "" && String(member.extension ?? "").trim() === extension;
};
const keysOf = (ivr) => {
  const rows = ivr?.ivrActions ?? ivr?.ivr_option ?? [];
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    key: String(row?.key?.value ?? row?.key ?? "").trim(),
    type: String(row?.forwardType?.value ?? row?.type ?? "").trim().toUpperCase(),
    value: String(row?.forwardValue?.value ?? row?.value ?? "").trim()
  }));
};
const isAdmin = (person) => {
  const role = person?.custom_role_data?.name || person?.role_data?.name || person?.role || "";
  return String(role).toUpperCase() === "ADMIN";
};
const isSamePerson = (a, b) => {
  const aIds = idsOf(a);
  const bIds = idsOf(b);
  if ([...aIds].some((id) => bIds.has(id))) return true;
  const aEmail = String(a?.email ?? "").trim().toLowerCase();
  const bEmail = String(b?.email ?? "").trim().toLowerCase();
  if (aEmail !== "" && aEmail === bEmail) return true;
  return false;
};
const checkRemoval = ({
  person,
  everyone = [],
  queues = [],
  ivrs = [],
  numbers = [],
  departments = []
}) => {
  const found = [];
  if (!person) return found;
  const ids = idsOf(person);
  const extension = extensionOf(person);
  const who = nameOf(person);
  if (isAdmin(person)) {
    found.push({
      code: "admin-refused",
      level: "refused",
      message: `${who} is an administrator, and the platform will not remove an administrator \u2014 the request comes back refused. Change their role to something else first, then remove them.`
    });
    const otherAdmins = everyone.filter((p) => isAdmin(p) && !isSamePerson(p, person));
    if (otherAdmins.length === 0) {
      found.push({
        code: "last-admin",
        level: "locks-you-out",
        message: `${who} is your only administrator. Removing them leaves nobody who can add people, buy numbers or change how calls are handled \u2014 and no one inside the company can undo it.`
      });
    }
  }
  queues.forEach((queue) => {
    const members = Array.isArray(queue?.members) ? queue.members : [];
    if (!members.some((m) => isMember(m, ids, extension))) return;
    const remaining = members.filter((m) => !isMember(m, ids, extension)).length;
    const where = String(queue?.name ?? "a queue");
    if (remaining === 0) {
      found.push({
        code: "queue-last-agent",
        level: "stops-calls",
        message: `${who} is the only person answering ${where}. Remove them and callers who reach that queue wait with nobody to pick up.`,
        where
      });
    } else {
      found.push({
        code: "queue-member",
        level: "worth-knowing",
        message: `They answer calls for ${where}. ${remaining} other ${remaining === 1 ? "person stays" : "people stay"} on it.`,
        where
      });
    }
  });
  ivrs.forEach((ivr) => {
    keysOf(ivr).forEach((row) => {
      const pointsAtPerson = (row.type === "EXTENSION" || row.type === "VOICEMAIL") && extension !== "" && row.value === extension;
      if (!pointsAtPerson) return;
      const where = String(ivr?.name ?? "a menu");
      const pressed = row.key === "#" || row.key === "*" ? row.key : `key ${row.key}`;
      found.push({
        code: "ivr-target",
        level: "stops-calls",
        message: `${where} sends callers who press ${pressed} to their extension. After they are removed, that key reaches nobody \u2014 point it somewhere else first.`,
        where
      });
    });
  });
  numbers.forEach((entry) => {
    const type = String(entry?.forward_type ?? "").toUpperCase();
    const value = String(entry?.forward_value ?? "").trim();
    const pointsAtPerson = (type === "EXTENSION" || type === "VOICEMAIL") && extension !== "" && value === extension;
    if (!pointsAtPerson) return;
    const where = String(entry?.did_number ?? entry?.number ?? "a number");
    found.push({
      code: "number-forwarding",
      level: "stops-calls",
      message: `Calls to ${where} go to their extension. Removing them leaves that number ringing out \u2014 send it somewhere else first.`,
      where
    });
  });
  departments.forEach((dept) => {
    const members = Array.isArray(dept?.members) ? dept.members : [];
    if (!members.some((m) => isMember(m, ids, extension))) return;
    const remaining = members.filter((m) => !isMember(m, ids, extension)).length;
    const where = String(dept?.name ?? "a group");
    if (remaining === 0) {
      found.push({
        code: "department-last-member",
        level: "stops-calls",
        message: `${who} is the last person in ${where}. Calls sent to that group will reach nobody.`,
        where
      });
    } else {
      found.push({
        code: "department-member",
        level: "worth-knowing",
        message: `They are in ${where}, along with ${remaining} ${remaining === 1 ? "other" : "others"}.`,
        where
      });
    }
  });
  const ownNumber = String(person?.caller_id ?? "").trim();
  if (ownNumber) {
    found.push({
      code: "keeps-a-number",
      level: "worth-knowing",
      /* Not "released": released numbers are the ones that have left the account
         altogether. This one stays on the account and stays on the bill — it
         simply stops being assigned to anybody, and turns up under Unused
         numbers. Sending an admin to the wrong screen to find it is how a paid
         number goes missing for a month. */
      message: `${ownNumber} is assigned to them. It stays on the account and turns up under Unused numbers, where it can be given to somebody else \u2014 you keep paying for it either way. Nothing records that this person was the last to hold it.`,
      where: ownNumber
    });
  }
  return found;
};
const ORDER = {
  /* A closed door goes above everything, including the lockout: there is no
     point weighing consequences of something that is not going to happen. */
  refused: 0,
  "locks-you-out": 1,
  "stops-calls": 2,
  "worth-knowing": 3
};
const sortImpacts = (impacts) => [...impacts].sort((a, b) => ORDER[a.level] - ORDER[b.level]);
const blocksRemoval = (impacts) => impacts.some((i) => i.level === "locks-you-out" || i.level === "refused");
const countByLevel = (impacts, level) => impacts.filter((i) => i.level === level).length;
const summarise = (impacts) => {
  if (impacts.some((i) => i.level === "refused"))
    return "The platform will not do this. There is a way round it below.";
  if (blocksRemoval(impacts)) return "This cannot be undone from inside the product.";
  const breaks = countByLevel(impacts, "stops-calls");
  if (breaks > 0) {
    return breaks === 1 ? "One thing will stop working when they are removed." : `${breaks} things will stop working when they are removed.`;
  }
  if (impacts.length > 0) return "Nothing will stop working. A few things change.";
  return "Nothing else points at this person. Removing them changes nothing else.";
};

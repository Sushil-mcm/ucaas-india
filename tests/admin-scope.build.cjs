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
var admin_scope_exports = {};
__export(admin_scope_exports, {
  TIERS: () => TIERS,
  canActOn: () => canActOn,
  canEditScope: () => canEditScope,
  checkScope: () => checkScope,
  coverageOf: () => coverageOf,
  describeScope: () => describeScope,
  isScopeSaveable: () => isScopeSaveable,
  normaliseScope: () => normaliseScope,
  readScopes: () => readScopes,
  scopeFor: () => scopeFor
});
module.exports = __toCommonJS(admin_scope_exports);
const TIERS = [
  {
    tier: "company",
    label: "Whole company",
    description: "Every office, every department and every person. The widest there is."
  },
  {
    tier: "location",
    label: "Chosen offices",
    description: "The people, departments and numbers that belong to the offices you pick. One office for an office manager, several for somebody who covers a region."
  },
  {
    tier: "department",
    label: "Chosen departments",
    description: "One department or call queue and the people in it. Nothing about the office around it."
  }
];
const clean = (list) => {
  if (!Array.isArray(list)) return [];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  list.forEach((item) => {
    const value = typeof item === "string" ? item.trim() : "";
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
};
const isTier = (value) => value === "company" || value === "location" || value === "department";
const normaliseScope = (raw) => {
  const source = raw && typeof raw === "object" ? raw : {};
  const tier = isTier(source.tier) ? source.tier : "department";
  return {
    personUuid: typeof source.personUuid === "string" ? source.personUuid.trim() : "",
    tier,
    locationUuids: tier === "location" ? clean(source.locationUuids) : [],
    departmentUuids: tier === "department" ? clean(source.departmentUuids) : []
  };
};
const nameOf = (list, uuid) => list.find((item) => item.uuid === uuid)?.name || "a deleted entry";
const checkScope = (scope, directory) => {
  const problems = [];
  const locations = directory?.locations || [];
  const departments = directory?.departments || [];
  if (!scope.personUuid) {
    problems.push({ field: "person", message: "Choose who this applies to.", blocking: true });
  }
  if (scope.tier === "location") {
    if (scope.locationUuids.length === 0) {
      problems.push({
        field: "locations",
        message: "Pick at least one office, or this administrator covers nobody at all.",
        blocking: true
      });
    }
    const known = new Set(locations.map((item) => item.uuid));
    scope.locationUuids.filter((uuid) => !known.has(uuid)).forEach((uuid) => {
      problems.push({
        field: "locations",
        message: `An office on this list no longer exists (${uuid}). Remove it.`,
        blocking: true
      });
    });
    if (locations.length > 0 && scope.locationUuids.length === locations.length) {
      problems.push({
        field: "tier",
        message: 'This covers every office you have, which is the same as the whole company. Use "Whole company" so it stays true when you open the next office.',
        blocking: false
      });
    }
  }
  if (scope.tier === "department") {
    if (scope.departmentUuids.length === 0) {
      problems.push({
        field: "departments",
        message: "Pick at least one department, or this administrator covers nobody at all.",
        blocking: true
      });
    }
    const known = new Set(departments.map((item) => item.uuid));
    scope.departmentUuids.filter((uuid) => !known.has(uuid)).forEach((uuid) => {
      problems.push({
        field: "departments",
        message: `A department on this list no longer exists (${uuid}). Remove it.`,
        blocking: true
      });
    });
  }
  return problems;
};
const isScopeSaveable = (problems) => !problems.some((problem) => problem.blocking);
const canActOn = (scope, target) => {
  const what = target?.name ? `"${target.name}"` : `this ${target?.kind || "item"}`;
  if (scope.tier === "company") {
    return { allowed: true, reason: "Covers the whole company." };
  }
  if (target.kind === "company") {
    return {
      allowed: false,
      reason: "Company-wide settings can only be changed by an administrator over the whole company."
    };
  }
  if (scope.tier === "location") {
    const covered2 = new Set(scope.locationUuids);
    if (target.kind === "location") {
      return covered2.has(String(target.uuid)) ? { allowed: true, reason: `${what} is one of the offices you manage.` } : { allowed: false, reason: `${what} is not one of the offices you manage.` };
    }
    if (!target.locationUuid) {
      return {
        allowed: false,
        reason: `We cannot tell which office ${what} belongs to, so it is left alone. Set an office on it first.`
      };
    }
    return covered2.has(target.locationUuid) ? { allowed: true, reason: `${what} belongs to an office you manage.` } : { allowed: false, reason: `${what} belongs to an office you do not manage.` };
  }
  const covered = new Set(scope.departmentUuids);
  if (target.kind === "location") {
    return {
      allowed: false,
      reason: "Office settings are wider than the departments you manage."
    };
  }
  if (target.kind === "department") {
    return covered.has(String(target.uuid)) ? { allowed: true, reason: `${what} is one of the departments you manage.` } : { allowed: false, reason: `${what} is not one of the departments you manage.` };
  }
  const memberships = clean(target.departmentUuids);
  const shared = memberships.filter((uuid) => covered.has(uuid));
  if (shared.length > 0) {
    return { allowed: true, reason: `${what} is in a department you manage.` };
  }
  return {
    allowed: false,
    reason: memberships.length ? `${what} is not in any department you manage.` : `${what} is not in a department, so nobody with a department scope can manage them.`
  };
};
const coverageOf = (scope, people, directory) => {
  const list = Array.isArray(people) ? people : [];
  const departments = directory?.departments || [];
  const locations = directory?.locations || [];
  if (scope.tier === "company") {
    return {
      people: list.length,
      unplaced: 0,
      departments: departments.length,
      locations: locations.length,
      totalPeople: list.length
    };
  }
  const reached = list.filter(
    (person) => canActOn(scope, {
      kind: "person",
      locationUuid: person.locationUuid ?? null,
      departmentUuids: person.departmentUuids
    }).allowed
  );
  const unplaced = scope.tier === "location" ? list.filter((person) => !person.locationUuid).length : list.filter((person) => clean(person.departmentUuids).length === 0).length;
  return {
    people: reached.length,
    unplaced,
    departments: scope.tier === "department" ? scope.departmentUuids.length : departments.filter(
      (department) => !!department.locationUuid && scope.locationUuids.includes(String(department.locationUuid))
    ).length,
    locations: scope.tier === "location" ? scope.locationUuids.length : 0,
    totalPeople: list.length
  };
};
const describeScope = (scope, directory) => {
  if (scope.tier === "company") return "The whole company";
  if (scope.tier === "location") {
    if (scope.locationUuids.length === 0) return "No offices chosen yet";
    const names2 = scope.locationUuids.map((uuid) => nameOf(directory?.locations || [], uuid));
    if (names2.length <= 2) return names2.join(" and ");
    return `${names2[0]}, ${names2[1]} and ${names2.length - 2} more`;
  }
  if (scope.departmentUuids.length === 0) return "No departments chosen yet";
  const names = scope.departmentUuids.map((uuid) => nameOf(directory?.departments || [], uuid));
  if (names.length <= 2) return names.join(" and ");
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
};
const canEditScope = (editor, subject) => {
  if (editor.tier !== "company") {
    return {
      allowed: false,
      reason: "Only an administrator over the whole company can decide who administers what."
    };
  }
  if (editor.personUuid && editor.personUuid === subject.personUuid) {
    return {
      allowed: false,
      reason: "You cannot change what you yourself cover. Ask another company administrator."
    };
  }
  return { allowed: true, reason: "Allowed." };
};
const readScopes = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  raw.forEach((entry) => {
    const scope = normaliseScope(entry);
    if (!scope.personUuid || seen.has(scope.personUuid)) return;
    seen.add(scope.personUuid);
    out.push(scope);
  });
  return out;
};
const scopeFor = (scopes, personUuid) => (Array.isArray(scopes) ? scopes : []).find((scope) => scope.personUuid === personUuid) || null;

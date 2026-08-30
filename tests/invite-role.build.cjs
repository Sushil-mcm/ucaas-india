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

// src/lib/invite-role.ts
var invite_role_exports = {};
__export(invite_role_exports, {
  ADMINISTRATIVE_TIERS: () => ADMINISTRATIVE_TIERS,
  ADMIN_BY_DEFAULT_WARNING: () => ADMIN_BY_DEFAULT_WARNING,
  AUTO_CHOOSABLE_TIERS: () => AUTO_CHOOSABLE_TIERS,
  SPENDING_TIERS: () => SPENDING_TIERS,
  TIER_CHOICES: () => TIER_CHOICES,
  decideInviteRole: () => decideInviteRole,
  default: () => invite_role_default,
  describeRole: () => describeRole,
  roleChoices: () => roleChoices,
  roleWarning: () => roleWarning,
  safestAutoRole: () => safestAutoRole,
  toRoleChoice: () => toRoleChoice,
  willBecomeAdminByDefault: () => willBecomeAdminByDefault
});
module.exports = __toCommonJS(invite_role_exports);

// src/lib/role-permission-defaults.ts
var TIERS = [
  {
    tier: "company_admin",
    label: "Company Admin",
    scope: "company",
    description: "The whole company, money included. Buys numbers, changes the plan, pays the bill, adds locations, and can do everything below.",
    boundary: "Nothing is held back. Give this to as few people as the company can manage with.",
    aliases: ["admin", "administrator", "owner", "company admin", "super admin"]
  },
  {
    tier: "location_admin",
    label: "Location Admin",
    scope: "location",
    description: "Runs one or more locations day to day: adds and removes people, sets up call handling, hands out numbers, connects other software, reads the reports.",
    boundary: "No spending and no changing the shape of the account \u2014 no buying numbers, no plan changes, no billing, no new locations.",
    aliases: ["sub admin", "subadmin", "location admin", "site admin", "branch admin"]
  },
  {
    tier: "department_admin",
    label: "Department Admin",
    scope: "department",
    description: "Runs one or more departments: their call handling, their opening hours, who is in them, and watching them work. Reads their reports and hears their recordings.",
    boundary: "Cannot create, delete or edit a person, cannot buy anything, and cannot connect other software.",
    aliases: [
      "manager",
      "department admin",
      "department manager",
      "group admin",
      "team manager",
      "team lead"
    ]
  },
  {
    tier: "supervisor",
    label: "Supervisor",
    scope: "department",
    description: "Watches a department while it works \u2014 sees who is on a call, listens in, whispers, takes a call over, and reads the department\u2019s reports.",
    boundary: "Changes no settings at all. No call handling, no hours, no adding people. Watching, not configuring.",
    aliases: ["supervisor", "floor supervisor", "team supervisor"]
  },
  {
    tier: "agent",
    label: "Agent",
    scope: "self",
    description: "Takes and makes calls as part of a department, with the tools that go with it \u2014 the dialler, campaigns, messaging and the shared inbox.",
    boundary: "Sees their own calls and nobody else\u2019s. No live supervision, no other people\u2019s recordings, no settings.",
    aliases: ["agent", "contact centre agent", "contact center agent", "operator"]
  },
  {
    tier: "user",
    label: "User",
    scope: "self",
    description: "Somebody with a phone: calls, messages, chat, contacts, video, voicemail, and their own settings.",
    boundary: "Their own line and their own data. Nothing about anybody else, and nothing administrative.",
    aliases: ["user", "member", "employee", "standard user", "everyday user"]
  }
];
var TIER_BY_KEY = new Map(TIERS.map((info) => [info.tier, info]));
var tierInfo = (tier) => TIER_BY_KEY.get(tier);
var flatten = (value) => String(value ?? "").toLowerCase().replace(/[\s_-]+/g, " ").trim();
var tierForRoleName = (name) => {
  const flat = flatten(name);
  if (!flat) return null;
  const exact = TIERS.find((info) => info.aliases.some((alias) => flatten(alias) === flat));
  return exact ? exact.tier : null;
};

// src/lib/invite-role.ts
var AUTO_CHOOSABLE_TIERS = ["user", "agent"];
var SPENDING_TIERS = ["company_admin"];
var ADMINISTRATIVE_TIERS = [
  "company_admin",
  "location_admin",
  "department_admin"
];
var idOf = (role) => String((String(role?.type || "").toLowerCase() === "custom" ? role?.uuid : role?.role_uuid) || "");
var isCustom = (role) => String(role?.type || "").toLowerCase() === "custom";
var toRoleChoice = (role) => {
  if (!role) return null;
  const id = idOf(role);
  const name = String(role?.name || "").trim();
  if (!id || !name) return null;
  return { id, name, custom: isCustom(role), tier: tierForRoleName(name) };
};
var roleChoices = (roles) => (Array.isArray(roles) ? roles : []).map(toRoleChoice).filter((choice) => Boolean(choice));
var safestAutoRole = (choices) => {
  for (const tier of AUTO_CHOOSABLE_TIERS) {
    const found = choices.find((choice) => choice.tier === tier);
    if (found) return found;
  }
  return null;
};
var describeRole = (role) => {
  if (!role) return "";
  if (!role.tier) {
    return `\u201C${role.name}\u201D is one of this account's own roles. What it allows is whatever its permissions currently hold \u2014 open it under Roles to see.`;
  }
  const info = tierInfo(role.tier);
  return `${info.description} ${info.boundary}`;
};
var roleWarning = (role) => {
  if (!role?.tier) return "";
  if (SPENDING_TIERS.includes(role.tier)) {
    return `Everybody you add with \u201C${role.name}\u201D can buy numbers, change the plan and pay the bill. Give it to as few people as the company can manage with.`;
  }
  if (ADMINISTRATIVE_TIERS.includes(role.tier)) {
    return `\u201C${role.name}\u201D administers other people \u2014 it can change their settings and, at this reach, remove them. That is more than most new starters need on day one.`;
  }
  return "";
};
var NO_ROLES = {
  role: null,
  source: "none",
  reason: "Roles are still loading.",
  warning: ""
};
var decideInviteRole = ({
  savedRoleId,
  roles
}) => {
  const choices = roleChoices(roles);
  if (!choices.length) return NO_ROLES;
  const saved = String(savedRoleId || "").trim();
  if (saved) {
    const picked = choices.find((choice) => choice.id === saved);
    if (picked) {
      return {
        role: picked,
        source: "company-choice",
        reason: `Your company starts new people on \u201C${picked.name}\u201D. Change it here for this person, or change it for everybody under Default permissions.`,
        warning: roleWarning(picked)
      };
    }
    const fallback = safestAutoRole(choices);
    if (fallback) {
      return {
        role: fallback,
        source: "safest-match",
        reason: `The role your company chose for new people no longer exists, so this falls back to \u201C${fallback.name}\u201D \u2014 the narrowest role on the account. Pick a new default under Default permissions.`,
        warning: roleWarning(fallback)
      };
    }
    return {
      role: null,
      source: "none",
      reason: "The role your company chose for new people no longer exists, and none of the remaining roles is named in a way that says what it is. Choose one below, then set a new default under Default permissions.",
      warning: ""
    };
  }
  const safest = safestAutoRole(choices);
  if (safest) {
    return {
      role: safest,
      source: "safest-match",
      reason: `Nobody has chosen what new people start on, so this uses \u201C${safest.name}\u201D \u2014 the narrowest role on the account. Set the answer once under Default permissions and everybody added after that starts there.`,
      warning: roleWarning(safest)
    };
  }
  return {
    role: null,
    source: "none",
    reason: "None of the roles on this account is named in a way that says what it is, so nothing is filled in for you. Choose a role below, then set a default under Default permissions so this is not a decision every time.",
    warning: ""
  };
};
var willBecomeAdminByDefault = (roleName) => !(typeof roleName === "string" && roleName.trim());
var ADMIN_BY_DEFAULT_WARNING = "This person has no role. Somebody created without one is stored as an administrator, with the whole company and the billing screen. Choose a role before adding them.";
var TIER_CHOICES = TIERS.map((info) => ({
  tier: info.tier,
  label: info.label,
  description: info.description
}));
var invite_role_default = decideInviteRole;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ADMINISTRATIVE_TIERS,
  ADMIN_BY_DEFAULT_WARNING,
  AUTO_CHOOSABLE_TIERS,
  SPENDING_TIERS,
  TIER_CHOICES,
  decideInviteRole,
  describeRole,
  roleChoices,
  roleWarning,
  safestAutoRole,
  toRoleChoice,
  willBecomeAdminByDefault
});

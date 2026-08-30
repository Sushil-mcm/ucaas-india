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
var role_permission_defaults_exports = {};
__export(role_permission_defaults_exports, {
  AREAS: () => AREAS,
  NEW_PERSON_ROLE_KEY: () => NEW_PERSON_ROLE_KEY,
  PER_PERSON_GAPS: () => PER_PERSON_GAPS,
  PRINCIPLES: () => PRINCIPLES,
  RULES: () => RULES,
  SCOPE_LABEL: () => SCOPE_LABEL,
  TIERS: () => TIERS,
  TIER_ORDER: () => TIER_ORDER,
  buildDefaultPermission: () => buildDefaultPermission,
  capabilityMatrix: () => capabilityMatrix,
  comparePermissions: () => comparePermissions,
  default: () => role_permission_defaults_default,
  hasAnyGrant: () => hasAnyGrant,
  readNewPersonRole: () => readNewPersonRole,
  tierForRoleName: () => tierForRoleName,
  tierInfo: () => tierInfo
});
module.exports = __toCommonJS(role_permission_defaults_exports);
const TIER_ORDER = [
  "company_admin",
  "location_admin",
  "department_admin",
  "supervisor",
  "agent",
  "user"
];
const SCOPE_LABEL = {
  company: "The whole company",
  location: "Chosen locations",
  department: "Chosen departments",
  self: "Themselves only"
};
const TIERS = [
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
const TIER_BY_KEY = new Map(TIERS.map((info) => [info.tier, info]));
const tierInfo = (tier) => TIER_BY_KEY.get(tier);
const flatten = (value) => String(value ?? "").toLowerCase().replace(/[\s_-]+/g, " ").trim();
const tierForRoleName = (name) => {
  const flat = flatten(name);
  if (!flat) return null;
  const exact = TIERS.find((info) => info.aliases.some((alias) => flatten(alias) === flat));
  return exact ? exact.tier : null;
};
const PRINCIPLES = [
  {
    id: "money",
    title: "Money and the shape of the account sit above ordinary administration",
    statement: "Buying a number, changing the plan, paying the bill, adding a location. Somebody who can quietly treble the monthly bill is not an administrator, they are a signatory. This is why the person who runs a location day to day still cannot buy."
  },
  {
    id: "identity",
    title: "Changing a person is different from changing their place in a department",
    statement: "Creating somebody, deleting them or changing their email address changes who they are, and belongs with whoever owns the staff list. Adding an existing person to a queue only changes their place in that queue, and belongs with whoever runs the queue. This one line separates a Location Admin from a Department Admin more cleanly than any list of screens."
  },
  {
    id: "supervision",
    title: "Supervision reaches further down than configuration",
    statement: "Listening to a live call or whispering to the person on it lasts one shift and is done by somebody standing with the department. Changing where calls go lasts until somebody changes it back and affects every caller. So a Supervisor gets the whole of the first and none of the second."
  },
  {
    id: "own_data",
    title: "Data defaults to your own calls only",
    statement: "Your own calls, your own recordings, your own numbers. Anybody else\u2019s is granted on purpose, to the few people whose job needs it. An agent who can search the whole company\u2019s recordings on their first day is a data-protection incident waiting for a reason."
  },
  {
    id: "the_job",
    title: "Nobody needs permission for the job they were hired to do",
    statement: "Making calls, sending messages, keeping contacts, recording a greeting, changing their own settings. A person\u2019s own settings are theirs \u2014 withholding them produces a support ticket on the first morning."
  }
];
const AREAS = [
  {
    area: "people",
    title: "People and identity",
    blurb: "Who exists, what they are called, and which locations the company has."
  },
  {
    area: "numbers",
    title: "Numbers",
    blurb: "Buying numbers, giving them out, and deciding where they ring."
  },
  {
    area: "call_handling",
    title: "Call handling",
    blurb: "Menus, queues, departments, opening hours, campaigns, and the tools of the job."
  },
  {
    area: "reporting",
    title: "Reporting and recordings",
    blurb: "What happened on the calls, and who may listen back to them."
  },
  {
    area: "supervision",
    title: "Live supervision",
    blurb: "Watching calls while they are happening, and stepping into them."
  },
  {
    area: "billing",
    title: "Billing and the account",
    blurb: "What the company pays, and the plan it pays for."
  }
];
const ALL = [
  "company_admin",
  "location_admin",
  "department_admin",
  "supervisor",
  "agent",
  "user"
];
const ADMINS = ["company_admin", "location_admin"];
const WATCHERS = [
  "company_admin",
  "location_admin",
  "department_admin",
  "supervisor"
];
const CONFIGURERS = ["company_admin", "location_admin", "department_admin"];
const WORKERS = [
  "company_admin",
  "location_admin",
  "department_admin",
  "supervisor",
  "agent"
];
const low = (path) => path.map((part) => String(part).toLowerCase());
const module_ = (path) => low(path)[0] || "";
const leaf = (path) => low(path)[path.length - 1] || "";
const has = (path, ...names) => {
  const parts = low(path);
  return names.some((name) => parts.includes(name.toLowerCase()));
};
const WRITE_VERBS = ["add", "edit", "update", "delete", "remove", "create", "assign", "release"];
const isWrite = (path) => WRITE_VERBS.includes(leaf(path));
const RULES = [
  /* --- Question 1: does it cost money, or reshape the account? ----------- */
  {
    id: "money",
    area: "billing",
    principle: "money",
    title: "Spending and the plan",
    why: "Billing, plan changes and call rates. Anybody who can change these can change what the company pays, so it stays with the account holder.",
    tiers: ["company_admin"],
    match: (path) => ["billing", "calling_rates", "payment", "plan"].includes(module_(path))
  },
  {
    id: "buy_numbers",
    area: "numbers",
    principle: "money",
    title: "Buying and giving up numbers",
    why: "Every number bought is on the next bill, and a number given up cannot always be got back. Same reason as the bill itself.",
    tiers: ["company_admin"],
    match: (path) => module_(path) === "virtual_numbers" && has(path, "buy", "release", "port")
  },
  {
    id: "offices",
    area: "people",
    principle: "money",
    title: "Locations",
    why: "Adding or changing a location changes the shape of the account and usually the contract. It sits with the account holder.",
    tiers: ["company_admin"],
    match: (path) => module_(path) === "account_setting" && has(path, "site")
  },
  /* --- Question 2: does it change the person, or their place in a team? -- */
  {
    id: "people_manage",
    area: "people",
    principle: "identity",
    title: "Creating and removing people",
    why: "Creating somebody, removing them or changing their details changes who they are, not what one department does. It belongs with whoever owns the staff list.",
    tiers: ADMINS,
    match: (path) => module_(path) === "account_setting" && has(path, "user") && isWrite(path)
  },
  {
    id: "people_view",
    area: "people",
    principle: "identity",
    title: "Seeing the list of people",
    why: "A department admin or supervisor has to be able to find their own people. Looking at the staff list changes nothing.",
    tiers: WATCHERS,
    match: (path) => module_(path) === "account_setting" && has(path, "user")
  },
  {
    id: "account_rest",
    area: "people",
    principle: "money",
    title: "Company settings",
    why: "Everything else on the company record is a company-wide decision, so it stays with the account holder.",
    tiers: ["company_admin"],
    match: (path) => module_(path) === "account_setting"
  },
  {
    id: "numbers_assign",
    area: "numbers",
    principle: "identity",
    title: "Giving out numbers and forwarding",
    why: "Deciding whose phone a number rings is part of running a location. It costs nothing, so it does not need the account holder.",
    tiers: ADMINS,
    match: (path) => module_(path) === "virtual_numbers" && (isWrite(path) || has(
      path,
      "assign_number",
      "set_forwarding",
      "update_forwarding",
      "remove_forwarding"
    ))
  },
  {
    id: "numbers_view",
    area: "numbers",
    principle: "the_job",
    title: "Seeing the company\u2019s numbers",
    why: "Somebody setting up a queue needs to know which numbers exist. Looking at the list buys nothing.",
    tiers: CONFIGURERS,
    match: (path) => module_(path) === "virtual_numbers"
  },
  /* --- Question 3: configuration, or supervision? ------------------------ */
  {
    id: "supervision",
    area: "supervision",
    principle: "supervision",
    title: "Watching calls as they happen",
    why: "Listening in, whispering, taking a call over and seeing who is busy last one shift. This is the job of whoever is standing with the department, so it goes further down than any setting does.",
    tiers: WATCHERS,
    match: (path) => ["monitoring", "monitoring_features"].includes(module_(path))
  },
  {
    id: "phone_config",
    area: "call_handling",
    principle: "supervision",
    title: "Call handling, menus, queues and hours",
    why: "These last until somebody changes them back and affect every caller. Changing them is a department admin\u2019s job; a supervisor watches the department without reshaping it.",
    tiers: CONFIGURERS,
    match: (path) => module_(path) === "phone_system_action" && isWrite(path)
  },
  {
    id: "phone_view",
    area: "call_handling",
    principle: "the_job",
    title: "Seeing how calls are handled",
    why: "An agent should be able to see which queue they are in and when it is open, without being able to change it.",
    tiers: WORKERS,
    match: (path) => module_(path) === "phone_system_action"
  },
  {
    id: "integrations",
    area: "call_handling",
    principle: "money",
    title: "Connecting other software",
    why: "A connection sends the company\u2019s call data to somebody else\u2019s system. That is an account-wide decision even though it costs nothing here.",
    tiers: ADMINS,
    match: (path) => ["integration", "integrations"].includes(module_(path))
  },
  {
    id: "ai_setup",
    area: "call_handling",
    principle: "money",
    title: "Setting up the AI assistants",
    why: "An assistant answers the company\u2019s calls in the company\u2019s words, and reads whatever it is trained on. Setting one up is an account-wide decision.",
    tiers: ADMINS,
    match: (path) => module_(path) === "ai" && (has(path, "action") || isWrite(path))
  },
  {
    id: "ai_use",
    area: "call_handling",
    principle: "the_job",
    title: "Using the AI assistants",
    why: "Help on your own call is part of doing the job, so everybody gets it if the plan includes it.",
    tiers: ALL,
    match: (path) => module_(path) === "ai"
  },
  /* --- Question 4: whose data is it? ------------------------------------- */
  {
    id: "recordings",
    area: "reporting",
    principle: "own_data",
    title: "Other people\u2019s recordings and transcripts",
    why: "A recording is a conversation somebody else had. Hearing it is granted on purpose, to the few people whose job needs it, and never handed out with the phone.",
    tiers: WATCHERS,
    match: (path) => module_(path) === "advance_call_management" || has(path, "recording", "transcription", "call_recording_listen")
  },
  {
    id: "reports_all",
    area: "reporting",
    principle: "own_data",
    title: "Reports on the whole company",
    why: "Everybody\u2019s calls and messages in one place. That is a company-wide view and belongs with the people who run the company.",
    tiers: ADMINS,
    match: (path) => module_(path) === "reports" && leaf(path) === "all"
  },
  {
    id: "reports_team",
    area: "reporting",
    principle: "own_data",
    title: "Reports on a department",
    why: "A department admin and a supervisor need their own department\u2019s figures to do the job. They do not need the sales department\u2019s.",
    tiers: WATCHERS,
    match: (path) => module_(path) === "reports" && leaf(path) === "team"
  },
  {
    id: "reports_own",
    area: "reporting",
    principle: "the_job",
    title: "Your own reports",
    why: "Seeing how your own day went is not a privilege, and withholding it is the fastest way to be asked for it.",
    tiers: ALL,
    match: (path) => module_(path) === "reports"
  },
  /* --- Question 5: is it just doing the job? ----------------------------- */
  {
    id: "campaign_config",
    area: "call_handling",
    principle: "supervision",
    title: "Setting up campaigns and diallers",
    why: "A campaign decides who the company rings and how often. Building one is a department admin\u2019s job; working one is an agent\u2019s.",
    tiers: CONFIGURERS,
    match: (path) => ["campaign", "auto_dialer"].includes(module_(path)) && isWrite(path)
  },
  {
    id: "campaign_work",
    area: "call_handling",
    principle: "the_job",
    title: "Working a campaign",
    why: "The dialler is the tool of the job for an agent, so they get it without asking.",
    tiers: WORKERS,
    match: (path) => ["campaign", "auto_dialer"].includes(module_(path))
  },
  {
    id: "shared_inbox",
    area: "call_handling",
    principle: "the_job",
    title: "The shared inbox",
    why: "Answering the company\u2019s social and messaging channels is the job of the department that answers them.",
    tiers: WORKERS,
    match: (path) => module_(path) === "omni_channel"
  },
  {
    id: "the_job",
    area: "call_handling",
    principle: "the_job",
    title: "The phone, and the tools that go with it",
    why: "Calling, messaging, chat, contacts, video, voicemail and your own settings. Nobody needs permission for the thing they were hired to do.",
    tiers: ALL,
    match: (path) => [
      "chat",
      "contact",
      "contacts",
      "messages",
      "video",
      "settings",
      "phone_system",
      "phone_system_services",
      "voicemail",
      "meeting",
      "meetings"
    ].includes(module_(path))
  }
];
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const buildDefaultPermission = (companyFeatures, tier) => {
  const source = isPlainObject(companyFeatures) ? companyFeatures : {};
  const usedRules = /* @__PURE__ */ new Set();
  const blockedRules = /* @__PURE__ */ new Set();
  const undecided = [];
  let total = 0;
  let granted = 0;
  const walk = (node, path) => {
    const out = {};
    Object.keys(node).forEach((key) => {
      const value = node[key];
      const here = [...path, key];
      if (isPlainObject(value)) {
        out[key] = walk(value, here);
        return;
      }
      if (typeof value !== "boolean") {
        out[key] = value;
        return;
      }
      if (key === "IS_SHOW") {
        out[key] = false;
        return;
      }
      total += 1;
      if (value !== true) {
        out[key] = false;
        return;
      }
      const rule = RULES.find((candidate) => candidate.match(here));
      if (!rule) {
        out[key] = false;
        undecided.push(here.join("."));
        return;
      }
      if (rule.tiers.includes(tier)) {
        out[key] = true;
        granted += 1;
        usedRules.add(rule.id);
      } else {
        out[key] = false;
        blockedRules.add(rule.id);
      }
    });
    return out;
  };
  const permission = walk(source, []);
  Object.keys(permission).forEach((moduleKey) => {
    const branch = permission[moduleKey];
    if (!isPlainObject(branch) || !("IS_SHOW" in branch)) return;
    const planShows = source?.[moduleKey]?.IS_SHOW !== false;
    branch.IS_SHOW = planShows && hasAnyGrant(branch);
  });
  return {
    permission,
    total,
    granted,
    allowed: RULES.filter((rule) => usedRules.has(rule.id)),
    withheld: RULES.filter((rule) => blockedRules.has(rule.id) && !usedRules.has(rule.id)),
    undecided
  };
};
const hasAnyGrant = (node) => {
  if (!isPlainObject(node)) return node === true;
  return Object.keys(node).some((key) => {
    if (key === "IS_SHOW") return false;
    const value = node[key];
    return isPlainObject(value) ? hasAnyGrant(value) : value === true;
  });
};
const collectLeaves = (node, path, into) => {
  if (!isPlainObject(node)) return;
  Object.keys(node).forEach((key) => {
    if (key === "IS_SHOW") return;
    const value = node[key];
    const here = [...path, key];
    if (isPlainObject(value)) {
      collectLeaves(value, here, into);
    } else if (typeof value === "boolean") {
      into.set(here.join("."), value);
    }
  });
};
const comparePermissions = (current, proposed) => {
  const before = /* @__PURE__ */ new Map();
  const after = /* @__PURE__ */ new Map();
  collectLeaves(current, [], before);
  collectLeaves(proposed, [], after);
  const paths = /* @__PURE__ */ new Set([...before.keys(), ...after.keys()]);
  const differences = [];
  [...paths].sort().forEach((path) => {
    const was = before.get(path) === true;
    const will = after.get(path) === true;
    if (was === will) return;
    differences.push({ path, kind: was ? "extra" : "missing" });
  });
  return differences;
};
const PER_PERSON_GAPS = [
  {
    id: "international",
    label: "Allow this person to dial abroad",
    why: "Normally off for a new person and switched on one at a time, because international calls are where a stolen password costs real money. There is no per-person switch here yet \u2014 a company-wide rule is the only control."
  },
  {
    id: "own_recordings",
    label: "Let this person hear their own recordings",
    why: "Usually separate from hearing anybody else\u2019s. Here the two are the same tick box, so granting one grants both."
  },
  {
    id: "self_service",
    label: "Which of their own settings a person may change",
    why: "Established systems let an administrator lock a person\u2019s own voicemail, hours or ring time to read-only. There is no such lock here, so anybody can change their own."
  },
  {
    id: "sign_in_as",
    label: "Sign in as this person to help them",
    why: "A support power kept away from ordinary administrators. Not available here at all, which is safer but slower."
  }
];
const capabilityMatrix = () => AREAS.map((area) => ({
  ...area,
  rows: RULES.filter((rule) => rule.area === area.area).map((rule) => ({
    rule,
    cells: TIER_ORDER.map((tier) => ({ tier, allowed: rule.tiers.includes(tier) }))
  }))
})).filter((section) => section.rows.length > 0);
const NEW_PERSON_ROLE_KEY = "new_person_default_role";
const readNewPersonRole = (raw) => typeof raw === "string" && raw.trim() ? raw.trim() : "";
var role_permission_defaults_default = buildDefaultPermission;

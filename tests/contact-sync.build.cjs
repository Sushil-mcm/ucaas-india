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

// src/lib/contact-sync.ts
var contact_sync_exports = {};
__export(contact_sync_exports, {
  describeSyncPlan: () => describeSyncPlan,
  mergeIncoming: () => mergeIncoming,
  planContactSync: () => planContactSync,
  syncPayload: () => syncPayload,
  syncWouldChangeAnything: () => syncWouldChangeAnything,
  tidyIncoming: () => tidyIncoming
});
module.exports = __toCommonJS(contact_sync_exports);

// src/lib/contact-blocking.ts
var numberDigits = (raw) => String(raw ?? "").replace(/\D/g, "");
var matchKey = (raw) => {
  const digits = numberDigits(raw);
  return digits.length > 9 ? digits.slice(-9) : digits;
};

// src/lib/contact-sync.ts
var storedName = (contact) => `${contact?.name?.first || ""} ${contact?.name?.last || ""}`.trim();
var tidyIncoming = (raw) => ({
  name: String(raw?.name ?? "").replace(/\s+/g, " ").trim(),
  phone: String(raw?.phone ?? "").trim(),
  email: String(raw?.email ?? "").trim().toLowerCase() || void 0,
  externalId: String(raw?.externalId ?? "").trim() || void 0
});
var mergeIncoming = (incoming) => {
  const byNumber = /* @__PURE__ */ new Map();
  const noNumber = [];
  let mergedDuplicates = 0;
  incoming.forEach((contact) => {
    const key = matchKey(contact.phone);
    if (!key) {
      noNumber.push(contact);
      return;
    }
    const existing = byNumber.get(key);
    if (!existing) {
      byNumber.set(key, contact);
      return;
    }
    mergedDuplicates += 1;
    byNumber.set(key, {
      /* Longer name wins rather than first-wins: "Jo" and "Jo Baxter" are the
         same person, and the second is the one worth keeping. */
      name: contact.name.length > existing.name.length ? contact.name : existing.name,
      phone: existing.phone,
      email: existing.email || contact.email,
      externalId: existing.externalId || contact.externalId
    });
  });
  return { merged: [...byNumber.values(), ...noNumber], mergedDuplicates };
};
var planContactSync = (rawIncoming, stored) => {
  const { merged, mergedDuplicates } = mergeIncoming((rawIncoming || []).map(tidyIncoming));
  const storedByNumber = /* @__PURE__ */ new Map();
  (stored || []).forEach((contact) => {
    const key = matchKey(contact?.contact?.phone);
    if (key && !storedByNumber.has(key)) storedByNumber.set(key, contact);
  });
  const entries = merged.map((incoming) => {
    const digits = numberDigits(incoming.phone);
    if (!digits) {
      return {
        outcome: "skipped",
        incoming,
        reason: "No phone number."
      };
    }
    if (digits.length < 7) {
      return {
        outcome: "skipped",
        incoming,
        reason: "The number is too short to dial."
      };
    }
    const matched = storedByNumber.get(matchKey(incoming.phone));
    if (!matched) {
      return { outcome: "create", incoming };
    }
    const changes = [];
    if (incoming.name && incoming.name !== storedName(matched)) changes.push("name");
    if (incoming.email && incoming.email !== (matched?.contact?.email || "").toLowerCase())
      changes.push("email");
    if (!changes.length) {
      return { outcome: "unchanged", incoming, matched };
    }
    return {
      outcome: "update",
      incoming,
      matched,
      reason: `${changes.join(" and ")} would change`
    };
  });
  return {
    entries,
    create: entries.filter((entry) => entry.outcome === "create"),
    update: entries.filter((entry) => entry.outcome === "update"),
    unchanged: entries.filter((entry) => entry.outcome === "unchanged"),
    skipped: entries.filter((entry) => entry.outcome === "skipped"),
    mergedDuplicates
  };
};
var syncPayload = (plan) => [...plan.create, ...plan.update].map((entry) => ({
  name: entry.incoming.name || "Unknown",
  phone: entry.incoming.phone,
  ...entry.incoming.email ? { email: entry.incoming.email } : {},
  ...entry.incoming.externalId ? { external_id: entry.incoming.externalId } : {}
}));
var describeSyncPlan = (plan) => {
  const parts = [];
  if (plan.create.length) parts.push(`${plan.create.length} new`);
  if (plan.update.length) parts.push(`${plan.update.length} to update`);
  if (plan.unchanged.length) parts.push(`${plan.unchanged.length} already up to date`);
  if (plan.skipped.length) parts.push(`${plan.skipped.length} without a usable number`);
  if (!parts.length) return "There was nothing to bring in.";
  if (!plan.create.length && !plan.update.length)
    return `Nothing to change \u2014 ${parts.join(", ")}.`;
  return `${parts.join(", ")}.`;
};
var syncWouldChangeAnything = (plan) => plan.create.length > 0 || plan.update.length > 0;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  describeSyncPlan,
  mergeIncoming,
  planContactSync,
  syncPayload,
  syncWouldChangeAnything,
  tidyIncoming
});

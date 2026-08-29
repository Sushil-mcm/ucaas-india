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
var ivr_menu_checks_exports = {};
__export(ivr_menu_checks_exports, {
  checkIvrMenu: () => checkIvrMenu,
  hasBlockingIvrFinding: () => hasBlockingIvrFinding,
  readKeyActions: () => readKeyActions
});
module.exports = __toCommonJS(ivr_menu_checks_exports);
const readKeyActions = (menu) => {
  if (!menu) return [];
  const rows = menu.ivrActions ?? menu.ivr_option ?? [];
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    key: String(row?.key?.value ?? row?.key ?? "").trim(),
    type: String(row?.forwardType?.value ?? row?.type ?? "").trim(),
    value: String(row?.forwardValue?.value ?? row?.value ?? "").trim(),
    label: String(row?.forwardValue?.label ?? row?.label ?? "").trim()
  })).filter((row) => row.key !== "");
};
const describeKey = (key) => key === "#" || key === "*" ? key : `key ${key}`;
const findLoop = (startUuid, menusByUuid) => {
  const path = [];
  const seen = /* @__PURE__ */ new Set();
  let current = startUuid;
  while (current) {
    if (seen.has(current)) {
      return [...path.slice(path.indexOf(current)), current];
    }
    seen.add(current);
    path.push(current);
    const menu = menusByUuid.get(current);
    if (!menu) return null;
    const next = readKeyActions(menu).find(
      (row) => row.type === "IVR" && row.value && menusByUuid.has(row.value)
    );
    current = next?.value;
  }
  return null;
};
const checkIvrMenu = ({
  menu,
  allMenus,
  knownTargets
}) => {
  const findings = [];
  const actions = readKeyActions(menu);
  const seenKeys = /* @__PURE__ */ new Map();
  actions.forEach((row) => seenKeys.set(row.key, (seenKeys.get(row.key) ?? 0) + 1));
  [...seenKeys.entries()].filter(([, count]) => count > 1).forEach(([key, count]) => {
    findings.push({
      level: "error",
      code: "duplicate-key",
      key,
      message: `${describeKey(key)} is used ${count} times. A caller pressing it would get whichever one happens to be read first, so only one can stay.`
    });
  });
  if (actions.length === 0) {
    findings.push({
      level: "warning",
      code: "no-keys",
      message: "No key presses are set. The caller hears the menu and nothing they press does anything. That is fine for a message that ends the call, and a mistake otherwise."
    });
  }
  if (menu.uuid) {
    actions.filter((row) => row.type === "IVR" && row.value === menu.uuid).forEach((row) => {
      findings.push({
        level: "error",
        code: "points-at-itself",
        key: row.key,
        message: `${describeKey(row.key)} sends the caller back to this same menu, so pressing it does nothing but repeat. Point it at a queue, a person, or another menu.`
      });
    });
  }
  if (menu.uuid && Array.isArray(allMenus) && allMenus.length) {
    const byUuid = /* @__PURE__ */ new Map();
    allMenus.forEach((m) => m.uuid && byUuid.set(m.uuid, m));
    byUuid.set(menu.uuid, menu);
    const loop = findLoop(menu.uuid, byUuid);
    if (loop && loop.length > 2) {
      const names = loop.map((uuid) => byUuid.get(uuid)?.name || "a menu").join(" \u2192 ");
      findings.push({
        level: "error",
        code: "menu-loop",
        message: `These menus lead back to each other: ${names}. A caller following them never reaches a person. Break the ring by pointing one of them somewhere else.`
      });
    }
  }
  if (knownTargets) {
    actions.forEach((row) => {
      const list = knownTargets[row.type];
      if (!Array.isArray(list) || !row.value) return;
      if (!list.includes(row.value)) {
        findings.push({
          level: "error",
          code: "missing-target",
          key: row.key,
          message: `${describeKey(row.key)} points at ${row.label || "something"} that no longer exists. A caller pressing it would reach nothing.`
        });
      }
    });
  }
  const readFallback = (f) => ({
    status: String(f?.status ?? ""),
    type: String(f?.type?.value ?? f?.type ?? ""),
    value: String(f?.value?.value ?? f?.value ?? "")
  });
  [
    ["timeout_action", "presses nothing"],
    ["failure_action", "presses a key that is not set up"]
  ].forEach(([field, when]) => {
    const fb = readFallback(menu.generic?.[field]);
    if (!fb.status) {
      findings.push({
        level: "warning",
        code: "no-fallback",
        message: `Nothing is set for when the caller ${when}. Say what should happen, so they are not left listening to a menu that has stopped.`
      });
      return;
    }
    if (menu.uuid && fb.type === "IVR" && fb.value === menu.uuid) {
      findings.push({
        level: "error",
        code: "fallback-loops",
        message: `When the caller ${when}, this menu sends them back to itself. They would hear it again, do the same thing, and never get anywhere.`
      });
    }
  });
  const reachable = actions.filter((row) => row.type !== "IVR");
  if (actions.length > 0 && reachable.length === 0) {
    findings.push({
      level: "warning",
      code: "no-way-out",
      message: "Every key leads to another menu. Nothing here reaches a person, a queue or voicemail, so a caller can only move between menus."
    });
  }
  return findings;
};
const hasBlockingIvrFinding = (findings) => findings.some((f) => f.level === "error");

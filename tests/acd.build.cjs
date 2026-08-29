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
var acd_routing_exports = {};
__export(acd_routing_exports, {
  RINGABLE_STATES: () => RINGABLE_STATES,
  decideAcdRing: () => decideAcdRing,
  pickQueueForAgent: () => pickQueueForAgent
});
module.exports = __toCommonJS(acd_routing_exports);
const RINGABLE_STATES = ["available"];
const ratingOf = (agent) => typeof agent.rating === "number" ? agent.rating : 100;
const secondsUntilFree = (agent, now) => {
  if (agent.state !== "wrapping-up") return null;
  const wrap = agent.wrapUpSeconds ?? 0;
  const since = agent.idleSince ?? now;
  const remaining = since + wrap - now;
  return remaining > 0 ? remaining : 0;
};
const isRingable = (agent, now) => {
  if (agent.state === "available") return true;
  if (agent.state === "wrapping-up") return (secondsUntilFree(agent, now) ?? 1) <= 0;
  return false;
};
const stepAt = (steps, waitedSeconds) => {
  let elapsed = 0;
  for (let i = 0; i < steps.length - 1; i += 1) {
    elapsed += Math.max(0, steps[i].waitSeconds || 0);
    if (waitedSeconds < elapsed) {
      return { index: i, opensNextIn: elapsed - waitedSeconds };
    }
  }
  return { index: Math.max(0, steps.length - 1), opensNextIn: null };
};
const orderAgents = (agents, order, now) => {
  const copy = [...agents];
  switch (order) {
    case "longest-idle-first":
      return copy.sort((a, b) => (a.idleSince ?? now) - (b.idleSince ?? now));
    case "highest-rated-first":
      return copy.sort(
        (a, b) => ratingOf(b) - ratingOf(a) || (a.idleSince ?? now) - (b.idleSince ?? now)
      );
    case "fewest-calls-first":
    case "in-order":
    case "all-at-once":
    default:
      return copy;
  }
};
const decideAcdRing = ({
  rules,
  agents,
  waitedSeconds,
  now = Math.floor(Date.now() / 1e3)
}) => {
  const steps = rules.steps?.length ? rules.steps : [{ waitSeconds: 0 }];
  if (typeof rules.giveUpAfterSeconds === "number" && waitedSeconds >= rules.giveUpAfterSeconds) {
    return {
      ring: [],
      ringsTogether: false,
      step: steps.length,
      changesInSeconds: null,
      reason: `The caller has waited ${waitedSeconds}s, which is the longest this queue holds anybody. They should go to the failover rather than keep ringing.`
    };
  }
  const { index, opensNextIn } = stepAt(steps, waitedSeconds);
  const thresholds = steps.slice(0, index + 1).map((s) => typeof s.minimumRating === "number" ? s.minimumRating : 0);
  const threshold = Math.min(...thresholds);
  const eligible = agents.filter(
    (a) => isRingable(a, now) && ratingOf(a) >= threshold
  );
  const ring = orderAgents(eligible, rules.order, now);
  const candidates = [];
  if (opensNextIn !== null) candidates.push(opensNextIn);
  agents.forEach((a) => {
    const s = secondsUntilFree(a, now);
    if (s !== null && s > 0) candidates.push(s);
  });
  if (typeof rules.giveUpAfterSeconds === "number") {
    const left = rules.giveUpAfterSeconds - waitedSeconds;
    if (left > 0) candidates.push(left);
  }
  const changesInSeconds = candidates.length ? Math.min(...candidates) : null;
  const ringsTogether = rules.order === "all-at-once";
  let reason;
  if (ring.length === 0) {
    const wrapping = agents.filter((a) => a.state === "wrapping-up").length;
    const busy = agents.filter((a) => a.state === "busy" || a.state === "on-a-call").length;
    const off = agents.filter((a) => a.state === "off-duty").length;
    if (agents.length === 0) {
      reason = "Nobody is in this queue at all.";
    } else if (threshold > 0 && agents.some((a) => isRingable(a, now))) {
      reason = `People are free, but none are rated ${threshold} or above, which this step requires.`;
    } else {
      const parts = [
        wrapping ? `${wrapping} finishing notes` : "",
        busy ? `${busy} on other work` : "",
        off ? `${off} signed out` : ""
      ].filter(Boolean);
      reason = `Nobody can take it right now \u2014 ${parts.join(", ")}.`;
    }
  } else {
    const scope = threshold > 0 ? ` rated ${threshold} or above` : "";
    const names = ring.map((a) => a.name || "someone");
    const who = names.length <= 4 ? names.join(", ") : `${names.slice(0, 4).join(", ")} and ${names.length - 4} more`;
    const how = ringsTogether ? `Ringing ${ring.length} ${ring.length === 1 ? "person" : "people"} together` : ring.length === 1 ? "Ringing 1 person" : `Ringing one at a time, in this order`;
    const prefix = steps.length > 1 ? `Step ${index + 1} of ${steps.length}: ` : "";
    reason = `${prefix}${how}${scope}: ${who}.`;
  }
  return { ring, ringsTogether, step: index + 1, changesInSeconds, reason };
};
const pickQueueForAgent = (queues) => {
  if (!queues?.length) return null;
  return [...queues].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || (b.longestWaitSeconds ?? 0) - (a.longestWaitSeconds ?? 0)
  )[0];
};

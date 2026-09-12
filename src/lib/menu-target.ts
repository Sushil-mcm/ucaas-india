/* A menu key that also says what the caller needs.
 *
 * "Press 2 for Spanish" is a key that sends the caller to a queue AND marks
 * the call as needing the Spanish skill. The switch's menu renderer passes a
 * key's value straight through, so the skill travels inside the value:
 *
 *     "<queue uuid>~<skill id>"
 *
 * The dialplan splits it the same way (split_menu_skill in dialplan_service.py),
 * sets cc_selected_skill on the call, and the queue picker requires that skill
 * for this call on top of the queue's own. Only a queue can act on it. */
export const MENU_SKILL_SEPARATOR = '~';

export interface MenuTarget {
  /* The queue (or other target) uuid, without any skill. */
  target: string;
  /* The skill id the caller needs, or '' when the key does not ask for one. */
  skill: string;
}

export const splitMenuTarget = (value: unknown): MenuTarget => {
  const text = String(value ?? '').trim();
  const at = text.indexOf(MENU_SKILL_SEPARATOR);
  if (at < 0) return { target: text, skill: '' };
  return {
    target: text.slice(0, at).trim(),
    skill: text.slice(at + MENU_SKILL_SEPARATOR.length).trim(),
  };
};

export const joinMenuTarget = (target: unknown, skill?: unknown): string => {
  const base = String(target ?? '').trim();
  const extra = String(skill ?? '').trim();
  return base && extra ? `${base}${MENU_SKILL_SEPARATOR}${extra}` : base;
};

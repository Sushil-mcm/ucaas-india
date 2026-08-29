/* Checks a phone menu makes sense before it is saved.
 *
 * The form already refuses an empty key or a missing action. What it never
 * checked is whether the menu as a whole behaves — and those are the faults that
 * actually strand callers:
 *
 *   two rows on the same digit   the caller presses 2 and one of the two happens,
 *                                depending on which row the dialplan reads first
 *   a menu pointing at itself    press 3, hear the same menu, press 3 again,
 *                                forever
 *   a ring of menus              main → support → main. Harder to spot by eye
 *                                than pointing at yourself, and just as final
 *   no keys at all               the caller hears a menu and nothing they press
 *                                does anything
 *   a target that is gone        the queue the key pointed at was deleted, so
 *                                the press leads nowhere
 *
 * None of this needs the backend: it is all decidable from the menus themselves,
 * which is why it lives here as a plain function with its own tests rather than
 * inside a form.
 *
 * Findings are advice, not a gate. `error` means a caller will certainly get
 * stuck; `warning` means it is probably a mistake but there are real reasons
 * somebody might want it — a menu with no keys is a legitimate way to play a
 * message and hang up.
 */

export type IvrFindingLevel = 'error' | 'warning';

export interface IvrFinding {
  level: IvrFindingLevel;
  /* Stable identifier so a screen can highlight the right row. */
  code:
    | 'duplicate-key'
    | 'points-at-itself'
    | 'menu-loop'
    | 'no-keys'
    | 'missing-target'
    | 'no-way-out'
    | 'fallback-loops'
    | 'no-fallback';
  /* Plain sentence for an admin. Names the key where there is one. */
  message: string;
  /* Which key press this concerns, when it concerns one. */
  key?: string;
}

interface KeyAction {
  key: string;
  type: string;
  value: string;
  label?: string;
}

/* What happens when the caller does not press a usable key: nothing at all, or
   something that is not on the menu. Both end up here. */
export interface IvrFallback {
  status?: string;
  type?: { value?: string } | string;
  value?: { value?: string } | string;
}

export interface IvrMenuLike {
  uuid?: string;
  name?: string;
  /* The form nests these under `generic`; stored records keep the same names. */
  generic?: {
    timeout_action?: IvrFallback;
    failure_action?: IvrFallback;
  };
  /* Either the form shape (ivrActions) or the stored shape (ivr_option). */
  ivrActions?: any[];
  ivr_option?: any[];
}

/* Both shapes reduced to one. The form nests `{ label, value }`; the stored
   record is flat. Reading either means the checks work on a menu being edited
   and on the menus it points at, which arrive from the list in stored form. */
export const readKeyActions = (menu: IvrMenuLike | null | undefined): KeyAction[] => {
  if (!menu) return [];
  const rows = menu.ivrActions ?? menu.ivr_option ?? [];
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => ({
      key: String(row?.key?.value ?? row?.key ?? '').trim(),
      type: String(row?.forwardType?.value ?? row?.type ?? '').trim(),
      value: String(row?.forwardValue?.value ?? row?.value ?? '').trim(),
      label: String(row?.forwardValue?.label ?? row?.label ?? '').trim(),
    }))
    .filter((row) => row.key !== '');
};

const describeKey = (key: string) => (key === '#' || key === '*' ? key : `key ${key}`);

/* Walks menu-to-menu links from `startUuid` and reports the first ring it finds.
   Returns the path so the message can name the menus involved, which is the
   difference between "there is a loop somewhere" and a fault somebody can fix. */
const findLoop = (
  startUuid: string,
  menusByUuid: Map<string, IvrMenuLike>,
): string[] | null => {
  const path: string[] = [];
  const seen = new Set<string>();

  let current: string | undefined = startUuid;
  while (current) {
    if (seen.has(current)) {
      /* Trim to the ring itself - anything before the repeat is a lead-in, not
         part of the loop, and naming it would only confuse. */
      return [...path.slice(path.indexOf(current)), current];
    }
    seen.add(current);
    path.push(current);

    const menu = menusByUuid.get(current);
    if (!menu) return null;

    const next = readKeyActions(menu).find(
      (row) => row.type === 'IVR' && row.value && menusByUuid.has(row.value),
    );
    current = next?.value;
  }
  return null;
};

export interface CheckIvrInput {
  /* The menu being edited. */
  menu: IvrMenuLike;
  /* Every other menu, so links can be followed and missing targets spotted.
     Optional: without it, the link checks are skipped rather than guessed at. */
  allMenus?: IvrMenuLike[];
  /* Targets that exist, by type - queues, extensions and so on. Optional for
     the same reason: an unknown list is not the same as an empty one, and
     reporting everything as missing would be worse than reporting nothing. */
  knownTargets?: Partial<Record<string, string[]>>;
}

export const checkIvrMenu = ({
  menu,
  allMenus,
  knownTargets,
}: CheckIvrInput): IvrFinding[] => {
  const findings: IvrFinding[] = [];
  const actions = readKeyActions(menu);

  /* --- two rows on the same digit --- */
  const seenKeys = new Map<string, number>();
  actions.forEach((row) => seenKeys.set(row.key, (seenKeys.get(row.key) ?? 0) + 1));
  [...seenKeys.entries()]
    .filter(([, count]) => count > 1)
    .forEach(([key, count]) => {
      findings.push({
        level: 'error',
        code: 'duplicate-key',
        key,
        message: `${describeKey(key)} is used ${count} times. A caller pressing it would get whichever one happens to be read first, so only one can stay.`,
      });
    });

  /* --- nothing to press --- */
  if (actions.length === 0) {
    findings.push({
      level: 'warning',
      code: 'no-keys',
      message:
        'No key presses are set. The caller hears the menu and nothing they press does anything. That is fine for a message that ends the call, and a mistake otherwise.',
    });
  }

  /* --- pointing at itself --- */
  if (menu.uuid) {
    actions
      .filter((row) => row.type === 'IVR' && row.value === menu.uuid)
      .forEach((row) => {
        findings.push({
          level: 'error',
          code: 'points-at-itself',
          key: row.key,
          message: `${describeKey(row.key)} sends the caller back to this same menu, so pressing it does nothing but repeat. Point it at a queue, a person, or another menu.`,
        });
      });
  }

  /* --- a ring of menus --- */
  if (menu.uuid && Array.isArray(allMenus) && allMenus.length) {
    const byUuid = new Map<string, IvrMenuLike>();
    allMenus.forEach((m) => m.uuid && byUuid.set(m.uuid, m));
    byUuid.set(menu.uuid, menu);

    const loop = findLoop(menu.uuid, byUuid);
    /* A loop of one is "points at itself", already reported above. */
    if (loop && loop.length > 2) {
      const names = loop
        .map((uuid) => byUuid.get(uuid)?.name || 'a menu')
        .join(' → ');
      findings.push({
        level: 'error',
        code: 'menu-loop',
        message: `These menus lead back to each other: ${names}. A caller following them never reaches a person. Break the ring by pointing one of them somewhere else.`,
      });
    }
  }

  /* --- a target that no longer exists --- */
  if (knownTargets) {
    actions.forEach((row) => {
      const list = knownTargets[row.type];
      /* No list for that type means we were not told about it, which is not the
         same as the target being gone. */
      if (!Array.isArray(list) || !row.value) return;
      if (!list.includes(row.value)) {
        findings.push({
          level: 'error',
          code: 'missing-target',
          key: row.key,
          message: `${describeKey(row.key)} points at ${row.label || 'something'} that no longer exists. A caller pressing it would reach nothing.`,
        });
      }
    });
  }

  /* --- the fallbacks, which decide what happens to a caller who presses
         nothing or presses something that is not there. Getting these wrong
         strands the callers least able to help themselves. --- */
  const readFallback = (f?: IvrFallback) => ({
    status: String(f?.status ?? ''),
    type: String((f?.type as any)?.value ?? f?.type ?? ''),
    value: String((f?.value as any)?.value ?? f?.value ?? ''),
  });

  ([
    ['timeout_action', 'presses nothing'],
    ['failure_action', 'presses a key that is not set up'],
  ] as const).forEach(([field, when]) => {
    const fb = readFallback(menu.generic?.[field]);
    if (!fb.status) {
      findings.push({
        level: 'warning',
        code: 'no-fallback',
        message: `Nothing is set for when the caller ${when}. Say what should happen, so they are not left listening to a menu that has stopped.`,
      });
      return;
    }
    if (menu.uuid && fb.type === 'IVR' && fb.value === menu.uuid) {
      findings.push({
        level: 'error',
        code: 'fallback-loops',
        message: `When the caller ${when}, this menu sends them back to itself. They would hear it again, do the same thing, and never get anywhere.`,
      });
    }
  });

  /* --- every key leads to another menu --- */
  const reachable = actions.filter((row) => row.type !== 'IVR');
  if (actions.length > 0 && reachable.length === 0) {
    findings.push({
      level: 'warning',
      code: 'no-way-out',
      message:
        'Every key leads to another menu. Nothing here reaches a person, a queue or voicemail, so a caller can only move between menus.',
    });
  }

  return findings;
};

/* True when saving would strand a caller. Warnings do not block. */
export const hasBlockingIvrFinding = (findings: IvrFinding[]): boolean =>
  findings.some((f) => f.level === 'error');

/* Who an administrator is allowed to administer.
 *
 * A role in this product answers one question: what can this person do? Edit a
 * user, buy a number, listen to a recording. It does not answer the second
 * question every company with more than one location asks: *to whom?*
 *
 * Today the answer is "everybody". A role that grants "edit user" grants it over
 * every person in the company, so the manager of the Manchester location can edit
 * somebody in London, and the person who runs the support queue can edit the
 * sales team. For a company with one location that is invisible. For a company
 * with ten, it is the reason they cannot let anybody but head location administer
 * anything.
 *
 * This module is the missing half. A scope says which part of the organisation
 * an administrator covers:
 *
 *   company      the whole company - the person who signed up, and anybody they
 *                choose to make their equal
 *   location     one location, or the several locations somebody manages
 *   department   one department or call queue and nothing else
 *
 * and `canActOn` answers, for one administrator and one thing they are trying to
 * change, yes or no and why. The "why" matters: a refusal that says only "not
 * allowed" sends somebody to support, and a refusal that says "Priya is at the
 * London location, which you do not manage" does not.
 *
 * Two rules here exist because of how this goes wrong in practice rather than in
 * theory:
 *
 *   an unknown home is a refusal   if we cannot tell which location a person
 *                                  belongs to, a location administrator does not
 *                                  get to edit them. Guessing "probably mine"
 *                                  is how somebody edits the wrong person.
 *
 *   nobody widens their own reach  an administrator cannot change their own
 *                                  scope, and only a company-wide administrator
 *                                  can change anybody's. Otherwise the location
 *                                  manager grants themselves the company.
 *
 * IMPORTANT, and the reason the screen that uses this says so on its face: the
 * platform's API does not check any of this yet. Every one of these decisions is
 * made in the browser, and the browser is not where a security rule can live.
 * What is here is the model, written down and tested, so that the day the API
 * enforces scope the answer it gives and the answer the screen gives are the
 * same one. Until then a scope records who *should* manage what; it does not
 * stop anybody from doing anything.
 */

export type ScopeTier = 'company' | 'location' | 'department';

export interface AdminScope {
  /** The administrator this scope belongs to. */
  personUuid: string;
  tier: ScopeTier;
  /** Locations covered. Only meaningful when the tier is `location`. */
  locationUuids: string[];
  /** Departments and queues covered. Only meaningful when the tier is `department`. */
  departmentUuids: string[];
}

/** Something an administrator is trying to view or change. */
export interface ScopeTarget {
  kind: 'person' | 'department' | 'location' | 'company';
  /** The location this thing belongs to. `null` when the platform does not say. */
  locationUuid?: string | null;
  /** For a person: the departments they are a member of. */
  departmentUuids?: string[];
  /** For a department or a location target: its own id. */
  uuid?: string;
  /** Used only in the sentence explaining a decision. */
  name?: string;
}

export interface TierInfo {
  tier: ScopeTier;
  label: string;
  /** One sentence an administrator can read and act on. */
  description: string;
}

export const TIERS: TierInfo[] = [
  {
    tier: 'company',
    label: 'Whole company',
    description: 'Every location, every department and every person. The widest there is.',
  },
  {
    tier: 'location',
    label: 'Chosen locations',
    description:
      'The people, departments and numbers that belong to the locations you pick. One location for an location manager, several for somebody who covers a region.',
  },
  {
    tier: 'department',
    label: 'Chosen departments',
    description:
      'One department or call queue and the people in it. Nothing about the location around it.',
  },
];

export interface Directory {
  /** Every location in the company. */
  locations: { uuid: string; name?: string }[];
  /** Every department and queue in the company. */
  departments: { uuid: string; name?: string; locationUuid?: string | null }[];
}

export interface ScopeProblem {
  field: 'person' | 'tier' | 'locations' | 'departments';
  message: string;
  /** A blocking problem means the scope cannot be saved as it stands. */
  blocking: boolean;
}

const clean = (list: unknown): string[] => {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  list.forEach((item) => {
    const value = typeof item === 'string' ? item.trim() : '';
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
};

const isTier = (value: unknown): value is ScopeTier =>
  value === 'company' || value === 'location' || value === 'department';

/* Stored scopes are read back out of a JSON blob that older versions of this
   screen, and hand edits, have both written to. Anything unrecognised becomes
   the narrowest safe answer rather than an error, and the lists the chosen tier
   does not use are dropped so a scope cannot carry a stale location list that
   nobody can see but that would come back if the tier changed. */
export const normaliseScope = (raw: unknown): AdminScope => {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const tier: ScopeTier = isTier(source.tier) ? source.tier : 'department';

  return {
    personUuid: typeof source.personUuid === 'string' ? source.personUuid.trim() : '',
    tier,
    locationUuids: tier === 'location' ? clean(source.locationUuids) : [],
    departmentUuids: tier === 'department' ? clean(source.departmentUuids) : [],
  };
};

const nameOf = (list: { uuid: string; name?: string }[], uuid: string): string =>
  list.find((item) => item.uuid === uuid)?.name || 'a deleted entry';

/** Everything wrong with a scope, in the order somebody would fix it. */
export const checkScope = (scope: AdminScope, directory: Directory): ScopeProblem[] => {
  const problems: ScopeProblem[] = [];
  const locations = directory?.locations || [];
  const departments = directory?.departments || [];

  if (!scope.personUuid) {
    problems.push({ field: 'person', message: 'Choose who this applies to.', blocking: true });
  }

  if (scope.tier === 'location') {
    if (scope.locationUuids.length === 0) {
      problems.push({
        field: 'locations',
        message: 'Pick at least one location, or this administrator covers nobody at all.',
        blocking: true,
      });
    }

    const known = new Set(locations.map((item) => item.uuid));
    scope.locationUuids
      .filter((uuid) => !known.has(uuid))
      .forEach((uuid) => {
        problems.push({
          field: 'locations',
          message: `An location on this list no longer exists (${uuid}). Remove it.`,
          blocking: true,
        });
      });

    /* Not an error, but worth saying out loud: somebody who covers every location
       has the company, and giving them the company tier says that plainly. */
    if (locations.length > 0 && scope.locationUuids.length === locations.length) {
      problems.push({
        field: 'tier',
        message:
          'This covers every location you have, which is the same as the whole company. Use "Whole company" so it stays true when you open the next location.',
        blocking: false,
      });
    }
  }

  if (scope.tier === 'department') {
    if (scope.departmentUuids.length === 0) {
      problems.push({
        field: 'departments',
        message: 'Pick at least one department, or this administrator covers nobody at all.',
        blocking: true,
      });
    }

    const known = new Set(departments.map((item) => item.uuid));
    scope.departmentUuids
      .filter((uuid) => !known.has(uuid))
      .forEach((uuid) => {
        problems.push({
          field: 'departments',
          message: `A department on this list no longer exists (${uuid}). Remove it.`,
          blocking: true,
        });
      });
  }

  return problems;
};

export const isScopeSaveable = (problems: ScopeProblem[]): boolean =>
  !problems.some((problem) => problem.blocking);

export interface Decision {
  allowed: boolean;
  /** A sentence that can be shown to the administrator as it is. */
  reason: string;
}

/**
 * May this administrator act on this thing?
 *
 * The scope says nothing about *what* the action is — that is the role's job,
 * and the two are meant to be asked together: the role says "may edit people",
 * this says "may act on this person".
 */
export const canActOn = (scope: AdminScope, target: ScopeTarget): Decision => {
  const what = target?.name ? `"${target.name}"` : `this ${target?.kind || 'item'}`;

  if (scope.tier === 'company') {
    return { allowed: true, reason: 'Covers the whole company.' };
  }

  if (target.kind === 'company') {
    return {
      allowed: false,
      reason: 'Company-wide settings can only be changed by an administrator over the whole company.',
    };
  }

  if (scope.tier === 'location') {
    const covered = new Set(scope.locationUuids);

    if (target.kind === 'location') {
      return covered.has(String(target.uuid))
        ? { allowed: true, reason: `${what} is one of the locations you manage.` }
        : { allowed: false, reason: `${what} is not one of the locations you manage.` };
    }

    /* A person or department whose location the platform does not report. The
       honest answer is no: assuming it is one of theirs is how an admin ends up
       editing somebody in another country. */
    if (!target.locationUuid) {
      return {
        allowed: false,
        reason: `We cannot tell which location ${what} belongs to, so it is left alone. Set an location on it first.`,
      };
    }

    return covered.has(target.locationUuid)
      ? { allowed: true, reason: `${what} belongs to an location you manage.` }
      : { allowed: false, reason: `${what} belongs to an location you do not manage.` };
  }

  /* Department tier. */
  const covered = new Set(scope.departmentUuids);

  if (target.kind === 'location') {
    return {
      allowed: false,
      reason: 'Location settings are wider than the departments you manage.',
    };
  }

  if (target.kind === 'department') {
    return covered.has(String(target.uuid))
      ? { allowed: true, reason: `${what} is one of the departments you manage.` }
      : { allowed: false, reason: `${what} is not one of the departments you manage.` };
  }

  const memberships = clean(target.departmentUuids);
  const shared = memberships.filter((uuid) => covered.has(uuid));
  if (shared.length > 0) {
    return { allowed: true, reason: `${what} is in a department you manage.` };
  }

  return {
    allowed: false,
    reason: memberships.length
      ? `${what} is not in any department you manage.`
      : `${what} is not in a department, so nobody with a department scope can manage them.`,
  };
};

export interface Person {
  uuid: string;
  name?: string;
  locationUuid?: string | null;
  departmentUuids?: string[];
}

export interface Coverage {
  people: number;
  /** People whose location or department the platform does not report. */
  unplaced: number;
  departments: number;
  locations: number;
  totalPeople: number;
}

/** How much of the company a scope actually reaches, counted from real records. */
export const coverageOf = (
  scope: AdminScope,
  people: Person[],
  directory: Directory,
): Coverage => {
  const list = Array.isArray(people) ? people : [];
  const departments = directory?.departments || [];
  const locations = directory?.locations || [];

  if (scope.tier === 'company') {
    return {
      people: list.length,
      unplaced: 0,
      departments: departments.length,
      locations: locations.length,
      totalPeople: list.length,
    };
  }

  const reached = list.filter(
    (person) =>
      canActOn(scope, {
        kind: 'person',
        locationUuid: person.locationUuid ?? null,
        departmentUuids: person.departmentUuids,
      }).allowed,
  );

  /* Counted separately because it is the number that explains a surprise. An
     location administrator who expected forty people and covers twelve usually
     has twenty-eight people with no location set, not a broken scope. */
  const unplaced =
    scope.tier === 'location'
      ? list.filter((person) => !person.locationUuid).length
      : list.filter((person) => clean(person.departmentUuids).length === 0).length;

  return {
    people: reached.length,
    unplaced,
    departments:
      scope.tier === 'department'
        ? scope.departmentUuids.length
        : departments.filter(
            (department) =>
              !!department.locationUuid &&
              scope.locationUuids.includes(String(department.locationUuid)),
          ).length,
    locations: scope.tier === 'location' ? scope.locationUuids.length : 0,
    totalPeople: list.length,
  };
};

/** One line describing a scope, for a table cell or a summary. */
export const describeScope = (scope: AdminScope, directory: Directory): string => {
  if (scope.tier === 'company') return 'The whole company';

  if (scope.tier === 'location') {
    if (scope.locationUuids.length === 0) return 'No locations chosen yet';
    const names = scope.locationUuids.map((uuid) => nameOf(directory?.locations || [], uuid));
    if (names.length <= 2) return names.join(' and ');
    return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
  }

  if (scope.departmentUuids.length === 0) return 'No departments chosen yet';
  const names = scope.departmentUuids.map((uuid) => nameOf(directory?.departments || [], uuid));
  if (names.length <= 2) return names.join(' and ');
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
};

/**
 * May this administrator change somebody's scope?
 *
 * Kept apart from `canActOn` because it is not about locations at all. Editing a
 * scope is editing the boundary itself, and a boundary that the people inside it
 * can move is not a boundary.
 */
export const canEditScope = (editor: AdminScope, subject: AdminScope): Decision => {
  if (editor.tier !== 'company') {
    return {
      allowed: false,
      reason: 'Only an administrator over the whole company can decide who administers what.',
    };
  }

  if (editor.personUuid && editor.personUuid === subject.personUuid) {
    return {
      allowed: false,
      reason: 'You cannot change what you yourself cover. Ask another company administrator.',
    };
  }

  return { allowed: true, reason: 'Allowed.' };
};

/** Reads the stored list, dropping anything unusable and the second entry for a person. */
export const readScopes = (raw: unknown): AdminScope[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: AdminScope[] = [];
  raw.forEach((entry) => {
    const scope = normaliseScope(entry);
    if (!scope.personUuid || seen.has(scope.personUuid)) return;
    seen.add(scope.personUuid);
    out.push(scope);
  });
  return out;
};

/** The scope that applies to somebody. Nobody listed means no scope of their own. */
export const scopeFor = (scopes: AdminScope[], personUuid: string): AdminScope | null =>
  (Array.isArray(scopes) ? scopes : []).find((scope) => scope.personUuid === personUuid) || null;

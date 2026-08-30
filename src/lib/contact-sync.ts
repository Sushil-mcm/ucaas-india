/* Bringing contacts in from somewhere else, without making copies.
 *
 * Importing an address book is easy once. The hard part is the second time.
 * Somebody connects their work account in January, adds forty contacts through
 * the year, and connects it again in December — and unless the import knows
 * which of those people it has already seen, they now have two of everybody.
 *
 * The rule that prevents it is the phone number, not the name. Names change
 * spelling, gain middle initials and get typed differently in two systems; a
 * number is the same number. So an incoming contact matches a stored one when
 * their numbers match, and matching means comparing digits — the same person is
 * `+44 20 7946 0000` in one address book and `442079460000` in the other.
 *
 * What this module produces is a plan, not an import: how many contacts would
 * be created, how many updated, how many are already right, and how many cannot
 * be brought in at all. A plan can be shown to somebody before anything
 * changes, which is the difference between "import" and "import and hope".
 *
 * Four outcomes, and each one is a real answer:
 *
 *   create      no stored contact has this number
 *   update      one does, and something about it has changed
 *   unchanged   one does, and nothing has changed — sending it again would
 *               only stamp the record with a pointless edit
 *   skipped     nothing usable came through, almost always a missing number
 */

import { matchKey, numberDigits } from './contact-blocking';

/** A contact as it arrives from an outside address book. */
export interface IncomingContact {
  name: string;
  phone: string;
  email?: string;
  /** The source's own id, so the same person can be recognised later. */
  externalId?: string;
}

/** A contact as the contact book already holds it. */
export interface StoredContact {
  _id?: string;
  name?: { first?: string; last?: string };
  contact?: { phone?: string; email?: string };
}

export type SyncOutcome = 'create' | 'update' | 'unchanged' | 'skipped';

export interface SyncEntry {
  outcome: SyncOutcome;
  incoming: IncomingContact;
  /** The stored contact this matched, for update and unchanged. */
  matched?: StoredContact;
  /** Why it was skipped, or what would change on an update. */
  reason?: string;
}

export interface SyncPlan {
  entries: SyncEntry[];
  create: SyncEntry[];
  update: SyncEntry[];
  unchanged: SyncEntry[];
  skipped: SyncEntry[];
  /** Incoming duplicates that were merged before anything was compared. */
  mergedDuplicates: number;
}

const storedName = (contact: StoredContact | undefined): string =>
  `${contact?.name?.first || ''} ${contact?.name?.last || ''}`.trim();

/** Tidies whatever the source sent into the four fields that are worth keeping. */
export const tidyIncoming = (raw: Partial<IncomingContact>): IncomingContact => ({
  name: String(raw?.name ?? '').replace(/\s+/g, ' ').trim(),
  phone: String(raw?.phone ?? '').trim(),
  email: String(raw?.email ?? '').trim().toLowerCase() || undefined,
  externalId: String(raw?.externalId ?? '').trim() || undefined,
});

/**
 * Incoming contacts with duplicates merged.
 *
 * An address book can hold the same number twice — a personal entry and a work
 * one for the same person. Sending both would have the second overwrite the
 * first, so the fuller of the two wins: the one with a name beats the one
 * without, and an email beats no email.
 */
export const mergeIncoming = (
  incoming: IncomingContact[],
): { merged: IncomingContact[]; mergedDuplicates: number } => {
  const byNumber = new Map<string, IncomingContact>();
  const noNumber: IncomingContact[] = [];
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
      externalId: existing.externalId || contact.externalId,
    });
  });

  return { merged: [...byNumber.values(), ...noNumber], mergedDuplicates };
};

/** What would happen if these contacts were brought in right now. */
export const planContactSync = (
  rawIncoming: Partial<IncomingContact>[],
  stored: StoredContact[],
): SyncPlan => {
  const { merged, mergedDuplicates } = mergeIncoming((rawIncoming || []).map(tidyIncoming));

  const storedByNumber = new Map<string, StoredContact>();
  (stored || []).forEach((contact) => {
    const key = matchKey(contact?.contact?.phone);
    /* First one wins. When the book already holds the same number twice, the
       import must not decide which of them is the real one — that is a mess
       somebody made, and quietly editing one of them would hide it. */
    if (key && !storedByNumber.has(key)) storedByNumber.set(key, contact);
  });

  const entries: SyncEntry[] = merged.map((incoming) => {
    const digits = numberDigits(incoming.phone);

    if (!digits) {
      return {
        outcome: 'skipped',
        incoming,
        reason: 'No phone number.',
      };
    }

    /* Under seven digits is a short code or an extension, not somebody you can
       call back from the outside world. */
    if (digits.length < 7) {
      return {
        outcome: 'skipped',
        incoming,
        reason: 'The number is too short to dial.',
      };
    }

    const matched = storedByNumber.get(matchKey(incoming.phone));
    if (!matched) {
      return { outcome: 'create', incoming };
    }

    const changes: string[] = [];
    if (incoming.name && incoming.name !== storedName(matched)) changes.push('name');
    if (incoming.email && incoming.email !== (matched?.contact?.email || '').toLowerCase())
      changes.push('email');

    if (!changes.length) {
      return { outcome: 'unchanged', incoming, matched };
    }

    return {
      outcome: 'update',
      incoming,
      matched,
      reason: `${changes.join(' and ')} would change`,
    };
  });

  return {
    entries,
    create: entries.filter((entry) => entry.outcome === 'create'),
    update: entries.filter((entry) => entry.outcome === 'update'),
    unchanged: entries.filter((entry) => entry.outcome === 'unchanged'),
    skipped: entries.filter((entry) => entry.outcome === 'skipped'),
    mergedDuplicates,
  };
};

/**
 * The contacts worth sending.
 *
 * Only the new ones and the changed ones. Sending the unchanged ones back would
 * rewrite hundreds of records to exactly what they already said, and every one
 * of those writes stamps the record as edited — so the contact book would
 * report that everybody was updated today, which is untrue and destroys the
 * only signal anyone has for what actually moved.
 *
 * The shape is flat — name, phone, email — because that is what the sync
 * endpoint takes, and it matches on the number itself.
 */
export interface SyncPayloadItem {
  name: string;
  phone: string;
  email?: string;
  external_id?: string;
}

export const syncPayload = (plan: SyncPlan): SyncPayloadItem[] =>
  [...plan.create, ...plan.update].map((entry) => ({
    name: entry.incoming.name || 'Unknown',
    phone: entry.incoming.phone,
    ...(entry.incoming.email ? { email: entry.incoming.email } : {}),
    ...(entry.incoming.externalId ? { external_id: entry.incoming.externalId } : {}),
  }));

/** One sentence saying what is about to happen, for the confirm step. */
export const describeSyncPlan = (plan: SyncPlan): string => {
  const parts: string[] = [];
  if (plan.create.length) parts.push(`${plan.create.length} new`);
  if (plan.update.length) parts.push(`${plan.update.length} to update`);
  if (plan.unchanged.length) parts.push(`${plan.unchanged.length} already up to date`);
  if (plan.skipped.length) parts.push(`${plan.skipped.length} without a usable number`);

  if (!parts.length) return 'There was nothing to bring in.';
  if (!plan.create.length && !plan.update.length)
    return `Nothing to change — ${parts.join(', ')}.`;
  return `${parts.join(', ')}.`;
};

/** Whether running the sync would change anything at all. */
export const syncWouldChangeAnything = (plan: SyncPlan): boolean =>
  plan.create.length > 0 || plan.update.length > 0;

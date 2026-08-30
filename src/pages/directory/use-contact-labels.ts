import { useCallback, useMemo } from 'react';
import { createLocalListStore } from '@/lib/local-list-store';
import {
  addLabel,
  checkLabel,
  labelIndex,
  matchesLabelSearch,
  parseEntries,
  pruneEntries,
  rankLabels,
  removeLabel,
  writeEntries,
} from '@/lib/contact-labels';

/**
 * Your own labels on your own contacts.
 *
 * A contact record has one tag — Standard, VIP, DNC or Blocked — and that is
 * the whole of what the contact book can store about how you think of somebody.
 * There is no field for your own words, and the endpoint that saves a contact
 * refuses anything it does not already know about, so a label sent with a
 * contact would be rejected rather than kept.
 *
 * So labels are kept here, in this browser, the same way the directory keeps
 * favourites. That is a real limitation and screens using this say so on their
 * face: your labels are yours, on this device. When the platform grows somewhere
 * to put them, the rules that decide what a label is — how many, what counts as
 * the same one, how searching orders them — are already settled in
 * `lib/contact-labels`, and only the storage below has to change.
 */

const store = createLocalListStore('mcm-contact-labels');

export const useContactLabels = () => {
  const entries = store.use();
  const byContact = useMemo(() => parseEntries(entries), [entries]);

  /** Every label anyone has used here, most-used first — the filter list. */
  const index = useMemo(() => labelIndex(byContact), [byContact]);

  const labelsOf = useCallback(
    (contactId?: string) => (contactId ? byContact[String(contactId)] || [] : []),
    [byContact],
  );

  const add = useCallback(
    (contactId: string, label: string) => {
      const existing = store.get();
      const current = parseEntries(existing)[contactId] || [];
      const next = addLabel(current, label);
      /* `addLabel` returns the list unchanged when the label cannot be added.
         Writing anyway would notify every subscriber for nothing. */
      if (next === current) return;
      store.set(writeEntries(existing, contactId, next));
    },
    [],
  );

  const remove = useCallback((contactId: string, label: string) => {
    const existing = store.get();
    const current = parseEntries(existing)[contactId] || [];
    store.set(writeEntries(existing, contactId, removeLabel(current, label)));
  }, []);

  /** Why a label cannot be added, for the message under the input. */
  const check = useCallback(
    (contactId: string, label: string) => checkLabel(labelsOf(contactId), label),
    [labelsOf],
  );

  /**
   * Drops labels belonging to contacts that no longer exist.
   *
   * Deleting a contact cannot reach into this browser, so without this its
   * labels would sit in the filter list for ever, offering to find a contact
   * that is gone. Called with the ids a screen has just loaded.
   */
  const pruneTo = useCallback((liveContactIds: string[]) => {
    const existing = store.get();
    const next = pruneEntries(existing, liveContactIds);
    if (next.length !== existing.length) store.set(next);
  }, []);

  const matches = useCallback(
    (contactId: string | undefined, query: string) =>
      matchesLabelSearch(labelsOf(contactId), query),
    [labelsOf],
  );

  /** A contact's labels with the searched-for one first. */
  const ranked = useCallback(
    (contactId: string | undefined, query: string) => rankLabels(labelsOf(contactId), query),
    [labelsOf],
  );

  return { byContact, index, labelsOf, add, remove, check, pruneTo, matches, ranked };
};

export default useContactLabels;

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getContactList } from '@/services/api';

/**
 * The saved contact book, in a shape suggestion lists can search.
 *
 * Deliberately built on `getContactList` (POST /api/contact/list) — the same
 * endpoint the Contacts page reads. `useFetchContact` is *not* the contact
 * book despite its name: it points at /api/tenant/report/call-list, the call
 * log report, and returns a number-keyed map of flat `first_name`/`last_name`
 * rows. Contacts are nested (`name.first` / `name.last`, `contact.phone`), so
 * anything reading the report and expecting contacts silently found nothing.
 */

export type ContactSuggestion = {
  id: string;
  name: string;
  number: string;
  email: string;
};

const digitsOf = (value: unknown) => String(value ?? '').replace(/\D/g, '');

const toSuggestion = (row: any): ContactSuggestion | null => {
  const name = [row?.name?.first, row?.name?.middle, row?.name?.last]
    .map((part: any) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
  const number = String(row?.contact?.phone ?? '').trim();
  if (!name && !number) return null;
  return {
    id: String(row?._id || row?.id || row?.uuid || number || name),
    name,
    number,
    email: String(row?.contact?.email ?? '').trim(),
  };
};

export const useContactSuggestions = (query: string, limit = 6) => {
  /* The key shares the `getContactList` prefix that create/edit already
     invalidates, so a contact saved elsewhere becomes suggestable without a
     reload. */
  const { data: contacts = [], isFetching } = useQuery({
    queryKey: ['getContactList', 'suggestions'],
    queryFn: () => getContactList({ page: 1, limit: 200 }),
    select: (data: any): ContactSuggestion[] =>
      (data?.data?.data?.result?.rows || [])
        .map(toSuggestion)
        .filter(Boolean) as ContactSuggestion[],
    staleTime: 60_000,
  });

  const matches = useMemo(() => {
    const raw = String(query || '').trim();
    if (!raw) return [];
    const digits = digitsOf(raw);
    const isNumeric = digits.length > 0 && !/[a-z]/i.test(raw);

    if (isNumeric) {
      /* One digit matches most of an address book, which is noise rather than
         a suggestion. */
      if (digits.length < 2) return [];
      return contacts
        .filter((c) => c.number && digitsOf(c.number).includes(digits))
        .slice(0, limit);
    }

    // Names match from the first character, so typing "he" offers "Helen".
    const q = raw.toLowerCase();
    return contacts
      .filter((c) => {
        if (!c.name) return false;
        const name = c.name.toLowerCase();
        return name.startsWith(q) || name.split(/\s+/).some((part) => part.startsWith(q));
      })
      .slice(0, limit);
  }, [contacts, query, limit]);

  /** The saved name for a number, matched on the last 10 digits so a stored
      `+919004583988` answers a typed `+91 90045-83988`. */
  const nameForNumber = useMemo(() => {
    const byTail = new Map<string, string>();
    contacts.forEach((c) => {
      const d = digitsOf(c.number);
      if (d.length >= 7 && c.name) byTail.set(d.slice(-10), c.name);
    });
    return (value: string) => {
      const d = digitsOf(value);
      if (d.length < 7) return '';
      return byTail.get(d.slice(-10)) || '';
    };
  }, [contacts]);

  return { contacts, matches, nameForNumber, isFetching };
};

/* Your own words for your own contacts.
 *
 * The contact book gives every contact exactly one tag from a fixed list of
 * four — Standard, VIP, DNC, Blocked. That answers "how do we treat this
 * caller"; it does not answer "which of these contacts are the ones I care
 * about this week". For that you need your own words: "renewal", "Q3 pilot",
 * "chased twice". A label is that word.
 *
 * Labels are personal on purpose. Yours are not somebody else's, and one
 * person's shorthand is noise on another person's screen. That also matches
 * where they are kept: this browser, on this device, because the contact record
 * has no field for them and adding one is backend work. Everything else about
 * them — how many, what counts as the same label, how searching finds them — is
 * decided here, so the rules do not change when a place to store them arrives.
 *
 * Three rules, each with a reason:
 *
 *   at most 20 per contact       past that the labels stop being a way to find
 *                                anything and become a second contact record
 *   the same word once           "Renewal" and "renewal" are one label, kept as
 *                                you first typed it — anything else means
 *                                searching one of them finds half your contacts
 *   the matching label first     a contact with six labels, found by one of
 *                                them, should show you the one you searched for
 *                                rather than whichever happens to be first
 */

export const MAX_LABELS_PER_CONTACT = 20;
export const LABEL_MAX_LENGTH = 30;

/**
 * A label as it will be stored.
 *
 * Whitespace is collapsed so "on  hold" and "on hold" are one label. The pipe
 * is removed because it separates a contact from its label in storage, and a
 * label containing one would split into two.
 */
export const normaliseLabel = (raw: unknown): string =>
  String(raw ?? '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LABEL_MAX_LENGTH)
    .trim();

/** What decides whether two labels are the same one. Case never does. */
export const labelKey = (raw: unknown): string => normaliseLabel(raw).toLowerCase();

export interface LabelProblem {
  blocking: boolean;
  message: string;
}

/** Whether a label can be added to this contact, and why not when it cannot. */
export const checkLabel = (existing: string[], raw: unknown): LabelProblem[] => {
  const label = normaliseLabel(raw);
  const problems: LabelProblem[] = [];

  if (!label) {
    problems.push({ blocking: true, message: 'Type a label first.' });
    return problems;
  }

  if (existing.some((entry) => labelKey(entry) === labelKey(label))) {
    problems.push({
      blocking: true,
      message: `This contact already has the label “${label}”.`,
    });
  }

  if (existing.length >= MAX_LABELS_PER_CONTACT) {
    problems.push({
      blocking: true,
      message: `A contact can carry ${MAX_LABELS_PER_CONTACT} labels. Remove one first.`,
    });
  }

  if (String(raw ?? '').trim().length > LABEL_MAX_LENGTH) {
    problems.push({
      blocking: false,
      message: `Shortened to ${LABEL_MAX_LENGTH} characters.`,
    });
  }

  return problems;
};

/** The contact's labels with one added, or unchanged when it cannot be. */
export const addLabel = (existing: string[], raw: unknown): string[] => {
  if (checkLabel(existing, raw).some((problem) => problem.blocking)) return existing;
  return [...existing, normaliseLabel(raw)];
};

/** Removing a label from a contact never deletes the label itself — it stays
    available for every other contact, which is why nothing else changes. */
export const removeLabel = (existing: string[], raw: unknown): string[] => {
  const key = labelKey(raw);
  return existing.filter((entry) => labelKey(entry) !== key);
};

/**
 * Every label in use, with how many contacts carry it.
 *
 * Two jobs: the suggestion list when somebody starts typing, and the filter at
 * the top of the contact list. Sorted by how widely used a label is, then
 * alphabetically, so the labels somebody actually relies on come first.
 */
export const labelIndex = (
  byContact: Record<string, string[]>,
): { label: string; count: number }[] => {
  const seen = new Map<string, { label: string; count: number }>();

  Object.values(byContact || {}).forEach((labels) => {
    /* One contact carrying the same label twice would otherwise count twice —
       it cannot happen through `addLabel`, but stored data can be older than
       the rule that prevents it. */
    const unique = new Set((labels || []).map((label) => labelKey(label)));
    unique.forEach((key) => {
      const original = (labels || []).find((label) => labelKey(label) === key) || key;
      const entry = seen.get(key);
      if (entry) entry.count += 1;
      else seen.set(key, { label: normaliseLabel(original), count: 1 });
    });
  });

  return [...seen.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
};

/** Whether any of a contact's labels answer what somebody typed. */
export const matchesLabelSearch = (labels: string[], query: unknown): boolean => {
  const needle = labelKey(query);
  if (!needle) return true;
  return (labels || []).some((label) => labelKey(label).includes(needle));
};

/**
 * A contact's labels, ordered for a search result.
 *
 * The label somebody searched for comes first — on a contact with six labels,
 * showing the other five first hides the reason it was found at all. Exact
 * matches lead, then partial ones, then everything else in its own order.
 */
export const rankLabels = (labels: string[], query: unknown): string[] => {
  const needle = labelKey(query);
  if (!needle) return [...(labels || [])];

  const score = (label: string) => {
    const key = labelKey(label);
    if (key === needle) return 0;
    if (key.startsWith(needle)) return 1;
    if (key.includes(needle)) return 2;
    return 3;
  };

  return [...(labels || [])]
    .map((label, index) => ({ label, index, score: score(label) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.label);
};

/*
 * Storage.
 *
 * Labels live in the same local list the directory keeps favourites in, which
 * holds a flat list of strings. Each entry is one contact and one label joined
 * by a pipe — the contact id is a hex string and `normaliseLabel` strips pipes
 * from labels, so the first pipe is always the separator.
 *
 * Flat entries rather than a nested object because that is the shape the store
 * already syncs across tabs, and because adding or removing a single label is
 * then one entry changing rather than a whole record being rewritten.
 */

export const entryFor = (contactId: string, label: string): string =>
  `${contactId}|${normaliseLabel(label)}`;

export const parseEntries = (entries: string[]): Record<string, string[]> => {
  const byContact: Record<string, string[]> = {};

  (entries || []).forEach((entry) => {
    const separator = String(entry).indexOf('|');
    if (separator <= 0) return;
    const contactId = entry.slice(0, separator);
    const label = normaliseLabel(entry.slice(separator + 1));
    if (!label) return;
    const existing = byContact[contactId] || [];
    if (existing.some((current) => labelKey(current) === labelKey(label))) return;
    byContact[contactId] = [...existing, label];
  });

  return byContact;
};

/** The full stored list with one contact's labels replaced. */
export const writeEntries = (
  entries: string[],
  contactId: string,
  labels: string[],
): string[] => [
  ...(entries || []).filter((entry) => !String(entry).startsWith(`${contactId}|`)),
  ...labels.map((label) => entryFor(contactId, label)),
];

/** Labels for contacts that no longer exist, so a deleted contact does not
    leave its labels behind in the filter list forever. */
export const pruneEntries = (entries: string[], liveContactIds: string[]): string[] => {
  const live = new Set(liveContactIds.map((id) => String(id)));
  return (entries || []).filter((entry) => {
    const separator = String(entry).indexOf('|');
    return separator > 0 && live.has(entry.slice(0, separator));
  });
};

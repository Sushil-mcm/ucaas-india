/* The words a transcript has to get right, assembled from what we already know.
 *
 * WHY THIS IS NOT A LIST SOMEBODY TYPES
 *
 * The obvious build is a screen where an administrator enters every unusual
 * word one at a time. That is how the reference product does it, and it is the
 * wrong shape for us: this platform already holds two thousand staff names,
 * plus company names, ring groups and menu names. Asking somebody to retype
 * names the system already has is data entry we invented for ourselves, and it
 * goes stale the moment a person joins.
 *
 * So the dictionary is DERIVED from the directory, and an administrator only
 * adds what the platform genuinely cannot know: product names, industry
 * jargon, acronyms, and how an unusual name is actually pronounced.
 *
 * NOTHING IS SILENTLY DROPPED
 *
 * Real directories contain test rows, duplicates, placeholders and names with
 * digits stuck on the end. It is tempting to filter those out quietly, but a
 * dictionary that omits a real employee's name without saying so is worse than
 * one that includes some noise - the admin cannot fix what they cannot see. So
 * every term comes back with whether it is included and why, and the screen can
 * show the excluded ones for somebody to overrule.
 */

export type TermSource = 'people' | 'company' | 'line' | 'custom';

export interface DictionaryTerm {
  /* The word or phrase as the engine should recognise it. */
  text: string;
  source: TermSource;
  /* How to say it, when the spelling does not make that obvious. Only a person
     can supply this - it is the one part of a dictionary that cannot be
     derived, which is why the screen exists at all. */
  hint?: string;
  language?: string;
  /* Whether this term goes to the speech engine. */
  included: boolean;
  /* Why it was left out, in words an administrator can act on. Absent when
     included. */
  excludedBecause?: string;
}

export interface DictionaryInput {
  people?: Array<{ first_name?: string | null; last_name?: string | null }>;
  companyName?: string | null;
  /* Ring groups, queues, menus - anything a caller might say the name of. */
  lines?: Array<{ name?: string | null }>;
  /* What an administrator added by hand, with optional pronunciation. */
  custom?: Array<{ text: string; hint?: string; language?: string }>;
}

/* Words so common that teaching them to a speech engine helps nothing and
   risks pushing it towards a name when somebody said the ordinary word. */
const TOO_COMMON = new Set([
  'test', 'user', 'admin', 'demo', 'sales', 'support', 'info', 'team',
  'the', 'and', 'call', 'phone', 'main', 'new', 'none', 'null', 'na',
]);

const collapse = (value: unknown): string =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/* A term earns its place only if it is a word a person could say. */
const judge = (text: string): { included: boolean; excludedBecause?: string } => {
  const trimmed = collapse(text);

  if (!trimmed) {
    return { included: false, excludedBecause: 'Empty' };
  }
  if (trimmed.length < 3) {
    return {
      included: false,
      excludedBecause: 'Too short to recognise reliably — two letters sound like too many other things',
    };
  }
  /* Checked word by word, so "Test User" goes the same way "Test" and "User"
     do. Judging only the whole string let a demo account back in through the
     combined form, which is exactly the noise this is meant to keep out. A
     phrase survives if any part of it is a real word worth teaching. */
  const words = trimmed.toLowerCase().split(' ').filter(Boolean);
  if (words.length > 0 && words.every((word) => TOO_COMMON.has(word))) {
    return {
      included: false,
      excludedBecause: 'An everyday word — teaching it would make the transcript worse, not better',
    };
  }
  if (/^\d+$/.test(trimmed)) {
    return { included: false, excludedBecause: 'Only digits' };
  }
  if (/\d/.test(trimmed)) {
    /* Kept, but flagged. "Ramandeep001" is a real row in a real directory and
       the person behind it is real; the digits are almost certainly test
       scaffolding. Included so nobody's name goes missing, surfaced so an
       admin can tidy it. */
    return {
      included: true,
      excludedBecause: undefined,
    };
  }
  return { included: true };
};

const looksLikeScaffolding = (text: string): boolean => /\d/.test(collapse(text));

/* Build the whole dictionary. Deterministic and pure, so the same directory
   always produces the same list and it can be tested without a database. */
export const buildDictionary = (input: DictionaryInput): DictionaryTerm[] => {
  const out: DictionaryTerm[] = [];
  const seen = new Map<string, number>();

  const add = (text: string, source: TermSource, extra: Partial<DictionaryTerm> = {}) => {
    const clean = collapse(text);
    const key = clean.toLowerCase();
    if (!key) return;

    const existing = seen.get(key);
    if (existing !== undefined) {
      /* Already present. A hand-written entry outranks a derived one, because
         somebody chose to write it and may have added a pronunciation. */
      if (source === 'custom') {
        out[existing] = { ...out[existing], ...extra, source: 'custom', text: clean };
      }
      return;
    }

    const verdict = judge(clean);
    seen.set(key, out.length);
    out.push({
      text: clean,
      source,
      included: verdict.included,
      ...(verdict.excludedBecause ? { excludedBecause: verdict.excludedBecause } : {}),
      ...extra,
    });
  };

  /* People first: their names are the words a transcript most often gets wrong,
     and the ones a reader most notices. Each part is added separately as well
     as together - somebody saying "ask Adedeji" says one word, not two. */
  for (const person of input.people ?? []) {
    const first = collapse(person?.first_name);
    const last = collapse(person?.last_name);
    if (first) add(first, 'people');
    if (last) add(last, 'people');
    if (first && last) add(`${first} ${last}`, 'people');
  }

  if (input.companyName) add(input.companyName, 'company');

  for (const line of input.lines ?? []) {
    if (line?.name) add(line.name, 'line');
  }

  /* Last, so a hand-written entry can override anything derived above. */
  for (const term of input.custom ?? []) {
    add(term.text, 'custom', {
      ...(term.hint ? { hint: term.hint } : {}),
      ...(term.language ? { language: term.language } : {}),
    });
  }

  return out;
};

export const includedTerms = (terms: DictionaryTerm[]): DictionaryTerm[] =>
  terms.filter((t) => t.included);

/* What the screen puts at the top: how much of this came for free. */
export interface DictionarySummary {
  total: number;
  included: number;
  excluded: number;
  derived: number;
  handWritten: number;
  needingAttention: number;
}

export const summarise = (terms: DictionaryTerm[]): DictionarySummary => ({
  total: terms.length,
  included: terms.filter((t) => t.included).length,
  excluded: terms.filter((t) => !t.included).length,
  derived: terms.filter((t) => t.source !== 'custom').length,
  handWritten: terms.filter((t) => t.source === 'custom').length,
  /* Included, but with something odd about it - digits in a name, usually.
     Worth an admin's eye without blocking anything. */
  needingAttention: terms.filter((t) => t.included && looksLikeScaffolding(t.text)).length,
});

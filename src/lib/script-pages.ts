/* Call script pages, branches and publish state: the pure rules.
 *
 * A script used to be one body of rich text read top to bottom. It is now an
 * ordered list of pages. Each page has a title, the same rich-text body as
 * before, an optional row of choices the agent picks from at the bottom of
 * the page ("Interested" / "Not interested"), and rules that say where a
 * choice - or the disposition the agent has chosen so far - sends the call
 * next. With no matching rule the call goes to the following page in order.
 *
 * This file is a copy of campaign-api's helpers/CallScriptPages.ts, kept
 * identical on purpose: the editor's checks, the agent's Next button and the
 * server's validation must agree, and the tests on each side run the same
 * cases. Change one, change the other.
 *
 * Backward compatibility: a script saved before pages existed has `script`
 * (one body) and no `pages`. `pagesOf` turns that into a single page, and the
 * server keeps `script` equal to page one when pages are saved, so anything
 * still reading `script` sees the opening page. */

export type ScriptStatus = 'draft' | 'published';
export const SCRIPT_STATUSES: ScriptStatus[] = ['draft', 'published'];

export interface ScriptPageRule {
  /* What the rule looks at: a choice made on this page, or the disposition
     the agent has chosen so far on this call. */
  on: 'choice' | 'disposition';
  /* The choice label or disposition name, matched without regard to case. */
  value: string;
  /* The id of the page to go to. */
  page: string;
}

export interface ScriptPage {
  id: string;
  title: string;
  /* Rich-text nodes, the same shape the editor has always stored. */
  body: any[];
  choices: string[];
  rules: ScriptPageRule[];
}

export const MAX_PAGES = 30;
export const MAX_CHOICES = 8;
export const MAX_RULES = 24;

/* A row with no status was saved before drafts existed; it is published. */
export const isPublished = (row: { status?: unknown } | null | undefined): boolean =>
  String(row?.status ?? 'published')
    .trim()
    .toLowerCase() !== 'draft';

const cleanText = (value: unknown, max: number): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);
const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/* Whatever was stored or typed, as well-formed pages. Unknown keys are
   dropped, blank choices and half-written rules are dropped, ids are filled in. */
export const normalizeScriptPages = (pages: unknown): ScriptPage[] => {
  if (!Array.isArray(pages)) return [];
  return pages
    .filter((page) => page && typeof page === 'object')
    .map(
      (page: any, index: number): ScriptPage => ({
        id: cleanText(page.id, 64) || `p${index + 1}`,
        title: cleanText(page.title, 80),
        body: Array.isArray(page.body) ? page.body : [],
        choices: Array.isArray(page.choices)
          ? page.choices.map((choice: unknown) => cleanText(choice, 60)).filter(Boolean)
          : [],
        rules: Array.isArray(page.rules)
          ? page.rules
              .filter((rule: any) => rule && typeof rule === 'object')
              .map(
                (rule: any): ScriptPageRule => ({
                  on:
                    String(rule.on ?? '')
                      .trim()
                      .toLowerCase() === 'disposition'
                      ? 'disposition'
                      : 'choice',
                  value: cleanText(rule.value, 80),
                  page: cleanText(rule.page, 64),
                }),
              )
              .filter((rule: ScriptPageRule) => rule.value && rule.page)
          : [],
      }),
    );
};

/* True when the rich-text nodes carry any non-blank text. */
export const bodyHasText = (nodes: unknown): boolean => {
  const walk = (node: any): boolean => {
    if (Array.isArray(node)) return node.some(walk);
    if (!node || typeof node !== 'object') return false;
    if (typeof node.text === 'string' && node.text.trim().length > 0) return true;
    return Array.isArray(node.children) ? node.children.some(walk) : false;
  };
  return walk(nodes);
};

/* Everything wrong with a set of pages, in plain words, or nothing. */
export const scriptPageProblems = (pages: ScriptPage[]): string[] => {
  const problems: string[] = [];
  if (pages.length > MAX_PAGES) problems.push(`A script can have at most ${MAX_PAGES} pages.`);
  const seenIds = new Set<string>();
  pages.forEach((page, index) => {
    const label = page.title || `Page ${index + 1}`;
    if (seenIds.has(page.id)) problems.push(`Two pages share the id "${page.id}".`);
    seenIds.add(page.id);
    if (!bodyHasText(page.body)) problems.push(`"${label}" has no text.`);
    if (page.choices.length > MAX_CHOICES)
      problems.push(`"${label}" offers more than ${MAX_CHOICES} choices.`);
    if (page.rules.length > MAX_RULES) problems.push(`"${label}" has more than ${MAX_RULES} rules.`);
    const seenChoices: string[] = [];
    page.choices.forEach((choice) => {
      if (seenChoices.some((seen) => same(seen, choice)))
        problems.push(`"${label}" offers "${choice}" twice.`);
      seenChoices.push(choice);
    });
    page.rules.forEach((rule) => {
      if (!pages.some((candidate) => candidate.id === rule.page)) {
        problems.push(`"${label}" sends "${rule.value}" to a page that does not exist.`);
      } else if (rule.page === page.id) {
        problems.push(`"${label}" sends "${rule.value}" back to itself.`);
      }
      if (rule.on === 'choice' && !page.choices.some((choice) => same(choice, rule.value))) {
        problems.push(`"${label}" has a rule for a choice it does not offer: "${rule.value}".`);
      }
    });
  });
  return problems;
};

/* The pages of a stored script, old shape or new. One body becomes one page. */
export const pagesOf = (
  row: { pages?: unknown; script?: unknown; name?: unknown } | null | undefined,
): ScriptPage[] => {
  const pages = normalizeScriptPages(row?.pages);
  if (pages.length) return pages;
  const body = Array.isArray(row?.script) ? (row?.script as any[]) : [];
  return [{ id: 'p1', title: '', body, choices: [], rules: [] }];
};

/* What `script` should hold when pages are saved: the opening page, so the
   old readers keep working. */
export const firstPageBody = (pages: ScriptPage[], fallback: any): any =>
  pages.length ? pages[0].body : fallback;

/* Where Next goes from a page, given what the agent has picked. A choice on
   this page wins, then the disposition, then the following page in order;
   null means the script has ended. */
export const nextPageId = (
  pages: ScriptPage[],
  currentId: string | null | undefined,
  picked: { choice?: string | null; disposition?: string | null } = {},
): string | null => {
  const index = pages.findIndex((page) => page.id === currentId);
  if (index < 0) return pages[0]?.id ?? null;
  const page = pages[index];
  const choice = String(picked.choice ?? '').trim();
  if (choice) {
    const rule = page.rules.find(
      (candidate) => candidate.on === 'choice' && same(candidate.value, choice),
    );
    if (rule) return rule.page;
  }
  const disposition = String(picked.disposition ?? '').trim();
  if (disposition) {
    const rule = page.rules.find(
      (candidate) => candidate.on === 'disposition' && same(candidate.value, disposition),
    );
    if (rule) return rule.page;
  }
  return pages[index + 1]?.id ?? null;
};

/* ---- editor-only helpers (no server twin) ---- */

const EMPTY_BODY = [{ type: 'paragraph', children: [{ text: '' }] }];

/* A fresh page with an id no other page in the list has. */
export const newScriptPage = (existing: ScriptPage[], title = ''): ScriptPage => {
  let n = existing.length + 1;
  while (existing.some((page) => page.id === `p${n}`)) n += 1;
  return { id: `p${n}`, title, body: JSON.parse(JSON.stringify(EMPTY_BODY)), choices: [], rules: [] };
};

/* The list with one page moved a step up or down; unchanged at the ends. */
export const movePage = (pages: ScriptPage[], index: number, direction: -1 | 1): ScriptPage[] => {
  const target = index + direction;
  if (index < 0 || index >= pages.length || target < 0 || target >= pages.length) return pages;
  const next = pages.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

/* The list without one page, and without any rule that pointed at it. Never
   removes the last page: a script is at least one. */
export const removePage = (pages: ScriptPage[], id: string): ScriptPage[] => {
  if (pages.length <= 1) return pages;
  return pages
    .filter((page) => page.id !== id)
    .map((page) => ({ ...page, rules: page.rules.filter((rule) => rule.page !== id) }));
};

/* A page's name as the agent and the admin see it. */
export const pageLabel = (pages: ScriptPage[], id: string): string => {
  const index = pages.findIndex((page) => page.id === id);
  if (index < 0) return id;
  return pages[index].title || `Page ${index + 1}`;
};

/**
 * Website scan results for the knowledge-base builders in demo mode.
 *
 * Both the AI Receptionist wizard and the Chat Agent builder scan a site with
 * `/api/ai/chat-agent/site-crawl` and read the reply as a bare array of URLs:
 *
 *     const links = Array.isArray(response?.data) ? response.data : [];
 *
 * The generic demo answer is an `ok()` envelope, which is an object rather than
 * an array, so `links` came back empty on every scan. That reads as "No pages
 * were found for this website", and because picking pages is what satisfies the
 * knowledge-base requirement, the wizard could not reach Review at all. Hence a
 * bare array here, not `ok(...)` — the shape is the fix.
 *
 * Pages are generated on whichever host was typed into the step, so the domain
 * in "Found N pages on <domain>" matches what was actually entered instead of
 * naming some other company's site. Nothing is fetched and no site is
 * contacted; these paths are invented, and they are shaped to spread across the
 * categories `buildPickPageCategories` sorts them into — folders like /blog and
 * /support become their own groups, while top-level pages fall into the keyword
 * categories (Pricing & Plans, Help & Contact, Legal & Trust, and so on).
 */

/** Top-level pages. These land in keyword categories, or in "Main Pages". */
const ROOT_PATHS = [
  '',
  'about',
  'pricing',
  'features',
  'contact',
  'careers',
  'privacy',
  'terms',
];

/** Paths under a folder. The first segment becomes the category heading. */
const FOLDER_PATHS = [
  'blog/how-ai-receptionists-cut-missed-calls',
  'blog/five-signs-your-team-needs-call-routing',
  'blog/what-a-virtual-number-actually-costs',
  'blog/setting-up-business-hours-that-work',

  'support/getting-started',
  'support/porting-your-number',
  'support/billing-and-invoices',
  'support/troubleshooting-call-quality',
  'support/contact-the-team',

  'solutions/small-business',
  'solutions/healthcare-clinics',
  'solutions/real-estate',
  'solutions/education',

  'docs/quick-start',
  'docs/call-flows',
  'docs/webhooks',
  'docs/api-reference',

  'legal/acceptable-use',
  'legal/data-processing-addendum',
];

/**
 * The step accepts a bare hostname, so a typed value is not necessarily a URL.
 * A host that cannot be parsed falls back to a placeholder rather than throwing
 * — a scan that fails on its own demo data would be worse than a generic name.
 */
const resolveOrigin = (siteUrl: string) => {
  const trimmed = String(siteUrl || '').trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return 'https://example.com';
  }
};

export const demoCrawledPages = (siteUrl: string): string[] => {
  const origin = resolveOrigin(siteUrl);

  return [...ROOT_PATHS, ...FOLDER_PATHS].map((path) => (path ? `${origin}/${path}` : `${origin}/`));
};

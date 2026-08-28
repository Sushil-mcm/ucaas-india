/**
 * Reads every page of a paged list endpoint.
 *
 * Several list endpoints reject `limit` above 200 — "limit must be less than or
 * equal to 200" — so asking for everything in one request fails outright rather
 * than returning a truncated page. Screens that genuinely need the whole set
 * (auditing every number, checking every extension) have to walk it.
 *
 * Bounded on purpose. `maxPages` stops a paging bug or a runaway endpoint from
 * looping forever, and the walk also stops as soon as a page comes back short,
 * which is the ordinary way these APIs signal the end.
 */

const PAGE_SIZE = 200;
const MAX_PAGES = 25; // 5,000 rows — far beyond any of these screens' needs

type Fetcher = (params: { page: number; limit: number } & Record<string, unknown>) => Promise<any>;

const rowsOf = (response: any): any[] =>
  response?.data?.data?.result?.rows || response?.data?.data?.rows || [];

const totalPagesOf = (response: any): number | null => {
  const total = response?.data?.data?.result?.totalPages;
  const parsed = Number(total);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const fetchAllPages = async (
  fetcher: Fetcher,
  params: Record<string, unknown> = {},
  { pageSize = PAGE_SIZE, maxPages = MAX_PAGES }: { pageSize?: number; maxPages?: number } = {},
): Promise<any[]> => {
  const collected: any[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await fetcher({ ...params, page, limit: pageSize });
    const rows = rowsOf(response);
    collected.push(...rows);

    /* A short page means the end, whatever the metadata claims. */
    if (rows.length < pageSize) break;

    const totalPages = totalPagesOf(response);
    if (totalPages !== null && page >= totalPages) break;
  }

  return collected;
};

export default fetchAllPages;

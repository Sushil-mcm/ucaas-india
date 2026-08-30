/* One place to say "the number lists changed".
 *
 * Every screen that lists phone numbers calls the same endpoint — `allNumbersList`
 * — and varies only by a `type` parameter: nothing for all numbers, `in_use` for
 * the ones assigned to someone, `inventory` for the ones sitting spare. One list,
 * three views of it.
 *
 * They were cached under four different keys, and each screen invalidated only its
 * own. So assigning a number on All Numbers left In Use and Inventory showing the
 * number in its old state until something else happened to refetch them. The same
 * split caused real data loss on the company record before it was consolidated;
 * here it shows stale rows rather than losing anything, but an admin who assigns a
 * number and then sees it still listed as spare has no way to tell which screen is
 * telling the truth.
 *
 * Keys stay separate — each view genuinely fetches a different slice and merging
 * them into one key would make every screen refetch the wrong rows. What is shared
 * is the invalidation: when a number changes, every view of it is stale, so every
 * view is marked stale.
 *
 * `getUsersDetails` is included because assigning a number changes the person as
 * well as the number, and the two were already being invalidated together in most
 * places — just not all of them.
 */

export const NUMBER_LIST_QUERY_KEYS = [
  'allNumbersList',
  'usedNumbersList',
  'inventoryNumbersList',
  'allNumbersListInInventory',
  /* The By line view walks every page of the same endpoint and groups the
     result, so a label or a forwarding change makes it stale too. */
  'numbersByLine',
] as const;

/* Anything a number change also makes stale. */
const RELATED_QUERY_KEYS = ['getUsersDetails'] as const;

type Invalidator = {
  invalidateQueries: (filters: { queryKey: readonly unknown[] }) => unknown;
};

/* Call after any change to a number: assigning it, unassigning it, setting or
   clearing forwarding, buying, releasing. Safe to call when nothing changed —
   invalidation only marks stale, it does not force a fetch for screens that are
   not mounted. */
export const invalidateNumberLists = (
  queryClient: Invalidator,
  { includeRelated = true }: { includeRelated?: boolean } = {},
): void => {
  if (!queryClient?.invalidateQueries) return;

  NUMBER_LIST_QUERY_KEYS.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });

  if (includeRelated) {
    RELATED_QUERY_KEYS.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }
};

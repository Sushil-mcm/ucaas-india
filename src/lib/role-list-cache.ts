/* One place to say "the list of roles changed".
 *
 * The same list is read under three different query keys across the app —
 * `rolesList` (admin Roles table, Directory), `useRolesList` (role pickers on
 * People, Update Forwarding, Add User) and `useRolesListQueryFn` (the role
 * builder). Each screen used to invalidate only the one it happened to know
 * about, so creating or renaming a role left the other pickers showing the old
 * list until they were garbage-collected.
 *
 * Invalidation is non-exact on purpose: `useRolesList` is stored as
 * `['useRolesList', <bool>]` and `rolesList` as `['rolesList', <scope>]` in
 * places, so the prefix has to match every variant.
 */

export const ROLE_LIST_QUERY_KEYS = [
  'rolesList',
  'useRolesList',
  'useRolesListQueryFn',
] as const;

type Invalidator = {
  invalidateQueries: (filters: { queryKey: readonly unknown[] }) => unknown;
};

/** Call after any change to a role: create, rename, permission edit, delete. */
export const invalidateRoleLists = (queryClient: Invalidator): void => {
  if (!queryClient?.invalidateQueries) return;
  ROLE_LIST_QUERY_KEYS.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
};

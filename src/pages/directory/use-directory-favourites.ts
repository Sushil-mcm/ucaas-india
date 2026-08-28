import { useCallback } from 'react';
import { createLocalListStore } from '@/lib/local-list-store';

/**
 * Directory ▸ Favourites — the people you keep coming back to.
 *
 * The platform has no favourites endpoint for the directory. The only thing
 * resembling one is chat-scoped (`nats-add-to-fav` sets `favoriteChats` on a
 * conversation), which pins a *thread*, not a person, and only exists for people
 * you already have a chat with. Reusing it would silently change what a star
 * means, so this is a separate local list.
 *
 * Entries are stored as `kind:id` because the two sides of the directory are
 * different records with independent id spaces — a person is keyed by `uuid`,
 * an external contact by `_id` — and a bare id could collide across them.
 */

export type FavouriteKind = 'person' | 'contact';

const store = createLocalListStore('mcm-directory-favourites');

export const favouriteKey = (kind: FavouriteKind, id: string) => `${kind}:${id}`;

export const useDirectoryFavourites = () => {
  const favourites = store.use();

  const isFavourite = useCallback(
    (kind: FavouriteKind, id?: string) =>
      Boolean(id) && favourites.includes(favouriteKey(kind, String(id))),
    [favourites],
  );

  const toggleFavourite = useCallback((kind: FavouriteKind, id?: string) => {
    if (!id) return;
    store.toggle(favouriteKey(kind, String(id)));
  }, []);

  /** Just the ids of one kind, in the order they were starred. */
  const idsOf = useCallback(
    (kind: FavouriteKind) =>
      favourites
        .filter((entry) => entry.startsWith(`${kind}:`))
        .map((entry) => entry.slice(kind.length + 1)),
    [favourites],
  );

  return { favourites, isFavourite, toggleFavourite, idsOf, count: favourites.length };
};

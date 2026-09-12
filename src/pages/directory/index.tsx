import { useParams } from 'react-router-dom';
import { Suspense } from 'react';
import { DIRECTORY_VIEWS } from '@/components/custom/nav-areas';
import Loader from '@/components/custom/loader';
import People from './people';
import Groups from './groups';
import Contacts from '../new-contact';
import Locations from './locations';
import Roles from './roles';
import Favourites from './favourites';
import Blocked from './blocked';
import '@/components/mcm/mcm-page.css';

/**
 * Directory.
 *
 * The console splits this into People, Groups, Locations, External and
 * Favourites; the platform had it as Contact and Department. The names here
 * follow the console, and each one maps onto whichever platform surface
 * actually holds that data:
 *
 *   People     -> the organisation roster (users / extensions)
 *   Groups     -> departments
 *   Locations  -> sites
 *   External   -> the contact book — the platform's own Contacts page. There
 *                 used to be a second, read-only list of the same records
 *                 here, and its "New contact" button simply navigated to the
 *                 other one; two pages of the same contacts is one page too
 *                 many, so the one that can actually create, import, group and
 *                 export them is the one that stayed.
 *   Favourites -> no platform equivalent; pinned locally, see
 *                 `use-directory-favourites`
 *   Blocked    -> the contact book's Blocked tag, which had no list of its own
 */

/* The rail lights its FIRST view when the URL carries no `?view=`, and says so
   in its own comment. This page used to hardcode `people` instead, so landing on
   a bare /directory lit Contacts in the sidebar and rendered People in the body —
   two sources of truth for one default, disagreeing.
   Derived from the same list the rail is built from, which is how the
   Performance area already does it, so the two cannot drift apart again. */
const DEFAULT_VIEW = DIRECTORY_VIEWS[0].key;
const VIEW_KEYS = DIRECTORY_VIEWS.map((entry) => entry.key);

const Directory = () => {
  /* The page is `/directory/<view>`, so the segment says which page this is.
     Anything unrecognised falls back to the rail's first view rather than
     rendering an empty shell. */
  const { view: viewParam } = useParams();
  const requested = String(viewParam || '');
  const view = VIEW_KEYS.includes(requested) ? requested : DEFAULT_VIEW;

  return (
    <div className="mcm-page">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <Loader variant="blue" />
          </div>
        }
      >
        {view === 'people' && <People />}
        {view === 'groups' && <Groups />}
        {view === 'roles' && <Roles />}
        {view === 'external' && <Contacts />}
        {view === 'locations' && <Locations />}
        {view === 'favourites' && <Favourites />}
        {view === 'blocked' && <Blocked />}
      </Suspense>
    </div>
  );
};

export default Directory;

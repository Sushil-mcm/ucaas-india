import { Suspense } from 'react';
import { useSearchParamManager } from '@/hooks/use-search-params';
import Loader from '@/components/custom/loader';
import People from './people';
import Groups from './groups';
import External from './external';
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
 *   External   -> the contact book
 *   Favourites -> no platform equivalent; pinned locally, see
 *                 `use-directory-favourites`
 *   Blocked    -> the contact book's Blocked tag, which had no list of its own
 */

const Directory = () => {
  const { getParam } = useSearchParamManager();
  const view = String(getParam('view') || 'people');

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
        {view === 'external' && <External />}
        {view === 'locations' && <Locations />}
        {view === 'favourites' && <Favourites />}
        {view === 'blocked' && <Blocked />}
      </Suspense>
    </div>
  );
};

export default Directory;

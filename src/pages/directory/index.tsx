import { Suspense } from 'react';
import { useSearchParamManager } from '@/hooks/use-search-params';
import { Ic, McmIconSprite } from '@/components/mcm/icons';
import Loader from '@/components/custom/loader';
import People from './people';
import Groups from './groups';
import External from './external';
import Locations from './locations';
import Roles from './roles';
import '@/components/mcm/mcm-page.css';

/**
 * Directory.
 *
 * The console splits this into People, Groups, Locations, External and
 * Favourites; the platform had it as Contact and Department. The names here
 * follow the console, and each one maps onto whichever platform surface
 * actually holds that data:
 *
 *   People    -> the organisation roster (users / extensions)
 *   Groups    -> departments
 *   External  -> the contact book
 *
 * Locations and Favourites have no service behind them yet. They keep their
 * place in the rail and say so, rather than being dropped — a missing rail
 * entry reads as "not built", an honest empty state reads as "not yet".
 */

const NotYet = ({ title, detail }: { title: string; detail: string }) => (
  <div className="page">
    <McmIconSprite />
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
    </div>
    <div className="panel-card">
      <div className="empty" style={{ minHeight: 260 }}>
        <Ic n="alert" size={30} />
        <p>
          There is no service behind this yet, so there is nothing real to show. It is here because
          the console has it, and it will fill in once the platform can supply the data.
        </p>
      </div>
    </div>
  </div>
);

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
        {view === 'favourites' && (
          <NotYet
            title="Favourites"
            detail="The people you contact most, pinned for one-click reach."
          />
        )}
      </Suspense>
    </div>
  );
};

export default Directory;

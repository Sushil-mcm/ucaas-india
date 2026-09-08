import { useLocation, useNavigate } from 'react-router-dom';
import Identities from './Identities';
import Addresses from './addresses';
import Verification from './verification';
import { useState } from 'react';
import useDebounce from '@/hooks/use-debounce';
// import { Button } from '@/components/ui/button';
// import { Plus, SearchLine } from '@/assets/icons';
import { SearchLine } from '@/assets/icons';
import SideDrawer from '@/components/custom/side-drawer';
import CreateNewAddress from './addresses/create-new-address';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
const routeObj = {
  identities: '/admin-settings/numbers/identities',
  addresses: '/admin-settings/numbers/addresses',
  verifications: '/admin-settings/numbers/verifications',
};
const IdentitiesAndAddressesPageLayout = () => {
  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebounce(search, 800);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const getActiveTab = pathname?.split('/')[pathname?.split('/')?.length - 1];
  const activeTab = getActiveTab?.toLocaleLowerCase();
  const [drawerState, setDrawerState] = useState({
    addNewAddress: false,
  });
  const handleClose = (drawerName: string) =>
    setDrawerState((prev) => ({ ...prev, [drawerName]: false }));

  const handleTabChange = (route: string) => {
    navigate(routeObj[route as keyof typeof routeObj]);
    setSearch('');
  };

  const RenderTabComponents = {
    identities: <Identities search={debouncedSearch} />,
    addresses: <Addresses search={debouncedSearch} />,
    verifications: <Verification search={debouncedSearch} />,
  };

  const tabList = ['Identities', 'Addresses', 'Verifications'];

  /* The head takes its title from the nav registry, which lists this screen
     once, at /identities. The Addresses and Verifications tabs navigate to
     their own addresses, so there was nothing for the registry to match and
     the head rendered nothing at all — switching tab dropped the whole title
     bar. Naming it here keeps one title across all three, and puts the
     description behind the info button beside it: the AdminPage head that used
     to print it is turned off by `hideHead`, so it had gone unread. */
  useSetAdminPageMeta({
    title: 'Identities & addresses',
    description:
      'The registered identities and service addresses your numbers are issued against. Records are created while buying a number that requires one — this page is where you review and edit them.',
  });
  // const handleNewAddress = () => setDrawerState((prev) => ({ ...prev, addNewAddress: true }));
  return (
    <>
      <AdminPage
        hideHead
        bareBody
        filters={
          /* Tabs and search on one row, the same bar All numbers uses, so the
             two Numbers screens read as one design. */
          <div className="mcm-numbar">
            <nav className="mcm-numtabs" aria-label="Identity views">
              {tabList.map((tab) => {
                const key = tab.toLocaleLowerCase();
                return (
                  <button
                    type="button"
                    key={key}
                    aria-current={activeTab === key ? 'page' : undefined}
                    className={`mcm-numtab ${activeTab === key ? 'on' : ''}`}
                    onClick={() => handleTabChange(key)}
                  >
                    {tab}
                  </button>
                );
              })}
            </nav>
            <label className="mcm-numsearch">
              <SearchLine />
              <input
                type="search"
                placeholder="Search"
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.startsWith(' ')) return;
                  setSearch(value);
                }}
              />
            </label>
          </div>
        }
      >
        {RenderTabComponents[activeTab as keyof typeof RenderTabComponents]}
      </AdminPage>
      {drawerState.addNewAddress && (
        <SideDrawer
          width="min(1040px, 84vw)"
          title="Add New Address"
          isOpen={drawerState.addNewAddress}
          isTab={false}
          handleClose={() => handleClose('addNewAddress')}
          content={<CreateNewAddress />}
        />
      )}
    </>
  );
};

export default IdentitiesAndAddressesPageLayout;

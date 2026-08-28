import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation, useNavigate } from 'react-router-dom';
import Identities from './Identities';
import Addresses from './addresses';
import Verification from './verification';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import useDebounce from '@/hooks/use-debounce';
// import { Button } from '@/components/ui/button';
// import { Plus, SearchLine } from '@/assets/icons';
import { SearchLine } from '@/assets/icons';
import SideDrawer from '@/components/custom/side-drawer';
import CreateNewAddress from './addresses/create-new-address';
import { AdminPage } from '@/pages/admin-settings/page-shell';
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
  // const handleNewAddress = () => setDrawerState((prev) => ({ ...prev, addNewAddress: true }));
  return (
    <>
      <AdminPage
        section="Numbers"
        title="Identities & addresses"
        description="The registered identities and service addresses your numbers are issued against. Records are created while buying a number that requires one — this page is where you review and edit them."
        filters={
          <Input
            placeholder="Search"
            className="pl-10 w-full min-h-9 rounded-lg"
            IconPosition="left-0 pl-2 inset-y-0"
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith(' ')) return;
              setSearch(e.target.value);
            }}
            Icon={<SearchLine className=" text-gray-700" />}
          />
        }
      >
        <Tabs
          defaultValue={activeTab}
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex w-full"
        >
          <div className="w-full">
            <TabsList className="ptabstrip">
              {tabList?.map((tab: any) => {
                return (
                  <TabsTrigger className="" value={tab?.toLocaleLowerCase()}>
                    {tab}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value={activeTab}>
            {RenderTabComponents[activeTab as keyof typeof RenderTabComponents]}
          </TabsContent>
        </Tabs>
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

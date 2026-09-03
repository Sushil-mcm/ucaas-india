import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import PageSidebarLayout from '@/layout/page-sidebar-layout';
import '@/components/mcm/mcm-page.css';
import { AddCircle } from '@/assets/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RouteSuspense } from '@/components/custom/route-suspense';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getDepartmentList, getUserList } from '@/services/api';
import UsersLeftContent from './users-list';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DepartmentLeftContent from './department-list';
import NotFound from '@/assets/images/not-found-img.svg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/assets/icons/icon';
import AddUsers from '../admin-settings/people/add-users';
import NewDepartment from '../admin-settings/phone-systems/departments/new-department';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import useDebounce from '@/hooks/use-debounce';
import SideDrawer from '@/components/custom/side-drawer';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';

const DEPARTMENT_PAGE_LIMIT = 25;

const getNextPage = (lastPage: any) => {
  const result = lastPage?.data?.data?.result;
  const currentPage = Number(result?.currentPage ?? 1);
  const totalPages = Number(result?.totalPages ?? 1);

  return currentPage < totalPages ? currentPage + 1 : undefined;
};

const useLastItemObserver = ({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: {
  fetchNextPage: () => void | Promise<unknown>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
    },
    [],
  );

  return useCallback(
    (node: HTMLLIElement | null) => {
      observerRef.current?.disconnect();

      if (!node || !hasNextPage || isFetchingNextPage) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        },
        { threshold: 0.1 },
      );

      observerRef.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );
};

const LeftContent = ({
  setTabData,
  tabData,
  activeTab,
  setActiveTab,
  userListData,
  departmentData,
  setUserSearch,
  setDepartmentSearch,
  userSearch,
  departmentSearch,
  isFetching,
  isFetchingDepartment,
  refetchDepartment,
  refetch,
  isPending,
  isPendingDepartmentList,
  debouncedUserSearch,
  debouncedDepartmentSearch,
  setDrawerState,
  features,
  setShowDetailOnMobile,
  lastUserItemRef,
  lastDepartmentItemRef,
  isFetchingNextUserPage,
  isFetchingNextDepartmentPage,
}: any) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const canViewUsers = Boolean(
    features?.plan_features?.account_setting?.access?.USER?.action?.view,
  );
  const canViewDepartments = Boolean(
    features?.plan_features?.phone_system_action?.access?.DEPARTMENT &&
    features?.plan_features?.phone_system_action?.action?.view,
  );
  const defaultTab = canViewUsers ? 'extension' : canViewDepartments ? 'organization' : 'extension';
  const isActiveListFetching =
    activeTab === 'extension'
      ? isFetching && !isFetchingNextUserPage
      : isFetchingDepartment && !isFetchingNextDepartmentPage;

  useEffect(() => {
    const routeTab = pathname?.split('/')?.[2];
    const nextTab =
      routeTab === 'extension' && canViewUsers
        ? 'extension'
        : routeTab === 'organization' && canViewDepartments
          ? 'organization'
          : defaultTab;

    setActiveTab(nextTab);

    if (routeTab !== nextTab) {
      navigate(`/department/${nextTab}`, { replace: true });
    }
  }, [pathname, canViewUsers, canViewDepartments, defaultTab]);

  const handleTabChange = (val: string) => {
    setUserSearch('');
    setDepartmentSearch('');
    setActiveTab(val);
    setShowDetailOnMobile(false);
    if (val === 'extension') {
      const firstUser = userListData?.[0];
      setTabData(firstUser);
      navigate(
        firstUser?.uuid ? `/department/extension/${firstUser.uuid}` : '/department/extension',
      );
    } else if (val === 'organization') {
      // const firstDepartment = departmentData?.[0] || {};
      navigate(`/department/organization`);
    }
  };

  return (
    <Tabs
      className="flex h-full w-full min-w-0 flex-col"
      value={activeTab}
      onValueChange={handleTabChange}
    >
      <div className="flex w-full min-w-0 flex-col gap-2">
        <TabsList className="ptabstrip w-full" style={{ margin: 0, padding: '0 12px' }}>
          {canViewUsers && <TabsTrigger value="extension">People</TabsTrigger>}
          {canViewDepartments && <TabsTrigger value="organization">Groups</TabsTrigger>}
        </TabsList>
        <div className="flex items-center w-full min-w-0 gap-2 px-3">
          <Input
            IconPosition="left-0 pl-2 inset-y-0"
            placeholder="Search by name and extension number"
            className="min-w-0 pl-10"
            value={activeTab === 'extension' ? userSearch : departmentSearch}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith(' ')) return;

              if (activeTab === 'extension') {
                setUserSearch(value);
              } else {
                setDepartmentSearch(value);
              }
            }}
            Icon={<Icon name="SearchLine" className=" text-[#2E2D35]" />}
          />
          <Button
            className="btn ghost shrink-0"
            style={{ width: 40, padding: 0 }}
            type="button"
            variant={'ghost'}
            onClick={() => {
              if (activeTab === 'extension') {
                refetch();
              } else {
                refetchDepartment();
              }
            }}
          >
            {isActiveListFetching ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Icon name="Refresh" className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
      {canViewUsers && (
        <TabsContent value="extension" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <UsersLeftContent
            ListData={userListData}
            isPending={isPending}
            setTabData={setTabData}
            tabData={tabData}
            activeTab={activeTab}
            debouncedUserSearch={debouncedUserSearch}
            setDrawerState={setDrawerState}
            setShowDetailOnMobile={setShowDetailOnMobile}
            lastItemRef={lastUserItemRef}
            isFetchingNextPage={isFetchingNextUserPage}
          />
        </TabsContent>
      )}
      {canViewDepartments && (
        <TabsContent value="organization" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <DepartmentLeftContent
            departmentData={departmentData}
            isPending={isPendingDepartmentList}
            setTabData={setTabData}
            tabData={tabData}
            activeTab={activeTab}
            debouncedDepartmentSearch={debouncedDepartmentSearch}
            setDrawerState={setDrawerState}
            setShowDetailOnMobile={setShowDetailOnMobile}
            lastItemRef={lastDepartmentItemRef}
            isFetchingNextPage={isFetchingNextDepartmentPage}
          />
        </TabsContent>
      )}
    </Tabs>
  );
};

const Departments = () => {
  const { id } = useParams();
  const [tabData, setTabData] = useState<any>({});
  const [activeTab, setActiveTab] = useState('extension');
  console.log(activeTab, 'activeTab');

  const [userSearch, setUserSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const debouncedDepartmentSearch = useDebounce(departmentSearch, 300);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(Boolean(id));
  const [drawerState, setDrawerState] = useState<any>({
    addUser: false,
    createDepartment: false,
  });

  const { features } = useCompanyFeatures();
  const { user } = useUser();
  const canViewUsers = Boolean(
    features?.plan_features?.account_setting?.access?.USER?.action?.view,
  );
  const canViewDepartments = Boolean(
    features?.plan_features?.phone_system_action?.access?.DEPARTMENT &&
    features?.plan_features?.phone_system_action?.action?.view,
  );
  const isPlanExpired = user?.company_info?.plan_status === 'EXPIRED';
  const isTrial = user?.company_info?.is_trial === 'Y';

  const {
    data: userPages,
    isLoading,
    refetch,
    isFetching,
    fetchNextPage: fetchNextUserPage,
    hasNextPage: hasNextUserPage = false,
    isFetchingNextPage: isFetchingNextUserPage,
  } = useInfiniteQuery({
    queryKey: ['fetchUsersList', debouncedUserSearch],
    queryFn: ({ pageParam }) =>
      getUserList({
        page: pageParam,
        limit: DEPARTMENT_PAGE_LIMIT,
        search: debouncedUserSearch,
      }),
    initialPageParam: 1,
    getNextPageParam: getNextPage,
    enabled: activeTab === 'extension' && canViewUsers,
  });

  const userListData = useMemo(
    () => userPages?.pages?.flatMap((page) => page?.data?.data?.result?.rows || []) || [],
    [userPages],
  );

  const {
    data: departmentPages,
    isLoading: isPendingDepartmentList,
    refetch: refetchDepartment,
    isFetching: isFetchingDepartment,
    fetchNextPage: fetchNextDepartmentPage,
    hasNextPage: hasNextDepartmentPage = false,
    isFetchingNextPage: isFetchingNextDepartmentPage,
  } = useInfiniteQuery({
    queryKey: ['getDepartmentList', debouncedDepartmentSearch],
    queryFn: ({ pageParam }) =>
      getDepartmentList({
        page: pageParam,
        limit: DEPARTMENT_PAGE_LIMIT,
        search: debouncedDepartmentSearch,
        // filter: [{ key: 'name', value: debouncedDepartmentSearch || '' }],
      }),
    initialPageParam: 1,
    getNextPageParam: getNextPage,
    enabled: activeTab === 'organization' && canViewDepartments,
  });

  const departmentData = useMemo(
    () => departmentPages?.pages?.flatMap((page) => page?.data?.data?.result?.rows || []) || [],
    [departmentPages],
  );
  const isActiveListLoading = activeTab === 'extension' ? isLoading : isPendingDepartmentList;

  const lastUserItemRef = useLastItemObserver({
    fetchNextPage: fetchNextUserPage,
    hasNextPage: hasNextUserPage,
    isFetchingNextPage: isFetchingNextUserPage,
  });
  const lastDepartmentItemRef = useLastItemObserver({
    fetchNextPage: fetchNextDepartmentPage,
    hasNextPage: hasNextDepartmentPage,
    isFetchingNextPage: isFetchingNextDepartmentPage,
  });

  const handleAddUsers = () => {
    if (isPlanExpired) {
      handleAlert({
        text: 'You cannot add users until your subscription is renewed.',
        type: 'error',
      });
      return;
    }

    if (isTrial) {
      handleAlert({
        text: 'This feature is not available in your current plan. Please upgrade',
        type: 'error',
      });
      return;
    }

    setDrawerState({ addUser: true });
  };
  const canAddUser =
    canViewUsers && features?.plan_features?.account_setting?.access?.USER?.action?.add;

  const canCreateDepartment =
    canViewDepartments && features?.plan_features?.phone_system_action?.action?.add;
  return (
    <>
      <div className="mcm-page">
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
          <div className={`${showDetailOnMobile ? 'hidden lg:block' : 'block'} w-full lg:w-auto`}>
            <PageSidebarLayout
              title="Users / Groups"
              action={
                canAddUser || canCreateDepartment ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <div className="cursor-pointer flex items-center justify-center rounded-full w-10 h-10 bg-[#FBE2C8]/40 text-[#2E2D35]/80 hover:bg-primary hover:text-white">
                        <AddCircle className="w-6 h-6" />
                      </div>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent>
                      {canAddUser && (
                        <DropdownMenuItem className="cursor-pointer" onClick={handleAddUsers}>
                          <Icon name="UserPlusLine" className="text-[#2E2D35] w-8 h-8" />
                          Add New User
                        </DropdownMenuItem>
                      )}

                      {canCreateDepartment && (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => setDrawerState({ createDepartment: true })}
                        >
                          <Icon name="UsersGroupLine" className="text-[#2E2D35] w-8 h-8" />
                          Create Department
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null
              }
              content={
                <LeftContent
                  setTabData={setTabData}
                  tabData={tabData}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  userListData={userListData}
                  departmentData={departmentData}
                  userSearch={userSearch}
                  setUserSearch={setUserSearch}
                  departmentSearch={departmentSearch}
                  setDepartmentSearch={setDepartmentSearch}
                  refetch={refetch}
                  refetchDepartment={refetchDepartment}
                  isPending={isLoading}
                  isPendingDepartmentList={isPendingDepartmentList}
                  isFetching={isFetching}
                  isFetchingDepartment={isFetchingDepartment}
                  debouncedUserSearch={debouncedUserSearch}
                  debouncedDepartmentSearch={debouncedDepartmentSearch}
                  setDrawerState={setDrawerState}
                  features={features}
                  setShowDetailOnMobile={setShowDetailOnMobile}
                  lastUserItemRef={lastUserItemRef}
                  lastDepartmentItemRef={lastDepartmentItemRef}
                  isFetchingNextUserPage={isFetchingNextUserPage}
                  isFetchingNextDepartmentPage={isFetchingNextDepartmentPage}
                />
              }
            />
          </div>

          <div
            className={`${showDetailOnMobile ? 'flex' : 'hidden lg:flex'} min-h-0 flex-1 flex-col overflow-hidden`}
          >
            {showDetailOnMobile && (
              <div className="flex min-h-[52px] items-center border-b border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 lg:hidden">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 px-2 text-[#2E2D35] hover:bg-[#FBE2C8]/40 hover:text-black"
                  onClick={() => setShowDetailOnMobile(false)}
                >
                  <Icon name="ChevronIcon" className="h-4 w-4 rotate-90" />
                  Back
                </Button>
              </div>
            )}
            {activeTab === 'extension' &&
              !id &&
              !isActiveListLoading &&
              userListData?.length === 0 &&
              canViewUsers &&
              (features?.plan_features?.account_setting?.access?.USER?.action?.add ? (
                <div className="m-auto flex flex-col items-center justify-center border border-[rgba(225,200,165,0.9)] rounded-xl bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-10 w-fit gap-7 max-w-80">
                  <div className="flex flex-col justify-center items-center gap-2">
                    <Icon name="NotFound" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[#2E2D35] text-sm whitespace-normal">
                      There is nothing to show here yet. Start by adding some users.
                    </p>
                    <Button type="submit" className="w-fit mt-3" onClick={handleAddUsers}>
                      <Icon name="Plus" className="w-3 h-3" />
                      Add User
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="m-auto flex flex-col items-center justify-center  p-10 w-fit gap-7 max-w-80">
                  <div className="flex flex-col justify-center items-center gap-2">
                    <img src={NotFound} alt="BusyImage" className="min-w-36 w-36" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[#2E2D35] text-sm text-center font-medium">No data found</p>
                  </div>
                </div>
              ))}

            {activeTab === 'organization' &&
              !id &&
              !isActiveListLoading &&
              departmentData?.length === 0 &&
              canViewDepartments &&
              (features?.plan_features?.phone_system_action?.action?.add ? (
                <div className="m-auto flex flex-col items-center justify-center border border-[rgba(225,200,165,0.9)] rounded-xl bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-10 w-fit gap-7 max-w-80">
                  <div className="flex flex-col justify-center items-center gap-2">
                    {/* <Icon name="NotFound" /> */}
                    <img src={NotFound} alt="BusyImage" className="min-w-36 w-36" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[#2E2D35] text-sm text-center ">
                      There is nothing to show here yet. Start by adding some departments.
                    </p>
                    <Button
                      type="submit"
                      variant={'primary'}
                      className="w-fit mt-3"
                      onClick={() => setDrawerState({ createDepartment: true })}
                    >
                      <Icon name="Plus" className="w-3 h-3" />
                      Create Department
                    </Button>
                  </div>
                </div>
              ) : (
                activeTab === 'organization' && (
                  <div className="m-auto flex flex-col items-center justify-center p-10 w-fit gap-7 max-w-80">
                    <div className="flex flex-col justify-center items-center gap-2">
                      <img src={NotFound} alt="BusyImage" className="min-w-36 w-36" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-[#2E2D35] text-sm text-center font-medium">No data found</p>
                    </div>
                  </div>
                )
              ))}

            <RouteSuspense>
              <Outlet
                context={{
                  setTabData,
                  tabData,
                  isLoading: isActiveListLoading,
                }}
              />
            </RouteSuspense>
          </div>
        </div>
      </div>

      {drawerState.addUser && (
        <SideDrawer
          isOpen={drawerState.addUser}
          title="Add Users"
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
          handleClose={() => setDrawerState({ addUser: false })}
          content={<AddUsers setDrawerState={setDrawerState} />}
        />
      )}
      {drawerState.createDepartment && (
        <SideDrawer
          isOpen={drawerState.createDepartment}
          title="Create group"
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
          handleClose={() => setDrawerState({ createDepartment: false })}
          content={<NewDepartment drawerState={drawerState} setDrawerState={setDrawerState} />}
        />
      )}
    </>
  );
};

export default Departments;

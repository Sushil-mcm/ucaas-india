import { Icon } from '@/assets/icons/icon';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import Loader from '@/components/custom/loader';
import SideDrawer from '@/components/custom/side-drawer';
import { Button } from '@/components/ui/button';
import { useCompanyFeatures } from '@/hooks/rbac';
import { capitalizeFirstLetter, getObjectLength, handleAlert } from '@/lib/utils';
import NewDepartment from '@/pages/admin-settings/phone-systems/departments/new-department';
import { deleteDepartment } from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useUser } from '@/hooks/use-user';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useDialpad } from '@/hooks/use-dialpad';

const DepartmentDetails = () => {
  const queryClient = useQueryClient();
  const { tabData = null, setTabData = () => {}, isLoading } = useOutletContext<any>();
  const [modalState, setModalState] = useState<any>(false);
  const [drawerState, setDrawerState] = useState<any>(false);
  const [drawerDepartmentData, setDrawerDepartmentData] = useState<any>({});
  const { features } = useCompanyFeatures();

  const phoneSystem = features?.plan_features?.phone_system_action;
  const hasDepartmentAccess = Boolean(phoneSystem?.access?.DEPARTMENT);
  const departmentActions = phoneSystem?.action;

  const { members = '[]', manager = '{}' } = tabData || {};
  const navigate = useNavigate();
  const { user } = useUser();
  const { usersOnlineStatus, createNewChat, createPrivateChatId } = useSocketEvents();
  const { makeCall, sessions } = useDialpad();
  const extension = user?.user_info?.extension;
  const isMeOnCall = usersOnlineStatus?.find((user) => user?.userId == extension)?.onCall;

  const iamOnCall = Object.values(sessions || {}).some((session: any) => {
    const status = String(session?.status || '').toLowerCase();
    return ['ringing', 'connecting', 'confirmed', 'calling'].includes(status);
  });

  let departmentMembers = [];
  let managerInfo: any = {};

  try {
    const parsedMembers =
      tabData && members
        ? typeof members === 'string'
          ? JSON.parse(members || '[]')
          : members || []
        : [];
    departmentMembers = Array.isArray(parsedMembers)
      ? Array.from(new Map(parsedMembers.map((item: any) => [item.user_uuid, item])).values())
      : [];
    managerInfo =
      tabData && manager
        ? typeof manager === 'string'
          ? JSON.parse(manager || '{}')
          : manager || {}
        : {};
  } catch (error) {
    console.error('Error parsing members:', error);
  }

  const { mutate: mutateDeleteDepartment, isPending } = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['getDepartmentList'],
        exact: false,
      });
      handleAlert({ text: 'Group deleted successfully', type: 'success' });
      setTabData({});
      setModalState(false);
      navigate(-1);
    },
  });

  const isOnCallWithUser = (userExtension: any) => {
    console.log('🚀 ~ isOnCallWithUser ~ userExtension:', userExtension);
    // const checkCall = Object.values(_uiSessions).find(
    //   (call: any) => call?._number === userExtension,
    // );
    // return checkCall ? true : false;
  };

  const handleMakeCall = (_name: string, number: any) => {
    console.log('🚀 ~ handleMakeCall ~ _name:', _name);
    if (!number || iamOnCall) return;
    makeCall(String(number));
  };

  const handleStartChat = (memberData: any) => {
    if (!memberData?.user_uuid) return;
    createNewChat({ uuid: memberData?.user_uuid, ...memberData });
    navigate(
      `/messenger?channel=chat&type=all&chatId=${createPrivateChatId([user?.uuid, memberData?.user_uuid])}&exact=true`,
    );
  };

  return (
    <>
      <section className="w-full min-w-0 bg-gray-200/15 flex flex-col overflow-hidden gap-3 h-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full ">
            <Loader variant="blue" size="sm" />
          </div>
        ) : !tabData?.uuid ? (
          <div className="m-auto flex flex-col items-center justify-center border border-gray-200 rounded-xl bg-white p-10 w-fit gap-7 max-w-80">
            <div className="flex flex-col justify-center items-center gap-2">
              <Icon name="NotFound" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-gray-800 text-sm whitespace-normal">
                There is nothing to show here yet. Start by adding some departments.
              </p>
              <Button
                type="submit"
                className="w-fit mt-3"
                onClick={() => {
                  setDrawerDepartmentData({});
                  setDrawerState(true);
                }}
              >
                <Icon name="Plus" className="w-3 h-3" />
                Create Department
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full min-w-0 px-3 bg-white gap-2 flex items-center justify-between rounded-none border-b border-gray-200 min-h-[65px] ">
              <div className="relative shrink-0">
                <CustomAvatar name={tabData?.name} />
              </div>
              <div className="flex min-w-0 items-center justify-between w-[calc(100%_-_3rem)]">
                <div className="flex min-w-0 flex-col">
                  <p className="font-semibold text-gray-900 truncate text-md">
                    {tabData?.name || 'Unknown group'}
                  </p>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-gray-800 truncate text-sm capitalize">
                      {capitalizeFirstLetter(managerInfo?.label || '') || ''}
                    </p>
                    <div className="flex shrink-0 items-center gap-1 text-gray-500">
                      <Icon name="Grid" className="w-4 h-4" />
                      <small className="text-xs">{tabData?.extension || '--'}</small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2 items-center">
                {hasDepartmentAccess && departmentActions?.edit && (
                  <CustomTooltip text="Edit" side="top">
                    <div
                      onClick={() => {
                        setDrawerDepartmentData(tabData || {});
                        setDrawerState(true);
                      }}
                      className="cursor-pointer flex items-center justify-center rounded-full w-9 h-9 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                    >
                      <Icon name="EditStrokIcon" className="w-5 h-5" />
                    </div>
                  </CustomTooltip>
                )}
                {hasDepartmentAccess && departmentActions?.delete && (
                  <CustomTooltip text="Delete" side="top">
                    <div
                      onClick={() => setModalState(true)}
                      className="cursor-pointer flex items-center justify-center rounded-full w-9 h-9 bg-red-100   text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Icon name="TrashBin" className="w-5 h-5" />
                    </div>
                  </CustomTooltip>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 h-[calc(100vh_-_10.3rem)] overflow-auto p-3">
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-gray-900 text-md">Description</p>
                  <p className={`text-gray-800 text-sm ${!tabData?.description && ''}`}>
                    {tabData?.description || 'No description provided '}
                  </p>
                </div>
              </div>
              {/* Department Manager */}
              <div className="bg-white border border-gray-200 rounded-xl p-3 ">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-gray-900 truncate text-md">Department Manager</p>
                  {/* <div className="w-1/4 px-1.5"> */}
                  <div className="w-full flex min-w-0 flex-col gap-3">
                    <div className="flex min-w-0 flex-col border border-gray-200 bg-gray-100 rounded-xl w-full p-3 gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-1">
                      <CustomAvatar
                        name={managerInfo?.label}
                        showPresence
                        extension={managerInfo?.value}
                        image={managerInfo?.profile}
                      />

                      <div className="flex min-w-0 flex-col sm:w-[calc(100%_-_3.5rem)]">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                          <p className="capitalize text-md truncate">{managerInfo?.label}</p>
                          <div className="flex shrink-0 gap-1">
                            <Icon name="Grid" className="w-4 h-4 text-gray-500" />
                            <div className="text-gray-500 truncate text-xs">
                              {managerInfo?.value || ''}
                            </div>
                          </div>
                        </div>
                        <small className="text-primary text-[10px]">{managerInfo?.role}</small>
                        <div className="flex flex-col gap-1">
                          <small className="text-gray-500 truncate text-sm">
                            <CustomTooltip text={managerInfo?.email}>
                              <span>{managerInfo?.email}</span>
                            </CustomTooltip>
                          </small>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2 items-center">
                        {managerInfo?.value && managerInfo?.user_uuid != user?.uuid ? (
                          <>
                            <CustomTooltip text="Call" side="top">
                              <div
                                className={`flex items-center justify-center rounded-full w-8 h-8 ${
                                  isMeOnCall || isOnCallWithUser(managerInfo?.value) || iamOnCall
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-100 text-green-500 hover:bg-green-400 hover:text-white cursor-pointer'
                                }`}
                                onClick={() =>
                                  handleMakeCall(managerInfo?.label, managerInfo?.value)
                                }
                              >
                                <Icon name="PhoneIcon" className="w-4 h-4" />
                              </div>
                            </CustomTooltip>
                            {managerInfo?.user_uuid && (
                              <CustomTooltip text="Start Chat" side="top">
                                <div
                                  className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-gray-100 text-gray-900/80 hover:bg-primary bg-ucass-primary-200 hover:text-white"
                                  onClick={() => handleStartChat(managerInfo)}
                                >
                                  <Icon name="MessageStrokIcon" className="w-4 h-4" />
                                </div>
                              </CustomTooltip>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Members */}
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex flex-col gap-1">
                  <h6 className="font-semibold text-gray-900 truncate text-md">Members</h6>
                  <div className="flex flex-wrap gap-y-2.5">
                    {departmentMembers && departmentMembers?.length > 0 ? (
                      departmentMembers?.map((member: any) => {
                        return (
                          // <div className="w-1/4 px-1.5" key={member?.uuid}>
                          <div className="w-full flex min-w-0 flex-col gap-3" key={member?.uuid}>
                            <div
                              className="flex min-w-0 flex-col border border-gray-200 bg-gray-100 rounded-xl w-full p-3 gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-1"
                              key={member?.uuid}
                            >
                              <CustomAvatar
                                name={member?.label}
                                showPresence
                                extension={member?.value}
                                image={member?.profile}
                              />
                              <div className="flex min-w-0 flex-col sm:w-[calc(100%_-_3.5rem)]">
                                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                                  <p className="capitalize text-md truncate">{member?.label}</p>
                                  <div className="flex shrink-0 gap-1">
                                    <Icon name="Grid" className="w-4 h-4 text-gray-500" />
                                    <div className="text-gray-500 truncate text-xs">
                                      {member?.value || member?.value || ''}
                                    </div>
                                  </div>
                                </div>
                                <small className="text-primary text-[10px]">{member?.role}</small>
                                <div className="flex flex-col gap-1">
                                  <small className="text-gray-500 truncate text-sm">
                                    <CustomTooltip text={member?.email}>
                                      <span>{member?.email}</span>
                                    </CustomTooltip>
                                  </small>
                                </div>
                              </div>
                              <div className="flex shrink-0 gap-2 items-center">
                                {member?.value && member?.user_uuid != user?.uuid ? (
                                  <>
                                    <CustomTooltip text="Call" side="top">
                                      <div
                                        className={`flex items-center justify-center rounded-full w-8 h-8 ${
                                          isMeOnCall || isOnCallWithUser(member?.value)
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-green-100 text-green-500 hover:bg-green-400 hover:text-white cursor-pointer'
                                        }`}
                                        onClick={() => handleMakeCall(member?.label, member?.value)}
                                      >
                                        <Icon name="PhoneIcon" className="w-4 h-4" />
                                      </div>
                                    </CustomTooltip>
                                    {member?.user_uuid && (
                                      <CustomTooltip text="Start Chat" side="top">
                                        <div
                                          className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white bg-ucass-primary-200"
                                          onClick={() => handleStartChat(member)}
                                        >
                                          <Icon name="MessageStrokIcon" className="w-4 h-4" />
                                        </div>
                                      </CustomTooltip>
                                    )}
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p>No members found in this departments</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <AlertConfirm
          {...{
            apiLoading: isPending,
            onConfirm: () => {
              mutateDeleteDepartment(tabData?.uuid);
            },
            open: modalState,
            setOpen: setModalState,
          }}
        />

        {drawerState && (
          <SideDrawer
            isOpen={drawerState}
            title={
              getObjectLength(drawerDepartmentData)
                ? `Update Department (${drawerDepartmentData?.name})`
                : 'Create group'
            }
            enableResponsive
            responsiveWidth="96vw"
            responsiveBreakpoint={1024}
            headerClassName="min-h-8 px-4 sm:px-5"
            handleClose={() => {
              setDrawerState(false);
              setDrawerDepartmentData({});
            }}
            content={
              <NewDepartment
                drawerState={drawerState}
                setDrawerState={setDrawerState}
                rowData={drawerDepartmentData}
                setTabData={setTabData}
              />
            }
          />
        )}
      </section>
    </>
  );
};

export default DepartmentDetails;

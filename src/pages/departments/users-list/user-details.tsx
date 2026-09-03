import { FC, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { capitalizeFirstLetter, cn, handleAlert } from '@/lib/utils';
import { deleteMember } from '@/services/api';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Icon, IconName } from '@/assets/icons/icon';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import AlertConfirm from '@/components/custom/alert-confirm';
import UpdateForwarding from '@/pages/admin-settings/people/update-forwarding';
import Loader from '@/components/custom/loader';
import SideDrawer from '@/components/custom/side-drawer';
import IndividualAssignNumber from '@/pages/admin-settings/people/add-users/individual-assign-number';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useDialpad } from '@/hooks/use-dialpad';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';

const UserDetails: FC = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { tabData = {}, setTabData = null, isLoading } = useOutletContext<any>();
  const [modalState, setModalState] = useState<any>(false);
  const [drawerState, setDrawerState] = useState<any>({
    isEdit: false,
    isAssignNumber: false,
  });
  const { usersOnlineStatus, createNewChat, createPrivateChatId } = useSocketEvents();
  const navigate = useNavigate();

  const user_name = `${tabData?.first_name} ${tabData?.last_name}`;
  const { features } = useCompanyFeatures();
  const userAccess = features?.plan_features?.account_setting?.access?.USER?.action;
  console.log('🚀 ~ UserDetails ~ userAccess:', userAccess);
  const { makeCall, sessions } = useDialpad();
  const extension = user?.user_info?.extension;
  const isMeOnCall = usersOnlineStatus?.find((user) => user?.userId == extension)?.onCall;

  const { mutate: mutateDeleteUser, isPending } = useMutation({
    mutationFn: deleteMember,
    onSuccess: (data) => {
      handleAlert({ text: data?.data?.message || 'Member deleted successfully', type: 'success' });
      queryClient.invalidateQueries({
        queryKey: ['fetchUsersList'],
        exact: false,
      });
      invalidateGlobalUsersDirectory(queryClient);
      setTabData({});
      setModalState(false);
    },
  });

  const iamOnCall = Object.values(sessions || {}).some((session: any) => {
    const status = String(session?.status || '').toLowerCase();
    return ['ringing', 'connecting', 'confirmed', 'calling'].includes(status);
  });
  const handleMakeCall = (_name: string, number: any) => {
    if (!number || iamOnCall) return;
    makeCall(String(number));
  };

  const isSelf = user?.uuid === tabData?.uuid;
  const IS_ADMIN = user?.user_info?.role === 'ADMIN';

  const actions = [
    userAccess?.is_chat && {
      icon: 'MessageIcon',
      onClick: () => {
        createNewChat({ ...tabData });
        navigate(
          `/messenger?channel=chat&type=all&chatId=${createPrivateChatId([user?.uuid, tabData?.uuid])}&exact=true`,
        );
      },
      className:
        'cursor-pointer flex items-center justify-center rounded-full w-9 h-9 bg-[#FBE2C8]/40 text-[#2E2D35]/80 hover:bg-primary hover:text-white',
      tooltipText: 'Chat',
      access: !isSelf,
    },
    IS_ADMIN &&
      userAccess?.edit && {
        icon: 'EditStrokIcon',
        onClick: () => setDrawerState({ isEdit: true }),
        className:
          'cursor-pointer flex items-center justify-center rounded-full w-9 h-9 bg-[#FBE2C8]/40 text-[#2E2D35]/80 hover:bg-primary hover:text-white',
        tooltipText: 'Edit',
        access: true,
      },
    userAccess?.is_call && {
      icon: 'PhoneIcon',
      onClick: () => handleMakeCall(user_name, tabData?.extension),
      className: `${iamOnCall ? 'bg-[#F0DFC5] text-[#9A948F] cursor-not-allowed' : 'bg-green-100 text-green-500 hover:bg-green-400 hover:text-white cursor-pointer'}  flex items-center justify-center rounded-full w-9 h-9`,
      tooltipText: 'Call',
      access: !isSelf || isMeOnCall || iamOnCall,
    },
    userAccess?.delete && {
      icon: 'TrashBin',
      onClick: () => !isSelf && setModalState(true),
      className: `flex items-center justify-center rounded-full w-9 h-9 
      ${
        isSelf
          ? 'bg-[#F0DFC5] text-[#9A948F] cursor-not-allowed'
          : 'cursor-pointer bg-red-100 text-red-500 hover:bg-red-500 hover:text-white'
      }`,
      tooltipText: 'Delete',
      access: isSelf && tabData?.role !== 'ADMIN',
    },
  ].filter(Boolean);

  return (
    <section className="w-full min-w-0 flex flex-col overflow-hidden gap-3 h-full">
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full">
          <Loader variant="blue" size="sm" />
        </div>
      ) : !tabData?.uuid ? (
        <div className="m-auto flex flex-col items-center justify-center border border-[rgba(225,200,165,0.9)] rounded-xl bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-10 w-fit gap-7 max-w-80">
          <div className="flex flex-col justify-center items-center gap-2">
            <Icon name="NotFound" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[#2E2D35] text-sm whitespace-normal">
              There is nothing to show here yet. Start by adding some users.
            </p>
            {userAccess?.add && (
              <Button
                type="submit"
                className="w-fit mt-3"
                onClick={() => setDrawerState({ addUser: true })}
              >
                <Icon name="Plus" className="w-3 h-3" />
                Add User
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full h-full">
          <div className="w-full min-w-0 px-3 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] gap-2 flex items-center justify-between rounded-none border-b border-[rgba(225,200,165,0.9)] min-h-[65px] ">
            <div className="relative w-10 h-10 shrink-0">
              <CustomAvatar
                name={user_name}
                showPresence
                extension={tabData?.extension}
                image={tabData?.profile}
              />
            </div>
            <div className="flex min-w-0 items-center justify-between w-[calc(100%_-_3rem)]">
              <div className="flex min-w-0 flex-col">
                <p className="font-semibold text-[#2E2D35] truncate text-md">
                  {capitalizeFirstLetter(user_name) || 'Unknown Contact'}
                </p>
                <div className="flex gap-1 items-center">
                  <Icon name="Grid" className="w-4 h-4 text-grey-500" />
                  <small className="text-grey-800 truncate ">{tabData?.extension}</small>
                </div>
                <small className="text-primary text-[10px]">
                  {tabData?.custom_role_data?.name || tabData?.role_data?.name || tabData?.role}
                </small>
              </div>
            </div>

            {actions?.length ? (
              <div className="flex shrink-0 flex-wrap justify-end gap-2 items-center">
                {actions
                  .filter((action: any) => action.access)
                  .map((action: any, index: number) => (
                    <CustomTooltip key={index} text={action.tooltipText} side="top">
                      <div
                        className={cn(
                          'cursor-pointer flex items-center justify-center rounded-xl w-8 h-8 bg-white ',
                          action.className,
                        )}
                        onClick={action.onClick}
                      >
                        <Icon name={action.icon as IconName} className="w-5 h-5" />
                      </div>
                    </CustomTooltip>
                  ))}
              </div>
            ) : null}
          </div>
          <div className="p-3 gap-6 flex w-full flex-col h-[calc(100vh-11rem)] md:h-[calc(100vh-8rem)] overflow-y-auto max-w-full xl:max-w-[80%] mx-auto">
            <div className="flex flex-col gap-4 p-4 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-lg border border-[rgba(225,200,165,0.9)]">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex flex-col gap-1.5 w-full">
                  <p className="text-[#2E2D35] font-medium text-sm">{'First Name'}</p>
                  <p className="bg-[#FBE2C8]/40 text-[#9A948F] px-3 min-h-10 flex items-center break-all text-sm rounded-xl">
                    {capitalizeFirstLetter(tabData?.first_name) || 'NA'}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <p className="text-[#2E2D35] font-medium text-sm">{'Last Name'}</p>
                  <p className="bg-[#FBE2C8]/40 text-[#9A948F] px-3 min-h-10 flex items-center break-all text-sm rounded-xl">
                    {capitalizeFirstLetter(tabData?.last_name) || 'NA'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex flex-col gap-1.5 w-full">
                  <p className="text-[#2E2D35] font-medium text-sm">{'Email'}</p>
                  <p className="bg-[#FBE2C8]/40 text-[#9A948F] px-3 min-h-10 flex items-center break-all text-sm rounded-xl">
                    {tabData?.email}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <p className="text-[#2E2D35] font-medium text-sm">{'Phone'}</p>
                  <p className="bg-[#FBE2C8]/40 text-[#9A948F] px-3 min-h-10 flex items-center break-all text-sm rounded-xl">
                    {tabData?.phone?.startsWith('+') ? tabData?.phone : `+${tabData?.phone}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex flex-col gap-1.5 w-full">
                  <p className="text-[#2E2D35] font-medium text-sm">{'Site'}</p>
                  <p className="bg-[#FBE2C8]/40 text-[#9A948F] px-3 min-h-10 flex items-center break-all text-sm rounded-xl">
                    {tabData?.site?.name ?? 'NA'}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <p className="text-[#2E2D35] font-medium text-sm">{'Extension'}</p>
                  <p className="bg-[#FBE2C8]/40 text-[#9A948F] px-3 min-h-10 flex items-center break-all text-sm rounded-xl">
                    {tabData?.extension ?? 'NA'}
                  </p>
                </div>
              </div>
              {tabData?.caller_id ? (
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex flex-col gap-1.5 w-full">
                    <p className="text-[#2E2D35] font-medium text-sm">{'Caller ID'}</p>
                    <p className="bg-[#FBE2C8]/40 text-[#9A948F] px-3 min-h-10 flex items-center break-all text-sm rounded-xl">
                      {tabData?.caller_id ?? 'NA'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full"></div>
                </div>
              ) : (
                <div className="flex flex-col justify-between gap-2 w-full sm:flex-row sm:items-center">
                  <p className="text-[#2E2D35] font-medium text-sm">{'Caller ID'}</p>
                  <Button
                    variant={'outline'}
                    type="button"
                    onClick={() => setDrawerState({ isAssignNumber: true })}
                  >
                    <Icon name="AssignNumberIcon" className="w-4 h-4" /> Assign Number
                  </Button>
                </div>
              )}
            </div>
            {/* <ul
              role="list"
              className="divide-y divide-grey-200 flex flex-col gap-8 p-5 bg-white rounded-xl border border-gray-100"
            >
              <li className="py-3 flex justify-between first:pt-0">
                <p className="text-gray-700 font-normal text-sm">{'First Name'}</p>
                <p className="text-[#2E2D35] font-medium text-sm">
                  {capitalizeFirstLetter(tabData?.first_name) || 'NA'}
                </p>
              </li>
              <li className="py-3 flex justify-between first:pt-0">
                <p className="text-gray-700 font-normal text-sm">{'Last Name'}</p>
                <p className="text-[#2E2D35] font-medium text-sm">
                  {capitalizeFirstLetter(tabData?.last_name) || 'NA'}
                </p>
              </li>
              <li className="py-3 flex justify-between first:pt-0">
                <p className="text-gray-700 font-normal text-sm">{'Email'}</p>
                <p className="text-[#2E2D35] font-medium text-sm">{tabData?.email}</p>
              </li>
              <li className="py-3 flex justify-between first:pt-0">
                <p className="text-gray-700 font-normal text-sm"> {'Phone'}</p>
                <p className="text-[#2E2D35] font-medium text-sm">
                  {tabData?.phone?.startsWith('+') ? tabData?.phone : `+${tabData?.phone}`}
                </p>
              </li>
              <li className="py-3 flex justify-between first:pt-0">
                <p className="text-gray-700 font-normal text-sm"> {'Site'}</p>
                <p className="text-[#2E2D35] font-medium text-sm">{tabData?.site?.name ?? 'NA'}</p>
              </li>
              <li className="py-3 flex justify-between first:pt-0">
                <p className="text-gray-700 font-normal text-sm">{'Extension'}</p>
                <p className="text-[#2E2D35] font-medium text-sm">{tabData?.extension ?? 'NA'}</p>
              </li>
              <li className="py-3 flex justify-between first:pt-0">
                <p className="text-gray-700 font-normal text-sm">{'Caller ID'}</p>
                {tabData?.caller_id ? (
                  <p className="text-[#2E2D35] font-medium text-sm">{tabData?.caller_id}</p>
                ) : (
                  <Button
                    variant={'outline'}
                    type="button"
                    onClick={() => setDrawerState({ isAssignNumber: true })}
                  >
                    <Icon name="AssignNumberIcon" className="w-4 h-4" /> Assign Number
                  </Button>
                )}
              </li>
            </ul> */}
          </div>
        </div>
      )}

      <AlertConfirm
        {...{
          apiLoading: isPending,
          onConfirm: () => {
            mutateDeleteUser(tabData?.uuid);
          },
          open: modalState,
          setOpen: setModalState,
        }}
      />

      {drawerState?.isEdit && (
        <SideDrawer
          isOpen={drawerState?.isEdit}
          title={`Update Forwarding (${tabData?.first_name} ${tabData?.last_name || ''})`}
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
          handleClose={() => setDrawerState({ isEdit: false })}
          content={
            <UpdateForwarding
              drawerState={drawerState}
              setDrawerState={setDrawerState}
              data={tabData}
              setTabData={setTabData}
            />
          }
        />
      )}
      {drawerState?.isAssignNumber && (
        <SideDrawer
          width="700px"
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
          isHeader={true}
          isOpen={drawerState.isAssignNumber}
          title={`Assign Number to ${tabData?.first_name}${tabData?.last_name ? ` ${tabData?.last_name}` : ''} (${tabData?.extension})`}
          handleClose={() => setDrawerState({ isAssignNumber: false })}
          content={
            <IndividualAssignNumber
              rowData={tabData}
              handleClose={() => setDrawerState({ isAssignNumber: false })}
            />
          }
        />
      )}
    </section>
  );
};

export default UserDetails;

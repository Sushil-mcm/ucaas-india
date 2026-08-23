import { Icon } from '@/assets/icons/icon';
import Loader from '@/components/custom/loader';
import {
  canDeleteMeeting,
  canEditMeeting,
  canEndMeetingBeforeStart,
  formatMeetingDate,
  formatTime,
  getAbbreviationByTimeZone,
  handleAlert,
  isMeetingActive,
} from '@/lib/utils';
import {
  createMeeting,
  deleteEventAndTask,
  meetingDelete,
  meetingList,
  sendInvites,
} from '@/services/api';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef, useCallback, useReducer } from 'react';
import { useForm } from 'react-hook-form';
import NotFound from '@/assets/images/not-found-img.svg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MeetingHeader from './header';
import AlertConfirm from '@/components/custom/alert-confirm';
import MeetingInfo from '../meeting-info-modal';
import ScheduleMeeting from '../schedule-meeting';
import MeetingMembersModal from '../meeting-members-modal';
import InviteMembersModal from '../send-invites/invite-members';
import InviteOthersModal from '../send-invites/invite-others';
import SideDrawer from '@/components/custom/side-drawer';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { useCompanyFeatures } from '@/hooks/rbac';
import { Clock4Icon, InfoIcon } from 'lucide-react';

const MEMBER_AVATAR_TONE_CLASSES = [
  'text-primary bg-ucass-active-bg',
  'text-yellow-600 bg-yellow-100',
  'text-pink-600 bg-pink-100',
  'text-sky-600 bg-sky-100',
  'text-emerald-600 bg-emerald-100',
];

const normalizeMemberType = (member: any) =>
  String(member?.type || '')
    .trim()
    .toUpperCase();

const isGuestMember = (member: any) => normalizeMemberType(member) === 'GUEST';

const isAdminMember = (member: any) => normalizeMemberType(member) === 'ADMIN';

const getMemberName = (member: any): string => {
  const fullName = String(
    member?.name || `${member?.first_name || ''} ${member?.last_name || ''}`,
  ).trim();
  return fullName || String(member?.email || 'Guest').trim();
};

const getMemberInitial = (member: any): string => {
  const memberName = getMemberName(member);
  return String(memberName.charAt(0) || 'G').toUpperCase();
};

const formatMemberCountLabel = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;

const UpcomingMeetings = () => {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<any>({
    meetingInfo: false,
    meetingInvites: false,
    isDelete: false,
    inviteMembers: false,
    inviteOthers: false,
  });
  const [meetingToEnd, setMeetingToEnd] = useState<any>(null);
  const [drawerState, setDrawerState] = useState<any>(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [, forceRenderByClock] = useReducer((count: number) => count + 1, 0);
  const observerTarget = useRef(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { features } = useCompanyFeatures();
  const videAccess = features?.plan_features?.video?.action || {};
  const { user } = useUser();
  const formInstance = useForm<any>({
    defaultValues: {
      inviteOthers: [],
      members: [],
      meeting_id: '',
    },
  });
  const { watch, setValue } = formInstance;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: isPendingUpcomingMeeting,
    refetch: refetchUpcomingMeetings,
  } = useInfiniteQuery({
    queryKey: ['upcomingList'],
    queryFn: ({ pageParam = 1 }) =>
      meetingList({ listType: 'upcoming_owned', page: pageParam, limit: 25 }),
    getNextPageParam: (lastPage) => {
      const result = lastPage?.data?.data?.result;
      const currentPage = result?.currentPage ?? 1;
      const totalPages = result?.totalPages ?? 1;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
    }),
  });

  // Flatten all pages into a single array
  const upcomingMeetingList =
    data?.pages?.flatMap((page) => page?.data?.data?.result?.rows || []) || [];

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const target = observerTarget.current;
    const scrollContainer = scrollContainerRef.current;
    if (!target || !scrollContainer) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: scrollContainer,
      threshold: 0.1,
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [handleObserver]);

  const { mutate: mutateMeetingDelete, isPending } = useMutation({
    mutationFn: meetingDelete,
    onSuccess: async () => {
      await deleteEventAndTask({ referenceId: selectedMeeting?.meetingId || '' });
      handleAlert({ text: 'Meeting deleted successfully', type: 'success' });
      setModalState({ meetingInfo: false });
      refetchUpcomingMeetings();
    },
  });

  const { mutate: cancelMeetingMutate, isPending: isPendingCancelMeeting } = useMutation({
    mutationFn: (payload: { meetingId: string; status: string }) => createMeeting(payload),
    onSuccess: () => {
      handleAlert({ text: 'Meeting cancelled successfully', type: 'success' });
      setMeetingToEnd(null);
      queryClient.invalidateQueries({ queryKey: ['upcomingList'] });
    },
  });

  const { mutate: mutateSendInvite, isPending: isPendingInvites } = useMutation({
    mutationFn: sendInvites,
    onSuccess: () => {
      setModalState({ inviteMembers: false });
      handleAlert({ text: 'Invite sent successfully', type: 'success' });
      refetchUpcomingMeetings();
      setValue('inviteOthers', []);
      setValue('members', []);
    },
  });

  useEffect(() => {
    if (selectedMeeting?.members && Array.isArray(selectedMeeting?.members)) {
      setValue('members', selectedMeeting?.members, { shouldValidate: true });
    } else {
      setValue('members', []);
    }
  }, [selectedMeeting?.members]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      forceRenderByClock();
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleSendInvite = async () => {
    const isValid = await formInstance.trigger(['members', 'inviteOthers']);
    if (!isValid) return;
    const members = watch('members');
    const invitedOthers = watch('inviteOthers');
    const existingMembers =
      selectedMeeting?.members && Array.isArray(selectedMeeting?.members)
        ? selectedMeeting?.members?.map((m: any) => m?.user_uuid || m?.userId)
        : [];

    const formattedMeetingInfoData = members?.map((obj: any) => {
      const id = obj?.user_uuid || obj?.userId || '';
      const isNewMember = !existingMembers.includes(id);

      const cleanedObj = {
        ...obj,
        user_uuid: id,
        invitation_sent: isNewMember ? false : true,
      };

      delete cleanedObj.source;
      delete cleanedObj.joinStatus;
      delete cleanedObj._id;
      delete cleanedObj.userId;

      return cleanedObj;
    });
    const allInviteOthers = [...formattedMeetingInfoData, ...invitedOthers];
    const payload = {
      meetingId: selectedMeeting?.meetingId,
      members: invitedOthers?.length > 0 ? allInviteOthers : formattedMeetingInfoData,
    };
    await mutateSendInvite(payload);
  };

  return (
    <section className="flex h-full min-h-0 w-full flex-1 flex-col gap-3  bg-gray-200/15 ">
      <div className=" flex h-full min-h-0 w-full flex-col justify-start gap-4 ">
        <div className="w-full max-w-250 mx-auto px-4 xs:pt-4 sm:pt-0">
          <MeetingHeader formInstance={formInstance} />
        </div>
        <div className="w-full h-full overflow-auto">
          <div className="max-w-250 mx-auto flex min-h-0 flex-1 flex-col gap-3 mt-2 px-4">
            <div className="flex justify-between items-center">
              <h4 className="text-gray-900 font-semibold text-lg flex items-center gap-1">
                Upcoming Meetings <InfoIcon className="w-3 h-3 text-gray-600" />
              </h4>
              <Button
                variant="outline"
                className="justify-center shadow-none sm:w-auto hover:bg-gray-50 hover:text-gray-600 border-gray-200 bg-white/80 h-9 min-h-9 text-xs text-gray-600"
                type="button"
              >
                <span className="text-ucass-active">{upcomingMeetingList?.length || 0}</span>
                Meeting(s)
              </Button>
            </div>
            <div ref={scrollContainerRef} className="flex flex-1 min-h-0 flex-col gap-3 ">
              {isPendingUpcomingMeeting ? (
                <div className="flex items-center justify-center p-5">
                  <Loader variant="blue" size="sm" />
                </div>
              ) : upcomingMeetingList && upcomingMeetingList?.length ? (
                upcomingMeetingList?.map((meeting: any) => {
                  if (!meeting) return null;
                  const isActive = isMeetingActive(
                    meeting?.startUtc || meeting?.startTimeLocal,
                    meeting?.endUtc || meeting?.endTimeLocal,
                    meeting?.status,
                  );
                  const formattedDate = formatMeetingDate(meeting?.startTimeLocal) || '';
                  const meetingMembers = Array.isArray(meeting?.members)
                    ? meeting.members.filter(
                        (member: any) => member?.type !== 'ADMIN' && member?.invited === true,
                      )
                    : [];
                  const guestMembers = meetingMembers.filter((member: any) =>
                    isGuestMember(member),
                  );
                  const nonGuestMembers = meetingMembers.filter(
                    (member: any) => !isGuestMember(member),
                  );
                  const previewMembers = meetingMembers.slice(0, 3);
                  const remainingMembersCount = Math.max(
                    meetingMembers.length - previewMembers.length,
                    0,
                  );
                  const hostMember = meetingMembers.find((member: any) => isAdminMember(member));
                  const hostName =
                    String(
                      meeting?.hostName || (hostMember ? getMemberName(hostMember) : ''),
                    ).trim() || 'Host';
                  const hostMemberId = hostMember?.userId || hostMember?.user_uuid || '';
                  const currentUserEmail = user?.user_info?.email || user?.email || '';
                  const isCurrentUserHost = Boolean(
                    meeting?.createdById === user?.uuid ||
                    hostMemberId === user?.uuid ||
                    (currentUserEmail && hostMember?.email === currentUserEmail),
                  );
                  const hostLabel = isCurrentUserHost ? `${hostName} (you)` : hostName;
                  return (
                    <div
                      key={meeting?.meetingId}
                      className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-[1px_1px_5px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:justify-between "
                    >
                      <div className="flex w-full min-w-0 items-start">
                        <div className="flex gap-4 items-center">
                          <div className=" rounded-lg min-h-11 min-w-11 max-w-11 max-h-11 flex flex-col justify-center items-center text-ucass-active  bg-ucass-active-bg">
                            <div className="text-[11px] uppercase font-medium ">
                              {formattedDate?.month || ''}
                            </div>
                            <div className="text-sm uppercase font-extrabold leading-4">
                              {formattedDate?.day}
                            </div>
                          </div>
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <h4 className="min-w-0 text-md font-semibold break-words">
                                {meeting?.name || 'Meeting Name'}
                              </h4>
                            </div>
                            {/* <div className="flex flex-col items-start gap-1">
                              <p className="text-semibold flex flex-wrap items-center gap-1 text-sm text-gray-500 ">
                                <Icon name="TimerIcon" className="w-4 h-4" />
                                {formattedDate?.month || ''} {formattedDate?.day || ''},
                                <span>{getAbbreviationByTimeZone(meeting?.timezone)}</span>
                                {formatTime(meeting?.startTimeLocal)} -{' '}
                                {formatTime(meeting?.endTimeLocal) || ''}
                              </p>
                              <CustomTooltip text="Invitees" side="top">
                                <div
                                  className="text-semibold flex items-center gap-1 cursor-pointer text-sm text-gray-500"
                                  onClick={() => {
                                    setModalState({ meetingInvites: true });
                                    setSelectedMeeting(meeting);
                                  }}
                                >
                                  <Icon name="UsersIcon" className="w-4 h-4" />
                                  {meeting?.members && Array.isArray(meeting?.members)
                                    ? meeting?.members?.length
                                    : 0}
                                </div>
                              </CustomTooltip>
                            </div> */}
                            <div className="flex flex-wrap gap-2 w-full items-center text-gray-600">
                              <div className="flex items-center gap-1 text-[11px]">
                                <Clock4Icon className="w-3 h-3" />
                                <div className="flex">
                                  {getAbbreviationByTimeZone(meeting?.timezone)}{' '}
                                  {formatTime(meeting?.startTimeLocal)} -{' '}
                                  {formatTime(meeting?.endTimeLocal) || ''}
                                </div>
                              </div>
                              <div
                                className="flex items-center cursor-pointer"
                                onClick={() => {
                                  if (!meetingMembers.length) return;
                                  setModalState({ meetingInvites: true });
                                  setSelectedMeeting(meeting);
                                }}
                              >
                                {previewMembers.length
                                  ? previewMembers.map((member: any, memberIndex: number) => (
                                      <div
                                        key={`${member?.userId || member?.user_uuid || member?.email || memberIndex}`}
                                        className={`min-w-6 min-h-6 max-w-6 max-h-6 flex justify-center items-center rounded-full font-medium text-[10px] border-2 border-white ${MEMBER_AVATAR_TONE_CLASSES[memberIndex % MEMBER_AVATAR_TONE_CLASSES.length]} ${
                                          memberIndex === 0 ? '' : '-ml-2'
                                        }`}
                                        title={getMemberName(member)}
                                      >
                                        {getMemberInitial(member)}
                                      </div>
                                    ))
                                  : null}
                                {remainingMembersCount > 0 && (
                                  <div className="min-w-6 min-h-6 max-w-6 max-h-6 flex justify-center items-center rounded-full text-gray-600 font-medium bg-gray-200 text-[10px] border-2 border-white -ml-2">
                                    +{remainingMembersCount}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[11px]">
                                <div className="flex">
                                  {formatMemberCountLabel(
                                    nonGuestMembers.length,
                                    'member',
                                    'members',
                                  )}
                                  , {formatMemberCountLabel(guestMembers.length, 'guest', 'guests')}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] ml-4">
                                <div className="flex text-gray-500">Host :</div>
                                <div className="min-w-6 min-h-6  max-h-6 flex justify-center items-center rounded-sm text-primary font-medium bg-ucass-active-bg text-[10px] border border-ucass-active/20 px-2">
                                  {hostLabel}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full  items-center justify-start gap-2 sm:w-auto sm:justify-end">
                        {canEndMeetingBeforeStart(meeting?.startUtc) &&
                          meeting?.createdById === user?.uuid &&
                          meeting?.mode !== 'CHAT' && (
                            <Button
                              size={'sm'}
                              variant="destructiveOutline"
                              className="justify-center shadow-none sm:w-auto"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMeetingToEnd(meeting);
                              }}
                            >
                              <Icon name="CloseIcon" className="w-2.5 h-2.5 " />
                              Cancel Meeting
                            </Button>
                          )}
                        {videAccess?.invite && meeting?.mode !== 'CHAT' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-primary p-2 px-3 font-semibold text-xs text-primary shadow-xs cursor-pointer hover:bg-primary/90 hover:text-white min-h-8">
                              <Icon name="PlusIcon" className="w-4 h-4" />
                              Invite
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => {
                                  setModalState({ inviteMembers: true });
                                  setSelectedMeeting(meeting);
                                }}
                              >
                                Invite Members
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setModalState({ inviteOthers: true });
                                  setSelectedMeeting(meeting);
                                }}
                              >
                                Invite Others
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {isActive ? (
                          <Button
                            size={'sm'}
                            variant={'primary'}
                            className="justify-center shadow-none sm:w-auto min-w-14"
                            type="button"
                            onClick={() => {
                              window.open(`/video-meet?meetCode=${meeting?.meetingId}`);
                              queryClient.invalidateQueries({ queryKey: ['upcomingList'] });
                            }}
                          >
                            Join
                          </Button>
                        ) : (
                          <CustomTooltip text="Meeting has not started yet" side="top">
                            <span className="inline-flex cursor-not-allowed">
                              <Button
                                size={'sm'}
                                variant={'primary'}
                                className="justify-center shadow-none sm:w-auto min-w-14 cursor-not-allowed opacity-60 pointer-events-none"
                                type="button"
                                disabled
                              >
                                Join
                              </Button>
                            </span>
                          </CustomTooltip>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger className="focus:outline-0 border border-gray-200 cursor-pointer flex items-center justify-center rounded-md w-8 h-8 bg-white-100 text-gray-900/80 hover:bg-gray-100 hover:text-gray-600">
                            <Icon name="MenuDots" className="w-5 h-5 " />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {canEditMeeting(meeting?.startTimeLocal) &&
                              meeting?.createdById === user?.uuid &&
                              meeting?.mode !== 'CHAT' &&
                              videAccess?.edit && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDrawerState(true);
                                    setSelectedMeeting(meeting);
                                  }}
                                >
                                  Edit
                                </DropdownMenuItem>
                              )}

                            <DropdownMenuItem
                              onClick={() => {
                                setModalState({ meetingInfo: true });
                                setSelectedMeeting(meeting);
                              }}
                              disabled={!videAccess?.view}
                            >
                              Info
                            </DropdownMenuItem>
                            {canDeleteMeeting(meeting?.startTimeLocal, meeting?.endTimeLocal) &&
                              meeting?.createdById === user?.uuid &&
                              meeting?.mode !== 'CHAT' &&
                              videAccess?.delete && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setModalState({ isDelete: true });
                                    setSelectedMeeting(meeting);
                                  }}
                                >
                                  Delete
                                </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full mx-auto max-w-250 min-h-52 lg:min-h-80 bg-white p-4 rounded-lg   m-auto border border-gray-100 flex flex-col items-center justify-center gap-2">
                  <img src={NotFound} alt="BusyImage" className="min-w-28 w-28" />
                  <p className="flex items-center justify-center text-gray-900  font-medium">
                    No upcoming meetings!
                  </p>
                  <p className="text-sm text-gray-700">
                    Start or schedule a meeting to see it appear here
                  </p>
                </div>
              )}
              {/* Loading indicator for next page */}
              {isFetchingNextPage && (
                <div className="flex items-center justify-center p-5">
                  <Loader variant="blue" size="sm" />
                </div>
              )}
              {/* Observer target for infinite scroll */}
              <div ref={observerTarget} className="h-4" />
            </div>
          </div>
        </div>
      </div>

      <AlertConfirm
        {...{
          apiLoading: isPending,
          onConfirm: () => {
            mutateMeetingDelete(selectedMeeting?.meetingId);
          },
          open: modalState?.isDelete,
          setOpen: setModalState,
        }}
      />
      <AlertConfirm
        open={!!meetingToEnd}
        setOpen={(open) => !open && setMeetingToEnd(null)}
        headerText="What would you like to do?"
        descriptionTextComp={
          <p className="text-md">Do you want to reschedule or cancel this meeting?</p>
        }
        closeBtnText="Reschedule"
        confirmBtnText="Cancel Meeting"
        apiLoading={isPendingCancelMeeting}
        onCancel={() => {
          if (meetingToEnd) {
            setSelectedMeeting(meetingToEnd);
            setDrawerState(true);
          }
        }}
        onConfirm={() => {
          if (meetingToEnd?.meetingId) {
            cancelMeetingMutate({ meetingId: meetingToEnd.meetingId, status: 'CANCEL' });
          }
        }}
      />
      {modalState?.meetingInfo && (
        <MeetingInfo
          modalState={modalState}
          setModalState={setModalState}
          meetingInfoData={selectedMeeting}
        />
      )}
      {drawerState && (
        <SideDrawer
          isOpen={drawerState}
          title="Update Meeting"
          handleClose={() => setDrawerState(false)}
          content={
            <ScheduleMeeting setDrawerState={setDrawerState} initialData={selectedMeeting} />
          }
          isHeader={true}
          width="650px"
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
        />
      )}
      {modalState?.meetingInvites && (
        <MeetingMembersModal
          modalState={modalState}
          setModalState={setModalState}
          members={
            selectedMeeting?.members && Array.isArray(selectedMeeting?.members)
              ? selectedMeeting?.members?.filter((member: any) => member?.type !== 'ADMIN')
              : []
          }
          title="Invited Members"
        />
      )}
      {modalState?.inviteMembers && (
        <InviteMembersModal
          modalState={modalState}
          setModalState={setModalState}
          formInstance={formInstance}
          isPending={isPendingInvites}
          handleSendInvite={handleSendInvite}
        />
      )}
      {modalState?.inviteOthers && (
        <InviteOthersModal
          modalState={modalState}
          setModalState={setModalState}
          formInstance={formInstance}
          handleSendInvite={handleSendInvite}
          isPending={isPendingInvites}
        />
      )}
    </section>
  );
};

export default UpcomingMeetings;

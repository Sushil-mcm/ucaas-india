import { FilterIcon, Bell, PhoneIcon, VideocameraAdd } from '@/assets/icons';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { notificationFilters, notificationIconLookup } from '../constants';
import { useUser } from '@/hooks/use-user';
import { NOTIFICATION_TYPE_CONST } from '@/constants/common-const';
import moment from 'moment';
import { formatNotificationDate, handleAlert, removeEnvPrefix } from '@/lib/utils';
import Loader from '../../loader';
import NotFound from '@/assets/images/not-found-img.svg';
import { useQuery } from '@tanstack/react-query';
import { meetingList } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Icon as IconComponent } from '@/assets/icons/icon';
import { useDialpad } from '@/hooks/use-dialpad';
const NotificationContent = ({ setNotificationState }: { setNotificationState: any }) => {
  const { user } = useUser();
  const { makeCall } = useDialpad();
  // const { user_info } = user;
  const {
    getNotifications,
    notificationArr = [],
    markReadNotification,
    notificationLoading,
  } = useSocketEvents();
  const [mutatedNotifications, setMutatedNotifications] = useState<any>([]);

  const [notificationFilterValue, setNotificationFilterValue] = useState<any>({
    id: 1,
    label: 'All',
    value: ['all'],
    icon: <Bell className="text-gray-700 w-full h-full" />,
  });
  const { data: ongoingMeetingData } = useQuery({
    queryKey: ['ongoingMeetingList', 'notification-content'],
    queryFn: () => meetingList({ listType: 'ongoing', page: 1, limit: 100 }),
  });
  const ongoingMeetingList =
    ongoingMeetingData?.data?.data?.result?.rows &&
    Array.isArray(ongoingMeetingData?.data?.data?.result?.rows)
      ? ongoingMeetingData?.data?.data?.result?.rows
      : [];

  // SideDrawer stays permanently mounted now, so a mount-only fetch would
  // only ever run once — fetch fresh notifications on every open instead.
  useEffect(() => {
    getNotifications();
  }, []);

  useEffect(() => {
    if (notificationArr && notificationArr?.length > 0) {
      const filtered_notifications =
        notificationArr?.length > 0
          ? notificationFilterValue?.value?.[0] === 'unread'
            ? notificationArr.filter(({ unread }) => unread)
            : notificationFilterValue?.value?.[0] !== 'all'
              ? notificationArr.filter(({ type }) => notificationFilterValue?.value?.includes(type))
              : notificationArr
          : [];
      setMutatedNotifications(filtered_notifications || []);
    } else {
      setMutatedNotifications([]);
    }
  }, [notificationArr, notificationFilterValue]);
  const unreadTotal = mutatedNotifications?.filter((n: any) => n?.unread)?.length || 0;
  const isFiltered = notificationFilterValue?.value?.[0] !== 'all';

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* The drawer pins its own close button at top-right, so the header
          reserves that corner rather than sliding its controls underneath it —
          which is what buried the filter button behind the X. */}
      <div className="flex shrink-0 items-center justify-between gap-3 pr-12 pt-1 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-ucass-primary-100)]">
            <span className="flex h-[18px] w-[18px]">{notificationFilterValue?.icon}</span>
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-tight text-[var(--foreground)]">
              {notificationFilterValue?.label}
            </h2>
            <p className="truncate text-xs leading-tight text-[var(--muted-foreground)]">
              {unreadTotal > 0
                ? `${unreadTotal} unread`
                : `${mutatedNotifications?.length || 0} notification${
                    mutatedNotifications?.length === 1 ? '' : 's'
                  }`}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Filter notifications"
              title="Filter notifications"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--color-ucass-primary-100)] hover:text-[var(--color-ucass-active)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              <FilterIcon className="h-[18px] w-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {notificationFilters?.map((filter: any) => {
              const isActive = filter?.id === notificationFilterValue?.id;
              return (
                <DropdownMenuItem
                  key={filter?.id}
                  className={`cursor-pointer gap-2.5 ${isActive ? 'text-[var(--color-ucass-active)]' : ''}`}
                  onClick={() => setNotificationFilterValue(filter)}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-ucass-primary-100)] p-1">
                    {filter?.icon}
                  </span>
                  <span className="flex-1">{filter?.label}</span>
                  {isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                  ) : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-px w-full shrink-0 bg-[var(--border)]" />

      {unreadTotal > 0 ? (
        <div className="flex shrink-0 justify-end pt-2">
          <button
            type="button"
            className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-[var(--color-ucass-active)] transition-colors hover:bg-[var(--color-ucass-primary-100)]"
            onClick={() => {
              markReadNotification('all');
              setNotificationState(false);
              handleAlert({
                text: 'All the notifications has been marked as read.',
                type: 'success',
              });
            }}
          >
            Mark all as read
          </button>
        </div>
      ) : null}
      <div className="mt-2 min-h-0 w-full flex-1 space-y-2 overflow-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--color-ucass-primary-200)] [scrollbar-width:thin]">
        {notificationLoading && mutatedNotifications?.length == 0 ? (
          <div
            role="status"
            aria-label="Loading notifications"
            className="flex justify-center items-center h-full"
          >
            <Loader variant="blue" />
          </div>
        ) : mutatedNotifications && mutatedNotifications?.length > 0 ? (
          mutatedNotifications?.map((notification: any) => {
            const notificationtype =
              notification?.type === NOTIFICATION_TYPE_CONST.EVENT_REMINDER
                ? notification?.details?.category || NOTIFICATION_TYPE_CONST.EVENT
                : notification?.type;
            const Icon =
              notificationIconLookup?.[notificationtype] || notificationIconLookup?.['default'];
            const eventStartTime =
              notification?.details?.startUtc &&
              (notification?.type === NOTIFICATION_TYPE_CONST.CALL_BACK_SCHEDULE ||
                notification?.details?.category === NOTIFICATION_TYPE_CONST.EVENT)
                ? moment.utc(notification?.details?.startUtc)
                : null;

            const eventEndTime =
              notification?.details?.endUtc &&
              notification?.details?.category === NOTIFICATION_TYPE_CONST.EVENT
                ? moment.utc(notification?.details?.endUtc)
                : null;

            const now = moment.utc();

            let actionIcon = null;
            let actionButton = null;

            const notificationChatId =
              notification?.chatId ||
              notification?.details?.chatId ||
              notification?.details?.meetingId ||
              notification?.value ||
              '';
            const matchedOngoingMeeting = notificationChatId
              ? ongoingMeetingList?.find(
                  (meeting: any) =>
                    meeting?.meetingId === notificationChatId ||
                    meeting?.chatId === notificationChatId ||
                    meeting?.meetingId === removeEnvPrefix(notificationChatId),
                )
              : null;
            const currentUserMember = matchedOngoingMeeting?.members?.find(
              (member: any) =>
                member?.userId === user?.uuid ||
                member?.user_uuid === user?.uuid ||
                member?.email === user?.user_info?.email,
            );
            const isCurrentUserJoined = currentUserMember?.joinStatus?.toUpperCase() === 'YES';
            const shouldShowJoinNowForInvite =
              notification?.type === 'meeting_invite' &&
              !!matchedOngoingMeeting &&
              !isCurrentUserJoined;
            // Call back schedule → show call icon if startUtc >= now
            if (
              notification?.type === NOTIFICATION_TYPE_CONST.CALL_BACK_SCHEDULE &&
              eventStartTime &&
              now.isSameOrAfter(eventStartTime)
            ) {
              actionIcon = (
                <span
                  className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-green-100 text-green-500 hover:bg-green-400 hover:text-white"
                  onClick={() => {
                    const number = String(notification?.value || '').trim();
                    if (!number) return;
                    const extraHeaders = notification?.didNumber
                      ? [`X-CallerId: ${notification?.didNumber}`]
                      : [];
                    makeCall(number, { extraHeaders });
                  }}
                >
                  <PhoneIcon className="w-4 h-4" />
                </span>
              );
            }

            // Event → show video icon only within start and end time
            if (
              notification?.details?.category === NOTIFICATION_TYPE_CONST.EVENT &&
              eventStartTime &&
              eventEndTime &&
              now.isBetween(eventStartTime, eventEndTime)
            ) {
              actionIcon = (
                <span className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-ucass-primary-200 text-primary hover:bg-primary hover:text-white">
                  <VideocameraAdd className="w-5 h-5" />
                </span>
              );
            }

            if (shouldShowJoinNowForInvite) {
              actionButton = (
                <Button
                  variant="outline"
                  className="min-h-8 h-8 px-3 text-xs text-primary border-primary bg-white hover:bg-primary/10 hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    markReadNotification(notification?._id);
                    setNotificationState(false);
                    window.open(`/video-meet?meetCode=${matchedOngoingMeeting?.meetingId}`);
                  }}
                >
                  <IconComponent name="VideoIcon" className="w-4 h-4" />
                  Join Now
                </Button>
              );
            }
            // // Event → show video icon only within start and end time
            // if (
            //   notification?.type === NOTIFICATION_TYPE_CONST.MEETING_REMINDER &&
            //   eventStartTime &&
            //   eventEndTime &&
            //   now.isBetween(eventStartTime, eventEndTime)
            // ) {
            //   actionIcon = (
            //     <span className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-ucass-primary-200 text-primary hover:bg-primary hover:text-white">
            //       <VideocameraAdd className="w-5 h-5" />
            //     </span>
            //   );
            // }

            return (
              <div
                key={notification?._id}
                onClick={() => markReadNotification(notification?._id)}
                className={`relative flex w-full flex-shrink-0 cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                  notification?.unread
                    ? 'border-[var(--color-ucass-primary-200)] bg-[var(--color-ucass-primary-100)]'
                    : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]'
                } ${shouldShowJoinNowForInvite ? 'pb-12' : ''}`}
              >
                <div
                  aria-hidden
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] p-2"
                >
                  {Icon ? <div className="flex h-5 w-5">{Icon}</div> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug text-[var(--foreground)]">
                    {notification?.description}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    {notification?.unread ? (
                      <span
                        aria-label="Unread"
                        className="inline-block h-1.5 w-1.5 flex-none rounded-full bg-[var(--primary)]"
                      />
                    ) : null}
                    {formatNotificationDate(notification?.createdAt)}
                  </p>
                </div>
                {actionIcon && <div className="flex items-start gap-2">{actionIcon}</div>}
                {actionButton && <div className="absolute bottom-3 right-3">{actionButton}</div>}
              </div>
            );
          })
        ) : (
          <div className="flex h-full min-h-60 flex-col items-center justify-center gap-3 px-6 text-center">
            <img src={NotFound} alt="" aria-hidden className="w-28 max-w-full opacity-90" />
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {isFiltered
                ? `No ${notificationFilterValue?.label} notifications`
                : "You're all caught up"}
            </p>
            <p className="max-w-60 text-xs leading-relaxed text-[var(--muted-foreground)]">
              {isFiltered
                ? 'Nothing matches this filter yet. Try another one.'
                : 'Calls, voicemails and messages you miss will show up here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationContent;

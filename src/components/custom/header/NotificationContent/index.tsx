import { FilterIcon, Bell, PhoneIcon, VideocameraAdd, Clock } from '@/assets/icons';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { isDemoMode } from '@/lib/demo-mode';
import { toast } from 'react-toastify';

// Sample data so the notification drawer and its filters can be eyeballed
// without a backend that actually has notifications queued up. Gated by
// isDemoMode() below — the same runtime check the rest of the app uses for
// its invented data (see demo-mode.ts), so this only ever shows on a preview
// host (localhost or a *.vercel.app deploy) and never on a real domain,
// same as everywhere else. Using import.meta.env.DEV here instead would be
// wrong: that's a build-time flag, always false for a production `vite
// build` — including the one Vercel runs for its preview deploys — so it
// would never show up there even though those are exactly a preview host.
// 5-7 items per category so each filter has an actual list to scroll, not
// just a single lonely row.
const buildDummyGroup = (
  prefix: string,
  type: string,
  descriptions: string[],
  extra?: (index: number) => Record<string, any>,
) =>
  descriptions.map((description, index) => ({
    _id: `dummy-${prefix}-${index + 1}`,
    type,
    description,
    createdAt: new Date(Date.now() - (index + 1) * 37 * 60 * 1000).toISOString(),
    unread: index < 3,
    ...(extra ? extra(index) : {}),
  }));

const DUMMY_NOTIFICATIONS: any[] = [
  ...buildDummyGroup('sms', 'sms', [
    'New SMS from +1 (415) 555-0132: "Are we still on for 3pm?"',
    'New SMS from +91 98765 43210: "Sent the invoice, please check."',
    'New SMS from +1 (212) 555-0148: "Call me when you get a chance."',
    'New SMS from +44 7700 900123: "Thanks for the quick turnaround!"',
    'New SMS from +1 (628) 555-0110: "Can we reschedule to tomorrow?"',
    'New SMS from +91 90000 12345: "Payment confirmation attached."',
  ]),
  ...buildDummyGroup('voicemail', 'voicemail', [
    'New voicemail from Priya Shah (00:42)',
    'New voicemail from Rohan Verma (01:15)',
    'New voicemail from Unknown Caller (00:28)',
    'New voicemail from Sarah Lee (02:03)',
    'New voicemail from David Chen (00:51)',
    'New voicemail from Support Line (01:37)',
  ]),
  ...buildDummyGroup('missedcall', 'missedcall', [
    // Same number 3 times on purpose — a customer calling back after
    // nobody picked up is exactly the case sender-grouping collapses into
    // one row instead of three, so this needs a real repeat to demo.
    'Missed call from +91 98765 43210',
    'Missed call from +91 98765 43210',
    'Missed call from +91 98765 43210',
    'Missed call from +44 20 7946 0958',
    'Missed call from +91 87654 32109',
    'Missed call from +1 (312) 555-0199',
  ]),
  ...buildDummyGroup(
    'callback',
    NOTIFICATION_TYPE_CONST.CALL_BACK_SCHEDULE,
    [
      'Call back scheduled with Arjun Mehta',
      'Call back scheduled with Kavya Nair',
      'Call back scheduled with James Carter',
      'Call back scheduled with Ananya Rao',
      'Call back scheduled with Michael Brown',
      'Call back scheduled with Sneha Iyer',
    ],
    (index) => ({
      value: '+14155550123',
      details: { startUtc: new Date(Date.now() - (index === 0 ? 60 : -index) * 1000).toISOString() },
    }),
  ),
  ...buildDummyGroup(
    'event',
    NOTIFICATION_TYPE_CONST.EVENT_REMINDER,
    [
      'Task due: Follow up on onboarding checklist',
      'Task due: Review Q3 campaign performance',
      'Event: Product roadmap review',
      'Task due: Send renewal quote to client',
      'Event: Team retrospective',
      'Task due: Update call script for new offer',
    ],
    (index) => ({
      details: {
        category: index % 2 === 0 ? NOTIFICATION_TYPE_CONST.TASK : NOTIFICATION_TYPE_CONST.EVENT,
      },
    }),
  ),
  ...buildDummyGroup(
    'meeting',
    'meeting_invite',
    [
      'You were invited to "Weekly Sync" by Neha Kapoor',
      'You were invited to "Client Onboarding" by Rahul Singh',
      'You were invited to "Sprint Planning" by Emma Wilson',
      'You were invited to "All Hands" by Vikram Joshi',
      'You were invited to "1:1 Check-in" by Sara Ahmed',
      'You were invited to "Design Review" by Tom Walker',
    ],
    (index) => ({
      details: {
        startUtc: new Date(Date.now() - (index === 0 ? 5 : -index * 10) * 60 * 1000).toISOString(),
        endUtc: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
      },
    }),
  ),
  ...buildDummyGroup('payment', NOTIFICATION_TYPE_CONST.PAYMENT_EVENT, [
    'Payment of ₹4,150.00 received — wallet topped up',
    'Payment of ₹9,960.00 received — wallet topped up',
    'Payment failed for auto-recharge of ₹2,075.00',
    'Payment of ₹16,600.00 received — wallet topped up',
    'Invoice #INV-2291 paid successfully',
    'Payment of ₹6,225.00 received — wallet topped up',
  ]),
  ...buildDummyGroup('group', 'department_create', [
    'New group "Support Tier 2" was created',
    'New group "East Coast Sales" was created',
    'New group "Onboarding Specialists" was created',
    'New group "Night Shift" was created',
    'New group "VIP Accounts" was created',
    'New group "QA & Compliance" was created',
  ]),
  ...buildDummyGroup('callqueue', 'call_queue_create', [
    'New call queue "East Coast Sales" was created',
    'New call queue "West Coast Support" was created',
    'New call queue "Billing Escalations" was created',
    'New call queue "Overflow Queue" was created',
    'New call queue "VIP Priority" was created',
    'New call queue "After Hours" was created',
  ]),
  ...buildDummyGroup('campaign', 'new_campaign', [
    'Campaign "Q3 Renewals" is now live',
    'Campaign "Summer Promo" is now live',
    'Campaign "Win-back Outreach" is now live',
    'Campaign "New Feature Announcement" is now live',
    'Campaign "Holiday Sale" is now live',
    'Campaign "Customer Feedback Survey" is now live',
  ]),
];

// Module-level, not component state: the drawer unmounts NotificationContent
// every time it closes (Header only renders <SideDrawer> while open), so
// state stored on the component would forget every "read" click the moment
// the drawer shut. Living outside the component lets it survive that.
// Two stores, not one: dummy items start out a mix of read/unread (see
// buildDummyGroup's `unread: index < 3`), so a single "read" override set
// can only ever push items toward read — it has no way to force an
// already-read item back to unread. A matching unread-override set covers
// that direction; each store wins over the item's original state, and
// marking an id one way clears it from the other.
let dummyReadIdStore = new Set<string>();
let dummyUnreadIdStore = new Set<string>();
const markDummyIdRead = (id: string) => {
  if (dummyUnreadIdStore.has(id)) {
    const next = new Set(dummyUnreadIdStore);
    next.delete(id);
    dummyUnreadIdStore = next;
  }
  if (!dummyReadIdStore.has(id)) dummyReadIdStore = new Set(dummyReadIdStore).add(id);
};
// Only offered for the local dev sample data — the real socket call
// (`notification-status`) only ever marks read, with no matching "unmark"
// event, so a real notification can't actually go back to unread.
const markDummyIdUnread = (id: string) => {
  if (dummyReadIdStore.has(id)) {
    const next = new Set(dummyReadIdStore);
    next.delete(id);
    dummyReadIdStore = next;
  }
  if (!dummyUnreadIdStore.has(id)) dummyUnreadIdStore = new Set(dummyUnreadIdStore).add(id);
};
// Returns the pre-mark snapshot so a caller can offer an Undo that restores
// exactly which items were unread before, not just "mark everything unread".
const markAllDummyRead = () => {
  const previous = { read: dummyReadIdStore, unread: dummyUnreadIdStore };
  dummyReadIdStore = new Set(DUMMY_NOTIFICATIONS.map(({ _id }) => _id));
  dummyUnreadIdStore = new Set();
  return previous;
};
const restoreDummyReadIds = (previous: { read: Set<string>; unread: Set<string> }) => {
  dummyReadIdStore = previous.read;
  dummyUnreadIdStore = previous.unread;
};

// Snoozed ids hide from the list until the chosen time passes, then fall
// back into view on their own — same module-level pattern as the read
// stores above, for the same reason (survives the drawer unmounting).
let dummySnoozedUntilStore = new Map<string, number>();
const snoozeDummyId = (id: string, forMs: number) => {
  const next = new Map(dummySnoozedUntilStore);
  next.set(id, Date.now() + forMs);
  dummySnoozedUntilStore = next;
};
const unsnoozeDummyId = (id: string) => {
  if (!dummySnoozedUntilStore.has(id)) return;
  const next = new Map(dummySnoozedUntilStore);
  next.delete(id);
  dummySnoozedUntilStore = next;
};
const SNOOZE_OPTIONS = [
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '4 hours', ms: 4 * 60 * 60 * 1000 },
  { label: 'Tomorrow', ms: 24 * 60 * 60 * 1000 },
];

// Where clicking a notification should take you — only for types that have
// an obvious "go look at this" destination. Types left unmapped (payments,
// group/queue creation) just toggle read state, same as before; a wrong
// guess at a route is worse than no navigation at all.
const getNotificationRoute = (notification?: { type?: string }) => {
  switch (notification?.type) {
    case 'sms':
      return '/messenger';
    case 'voicemail':
    case 'voicemailgroup':
    case 'missedcall':
    case NOTIFICATION_TYPE_CONST.CALL_BACK_SCHEDULE:
      return '/phone';
    case 'meeting_invite':
    case NOTIFICATION_TYPE_CONST.MEETING_REMINDER:
      return '/video/upcoming-meetings';
    case 'new_campaign':
      return '/campaign/all-campaigns';
    case 'department_create':
      return '/admin-settings/phone/departments';
    case 'call_queue_create':
      return '/admin-settings/phone/queues';
    default:
      return null;
  }
};

// Pulls "who this is from" out of the description text so repeats from the
// same caller/sender can collapse into one row instead of cluttering the
// list with N near-identical entries — three missed calls from the same
// number in ten minutes is one thing to deal with, not three. Only defined
// for the types where that's actually likely to happen; everything else
// (payments, campaigns, admin events) is inherently one-off, so grouping it
// would just hide information instead of reducing noise.
const SENDER_KEY_PATTERNS: Partial<Record<string, RegExp>> = {
  sms: /from ([^:]+):/,
  missedcall: /from (.+)$/,
  voicemail: /from (.+?)\s*\(\d/,
  [NOTIFICATION_TYPE_CONST.CALL_BACK_SCHEDULE]: /with (.+)$/,
};
const getSenderGroupKey = (notification?: { type?: string; description?: string }) => {
  const pattern = notification?.type ? SENDER_KEY_PATTERNS[notification.type] : undefined;
  const match = pattern ? notification?.description?.match(pattern) : null;
  return match?.[1]?.trim() || null;
};

// "Today" / "Yesterday" / a full date — assumes the list arrives newest
// first, which is what groups adjacent same-day rows under one header.
const getDateGroupLabel = (createdAt?: string) => {
  if (!createdAt) return 'Earlier';
  const date = moment(createdAt);
  if (!date.isValid()) return 'Earlier';
  const today = moment();
  if (date.isSame(today, 'day')) return 'Today';
  if (date.isSame(moment(today).subtract(1, 'day'), 'day')) return 'Yesterday';
  return date.format('MMMM D, YYYY');
};

// One consistent orange accent for every notification, used as the left-edge
// stripe and the unread dot — the palette here stays strictly white + orange.
const getCategoryAccent = () => '#ea6b42';

// Short category names ("All", "Group") keep the normal title size; only
// names with enough letters to threaten the header row's one-line layout
// step down in size, and only as far as their length actually requires.
const getFilterLabelSizeClass = (label?: string) => {
  const length = label?.length || 0;
  if (length > 15) return 'text-sm';
  if (length > 10) return 'text-base';
  return 'text-lg';
};

// So reopening the drawer picks up where the user left it (Gmail/Slack do
// the same) instead of always resetting to "All".
const NOTIFICATION_FILTER_STORAGE_KEY = 'mcm-notification-filter-label';
const NOTIFICATION_UNREAD_ONLY_STORAGE_KEY = 'mcm-notification-unread-only';

// One line per category so an empty inbox says something more specific than
// a generic "not found" — matches what the filter is actually about.
const EMPTY_STATE_MESSAGES: Record<string, string> = {
  All: "You're all caught up!",
  SMS: 'No new messages',
  Voicemails: 'No voicemails yet',
  'Missed Calls': 'No missed calls',
  'Call Back Schedules': 'No call backs scheduled',
  'Event & Tasks': 'No tasks or events',
  'Meetings & Invites': 'No meeting invites',
  Payments: 'No recent payments',
  Group: 'No group updates',
  'Call Queue': 'No queue updates',
  Campaign: 'No campaign updates',
};
const getEmptyStateMessage = (label?: string, unreadOnly?: boolean) => {
  if (unreadOnly) return "You're all caught up!";
  return (label && EMPTY_STATE_MESSAGES[label]) || 'No Notification(s) Found!';
};

const NotificationContent = ({
  isOpen,
  setNotificationState,
}: {
  isOpen: boolean;
  setNotificationState: any;
}) => {
  const { user } = useUser();
  const { makeCall } = useDialpad();
  const navigate = useNavigate();
  // const { user_info } = user;
  const {
    getNotifications,
    notificationArr = [],
    markReadNotification,
    notificationLoading,
  } = useSocketEvents();
  const [mutatedNotifications, setMutatedNotifications] = useState<any>([]);
  // Dummy notifications aren't wired to the socket, so "read" state for them
  // is tracked locally instead — otherwise marking one read would silently
  // do nothing and look broken. This version counter just forces a re-render
  // when the module-level dummyReadIdStore changes.
  const [dummyReadVersion, setDummyReadVersion] = useState(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState(() => {
    try {
      return localStorage.getItem(NOTIFICATION_UNREAD_ONLY_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  // Not persisted like the other toggles — snoozed items are meant to stay
  // out of the way by default every time the drawer opens, not just once.
  const [showSnoozed, setShowSnoozed] = useState(false);
  const isShowingDummy = isDemoMode() && !(notificationArr && notificationArr?.length > 0);

  const [notificationFilterValue, setNotificationFilterValue] = useState<any>(() => {
    try {
      const savedLabel = localStorage.getItem(NOTIFICATION_FILTER_STORAGE_KEY);
      const saved = savedLabel && notificationFilters?.find((f: any) => f.label === savedLabel);
      if (saved) return saved;
    } catch {
      // localStorage can throw in private browsing — fall back to the default below.
    }
    return {
      id: 1,
      label: 'All',
      value: ['all'],
      icon: <Bell className="text-gray-700 w-full h-full" />,
    };
  });
  // The header row scrolls horizontally when it's too narrow for every
  // control. Picking a new filter swaps in a new label, but a leftover
  // scroll position from browsing the dropdown would otherwise keep the
  // row scrolled past it, cutting the new label's start off.
  const headerRowRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (headerRowRef.current) headerRowRef.current.scrollLeft = 0;
    try {
      localStorage.setItem(NOTIFICATION_FILTER_STORAGE_KEY, notificationFilterValue?.label || '');
    } catch {
      // ignore — remembering the filter is a nicety, not a requirement
    }
  }, [notificationFilterValue]);
  // The shared SideDrawer this renders inside doesn't close on Escape or
  // move focus into itself when it opens, so a keyboard/screen-reader user
  // has no obvious way in or out. Both are handled here instead, scoped to
  // this component's lifetime rather than touching the shared drawer.
  // SideDrawer now stays mounted permanently (for its slide animation), so
  // this has to key off isOpen rather than run once on mount — otherwise
  // focus and Escape would only ever work the very first time it opened.
  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationState(false);
    };
    document.addEventListener('keydown', onKeyDown);
    // The page behind this drawer can be tall enough to need its own
    // scrollbar. That scrollbar renders at the true window edge, outside
    // this drawer's fixed positioning — which on some browsers/OS scaling
    // setups shows as a bare strip of page background between the drawer's
    // right edge and the edge of the window. Locking body scroll while the
    // drawer is open removes that scrollbar entirely, same as any other
    // modal/drawer that shouldn't let the page scroll underneath it.
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isOpen]);
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATION_UNREAD_ONLY_STORAGE_KEY, String(showUnreadOnly));
    } catch {
      // ignore — same as above
    }
  }, [showUnreadOnly]);
  const { data: ongoingMeetingData } = useQuery({
    queryKey: ['ongoingMeetingList', 'notification-content'],
    queryFn: () => meetingList({ listType: 'ongoing', page: 1, limit: 100 }),
    enabled: isOpen,
  });
  const ongoingMeetingList =
    ongoingMeetingData?.data?.data?.result?.rows &&
    Array.isArray(ongoingMeetingData?.data?.data?.result?.rows)
      ? ongoingMeetingData?.data?.data?.result?.rows
      : [];

  // SideDrawer stays permanently mounted now, so a mount-only fetch would
  // only ever run once — fetch fresh notifications on every open instead.
  useEffect(() => {
    if (!isOpen) return;
    getNotifications();
  }, [isOpen]);

  const sourceNotifications = useMemo(() => {
    if (!isShowingDummy) return notificationArr;
    return DUMMY_NOTIFICATIONS.map((notification) => {
      if (dummyReadIdStore.has(notification._id)) return { ...notification, unread: false };
      if (dummyUnreadIdStore.has(notification._id)) return { ...notification, unread: true };
      return notification;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShowingDummy, notificationArr, dummyReadVersion]);

  // A snoozed item should reappear on its own once the time passes, not
  // just the next time something else happens to force a re-render.
  useEffect(() => {
    if (!isShowingDummy) return;
    const interval = setInterval(() => setDummyReadVersion((v) => v + 1), 30_000);
    return () => clearInterval(interval);
  }, [isShowingDummy]);

  const categoryFilteredNotifications = useMemo(() => {
    if (!sourceNotifications || sourceNotifications.length === 0) return [];
    return notificationFilterValue?.value?.[0] && notificationFilterValue?.value?.[0] !== 'all'
      ? sourceNotifications.filter(({ type }) => notificationFilterValue?.value?.includes(type))
      : sourceNotifications;
  }, [sourceNotifications, notificationFilterValue]);

  const categoryUnreadCount = useMemo(
    () => categoryFilteredNotifications.filter(({ unread }) => unread).length,
    [categoryFilteredNotifications],
  );

  // Snoozed items hide from the main list by default (that's the point of
  // snoozing them) but stay countable so there's a way back to them instead
  // of just trusting the Undo toast wasn't missed.
  const categorySnoozedCount = useMemo(() => {
    if (!isShowingDummy) return 0;
    const now = Date.now();
    return categoryFilteredNotifications.filter((n) => {
      const until = dummySnoozedUntilStore.get(n._id);
      return until && until > now;
    }).length;
  }, [categoryFilteredNotifications, isShowingDummy, dummyReadVersion]);

  useEffect(() => {
    const now = Date.now();
    let filtered_notifications = categoryFilteredNotifications;
    if (isShowingDummy && !showSnoozed) {
      filtered_notifications = filtered_notifications.filter((n) => {
        const until = dummySnoozedUntilStore.get(n._id);
        return !until || until <= now;
      });
    }
    if (showUnreadOnly) {
      filtered_notifications = filtered_notifications.filter(({ unread }) => unread);
    }
    setMutatedNotifications(filtered_notifications || []);
  }, [categoryFilteredNotifications, showUnreadOnly, showSnoozed, isShowingDummy, dummyReadVersion]);

  // Collapse consecutive same-type-same-sender items into one row. Only
  // consecutive ones — merging across items separated by something else
  // would group things that aren't actually adjacent in the list the user
  // is scanning, which reads as a bug, not a feature.
  const groupedDisplayItems = useMemo(() => {
    const result: any[] = [];
    for (const notification of mutatedNotifications || []) {
      const senderKey = getSenderGroupKey(notification);
      const last = result[result.length - 1];
      if (
        senderKey &&
        last?.isGroup &&
        last.type === notification?.type &&
        last.senderKey === senderKey
      ) {
        last.items.push(notification);
        last.anyUnread = last.anyUnread || !!notification?.unread;
        continue;
      }
      if (senderKey && last && !last.isGroup && last.type === notification?.type) {
        const lastSenderKey = getSenderGroupKey(last);
        if (lastSenderKey === senderKey) {
          result[result.length - 1] = {
            isGroup: true,
            _id: `group-${notification?.type}-${senderKey}`,
            type: notification?.type,
            senderKey,
            items: [last, notification],
            anyUnread: !!last?.unread || !!notification?.unread,
            createdAt: notification?.createdAt,
          };
          continue;
        }
      }
      result.push(notification);
    }
    return result;
  }, [mutatedNotifications]);
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="relative h-[calc(100%+1.25rem)] -ml-4 lg:-ml-5 w-[calc(100%+2rem)] lg:w-[calc(100%+2.5rem)] px-4 lg:px-5 pb-5 flex flex-col bg-gradient-to-b from-[#fdf3e7] via-[#fbe9d5] to-[#f7dcc0]"
    >
      {/* Visually hidden — announces count changes to screen readers without
          a visible element, since the badge itself only conveys meaning
          through color/position that assistive tech can't see. */}
      <div aria-live="polite" className="sr-only">
        {categoryUnreadCount > 0
          ? `${categoryUnreadCount} unread notification${categoryUnreadCount === 1 ? '' : 's'} in ${notificationFilterValue?.label}`
          : `No unread notifications in ${notificationFilterValue?.label}`}
      </div>
      <button
        ref={closeButtonRef}
        type="button"
        onClick={() => setNotificationState(false)}
        aria-label="Close"
        title="Close"
        className="absolute right-6 top-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#f0d6b4] bg-white/80 backdrop-blur-sm text-[#ea6b42] shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6b42]"
      >
        <IconComponent name="CloseIcon" className="h-4 w-4" />
      </button>
      <div className="flex flex-col gap-3 mt-1 mb-2 py-3 pl-3 pr-12 rounded-2xl bg-white/45 backdrop-blur-md border border-white/70 shadow-sm">
        <div className="flex items-center">
          <div className="text-gray-900 font-semibold flex flex-nowrap items-center gap-1 w-full">
            {/* Only this zone (icon + category name) scrolls when it's too
                long — the action buttons below live outside it entirely, on
                fixed shrink-0 layout, so they're either fully visible or
                fully off to the side. Never a half-cut circle. */}
            <div
              ref={headerRowRef}
              className="flex items-center gap-1 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <div className="flex w-4 h-4 shrink-0">{notificationFilterValue?.icon}</div>
              <div
                className={`flex ${getFilterLabelSizeClass(notificationFilterValue?.label)} font-semibold whitespace-nowrap shrink-0`}
              >
                {notificationFilterValue?.label}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-nowrap shrink-0 ml-auto">
              <button
                type="button"
                title="Unread"
                aria-label={`Unread only${categoryUnreadCount > 0 ? `, ${categoryUnreadCount}` : ''}`}
                aria-pressed={showUnreadOnly}
                onClick={() => setShowUnreadOnly((prev) => !prev)}
                className={`relative flex items-center justify-center w-8 h-8 rounded-full shrink-0 border cursor-pointer transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6b42] ${
                  showUnreadOnly
                    ? 'bg-gradient-to-r from-[#f2794f] to-[#ea5c34] text-white border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_4px_rgba(234,107,66,0.14)]'
                    : 'bg-white/60 text-[#b5502f] border-[#f0d6b4] hover:bg-white/90 hover:-translate-y-px'
                }`}
              >
                <Bell className="w-4 h-4" />
                {categoryUnreadCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-semibold flex items-center justify-center ${
                      // #ea6b42 only clears ~3.2:1 against white/white-on-it —
                      // under the 4.5:1 WCAG AA text minimum. #b5502f clears
                      // ~5.3:1 either way round, so this badge uses that
                      // instead of the lighter accent used everywhere else.
                      showUnreadOnly ? 'bg-white text-[#b5502f]' : 'bg-[#b5502f] text-white'
                    }`}
                  >
                    {categoryUnreadCount > 9 ? '9+' : categoryUnreadCount}
                  </span>
                )}
              </button>
              {mutatedNotifications && mutatedNotifications?.length > 0 ? (
                <button
                  type="button"
                  title="Mark all as read"
                  aria-label="Mark all as read"
                  className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 cursor-pointer text-[#ea6b42] bg-white/60 border border-[#f0d6b4] hover:bg-gradient-to-r hover:from-[#f2794f] hover:to-[#ea5c34] hover:text-white hover:border-transparent transition-colors"
                  onClick={() => {
                    if (isShowingDummy) {
                      // Only offered for the local dev sample data — there's
                      // no matching "unmark as read" call for real
                      // notifications, so a fake Undo there would just lie.
                      // The drawer stays open (rather than closing like the
                      // real-notifications branch below) specifically so
                      // Undo has a visible list to restore — closing it here
                      // used to leave Undo appearing to do nothing, since the
                      // change it reverted was on a screen no longer open.
                      const previousReadState = markAllDummyRead();
                      setDummyReadVersion((v) => v + 1);
                      handleAlert({
                        icon: <IconComponent name="ChecksLineIcon" className="w-4 h-4 text-white" />,
                        className: 'mcm-toast-markread',
                        text: (
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span>All notifications marked as read.</span>
                            <button
                              type="button"
                              className="mcm-toast-undo shrink-0 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreDummyReadIds(previousReadState);
                                setDummyReadVersion((v) => v + 1);
                                toast.dismiss();
                              }}
                            >
                              Undo
                            </button>
                          </div>
                        ) as any,
                        type: 'success',
                      });
                    } else {
                      markReadNotification('all');
                      setNotificationState(false);
                      handleAlert({
                        text: 'All the notifications has been marked as read.',
                        type: 'success',
                      });
                    }
                  }}
                >
                  <IconComponent name="ChecksLineIcon" className="w-4 h-4" />
                </button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger ref={filterTriggerRef}>
                  <div
                    className={
                      'cursor-pointer flex items-center justify-center rounded-full w-9 h-9 shrink-0 bg-white/60 text-[#b5502f] border border-[#f0d6b4] hover:bg-gradient-to-r hover:from-[#f2794f] hover:to-[#ea5c34] hover:text-white hover:border-transparent'
                    }
                  >
                    <FilterIcon className="w-5 h-5" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  onCloseAutoFocus={(e) => {
                    // Radix returns focus to the trigger on close, and the
                    // browser's default focus scrolls that trigger into
                    // view — which drags our horizontally-scrolling header
                    // row back to the right, hiding the label we just
                    // switched to. Restore focus ourselves without letting
                    // it scroll, then reset the row's scroll position.
                    e.preventDefault();
                    filterTriggerRef.current?.focus({ preventScroll: true });
                    if (headerRowRef.current) headerRowRef.current.scrollLeft = 0;
                  }}
                >
                  {notificationFilters?.map((filter: any, filterIndex: number) => {
                    return (
                      <DropdownMenuItem
                        key={`${filter?.label}-${filterIndex}`}
                        className="cursor-pointer"
                        onClick={() => setNotificationFilterValue(filter)}
                      >
                        <div className="w-6 h-6 p-1 bg-[#FBE2C8]/45 border-[#EEE7DD] border rounded-full flex items-center justify-center">
                          {filter?.icon}
                        </div>
                        {filter?.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      <hr className="border-[#f0d6b4] p-2 mt-1" />
      {isShowingDummy && categorySnoozedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowSnoozed((prev) => !prev)}
          className="flex items-center gap-1.5 shrink-0 mx-1 mb-2 px-3 py-1.5 rounded-full cursor-pointer text-xs font-medium text-[#b5502f] bg-white/50 border border-[#f0d6b4] hover:bg-white/80 transition-colors self-start"
        >
          <Clock className="w-3.5 h-3.5" />
          {showSnoozed
            ? 'Hide snoozed'
            : `${categorySnoozedCount} snoozed — Show`}
        </button>
      )}
      <div className="w-full overflow-auto flex-1 min-h-0 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#e8b98a] [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:#e8b98a_transparent]">
        {notificationLoading && mutatedNotifications?.length == 0 ? (
          <div role="status" aria-label="Loading notifications" className="flex justify-center items-center h-full">
            <Loader variant="blue" />
          </div>
        ) : mutatedNotifications && mutatedNotifications?.length > 0 ? (
          groupedDisplayItems?.map((notification: any, notificationIndex: number) => {
            const dateGroupLabel = getDateGroupLabel(notification?.createdAt);
            const previousDateGroupLabel =
              notificationIndex > 0
                ? getDateGroupLabel(groupedDisplayItems[notificationIndex - 1]?.createdAt)
                : null;
            const showDateGroupHeader = dateGroupLabel !== previousDateGroupLabel;

            if (notification.isGroup) {
              const GroupIcon =
                notificationIconLookup?.[notification.type] || notificationIconLookup?.['default'];
              const groupLabel =
                notification.type === 'sms'
                  ? 'new messages'
                  : notification.type === 'missedcall'
                    ? 'missed calls'
                    : notification.type === 'voicemail'
                      ? 'voicemails'
                      : 'updates';
              return (
                <Fragment key={notification._id}>
                  {showDateGroupHeader && (
                    <div
                      className={`sticky top-0 z-[6] -mx-1 px-1 bg-[#fbe9d5]/90 backdrop-blur-sm text-xs font-semibold text-[#b5502f]/80 uppercase tracking-wide pb-1 ${notificationIndex === 0 ? 'pt-2' : 'pt-4'}`}
                    >
                      {dateGroupLabel}
                    </div>
                  )}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${notification.senderKey}, ${notification.items.length} ${groupLabel}${notification.anyUnread ? ', unread' : ''}`}
                    className={`animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300 motion-reduce:animate-none relative w-full p-3 mt-2 bg-white/55 backdrop-blur-sm border border-l-4 rounded-xl border-white/70 shadow-sm flex items-center cursor-pointer flex-shrink-0 transition-all motion-reduce:transition-none hover:bg-white/75 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6b42] ${notification.anyUnread ? 'opacity-100' : 'opacity-60'}`}
                    style={{ borderLeftColor: getCategoryAccent() }}
                    onClick={() => {
                      notification.items.forEach((item: any) => {
                        if (isShowingDummy) markDummyIdRead(item?._id);
                        else markReadNotification(item?._id);
                      });
                      setDummyReadVersion((v) => v + 1);
                      const route = getNotificationRoute(notification);
                      if (route) {
                        setNotificationState(false);
                        navigate(route);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      e.currentTarget.click();
                    }}
                  >
                    <div
                      aria-label="group icon"
                      role="img"
                      className="relative focus:outline-none w-11 h-11 border rounded-full border-[#f0d6b4] bg-[#fdeee0] flex flex-shrink-0 items-center justify-center p-2 text-[#b5502f]"
                    >
                      {GroupIcon ? <div className="flex w-5 h-5">{GroupIcon}</div> : null}
                      <span className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center bg-[#b5502f] text-white ring-2 ring-white">
                        {notification.items.length}
                      </span>
                    </div>
                    <div className="pl-3 w-full">
                      <div className="text-sm text-gray-900 font-medium">
                        {notification.senderKey}
                      </div>
                      <p className="text-xs leading-3 pt-1 text-gray-500">
                        {notification.items.length} {groupLabel}
                      </p>
                    </div>
                  </div>
                </Fragment>
              );
            }
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
              const triggerCallBack = () => {
                const number = String(notification?.value || '').trim();
                if (!number) return;
                const extraHeaders = notification?.didNumber
                  ? [`X-CallerId: ${notification?.didNumber}`]
                  : [];
                makeCall(number, { extraHeaders });
              };
              actionIcon = (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Call back"
                  className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-green-100 text-green-500 hover:bg-green-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerCallBack();
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    e.stopPropagation();
                    triggerCallBack();
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
                    if (isShowingDummy) {
                      markDummyIdRead(notification?._id);
                      setDummyReadVersion((v) => v + 1);
                    } else {
                      markReadNotification(notification?._id);
                    }
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

            // Clicking a read dummy item flips it back to unread — lets you
            // re-flag something for follow-up. Real notifications only ever
            // go one way (see markDummyIdUnread above for why).
            const toggleReadState = () => {
              // Only navigate on the "attending to it" transition (unread ->
              // read) — re-clicking an already-read dummy row to flip it back
              // to unread is a local testing affordance (see markDummyIdUnread
              // above), not a real intent to go somewhere.
              const wasUnread = !!notification?.unread;
              if (isShowingDummy) {
                if (wasUnread) {
                  markDummyIdRead(notification?._id);
                } else {
                  markDummyIdUnread(notification?._id);
                }
                setDummyReadVersion((v) => v + 1);
              } else {
                markReadNotification(notification?._id);
              }
              if (wasUnread) {
                const route = getNotificationRoute(notification);
                if (route) {
                  setNotificationState(false);
                  navigate(route);
                }
              }
            };
            const categoryAccent = getCategoryAccent();
            const enterDelayMs = Math.min(notificationIndex, 14) * 25;
            const snoozedUntilMs = isShowingDummy
              ? dummySnoozedUntilStore.get(notification?._id)
              : undefined;
            const isSnoozed = !!snoozedUntilMs && snoozedUntilMs > Date.now();

            return (
              <Fragment key={notification?._id}>
                {showDateGroupHeader && (
                  <div
                    className={`sticky top-0 z-[6] -mx-1 px-1 bg-[#fbe9d5]/90 backdrop-blur-sm text-xs font-semibold text-[#b5502f]/80 uppercase tracking-wide pb-1 ${notificationIndex === 0 ? 'pt-2' : 'pt-4'}`}
                  >
                    {dateGroupLabel}
                  </div>
                )}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`${notification?.description || 'Notification'}${isShowingDummy ? `, ${notification?.unread ? 'unread' : 'read, activate to mark unread'}` : ''}`}
                  style={{ borderLeftColor: categoryAccent, animationDelay: `${enterDelayMs}ms` }}
                  className={`animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300 motion-reduce:animate-none relative w-full p-3 mt-2 bg-white/55 backdrop-blur-sm border border-l-4 rounded-xl border-white/70 shadow-sm flex cursor-pointer flex-shrink-0 transition-all motion-reduce:transition-none hover:bg-white/75 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6b42] ${shouldShowJoinNowForInvite ? 'pb-12' : ''} ${
                    notification?.unread ? 'opacity-100' : 'opacity-60'
                  }`}
                  onClick={toggleReadState}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    toggleReadState();
                  }}
                >
                  <div
                    aria-label="group icon"
                    role="img"
                    className="relative focus:outline-none w-11 h-11 border rounded-full border-[#f0d6b4] bg-[#fdeee0] flex flex-shrink-0 items-center justify-center p-2 text-[#b5502f]"
                  >
                    {Icon ? <div className="flex w-5 h-5">{Icon}</div> : null}
                    {notification?.unread && (
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: categoryAccent }}
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white"
                      />
                    )}
                  </div>
                  <div className="pl-3 w-full">
                    <div
                      className={`flex items-center justify-between w-full text-sm text-gray-900 ${notification?.unread ? 'font-medium' : 'font-normal'}`}
                    >
                      {notification?.description}
                    </div>
                    <p className="focus:outline-none text-xs leading-3 pt-1 text-gray-500 flex items-center gap-1.5">
                      {formatNotificationDate(notification?.createdAt)}
                      {isSnoozed && (
                        <span className="inline-flex items-center gap-1 text-[#b5502f] font-medium">
                          <Clock className="w-3 h-3" />
                          Snoozed
                        </span>
                      )}
                    </p>
                  </div>
                  {actionIcon && <div className="flex items-start gap-2 ml-2">{actionIcon}</div>}
                  {isShowingDummy &&
                    (isSnoozed ? (
                      // Already snoozed — one click cancels it instead of
                      // reopening the same duration picker.
                      <div className="flex items-start ml-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          aria-label="Cancel snooze"
                          title="Cancel snooze"
                          onClick={() => {
                            unsnoozeDummyId(notification?._id);
                            setDummyReadVersion((v) => v + 1);
                          }}
                          className="cursor-pointer flex items-center justify-center rounded-full w-7 h-7 shrink-0 text-white bg-gradient-to-r from-[#f2794f] to-[#ea5c34] border border-transparent hover:opacity-90 transition-opacity"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      // Dummy-only, same as mark-as-unread — there's no real
                      // "remind me later" call to make against a live
                      // notification yet, only the local demo state to snooze.
                      <div className="flex items-start ml-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label="Snooze"
                              title="Snooze"
                              className="cursor-pointer flex items-center justify-center rounded-full w-7 h-7 shrink-0 text-[#b5502f] bg-white/60 border border-[#f0d6b4] hover:bg-gradient-to-r hover:from-[#f2794f] hover:to-[#ea5c34] hover:text-white hover:border-transparent transition-colors"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {SNOOZE_OPTIONS.map((option) => (
                              <DropdownMenuItem
                                key={option.label}
                                className="cursor-pointer"
                                onClick={() => {
                                  const id = notification?._id;
                                  snoozeDummyId(id, option.ms);
                                  setDummyReadVersion((v) => v + 1);
                                  const until = moment(Date.now() + option.ms);
                                  const untilLabel =
                                    option.label === 'Tomorrow'
                                      ? `tomorrow at ${until.format('h:mm A')}`
                                      : until.format('h:mm A');
                                  handleAlert({
                                    text: (
                                      <div className="flex items-center gap-3">
                                        <span>Snoozed until {untilLabel}.</span>
                                        <button
                                          type="button"
                                          className="text-xs font-semibold underline shrink-0 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            unsnoozeDummyId(id);
                                            setDummyReadVersion((v) => v + 1);
                                          }}
                                        >
                                          Undo
                                        </button>
                                      </div>
                                    ) as any,
                                    type: 'success',
                                  });
                                }}
                              >
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  {actionButton && <div className="absolute bottom-3 right-3">{actionButton}</div>}
                </div>
              </Fragment>
            );
          })
        ) : (
          <div className="w-full max-w-96 min-h-52  h-full p-4 rounded-xl   m-auto border border-[#f0d6b4] bg-white/40 flex flex-col items-center justify-center gap-2">
            <img src={NotFound} alt="BusyImage" className="min-w-28 w-28" />
            <p className="flex items-center justify-center text-gray-900  font-medium">
              {getEmptyStateMessage(notificationFilterValue?.label, showUnreadOnly)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationContent;

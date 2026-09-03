import {
  Bell,
  CallBackReschuledStrokeIcon,
  CallQueue,
  Chat,
  DepartmentIcon1,
  DialerIcon,
  EditIcon,
  Invite,
  InvitedIcon,
  ListIcon,
  MissedCallStrokeIcon,
  StarCircleLine,
  TrashLineIcon,
  VideocameraAdd,
  VoicemailLineIcon,
} from '@/assets/icons';
import { BellIcon, CreditCardIcon, VideoIcon } from 'lucide-react';
import BusyImage from '@/assets/images/status/busy.png';
import DNDImage from '@/assets/images/status/do-not-disturb.png';
export const presenceStatusArray = [
  { title: 'Online', value: 'online', description: 'Ready to call' },

  {
    title: 'Busy',
    value: 'busy',
    /* Made honest alongside Do not disturb below, for the same reason: it
       promised that internal calls go to voicemail and that a voicemail
       notification follows. Neither happens. The call path does not read a
       person's presence at all, and the notification settings it implies are
       saved but read by nothing. */
    description: 'Shows colleagues you are busy. Your phone still rings, from inside and outside.',
  },
  {
    title: 'Do not disturb',
    value: 'dnd',
    /* This used to promise that every call goes to voicemail. Nothing in the
       call path reads it - not the dialplan, not the directory service that
       decides which device to ring - so a phone set to Do not disturb still
       rings. Somebody who set it before an evening off and was rung anyway
       would rightly say the product lied to them, so it now says what it
       actually does. Restore the old sentence when the switch honours it.

       This first said "send calls to voicemail under My Account -> My Phone".
       That pointed at a second thing that does not work: My Phone saves to
       `call_forwarding` on the person, and the call path reads none of it -
       0 matches in both the dialplan and the directory service, against
       controls of 1 each on the same files. Sending somebody to a remedy that
       is also inert is worse than saying plainly that there is none yet. */
    description: 'Shows colleagues you are busy. It does not stop your phone ringing yet.',
  },
];

export const statusImageLookup: any = {
  online: <div className="w-3 h-3 rounded-full bg-green-500"></div>,
  busy: <img src={BusyImage} alt="BusyImage" className="min-w-3 min-h-3 max-w-3" />,
  dnd: <img src={DNDImage} alt="DNDImage" className="min-w-3 min-h-3 max-w-3" />,
};

export const notificationIconLookup: any = {
  sms: <Chat className="text-[#b5502f] w-full h-full" />,
  voicemail: <VoicemailLineIcon className="text-[#b5502f] w-full h-full" />,
  voicemailgroup: <VoicemailLineIcon className="text-[#b5502f] w-full h-full" />,
  missedcall: <MissedCallStrokeIcon className="text-[#b5502f] w-full h-full" />,
  payment_event_socket: <CreditCardIcon className="text-[#b5502f] w-full h-full" />,
  did_purchase: <CreditCardIcon className="text-[#b5502f] w-full h-full" />,
  account_invitation: <Invite className="text-[#b5502f] w-full h-full" />,
  change_plan_request: <StarCircleLine className="text-[#b5502f] w-full h-full" />,
  event_task_reminder: <ListIcon className="text-[#b5502f] w-full h-full" />,
  meeting_reminder: <VideocameraAdd className="text-[#b5502f] w-full h-full" />,
  meeting_invite: <InvitedIcon className="text-[#b5502f] w-full h-full" />,
  meeting_update: <EditIcon className="text-[#b5502f] w-full h-full" />,
  meeting_delete: <TrashLineIcon className="text-[#b5502f] w-full h-full" />,
  meeting_cancel: <VideocameraAdd className="text-[#b5502f] w-full h-full" />,
  TASK: <ListIcon className="text-[#b5502f] w-full h-full" />,
  EVENT: <VideocameraAdd className="text-[#b5502f] w-full h-full" />,
  campaign_callback_scheduled: (
    <CallBackReschuledStrokeIcon className="text-[#b5502f] w-full h-full" />
  ),
  new_campaign: <DialerIcon className="text-[#b5502f] w-full h-full" />,
  department_create: <DepartmentIcon1 className="text-[#b5502f] w-full h-full" />,
  call_queue_create: <CallQueue className="text-[#b5502f] w-full h-full" />,
  default: <BellIcon className="text-[#b5502f] w-full h-full" />,
};
export const notificationFilters: any = [
  {
    id: 1,
    label: 'All',
    value: ['all'],
    icon: <Bell className="text-[#b5502f] w-full h-full" />,
  },
  {
    id: 2,
    label: 'SMS',
    value: ['sms'],
    icon: <Chat className="text-[#b5502f] w-full h-full" />,
  },
  {
    id: 3,
    label: 'Voicemails',
    value: ['voicemail', 'voicemailgroup'],
    icon: <VoicemailLineIcon className="text-[#b5502f] w-full h-full" />,
  },
  {
    id: 4,
    label: 'Missed Calls',
    value: ['missedcall'],
    icon: <MissedCallStrokeIcon className="text-[#b5502f] w-full h-full" />,
  },
  {
    id: 5,
    label: 'Call Back Schedules',
    value: ['campaign_callback_scheduled'],
    icon: <CallBackReschuledStrokeIcon className="text-[#b5502f] w-full h-full" />,
  },
  {
    id: 6,
    label: 'Event & Tasks',
    value: ['event_reminder'],
    icon: <ListIcon className="text-[#b5502f] w-full h-full" />,
  },
  {
    id: 11,
    label: 'Meetings & Invites',
    value: ['meeting_invite', 'meeting_update', 'meeting_delete', 'meeting_reminder'],
    icon: <VideoIcon className="text-[#b5502f] w-full h-full" />,
  },
  {
    id: 7,
    label: 'Payments',
    value: ['payment_event_socket'],
    icon: <CreditCardIcon className="text-[#b5502f] w-full h-full" />,
  },
  {
    id: 8,
    label: 'Group',
    value: ['department_create'],
    icon: <DepartmentIcon1 className="text-[#b5502f] w-full h-full" />,
  },
  {
    id: 9,
    label: 'Call Queue',
    value: ['call_queue_create'],
    icon: <CallQueue className="text-[#b5502f] w-full h-full" />,
  },
  {
    id: 10,
    label: 'Campaign',
    value: ['new_campaign'],
    icon: <DialerIcon className="text-[#b5502f] w-full h-full" />,
  },
];

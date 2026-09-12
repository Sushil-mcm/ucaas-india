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
import { PRESENCE_STATES } from '@/hooks/use-my-presence';
/* Names and behaviour text come from `use-my-presence`, the single place the
   three states are described. `title` is kept as the key because the header and
   the campaign screen both render it. */
export const presenceStatusArray = PRESENCE_STATES.map((state) => ({
  title: state.label,
  value: state.value,
  description: state.description,
}));

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

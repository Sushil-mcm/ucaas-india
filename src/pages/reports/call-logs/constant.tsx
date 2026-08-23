import {
  Clock8,
  Disc,
  FileSliders,
  ListStart,
  PhoneIncoming,
  PhoneOutgoing,
  SquareActivity,
  Voicemail,
} from 'lucide-react';
export const handleStatus = (status: any) => {
  const statusClasses: any = {
    success: 'text-green-500 bg-green-50',
    answered: 'text-green-500 bg-green-50',
    failure: 'text-red-500 bg-red-50',
    cancel: 'text-red-500 bg-red-50',
    cancelled: 'text-red-500 bg-red-50',
    failed: 'text-red-500 bg-red-50',
    missed: 'text-red-500 bg-red-50',
    'user unavailable': 'text-red-500 bg-red-50',
    'user available': 'text-primary bg-primary-100',
    'user invalid destination': 'text-red-500 bg-red-50',
    'no answered': 'text-red-500 bg-red-50',
    'no answer': 'text-red-500 bg-red-50',
    'user busy': 'text-red-500 bg-red-50',
    unavailable: 'text-red-500 bg-red-50',
    voicemail: 'text-blue-500 bg-blue-50',
    transfer: 'text-blue-500 bg-blue-50',
  };
  return statusClasses[status] || '';
};

export const CALL_TYPE = [
  {
    label: 'Inbound',
    value: 'Inbound',
  },
  {
    label: 'Outbound',
    value: 'Outbound',
  },
  {
    label: 'Missed',
    value: 'Missed',
  },
];

export const SMS_TYPE = [
  {
    label: 'Inbound',
    value: 'Inbound',
  },
  {
    label: 'Outbound',
    value: 'Outbound',
  },
];

export const TYPE = [
  {
    label: 'Voicemail',
    value: 'voicemail',
  },
  {
    label: 'DID',
    value: 'did',
  },
  {
    label: 'Announcement',
    value: 'announcement',
  },
  {
    label: 'Extension',
    value: 'extension',
  },
  {
    label: 'IVR',
    value: 'ivr',
  },
  {
    label: 'Call Queue',
    value: 'call-queue',
  },
  {
    label: 'Group',
    value: 'department',
  },
];

export const FORWARD_TYPES_ARR = ['EXTENSION', 'DEPARTMENT', 'IVR', 'QUEUE'];

export const FORWARD_TYPES: any = {
  VOICEMAIL: 'VOICEMAIL',
  DID: 'DID',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  EXTENSION: 'EXTENSION',
  IVR: 'IVR',
  CALLQUEUE: 'CALLQUEUE',
  DEPARTMENT: 'DEPARTMENT',
};

export const STATUS_TYPE = [
  { label: 'Answered', value: 'SUCCESS' },
  { label: 'Cancel', value: 'CANCEL' },
  { label: 'No answer', value: 'NO ANSWER' },
  { label: 'Unavailable', value: 'UNAVAILABLE' },
  { label: 'Voicemail', value: 'VOICEMAIL' },
  { label: 'User invalid destination', value: 'USER_INVALID_DESTINATION' },
  { label: 'Transfer', value: 'TRANSFER' },
  // { label: 'OTHER', value: 'OTHER' },
];

export const tabList = [
  { name: 'Call History', icon: <Clock8 className="size-4 " /> },
  { name: 'Call Recording', icon: <Disc className="size-4 " /> },
  { name: 'Voicemail', icon: <Voicemail className="size-4.5" /> },
  { name: 'Call Volume', icon: <PhoneOutgoing className="size-4 " /> },
  { name: 'Queue', icon: <ListStart className="size-4 " /> },
  { name: 'Inbound', icon: <PhoneIncoming className="size-4 " /> },
  { name: 'Outbound', icon: <PhoneOutgoing className="size-4 " /> },
  { name: 'Activity', icon: <SquareActivity className="size-4 " /> },
  { name: 'Agent Reports', icon: <FileSliders className="size-4 " /> },
];

import NumberWithFlag from '@/components/custom/number-with-flag';
import { FORWARD_ICONS } from '@/pages/dashboard/constant';

export interface CallInitiatorOrReceiver {
  user_uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  extension: string;
}
export interface CallRecordInterface {
  _id: string;
  domain: string;
  type: string;
  value: string;
  name: string;
  phone: string;
  direction: string;
  didNumber: string;
  didName: string;
  time: string;
  status: string;
  duration: number;
  isVoicemail: boolean;
  recordfile: string;
  recording_file_url: string;
  accountcode: string;
  extension: string;
  sipcallID: any;
  callID: string;
  contactType: string | null;
  transcript_file: string;
  contactId: string;
  category: string;
  sipcall_id: string;
  recording_file: string;
  campaignNumber?: [{ contactName: string }];
  note: unknown[];
  forward_type?: string;
  callInitiatorOrReceivers: CallInitiatorOrReceiver[];
  members: any[];
  createdAt: string;
  updatedAt: string;
  transcriptedFile?: string;
  __v: number;
  callNotes: any[];
  campaignDetail: any;
  contactNumber: any;
}
export const ACTIVITYLIST = {
  Inbound: 'Inbound',
  Outbound: 'Outbound',
  Voicemail: 'Voicemail',
  Missed: 'Missed',
  Cancelled: 'Cancelled',
  Announcement: 'Announcement',
  MESSAGE: 'MESSAGE',
  VOICEMAIL: 'VOICEMAIL',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  DEPARTMENT: 'DEPARTMENT',
  EXTENSION: 'EXTENSION',
  IVR: 'IVR',
  PHONE: 'PHONE',
  FAILED: 'Failed',
};
export const renderCallerInfo = ({
  origin,
  data,
}: {
  origin: string;
  data: CallRecordInterface;
}) => {
  const {
    direction,
    type,
    name,
    callInitiatorOrReceivers,
    phone,
    campaignNumber = [],
  } = data || {};
  const receiver = callInitiatorOrReceivers?.[0];
  const { contactName = '' } = campaignNumber?.[0] || {};
  const isDepartment = type === ACTIVITYLIST?.DEPARTMENT;
  const isIVR = type === ACTIVITYLIST?.IVR;

  if (
    (direction === ACTIVITYLIST?.Outbound && origin === 'to') ||
    (direction === ACTIVITYLIST?.Inbound && origin === 'from')
  ) {
    return (
      <div className="flex flex-col items-start">
        <NumberWithFlag number={phone} />
        {contactName && <span className="text-xs">{contactName}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <span className="flex items-center gap-1">
        {FORWARD_ICONS[type]}
        {(isDepartment || isIVR) && (
          <div className="flex flex-col">
            <span className="capitaliz font-semibold">{name || 'unknown'}</span>
          </div>
        )}
        {(receiver?.first_name || receiver?.last_name || receiver?.extension) && (
          <>
            <span className="text-gray-400">|</span>
            <span className="flex items-center gap-1">
              {receiver?.first_name} {receiver?.last_name}
              {receiver?.extension && <small className="italic">({receiver.extension})</small>}
            </span>
          </>
        )}
      </span>
    </div>
  );
};
export const safeJSONParse = (value: any, fallback: any) => {
  if (typeof value === 'object' && value !== null) return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

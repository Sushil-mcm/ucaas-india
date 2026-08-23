import { Icon } from '@/assets/icons/icon';
import moment from 'moment';

export const getFilterDate = (selectedDateRange: string) => {
  const today = moment().format('YYYY-MM-DD');
  const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
  const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
  const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');

  if (selectedDateRange === 'today') {
    return { filter_date: { from: today, to: today } };
  }

  if (selectedDateRange === 'yesterday') {
    return { filter_date: { from: yesterday, to: yesterday } };
  }

  if (selectedDateRange === 'this week') {
    return { filter_date: { from: startOfWeek, to: endOfWeek } };
  }

  return {};
};

export const getDialInfo = (data: any, extensionObj: any, departmentList: any) => {
  const selectedDepartment =
    data?.forward_type === 'DEPARTMENT'
      ? departmentList?.find((item: any) => item?.uuid === data?.forward_value)
      : null;

  const callDirection = data?.direction;

  // Outbound call
  if (callDirection === 'Outbound') {
    return {
      name: data?.main?.contact_username || 'Unknown',
      number: data?.destination_number,
    };
  }
  if (['Inbound', 'Missed'].includes(callDirection)) {
    return {
      name: data?.main?.contact_username || 'Unknown',
      number: data?.caller_id_number,
    };
  }

  // Not forwarded
  if (!data?.forward_type) {
    return {
      name: data?.main?.contact_username || 'Unknown',
      number: data?.destination_number,
    };
  }

  // Forwarded to Department
  if (data?.forward_type === 'DEPARTMENT') {
    return {
      name: selectedDepartment?.name || data?.forward_name || 'Unknown',
      number: extensionObj[data?.destination_number] || data?.destination_number,
    };
  }

  return {
    name: data?.forward_name || 'Unknown',
    number: data?.forward_value || data?.destination_number,
  };
};

export const CALL_DIRECTIONS: any = {
  Inbound: <Icon name="IncomingCallStrokeIcon" className="text-primary w-4.5 h-4.5" />,
  Outbound: <Icon name="OutgoingCallStrokeIcon" className="text-green-400 w-4.5 h-4.5" />,
  Missed: <Icon name="MissedCallStrokeIcon" className="w-4.5 h-4.5 text-red-500" />,
  Voicemail: <Icon name="VoicemailLineIcon" className="w-5 h-5 text-grey-500" />,
  Announcement: <Icon name="AnnouncementIcon" className="w-4 h-4 text-grey-500 -scale-x-100" />,
};
export const FORWARD_ICONS: any = {
  EXTENSION: <Icon name="Grid" className="w-4 h-4 text-grey-500" />,
  VOICEMAIL: <Icon name="VoicemailLineIcon" className="w-4 h-4 text-grey-500" />,
  IVR: <Icon name="PhoneCalling" className="w-4 h-4 text-grey-500" />,
  GROUP: <Icon name="DepartmentIcon1" className="w-4 h-4 text-grey-500" />,
  MESSAGE: <Icon name="RiChatVoiceLine" className="w-4 h-4 text-grey-500" />,
  ANNOUNCEMENT: <Icon name="AnnouncementIcon" className="w-4 h-4 text-grey-500 -scale-x-100" />,
  DEPARTMENT: <Icon name="UsersGroup" className="w-4 h-4 text-grey-500" />,
  QUEUE: <Icon name="CallQueue" className="w-4 h-4 text-grey-500" />,
  PHONE: <Icon name="PhoneForwardingIcon" className="w-4 h-4 text-grey-500" />,
  HANGUP: <Icon name="ImPhoneHangUp" className="w-4 h-4 text-grey-500" />,
  AI: <Icon name="AIChatIcon" className="w-4 h-4 text-grey-500" />,
  CAMPAIGN: <Icon name="CampaignLogsIcon" className="w-4 h-4 text-grey-500" />,
};

export const DASHBOARDCONST = {
  dashboardType: 'dashboardType',
};

export interface CallGraphDataset {
  label: string;
  data: number[];
  backgroundColor: string;
}

export interface CallGraphData {
  labels: string[];
  datasets: CallGraphDataset[];
}
export const leftsideTabList = ['Running', 'Paused', 'Completed', 'New'];
// export const rightsideTabList = ['Campaign Monitoring', 'Agent Reports', 'Campaigns'];
export const rightsideTabList = ['Agent Reports', 'Campaigns'];

export const campaignStatusStyles: Record<string, string> = {
  NEW: 'bg-ucass-active-bg text-ucass-active',
  PROCESSING: 'bg-yellow-100 text-yellow-500',
  PAUSE: 'bg-red-100 text-red-500',
  COMPLETED: 'bg-green-100 text-green-500',
};
export const statusObj = {
  Running: 'PROCESSING',
  New: 'NEW',
  Paused: 'PAUSE',
  Completed: 'COMPLETED',
};
export const campaignStatusModifier = {
  PAUSE: 'PAUSED',
  NEW: 'NEW',
  COMPLETED: 'COMPLETED',
  PROCESSING: 'RUNNING',
};
export interface ICampaignData {
  name: string;
  campaignStatus: string;
  dialMethod: string;
  startDate: string;
  endDate: string;
  _id: string;
  members: any;
}
export const campaignStatusTooltips: Record<string, string> = {
  PAUSE: 'Start',
  NEW: 'Start',
  COMPLETED: 'Completed',
  PROCESSING: 'Pause',
};

export const getSidedrawerHeading = {
  callScheduled: 'Call Scheduled',
  doNothing: 'Do Nothing',
  skipped: 'Skipped',
  answered: 'Answered',
  campaigns: 'Campaigns',
  disposition: 'Dispositions',
};

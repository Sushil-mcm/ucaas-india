import { TZDate } from 'tui-calendar';
import * as yup from 'yup';

export const scheduleMeetingSchema = yup.object().shape({
  name: yup
    .string()
    .required('Meeting Topic is required')
    .min(2, 'Meeting Topic must be at least 2 characters')
    .max(50, 'Meeting Topic be at most 50 characters')
    .matches(/^\S.*\S$|^\S$/, 'Spaces not allowed'),
  pin: yup.string().when('need_password', {
    is: (val: any) => val === 'Yes',
    then: () =>
      yup
        .string()
        .required('Password is required')
        .min(4, 'Password must be at least 4 characters')
        .max(12, 'Password must be at most 12 characters'),
    otherwise: () => yup.string(),
  }),
  reminder_mode: yup.array().when('reminder', {
    is: (val: any) => val === true,
    then: (schema) => schema.min(1, 'Reminder mode is required'),
    otherwise: (schema) => schema.optional(),
  }),
  settings: yup.object({
    operational_hours: yup.object({
      regional: yup.object({
        country_code: yup
          .object({
            value: yup.string(),
            label: yup.string(),
          })
          .nullable()
          .required('Country is required'),

        timezone: yup
          .object({
            value: yup.string(),
            label: yup.string(),
          })
          .nullable()
          .required('Timezone is required'),
      }),
    }),
  }),

  // country_code: yup
  //   .object({
  //     value: yup.string(),
  //     label: yup.string(),
  //   })
  //   .nullable()
  //   .required('Country is required'),
  // timezone: yup
  //   .object({
  //     value: yup.string().required('Timezone is required'),
  //     label: yup.string(),
  //   })
  //   .nullable()
  //   .when('country_code', {
  //     is: (val: any) => !!val && !!val.value,
  //     then: (schema) =>
  //       schema
  //         .shape({
  //           value: yup.string().required('Timezone is required'),
  //           label: yup.string(),
  //         })
  //         .required('Timezone is required'),
  //     otherwise: (schema) => schema.nullable(),
  //   }),
});
export const SCHEDULEMEETING = {
  event: 'event',
  task: 'task',
  edit: 'edit',
  create: 'create',
};
export type ActionType = typeof SCHEDULEMEETING.edit | typeof SCHEDULEMEETING.create;
export type CategoryType = (typeof SCHEDULEMEETING)[keyof typeof SCHEDULEMEETING];

export const deleteMessages: Record<string, string> = {
  event: 'Meeting deleted successfully',
  task: 'Task deleted successfully',
};

export const createUpdateMessages: Record<ActionType, Record<CategoryType, string>> = {
  edit: {
    event: 'Meeting updated successfully',
    task: 'Task updated successfully',
  },
  create: {
    event: 'Meeting scheduled successfully',
    task: 'Task created successfully',
  },
};

export const colors = [
  {
    id: '1',
    color: '#ffffff',
    bgColor: '#F4696A',
    dragBgColor: '#F4696A',
    borderColor: '#F4696A',
  },
  {
    id: '2',
    color: '#ffffff',
    bgColor: '#00a9ff',
    dragBgColor: '#00a9ff',
    borderColor: '#00a9ff',
  },
  {
    id: '3',
    color: '#ffffff',
    bgColor: '#34C38F',
    dragBgColor: '#34C38F',
    borderColor: '#34C38F',
  },
  {
    id: '4',
    color: '#ffffff',
    bgColor: '#A78BFA',
    dragBgColor: '#A78BFA',
    borderColor: '#A78BFA',
  },
];
export type calendarFilterType = 'ALL' | 'EVENT' | 'TASK';

export interface ScheduleEventModalProps {
  schedule: any;
  startDate: TZDate;
  handleClose: () => void;
  isEdit: boolean;
  category: string;
  defaultTopic?: string;
  defaultDescription?: string;
  source?: string;
  openInvite?: boolean;
  currentChat?: any;
  msgObj?: any;
}
type TriggerEventName = 'mouseup' | 'click' | string;
export type ExtendedEvent = any & {
  triggerEventName?: TriggerEventName;
};

export const calendars = [
  {
    id: '1',
    name: 'ALL',
  },
  {
    id: '2',
    name: 'EVENT',
  },
  {
    id: '3',
    name: 'TASK',
  },
  {
    id: '4',
    name: 'MEETING',
  },
];
interface MeetingMember {
  email: string;
  [key: string]: any;
}

export interface MeetingRawData {
  _id: string;
  meetingId: string;
  name: string;
  startTimeLocal: string;
  endTimeLocal: string;
  assignTo: MeetingMember[];
  [key: string]: any;
}

export interface Schedule {
  id: string;
  calendarId: string;
  category: string;
  title: string;
  start: Date;
  end: Date;
  body: string;
  isVisible: boolean;
  attendees: string[];
  raw: Record<string, any>;
}
/* Category → colour id, resolved against `colors` below.
   2 = blue, 3 = green, 4 = violet. */
export const findColors = {
  EVENT: '2',
  TASK: '3',
  MEETING: '4',
};

export const reminderModeSelectOption = [
  {
    label: 'Email',
    value: 'EMAIL',
  },
  {
    label: 'Notification',
    value: 'NOTIFICATION',
  },
];

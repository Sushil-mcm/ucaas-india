import * as yup from 'yup';

export const AUTO_DIALER_SCHEMA = yup.object().shape({
  name: yup.string().required('Campaign Name is required'),
  siteId: yup.mixed().required('Site is required'),
  timezone: yup.mixed().required('Timezone is required'),
  startDate: yup.date().required('Start date is required'),
  endDate: yup.date().required('End date is required'),
  startTime: yup.string().required('Start time is required'),
  endTime: yup.string().required('End time is required'),
  dialMethod: yup.string().required('Dial method is required'),
  setting: yup.object().shape({
    ring_time: yup
      .mixed()
      .required('Ring time is required')
      .transform((value, originalValue) => {
        return originalValue === '' ? null : value;
      }),

    max_attempt: yup
      .mixed()
      .required('Max attempts is required')
      .transform((value, originalValue) => {
        return originalValue === '' ? null : value;
      }),
    retry_after: yup
      .mixed()
      .required('Retry after is required')
      .transform((value, originalValue) => {
        return originalValue === '' ? null : value;
      }),
    call_per_second: yup
      .number()
      .transform((value) => (isNaN(value) || value === null || value === undefined ? 0 : value))
      .when('dialMethod', (dialMethod: Array<string>, schema) => {
        if (dialMethod.length) {
          if (dialMethod[0] === '1') {
            return schema
              .min(1, 'min value can be is 1')
              .max(100, 'max value can be 100')
              .required('this field is required');
          } else if (dialMethod[0] === '2') {
            return schema
              .min(1, 'min value can be is 1')
              .max(10, 'max value can be 10')
              .required('this field is required');
          }
        }
        return schema;
      }),
  }),
  groupId: yup.array().min(1, 'Select atleast 1 lead'),

  callerId: yup.array().min(1, 'Select atleast 1 caller ID'),
  daysToRun: yup.array().min(1, 'Select atleast 1 day'),
  forwardToId: yup.mixed().when('dialMethod', (dialMethod: Array<string>, schema) => {
    if (dialMethod[0] === '1') {
      if (dialMethod[0] === '1') {
        return schema.required('message');
      } else if (dialMethod[0] === '2') {
        return schema.required('queue');
      }
    }
    return schema;
  }),
  action: yup.string().optional(),
  voicemail: yup
    .mixed()
    .nullable()
    .when('action', {
      is: 'DROP_VOICEMAIL',
      then: (schema) => schema.required('Voicemail message field is required'),
      otherwise: (schema) => schema.optional(),
    }),
});

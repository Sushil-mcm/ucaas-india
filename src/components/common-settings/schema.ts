import { FORWARD_TYPES } from '@/constants/forwarding-consts';
import { holidaySchema } from '@/pages/admin-settings/users/constants';
import * as yup from 'yup';

export const COMMON_SETTINGS_SCHEMA = yup.object().shape({
  settings: yup.object().shape({
    operational_hours: yup.object().shape({
      type: yup.string().required(),
      value: yup.mixed(),
      holidays: yup.array().of(holidaySchema),
      closed_hour_action: yup.object().shape({
        value: yup.object().shape({
          value: yup.string().when(['$schemaContext', '$activeTab'], {
            is: (schema: any) => {
              const isWeekly = schema?.settings?.operational_hours?.type === 'weekly';
              if (!isWeekly) return false;
              const closedHoursAction = schema?.settings?.operational_hours?.closed_hour_action;
              const forwardType = closedHoursAction?.type?.value;
              if (forwardType === FORWARD_TYPES.VOICEMAIL) return !closedHoursAction?.personal;
              if (forwardType === 'HANGUP') return false;
              return true;
            },
            then: (schema) =>
              schema
                .required('Forward value is required')
                .test('phone-length', 'Phone number must be at least 8 digits', function (value) {
                  const schemaContext = this.options.context?.schemaContext;
                  const closedHoursAction =
                    schemaContext?.settings?.operational_hours?.closed_hour_action;
                  const forwardType = closedHoursAction?.type?.value;
                  if (forwardType === 'PHONE' && value && value.replace(/\D/g, '').length < 8) {
                    return false;
                  }
                  return true;
                }),
            otherwise: (schema) => schema.notRequired(),
          }),
        }),
      }),
      regional: yup.object().shape({
        override: yup.boolean(),
        country_code: yup.object().shape({
          value: yup.string().required('Country code is required'),
        }),
        timezone: yup.object().shape({
          value: yup.string().required('Timezone is required'),
        }),
        country: yup.object().shape({
          value: yup.string().required('Country is required'),
        }),
      }),
    }),
    display_number: yup.object().shape({
      masking: yup.object().shape({
        value: yup.string().when('$schemaContext', {
          is: (schema: any) => {
            return (
              schema?.settings?.display_number?.masking?.type?.value &&
              schema?.settings?.display_number?.masking?.type?.value !== 'N' &&
              schema?.settings?.display_number?.incoming?.value
            );
          },
          then: () => yup.string().required('Masking value is required'),
          otherwise: () => yup.string().notRequired(),
        }),
      }),
    }),
  }),
});

import * as yup from 'yup';
import { ADD_TEMPLATE_INITIAL, TAB_CONSTANT } from './constants';
import { requiredString } from '@/lib/schema';
import { holidaySchema } from '@/pages/admin-settings/constants';
import { FORWARD_TYPES } from '@/constants/forwarding-consts';

export const UPSERT_TEMPLATE_SCHEMA: Record<string, yup.ObjectSchema<any>> = {
  [TAB_CONSTANT.SETTING_PERMISSIONS]: yup.object({
    name: requiredString('Name'),
    settings: yup.object({
      role: yup.object({
        value: yup.string().optional(),
      }),
      operational_hours: yup.object().shape({
        holidays: yup.array().of(holidaySchema),
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
      }),
      display_number: yup.object().shape({
        masking: yup.object().shape({
          // value: yup.string().when('$schemaContext', {
          // is: (schema: any) => {
          //   return (
          //     schema?.settings?.display_number?.masking?.type?.value &&
          //     schema?.settings?.display_number?.masking?.type?.value !== 'N' &&
          //     schema?.settings?.display_number?.incoming?.value
          //   );
          // },
          // then: () => yup.string().required('Masking value is required'),
          // otherwise: () => yup.string().notRequired(),
          value: yup.string().when('type', {
            is: (type: any) => type && type.value && type.value !== 'N',
            then: (schema) => schema.required('Masking value is required'),
            otherwise: (schema) => schema.notRequired(),
          }),
        }),
      }),
    }),
  }) as yup.ObjectSchema<any>,

  [TAB_CONSTANT.GREETING_NOTIFICATION]: yup.object({
    greetings: yup.object({
      welcome_greeting: yup.object({
        value: yup.object({
          value: yup.string().when('$schemaContext', {
            is: (schema: typeof ADD_TEMPLATE_INITIAL) =>
              schema?.greetings?.welcome_greeting?.enabled,
            then: () => yup.string().required('Welcome greeting is required'),
            otherwise: () => yup.string().notRequired(),
          }),
        }),
      }),
      voicemail: yup.object({
        value: yup.object({
          value: yup.string().when('$schemaContext', {
            is: (schema: typeof ADD_TEMPLATE_INITIAL) => schema?.greetings?.voicemail?.enabled,
            then: () => yup.string().required('Voicemail message is required'),
            otherwise: () => yup.string().notRequired(),
          }),
        }),
      }),
      ring_tone: yup.object({
        value: yup.object({
          value: yup.string().when('$schemaContext', {
            is: (schema: typeof ADD_TEMPLATE_INITIAL) => schema?.greetings?.ring_tone?.enabled,
            then: () => yup.string().required('Ringtone message is required'),
            otherwise: () => yup.string().notRequired(),
          }),
        }),
      }),
      on_hold_music: yup.object({
        value: yup.object({
          value: yup.string().when('$schemaContext', {
            is: (schema: typeof ADD_TEMPLATE_INITIAL) => schema?.greetings?.on_hold_music?.enabled,
            then: () => yup.string().required('On hold music is required'),
            otherwise: () => yup.string().notRequired(),
          }),
        }),
      }),
    }),
  }) as yup.ObjectSchema<any>,
};

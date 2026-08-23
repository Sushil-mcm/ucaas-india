import * as yup from 'yup';
import { FORWARD_TYPES } from '@/constants/forwarding-consts';
import { FORWARDING_TAB_CONSTANT, holidaySchema, UPDATE_FORWARDING_INITIAL } from '../../constants';
import { requiredString } from '@/lib/schema';

const greetingSelectionSchema = (requiredMessage: string) =>
  yup.object().shape({
    enabled: yup.boolean(),
    value: yup
      .object()
      .shape({
        label: yup.string().optional(),
        value: yup.string().optional(),
      })
      .default({})
      .when('enabled', {
        is: true,
        then: (schema) =>
          schema.shape({
            value: yup.string().required(requiredMessage),
          }),
      }),
  });

export const upsertUserSettingsSchema: Record<string, yup.ObjectSchema<any>> = {
  [FORWARDING_TAB_CONSTANT.BASIC_INFORMATION]: yup.object().shape({
    basic: yup.object().shape({
      first_name: requiredString('First name', 2, 50),
      last_name: requiredString('Last name', 2, 50),
    }),
  }),

  [FORWARDING_TAB_CONSTANT.SETTING_PERMISSIONS]: yup.object().shape({
    settings: yup.object().shape({
      role: yup.object().shape({
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
          value: yup.string().when('type', {
            is: (type: any) => type && type.value && type.value !== 'N',
            then: (schema) => schema.required('Masking value is required'),
            otherwise: (schema) => schema.notRequired(),
            //    value: yup.string().when('$schemaContext', {
            // is: (schema: any) => {
            //   return (
            //     schema?.settings?.display_number?.masking?.type?.value &&
            //     schema?.settings?.display_number?.masking?.type?.value !== 'N' &&
            //     schema?.settings?.display_number?.incoming?.value
            //   );
            // },
            // then: () => yup.string().required('Masking value is required'),
            // otherwise: () => yup.string().notRequired(),
          }),
        }),
      }),
    }),
  }),

  [FORWARDING_TAB_CONSTANT.GREETING_NOTIFICATION]: yup.object().shape({
    greetings: yup.object().shape({
      welcome_greeting: greetingSelectionSchema('Welcome greeting is required'),
      voicemail: greetingSelectionSchema('Voicemail message is required'),
      ring_tone: greetingSelectionSchema('Ringtone message is required'),
      on_hold_music: greetingSelectionSchema('On hold music is required'),
    }),
  }),

  [FORWARDING_TAB_CONSTANT.CALL_RULES]: yup.object().shape({
    callRules: yup.object().shape({
      forwardCall: yup.object().shape({
        enabled: yup.boolean().optional(),
        type: yup.object().shape({
          value: yup.string().when('enabled', {
            is: true,
            then: (schema) => schema.required('Forward type is required'),
            otherwise: (schema) => schema.notRequired(),
          }),
        }),
        value: yup.object().shape({
          value: yup.string().when(['$schemaContext', '$activeTab'], {
            is: (schema: typeof UPDATE_FORWARDING_INITIAL, activeTab: string) => {
              const forwardCall = schema?.callRules?.forwardCall;
              const enabled = forwardCall?.enabled;
              if (!enabled || activeTab !== FORWARDING_TAB_CONSTANT.CALL_RULES) return false;
              const forwardType = forwardCall?.type?.value;
              if (forwardType === FORWARD_TYPES.VOICEMAIL) return !forwardCall?.personal;
              return forwardType !== 'HANGUP';
            },
            then: (schema) =>
              schema
                .required('Forward value is required')
                .test('phone-length', 'Phone number must be at least 8 digits', function (value) {
                  const schemaContext = this.options.context?.schemaContext;
                  const forwardCall = schemaContext?.callRules?.forwardCall;
                  const forwardType = forwardCall?.type?.value;
                  if (forwardType === 'PHONE' && value && value.replace(/\D/g, '').length < 8) {
                    return false;
                  }
                  return true;
                }),
            otherwise: (schema) => schema.notRequired(),
          }),
        }),
      }),

      failureAction: yup.object().shape({
        value: yup.object().shape({
          value: yup.string().when(['$schemaContext', '$activeTab'], {
            is: (schema: typeof UPDATE_FORWARDING_INITIAL) => {
              const failureAction = schema?.callRules?.failureAction;
              const forwardType = failureAction?.type?.value;
              if (forwardType === FORWARD_TYPES.VOICEMAIL) return !failureAction?.personal;
              if (forwardType === 'HANGUP') return false;
              return true;
            },
            then: (schema) =>
              schema
                .required('Forward value is required')
                .test('phone-length', 'Phone number must be at least 8 digits', function (value) {
                  const schemaContext = this.options.context?.schemaContext;
                  const failureAction = schemaContext?.callRules?.failureAction;
                  const forwardType = failureAction?.type?.value;
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
  }),
};

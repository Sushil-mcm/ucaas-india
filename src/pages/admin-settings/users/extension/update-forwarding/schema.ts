import * as yup from 'yup';
import { FORWARD_TYPES } from '@/constants/forwarding-consts';
import { FORWARDING_TAB_CONSTANT, holidaySchema, UPDATE_FORWARDING_INITIAL } from '../../constants';
import { requiredString } from '@/lib/schema';

/* A setting the company has locked is greyed out on the person's own settings page,
   so requiring a value in it would be asking for something they have no way to give:
   the form would fail validation for ever on a control they cannot open. The screen
   passes the locked settings in as `lockedFields`; screens with no company rule pass
   nothing, so every field there stays required exactly as it was. */
const isLockedByCompany = (lockedFields: unknown, field: string): boolean =>
  Array.isArray(lockedFields) && lockedFields.includes(field);

const requiredUnlessLocked = (field: string, message: string) =>
  yup.string().when('$lockedFields', {
    is: (lockedFields: unknown) => isLockedByCompany(lockedFields, field),
    then: (schema) => schema.notRequired(),
    otherwise: (schema) => schema.required(message),
  });

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
            value: requiredUnlessLocked('regional', 'Country code is required'),
          }),
          timezone: yup.object().shape({
            value: requiredUnlessLocked('regional', 'Timezone is required'),
          }),
          country: yup.object().shape({
            value: requiredUnlessLocked('regional', 'Country is required'),
          }),
        }),
        closed_hour_action: yup.object().shape({
          value: yup.object().shape({
            /* `$activeTab` was listed here but never read — the test below only ever
               used the first value — so it is replaced by the one this needs. */
            value: yup.string().when(['$schemaContext', '$lockedFields'], {
              is: (schema: any, lockedFields: unknown) => {
                /* Business hours carries the closed-hours action, so when the company
                   locks the hours this cannot be filled in either. */
                if (isLockedByCompany(lockedFields, 'business_hours')) return false;
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
          value: yup.string().when(['type', '$lockedFields'], {
            is: (type: any, lockedFields: unknown) =>
              !isLockedByCompany(lockedFields, 'display_number') &&
              type &&
              type.value &&
              type.value !== 'N',
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

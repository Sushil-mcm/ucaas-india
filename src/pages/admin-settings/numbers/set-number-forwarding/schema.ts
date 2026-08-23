import { FORWARD_TYPES } from '@/constants/forwarding-consts';
import { requiredString } from '@/lib/schema';
import * as yup from 'yup';
import { holidaySchema } from '../../users/constants';

const stringOptional = () => yup.string().optional();
export const scheduleValidation = yup.object().shape({
  open: yup.boolean(),
  start: yup.string().when('open', {
    is: true,
    then: () => yup.string().required('Start time is required'),
    otherwise: stringOptional,
  }),
  end: yup.string().when('open', {
    is: true,
    then: () => yup.string().required('End time is required'),
    otherwise: stringOptional,
  }),
});

export const callForwardingSchema = [
  yup.object().shape({
    did_info: yup.object().shape({
      did_name: yup
        .string()
        .required('DID name is required.')
        .min(2, 'DID name must be at least 2 characters.')
        .max(50, 'DID name cannot exceed 50 characters.'),

      site: yup.object().shape({
        value: yup.string().required('Site is required'),
      }),
    }),
  }),
  yup.object().shape({
    settings: yup.object().shape({
      templateName: yup.string().when('$forwardingType', {
        is: 'UPSERT_TEMPLATE',
        then: () => requiredString('Template name'),
        otherwise: stringOptional,
      }),
      callerId: yup.object({
        enabled: yup.boolean().required(),
        value: yup
          .array()
          .of(yup.string().required())
          .when('enabled', {
            is: true,
            then: (schema) => schema.min(1, 'At least one value is required'),
            otherwise: (schema) => schema.notRequired(),
          }),
      }),
      operational_hours: yup.object().shape({
        type: yup.string().required(),
        value: yup.mixed(),
        holidays: yup.array().of(holidaySchema),
        closed_hour_action: yup.object().shape({
          value: yup.object().shape({
            value: yup.string().when(['$validationContext', '$activeTab'], {
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
                    const validationContext = this.options.context?.validationContext;
                    const closedHoursAction =
                      validationContext?.settings?.operational_hours?.closed_hour_action;
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
          value: yup.string().when('$validationContext', {
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
  }),
  yup.object().shape({
    callHandling: yup.object().shape({
      businessHours: yup.object().shape({
        // ai_forward_to: yup.object().shape({
        //   value: yup.object().shape({
        //     value: yup.string().when(['$validationContext'], {
        //       is: (validationContext: any) =>
        //         validationContext?.callHandling?.businessHours?.ai_forward_to?.type?.value !== 'HANGUP',
        //       then: () => yup.string().required('Forward value is required'),
        //       otherwise: stringOptional,
        //     }),
        //   }),
        // }),
        forwardValue: yup.object({
          value: yup.string().when(['$validationContext'], {
            is: (validationContext: any) =>
              validationContext?.callHandling?.businessHours?.forwardType !== 'HANGUP',
            then: () =>
              yup
                .string()
                .required('Forward value is required')
                .test('phone-length', 'Phone number must be at least 8 digits', function (value) {
                  const validationContext = this.options.context?.validationContext;
                  const businessHours = validationContext?.callHandling?.businessHours;
                  const forwardType = businessHours?.forwardType;
                  if (forwardType === 'PHONE' && value && value.replace(/\D/g, '').length < 8) {
                    return false;
                  }
                  return true;
                }),
            otherwise: stringOptional,
          }),
        }),
      }),
    }),
  }),
  yup.object().shape({
    media: yup.object({
      welcome: yup.object({
        value: yup.object({
          value: yup.string().when('$validationContext', {
            is: (validationContext: any) => validationContext?.media?.welcome?.enabled,
            then: () => yup.string().required('Welcome message is required'),
            otherwise: stringOptional,
          }),
        }),
      }),
      hold: yup.object({
        value: yup.object({
          value: yup.string().when('$validationContext', {
            is: (validationContext: any) => validationContext?.media?.hold?.enabled,
            then: () => yup.string().required('On hold message is required'),
            otherwise: stringOptional,
          }),
        }),
      }),
      // voicemail: yup.object({
      //   value: yup.object({
      //     value: yup.string().when("$validationContext", {
      //       is: (validationContext: any) =>
      //         validationContext?.media?.voicemail?.enabled,
      //       then: () => yup.string().required("Voicemail message is required"),
      //       otherwise: stringOptional,
      //     }),
      //   }),
      // }),
    }),
  }),
  yup.object().shape({}),
];

import { FORWARD_TYPES } from '@/constants/forwarding-consts';
import * as yup from 'yup';

export const phoneSettingsSchema = yup.object().shape({
  callRules: yup.object().shape({
    forwardCall: yup.object().shape({
      type: yup.object().shape({
        value: yup.string().required('Forward type is required'),
      }),
      value: yup.object().shape({
        value: yup.string().when(['$schemaContext'], {
          is: (schema: any) => {
            const forwardCall = schema?.callRules?.forwardCall;
            const forwardType = forwardCall?.type?.value;
            if (forwardType === FORWARD_TYPES.VOICEMAIL) {
              return !forwardCall?.personal;
            }
            if (forwardType === 'HANGUP') {
              return false;
            }
            return true;
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
        value: yup.string().when(['$schemaContext', '$tabName'], {
          is: (schema: any) => {
            const failureAction = schema?.callRules?.failureAction;
            const forwardType = failureAction?.type?.value;
            if (forwardType === FORWARD_TYPES.VOICEMAIL) {
              return !failureAction?.personal;
            }
            if (forwardType === 'HANGUP') {
              return false;
            }
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
    closedHoursAction: yup.object().shape({
      value: yup.object().shape({
        value: yup.string().when(['$schemaContext', '$tabName'], {
          is: (schema: any) => {
            const isWeeklySchedule = schema?.settings?.operational_hours?.type === 'weekly';
            if (!isWeeklySchedule) return false;
            const closedHoursAction = schema?.callRules?.closedHoursAction;
            const forwardType = closedHoursAction?.type?.value;
            if (forwardType === FORWARD_TYPES.VOICEMAIL) {
              return !closedHoursAction?.personal;
            }
            if (forwardType === 'HANGUP') {
              return false;
            }
            return true;
          },
          then: (schema) =>
            schema
              .required('Forward value is required')
              .test('phone-length', 'Phone number must be at least 8 digits', function (value) {
                const schemaContext = this.options.context?.schemaContext;
                const closedHoursAction = schemaContext?.callRules?.closedHoursAction;
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
});

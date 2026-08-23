import { COMMON_SETTINGS_SCHEMA } from '@/components/common-settings/schema';
import { requiredExtension } from '@/schema/common';
import * as yup from 'yup';
import { IVR_TAB_CONSTANT } from './constants';

const NO_VALUE_FORWARD_TYPES = ['HANGUP'] as const;
const requiresForwardValue = (forwardType?: string) =>
  Boolean(forwardType) &&
  !NO_VALUE_FORWARD_TYPES.includes(forwardType as (typeof NO_VALUE_FORWARD_TYPES)[number]);

export const upsertIVRSchemaValidation = {
  [IVR_TAB_CONSTANT.BASIC_INFORMATION]: yup.object().shape({
    name: yup
      .string()
      .required('IVR name is required')
      .min(2, 'IVR name must be at least 2 characters.')
      .max(50, 'IVR name cannot exceed 50 characters.')
      .matches(/^\S.*\S$|^\S$/, 'Spaces not allowed'),

    extension: requiredExtension(),
    description: yup
      .string()
      .max(500, 'Description cannot exceed 500 characters.')
      .optional()
      .nullable(),
    // language: yup.object().shape({
    //   value: yup.string().required('Language is required')
    // }),
    site: yup
      .mixed()
      .test(
        'required',
        'Site is required',
        (v: any) => v && (typeof v === 'string' ? v.trim() : v?.value?.trim()),
      ),
  }),
  [IVR_TAB_CONSTANT.SETTING_PERMISSIONS]: COMMON_SETTINGS_SCHEMA,

  [IVR_TAB_CONSTANT.GREETING_NOTIFICATION]: yup.object().shape({
    greetings: yup.object().shape({
      menu: yup.object().shape({
        value: yup.object().shape({
          value: yup.string().required('Menu IVR Greeting is required'),
        }),
      }),
      welcome: yup.object().shape({
        value: yup.object().shape({
          value: yup.string().when('$validationContext', {
            is: (validationContext: any) => validationContext?.fields?.greetings?.welcome?.enabled,
            then: () => yup.string().required('Welcome IVR greeting is required'),
            otherwise: () => yup.string().notRequired(),
          }),
        }),
      }),
      invalid: yup.object().shape({
        value: yup.object().shape({
          value: yup.string().when('$validationContext', {
            is: (validationContext: any) => validationContext?.fields?.greetings?.invalid?.enabled,
            then: () => yup.string().required('Invalid IVR greeting is required'),
            otherwise: () => yup.string().notRequired(),
          }),
        }),
      }),
    }),
  }),

  [IVR_TAB_CONSTANT.KEY_PRESSES]: yup.object().shape({
    ivrActions: yup
      .array()
      .of(
        yup.object().shape({
          key: yup.object().shape({
            value: yup.string().required('Key is required'),
          }),
          forwardType: yup.object().shape({
            value: yup.string().required('Action is required'),
          }),
          forwardValue: yup
            .object()
            .shape({
              value: yup.string().nullable(), // initially allow null or empty
            })
            .test('conditional-forward-value', 'Value is required', function (_, context) {
              const parent = context?.from?.[1]?.value ?? {};
              const forwardType = parent?.forwardType?.value;
              const forwardValue = parent?.forwardValue?.value;
              if (requiresForwardValue(forwardType) && !forwardValue) {
                return this.createError({
                  path: `${this.path}.value`,
                  message: 'Value is required',
                });
              }

              return true;
            }),
        }),
      )
      .required('IVR options is required'),

    generic: yup.object().shape({
      timeout_action: yup.object().shape({
        value: yup.object().shape({
          value: yup.string().when('$validationContext', {
            is: (schema: any) => {
              const timeoutAction = schema?.fields?.generic?.timeout_action;
              if (
                timeoutAction?.status === 'EXTENSION' &&
                requiresForwardValue(timeoutAction?.type?.value)
              ) {
                return true;
              }
              return false;
            },
            then: () => yup.string().required('Forward value is required'),
            otherwise: () => yup.string().notRequired(),
          }),
        }),
      }),
      failure_action: yup.object().shape({
        value: yup.object().shape({
          value: yup.string().when('$validationContext', {
            is: (schema: any) => {
              const failureAction = schema?.fields?.generic?.failure_action;
              if (
                failureAction?.status === 'EXTENSION' &&
                requiresForwardValue(failureAction?.type?.value)
              ) {
                return true;
              }
              return false;
            },
            then: () => yup.string().required('Forward value is required'),
            otherwise: () => yup.string().notRequired(),
          }),
        }),
      }),
    }),
  }),
};

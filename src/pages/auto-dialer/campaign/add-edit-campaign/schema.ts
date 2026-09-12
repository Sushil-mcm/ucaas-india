import * as yup from 'yup';
import { TIMER_RANGES } from '@/lib/campaign-timers';
import { CAMPAIGN_UPSERT_TAB_CONSTANT } from '../const';
import { requiredString } from '@/lib/schema';

export const CAMPAIGN_SCEHAM: any = {
  [CAMPAIGN_UPSERT_TAB_CONSTANT.BASIC_INFORMATION]: yup.object().shape({
    name: requiredString('First name', 2, 50),
    siteId: yup.object().shape({
      value: yup.string().required('Site is required'),
    }),
    description: yup.string().max(500, 'Description cannot be more than 500 characters').optional(),
    callerId: yup.array().min(1, 'Choose the number the customer will see'),
    groupId: yup.array().when('$schemaContext', {
      is: (ctx: any) => ctx?.dialMethod === 'INBOUND',
      then: (schema) => schema.optional(),
      otherwise: (schema) => schema.min(1, 'Choose at least one lead group to call'),
    }),
  }),

  [CAMPAIGN_UPSERT_TAB_CONSTANT.SETTING_PERMISSION]: yup.object().shape({
    startDate: yup.string().required('Start date is required'),
    endDate: yup.string().required('End date is required'),
    settings: yup.object().shape({
      operational_hours: yup.object().shape({
        value: yup.mixed(),
        holidays: yup.array().optional(),
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
  }),

  [CAMPAIGN_UPSERT_TAB_CONSTANT.SETTING]: yup.object().shape({
    dialerSetting: yup.object().shape({
      /* The same ranges the server refuses outside of (campaign-api Joi);
         both read src/lib/campaign-timers.ts on this side. A blank field is
         refused here rather than silently becoming the default. */
      preview_time: yup
        .number()
        .transform((value, originalValue) => (originalValue === '' ? undefined : value))
        .integer('Preview time must be whole seconds')
        .min(TIMER_RANGES.preview_time.min, `Preview time must be at least ${TIMER_RANGES.preview_time.min} seconds`)
        .max(TIMER_RANGES.preview_time.max, `Preview time can be at most ${TIMER_RANGES.preview_time.max} seconds`)
        .required('Preview time is required'),
      ringing_agent_time: yup.number().optional(),
      wrapup_time: yup
        .number()
        .transform((value, originalValue) => (originalValue === '' ? undefined : value))
        .integer('Wrap-up time must be whole seconds')
        .min(TIMER_RANGES.wrapup_time.min, `Wrap-up time must be at least ${TIMER_RANGES.wrapup_time.min} seconds`)
        .max(TIMER_RANGES.wrapup_time.max, `Wrap-up time can be at most ${TIMER_RANGES.wrapup_time.max} seconds`)
        .required('Wrap-up time is required'),
      wait_after_call: yup
        .number()
        .transform((value, originalValue) => (originalValue === '' ? undefined : value))
        .integer('Wait after a call must be whole seconds')
        .min(TIMER_RANGES.wait_after_call.min, `Wait after a call cannot be negative`)
        .max(TIMER_RANGES.wait_after_call.max, `Wait after a call can be at most ${TIMER_RANGES.wait_after_call.max} seconds`)
        .required('Wait after a call is required'),
      max_ring_time: yup.number().optional(),
      // max_attempt: yup.number().required('Max attempts is required'),
      max_attempt_per_record: yup.number().required('Max attempts per record  is required'),
      default_retry_period: yup
        .number()
        .transform((value, originalValue) => (originalValue === '' ? undefined : value))
        .required('Default retry period is required')
        /* The dialer accepts one unit and up. This floor used to be three, which
           refused a one- or two-minute retry the backend was happy to take. */
        .min(1, 'Minimum value is 1')
        .max(30, 'Maximum value is 30'),
      default_retry_period_type: yup.object().shape({
        value: yup.string().required('Default retry period type is required'),
      }),
      max_lines: yup
        .number()
        .transform((value, originalValue) => (originalValue === '' || originalValue === null ? 0 : value))
        .min(0, 'Cannot be negative')
        .max(500, 'Maximum is 500')
        .optional(),
      max_calls_per_agent: yup
        .number()
        .transform((value, originalValue) => (originalValue === '' || originalValue === null ? 3 : value))
        .min(1, 'At least 1 call per agent')
        .max(15, 'Maximum is 15')
        .optional(),
      target_abandon_rate: yup
        .number()
        .transform((value, originalValue) => (originalValue === '' || originalValue === null ? 3 : value))
        .min(0.1, 'Minimum is 0.1%')
        /* 3% is the cap in every country we have checked; the PERIOD it is
           measured over is what differs, so this message no longer states one. */
        .max(3, 'The cap cannot be above 3%')
        .optional(),
      compliance_abandon_seconds: yup
        .number()
        .transform((value, originalValue) => (originalValue === '' || originalValue === null ? 2 : value))
        .min(0, 'Cannot be negative')
        .max(60, 'Maximum is 60 seconds')
        .optional(),
      answering_detection_machine: yup.object().shape({
        enabled: yup.boolean().optional(),
        type: yup.string().optional(),
        value: yup.object().shape({
          value: yup.string().optional(),
        }),
      }),
      auto_answering: yup.object().shape({
        enabled: yup.boolean().optional(),
        timeout: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? 2 : value,
          )
          .min(2, 'Minimum is 2 seconds')
          .max(30, 'Maximum is 30 seconds')
          .optional(),
      }),
    }),
    agentDisposition: yup
      .array()
      .of(
        yup.object().shape({
          _id: yup.string().required('Key is required'),
          disposition: yup.object().shape({
            name: yup.string().required('Name is required'),
            description: yup
              .string()
              .max(500, 'Description cannot be more than 500 characters')
              .optional(),
          }),
        }),
      )
      .min(1, 'Pick at least one outcome the agent can choose after a call (Calling rules step)'),
  }),

  [CAMPAIGN_UPSERT_TAB_CONSTANT.AGENTS]: yup.object().shape({
    members: yup
      .array()
      .of(
        yup.object({
          value: yup.string().trim().required('Member is required'),
        }),
      )
      .min(1, 'Add at least one person to the team'),
    allowSkipping: yup.boolean(),
    /* Who on the team may take these calls: one requirement row per skill
       category, the same shape a call queue stores under settings.routing.
       Rows are normalised on the way out (src/lib/queue-requirements.ts), so
       a half-made row can never fail the save; nothing here is required. */
    routing: yup
      .object()
      .shape({
        requirements: yup.array().optional(),
        order: yup.mixed().optional(),
        required_skills: yup.array().optional(),
        min_stars: yup.number().min(1).max(5).optional(),
        evaluation: yup.mixed().optional(),
      })
      .optional(),
    agentScripting: yup.boolean(),
    script: yup.object().shape({
      value: yup.string().when('$schemaContext', {
        is: (schema: any) => {
          return schema?.agentScripting;
        },
        then: (schema) => schema.required('Script is required'),
        otherwise: (schema) => schema.optional(),
      }),
    }),
  }),
  [CAMPAIGN_UPSERT_TAB_CONSTANT.INBOUND]: yup.object().shape({
    greetings: yup.object().shape({
      welcome: yup.object().shape({
        value: yup.object().shape({
          value: yup.string().when('$schemaContext', {
            is: (schema: any) => schema?.greetings?.welcome?.enabled,
            then: () => yup.string().required('Choose the greeting callers hear, or switch it off'),
            otherwise: () => yup.string().notRequired(),
          }),
        }),
      }),
      hold: yup.object().shape({
        value: yup.object().shape({
          value: yup.string().when('$schemaContext', {
            is: (schema: any) => schema?.greetings?.hold?.enabled,
            then: () => yup.string().required('Choose the hold music, or switch it off'),
            otherwise: () => yup.string().notRequired(),
          }),
        }),
      }),
    }),
  }),
  [CAMPAIGN_UPSERT_TAB_CONSTANT.REVIEW]: yup.object().shape({}),
};

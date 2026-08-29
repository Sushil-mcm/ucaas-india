import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IVR_PATH,
  IVR_DEFAULT_TAB,
  ivrSlugFromTab,
  ivrTabFromSlug,
} from '../ivr-tabs';
import { Button } from '@/components/ui/button';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import {
  INITIAL_IVR_MENU_VLAUES,
  IVR_ERROR_TYPES_MESSAGES,
  IVR_RETRY_DEFAULTS,
  IVR_TAB_CONSTANT,
} from '../constants';
import IvrBasicInfo from './basic-info';
import { upsertIVRSchemaValidation } from '../schema';
import IvrKeyPresses from './key-presses';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertIVR } from '@/services/api';
import { getHolidaysFormVal, getHolidaysPayload, getObjectLength, handleAlert } from '@/lib/utils';
import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/pages/admin-settings/numbers/set-number-forwarding/constants';
import CommonSettingPermission from '@/components/common-settings';
import Media from './media';
import { Tabs } from '@radix-ui/react-tabs';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ERROR_TYPES } from '@/pages/admin-settings/constants';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { useUser } from '@/hooks/use-user';
interface AddEditIvrProps {
  drawerState: boolean;
  setDrawerState: (state: boolean) => void;
  initialData?: Record<string, unknown> | null;
  /** The tab from the URL. Absent while creating, where the wizard gates forward steps. */
  tabSlug?: string;
}

/** Inputs give us strings; fall back to the historical default if unusable. */
const toRetryNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
};

const TABS_ORDER = [
  IVR_TAB_CONSTANT.BASIC_INFORMATION,
  IVR_TAB_CONSTANT.SETTING_PERMISSIONS,
  IVR_TAB_CONSTANT.GREETING_NOTIFICATION,
  IVR_TAB_CONSTANT.KEY_PRESSES,
];

const STEP_COMPONENTS: Record<string, FC<{ initialData?: any; isChooseTemplate?: boolean }>> = {
  [IVR_TAB_CONSTANT.BASIC_INFORMATION]: IvrBasicInfo,
  [IVR_TAB_CONSTANT.SETTING_PERMISSIONS]: CommonSettingPermission,
  [IVR_TAB_CONSTANT.GREETING_NOTIFICATION]: Media,
  [IVR_TAB_CONSTANT.KEY_PRESSES]: IvrKeyPresses,
};

const AddEditIvrMenu: FC<AddEditIvrProps> = ({ setDrawerState, initialData = null, tabSlug }) => {
  const navigate = useNavigate();
  const isEditMode = Boolean(initialData?.uuid);

  /* Editing reads the tab from the URL so it can be linked and reloaded.
     Creating keeps it in state: the create flow refuses to move forward until
     the current tab validates, and a URL would be an open door past that. */
  const [wizardStep, setWizardStep] = useState<string>(IVR_TAB_CONSTANT.BASIC_INFORMATION);
  const stepFromUrl = ivrTabFromSlug(tabSlug);
  const currentStep = isEditMode
    ? stepFromUrl || IVR_TAB_CONSTANT.BASIC_INFORMATION
    : wizardStep;

  const setCurrentStep = (nextStep: string) => {
    if (!isEditMode) {
      setWizardStep(nextStep);
      return;
    }
    navigate(`${IVR_PATH}/${initialData?.uuid}/${ivrSlugFromTab(nextStep)}`, { replace: true });
  };

  /* An unrecognised tab is corrected in the address bar rather than quietly
     showing the first tab, so the URL never claims to be somewhere it is not. */
  useEffect(() => {
    if (isEditMode && tabSlug && !stepFromUrl) {
      navigate(`${IVR_PATH}/${initialData?.uuid}/${IVR_DEFAULT_TAB.slug}`, { replace: true });
    }
  }, [isEditMode, tabSlug, stepFromUrl, initialData?.uuid, navigate]);
  const [validationContext, setValidationContext] = useState<any>(null);
  const queryClient: any = useQueryClient();
  const form = useForm<any>({
    mode: 'onChange',
    defaultValues: INITIAL_IVR_MENU_VLAUES,
    resolver: yupResolver(upsertIVRSchemaValidation[currentStep] as yup.AnyObjectSchema),
    context: { validationContext },
  });
  const { user } = useUser();
  const {
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = form;

  /** Going backward is always allowed. */

  const handleTabChange = async (nextTab: string) => {
    const currentIndex = TABS_ORDER.indexOf(currentStep);
    const nextIndex = TABS_ORDER.indexOf(nextTab);

    if (nextIndex <= currentIndex) {
      setCurrentStep(nextTab);
      return;
    }
    const values = form.getValues();

    for (let i = currentIndex; i < nextIndex; i++) {
      const tabKey = TABS_ORDER[i];
      const schema = upsertIVRSchemaValidation[tabKey];

      try {
        await schema.validate(values, {
          abortEarly: false,
          context: { activeTab: tabKey, validationContext },
        });
      } catch (err: any) {
        if (err?.inner) {
          err.inner.forEach((validationError: any) => {
            if (validationError.path) {
              form.setError(validationError.path as any, {
                type: 'manual',
                message: validationError.message,
              });
            }
          });
        }

        return;
      }
    }

    setCurrentStep(nextTab);
  };

  const handleNext = async () => {
    const currentIndex = TABS_ORDER.indexOf(currentStep);
    const isValid = await trigger();

    if (isValid && currentIndex < TABS_ORDER.length - 1) {
      setCurrentStep(TABS_ORDER[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    const currentIndex = TABS_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(TABS_ORDER[currentIndex - 1]);
    }
  };

  const ActiveStep = STEP_COMPONENTS[currentStep];

  const { mutate: mutateUpsertIVR, isPending: isPendingUpsertIVR } = useMutation({
    mutationFn: upsertIVR,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['ivrList']);
      handleAlert({ text: data?.data?.message || 'IVR saved successfully!', type: 'success' });
      setDrawerState(false);
    },
  });

  const onSubmit = () => {
    const {
      extension = '',
      name = '',
      description = '',
      language,
      site,
      ivrActions = [],
      settings: {
        operational_hours,
        recording = '',
        display_number,
        transcription = false,
        ai_call_monitoring = false,
      } = {},
      generic,
      greetings,
      max_failures,
      max_timeouts,
      timeout,
    }: any = watch();

    const payload: any = {
      extension,
      name,
      description,
      language: language?.value,
      site: JSON.stringify(site),

      settings: JSON.stringify({
        operational_hours: {
          type: operational_hours?.type,
          value: operational_hours?.value || CUSTOM_HOURS_SCHEDULE_OPTIONS,
          holidays: operational_hours?.holidays?.length
            ? getHolidaysPayload(operational_hours.holidays)
            : [],
          regional: {
            timezone: operational_hours?.regional?.timezone,
            time_format: operational_hours?.regional?.time_format,
            country_code: operational_hours?.regional?.country_code,
            country: operational_hours?.regional?.country,
          },
          closed_hour_action: {
            type: operational_hours?.closed_hour_action?.type?.value,
            value: operational_hours?.closed_hour_action?.value?.value,
            enabled: operational_hours?.closed_hour_action?.enabled,
            personal: operational_hours?.closed_hour_action?.personal,
            type_label: operational_hours?.closed_hour_action?.type?.label,
            value_label: operational_hours?.closed_hour_action?.value?.label,
          },
        },
        recording,
        display_number: {
          incoming: display_number?.incoming,
          masking: {
            type: display_number?.masking?.type?.value || '',
            label: display_number?.masking?.type?.label || '',
            value: display_number?.masking?.value || '',
          },
        },
        transcription: transcription,
        ai_call_monitoring: ai_call_monitoring,
        media: {
          welcome: getGreetingConfig('welcome', greetings),
          menu: getGreetingConfig('menu', greetings),
          invalid: getGreetingConfig('invalid', greetings),
        },
      }),
      ivr_option: ivrActions?.map((item: any) => ({
        key: item?.key?.value,
        type: item?.forwardType?.value,
        value: item?.forwardValue?.value,
        label: item?.forwardValue?.label,
      })),

      generic_keys: JSON.stringify({
        enabled: generic?.enabled,
        keyboard_shortcuts: generic?.keyboard_shortcuts,
        press_hash: generic?.press_hash?.value,
        press_asterisk: generic?.press_asterisk?.value,
        timeout_action: {
          status: generic?.timeout_action?.status,
          type: generic?.timeout_action?.type?.value,
          value: generic?.timeout_action?.value?.value,
          label: generic?.timeout_action?.value?.label,
          name: generic?.timeout_action?.value?.name,
        },
        failure_action: {
          status: generic?.failure_action?.status,
          type: generic?.failure_action?.type?.value,
          value: generic?.failure_action?.value?.value,
          name: generic?.failure_action?.value?.name,
          label: generic?.failure_action?.value?.label,
        },
      }),
      max_failures: toRetryNumber(max_failures, IVR_RETRY_DEFAULTS.max_failures),
      max_timeouts: toRetryNumber(max_timeouts, IVR_RETRY_DEFAULTS.max_timeouts),
      /* `timeout_limit`, not `timeout`. The column is timeout_limit and the
         repository reads that name; `timeout` matches nothing, so the value was
         silently discarded on every save. Confirmed against the live dialplan
         generator, which reads timeout_limit. */
      timeout_limit: toRetryNumber(timeout, IVR_RETRY_DEFAULTS.timeout),
    };
    if (initialData?.uuid) payload['uuid'] = initialData.uuid;
    mutateUpsertIVR(payload);
  };

  const getGreetingConfig = (
    key: string,
    greetings: Record<string, { enabled?: boolean; value?: { label?: string; value?: string } }>,
  ) => ({
    enabled: greetings?.[key]?.enabled,
    label: greetings?.[key]?.value?.label,
    value: greetings?.[key]?.value?.value,
  });

  useEffect(() => {
    if (getObjectLength(user) && !initialData?.uuid) {
      const { user_info = {} } = user || {};
      const obj = {
        label: user_info?.site_detail?.name,
        value: user_info?.site_uuid,
      };
      setValue('site', obj);
      setValue('settings.operational_hours.regional', user?.settings?.operational_hours?.regional);
    }
  }, [user, initialData]);

  useEffect(() => {
    if (!initialData?.uuid) return;
    const {
      extension = '',
      name = '',
      description,
      language = '',
      site = '{}',
      ivr_option = '[]',
      generic_keys = '{}',
      settings = '{}',
    }: any = initialData;
    let settingsData, siteData, ivrOptionsData, genericKeysData;
    try {
      settingsData = JSON.parse(settings);
      siteData = JSON.parse(site);
      ivrOptionsData = ivr_option;
      genericKeysData = JSON.parse(generic_keys);
    } catch (error: any) {
      console.error('INVALID JSON FORMAT: ', error?.message);
    }

    const {
      operational_hours = {},
      recording = '',
      display_number = {},
      media = {},
      transcription = false,
      ai_call_monitoring = false,
    } = settingsData || {};

    const ivrOptionValues = ivrOptionsData?.map((item: any) => ({
      key: { label: item?.key?.toString() || '', value: item?.key ?? '' },
      forwardType: { label: '', value: item?.type || '' },
      forwardValue: { label: item?.label, value: item?.value || '' },
    }));

    const genericValues = {
      enabled: genericKeysData?.enabled || false,
      keyboard_shortcuts: genericKeysData?.keyboard_shortcuts || 'default',
      press_hash: {
        label: genericKeysData?.press_hash || 'Return to Previous Menu',
        value: genericKeysData?.press_hash || 'Return to Previous Menu',
      },
      press_asterisk: {
        label: genericKeysData?.press_asterisk || 'Repeat Menu Greeting',
        value: genericKeysData?.press_asterisk || 'Repeat Menu Greeting',
      },
      timeout_action: {
        status: genericKeysData?.timeout_action?.status || 'HANGUP',
        type: { label: '', value: genericKeysData?.timeout_action?.type || '' },
        value: {
          label: genericKeysData?.timeout_action?.label || '',
          value: genericKeysData?.timeout_action?.value || '',
        },
      },
      failure_action: {
        status: genericKeysData?.failure_action?.status || 'HANGUP',
        type: { label: '', value: genericKeysData?.failure_action?.type || '' },
        value: {
          label: genericKeysData?.failure_action?.label || '',
          value: genericKeysData?.failure_action?.value || '',
        },
      },
    };
    const settingsValues = {
      operational_hours: {
        type: operational_hours?.type || '24_hours',
        value: operational_hours?.value,
        holidays:
          operational_hours?.holidays && operational_hours?.holidays?.length
            ? getHolidaysFormVal(operational_hours?.holidays)
            : [],
        regional: operational_hours?.regional,
        closed_hour_action: {
          type: {
            label: operational_hours?.closed_hour_action?.type_label || '',
            value: operational_hours?.closed_hour_action?.type || '',
          },
          value: {
            label: operational_hours?.closed_hour_action?.value_label || '',
            value: operational_hours?.closed_hour_action?.value || '',
          },
          enabled: operational_hours?.closed_hour_action?.enabled,
          personal: operational_hours?.closed_hour_action?.personal,
        },
      },
      recording: recording,
      display_number: {
        incoming: display_number?.incoming,
        masking: {
          type: {
            label: display_number?.masking?.label,
            value: display_number?.masking?.type || 'N',
          },
          value: display_number?.masking?.value || '',
        },
      },
      transcription: transcription,
      ai_call_monitoring: ai_call_monitoring,
    };

    setValue('extension', extension);
    setValue('name', name);
    setValue('description', description ?? '');
    setValue('language', { label: '', value: language });
    setValue('site', siteData);
    setValue('settings', settingsValues);

    setValue('ivrActions', ivrOptionValues);
    setValue('generic', genericValues);

    // These live at the top level of the IVR row. `timeout_limit` is the column
    // name; some responses expose it as `timeout`, so accept either.
    const initial: any = initialData;
    setValue('max_failures', toRetryNumber(initial?.max_failures, IVR_RETRY_DEFAULTS.max_failures));
    setValue('max_timeouts', toRetryNumber(initial?.max_timeouts, IVR_RETRY_DEFAULTS.max_timeouts));
    setValue(
      'timeout',
      toRetryNumber(initial?.timeout ?? initial?.timeout_limit, IVR_RETRY_DEFAULTS.timeout),
    );

    setValue('greetings', {
      welcome: {
        enabled: media?.welcome?.enabled || false,
        value: {
          label: media?.welcome?.label || 'Select',
          value: media?.welcome?.value || '',
        },
      },
      menu: {
        enabled: true,
        value: {
          label: media?.menu?.label || 'Select',
          value: media?.menu?.value || '',
        },
      },
      invalid: {
        enabled: media?.invalid?.enabled || false,
        value: {
          label: media?.invalid?.label || 'Select',
          value: media?.invalid?.value || '',
        },
      },
    });
  }, [initialData]);

  useEffect(() => {
    setValidationContext({ currentStep, fields: watch() });
  }, [currentStep, JSON.stringify(watch())]);

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex h-full min-h-0 flex-col gap-3 pt-2 sm:pt-3"
      >
        {/* Stepper */}
        {/* <Stepper steps={stepperSteps} currentStep={currentStep} /> */}
        <Tabs value={currentStep} onValueChange={handleTabChange} className="flex w-full">
          <div className="w-full overflow-x-auto overflow-y-hidden border-b border-gray-200">
            <TabsList className="flex min-h-11 w-max min-w-full rounded-none bg-transparent p-0 text-center text-sm font-semibold">
              {Object.entries(IVR_TAB_CONSTANT).map(([key, value]) => (
                <TabsTrigger
                  className="relative flex h-full shrink-0 cursor-pointer gap-1 rounded-none border-b-2 bg-transparent px-4 py-3 font-semibold whitespace-nowrap text-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-2xs sm:px-6"
                  key={key}
                  value={value}
                >
                  {value}{' '}
                  {(errors as any)[ERROR_TYPES[value]] && (
                    <div className="flex justify-end">
                      <ErrorTooltip text={IVR_ERROR_TYPES_MESSAGES[value]} />
                    </div>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <div className="flex h-full min-h-0 w-full flex-col justify-between gap-3">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {/* Active step’s content */}

            <ActiveStep
              initialData={initialData}
              isChooseTemplate={false}
              // customClass="h-full min-h-0"
            />
          </div>
          {/* Footer buttons */}
          <div className="flex flex-nowrap items-center justify-between gap-2 border-t border-gray-200 pt-3 sm:justify-end sm:pt-4">
            <Button
              variant={'transparent'}
              type="button"
              onClick={() => setDrawerState(false)}
              className="min-w-0 flex-1 px-3 sm:flex-none"
            >
              Cancel
            </Button>
            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
              <Button
                variant={'outline'}
                type="button"
                onClick={handlePrev}
                disabled={currentStep === TABS_ORDER[0]}
                className="min-w-0 flex-1 px-3 sm:flex-none"
              >
                Prev
              </Button>
              {currentStep !== IVR_TAB_CONSTANT.KEY_PRESSES && (
                <Button
                  variant={'outline'}
                  type="button"
                  onClick={handleNext}
                  className="min-w-0 flex-1 px-3 sm:flex-none"
                >
                  Next
                </Button>
              )}
              {currentStep === IVR_TAB_CONSTANT.KEY_PRESSES && (
                <Button
                  variant={'outline'}
                  type="submit"
                  disabled={isPendingUpsertIVR}
                  className="min-w-0 flex-1 px-3 sm:flex-none"
                >
                  {isPendingUpsertIVR ? 'Submiting...' : 'Submit'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default AddEditIvrMenu;

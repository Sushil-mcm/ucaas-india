import { useEffect, useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { yupResolver } from '@hookform/resolvers/yup';

import { FormProvider, useForm } from 'react-hook-form';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertTemplate } from '@/services/api';
import { useUser } from '@/hooks/use-user';
import { getHolidaysFormVal, getHolidaysPayload, getObjectLength, handleAlert } from '@/lib/utils';
import { ADD_TEMPLATE_INITIAL, settingsInitialState, TAB_CONSTANT } from './constants';
import { UPSERT_TEMPLATE_SCHEMA } from './schema';
import SettingPermission from './settings';
import GreetingNotification from './greetings';
import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/pages/admin-settings/numbers/set-number-forwarding/constants';

interface UpdateForwardingProps {
  drawerState: boolean;
  setDrawerState: (state: boolean) => void;
  data?: any;
  setTabData?: any;
}

const TABS_ORDER = [TAB_CONSTANT.SETTING_PERMISSIONS, TAB_CONSTANT.GREETING_NOTIFICATION];

const UpsertUserSettingsTemplate: FC<UpdateForwardingProps> = ({ setDrawerState, data }) => {
  const [activeTab, setActiveTab] = useState<string>(TAB_CONSTANT.SETTING_PERMISSIONS);
  const queryClient: any = useQueryClient();

  const [schemaContext, setSchemaContext] = useState<any>(null);
  const formInstance = useForm<any>({
    defaultValues: ADD_TEMPLATE_INITIAL,
    resolver: yupResolver(UPSERT_TEMPLATE_SCHEMA[activeTab]),
    mode: 'onChange',
    context: { activeTab, schemaContext },
  });

  const { user } = useUser();
  const { company_info } = user || {};
  const {
    setValue,
    trigger,
    // formState: { errors },
    watch,
  } = formInstance;
  const handleTabChange = async (nextTab: string) => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    const nextIndex = TABS_ORDER.indexOf(nextTab);

    if (nextIndex <= currentIndex) {
      setActiveTab(nextTab); // Going backward, no validation
      return;
    }

    const isValid = await trigger();
    if (isValid) {
      setActiveTab(nextTab); // Forward only if valid
    }
  };

  const handleNext = async () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    const isValid = await trigger();

    if (isValid && currentIndex < TABS_ORDER.length - 1) {
      setActiveTab(TABS_ORDER[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS_ORDER[currentIndex - 1]);
    }
  };

  useEffect(() => {
    const subscription = watch((value) => {
      setSchemaContext(value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const { mutate: mutateUpsertTemplate, isPending: isPendingUpdateMember } = useMutation({
    mutationFn: upsertTemplate,
    onSuccess: (data) => {
      handleAlert({ text: data?.data?.message || 'Template saved successfully!', type: 'success' });
      queryClient.invalidateQueries(['userTemplateList']);
      setDrawerState(false);
    },
  });

  const onSubmit = () => {
    const { greetings = {}, settings = {} } = watch();
    const {
      display_number: {
        masking = {},
        incoming = {},
        show_number_if_blocked = 'NO',
        override = false,
      } = {},
      operational_hours = {},
      ...restSettings
    } = settings;
    const tempSettings = {
      ...restSettings,
      display_number: {
        incoming,
        masking: {
          type: masking?.type?.value,
          label: masking?.type?.label,
          value: masking?.value,
        },
        show_number_if_blocked,
        override,
      },

      operational_hours: {
        type: operational_hours?.type,
        value: operational_hours?.value || CUSTOM_HOURS_SCHEDULE_OPTIONS,
        holidays: operational_hours?.holidays?.length
          ? getHolidaysPayload(operational_hours.holidays)
          : [],
        override: operational_hours?.override,
        regional: {
          country: operational_hours?.regional?.country,
          timezone: operational_hours?.regional?.timezone,
          time_format: operational_hours?.regional?.time_format,
          country_code: operational_hours?.regional?.country_code,
          override: operational_hours?.regional?.override,
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
    };

    const greetingsRequest = {
      welcome_greeting: getGreetingConfig('welcome_greeting', greetings),
      voicemail: getGreetingConfig('voicemail', greetings),
      ring_tone: getGreetingConfig('ring_tone', greetings),
      on_hold_music: getGreetingConfig('on_hold_music', greetings),
    };

    const payload = {
      greetings: greetingsRequest,
      settings: tempSettings,
      name: watch('name'),
      ...(data?.uuid && {
        uuid: data?.uuid,
        userID: data?.uuid,
      }),
    };
    mutateUpsertTemplate(payload);
  };

  const getGreetingConfig = (
    key: string,
    greetings: Record<
      string,
      { enabled?: boolean; value?: { label?: string; value?: string }; override?: boolean }
    >,
  ) => ({
    enabled: greetings?.[key]?.enabled,
    label: greetings?.[key]?.value?.label,
    value: greetings?.[key]?.value?.value,
    override: greetings?.[key]?.override,
  });

  useEffect(() => {
    if (!data?.uuid) return;
    try {
      if (data?.uuid) {
        const settingsData =
          typeof data?.settings === 'string'
            ? JSON.parse(data?.settings || '{}')
            : data?.settings || {};

        const greetingsData =
          typeof data?.greetings === 'string' ? JSON.parse(data?.greetings) : data?.greetings || {};

        setValue('name', data?.name || '');
        setValue(
          'settings',
          settingsData?.operational_hours?.regional?.timezone?.value
            ? settingsData
            : settingsInitialState,
        );
        const transData = settingsData?.transcription;
        const isTransObj = typeof transData === 'object' && transData !== null;
        setValue('settings.transcription', {
          enabled: isTransObj ? !!transData.enabled : !!transData,
          override: isTransObj ? !!transData.override : false,
        });

        const aiData = settingsData?.ai_call_monitoring;
        const isAiObj = typeof aiData === 'object' && aiData !== null;
        setValue('settings.ai_call_monitoring', {
          enabled: isAiObj ? !!aiData.enabled : !!aiData,
          override: isAiObj ? !!aiData.override : false,
        });
        const holidays =
          settingsData?.operational_hours?.holidays &&
          settingsData?.operational_hours?.holidays?.length
            ? getHolidaysFormVal(settingsData?.operational_hours?.holidays)
            : [];

        setValue('settings.operational_hours.holidays', holidays);
        setValue('settings.display_number.masking.type', {
          label: settingsData?.display_number?.masking?.label || '',
          value: settingsData?.display_number?.masking?.type || '',
        });

        setValue('settings.operational_hours.closed_hour_action', {
          type: {
            label: settingsData?.operational_hours?.closed_hour_action?.type_label || '',
            value: settingsData?.operational_hours?.closed_hour_action?.type || '',
          },
          value: {
            label: settingsData?.operational_hours?.closed_hour_action?.value_label || '',
            value: settingsData?.operational_hours?.closed_hour_action?.value || '',
          },
          enabled: settingsData?.operational_hours?.closed_hour_action?.enabled,
          personal: settingsData?.operational_hours?.closed_hour_action?.personal,
        });

        const welcomeGreetingData = greetingsData?.welcome_greeting || greetingsData?.welcome;
        const onHoldMusicData = greetingsData?.on_hold_music || greetingsData?.hold;

        setValue('greetings', {
          welcome_greeting: {
            enabled: welcomeGreetingData?.enabled || false,
            override: welcomeGreetingData?.override || false,
            value: {
              label: welcomeGreetingData?.label || 'Select',
              value: welcomeGreetingData?.value || '',
            },
          },
          voicemail: {
            enabled: greetingsData?.voicemail?.enabled || false,
            override: greetingsData?.voicemail?.override || false,
            value: {
              label: greetingsData?.voicemail?.label || 'Select',
              value: greetingsData?.voicemail?.value || '',
            },
          },
          ring_tone: {
            enabled: greetingsData?.ring_tone?.enabled || false,
            override: greetingsData?.ring_tone?.override || false,
            value: {
              label: greetingsData?.ring_tone?.label || 'Select',
              value: greetingsData?.ring_tone?.value || '',
            },
          },
          on_hold_music: {
            enabled: onHoldMusicData?.enabled || false,
            override: onHoldMusicData?.override || false,
            value: {
              label: onHoldMusicData?.label || 'Select',
              value: onHoldMusicData?.value || '',
            },
          },
        });
      }
    } catch (error: any) {
      console.error('Something went wrong', error?.message);
    }
  }, [data]);

  useEffect(() => {
    if (getObjectLength(user) && !data?.uuid)
      setValue('settings.operational_hours.regional', user?.settings?.operational_hours?.regional);
  }, [user, data]);

  return (
    <FormProvider {...formInstance}>
      <form onSubmit={formInstance.handleSubmit(onSubmit)} className="user-settings-template-form">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex w-full user-settings-template-tabs"
        >
          <div className="border-b border-gray-200 w-full user-settings-template-tabs-header">
            <TabsList className="bg-white p-0 rounded-tl-sm rounded-tr-sm rounded-bl-none rounded-br-none min-h-10 justify-start user-settings-template-tabs-list">
              {Object.entries(TAB_CONSTANT).map(([key, value]) => (
                <TabsTrigger
                  key={key}
                  value={value}
                  className="max-w-fit font-semibold cursor-pointer data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-b-primary px-4 data-[state=active]:text-primary data-[state=active]:shadow-none  data-[state=active]:rounded-none h-full data-[state=inactive]:text-gray-700 user-settings-template-tab-trigger"
                >
                  {value}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent
            value={TAB_CONSTANT.SETTING_PERMISSIONS}
            className="user-settings-template-tabs-content"
          >
            <SettingPermission {...{ data, company_info }} />
          </TabsContent>
          <TabsContent
            value={TAB_CONSTANT.GREETING_NOTIFICATION}
            className="user-settings-template-tabs-content"
          >
            <GreetingNotification {...{ company_info }} />
          </TabsContent>
        </Tabs>
        <div className="justify-end flex gap-2 user-settings-template-footer">
          <Button
            type="button"
            variant={'transparent'}
            onClick={() => setDrawerState(false)}
            className="user-settings-template-footer-btn"
          >
            Cancel
          </Button>
          <Button
            variant={'outline'}
            type="button"
            onClick={handlePrev}
            disabled={activeTab === TABS_ORDER[0]}
            className="user-settings-template-footer-btn"
          >
            Prev
          </Button>
          {activeTab !== TAB_CONSTANT.GREETING_NOTIFICATION && (
            <Button
              variant={'outline'}
              type="button"
              onClick={handleNext}
              className="user-settings-template-footer-btn"
            >
              Next
            </Button>
          )}
          {activeTab === TAB_CONSTANT.GREETING_NOTIFICATION && (
            <Button
              variant={'outline'}
              type="submit"
              disabled={isPendingUpdateMember}
              className="user-settings-template-footer-btn"
            >
              {isPendingUpdateMember ? 'Submiting...' : 'Submit'}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
};

export default UpsertUserSettingsTemplate;

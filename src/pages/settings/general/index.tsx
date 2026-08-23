// import Breadcrumb from '@/components/custom/breadcrumb';
import CommonSettingPermission from '@/components/common-settings';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { getHolidaysFormVal, getHolidaysPayload, handleAlert } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/pages/admin-settings/numbers/set-number-forwarding/constants';
import {
  FORWARDING_TAB_CONSTANT,
  settingsInitialState,
} from '@/pages/admin-settings/users/constants';
import { upsertUserSettingsSchema } from '@/pages/admin-settings/users/extension/update-forwarding/schema';
import { getUserDetails, updateUserSettings } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FC, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

interface GeneralProps {
  heading?: string;
}

export const General: FC<GeneralProps> = ({ heading = 'General' }) => {
  // const breadcrumbData = [{ label: 'Settings' }, { label: 'General' }];
  const queryClient: any = useQueryClient();
  const [schemaContext, setSchemaContext] = useState<any>(null);
  const methods = useForm({
    mode: 'all',
    defaultValues: { settings: settingsInitialState },
    resolver: yupResolver(upsertUserSettingsSchema[FORWARDING_TAB_CONSTANT.SETTING_PERMISSIONS]),
    context: { activeTab: FORWARDING_TAB_CONSTANT.SETTING_PERMISSIONS, schemaContext },
  });
  const { user } = useUser();
  const { user_info } = user || {};
  const IS_ADMIN = user_info?.role === 'ADMIN';

  const { handleSubmit, setValue, watch } = methods;

  useEffect(() => {
    const subscription = watch((value) => {
      setSchemaContext(value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const { data: userInfoData } = useQuery<any>({
    queryKey: ['getUserDetailsQueryFn'],
    queryFn: getUserDetails,
    select: (data) => data?.data?.data?.result,
  });

  const { mutate: mutateGeneralSettings, isPending: PendingGeneralSettings } = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: () => {
      handleAlert({
        text: 'General Settings updated successfully!',
        type: 'success',
      });
      queryClient.invalidateQueries(['getUsersDetails', 'getUserDetailsQueryFn'], {
        exact: true,
      });
      invalidateGlobalUsersDirectory(queryClient);
    },
  });

  const onSubmit = () => {
    const {
      display_number: { masking = {}, incoming = {}, show_number_if_blocked = 'NO' } = {},
      operational_hours = {},
      ...restSettings
    }: any = watch('settings');
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
      },

      operational_hours: {
        type: operational_hours?.type,
        value: operational_hours?.value || CUSTOM_HOURS_SCHEDULE_OPTIONS,
        holidays: operational_hours?.holidays?.length
          ? getHolidaysPayload(operational_hours.holidays)
          : [],
        regional: {
          country: operational_hours?.regional?.country,
          timezone: operational_hours?.regional?.timezone,
          time_format: operational_hours?.regional?.time_format,
          country_code: operational_hours?.regional?.country_code,
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

    const payload = {
      key: 'settings',
      value: removeOverride(tempSettings),
    };
    mutateGeneralSettings(payload);
  };

  function removeOverride<T>(obj: T): T {
    if (Array.isArray(obj)) {
      return obj.map(removeOverride) as unknown as T;
    } else if (typeof obj === 'object' && obj !== null) {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([key]) => key !== 'override')
          .map(([key, value]) => [key, removeOverride(value)]),
      ) as unknown as T;
    }
    return obj;
  }

  useEffect(() => {
    if (userInfoData) {
      const settingInfo: any =
        typeof userInfoData?.settings === 'string'
          ? JSON.parse(userInfoData?.settings)
          : userInfoData?.settings;
      setValue(
        'settings.operational_hours.regional.timezone',
        settingInfo?.operational_hours?.regional?.timezone || {},
      );
      setValue(
        'settings.operational_hours.regional.country_code',
        settingInfo?.operational_hours?.regional?.country_code || {},
      );
      setValue(
        'settings.operational_hours.regional.time_format',
        settingInfo?.operational_hours?.regional?.time_format || 12,
      );
      setValue(
        'settings.operational_hours.regional.country',
        settingInfo?.operational_hours?.regional?.country || {},
      );
      setValue('settings.recording', settingInfo?.recording || {});

      setValue('settings.operational_hours.type', settingInfo?.operational_hours?.type || '');
      setValue('settings.operational_hours.value', settingInfo?.operational_hours?.value || {});

      const holidays =
        settingInfo?.operational_hours?.holidays && settingInfo?.operational_hours?.holidays?.length
          ? getHolidaysFormVal(settingInfo?.operational_hours?.holidays)
          : [];

      setValue('settings.operational_hours.holidays', holidays);

      setValue('settings.operational_hours.closed_hour_action', {
        type: {
          label: settingInfo?.operational_hours?.closed_hour_action?.type_label || '',
          value: settingInfo?.operational_hours?.closed_hour_action?.type || '',
        },
        value: {
          label: settingInfo?.operational_hours?.closed_hour_action?.value_label || '',
          value: settingInfo?.operational_hours?.closed_hour_action?.value || '',
        },
        enabled: settingInfo?.operational_hours?.closed_hour_action?.enabled,
        personal: settingInfo?.operational_hours?.closed_hour_action?.personal,
      });

      setValue('settings.role', settingInfo?.role || { label: '', value: '' });
      setValue('settings.group', settingInfo?.group || { label: '', value: '' });

      setValue('settings.voicemail_pin.value', settingInfo?.voicemail_pin?.value || '');
      setValue('settings.voicemail_pin.users', settingInfo?.voicemail_pin?.users || []);
      setValue(
        'settings.voicemail_pin.voicemail_to_text',
        settingInfo?.voicemail_pin?.voicemail_to_text || 'NO',
      );

      setValue('settings.display_number.incoming', settingInfo?.display_number?.incoming || {});
      setValue('settings.display_number.masking', settingInfo?.display_number?.masking || {});
      setValue(
        'settings.display_number.show_number_if_blocked',
        settingInfo?.display_number?.show_number_if_blocked || 'NO',
      );
      setValue('settings.display_number.masking.type', {
        label: settingInfo?.display_number?.masking?.label || '',
        value: settingInfo?.display_number?.masking?.type || '',
      });
      setValue('settings.transcription', settingInfo?.transcription || false);
      setValue('settings.ai_call_monitoring', settingInfo?.ai_call_monitoring || false);
    }
  }, [userInfoData]);

  return (
    <>
      <section className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-gray-200/15">
        {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <p className="text-gray-900 font-semibold text-lg">{heading}</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <FormProvider {...methods}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex h-full min-h-0 w-full flex-col gap-3"
            >
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <CommonSettingPermission
                  type={'GENERAL_SETTING'}
                  data={{ user_info: userInfoData?.user_info, settings: userInfoData?.settings }}
                  IS_ADMIN={false}
                  origin={'general_settings'}
                  company_info={userInfoData?.company_info}
                  isChooseTemplate={false}
                  isEditable={IS_ADMIN}
                  // isShowVoicemail={true}
                  customClass="md:min-h-[calc(100vh_-_13rem)]"
                  selectedUserExt={userInfoData?.user_info?.extension}
                />
              </div>
              <div className="flex justify-end">
                <Button variant={'outline'} type="submit" disabled={PendingGeneralSettings}>
                  {PendingGeneralSettings ? 'Submiting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </FormProvider>
        </div>
      </section>{' '}
    </>
  );
};

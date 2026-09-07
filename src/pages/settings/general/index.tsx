import CommonSettingPermission from '@/components/common-settings';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import '@/components/mcm/mcm-page.css';
import { POLICY_FIELDS, useCompanyPolicy, type PolicyField } from '@/lib/company-policy';
import { getHolidaysFormVal, getHolidaysPayload, handleAlert } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { isUnchanged } from '@/lib/form-baseline';
import AccountPageHead from '../account-page-head';
import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/pages/admin-settings/numbers/set-number-forwarding/constants';
import {
  FORWARDING_TAB_CONSTANT,
  settingsInitialState,
} from '@/pages/admin-settings/constants';
import { upsertUserSettingsSchema } from '@/pages/admin-settings/people/update-forwarding/schema';
import { getUserDetails, updateUserSettings } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FC, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

interface GeneralProps {
  heading?: string;
}

/* "Preferences" is what the navigation calls this screen. The heading said
   "General", which matched nothing the user had clicked to get here. */
export const General: FC<GeneralProps> = ({ heading = 'Preferences' }) => {
  const queryClient: any = useQueryClient();
  const [schemaContext, setSchemaContext] = useState<any>(null);
  /* Serialised copy of the settings as they arrived, so "has anything
     changed" is a comparison rather than a flag something else has to
     remember to set. Also what Discard restores. */
  const [baselineSettings, setBaselineSettings] = useState<string | null>(null);

  /* The same company rule the editor below reads, read once more here so the
     validation agrees with what is on screen. A setting the company has locked is
     greyed out, so requiring a value in it would leave this form permanently
     unsubmittable with an error pointing at a control the person cannot open.
     The query is shared with the editor, so this costs no extra request. */
  const companyPolicy = useCompanyPolicy({ enabled: true });
  const lockedFields = (Object.keys(POLICY_FIELDS) as PolicyField[]).filter(
    (field) => !companyPolicy.allows(field),
  );

  const methods = useForm({
    mode: 'all',
    defaultValues: { settings: settingsInitialState },
    resolver: yupResolver(upsertUserSettingsSchema[FORWARDING_TAB_CONSTANT.SETTING_PERMISSIONS]),
    context: {
      activeTab: FORWARDING_TAB_CONSTANT.SETTING_PERMISSIONS,
      schemaContext,
      lockedFields,
    },
  });

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

  /* Company rule flags describe what the company does to a person; they are not
     part of that person's own settings. `override` was already stripped for that
     reason, and `apply`/`locked` are the same flag split in two, so all three go.
     Left in, this page would save the company's rule back onto the individual
     record, and the lock would then be read from the wrong level. */
  const RULE_FLAG_KEYS = ['override', 'apply', 'locked'];

  function removeOverride<T>(obj: T): T {
    if (Array.isArray(obj)) {
      return obj.map(removeOverride) as unknown as T;
    } else if (typeof obj === 'object' && obj !== null) {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([key]) => !RULE_FLAG_KEYS.includes(key))
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

      /* Snapshot what was just written in, so everything from here is
         measured against the saved record. Taken after the writes above, and
         re-taken whenever the record changes — including the refetch that
         follows a save, which is what puts the bar away again. */
      setBaselineSettings(JSON.stringify(methods.getValues('settings')));
    }
  }, [userInfoData]);

  /* Company-locked settings are greyed out, so there is a real distinction
     worth stating: some of what is on this page may not be yours to change.
     Saying how many is more use than leaving somebody to discover it one
     disabled control at a time. */
  const lockedCount = lockedFields.length;

  /* Not `formState.isDirty`. The controls on this page belong to
     `CommonSettingPermission`, which writes through `setValue` without
     `shouldDirty`, so react-hook-form never marks the form dirty and the
     flag stays false however much you change. Comparing the live values
     against the snapshot taken when the record loaded is independent of how
     the child chooses to write them. */
  const currentSettings = watch('settings');
  /* Compared through `isUnchanged` rather than by raw string, because
     `JSON.stringify` is sensitive to key order: the editor writes whole
     objects back through `setValue`, and one that comes back with its keys in
     a different order is not a change anybody made. Getting this wrong leaves
     the bar up over an untouched form, which teaches people to ignore it. */
  const hasUnsavedChanges = Boolean(
    baselineSettings && !isUnchanged(JSON.parse(baselineSettings), currentSettings),
  );

  return (
    <section className="mcm-page mcm-admin mcm-acct">
      <AccountPageHead
        title={heading}
        about="Your own regional settings, business hours and call handling. Company-wide rules live under Phone System → Preferences."
      >
        {!companyPolicy.isLoading && lockedCount > 0 && (
          <div className="mcm-acct-note">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {lockedCount} {lockedCount === 1 ? 'setting is' : 'settings are'} set by your company
              and cannot be changed here.
            </span>
          </div>
        )}
      </AccountPageHead>

      <div className="mcm-acct-body">
        <div className="mcm-acct-narrow">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CommonSettingPermission
                type={'GENERAL_SETTING'}
                data={{ user_info: userInfoData?.user_info, settings: userInfoData?.settings }}
                IS_ADMIN={false}
                origin={'general_settings'}
                company_info={userInfoData?.company_info}
                isChooseTemplate={false}
                /* These are the person's own settings — their timezone, their
                   hours, their recording preference — so they may edit them.
                   This used to be `isEditable={IS_ADMIN}`, which greyed out the
                   whole page for everyone who was not an admin, including every
                   tenant that has no company rule at all. Holding people back
                   from settings the company controls is the company rule's job,
                   and it does it per setting rather than per job title. */
                isEditable={true}
                /* The page scrolls as one column now, so this no longer needs
                   to be its own inner scroller with a hand-computed height. */
                customClass=""
                selectedUserExt={userInfoData?.user_info?.extension}
              />

              {hasUnsavedChanges && (
                <div className="mcm-savebar" role="status">
                  <span className="mcm-savebar-dot" aria-hidden="true" />
                  <span className="mcm-savebar-text">
                    Unsaved changes
                    <span className="mcm-savebar-sub">
                      {companyPolicy.isLoading
                        ? 'Checking which settings your company allows…'
                        : 'These apply to your calls only, not the whole company.'}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="mcm-savebar-discard"
                    onClick={() => {
                      if (baselineSettings) setValue('settings', JSON.parse(baselineSettings));
                    }}
                    disabled={PendingGeneralSettings}
                  >
                    Discard
                  </button>
                  {/* Saving before the company rule has arrived could write a value the
                      company does not allow, so the button waits for it. The query has
                      no retry, so this is one request long either way. */}
                  <Button
                    variant={'primary'}
                    type="submit"
                    disabled={PendingGeneralSettings || companyPolicy.isLoading}
                    /* Same `.mcm-page button` reset as elsewhere strips this
                       button's background/text-color — `!` forces them back. */
                    className="!bg-primary !text-white !border-primary hover:!bg-primary/90 min-w-[128px] justify-center"
                  >
                    {PendingGeneralSettings ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              )}
            </form>
          </FormProvider>
        </div>
      </div>
    </section>
  );
};

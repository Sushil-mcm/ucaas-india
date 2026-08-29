/* The two company screens that share one form: Phone rules and Greetings.
 *
 * They edit different halves of the same record and save through one button, so
 * they cannot simply be two independent pages. This component owns the form, the
 * loading, the seeding and the save; each page passes the tab it wants rendered.
 *
 * Splitting them into separate routes was the point of the URL work, but the
 * form has to stay shared or the two halves would fight over one record.
 */

import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { yupResolver } from '@hookform/resolvers/yup';

import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  COMPANY_DEFAULT_TEMPLATE_NAME,
  fetchCompanyDefaults,
  saveCompanyDefaults,
} from '@/lib/company-defaults';
import { buildTemplatePayload, hydrateTemplateForm } from '@/lib/user-settings-template-form';

import SettingPermission from '@/pages/admin-settings/templates/user-settings/add-edit-user-settings/settings';
import GreetingNotification from '@/pages/admin-settings/templates/user-settings/add-edit-user-settings/greetings';
import {
  ADD_TEMPLATE_INITIAL,
  settingsInitialState,
  TAB_CONSTANT,
} from '@/pages/admin-settings/templates/user-settings/add-edit-user-settings/constants';
import { UPSERT_TEMPLATE_SCHEMA } from '@/pages/admin-settings/templates/user-settings/add-edit-user-settings/schema';

const CompanyRulesForm = ({ tab }: { tab: string }) => {
  const queryClient: any = useQueryClient();
  const { user } = useUser();
  const [schemaContext, setSchemaContext] = useState<any>(null);

  const formInstance = useForm<any>({
    defaultValues: ADD_TEMPLATE_INITIAL,
    resolver: yupResolver(UPSERT_TEMPLATE_SCHEMA[tab]),
    mode: 'onChange',
    context: { activeTab: tab, schemaContext },
  });
  const { setValue, watch, handleSubmit } = formInstance;

  useEffect(() => {
    const subscription = watch((value) => setSchemaContext(value));
    return () => subscription.unsubscribe();
  }, [watch]);

  const {
    data: companyDefaults,
    isLoading,
    isError,
  } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
  });

  /* Whether the company level has ever been set. `isLoading` is checked
     separately so the "not set up yet" panel cannot flash before the answer
     arrives and tell the admin something untrue. */
  const hasCompanyDefaults = !!companyDefaults?.uuid;

  useEffect(() => {
    if (!companyDefaults) return;
    hydrateTemplateForm(setValue, companyDefaults, settingsInitialState);
  }, [companyDefaults, setValue]);

  /* Before the company level exists there is nothing to load, so the regional
     block is seeded from the admin's own account. It is the only place a sensible
     country and timezone is already known, and leaving those blank would save a
     record with no timezone — which reads as "never completed" on the way back
     in and would be discarded. */
  useEffect(() => {
    if (isLoading || hasCompanyDefaults) return;
    setValue('name', COMPANY_DEFAULT_TEMPLATE_NAME);
    if (user?.settings?.operational_hours?.regional) {
      setValue('settings.operational_hours.regional', user.settings.operational_hours.regional);
    }
  }, [isLoading, hasCompanyDefaults, user, setValue]);

  const { mutate: mutateSave, isPending } = useMutation({
    mutationFn: saveCompanyDefaults,
    onSuccess: (response: any) => {
      handleAlert({
        text: response?.data?.data?.message || 'Company phone preferences saved.',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: COMPANY_DEFAULTS_QUERY_KEY });
    },
  });

  const onSubmit = () => {
    const { settings = {}, greetings = {} } = watch();
    const payload = buildTemplatePayload({
      name: COMPANY_DEFAULT_TEMPLATE_NAME,
      settings,
      greetings,
      uuid: companyDefaults?.uuid,
    });
    mutateSave({
      uuid: companyDefaults?.uuid,
      settings: payload.settings,
      greetings: payload.greetings,
    });
  };

  const isRules = tab === TAB_CONSTANT.SETTING_PERMISSIONS;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 mb-3">
          Company preferences could not be loaded. Anything saved now would replace them, so saving
          is best left until the page loads cleanly.
        </div>
      )}

      {!isLoading && !hasCompanyDefaults && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-gray-700 mb-3">
          <p className="font-semibold text-gray-900 mb-1">Not set up yet</p>
          <p>Nothing has been set for your company yet. Choose what you want below and save.</p>
        </div>
      )}

      {isRules && (
        <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3 text-xs text-gray-700 mb-3">
          <p className="font-semibold text-gray-900 mb-1">How these settings are used</p>
          <p className="mb-1">
            Every setting below has an <strong>override</strong> switch. Leave it off and the
            company rule stands. Turn it on and a person may change that one setting on their own
            phone.
          </p>
          <p className="text-gray-600">
            Saving here does not rewrite phones that are already set up.
          </p>
        </div>
      )}

      <FormProvider {...formInstance}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mcm-page mcm-userform user-settings-template-form flex-1 min-h-0"
        >
          {isRules ? (
            <SettingPermission data={companyDefaults} company_info={user?.company_info} />
          ) : (
            <GreetingNotification company_info={user?.company_info} />
          )}

          <div className="flex justify-end pt-3">
            <Button type="submit" variant="outline" disabled={isPending || isLoading}>
              {isPending ? 'Saving...' : hasCompanyDefaults ? 'Save changes' : 'Create defaults'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default CompanyRulesForm;

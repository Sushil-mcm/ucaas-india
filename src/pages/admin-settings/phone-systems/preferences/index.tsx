/* Company Phone Preferences — the top level of the settings cascade.
 *
 * This page previously rendered the signed-in admin's own personal settings with
 * the heading swapped to "Preferences". An admin who set a rule here believed
 * they had set it for the company and had in fact changed only their own phone.
 * See src/lib/company-defaults.ts for why the company level is stored as a
 * reserved template rather than a new table.
 *
 * The shape follows how the established platforms present this. Dialpad and
 * Genesys both put the org-wide rules on one page, lead with what happens to an
 * incoming call, and attach an explicit "may this be overridden" decision to each
 * rule rather than leaving inheritance implicit. The settings model here already
 * carries those override flags on every field — the cascade was designed for,
 * and only the top of it was missing.
 */

import { useEffect, useMemo, useState } from 'react';
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

/* The settings and greetings editors are reused from the template drawer rather
   than rebuilt. They read entirely from form context, so pointing them at the
   company record needs no changes to either. */
import SettingPermission from '@/pages/admin-settings/templates/user-settings/add-edit-user-settings/settings';
import GreetingNotification from '@/pages/admin-settings/templates/user-settings/add-edit-user-settings/greetings';
import {
  ADD_TEMPLATE_INITIAL,
  settingsInitialState,
  TAB_CONSTANT,
} from '@/pages/admin-settings/templates/user-settings/add-edit-user-settings/constants';
import { UPSERT_TEMPLATE_SCHEMA } from '@/pages/admin-settings/templates/user-settings/add-edit-user-settings/schema';

import CompanyEmergencyAddress from '@/pages/admin-settings/company-info/company-emergency-address';
import CompanyHolidays from '@/pages/admin-settings/company-info/company-holidays';
import CompanyPolicies from '@/pages/admin-settings/company-info/company-policies';
import CompanyCallingPermissions from '@/pages/admin-settings/company-info/company-calling-permissions';
import CompanyMessaging from '@/pages/admin-settings/company-info/company-messaging';
import CompanySecurity from '@/pages/admin-settings/company-info/company-security';

import '@/components/mcm/mcm-page.css';

/* The journey a caller actually takes. Shown at the top because every setting
   below changes one of these steps, and an admin who cannot see the path cannot
   tell which setting they need. */
const CALL_JOURNEY = [
  { step: 'Call arrives', detail: 'on a company number' },
  { step: 'Open hours?', detail: 'business hours decide' },
  { step: 'Rings the person', detail: 'for the ring time set below' },
  { step: 'No answer', detail: 'nobody picks up' },
  { step: 'Voicemail', detail: 'caller leaves a message' },
];

/* One flat list of sections rather than tabs inside tabs. The first two are
   views of the same template form and share its Save button; the last three own
   their own record inside the same company row and save themselves. */
const SECTIONS = [
  { key: 'rules', label: 'Phone rules', tab: TAB_CONSTANT.SETTING_PERMISSIONS },
  { key: 'greetings', label: 'Greetings', tab: TAB_CONSTANT.GREETING_NOTIFICATION },
  { key: 'emergency', label: 'Emergency address', tab: null },
  { key: 'holidays', label: 'Holidays', tab: null },
  { key: 'calling', label: 'Calling', tab: null },
  { key: 'messaging', label: 'Messaging', tab: null },
  { key: 'policies', label: 'Policies', tab: null },
  { key: 'security', label: 'Security', tab: null },
] as const;

const Preferences = () => {
  const queryClient: any = useQueryClient();
  const { user } = useUser();
  const [activeSection, setActiveSection] = useState<string>('rules');
  const section = SECTIONS.find((item) => item.key === activeSection) || SECTIONS[0];
  /* The resolver is keyed by form tab, so the sections that are not part of the
     form fall back to the first tab's schema rather than resolving to undefined. */
  const activeTab: string = section.tab || TAB_CONSTANT.SETTING_PERMISSIONS;
  const isFormSection = Boolean(section.tab);
  const [schemaContext, setSchemaContext] = useState<any>(null);

  const companyName =
    user?.company_info?.company_name || user?.user_info?.company_name || 'your company';

  const formInstance = useForm<any>({
    defaultValues: ADD_TEMPLATE_INITIAL,
    resolver: yupResolver(UPSERT_TEMPLATE_SCHEMA[activeTab]),
    mode: 'onChange',
    context: { activeTab, schemaContext },
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
     in and would be discarded. The name is fixed: it is how the record is found. */
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

  const lastUpdated = useMemo(() => {
    if (!companyDefaults?.updated_at) return null;
    const parsed = new Date(companyDefaults.updated_at);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleString();
  }, [companyDefaults?.updated_at]);

  return (
    <section className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-gray-200/15">
      <div className="flex items-start justify-between gap-4 p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <div>
          <p className="text-gray-900 font-semibold text-lg">Company Phone Preferences</p>
          <p className="text-gray-500 text-xs">
            The phone rules for {companyName}, kept in one place.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastUpdated && (
            <span className="text-gray-400 text-[11px] hidden md:inline">
              Last saved {lastUpdated}
            </span>
          )}
          {/* The other sections carry their own Save, so a second button up here
              would be ambiguous about what it was about to write. */}
          {isFormSection && (
            <Button
              type="submit"
              form="company-preferences-form"
              variant="outline"
              disabled={isPending || isLoading}
            >
              {isPending ? 'Saving...' : hasCompanyDefaults ? 'Save changes' : 'Create defaults'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3 overflow-y-auto">
        {/* No .mcm-page wrapper: that class is page-level — it sets a column flex
            layout and takes the full outlet height, which pushed everything below
            it far down the page and left a large empty gap. The stylesheet is
            loaded globally now, so .mcm-flowpath works on its own. */}
        <div>
          <div className="mcm-flowpath" aria-label="How an incoming call is handled">
            {CALL_JOURNEY.map(({ step, detail }, index) => (
              <span key={step} className="mcm-flowstep">
                <span className="chip" title={detail}>
                  {step}
                </span>
                {index < CALL_JOURNEY.length - 1 && (
                  <span aria-hidden="true" className="px-1 text-gray-400">
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        {isFormSection && (
        <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3 text-xs text-gray-700 mb-3">
          <p className="font-semibold text-gray-900 mb-1">How these settings are used</p>
          <p className="mb-1">
            Every setting below has an <strong>override</strong> switch. Leave it off and the
            company rule stands. Turn it on and a person may change that one setting on their own
            phone.
          </p>
          <p className="text-gray-600">
            To put these rules on someone, choose the <strong>{COMPANY_DEFAULT_TEMPLATE_NAME}</strong>{' '}
            template when adding or editing them under Users. Saving here does not rewrite phones
            that are already set up.
          </p>
        </div>
        )}

        {isError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 mb-3">
            Company preferences could not be loaded. Anything saved now would replace them, so
            saving is best left until the page loads cleanly.
          </div>
        )}

        {!isLoading && !hasCompanyDefaults && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-gray-700 mb-3">
            <p className="font-semibold text-gray-900 mb-1">Not set up yet</p>
            <p>
              {companyName} has no company-wide phone rules yet, so each person is set up
              individually. Choose what you want below and select <strong>Create defaults</strong>.
            </p>
          </div>
        )}

        {/* Section nav. Flat rather than nested tabs: an admin looking for the
            emergency address should not have to know it lives under a tab that
            lives under another tab. */}
        <div className="mb-3 border-b border-gray-200">
          <div className="flex flex-wrap gap-1">
            {SECTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key)}
                className={`cursor-pointer px-4 py-2 text-sm font-semibold transition-colors ${
                  activeSection === item.key
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {activeSection === 'emergency' && <CompanyEmergencyAddress />}
        {activeSection === 'holidays' && <CompanyHolidays />}
        {activeSection === 'calling' && <CompanyCallingPermissions />}
        {activeSection === 'messaging' && <CompanyMessaging />}
        {activeSection === 'policies' && <CompanyPolicies />}
        {activeSection === 'security' && <CompanySecurity />}

        {isFormSection && (
        <FormProvider {...formInstance}>
          <form
            id="company-preferences-form"
            onSubmit={handleSubmit(onSubmit)}
            className="mcm-page mcm-userform user-settings-template-form flex-1 min-h-0"
          >
            {activeSection === 'rules' ? (
              <SettingPermission data={companyDefaults} company_info={user?.company_info} />
            ) : (
              <GreetingNotification company_info={user?.company_info} />
            )}
          </form>
        </FormProvider>
        )}
      </div>
    </section>
  );
};

export default Preferences;

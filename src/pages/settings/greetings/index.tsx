import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCompanyPolicy, type GreetingSlot } from '@/lib/company-policy';
import { handleAlert } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { FORWARDING_TAB_CONSTANT, greetingsInitialState } from '@/pages/admin-settings/constants';
import { upsertUserSettingsSchema } from '@/pages/admin-settings/people/update-forwarding/schema';
import { updateUserSettings } from '@/services/api';
import { useUserDetails, invalidateUserDetails } from '@/hooks/use-user-details';
import { useIsStarterPlan } from '@/hooks/use-is-starter-plan';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
import GreetingSlots from './greeting-slots';
import '@/components/mcm/mcm-page.css';

type GreetingValue = {
  label?: string;
  value?: string;
  uuid?: string;
  is_default?: boolean | number;
};

type GreetingItem = {
  enabled?: boolean;
  value?: GreetingValue;
};

type GreetingsMap = Record<string, GreetingItem>;

type GreetingKey = 'welcome_greeting' | 'voicemail' | 'ring_tone' | 'on_hold_music';

interface GreetingField {
  enabled: boolean;
  override: boolean;
  value: {
    label: string;
    value: string;
    uuid?: string;
    is_default?: boolean | number;
  };
}

type GreetingsForm = Record<GreetingKey, GreetingField>;

const Greetings = () => {
  useSetAdminPageMeta({ description: 'Your welcome message, hold music, voicemail greeting and ring tone.' });

  const [schemaContext, setSchemaContext] = useState<any>(null);
  const hasHydratedGreetingsRef = useRef(false);
  /* The record as it arrived, kept so Discard has something to put back. */
  const [baseline, setBaseline] = useState<string | null>(null);
  const isStarterPlan = useIsStarterPlan();
  const methods = useForm({
    mode: 'all',
    defaultValues: { greetings: greetingsInitialState },
    resolver: yupResolver(upsertUserSettingsSchema[FORWARDING_TAB_CONSTANT.GREETING_NOTIFICATION]),
    context: { schemaContext },
  });
  const queryClient: any = useQueryClient();

  /* The company rule the Preferences page already honours, read here too: a
     recording the company has locked is shown greyed out with the same note,
     instead of being editable on this page and silently ignored by the switch
     (which plays the company's choice whenever the row is locked). The query is
     shared with the Preferences page, so this costs no extra request. */
  const companyPolicy = useCompanyPolicy({ enabled: true });
  const isSlotLocked = (slot: GreetingSlot) =>
    companyPolicy.isActive && !companyPolicy.allowsGreeting(slot);

  const { data: userInfoData } = useUserDetails();

  const { handleSubmit, reset, watch } = methods;
  const { dirtyFields, isDirty } = methods.formState;
  const { mutate: mutateGreetingSettings, isPending: PendingGreetingSetting } = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: () => {
      handleAlert({
        text: 'Greetings saved',
        type: 'success',
      });
      /* Re-hydration is gated on a ref that is only ever set once, so without
         clearing it the refetch below would leave the form dirty forever. */
      hasHydratedGreetingsRef.current = false;
      invalidateUserDetails(queryClient);
      invalidateGlobalUsersDirectory(queryClient);
    },
  });

  const onSubmit = () => {
    const greetings: any = watch('greetings');
    const greetingsRequest = {
      welcome: getGreetingConfig('welcome_greeting', greetings),
      voicemail: getGreetingConfig('voicemail', greetings),
      ring_tone: getGreetingConfig('ring_tone', greetings),
      hold: getGreetingConfig('on_hold_music', greetings),
    };

    const payload = {
      key: 'greetings',
      value: greetingsRequest,
    };
    mutateGreetingSettings(payload);
  };

  const getGreetingConfig = (
    key: string,
    greetings: GreetingsMap,
  ): {
    enabled?: boolean;
    label?: string;
    value?: string;
    uuid?: string;
    is_default?: boolean | number;
  } => ({
    enabled: greetings?.[key]?.enabled,
    label: greetings?.[key]?.value?.label,
    value: greetings?.[key]?.value?.value,
    /* Without these two, a stock recording that plays fine right after picking
       it stops playing the moment the page reloads: the player only knows to
       fetch from the shared default path (not this company's folder, where a
       stock file does not exist) when it can see is_default or a uuid on the
       recognised list — see greeting-select.tsx's own note. Losing them here,
       at save, is what "Unable to load this recording." on a saved default
       traces back to. */
    uuid: greetings?.[key]?.value?.uuid,
    is_default: greetings?.[key]?.value?.is_default,
  });

  useEffect(() => {
    if (!userInfoData || hasHydratedGreetingsRef.current) return;

    const greetingInfo =
      typeof userInfoData.greetings === 'string'
        ? JSON.parse(userInfoData.greetings)
        : (userInfoData.greetings ?? {});

    const keys: GreetingKey[] = ['welcome_greeting', 'voicemail', 'ring_tone', 'on_hold_music'];

    const formattedGreetings = keys.reduce<GreetingsForm>((acc, key) => {
      const apiKey =
        key === 'welcome_greeting' ? 'welcome' : key === 'on_hold_music' ? 'hold' : key;
      const target = greetingInfo?.[key] || greetingInfo?.[apiKey];
      acc[key] = {
        enabled: !!target?.enabled,
        override: !!target?.override,
        value: {
          label: target?.label ?? '',
          value: target?.value ?? '',
          uuid: target?.uuid,
          is_default: target?.is_default,
        },
      };
      return acc;
    }, {} as GreetingsForm);

    hasHydratedGreetingsRef.current = true;
    reset(
      { greetings: formattedGreetings },
      {
        keepDirtyValues: true,
      },
    );
    setBaseline(JSON.stringify(formattedGreetings));
  }, [dirtyFields, reset, userInfoData]);

  useEffect(() => {
    const subscription = watch((value) => {
      setSchemaContext(value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  /* Read off the live form rather than the saved record, so the count tracks
     an unsaved change. "Set to your own recording" means the slot is on AND a
     file is picked — a slot switched on with nothing chosen is not finished,
     and counting it as though it were is how a half-done page looks done. */
  const greetings: any = watch('greetings');
  const slotKeys: GreetingKey[] = isStarterPlan
    ? ['welcome_greeting', 'voicemail', 'ring_tone']
    : ['welcome_greeting', 'on_hold_music', 'voicemail', 'ring_tone'];
  const chosenCount = slotKeys.filter(
    (key) => greetings?.[key]?.enabled && greetings?.[key]?.value?.value,
  ).length;

  return (
    <section className="mcm-page mcm-admin mcm-acct">
      <div className="mcm-acct-body">
        <div className="mcm-acct-narrow">
          {/* The switch plays the person's voicemail greeting on a direct
              call (patch of 3 Sep 2026); the other three slots are still
              saved and not read, so the note keeps the two apart. */}
          <p className="text-[#9A948F] text-xs mb-3">
            Callers hear your voicemail greeting today. The other three are saved for when the
            switch plays them.{' '}
            <Link to="/admin-settings/phone/media?mine=1" className="text-ucass-active underline-offset-4 hover:underline">
              Your recordings in the media library
            </Link>
          </p>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <GreetingSlots isSlotLocked={isSlotLocked} />

              {isDirty && (
                <div className="mcm-savebar" role="status">
                  <span className="mcm-savebar-dot" aria-hidden="true" />
                  <span className="mcm-savebar-text">
                    Unsaved changes
                    <span className="mcm-savebar-sub">
                      {chosenCount === 0
                        ? 'Callers will hear the account default until you pick a recording.'
                        : `${chosenCount} of ${slotKeys.length} set to your own recording.`}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="mcm-savebar-discard"
                    onClick={() => {
                      if (baseline) reset({ greetings: JSON.parse(baseline) });
                    }}
                    disabled={PendingGreetingSetting}
                  >
                    Discard
                  </button>
                  {/* The `.mcm-page button` reset strips this button's background
                      and text colour, so `!` forces them back — same as the other
                      account pages. As on Preferences: saving before the company
                      rule has arrived could write a value the company does not
                      allow, so the button waits for it. */}
                  <Button
                    variant={'primary'}
                    type="submit"
                    disabled={PendingGreetingSetting || companyPolicy.isLoading}
                    className="!bg-primary !text-white !border-primary hover:!bg-primary/90 min-w-[128px] justify-center"
                  >
                    {PendingGreetingSetting ? 'Saving…' : 'Save changes'}
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

export default Greetings;

import { Button } from '@/components/ui/button';
import { handleAlert } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { FORWARDING_TAB_CONSTANT, greetingsInitialState } from '@/pages/admin-settings/constants';
import { upsertUserSettingsSchema } from '@/pages/admin-settings/people/update-forwarding/schema';
import { getUserDetails, updateUserSettings } from '@/services/api';
import { useIsStarterPlan } from '@/hooks/use-is-starter-plan';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import AccountPageHead from '../account-page-head';
import GreetingSlots from './greeting-slots';
import '@/components/mcm/mcm-page.css';

type GreetingValue = {
  label?: string;
  value?: string;
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
  };
}

type GreetingsForm = Record<GreetingKey, GreetingField>;

const Greetings = () => {
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

  const { data: userInfoData } = useQuery({
    queryKey: ['getUserDetailsForGreetings'],
    queryFn: getUserDetails,
    select: (data) => data?.data?.data?.result,
  });

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
      queryClient.invalidateQueries({ queryKey: ['getUserDetailsForGreetings'] });
      queryClient.invalidateQueries({ queryKey: ['getUsersDetails'] });
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
  ): { enabled?: boolean; label?: string; value?: string } => ({
    enabled: greetings?.[key]?.enabled,
    label: greetings?.[key]?.value?.label,
    value: greetings?.[key]?.value?.value,
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
      <AccountPageHead
        title="Greetings"
        about="The audio on your extension: the message that answers, the music while somebody waits, and what they hear if you do not pick up."
      >
        <span className={`mcm-gcount${chosenCount ? ' is-custom' : ''}`}>
          <span className="mcm-gcount-n">{chosenCount}</span>
          <span className="mcm-gcount-l">of {slotKeys.length} use your own recording</span>
        </span>
      </AccountPageHead>

      <div className="mcm-acct-body">
        <div className="mcm-acct-narrow">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <GreetingSlots />

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
                      account pages. */}
                  <Button
                    variant={'primary'}
                    type="submit"
                    disabled={PendingGreetingSetting}
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

import { Button } from '@/components/ui/button';
import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
import { handleAlert } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { FORWARDING_TAB_CONSTANT, greetingsInitialState } from '@/pages/admin-settings/constants';
import GreetingNotification from '@/pages/admin-settings/people/update-forwarding/greetings';
import { upsertUserSettingsSchema } from '@/pages/admin-settings/people/update-forwarding/schema';
import { getUserDetails, updateUserSettings } from '@/services/api';
import { useIsStarterPlan } from '@/hooks/use-is-starter-plan';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { BellRing, Megaphone, Music2, Voicemail } from 'lucide-react';
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

/* The four slots, in the order a caller meets them: the greeting that answers,
   the music while they wait, the message if you do not pick up, and the tone
   you hear at your own desk. The editor below lists them in the order the
   shared component happens to declare them; this is the order that makes sense
   to read. */
const SLOTS: { key: GreetingKey; label: string; icon: React.ReactNode; hint: string }[] = [
  {
    key: 'welcome_greeting',
    label: 'Welcome message',
    icon: <Megaphone className="h-4 w-4" aria-hidden="true" />,
    hint: 'Played when a call reaches you.',
  },
  {
    key: 'on_hold_music',
    label: 'Hold music',
    icon: <Music2 className="h-4 w-4" aria-hidden="true" />,
    hint: 'Played while a caller waits.',
  },
  {
    key: 'voicemail',
    label: 'Voicemail',
    icon: <Voicemail className="h-4 w-4" aria-hidden="true" />,
    hint: 'Played before the beep.',
  },
  {
    key: 'ring_tone',
    label: 'Ring tone',
    icon: <BellRing className="h-4 w-4" aria-hidden="true" />,
    hint: 'What you hear when a call comes in.',
  },
];

const Greetings = () => {
  useSetAdminPageMeta({ description: 'The recordings callers hear on your extension — welcome message, hold music and voicemail.' });

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

  /* What a caller actually gets, read off the live form rather than the saved
     record so it tracks an unsaved change. A slot switched off is not blank —
     it falls back to the account default — and saying so is the difference
     between "nothing is set up" and "nothing of mine is set up". Hold music is
     dropped on the starter plan for the same reason the editor drops it. */
  const greetings: any = watch('greetings');
  const visibleSlots = SLOTS.filter((slot) => !isStarterPlan || slot.key !== 'on_hold_music');
  const chosenCount = visibleSlots.filter(
    (slot) => greetings?.[slot.key]?.enabled && greetings?.[slot.key]?.value?.value,
  ).length;

  return (
    <section className="mcm-page mcm-admin mcm-acct">
      <div className="mcm-acct-body">
        <div className="mcm-acct-narrow">
          {/* The answer to "what does a caller actually hear", which the editor
              below never states — it shows four switches and a file picker, and
              leaves the outcome to be worked out from them. */}
          <div className="mcm-lineband">
            {visibleSlots.map((slot) => {
              const item = greetings?.[slot.key];
              const on = Boolean(item?.enabled);
              const chosen = String(item?.value?.label || '').trim();
              const value = !on ? 'Account default' : chosen || 'Nothing chosen';
              const isFallback = !on || !chosen;
              return (
                <div key={slot.key} className="mcm-lineband-item">
                  <span className="mcm-lineband-ico">{slot.icon}</span>
                  <div className="min-w-0">
                    <p className="mcm-lineband-k">{slot.label}</p>
                    <p className={`mcm-lineband-v${isFallback ? ' is-empty' : ''}`}>{value}</p>
                    <p className="mcm-lineband-hint">
                      {on && !chosen ? 'Switched on with no recording picked.' : slot.hint}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* The page scrolls as one column, so the editor no longer needs
                  to be its own inner scroller with a hand-computed height. */}
              <GreetingNotification customClass="" />

              {isDirty && (
                <div className="mcm-savebar" role="status">
                  <span className="mcm-savebar-dot" aria-hidden="true" />
                  <span className="mcm-savebar-text">
                    Unsaved changes
                    <span className="mcm-savebar-sub">
                      {chosenCount === 0
                        ? 'Callers will hear the account default until you pick a recording.'
                        : `${chosenCount} of ${visibleSlots.length} set to your own recording.`}
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

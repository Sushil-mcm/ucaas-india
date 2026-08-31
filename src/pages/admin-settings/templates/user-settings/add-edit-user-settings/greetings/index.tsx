import SelectGreeting from '@/components/custom/greeting-select';
import { SettingCard, SettingNest, SettingRow } from '@/components/mcm/setting-card';
import { Switch } from '@/components/ui/switch';
import { GreetingItem, useGetGreetings } from '@/hooks/common';
import { useIsStarterPlan } from '@/hooks/use-is-starter-plan';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

interface ICompanyInfo {
  plan_features?: string;
}

interface IGREETINGPROPS {
  company_info: ICompanyInfo;
}

const GreetingNotification: FC<IGREETINGPROPS> = () => {
  const { greetingList, voicemailList } = useGetGreetings();
  const isStarterPlan = useIsStarterPlan();
  const optionsData: Record<string, GreetingItem[]> = {
    welcome_greeting: greetingList,
    on_hold: greetingList,
    on_hold_music: greetingList,
    ring_tone: greetingList,
    voicemail: voicemailList,
  };

  const {
    formState: { errors },
    watch,
    setValue,
  } = useFormContext();

  const watchMedia = watch('greetings');

  const mediaOptionsGreetingNotifications = [
    {
      name: 'welcome_greeting',
      placeholder: 'Welcome',
      label: 'welcome',
      title: 'Welcome message',
      blurb: 'Played as soon as the call is answered, before it rings anybody.',
    },
    {
      name: 'on_hold_music',
      placeholder: 'On Hold Music',
      label: 'on hold music',
      title: 'On-hold music',
      blurb: 'What the caller hears while they are holding.',
    },
    {
      name: 'voicemail',
      title: 'Voicemail message',
      blurb: 'What the caller hears before they leave a message.',
      placeholder: 'Voicemail',
      label: 'voicemail',
    },
    {
      name: 'ring_tone',
      placeholder: 'Ring Tone',
      label: 'ring tone',
      title: 'Ringback tone',
      blurb: 'What the caller hears instead of the usual ringing while they wait.',
    },
  ].filter(({ name }) => !isStarterPlan || !['hold', 'on_hold_music'].includes(name)) as {
    name: string;
    placeholder: string;
    label: string;
    title: string;
    blurb: string;
  }[];

  const onChangeMedia = (name: string, status: boolean) => {
    setValue(`greetings.${name}.enabled`, status, { shouldValidate: true });
    setValue(`greetings.${name}.value`, {} as ISELECTVALUE);
  };

  return (
    <div className="user-settings-template-greetings flex h-[calc(100vh_-_15rem)] flex-col gap-4 overflow-auto pt-2">
      <SettingCard
        title="Recorded messages"
        description="What a caller hears at each point. Each one is off until you turn it on and choose a recording."
        status="coming-soon"
        note="Your choices are saved, but no caller hears them yet — call routing does not play recordings at all. Nothing is lost: whatever you set here starts playing when it does."
      >
        {mediaOptionsGreetingNotifications.map(({ name, label, title, blurb }) => (
          <div key={name} className="user-settings-template-greeting-row">
            <SettingRow
              label={title}
              description={blurb}
              control={
                <Switch
                  checked={!!watchMedia?.[name]?.enabled}
                  onCheckedChange={(checked: boolean) => onChangeMedia(name, checked)}
                />
              }
            />

            {/* The picker only appears once the message is switched on. There is
                nothing to choose before that, and a greyed-out picker still reads
                as something you could use. */}
            <SettingNest when={!!watchMedia?.[name]?.enabled}>
              <SettingRow
                label="Which recording"
                description="Upload a new one, or pick something already recorded."
              >
                <SelectGreeting
                  name={name == 'voicemail' ? 'voicemail' : 'greeting'}
                  isShowUpload={name !== 'ring_tone'}
                  onChangeMedia={(e) =>
                    setValue(`greetings.${name}.value`, e as ISELECTVALUE, {
                      shouldValidate: true,
                    })
                  }
                  options={optionsData[name]?.map((item: GreetingItem) => ({
                    label: item.name,
                    value: item.filename,
                  }))}
                  value={watch(`greetings.${name}.value`)}
                  errors={(errors.greetings as any)?.[name]?.value?.value?.message}
                />
              </SettingRow>

              {/* `override` reads as jargon on a screen a customer uses. What it
                  actually decides is whether a person may swap this recording on
                  their own phone, so that is what it now says. */}
              <SettingRow
                label="Let people choose their own"
                description={`Off, everybody uses this ${label} recording. On, a person may pick a different one for themselves.`}
                control={
                  <Switch
                    checked={!!watch(`greetings.${name}.override`)}
                    onCheckedChange={(checked: boolean) =>
                      setValue(`greetings.${name}.override`, checked)
                    }
                  />
                }
              />
            </SettingNest>
          </div>
        ))}
      </SettingCard>
    </div>
  );
};

export default GreetingNotification;

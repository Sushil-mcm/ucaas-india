import { getUserDetails, updateUserSettings } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { NOTIFICATION_SETTINGS_INITIAL, NOTIFICATION_TYPES_LIST } from '../constant';
import { handleAlert } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import PhoneInput from 'react-phone-input-2';
import { BellOff, MessageSquareText, PhoneMissed, Voicemail } from 'lucide-react';
import { isUnchanged } from '@/lib/form-baseline';
import AccountPageHead from '../account-page-head';
import '@/components/mcm/mcm-page.css';

/* What the save bar compares, which is not the raw form values.
 *
 * Switching text alerts on fills the number in from the person's record.
 * Switching them back off leaves that number sitting in the form, so the
 * values no longer matched the ones that loaded and the bar stayed up over a
 * screen nobody had changed. `onSubmit` already blanks the number of any event
 * whose text alerts are off, so this applies the same rule one step earlier
 * and the comparison is against what would actually be written. */
const comparable = (values: any) => {
  if (!values || typeof values !== 'object') return values;
  const out: Record<string, any> = {};
  Object.entries(values).forEach(([key, event]: [string, any]) => {
    out[key] =
      event && typeof event === 'object' ? { ...event, phone: event.sms ? event.phone : '' } : event;
  });
  return out;
};

/* One icon per event, in one stroke weight and one colour, rather than the two
   bare bordered circles and a green glyph this had — three different visual
   languages for three rows of the same table. */
const EVENT_ICONS: Record<string, React.ReactNode> = {
  voicemail: <Voicemail className="h-4 w-4" aria-hidden="true" />,
  missed: <PhoneMissed className="h-4 w-4" aria-hidden="true" />,
  sms: <MessageSquareText className="h-4 w-4" aria-hidden="true" />,
};

const SettingsNotification = () => {
  const { data: userInfoData } = useQuery({
    queryKey: ['getUserDetailsForNotification'],
    queryFn: getUserDetails,
    select: (data) => data?.data?.data?.result,
  });

  const queryClient: any = useQueryClient();
  /* Snapshot of the record as it arrived. The switches below are written with
     `setValue` and no `shouldDirty`, so `formState.isDirty` never leaves false
     however much is changed; comparing against this is independent of that. */
  const [baseline, setBaseline] = useState<string | null>(null);
  const { setValue, watch, handleSubmit, reset, getValues } = useForm<any>({
    mode: 'all',
    defaultValues: NOTIFICATION_SETTINGS_INITIAL,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userInfo'] });
      queryClient.invalidateQueries({ queryKey: ['getUserDetailsForNotification'] });
      invalidateGlobalUsersDirectory(queryClient);
      setBaseline(JSON.stringify(getValues()));
      handleAlert({
        text: 'Notification settings saved',
        type: 'success',
      });
    },
  });

  useEffect(() => {
    if (userInfoData) {
      const stored = userInfoData?.notification_settings?.notification_settings;
      /* Merged onto the defaults rather than replacing them. A record saved
         before a channel existed has no key for it, and `reset` with a partial
         object leaves that field undefined — which hands the switch to Radix's
         own state instead of the form's. */
      const next = {
        ...NOTIFICATION_SETTINGS_INITIAL,
        ...(stored || {}),
      };
      reset(next);
      setBaseline(JSON.stringify(next));
    }
  }, [userInfoData]);

  const onSubmit = (data: any) => {
    const formattedData = { ...data };

    Object.keys(formattedData).forEach((key) => {
      if (formattedData[key] && typeof formattedData[key] === 'object') {
        if (formattedData[key].sms === false) {
          formattedData[key].phone = '';
        }
      }
    });

    const payload = {
      key: 'notification_settings',
      value: {
        notification_settings: {
          ...formattedData,
          forgot_password: {
            email: true,
            socket: false,
            sms: true,
            push: false,
          },
        },
      },
    };

    mutate(payload);
  };

  const current = watch();
  const hasUnsavedChanges = Boolean(
    baseline && !isUnchanged(comparable(JSON.parse(baseline)), comparable(current)),
  );

  /* An event with every channel switched off reaches the person nowhere. That
     was already flagged per row; counting it in the page head means somebody
     scanning the screen sees it before they scroll. */
  const silentCount = NOTIFICATION_TYPES_LIST.filter(
    (item) => !item.settingsType.some(({ value }) => watch(`${item.value}.${value}`)),
  ).length;

  const channels = NOTIFICATION_TYPES_LIST[0].settingsType;

  return (
    <section className="mcm-page mcm-admin mcm-acct">
      <AccountPageHead
        title="Notifications"
        about="What you get told about, and whether it reaches you by email, in the browser, by text or on the mobile app."
      >
        {silentCount > 0 && (
          <div className="mcm-acct-note">
            <BellOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {silentCount} of {NOTIFICATION_TYPES_LIST.length}{' '}
              {silentCount === 1 ? 'event reaches' : 'events reach'} you nowhere.
            </span>
          </div>
        )}
      </AccountPageHead>

      <div className="mcm-acct-body">
        <div className="mcm-acct-narrow">
          {/* Voicemail, missed calls and SMS all save, and nothing reads them.
              The only key any service takes out of `notification_settings` is
              `security_alert`. The missed-call script on the switch is worse
              than unwired: it is referenced by no dialplan, it posts to a
              placeholder address, and it uses `!=`, which is not valid Lua.
              Remove this notice in the same change that makes the three real —
              not before. */}
          <div className="mcm-acct-alert is-warn" role="status">
            <strong>Voicemail and missed-call alerts have stopped.</strong>
            <span>
              They worked until 24 August and are not being sent at the moment — what you choose
              here is saved and will apply again once they are running. Text message alerts have
              never been sent.
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* A grid rather than three stacked cards of four boxes each. The
                question people come here with is "which of these reaches me",
                and that is a row-against-column comparison — twelve separate
                boxes made it one they had to hold in their head. Below 900px
                the same markup stacks into a card per event, where each switch
                carries its own label. */}
            <div className="mcm-notif" role="table" aria-label="Notification channels">
              <div className="mcm-notif-head" role="row">
                <span className="mcm-notif-corner" role="columnheader">
                  Tell me about
                </span>
                {channels.map((channel) => (
                  <span key={channel.value} className="mcm-notif-ch" role="columnheader">
                    {channel.label}
                    <em>{channel.hint}</em>
                  </span>
                ))}
              </div>

              {NOTIFICATION_TYPES_LIST.map((item) => {
                const smsOn = Boolean(watch(`${item.value}.sms`));
                const silent = !item.settingsType.some(({ value }) => watch(`${item.value}.${value}`));
                return (
                  <div className="mcm-notif-row" role="row" key={item.id}>
                    <div className="mcm-notif-ev" role="rowheader">
                      <span className="mcm-notif-ev-ico" aria-hidden="true">
                        {EVENT_ICONS[item.value]}
                      </span>
                      <div className="min-w-0">
                        {/* The "reaches you nowhere" marker sits on the name's
                            own line rather than under the description. On its
                            own line it appeared and disappeared as switches
                            were flipped, taking 20px of row height with it and
                            shoving the two rows below up and down — the grid
                            twitched every time somebody changed anything. The
                            line it now shares is held open to a fixed height,
                            so the marker costs nothing to show or hide. */}
                        <p className="mcm-notif-ev-n">
                          <span className="truncate">{item.name}</span>
                          {silent && <span className="mcm-notif-silent">You will not be told</span>}
                        </p>
                        <p className="mcm-notif-ev-d">{item.description}</p>
                      </div>
                    </div>

                    {item.settingsType.map(({ label, value }: any) => {
                      /* A text message about a text message: this one cell of
                         the grid is not a setting at all. */
                      const notApplicable = item.id === 3 && value === 'sms';
                      const on = Boolean(watch(`${item.value}.${value}`));

                      /* A dash, which is what a table says for "this does not
                         apply", rather than a switch at 55% opacity. The
                         switch had to explain itself through a `title`, and a
                         `title` is a raw browser tooltip — an unstyled box
                         that appears under the pointer a second after it
                         arrives, which is the one thing this grid did not
                         need more of. Nothing to hover, nothing to explain. */
                      if (notApplicable) {
                        return (
                          <div key={value} className="mcm-notif-cell is-na">
                            <span className="mcm-notif-cell-k">{label}</span>
                            <span className="mcm-notif-na" aria-hidden="true">
                              &mdash;
                            </span>
                            <span className="sr-only">
                              Not available: a text message is not sent about a text message.
                            </span>
                          </div>
                        );
                      }

                      return (
                        <label
                          key={value}
                          className={`mcm-notif-cell${on ? ' is-on' : ''}`}
                        >
                          <span className="mcm-notif-cell-k">{label}</span>
                          <Switch
                            className="cursor-pointer"
                            onCheckedChange={(checked) => {
                              setValue(`${item.value}.${value}`, checked);
                              if (checked && value === 'sms' && !watch(`${item.value}.phone`)) {
                                setValue(`${item.value}.phone`, userInfoData?.user_info?.phone || '');
                              }
                            }}
                            checked={on}
                          />
                        </label>
                      );
                    })}

                    {smsOn && (
                      <div className="mcm-notif-phone">
                        <label className="mcm-notif-phone-k" htmlFor={`phone-${item.value}`}>
                          Send texts about {item.name.toLowerCase()} to
                        </label>
                        <PhoneInput
                          country={'us'}
                          inputProps={{ id: `phone-${item.value}` }}
                          value={watch(`${item.value}.phone`) || ''}
                          onChange={(value) => setValue(`${item.value}.phone`, value)}
                        />
                        {/* Kept, but no longer written as a live warning:
                            nothing is sent, so nothing is charged today. */}
                        <p className="mcm-notif-phone-d">
                          Text messages are charged per message once they are switched on.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {hasUnsavedChanges && (
              <div className="mcm-savebar" role="status">
                <span className="mcm-savebar-dot" aria-hidden="true" />
                <span className="mcm-savebar-text">
                  Unsaved changes
                  <span className="mcm-savebar-sub">
                    These change what reaches you, not what your colleagues get.
                  </span>
                </span>
                <button
                  type="button"
                  className="mcm-savebar-discard"
                  onClick={() => {
                    if (baseline) reset(JSON.parse(baseline));
                  }}
                  disabled={isPending}
                >
                  Discard
                </button>
                {/* The `.mcm-page button` reset strips this button's background
                    and text colour, so `!` forces them back — same as the other
                    account pages. */}
                <Button
                  variant={'primary'}
                  type="submit"
                  disabled={isPending}
                  className="!bg-primary !text-white !border-primary hover:!bg-primary/90 min-w-[128px] justify-center"
                >
                  {isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default SettingsNotification;

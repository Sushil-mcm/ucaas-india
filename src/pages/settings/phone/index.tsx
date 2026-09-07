import CallRules from '@/pages/admin-settings/people/update-forwarding/call-rules';
import { getUserDetails, updateUserSettings, userUpdateStatus } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { phoneSettingsSchema } from './schema';
import { handleAlert } from '@/lib/utils';
import { RING_TYPE_LABELS, RINGING_OPTIONS } from '@/constants/forwarding-consts';
import { Button } from '@/components/ui/button';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { mergeCallForwarding } from '@/lib/call-forwarding-record';
import { Hash, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { isUnchanged } from '@/lib/form-baseline';
import AccountPageHead from '../account-page-head';
import '@/components/mcm/mcm-page.css';

/* What the save bar compares, which is not the raw form values.
 *
 * The switches on this screen do not toggle a flag — they rewrite the rule's
 * whole object as they go. Turning Forward All Calls off writes a fresh
 * default destination rather than restoring the one that was there, and
 * turning a device off resets its ring time to "6 times / 30 secs". So a
 * switch flipped on and straight back off left the form holding different
 * values from the ones it loaded, and the save bar stayed up over a screen
 * nobody had changed.
 *
 * A rule that is switched off has no destination, and a device that is
 * switched off has no ring time — neither reaches a caller, and neither is
 * visible on the page while it is off. Reducing both to "off" on each side of
 * the comparison is what somebody looking at the screen means by "I have not
 * changed anything". What gets saved is untouched: this only decides whether
 * the bar is up. */
const comparable = (rules: any) => {
  if (!rules || typeof rules !== 'object') return rules;
  const next: any = { ...rules };

  if (next.forwardCall && !next.forwardCall.enabled) {
    next.forwardCall = { enabled: false };
  }

  const devices = next.incomingCall?.deviceOptions;
  if (devices && typeof devices === 'object') {
    next.incomingCall = {
      ...next.incomingCall,
      deviceOptions: Object.fromEntries(
        Object.entries(devices).map(([key, device]: [string, any]) => [
          key,
          device?.status ? device : { status: false },
        ]),
      ),
    };
  }

  return next;
};

const IncomingCalls = () => {
  const [schemaContext, setSchemaContext] = useState(null);
  /* Serialised copy of the call rules as they arrived, so "has anything
     changed" is a comparison rather than a flag something else has to set.
     `formState.isDirty` is no use here: every control on this page belongs to
     the shared CallRules component, which writes through `setValue` without
     `shouldDirty`, so the flag never leaves false however much you change.
     This snapshot is also what Discard restores. */
  const [baselineRules, setBaselineRules] = useState<string | null>(null);
  const queryClient: any = useQueryClient();
  const { socketEventsManager } = useSocketEvents();
  const { user } = useUser();
  const { data: userDetails } = useQuery({
    queryKey: ['userInfoForPhoneSettings'],
    queryFn: getUserDetails,
    select: (data) => data?.data?.data?.result || [],
  });
  const methods = useForm<any>({
    mode: 'all',
    defaultValues: { CallRules },
    resolver: yupResolver(phoneSettingsSchema),
    context: { schemaContext },
  });

  const { setValue, watch } = methods;

  useEffect(() => {
    const subscription = watch((value) => {
      setSchemaContext(value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const { handleSubmit } = methods;

  /* The dropdown below hydrates to "Send to Voicemail" whenever nothing is
     stored, so this screen shows voicemail on an account that has never saved
     one — and the switch, having no rule, hangs up on the caller instead. That
     mismatch is invisible, so it is called out rather than left to be
     discovered by someone ringing the number. */
  const storedRules =
    typeof userDetails?.call_forwarding === 'string'
      ? (() => {
          try {
            return JSON.parse(userDetails?.call_forwarding || '{}');
          } catch {
            return {};
          }
        })()
      : userDetails?.call_forwarding || {};
  const fallbackSaved = Boolean(storedRules?.incoming_calls?.failure_action?.type);

  const { mutate: mutateUpdateMember, isPending: isPendingUpdateMember } = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['userInfoForPhoneSettings', 'getUsersDetails'], {
        exact: true,
      });
      invalidateGlobalUsersDirectory(queryClient);
      handleAlert({
        text: data?.data?.message || 'Settings updated successfully!',
        type: 'success',
      });
    },
  });

  const onSubmit = () => {
    const callRules = watch('callRules');
    const settings =
      typeof userDetails?.settings === 'string'
        ? JSON.parse(userDetails?.settings || '{}')
        : userDetails?.settings;

    const is24Hours = settings?.operational_hours?.type === '24_hours';
    const deviceOptionsSorted = Object.entries(callRules?.incomingCall?.deviceOptions || {})
      .map(([key, value]) => ({ key, ...(value as { order: number }) }))
      .sort((a, b) => a.order - b.order);

    const selectedUser = {
      name: `${userDetails?.user_info?.first_name}${userDetails?.user_info?.last_name ? ` ${userDetails?.user_info?.last_name}` : ''}`,
      extension: userDetails?.user_info?.extension || '',
    };
    const callRuleRequest = {
      forward_calls: {
        enabled: callRules?.forwardCall?.enabled,
        type: callRules?.forwardCall?.type?.value,
        type_label: callRules?.forwardCall?.type?.label,
        value_label: callRules?.forwardCall?.value?.label || 'Select',
        value:
          callRules?.forwardCall?.type?.value === 'VOICEMAIL' && callRules?.forwardCall?.personal
            ? selectedUser?.extension
            : callRules?.forwardCall?.value?.value,
        name:
          callRules?.forwardCall?.type?.value === 'VOICEMAIL' && callRules?.forwardCall?.personal
            ? selectedUser?.name
            : callRules?.forwardCall?.value?.name || selectedUser?.name,
        personal: callRules?.forwardCall?.personal,
      },
      status: callRules?.status,
      incoming_calls: {
        enabled: callRules?.incomingCall?.enabled,
        device_options: transformPayloadNew(deviceOptionsSorted),
        type: callRules?.incomingCall?.deviceOptionValue?.value,
        failure_action: {
          enabled: true,
          type: callRules?.failureAction?.type?.value,
          type_label: callRules?.failureAction?.type?.label,
          value_label: callRules?.failureAction?.value?.label || 'Select',
          value:
            callRules?.failureAction?.type?.value === 'VOICEMAIL' &&
            callRules?.failureAction?.personal
              ? selectedUser?.extension || ''
              : callRules?.failureAction?.value?.value,
          name:
            callRules?.failureAction?.type?.value === 'VOICEMAIL' &&
            callRules?.failureAction?.personal
              ? selectedUser?.name
              : callRules?.failureAction?.value?.name || selectedUser?.name,
          personal: callRules?.failureAction?.personal,
        },
        ...(!is24Hours && {
          closed_hour_action: {
            enabled: true,
            type: callRules?.closedHoursAction?.type?.value,
            type_label: callRules?.closedHoursAction?.type?.label,
            value_label: callRules?.closedHoursAction?.value?.label || 'Select',
            value:
              callRules?.closedHoursAction?.type?.value === 'VOICEMAIL' &&
              callRules?.closedHoursAction?.personal
                ? selectedUser?.extension || ''
                : callRules?.closedHoursAction?.value?.value,
            name:
              callRules?.closedHoursAction?.type?.value === 'VOICEMAIL' &&
              callRules?.closedHoursAction?.personal
                ? selectedUser?.name
                : callRules?.closedHoursAction?.value?.name || selectedUser?.name,
            personal: callRules?.closedHoursAction?.personal,
          },
        }),
      },
      outgoing_calls: {
        enabled: callRules?.outgoingCall?.enabled,
        default_caller_id: callRules?.outgoingCall?.defaultCallerId?.value || '',
        default_fax_id: callRules?.outgoingCall?.defaultFaxId,
        default_text_id: callRules?.outgoingCall?.defaultTextId,
        ring_out: callRules?.outgoingCall?.ringOut,
        region: callRules?.outgoingCall?.region,
      },
    };
    /* Only the keys above belong to this screen. Everything else already on the
       record — the person's do-not-disturb among them — is carried through, so
       saving here does not delete what another screen owns. */
    const payload = {
      value: mergeCallForwarding(userDetails?.call_forwarding, callRuleRequest),
      key: 'call_forwarding',
    };

    const status = callRules?.status;

    socketEventsManager?.emit('user-presence-update', {
      doc: {
        userId: user?.user_info?.extension,
        domain: user?.sip_credentials?.domain,
        uuid: user?.uuid,
        status,
        onCall: false,
        timeObj: {
          holiday_start_date: null,
          holiday_end_date: null,
        },
      },
    });

    handleStatusChange(status);
    mutateUpdateMember(payload);
  };

  function transformPayloadNew(res: any) {
    return res.map((item: any) => ({
      type: item?.type || 'web',
      status: item.status ?? false,
      label: item.value.label || '',
      value:
        item?.key === 'web' ? userDetails?.user_info?.extension || '' : item.option?.value || '',
      name:
        item?.key === 'web'
          ? `${userDetails?.user_info?.first_name}${userDetails?.user_info?.last_name ? ` ${userDetails?.user_info?.last_name}` : ''}` ||
            ''
          : item.option?.label || '',
      timeout: item.value.value,
    }));
  }

  function statusChangeEvent(status: string, timeObj: any = undefined) {
    socketEventsManager?.emit(
      'user-presence-update',
      {
        doc: {
          userId: user?.user_info?.extension,
          domain: user?.sip_credentials?.domain,
          uuid: user?.uuid,
          status: status,
          onCall: false,
          timeObj,
        },
      },
      () => {},
    );
  }

  const { mutate: mutateUserUpdateStatus } = useMutation({
    mutationFn: userUpdateStatus,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries(['getUsersDetails']);
      statusChangeEvent(variables?.socket_status, {
        holiday_start_date: null,
        holiday_end_date: null,
      });
    },
  });

  const handleStatusChange = async (status: string) => {
    if (user?.socket_status === status) return;
    mutateUserUpdateStatus({ socket_status: status });
  };
  useEffect(() => {
    if (userDetails?.call_forwarding) {
      const callHandlingData =
        typeof userDetails?.call_forwarding === 'string'
          ? JSON.parse(userDetails?.call_forwarding || '{}')
          : userDetails?.call_forwarding;
      const { incoming_calls = {}, outgoing_calls = {}, forward_calls = {} } = callHandlingData;

      const deviceOptionsArray = incoming_calls?.device_options || [];

      const deviceOptionsObject: any = {};

      if (deviceOptionsArray.length > 0) {
        deviceOptionsArray.forEach((item: any) => {
          const type = item?.type || 'web';
          const typeKey =
            userDetails?.user_info?.extension !== item?.value ? item?.name || 'web' : type;

          deviceOptionsObject[typeKey] = {
            status: item?.status,
            isDefault: item?.isDefault,
            type,
            value: {
              label: item?.label,
              value: item?.timeout,
            },
            option: {
              label: item?.name,
              value: item?.value,
            },
          };
        });

        if (!deviceOptionsObject.mobile) {
          deviceOptionsObject.mobile = {
            status: true,
            value: RINGING_OPTIONS?.[0],
            type: 'mobile',
            option: {
              label: `${userDetails?.user_info?.first_name}${userDetails?.user_info?.last_name ? ` ${userDetails?.user_info?.last_name}` : ''}`,
              value: userDetails?.user_info?.extension || '',
            },
          };
        }

        if (!deviceOptionsObject.pstn) {
          deviceOptionsObject.pstn = {
            status: true,
            value: RINGING_OPTIONS?.[0],
            type: 'pstn',
            option: {
              label: `${userDetails?.user_info?.first_name}${userDetails?.user_info?.last_name ? ` ${userDetails?.user_info?.last_name}` : ''}`,
              value: userDetails?.user_info?.extension || '',
            },
          };
        }
      } else {
        deviceOptionsObject.web = {
          status: true,
          value: RINGING_OPTIONS?.[0],
          type: 'web',
          option: {
            label: `${userDetails?.user_info?.first_name}${userDetails?.user_info?.last_name ? ` ${userDetails?.user_info?.last_name}` : ''}`,
            value: userDetails?.user_info?.extension || '',
          },
        };

        deviceOptionsObject.mobile = {
          status: true,
          value: RINGING_OPTIONS?.[0],
          type: 'mobile',
          option: {
            label: `${userDetails?.user_info?.first_name}${userDetails?.user_info?.last_name ? ` ${userDetails?.user_info?.last_name}` : ''}`,
            value: userDetails?.user_info?.extension || '',
          },
        };

        deviceOptionsObject.pstn = {
          status: true,
          value: RINGING_OPTIONS?.[0],
          type: 'pstn',
          option: {
            label: `${userDetails?.user_info?.first_name}${userDetails?.user_info?.last_name ? ` ${userDetails?.user_info?.last_name}` : ''}`,
            value: userDetails?.user_info?.extension || '',
          },
        };
      }

      setValue('callRules.forwardCall', {
        enabled: forward_calls?.enabled || false,
        type: {
          label: forward_calls?.type_label || 'Send to Voicemail',
          value: forward_calls?.type || 'VOICEMAIL',
        },
        value: {
          label: forward_calls?.value_label || 'Select',
          value: forward_calls?.value || userDetails?.user_info?.extension,
        },
        personal: forward_calls?.personal ?? true,
      });

      setValue('callRules.incomingCall', {
        enabled: true,
        deviceOptions: deviceOptionsObject,
        deviceOptionValue: {
          label: RING_TYPE_LABELS[incoming_calls?.type as keyof typeof RING_TYPE_LABELS],
          value: incoming_calls?.type || 'sequential',
        },
        type: 'number',
        number: '',
        name: '',
        extension: Object.keys(deviceOptionsObject)
          .filter(
            (key: any) =>
              deviceOptionsObject?.[key]?.option?.value !== userDetails?.user_info?.extension,
          )
          .map((key: any) => ({
            label: deviceOptionsObject?.[key]?.option?.label || '',
            value: deviceOptionsObject?.[key]?.option?.value || '',
          })),
      });

      setValue('callRules.status', callHandlingData?.status ?? 'online');

      setValue('basic.extension', userDetails?.user_info?.extension);
      setValue('callRules.outgoingCall', {
        enabled: outgoing_calls?.enabled || false,
        defaultCallerId: {
          label: outgoing_calls?.default_caller_id
            ? callHandlingData?.outgoing_calls?.default_caller_id.startsWith('+')
              ? `${callHandlingData?.outgoing_calls?.default_caller_id}`
              : `+${callHandlingData?.outgoing_calls?.default_caller_id}`
            : '',
          value: outgoing_calls?.default_caller_id || '',
        },
        defaultFaxId: outgoing_calls?.default_fax_id || '',
        defaultTextId: outgoing_calls?.default_text_id || '',
        ringOut: outgoing_calls?.ring_out || false,
        region: outgoing_calls?.region || '',
      });

      setValue('callRules.failureAction', {
        enabled: incoming_calls?.failure_action?.enabled || false,
        type: {
          label: incoming_calls?.failure_action?.type_label || 'Send to Voicemail',
          value: incoming_calls?.failure_action?.type || 'VOICEMAIL',
        },
        value: {
          label: incoming_calls?.failure_action?.value_label || 'Select',
          value: incoming_calls?.failure_action?.value || userDetails?.user_info?.extension,
        },
        personal: incoming_calls?.failure_action?.personal ?? true,
      });

      setValue('callRules.closedHoursAction', {
        enabled: incoming_calls?.closed_hour_action?.enabled || false,
        type: {
          label: incoming_calls?.closed_hour_action?.type_label || 'Send to Voicemail',
          value: incoming_calls?.closed_hour_action?.type || 'VOICEMAIL',
        },
        value: {
          label: incoming_calls?.closed_hour_action?.value_label || 'Select',
          value: incoming_calls?.closed_hour_action?.value || '',
        },
        personal: incoming_calls?.closed_hour_action?.personal ?? true,
      });
    } else {
      const fallbackLabel = `${userDetails?.user_info?.first_name}${userDetails?.user_info?.last_name ? ` ${userDetails?.user_info?.last_name}` : ''}`;
      const fallbackValue = userDetails?.user_info?.extension;

      setValue('callRules.incomingCall', {
        enabled: true,
        deviceOptions: {
          web: {
            status: true,
            value: RINGING_OPTIONS?.[0],
            option: {
              label: fallbackLabel || '',
              value: fallbackValue || '',
            },
          },
        },
        deviceOptionValue: {
          label: RING_TYPE_LABELS?.sequential,
          value: 'sequential',
        },
        type: 'number',
        number: '',
        name: '',
        extension: [],
      });

      setValue('callRules.failureAction.value', {
        label: fallbackLabel,
        value: fallbackValue,
      });
      setValue('callRules.failureAction.type', { label: 'Send to Voicemail', value: 'VOICEMAIL' });
      setValue('callRules.failureAction.personal', true);
      setValue('callRules.forwardCall.value', {
        label: fallbackLabel,
        value: fallbackValue,
      });
      setValue('callRules.forwardCall.type', { label: 'Send to Voicemail', value: 'VOICEMAIL' });
      /* Written explicitly rather than left undefined. Everything that reads it
         already treats undefined as off, so this changes nothing that is saved
         — but an absent key is dropped by JSON.stringify, which made the
         snapshot below disagree with the form the moment somebody switched
         forwarding on and straight back off again. */
      setValue('callRules.forwardCall.enabled', false);

      /* Presence is not edited on this screen, but it is part of the payload it
         saves. With no stored rules there is nothing to hydrate it from, so it
         stayed undefined and Submit broadcast an undefined status and posted one
         to update-status. The person's current availability is the truthful
         value for a record that has never stored one. */
      setValue('callRules.status', user?.socket_status || 'online');
    }
    /* Taken after the branch above has finished writing, so it is the record as
       it arrived rather than a half-populated form. Everything below compares
       against this to decide whether there is anything to save. */
    setBaselineRules(JSON.stringify(methods.getValues('callRules')));
  }, [userDetails]);

  /* The three facts that identify this line on the network. None of them are
     edited on this page — extension and direct number are set by an admin, and
     the caller ID is picked from the assigned numbers further down — but they
     are what somebody checks first, and reading them off three other screens is
     the reason this page felt like it started mid-sentence. The caller ID is
     watched rather than read from the record so the band agrees with the
     dropdown below while a change is still unsaved. */
  const outboundCallerId = watch('callRules.outgoingCall.defaultCallerId')?.label;
  const lineFacts = [
    {
      key: 'extension',
      icon: <Hash className="h-4 w-4" aria-hidden="true" />,
      label: 'Extension',
      value: userDetails?.user_info?.extension,
      hint: 'Colleagues dial this from inside the company.',
      empty: 'Not assigned',
    },
    {
      key: 'direct',
      icon: <PhoneIncoming className="h-4 w-4" aria-hidden="true" />,
      label: 'Direct number',
      value: userDetails?.user_info?.phone,
      hint: userDetails?.user_info?.phone
        ? 'Outside callers reach you on this number.'
        : 'Outside callers cannot dial you straight.',
      empty: 'None',
    },
    {
      key: 'callerid',
      icon: <PhoneOutgoing className="h-4 w-4" aria-hidden="true" />,
      label: 'Your caller ID',
      value: outboundCallerId,
      hint: 'What people see when you call them.',
      empty: 'Not chosen',
    },
  ];

  /* Two separate reasons the save bar can be up, and they read differently.
     One is the ordinary "you changed something". The other is that the
     fallback shown below has never actually been stored, so there is
     something to save on a form nobody has touched — which is exactly the
     case the notice above the rules is warning about. */
  const currentRules = watch('callRules');
  const isDirty = Boolean(
    baselineRules && !isUnchanged(comparable(JSON.parse(baselineRules)), comparable(currentRules)),
  );
  const hasUnsavedChanges = isDirty || !fallbackSaved;

  return (
    <section className="mcm-page mcm-admin mcm-acct">
      <AccountPageHead
        title="My Phone"
        about="Which of your devices ring, where calls go while you are away, and what happens when nobody answers."
      />

      <div className="mcm-acct-body">
        <div className="mcm-acct-narrow">
          <div className="mcm-lineband">
            {lineFacts.map((fact) => {
              const set = String(fact.value ?? '').trim();
              return (
                <div key={fact.key} className="mcm-lineband-item">
                  <span className="mcm-lineband-ico">{fact.icon}</span>
                  <div className="min-w-0">
                    <p className="mcm-lineband-k">{fact.label}</p>
                    <p className={`mcm-lineband-v${set ? '' : ' is-empty'}`}>
                      {set || fact.empty}
                    </p>
                    <p className="mcm-lineband-hint">{fact.hint}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
              {!fallbackSaved ? (
                <div className="mcm-notsaved" role="status">
                  <strong>Voicemail is not saved yet.</strong>
                  <span>
                    “If Busy / Unanswered / Unreachable” shows Send to Voicemail below, but nothing
                    has been stored for this account — so unanswered and rejected calls are hung up
                    on instead. Save changes to apply it.
                  </span>
                </div>
              ) : null}

              {/* The page scrolls as one column now, so the rules no longer need
                  to be their own inner scroller with a hand-computed height. */}
              <CallRules customClass="" />

              {hasUnsavedChanges && (
                <div className="mcm-savebar" role="status">
                  <span className="mcm-savebar-dot" aria-hidden="true" />
                  <span className="mcm-savebar-text">
                    {isDirty ? 'Unsaved changes' : 'Nothing stored yet'}
                    <span className="mcm-savebar-sub">
                      {isDirty
                        ? 'These apply to your calls only, not the whole company.'
                        : 'Save to store the fallback this page is showing you.'}
                    </span>
                  </span>
                  {isDirty && (
                    <button
                      type="button"
                      className="mcm-savebar-discard"
                      onClick={() => {
                        if (baselineRules) setValue('callRules', JSON.parse(baselineRules));
                      }}
                      disabled={isPendingUpdateMember}
                    >
                      Discard
                    </button>
                  )}
                  {/* The `.mcm-page button` reset strips this button's background
                      and text colour, so `!` forces them back — same as the other
                      account pages. */}
                  <Button
                    variant={'primary'}
                    type="submit"
                    disabled={isPendingUpdateMember}
                    className="!bg-primary !text-white !border-primary hover:!bg-primary/90 min-w-[128px] justify-center"
                  >
                    {isPendingUpdateMember ? 'Saving…' : 'Save changes'}
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

export default IncomingCalls;

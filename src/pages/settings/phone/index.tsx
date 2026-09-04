import CallRules from '@/pages/admin-settings/people/update-forwarding/call-rules';
import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
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

const IncomingCalls = () => {
  /* The page head above prints the title; this puts the sentence that used
     to sit under it behind that head's info button instead. */
  useSetAdminPageMeta({ description: 'How calls reach you: your devices, forwarding rules and what happens when you do not answer.' });

  const [schemaContext, setSchemaContext] = useState(null);
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

      /* Presence is not edited on this screen, but it is part of the payload it
         saves. With no stored rules there is nothing to hydrate it from, so it
         stayed undefined and Submit broadcast an undefined status and posted one
         to update-status. The person's current availability is the truthful
         value for a record that has never stored one. */
      setValue('callRules.status', user?.socket_status || 'online');
    }
  }, [userDetails]);

  useEffect(() => {
    const subscription = watch((value) => {
      setSchemaContext(value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  return (
    <section className="w-full flex flex-col overflow-x-auto overflow-y-hidden">
      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="gap-3 flex flex-col justify-between h-full p-3"
        >
          {!fallbackSaved ? (
            <div className="mcm-notsaved" role="status">
              <strong>Voicemail is not saved yet.</strong>
              <span>
                “If Busy / Unanswered / Unreachable” shows Send to Voicemail below, but nothing has
                been stored for this account — so unanswered and rejected calls are hung up on
                instead. Press Submit to apply it.
              </span>
            </div>
          ) : null}
          {/* What the call path actually reads today, said before the rules
              rather than left for someone to find out by being rung. The
              "when someone calls you now" strip inside the rules says what is
              set; this says which of those settings are in force. */}
          <div className="mcm-callsummary" role="status">
            <span className="mcm-callsummary-l">What works today</span>
            <p>
              Forward All Calls, Do Not Disturb, your ring time and Default Caller ID are live for
              calls straight to you. What happens after ringing is live when it sends callers to
              voicemail, to an extension or hangs up; an outside number, a queue or a menu is saved
              but not followed after the ring. Which devices ring, and in what order, is saved, not
              applied yet. Do Not Disturb here means the one in your call rules: the DND status in
              your avatar menu does not stop calls. Calls through a queue or a menu follow that
              queue&rsquo;s or menu&rsquo;s own rules.
            </p>
          </div>
          <CallRules customClass="md:min-h-[calc(100vh_-_13rem)]" />
          <div className="flex justify-end gap-2">
            <Button variant={'primary'} type="submit" disabled={isPendingUpdateMember}>
              {isPendingUpdateMember ? 'Please wait...' : 'Submit'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </section>
  );
};

export default IncomingCalls;

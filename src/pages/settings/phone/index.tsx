import CallRules from '@/pages/admin-settings/users/extension/update-forwarding/call-rules';
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

const IncomingCalls = () => {
  const [schemaContext, setSchemaContext] = useState(null);
  const queryClient: any = useQueryClient();
  const { socketEventsManager } = useSocketEvents();
  const { user } = useUser();
  const { data: userDetails } = useQuery({
    queryKey: ['userInfoForPhoneSettings'],
    queryFn: getUserDetails,
    select: (data) => data?.data?.data?.result || [],
  });
  console.log('userDetails', userDetails);
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
    const payload = {
      value: callRuleRequest,
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
      (response: any) => {
        console.log('User-presence-update:', response);
      },
    );
  }

  const { mutate: mutateUserUpdateStatus } = useMutation({
    mutationFn: userUpdateStatus,
    onSuccess: (data, variables) => {
      console.log('data', data);
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
        lable: fallbackLabel,
        value: fallbackValue,
      });
      setValue('callRules.failureAction.type', { label: 'Send to Voicemail', value: 'VOICEMAIL' });
      setValue('callRules.failureAction.personal', true);
      setValue('callRules.forwardCall.value', {
        lable: fallbackLabel,
        value: fallbackValue,
      });
      setValue('callRules.forwardCall.type', { label: 'Send to Voicemail', value: 'VOICEMAIL' });
    }
  }, [userDetails]);

  useEffect(() => {
    const subscription = watch((value) => {
      setSchemaContext(value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  return (
    <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <p className="text-gray-900 font-semibold text-lg">Phone</p>
      </div>
      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="gap-3 flex flex-col justify-between h-full p-3"
        >
          <CallRules customClass="md:min-h-[calc(100vh_-_13rem)]" />
          <div className="flex justify-end gap-2">
            <Button variant={'outline'} type="submit" disabled={isPendingUpdateMember}>
              {isPendingUpdateMember ? 'Please wait...' : 'Submit'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </section>
  );
};

export default IncomingCalls;

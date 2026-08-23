import { useEffect, useMemo, useRef, useState } from 'react';
import { getTodayInTimeZone, handleAlert } from '@/lib/utils';
import { createEventAndTask, createMeeting, getEventAndTaskDetails } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import countryList from '@/lib/countries.json';
import { Input } from '@/components/ui/input';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { CustomDatePicker } from '@/components/custom/custom-datepicker';
import moment from 'moment';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import AlertConfirm from '@/components/custom/alert-confirm';
import { yupResolver } from '@hookform/resolvers/yup';
import Loader from '@/components/custom/loader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/assets/icons/icon';
import {
  durationOptions,
  initialValue,
  startMeetHourArr,
  startMeetMinutesArr,
} from '@/pages/video-meetings/schedule-meeting/constant';
import InviteMembersModal from '@/pages/video-meetings/send-invites/invite-members';
import InviteOthersModal from '@/pages/video-meetings/send-invites/invite-others';
import {
  ActionType,
  CategoryType,
  createUpdateMessages,
  reminderModeSelectOption,
  ScheduleEventModalProps,
  SCHEDULEMEETING,
  scheduleMeetingSchema,
} from '../../constants';
import { useUser } from '@/hooks/use-user';
import RegionalModal from '@/components/common-settings/regional-dialog';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { v4 as uuidV4 } from 'uuid';

const normalizeMemberValue = (value?: string | number) => String(value || '').trim();

const ScheduleEventModal = ({
  schedule,
  startDate,
  handleClose,
  isEdit,
  category,
  defaultTopic,
  defaultDescription,
  source,
  openInvite,
  currentChat,
  msgObj,
}: ScheduleEventModalProps) => {
  const [duration, setDuration] = useState(15);
  const { user = {} }: any | object = useUser();
  const { user_info = {} } = user || {};
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<any>({
    inviteMembers: false,
    inviteOthers: false,
    regionalModal: false,
  });
  const { features } = useCompanyFeatures();
  const videoAccess = features?.plan_features?.video?.action || {};
  const [initialRegionalSettings, setInitialRegionalSettings] = useState<any>(null);
  // const [integratedCrms, setIntegratedCrms] = useState<crmListProps[]>([]);
  // const [selected, setSelected] = useState<string[]>([]);
  const [currentHourTZ, setCurrentHourTZ] = useState<any>(null);
  const [currentMinuteTZ, setCurrentMinuteTZ] = useState<any>(null);
  const isCategoryEvent = category === SCHEDULEMEETING?.event;
  const isCreateTask = !isCategoryEvent && !isEdit;
  const isVideoCreateRestricted = isCategoryEvent && !isEdit && videoAccess?.create === false;
  const { handleSendMessage, handleUpdateMessage } = useSocketEvents();
  const actorUuid = user?.uuid || user?.guest_info?.uuid || '';
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [selectedNotifyUserIds, setSelectedNotifyUserIds] = useState<string[]>([]);
  const [taskConfirmOpen, setTaskConfirmOpen] = useState(false);
  const [pendingTaskSubmitData, setPendingTaskSubmitData] = useState<any | null>(null);
  const seededDefaultTaskMemberRef = useRef(false);
  const isChatSource = source === 'CHAT' && Boolean(currentChat?.chatId);
  // Personal chat = only 1 recipient (1-on-1 DM). Determined after chatRecipientUsers is computed (see below).
  const formInstance = useForm<any>({
    defaultValues: initialValue,
    resolver: yupResolver(scheduleMeetingSchema),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = formInstance;

  const [
    WatchHour,
    WatchMins,
    watchInviteMembers,
    watchInviteOthers,
    watchTimezone,
    WatchDate,
    watchReminder,
    watchDescription,
    watchReminderMode,
    watchCountry,
  ] = watch([
    'hr',
    'mins',
    'members',
    'inviteOthers',
    'settings.operational_hours.regional.timezone',
    'meeting_date',
    'reminder',
    'description',
    'reminder_mode',
    'settings.operational_hours.regional.country',
  ]);
  console.log(watchTimezone, 'watchTimezone');

  const defaultTaskMember = useMemo(() => {
    if (!isCreateTask) return null;

    const userInfo = user?.user_info || {};
    const email = user?.email || userInfo?.email || '';
    const extension =
      user?.extension || userInfo?.extension || user?.sip_credentials?.extension || '';
    const userUuid = user?.uuid || user?.user_uuid || user?.userId || userInfo?.uuid || '';
    const firstName = user?.first_name || userInfo?.first_name || '';
    const lastName = user?.last_name || userInfo?.last_name || '';
    const name =
      user?.name ||
      userInfo?.name ||
      `${firstName} ${lastName}`.trim() ||
      email ||
      normalizeMemberValue(extension) ||
      'You';

    if (!userUuid && !email && !extension) return null;

    return {
      email,
      name,
      type: 'USER',
      user_uuid: userUuid,
      hash: user?.hash || userInfo?.hash,
      extension,
    };
  }, [isCreateTask, user]);

  useEffect(() => {
    if (Object.keys(user)?.length > 0 && !isEdit) {
      const { timezone, country_code, country } = user?.settings?.operational_hours?.regional || {};
      setValue('settings.operational_hours.regional.timezone', timezone);
      setValue('settings.operational_hours.regional.country_code', country_code);
      setValue('settings.operational_hours.regional.country', country);

      setInitialRegionalSettings({ timezone, country_code, country });
    }
  }, [user, isEdit, setValue]);

  // Pre-fill defaults coming from external callers (e.g. "Create Task from Chat")
  useEffect(() => {
    if (!isEdit) {
      if (defaultTopic) {
        setValue('name', defaultTopic);
      }
      if (defaultDescription !== undefined) {
        setValue('description', defaultDescription);
      }
    }
  }, [isEdit, defaultTopic, defaultDescription, setValue]);

  useEffect(() => {
    if (modalState?.regionalModal) {
      const currentValues = {
        timezone: watch('settings.operational_hours.regional.timezone'),
        country_code: watch('settings.operational_hours.regional.country_code'),
        country: watch('settings.operational_hours.regional.country'),
      };

      setInitialRegionalSettings(currentValues);
    }
  }, [modalState?.regionalModal, watch]);

  useEffect(() => {
    if (openInvite) {
      setModalState((prev: any) => ({ ...prev, inviteMembers: true }));
    }
  }, [openInvite]);

  const chatRecipientUsers = useMemo(() => {
    if (!isChatSource) return [];
    if (currentChat?.chatId === actorUuid) {
      return [
        {
          uuid: actorUuid,
          name: 'You',
        },
      ];
    }

    const users = Array.isArray(currentChat?.users) ? currentChat.users : [];
    return users
      .filter((chatUser: any) => chatUser?.uuid && chatUser?.uuid !== actorUuid)
      .map((chatUser: any) => ({
        uuid: chatUser?.uuid,
        email: chatUser?.email || '',
        extension: chatUser?.extension || '',
        profile: chatUser?.profile || '',
        hash: chatUser?.hash,
        name:
          chatUser?.name ||
          `${chatUser?.first_name || ''} ${chatUser?.last_name || ''}`.trim() ||
          chatUser?.email ||
          chatUser?.extension ||
          'User',
      }));
  }, [isChatSource, currentChat?.chatId, currentChat?.users, actorUuid]);

  useEffect(() => {
    if (!isCreateTask || !defaultTaskMember || seededDefaultTaskMemberRef.current) return;

    seededDefaultTaskMemberRef.current = true;
    const currentMembers = Array.isArray(watchInviteMembers) ? watchInviteMembers : [];
    if (currentMembers.length > 0) return;

    if (isChatSource && chatRecipientUsers.length > 0) {
      const chatMembers = chatRecipientUsers.map((chatUser: any) => {
        return {
          email: chatUser?.email || '',
          name: chatUser?.name || 'User',
          type: 'USER',
          user_uuid: chatUser?.uuid || '',
          hash: chatUser?.hash,
          extension: chatUser?.extension || '',
          profile: chatUser?.profile || '',
        };
      });

      // Current user always first, then chat recipients
      setValue('members', [defaultTaskMember, ...chatMembers], { shouldValidate: true });
    } else {
      // Not a chat source (e.g. calendar) — just seed the current user
      setValue('members', [defaultTaskMember], { shouldValidate: true });
    }
  }, [
    chatRecipientUsers,
    defaultTaskMember,
    isChatSource,
    isCreateTask,
    setValue,
    watchInviteMembers,
  ]);

  useEffect(() => {
    if (!isChatSource) return;
    const allCandidateIds = chatRecipientUsers
      .map((chatUser: any) => chatUser?.uuid)
      .filter(Boolean);
    if (!allCandidateIds.length) {
      setSelectedNotifyUserIds([]);
      return;
    }

    if (!isEdit) {
      setSelectedNotifyUserIds(allCandidateIds);
      return;
    }

    const incomingReceiverIds = Array.isArray(msgObj?.receiverId)
      ? msgObj.receiverId.filter(Boolean)
      : [];
    const incomingHiddenIds = Array.isArray(msgObj?.isHidden)
      ? msgObj.isHidden.filter(Boolean)
      : [];
    const preselectedIds = incomingReceiverIds.length
      ? incomingReceiverIds.filter(
          (receiverUuid: string) =>
            allCandidateIds.includes(receiverUuid) && !incomingHiddenIds.includes(receiverUuid),
        )
      : allCandidateIds;

    setSelectedNotifyUserIds(preselectedIds.length ? preselectedIds : allCandidateIds);
  }, [isChatSource, isEdit, chatRecipientUsers, msgObj?.messageId, msgObj?._id]);

  // Personal chat has exactly 1 chat recipient (1-on-1 DM)
  const isPersonalChat = isChatSource && chatRecipientUsers.length === 1;

  const areAllNotifyUsersSelected =
    chatRecipientUsers.length > 0 && selectedNotifyUserIds.length === chatRecipientUsers.length;

  const allParticipants = [
    ...(Array.isArray(watchInviteMembers) ? watchInviteMembers : []),
    ...(Array.isArray(watchInviteOthers) ? watchInviteOthers : []),
  ];
  const hasParticipantValue = (item: any) =>
    Boolean(
      item?.email || item?.name || item?.user_uuid || item?.userId || item?.uuid || item?.extension,
    );
  const getParticipantKey = (item: any) =>
    item?.email ||
    item?.user_uuid ||
    item?.userId ||
    item?.uuid ||
    normalizeMemberValue(item?.extension) ||
    item?.name;
  const getParticipantLabel = (item: any) =>
    item?.name || item?.email || normalizeMemberValue(item?.extension) || 'User';
  const isAllParticipantsNull = allParticipants?.some(hasParticipantValue);

  const handleRemoveMember = (member: any) => {
    if (member?.type === 'GUEST') {
      const memberKey = getParticipantKey(member);
      const updatedGuests = watchInviteOthers?.filter(
        (item: any) => getParticipantKey(item) !== memberKey,
      );
      setValue('inviteOthers', updatedGuests);
    } else {
      const memberKey = getParticipantKey(member);
      const updatedMembers = watchInviteMembers?.filter(
        (item: any) => getParticipantKey(item) !== memberKey,
      );
      setValue('members', updatedMembers);
    }
  };

  const toggleNotifyUser = (targetUserId: string, checked: boolean) => {
    setSelectedNotifyUserIds((prev) => {
      const previous = Array.isArray(prev) ? prev : [];
      if (checked) {
        return previous.includes(targetUserId) ? previous : [...previous, targetUserId];
      }
      return previous.filter((userId) => userId !== targetUserId);
    });
  };

  const toggleSelectAllNotifyUsers = (checked: boolean) => {
    if (!checked) {
      setSelectedNotifyUserIds([]);
      return;
    }
    setSelectedNotifyUserIds(
      chatRecipientUsers.map((chatUser: any) => chatUser?.uuid).filter(Boolean),
    );
  };

  const syncChatMessage = (response: any, variables: any) => {
    if (source !== 'CHAT' || !currentChat?.chatId || !actorUuid) return;

    const result = response?.data?.data?.result;
    const normalizedResult = Array.isArray(result) ? result?.[0] : result;
    const targetMessageId = msgObj?.messageId || msgObj?._id;
    const isUpdate = Boolean(isEdit && targetMessageId);
    const messageType = isCategoryEvent ? 'event' : 'task';
    const defaultReceiverId =
      currentChat?.chatId === actorUuid
        ? [actorUuid]
        : (Array.isArray(currentChat?.users) ? currentChat.users : [])
            .map((chatUser: any) => chatUser?.uuid)
            .filter((uuid: string) => Boolean(uuid) && uuid !== actorUuid);
    const allCandidateReceiverIds = chatRecipientUsers
      .map((chatUser: any) => chatUser?.uuid)
      .filter(Boolean);
    const selectedReceiverIds = (selectedNotifyUserIds || []).filter((receiverUuid: string) =>
      allCandidateReceiverIds.includes(receiverUuid),
    );
    const receiverId =
      allCandidateReceiverIds.length > 0
        ? notifyUsers
          ? selectedReceiverIds
          : []
        : defaultReceiverId;
    const isHidden =
      allCandidateReceiverIds.length > 0
        ? allCandidateReceiverIds.filter(
            (receiverUuid: string) => !receiverId.includes(receiverUuid),
          )
        : [];

    const basePayload: any = {
      chatId: currentChat?.chatId,
      message: [
        {
          type: 'paragraph',
          children: [
            { text: isUpdate ? `Updated the ${messageType}` : `Created a ${messageType}` },
          ],
        },
      ],
      messageType,
      senderId: actorUuid,
      receiverId,
      isHidden,
      messageId: isUpdate ? targetMessageId : uuidV4(),
      createdAt: new Date().toISOString(),
    };

    if (isCategoryEvent) {
      const meetingId =
        variables?.meetingId ||
        variables?.referenceId ||
        schedule?.referenceId ||
        schedule?.raw?.referenceId ||
        normalizedResult?.meetingId;

      if (!meetingId) return;

      basePayload.event = {
        meetingId,
        name: variables?.name || normalizedResult?.name || '',
        duration: variables?.duration || normalizedResult?.duration || 15,
        startTime: variables?.startTime || normalizedResult?.startTime || '',
        timezone: variables?.timezone || normalizedResult?.timezone || '',
      };
    } else {
      const eventTaskId =
        normalizedResult?._id || normalizedResult?.eventTaskId || variables?.eventTaskId || '';

      if (!eventTaskId) return;

      basePayload.task = {
        taskId: eventTaskId,
        name: variables?.name || normalizedResult?.name || '',
        startTime: variables?.startTime || normalizedResult?.startTime || '',
        timezone: variables?.timezone || normalizedResult?.timezone || '',
      };
    }

    if (isUpdate) {
      handleUpdateMessage({
        ...basePayload,
        currentChat,
      });
      return;
    }

    handleSendMessage(basePayload);
  };

  const { mutate: mutateCreateEventAndTask, isPending: isPendingEventAndTask } = useMutation({
    mutationFn: createEventAndTask,
    onSuccess: async (response: any, variables: any) => {
      syncChatMessage(response, variables);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['calendarMeetingList'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['calendarMeetingListTodayEvents'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['calendarMeetingListTaskList'],
          refetchType: 'all',
        }),
      ]);
      handleClose();
      const actionType: ActionType = isEdit ? SCHEDULEMEETING?.edit : SCHEDULEMEETING?.create;
      const categoryType: CategoryType = isCategoryEvent
        ? SCHEDULEMEETING?.event
        : SCHEDULEMEETING?.task;
      handleAlert({
        text: createUpdateMessages[actionType][categoryType],
        type: 'success',
      });
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.error?.message;
      handleAlert({ text: errMsg, type: 'error' });
    },
  });

  const { mutate: mutateCreateMeeting, isPending: isPendingMeeting } = useMutation({
    mutationFn: createMeeting,
    onSuccess: (response: any, variables: any) => {
      // console.log(variables, 'variablesvariables');
      // return;

      const meetingId = response?.data?.data?.result?.meetingId || variables?.meetingId;
      const referenceId = meetingId;
      mutateCreateEventAndTask({ ...variables, meetingId, referenceId, source: 'CALENDAR' });
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.error?.message || 'Failed to create meeting';
      handleAlert({ text: errMsg, type: 'error' });
    },
  });
  // const { data: crmIsConnectedData = [] } = useQuery({
  //   queryKey: ['CRMIsConnected'],
  //   queryFn: () => CRMIsConnected(),
  //   select: (data) => data?.data?.data?.result || [],
  // });

  // useEffect(() => {
  //   if (crmIsConnectedData && crmIsConnectedData?.length > 0) {
  //     const integratedCrms = crmList?.filter((crm) =>
  //       crmIsConnectedData?.some(
  //         (api: { is_integrated: boolean; type: string }) =>
  //           api?.is_integrated && crm?.name?.toLowerCase() === api?.type?.toLowerCase(),
  //       ),
  //     );
  //     setIntegratedCrms(integratedCrms);
  //   }
  // }, [crmIsConnectedData]);

  // const toggleCRM = (label: string) => {
  //   setSelected((prev) =>
  //     prev?.includes(label) ? prev?.filter((item) => item !== label) : [...prev, label],
  //   );
  // };

  // const toggleSelectAll = () => {
  //   if (selected?.length === integratedCrms?.length) {
  //     setSelected([]);
  //   } else {
  //     setSelected(integratedCrms?.map((crm) => crm?.label) || []);
  //   }
  // };

  const eventTaskId = schedule?._id || schedule?.raw?._id;
  const { data: eventAndTaskDetailInfo = [] } = useQuery({
    queryKey: ['meetingDetailInfo', eventTaskId],
    queryFn: () => getEventAndTaskDetails({ eventTaskId: eventTaskId }),
    enabled: !!eventTaskId,
    select: (data) => data?.data?.data?.result,
  });

  useEffect(() => {
    if (isEdit && eventAndTaskDetailInfo && eventAndTaskDetailInfo?.length) {
      const detail = eventAndTaskDetailInfo?.[0];

      const meetingTimezone = detail?.timezone || 'Asia/Kolkata';
      const startUtc = new Date(detail?.startTime);
      const localeDateString = startUtc.toLocaleString('en-US', { timeZone: meetingTimezone });
      const localDate = new Date(localeDateString);

      setValue('name', detail?.name || '');
      setValue('meeting_date', localDate.toISOString().split('T')[0]);
      setValue('hr', {
        label: String(localDate.getHours()).padStart(2, '0'),
        value: String(localDate.getHours()).padStart(2, '0'),
      });
      setValue('mins', {
        label: String(localDate.getMinutes()).padStart(2, '0'),
        value: String(localDate.getMinutes()).padStart(2, '0'),
      });
      setValue('settings.operational_hours.regional.timezone', {
        label: meetingTimezone,
        value: meetingTimezone,
      });
      setValue('allowHost', detail?.meetingDetail?.allowHost === 'Y' ? 'Yes' : 'No');
      setValue('need_password', detail?.meetingDetail?.password ? 'Yes' : 'No');
      setValue('pin', detail?.meetingDetail?.password || '');
      setDuration(detail?.duration || 15);

      const formattedMembers = detail?.assignTo?.map((member: any) => ({
        email: member?.email || '',
        name: member?.name || '',
        type: member?.type,
        user_uuid: member?.userId || '',
      }));
      setValue('members', formattedMembers || []);
      setValue('reminder', detail?.reminder);
      setValue('description', detail?.description);
      const selectedOptions = reminderModeSelectOption?.filter((option) =>
        detail?.reminderMode?.includes(option?.value),
      );
      setValue('reminder_mode', selectedOptions || []);

      if (detail?.timezone && countryList?.length) {
        const matchedCountry = countryList?.find((country: any) =>
          country?.timezones?.some((tz: any) => tz.zoneName === detail?.timezone),
        );
        const countryLabel = `${matchedCountry?.name} (${matchedCountry?.phonecode?.startsWith('+') ? matchedCountry?.phonecode : `+${matchedCountry?.phonecode}`})`;
        setValue('settings.operational_hours.regional.country_code', {
          label: countryLabel,
          value: matchedCountry?.isoCode,
          name: matchedCountry?.name || '',
        });
        if (matchedCountry) {
          setValue(
            'settings.operational_hours.regional.country',
            {
              label: `${matchedCountry.name}`,
              value: matchedCountry.isoCode,
            },
            { shouldValidate: true },
          );
        }
      }
    }
  }, [eventAndTaskDetailInfo, isEdit]);

  useEffect(() => {
    if (isEdit || (eventAndTaskDetailInfo && eventAndTaskDetailInfo?.length > 0)) return;

    let date;
    if (startDate && typeof startDate.toDate === 'function') {
      date = moment(startDate.toDate()).add(10, 'minutes');
    } else {
      // Fallback for Chat or other entry points where startDate is not provided
      const timezone = watchTimezone?.value || Intl.DateTimeFormat().resolvedOptions().timeZone;
      date = moment(new Date().toLocaleString('en-US', { timeZone: timezone })).add(10, 'minutes');
    }

    if (date) {
      const formattedStartDate = date.format('YYYY-MM-DD');
      const hour = date.format('HH');
      const minute = date.format('mm');
      setValue('meeting_date', formattedStartDate);
      setValue('hr', {
        value: hour.toString().padStart(2, '0'),
        label: hour.toString().padStart(2, '0'),
      });
      setValue('mins', {
        value: minute.toString().padStart(2, '0'),
        label: minute.toString().padStart(2, '0'),
      });
    }
  }, [startDate, isEdit, watchTimezone?.value, eventAndTaskDetailInfo?.length, setValue]);

  useEffect(() => {
    const timezone = watchTimezone?.value;
    if (!timezone) return;

    const nowInTimezone = moment(
      new Date(new Date().toLocaleString('en-US', { timeZone: timezone })),
    ).add(10, 'minutes');
    setCurrentHourTZ(nowInTimezone.hours());
    setCurrentMinuteTZ(nowInTimezone.minutes());
  }, [watchTimezone?.value, WatchDate]);

  useEffect(() => {
    if (!watchTimezone?.value || !WatchDate || !WatchHour?.value) return;
    if (currentHourTZ === null || currentMinuteTZ === null) return;
    if (!isTodayInTimezone(WatchDate, watchTimezone?.value)) return;

    const selectedHour = Number(WatchHour?.value);
    const selectedMinute = Number(WatchMins?.value);
    const liveHour = Number(currentHourTZ);
    const liveMinute = Number(currentMinuteTZ);

    if (Number.isNaN(selectedHour)) return;

    // If selected hour is in the past for today, move to first allowed future hour.
    if (selectedHour < liveHour) {
      const nextHourOption = startMeetHourArr?.find((item) => Number(item?.val) >= liveHour);
      if (!nextHourOption) return;
      const nextMinuteOption = startMeetMinutesArr?.find((item) => Number(item?.val) >= liveMinute);

      setValue(
        'hr',
        { label: nextHourOption.val, value: nextHourOption.val },
        { shouldValidate: true },
      );
      setValue(
        'mins',
        {
          label: (nextMinuteOption?.val || '00').toString().padStart(2, '0'),
          value: (nextMinuteOption?.val || '00').toString().padStart(2, '0'),
        },
        { shouldValidate: true },
      );
      return;
    }

    // If selected minute is stale in current hour, bump to next valid minute.
    if (
      selectedHour === liveHour &&
      (Number.isNaN(selectedMinute) || selectedMinute < liveMinute)
    ) {
      const nextMinuteOption = startMeetMinutesArr?.find((item) => Number(item?.val) >= liveMinute);
      if (nextMinuteOption) {
        const normalizedMinute = nextMinuteOption.val.toString().padStart(2, '0');
        if (WatchMins?.value !== normalizedMinute) {
          setValue(
            'mins',
            { label: normalizedMinute, value: normalizedMinute },
            { shouldValidate: true },
          );
        }
        return;
      }

      // No valid minute left in this hour (e.g., 12:59): move to next hour at 00.
      const nextHourOption = startMeetHourArr?.find((item) => Number(item?.val) > liveHour);
      if (nextHourOption) {
        const normalizedHour = nextHourOption.val.toString().padStart(2, '0');
        setValue('hr', { label: normalizedHour, value: normalizedHour }, { shouldValidate: true });
        setValue('mins', { label: '00', value: '00' }, { shouldValidate: true });
      }
    }
  }, [
    WatchDate,
    WatchHour?.value,
    WatchMins?.value,
    currentHourTZ,
    currentMinuteTZ,
    watchTimezone?.value,
    setValue,
  ]);

  const isTodayInTimezone = (selectedDate: any, timezone: any) => {
    const todayInTZ = getTodayInTimeZone(timezone)?.split(',')?.[0]?.trim();
    return todayInTZ === selectedDate;
  };

  const submitSchedulePayload = async (data: any) => {
    if (isVideoCreateRestricted) return;

    const {
      name,
      meeting_date,
      pin,
      need_password,
      allowHost,
      hr,
      mins,
      reminder,
      description,
      reminder_mode,
      settings = {},
    } = data || {};
    const startTime = `${meeting_date} ${hr?.value}:${mins?.value}:00`;
    const reminderMode = reminder_mode?.map(({ value }: { value: string }) => value) || [];
    const existingMembers =
      eventAndTaskDetailInfo?.[0]?.assignTo?.map((m: any) => m?.user_uuid || m?.userId) || [];
    const formattedMembers = allParticipants?.map((obj: any) => {
      const id = obj?.user_uuid || obj?.userId || '';
      const isNewMember = !existingMembers.includes(id);
      const cleanedObj = {
        ...obj,
        user_uuid: id,
        invitation_sent: isNewMember ? false : true,
      };
      return cleanedObj;
    });

    if (!settings?.operational_hours?.regional?.timezone.value) {
      handleAlert({
        text: 'Timezone is required',
        type: 'error',
      });
      return;
    }

    let payload: any = {
      name,
      startTime,
      timezone: settings?.operational_hours?.regional?.timezone.value || '',
      category: category?.toUpperCase(),
      reminderMode: reminderMode,
      description,
      reminder,
      // mode: source === "CHAT" ? "CHAT" : 'VIDEO',
      mode: source === 'CHAT' ? 'CHAT' : schedule?.mode || schedule?.raw?.mode || 'VIDEO',
      // members: allParticipants ? allParticipants : watchInviteMembers,
      members: formattedMembers,
      ...(eventTaskId && { eventTaskId: eventTaskId }),
    };
    if (isCategoryEvent) {
      payload = {
        duration,
        ...payload,
        meetingType: 'SCHEDULED',
        mode: source === 'CHAT' ? 'CHAT' : schedule?.mode || schedule?.raw?.mode || 'VIDEO',
        source: 'CALENDAR',
        allowHost: allowHost === 'Yes' ? 'Y' : 'N',
        ...(need_password === 'Yes' && { password: pin }),
        ...(eventTaskId && {
          meetingId: schedule?.referenceId || schedule?.raw?.referenceId || '',
        }),
      };
      console.log(payload, 'payloadpayloadpayload', schedule);
      // return;
      mutateCreateMeeting(payload);
    } else {
      payload = {
        ...payload,
        source: source === 'CHAT' ? 'CALENDAR' : source || 'CALENDAR',
      };

      mutateCreateEventAndTask(payload);
    }
  };

  const onSubmit = async (data: any) => {
    if (isCreateTask) {
      setPendingTaskSubmitData(data);
      setTaskConfirmOpen(true);
      return;
    }

    await submitSchedulePayload(data);
  };

  const handleTaskConfirmOpenChange = (open: boolean) => {
    setTaskConfirmOpen(open);
    if (!open) {
      setPendingTaskSubmitData(null);
    }
  };

  const handleConfirmCreateTask = async () => {
    const data = pendingTaskSubmitData;
    setTaskConfirmOpen(false);
    setPendingTaskSubmitData(null);
    if (!data) return;

    await submitSchedulePayload(data);
  };

  const handleOpenModal = (key: keyof typeof modalState) =>
    setModalState((prev: any) => ({ ...prev, [key]: true }));

  const handleCloseModal = (key: keyof typeof modalState) =>
    setModalState((prev: any) => ({ ...prev, [key]: false }));

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col ">
      {isVideoCreateRestricted ? (
        <div className="flex h-full min-h-0 items-center justify-center px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center">
            <p className="text-base font-semibold text-slate-900">
              You do not have access to create events
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Please contact your administrator to enable this permission.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* {isPendingEventTaskDetail && (
        <div className="absolute -top-25 inset-0 flex items-center justify-center bg-white/60 z-50">
          <Loader variant="blue" />
        </div>
      )} */}
          <FormProvider {...formInstance}>
            <form
              className="flex h-full min-h-0 w-full flex-col gap-2"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-2 pr-1 sm:pr-2">
                <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    {/* <Icon className="w-4 h-4 text-slate-400" /> */}
                    <span className="text-sm font-medium text-slate-600">
                      {watchTimezone?.label || 'Select Timezone'}
                      {watchCountry?.label ? `, ${watchCountry?.label}` : ''}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-full border-slate-200 text-slate-600 hover:text-slate-600 hover:bg-slate-100 sm:w-auto"
                    onClick={() => handleOpenModal('regionalModal')}
                  >
                    Change
                  </Button>
                </div>
                <Input
                  {...register('name')}
                  placeholder={'Enter Topic'}
                  type="text"
                  maxLength={50}
                  label={`${isCategoryEvent ? 'Meeting' : 'Task'} Topic`}
                  error={errors?.name?.message}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label className="text-slate-700 font-semibold">{`${isCategoryEvent ? 'Meeting' : 'Task'} Date`}</Label>
                    <Controller
                      name="meeting_date"
                      control={control}
                      render={({ field }) => (
                        <CustomDatePicker
                          minDate={moment().toDate()}
                          value={field.value ? new Date(field.value) : null}
                          onChange={(date) =>
                            field.onChange(date ? moment(date).format('YYYY-MM-DD') : '')
                          }
                          disabled={!watchTimezone}
                        />
                      )}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-slate-700 font-semibold">Start Time</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <CustomSelect
                        placeholder="Hours"
                        options={startMeetHourArr?.map((item) => {
                          const shouldDisable =
                            isTodayInTimezone(WatchDate, watchTimezone?.value) &&
                            currentHourTZ !== null &&
                            Number(item.val) < Number(currentHourTZ);

                          return {
                            label: item?.val,
                            value: item?.val,
                            isDisabled: shouldDisable,
                          };
                        })}
                        handleChange={(value) => setValue('hr', value)}
                        value={watch('hr')}
                        isDisabled={!watchTimezone}
                      />
                      <CustomSelect
                        placeholder="Mins"
                        options={startMeetMinutesArr?.map((item) => {
                          const isToday = isTodayInTimezone(WatchDate, watchTimezone?.value);
                          const isCurrentHour =
                            currentHourTZ !== null &&
                            Number(WatchHour?.value) === Number(currentHourTZ);
                          const shouldDisable =
                            isToday &&
                            isCurrentHour &&
                            currentMinuteTZ !== null &&
                            Number(item.val) < Number(currentMinuteTZ);

                          return {
                            label: item?.val,
                            value: item?.val,
                            isDisabled: shouldDisable,
                          };
                        })}
                        handleChange={(value) => setValue('mins', value)}
                        value={watch('mins')}
                        isDisabled={!watchTimezone}
                      />
                    </div>
                  </div>
                </div>
                {isCategoryEvent && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label>Estimated Duration</Label>
                      <div className="flex gap-2 flex-wrap">
                        {durationOptions?.map((item: any) => (
                          <div
                            key={item.value}
                            onClick={() => setDuration(item.value)}
                            className={`border rounded-lg px-4 py-2 cursor-pointer text-sm font-medium transition-all ${duration === item.value ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between min-h-10">
                        <Label>Allow join meeting before host</Label>
                        <Switch
                          className="cursor-pointer"
                          onCheckedChange={(checked) =>
                            setValue('allowHost', checked ? 'Yes' : 'No')
                          }
                          checked={watch('allowHost') === 'Yes'}
                        />
                      </div>

                      <div className="flex items-center justify-between min-h-10 mb-4">
                        <Label>Need Password to join meeting</Label>
                        <div className=" flex gap-3 items-center">
                          {watch('need_password') === 'Yes' && (
                            <div className="w-50">
                              <Input
                                {...register('pin')}
                                placeholder={'Enter Password'}
                                error={errors?.pin?.message}
                                maxLength={13}
                              />
                            </div>
                          )}
                          <Switch
                            className="cursor-pointer"
                            onCheckedChange={(checked) =>
                              setValue('need_password', checked ? 'Yes' : 'No')
                            }
                            checked={watch('need_password') === 'Yes'}
                          />
                        </div>
                      </div>

                      {videoAccess?.invite && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="ml-auto bg-white border border-[var(--primary)] rounded-xl py-2 px-4 text-[var(--primary)] font-semibold hover:bg-[var(--primary)] hover:text-white transition-all text-sm cursor-pointer shadow-sm active:scale-95">
                            <div className="flex items-center gap-2">
                              <Icon name="Invite" className="w-4.5 h-4.5" /> Invite Participants
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => setModalState({ inviteMembers: true })}
                            >
                              Invite Members
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setModalState({ inviteOthers: true })}>
                              Invite Others
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {isAllParticipantsNull && allParticipants && allParticipants?.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center px-4">
                            <p className="font-medium">Participants</p>
                            <div
                              className="text-red-500 text-sm font-medium cursor-pointer"
                              onClick={() => {
                                setValue('inviteOthers', []);
                                setValue('members', []);
                              }}
                            >
                              Remove All
                            </div>
                          </div>
                          <ul className="flex flex-col px-4">
                            {allParticipants?.map((member) => {
                              const participantKey = getParticipantKey(member);
                              return (
                                participantKey && (
                                  <li
                                    key={participantKey}
                                    className="flex justify-between items-center py-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Icon
                                        name="CheckMarkIcon"
                                        className="text-green-500 w-4 h-4"
                                      />
                                      <p className="text-gray-800">{getParticipantLabel(member)}</p>
                                    </div>
                                    <span
                                      className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-red-100   text-red-500 hover:bg-red-500 hover:text-white"
                                      onClick={() => handleRemoveMember(member)}
                                    >
                                      <Icon name="CloseIcon" className="w-2 h-2" />
                                    </span>
                                  </li>
                                )
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <>
                  {!isCategoryEvent && (
                    <>
                      <div
                        onClick={() => handleOpenModal('inviteMembers')}
                        className="ml-auto bg-white border border-[var(--primary)] rounded-xl py-2 px-4 text-[var(--primary)] font-semibold hover:bg-[var(--primary)] hover:text-white transition-all text-sm cursor-pointer shadow-sm active:scale-95"
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="Invite" className="w-4.5 h-4.5" /> Assign users
                        </div>
                      </div>
                      {isAllParticipantsNull && allParticipants && allParticipants?.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center px-4">
                            <p className="font-medium">Users</p>
                            <div
                              className="text-red-500 text-sm font-medium cursor-pointer"
                              onClick={() => {
                                setValue('inviteOthers', []);
                                setValue('members', []);
                              }}
                            >
                              Remove All
                            </div>
                          </div>
                          <ul className="flex flex-col px-4">
                            {allParticipants?.map((member) => {
                              const participantKey = getParticipantKey(member);
                              return (
                                participantKey && (
                                  <li
                                    key={participantKey}
                                    className="flex justify-between items-center py-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Icon
                                        name="CheckMarkIcon"
                                        className="text-green-500 w-4 h-4"
                                      />
                                      <p className="text-gray-800">{getParticipantLabel(member)}</p>
                                    </div>
                                    <span
                                      className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-red-100   text-red-500 hover:bg-red-500 hover:text-white"
                                      onClick={() => handleRemoveMember(member)}
                                    >
                                      <Icon name="CloseIcon" className="w-2 h-2" />
                                    </span>
                                  </li>
                                )
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  <div className="space-y-4">
                    {isChatSource ? (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-col gap-0.5">
                            <Label className="text-slate-800 font-bold">Notify Users</Label>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                              Select recipients for this message
                            </p>
                          </div>
                          <Switch
                            className="cursor-pointer"
                            checked={notifyUsers}
                            onCheckedChange={(checked) => setNotifyUsers(Boolean(checked))}
                          />
                        </div>

                        {notifyUsers ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 max-h-52 overflow-y-auto">
                            <div className="flex flex-col gap-2 border-b border-slate-100 pb-2 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                {isPersonalChat ? 'Assigned Users' : 'Team Members'}
                              </span>
                              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                <Checkbox
                                  checked={areAllNotifyUsersSelected}
                                  onCheckedChange={(checked: any) =>
                                    toggleSelectAllNotifyUsers(Boolean(checked))
                                  }
                                />
                                Select all
                              </label>
                            </div>

                            {chatRecipientUsers.map((chatUser: any) => {
                              const isChecked = selectedNotifyUserIds.includes(chatUser?.uuid);
                              return (
                                <label
                                  key={chatUser?.uuid}
                                  className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer"
                                >
                                  <span className="text-sm text-slate-700 truncate pr-3">
                                    {chatUser?.name}
                                  </span>
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked: any) =>
                                      toggleNotifyUser(chatUser?.uuid, Boolean(checked))
                                    }
                                  />
                                </label>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-0.5">
                        <Label className="text-slate-800 font-bold">Reminder</Label>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                          Notify before 5 min
                        </p>
                      </div>
                      <Switch
                        className="cursor-pointer"
                        onCheckedChange={(checked) => {
                          setValue('reminder', checked);
                          if (!checked) {
                            setValue('reminder_mode', []);
                          }
                        }}
                        checked={watchReminder}
                      />
                    </div>

                    {watchReminder && (
                      <CustomSelect
                        isMulti
                        label={'Reminder Mode'}
                        options={reminderModeSelectOption}
                        handleChange={(value) =>
                          setValue('reminder_mode', value, { shouldValidate: true })
                        }
                        value={watchReminderMode}
                        error={errors?.reminder_mode?.message}
                        isDisabled={!watchReminder}
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-slate-700 font-semibold">Description</Label>
                    <textarea
                      rows={4}
                      maxLength={500}
                      className="border border-slate-200 rounded-2xl text-sm resize-none p-4 bg-slate-50/50 hover:border-slate-300 focus:border-primary focus:bg-white transition-all focus-visible:outline-none placeholder:text-slate-400"
                      placeholder="Add any additional details..."
                      value={watchDescription}
                      onChange={(e) => {
                        setValue('description', e.target.value);
                      }}
                    />
                  </div>
                </>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-2 pt-4 ">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="w-full rounded-xl border-slate-200 px-6 text-slate-600 hover:bg-transparent hover:text-slate-600 sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPendingEventAndTask || isPendingMeeting}
                    className="w-full rounded-xl bg-[var(--primary)] px-8 text-white shadow-lg transition-all hover:bg-[var(--primary)]/90 active:scale-95 sm:w-auto"
                  >
                    {isPendingEventAndTask || isPendingMeeting ? (
                      <div className="flex items-center justify-center">
                        <Loader variant="white" size="sm" />
                      </div>
                    ) : (
                      <>
                        {isCategoryEvent
                          ? isEdit
                            ? 'Update Meeting'
                            : 'Schedule Meeting'
                          : isEdit
                            ? 'Update Task'
                            : 'Create Task'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
            {modalState?.regionalModal && (
              <RegionalModal
                modalState={modalState?.regionalModal}
                setModalState={() => handleCloseModal('regionalModal')}
                data={{ user_info }}
                initialRegionalSettings={initialRegionalSettings}
              />
            )}
          </FormProvider>
          {modalState?.inviteMembers && (
            <InviteMembersModal
              modalState={modalState}
              type={category}
              setModalState={setModalState}
              formInstance={formInstance}
              handleSendInvite={async () => {
                const isValid = await formInstance.trigger('members');
                if (isValid) {
                  setModalState({ inviteMembers: false });
                }
              }}
            />
          )}

          {modalState?.inviteOthers && (
            <InviteOthersModal
              modalState={modalState}
              setModalState={setModalState}
              formInstance={formInstance}
              handleSendInvite={async () => {
                const isValid = await formInstance.trigger('inviteOthers');
                if (isValid) {
                  setModalState({ inviteOthers: false });
                }
              }}
            />
          )}
          <AlertConfirm
            open={taskConfirmOpen}
            setOpen={handleTaskConfirmOpenChange}
            headerText="Confirm Task"
            confirmBtnText="Create Task"
            apiLoading={isPendingEventAndTask || isPendingMeeting}
            descriptionTextComp={
              <p className="text-md">Are you sure you want to create this task?</p>
            }
            onConfirm={handleConfirmCreateTask}
          />
        </>
      )}
    </div>
  );
};

export default ScheduleEventModal;

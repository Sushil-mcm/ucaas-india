import { FC, useEffect, useState } from 'react';
import { getNextFiveMinute, getTodayInTimeZone, handleAlert } from '@/lib/utils';
import { createEventAndTask, createMeeting, meetingDetailList } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import countryList from '@/lib/countries.json';
import { Input } from '@/components/ui/input';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { CustomDatePicker } from '@/components/custom/custom-datepicker';
import moment from 'moment';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import Loader from '@/components/custom/loader';
import { initialValue } from '../constants';
import {
  countries,
  durationOptions,
  startMeetHourArr,
  startMeetMinutesArr,
} from '@/pages/video-meetings/schedule-meeting/constant';
import InviteMembersModal from '@/pages/video-meetings/send-invites/invite-members';
import InviteOthersModal from '@/pages/video-meetings/send-invites/invite-others';
import { useUser } from '@/hooks/use-user';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { v4 as uuidV4 } from 'uuid';

interface CreateEventProps {
  setDrawerState: (open: boolean) => void;
  initialData?: { meetingId?: string } & Record<string, any>;
  onSuccess?: () => void;
  currentChat?: any;
  msgObj: any;
}

const CreateEvent: FC<CreateEventProps> = ({
  setDrawerState,
  initialData,
  onSuccess,
  currentChat,
  msgObj,
}) => {
  const { user } = useUser();
  const memberData =
    currentChat?.users && currentChat?.users?.filter((item: any) => item?.uuid !== user?.uuid);
  const [duration, setDuration] = useState(15);
  const [timezonesList, setTimezonesList] = useState([]);
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<any>({
    inviteMembers: false,
    inviteOthers: false,
  });
  const [currentHourTZ, setCurrentHourTZ] = useState<any>(null);
  const [currentMinuteTZ, setCurrentMinuteTZ] = useState<any>(null);
  const scheduleMeetingSchema = yup.object().shape({
    name: yup
      .string()
      .required('Meeting Topic is required')
      .min(2, 'Meeting Topic must be at least 2 characters')
      .max(50, 'Meeting Topic be at most 50 characters')
      .matches(/^\S.*\S$|^\S$/, 'Spaces not allowed'),
    pin: yup.string().when('need_password', {
      is: (val: any) => val === 'Yes',
      then: () =>
        yup
          .string()
          .required('Password is required')
          .min(4, 'Password must be at least 4 characters')
          .max(12, 'Password must be at most 12 characters')
          .matches(/^\S.*\S$|^\S$/, 'Spaces not allowed'),
      otherwise: () => yup.string(),
    }),
    country_code: yup
      .object({
        value: yup.string(),
        label: yup.string(),
      })
      .nullable()
      .required('Country is required'),
    timezone: yup
      .object({
        value: yup.string().required('Timezone is required'),
        label: yup.string(),
      })
      .nullable()
      .when('country_code', {
        is: (val: any) => !!val && !!val.value,
        then: (schema) =>
          schema
            .shape({
              value: yup.string().required('Timezone is required'),
              label: yup.string(),
            })
            .required('Timezone is required'),
        otherwise: (schema) => schema.nullable(),
      }),
  });
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
    watchInviteMembers,
    watchInviteOthers,
    watchCountryCode,
    watchTimezone,
    WatchDate,
  ] = watch(['hr', 'members', 'inviteOthers', 'country_code', 'timezone', 'meeting_date']);

  const allParticipants = [...watchInviteMembers, ...watchInviteOthers];
  const isAllParticipantsNull = allParticipants?.some((item) => item?.email);
  console.log(watchInviteMembers, 'watchInviteMembers');

  const handleRemoveMember = (member: any) => {
    if (member?.type === 'GUEST') {
      const updatedGuests = watchInviteOthers?.filter((item: any) => item.email !== member?.email);

      setValue('inviteOthers', updatedGuests);
    } else {
      const updatedMembers = watchInviteMembers?.filter(
        (item: any) => item.user_uuid !== member?.user_uuid,
      );
      setValue('members', updatedMembers);
    }
  };
  console.log(handleRemoveMember, 'handleRemoveMember', isAllParticipantsNull);

  const { handleSendMessage, handleUpdateMessage } = useSocketEvents();

  const { mutate: mutateCreateEventAndTask, isPending: isPendingEventAndTask } = useMutation({
    mutationFn: createEventAndTask,
    onSuccess: (_eventTaskResponse: any, variables: any) => {
      const meetingId =
        variables?.meetingId || variables?.referenceId || initialData?.meetingId || '';
      if (meetingId && currentChat?.chatId && user?.uuid) {
        const isOwnChat = currentChat?.chatId === user?.uuid;
        const receiverId = isOwnChat
          ? [user?.uuid]
          : (Array.isArray(currentChat?.users) ? currentChat.users : [])
              .map((chatUser: any) => chatUser?.uuid)
              .filter((id: string) => id && id !== user?.uuid);

        const isUpdate = !!initialData?.meetingId;
        const payload: any = {
          chatId: currentChat?.chatId,
          message: [
            {
              type: 'paragraph',
              children: [{ text: isUpdate ? `Updated the event` : `Created an event` }],
            },
          ],
          messageType: 'event',
          event: {
            meetingId,
            name: variables?.name || '',
            duration: variables?.duration || duration,
            startTime: variables?.startTime || '',
            timezone: variables?.timezone || '',
          },
          senderId: user?.uuid,
          receiverId,
          messageId: isUpdate ? msgObj?.messageId || msgObj?._id : uuidV4(),
          createdAt: new Date().toISOString(),
        };

        if (isUpdate) {
          handleUpdateMessage({
            ...payload,
            currentChat,
          });
        } else {
          handleSendMessage(payload);
        }
      }

      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: ['upcomingList'] });
      queryClient.invalidateQueries({
        queryKey: ['calendarMeetingList'],
        refetchType: 'all',
      });
      setDrawerState(false);
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.error?.message || 'Failed to sync with calendar';
      handleAlert({ text: errMsg, type: 'error' });
    },
  });

  const { mutate: mutateCreateMeeting, isPending: isPendingMeeting } = useMutation({
    mutationFn: createMeeting,
    onSuccess: (response: any, variables: any) => {
      const meetingId = response?.data?.data?.result?.meetingId || variables?.meetingId;
      const referenceId = meetingId;
      mutateCreateEventAndTask({ ...variables, meetingId, referenceId, source: 'CALENDAR' });
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.error?.message;
      handleAlert({ text: errMsg, type: 'error' });
    },
  });

  const { data: meetingDetailInfo } = useQuery({
    queryKey: ['meetingDetailInfo', initialData?.meetingId],
    queryFn: () => meetingDetailList({ meetingId: initialData?.meetingId }),
    enabled: !!initialData?.meetingId,
    select: (data) => data?.data?.data?.result,
  });
  console.log(meetingDetailInfo, 'meetingDetailInfo');

  useEffect(() => {
    if (meetingDetailInfo) {
      const detail = meetingDetailInfo?.[0];
      const meetingTimezone = detail?.timezone || 'Asia/Kolkata';
      const startUtc = new Date(detail?.startUtc);
      const localeDateString = startUtc.toLocaleString('en-US', { timeZone: meetingTimezone });
      const localDate = new Date(localeDateString);

      setValue('name', detail?.name || '');

      if (moment(localDate).isValid()) {
        setValue('meeting_date', localDate?.toISOString().split('T')[0]);
        setValue('hr', {
          label: String(localDate.getHours()).padStart(2, '0'),
          value: String(localDate.getHours()).padStart(2, '0'),
        });
        setValue('mins', {
          label: String(localDate.getMinutes()).padStart(2, '0'),
          value: String(localDate.getMinutes()).padStart(2, '0'),
        });
      }

      setValue('timezone', { label: meetingTimezone, value: meetingTimezone });
      setValue('allowHost', detail?.allowHost === 'Y' ? 'Yes' : 'No');
      setValue('need_password', detail?.password ? 'Yes' : 'No');
      setValue('pin', detail?.password || '');
      setDuration(detail?.duration || 15);

      const formattedMembers = detail?.members?.[0]?.user_detail
        ?.filter((item: any) => item?.type == 'USER')
        ?.map((member: any) => ({
          email: member?.email || '',
          name: member?.name || '',
          type: member?.type,
          user_uuid: member?.userId || '',
        }));
      setValue('members', formattedMembers || []);
      const formattedMembersOthers = detail?.members?.[0]?.user_detail
        ?.filter((item: any) => item?.type == 'GUEST')
        ?.map((member: any) => ({
          email: member?.email || '',
          name: member?.name || '',
          type: member?.type,
          user_uuid: member?.userId || '',
        }));
      setValue('inviteOthers', formattedMembersOthers || []);

      if (detail?.timezone && countryList?.length) {
        const matchedCountry = countryList?.find((country: any) =>
          country?.timezones?.some((tz: any) => tz.zoneName === detail?.timezone),
        );
        if (matchedCountry) {
          setValue(
            'country_code',
            {
              label: `${matchedCountry.name} (${matchedCountry.isoCode})`,
              value: matchedCountry.isoCode,
            },
            { shouldValidate: true },
          );
        }
      }
    }
  }, [meetingDetailInfo]);

  useEffect(() => {
    const getTimezones: any =
      countryList?.find((item: any) => item?.isoCode === (watchCountryCode as any)?.value)
        ?.timezones || [];
    setTimezonesList(getTimezones);
  }, [watchCountryCode]);

  useEffect(() => {
    const todayInTZ = getTodayInTimeZone(watchTimezone?.value);
    if (todayInTZ && !meetingDetailInfo) {
      const timeZoneDateTime = todayInTZ.split(',');
      const timezoneTime: any = timeZoneDateTime?.[1]?.trim().split(':');
      let hour = parseInt(timezoneTime?.[0] || '0', 10);
      const minute = parseInt(timezoneTime?.[1] || '0', 10);

      const roundedMinute = getNextFiveMinute(minute);
      setCurrentHourTZ(timezoneTime?.[0]);
      setCurrentMinuteTZ(timezoneTime?.[1]);
      if (roundedMinute === 0 && minute > 55) {
        hour = (hour + 1) % 24;
      }
      setValue('hr', {
        value: hour.toString().padStart(2, '0'),
        label: hour.toString().padStart(2, '0'),
      });
      setValue('mins', {
        value: roundedMinute.toString().padStart(2, '0'),
        label: roundedMinute.toString().padStart(2, '0'),
      });
      setValue('meeting_date', timeZoneDateTime?.[0]);
    }
  }, [watchTimezone, countryList]);

  const isTodayInTimezone = (selectedDate: any, timezone: any) => {
    const todayInTZ = getTodayInTimeZone(timezone)?.split(',')?.[0]?.trim();
    return todayInTZ === selectedDate;
  };

  const onSubmit = (data: any) => {
    const { name, meeting_date, timezone, pin, need_password, allowHost, hr, mins } = data;
    const startTime = `${meeting_date} ${hr?.value}:${mins?.value}:00`;
    const existingMembers = initialData?.members?.map((m: any) => m?.user_uuid || m?.userId) || [];
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
    console.log(formattedMembers);

    const fallbackMembers = (memberData || []).map((m: any) => ({
      email: m?.email || '',
      name: m?.name || '',
      type: 'USER',
      user_uuid: m?.uuid || m?.user_uuid || '',
      invitation_sent: false,
    }));
    const payload = {
      name,
      startTime,
      timezone: timezone?.value || '',
      duration,
      allowHost: allowHost === 'Yes' ? 'Y' : 'N',
      ...(need_password === 'Yes' && { password: pin }),
      meetingType: 'SCHEDULED',
      mode: 'CHAT',
      members: formattedMembers?.length ? formattedMembers : fallbackMembers,
      category: 'EVENT',
      reminder: false,
      reminderMode: [],
      description: '',
      ...(initialData?.meetingId && { meetingId: initialData?.meetingId }),
      ...(meetingDetailInfo?.[0]?._id && {
        eventTaskId: meetingDetailInfo?.[0]?._id,
      }),
    };
    mutateCreateMeeting(payload);
  };

  return (
    <>
      <form
        className="w-full flex flex-col justify-between h-full min-h-0"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex-1 min-h-0 overflow-y-auto gap-5 pr-2 flex flex-col pb-4">
          <Input
            {...register('name')}
            placeholder={'Enter Topic'}
            type="text"
            label={'Meeting Topic'}
            error={errors?.name?.message}
            maxLength={50}
          />

          <div className="flex gap-4">
            <CustomSelect
              label={'Country Code'}
              placeholder="Select Country"
              options={countries?.map((item: any) => ({
                label: `${item?.label} (${item?.value})`,
                value: item?.value,
              }))}
              handleChange={(value) => {
                setValue('country_code', value, {
                  shouldValidate: true,
                });
              }}
              value={watchCountryCode}
              error={errors?.country_code?.message}
            />
            <CustomSelect
              label={'Timezone'}
              placeholder="Select Timezone"
              options={timezonesList?.map((item: any) => ({
                label: item?.zoneName,
                value: item?.zoneName,
              }))}
              handleChange={(value) => setValue('timezone', value, { shouldValidate: true })}
              value={watch('timezone')}
              error={errors?.timezone?.message}
              isDisabled={!watchCountryCode}
            />
          </div>
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-1.5 w-full">
              <Label>Meeting Date</Label>
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
            <CustomSelect
              label={'Start Time'}
              placeholder="Hours"
              options={startMeetHourArr?.map((item) => {
                const shouldDisable =
                  isTodayInTimezone(WatchDate, watchTimezone?.value) &&
                  Number(item.val) < currentHourTZ;
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
              placeholder="Minutes"
              options={startMeetMinutesArr?.map((item) => {
                const isToday = isTodayInTimezone(WatchDate, watchTimezone?.value);
                const isCurrentHour = Number(WatchHour?.value) === Number(currentHourTZ);

                const shouldDisable =
                  isToday && isCurrentHour && Number(item.val) < currentMinuteTZ;

                return {
                  label: item?.val,
                  value: item?.val,
                  isDisabled: shouldDisable,
                };
              })}
              handleChange={(value) => {
                setValue('mins', value);
              }}
              value={watch('mins')}
              isDisabled={!watchTimezone}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Estimated Duration</Label>
            <div className="flex gap-2">
              {durationOptions?.map((item: any) => (
                <div
                  onClick={() => setDuration(item.value)}
                  className={`border border-gray-200 rounded-xl p-2 cursor-pointer text-sm hover:bg-primary hover:text-white ${duration === item.value ? 'bg-primary text-white' : 'bg-white text-gray-900'}`}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col ">
            <div className="flex items-center justify-between min-h-10">
              <Label>Allow join meeting before host</Label>
              <Switch
                className="cursor-pointer"
                onCheckedChange={(checked) => {
                  setValue('allowHost', checked ? 'Yes' : 'No');
                }}
                checked={watch('allowHost') === 'Yes'}
              />
            </div>

            <div className=" flex items-center justify-between min-h-10 mb-4">
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
                  onCheckedChange={(checked) => {
                    setValue('need_password', checked ? 'Yes' : 'No');
                  }}
                  checked={watch('need_password') === 'Yes' || !!watch('pin')}
                />
              </div>
            </div>
            {/* {videAccess?.invite && (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="ml-auto mb-3 bg-white border border-primary rounded-xl  py-2 px-3 text-primary hover:text-white hover:bg-primary  text-sm cursor-pointer">
                                    <div className="flex items-center gap-2 justify-center ">
                                        <Icon name="Invite" className="w-5 h-5" /> Invite Participants
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => setModalState({ inviteMembers: true })}>
                                        Invite Members
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setModalState({ inviteOthers: true })}>
                                        Invite Others
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )} */}
            {/* {isAllParticipantsNull && allParticipants && allParticipants?.length > 0 && (
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
                                    {allParticipants?.map(
                                        (member) =>
                                            member?.email && (
                                                <li key={member.email} className="flex justify-between items-center py-2">
                                                    <div className="flex items-center gap-2">
                                                        <Icon name="CheckMarkIcon" className="text-green-500 w-4 h-4" />
                                                        <p className="text-gray-800">{member?.name || member?.email}</p>
                                                    </div>
                                                    <span
                                                        className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-red-100   text-red-500 hover:bg-red-500 hover:text-white"
                                                        onClick={() => handleRemoveMember(member)}
                                                    >
                                                        <Icon name="CloseIcon" className=" w-2 h-2" />
                                                    </span>
                                                </li>
                                            ),
                                    )}
                                </ul>
                            </div>
                        )} */}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant={'transparent'} type="button" onClick={() => setDrawerState(false)}>
            Cancel
          </Button>
          <Button
            variant={'outline'}
            type="submit"
            disabled={isPendingMeeting || isPendingEventAndTask}
          >
            {isPendingMeeting || isPendingEventAndTask ? (
              <div className="flex items-center justify-center p-5">
                <Loader variant="blue" size="sm" />
              </div>
            ) : (
              <>{meetingDetailInfo ? 'Update Meeting' : 'Schedule Meeting'}</>
            )}
          </Button>
        </div>
      </form>
      {modalState?.inviteMembers && (
        <InviteMembersModal
          modalState={modalState}
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
    </>
  );
};

export default CreateEvent;

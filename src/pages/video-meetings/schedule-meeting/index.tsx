import { FC, useEffect, useState } from 'react';
import { getNextFiveMinute, getTodayInTimeZone, handleAlert } from '@/lib/utils';
import { createEventAndTask, createMeeting, meetingDetailList } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import countryList from '@/lib/countries.json';
import { Input } from '@/components/ui/input';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { durationOptions, initialValue, startMeetHourArr, startMeetMinutesArr } from './constant';
import { CustomDatePicker } from '@/components/custom/custom-datepicker';
import moment from 'moment';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import Loader from '@/components/custom/loader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import InviteOthersModal from '../send-invites/invite-others';
import InviteMembersModal from '../send-invites/invite-members';
import { Icon } from '@/assets/icons/icon';
import { useCompanyFeatures } from '@/hooks/rbac';

interface ScheduleMeetingProps {
  setDrawerState: (open: boolean) => void;
  initialData?: { meetingId?: string } & Record<string, any>;
  onSuccess?: () => void;
}

const ScheduleMeeting: FC<ScheduleMeetingProps> = ({ setDrawerState, initialData, onSuccess }) => {
  const [duration, setDuration] = useState(15);
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
  const { features } = useCompanyFeatures();
  const videAccess = features?.plan_features?.video?.action || {};
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

  const [WatchHour, watchInviteMembers, watchInviteOthers, watchTimezone, WatchDate] = watch([
    'hr',
    'members',
    'inviteOthers',
    'timezone',
    'meeting_date',
  ]);

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

  const { mutate: mutateCreateEventAndTask, isPending: isPendingEventAndTask } = useMutation({
    mutationFn: createEventAndTask,
    onSuccess: async () => {
      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: ['upcomingList'] });
      queryClient.invalidateQueries({
        queryKey: ['calendarMeetingList'],
        refetchType: 'all',
      });
      setDrawerState(false);
      if (initialData?.meetingId) {
        handleAlert({ text: 'Meeting Updated Successfully', type: 'success' });
      } else {
        handleAlert({ text: 'Meeting Scheduled Successfully', type: 'success' });
      }
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.error?.message || 'Failed to sync with calendar';
      handleAlert({ text: errMsg, type: 'error' });
    },
  });

  const { mutate: mutateCreateMeeting, isPending: isPendingMeeting } = useMutation({
    mutationFn: createMeeting,
    onSuccess: (response: any, variables: any) => {
      if (initialData?.meetingId) {
        onSuccess?.();
        const meetingId = response?.data?.data?.result?.meetingId || variables?.meetingId;
        const referenceId = meetingId;
        mutateCreateEventAndTask({ ...variables, meetingId, referenceId, source: 'CALENDAR' });
        queryClient.invalidateQueries({ queryKey: ['upcomingList'] });
        setDrawerState(false);
        handleAlert({ text: 'Meeting Updated Successfully', type: 'success' });
      } else {
        const meetingId = response?.data?.data?.result?.meetingId || variables?.meetingId;
        const referenceId = meetingId;
        mutateCreateEventAndTask({ ...variables, meetingId, referenceId, source: 'CALENDAR' });
      }
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
    const payload = {
      name,
      startTime,
      timezone: timezone?.value || '',
      duration,
      allowHost: allowHost === 'Yes' ? 'Y' : 'N',
      ...(need_password === 'Yes' && { password: pin }),
      meetingType: 'SCHEDULED',
      mode: 'VIDEO',
      members: formattedMembers,
      category: 'EVENT',
      reminder: false,
      reminderMode: [],
      description: '',
      ...(initialData?.meetingId && { meetingId: initialData?.meetingId }),
      ...(meetingDetailInfo?.data?.data?.result?._id && {
        eventTaskId: meetingDetailInfo?.data?.data?.result?._id,
      }),
    };
    mutateCreateMeeting(payload);
  };

  return (
    <>
      <form
        className="flex h-full w-full min-h-0 flex-col justify-between gap-2"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1 sm:pr-2">
          <div
            className="pb-5"
            style={{ borderBottom: '1.5px solid rgba(231,139,80,0.18)' }}
          >
            <Input
              {...register('name')}
              placeholder={'Enter Topic'}
              type="text"
              label={'Meeting Topic'}
              required
              error={errors?.name?.message}
              maxLength={50}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent px-0 shadow-none focus:border-primary hover:border-gray-300"
            />
          </div>

          <div
            className="flex flex-col gap-5 pb-5"
            style={{ borderBottom: '1.5px solid rgba(231,139,80,0.18)' }}
          >
            <div className="flex flex-col gap-1.5 w-full">
              <Label>Timezone</Label>
              <div className="flex min-h-10 w-full items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                {watch('timezone')?.label || 'Asia/Kolkata'}
              </div>
            </div>
          </div>

          <div
            className="flex flex-col gap-5 pb-5 md:flex-row md:items-end"
            style={{ borderBottom: '1.5px solid rgba(231,139,80,0.18)' }}
          >
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
              className="w-full md:max-w-[120px]"
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
              className="w-full md:max-w-[120px]"
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

          <div
            className="flex flex-col gap-2.5 pb-5"
            style={{ borderBottom: '1.5px solid rgba(231,139,80,0.18)' }}
          >
            <Label>Estimated Duration</Label>
            <div className="flex flex-wrap gap-y-2.5 gap-x-2">
              {durationOptions?.map((item: any) => (
                <div
                  key={item.value}
                  onClick={() => setDuration(item.value)}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm hover:bg-primary hover:text-white ${duration === item.value ? 'border-transparent bg-primary text-white' : 'border-gray-200 bg-transparent text-gray-900'}`}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex min-h-9 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Allow join meeting before host</Label>
              <Switch
                className="cursor-pointer"
                onCheckedChange={(checked) => {
                  setValue('allowHost', checked ? 'Yes' : 'No');
                }}
                checked={watch('allowHost') === 'Yes'}
              />
            </div>

            <div className="mb-3 flex min-h-9 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Label>Need Password to join meeting</Label>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                {watch('need_password') === 'Yes' && (
                  <div className="w-full sm:w-50">
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
            {videAccess?.invite && (
              <DropdownMenu>
                <DropdownMenuTrigger className="mb-3 w-full cursor-pointer rounded-xl border border-primary bg-white px-3 py-2 text-sm text-primary hover:bg-primary hover:text-white sm:ml-auto sm:w-auto">
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
            )}
            {isAllParticipantsNull && allParticipants && allParticipants?.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 px-1 sm:px-4">
                  <p className="font-medium">Participants</p>
                  <div
                    className="cursor-pointer text-sm font-medium text-red-500"
                    onClick={() => {
                      setValue('inviteOthers', []);
                      setValue('members', []);
                    }}
                  >
                    Remove All
                  </div>
                </div>
                <ul className="flex flex-col gap-2 px-1 sm:px-4">
                  {allParticipants?.map(
                    (member) =>
                      member?.email && (
                        <li
                          key={member.email}
                          className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 sm:items-center sm:border-0 sm:px-0"
                        >
                          <div className="flex min-w-0 items-start gap-2 sm:items-center">
                            <Icon name="CheckMarkIcon" className="text-green-500 w-4 h-4" />
                            <p className="break-all text-gray-800">
                              {member?.name || member?.email}
                            </p>
                          </div>
                          <span
                            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white"
                            onClick={() => handleRemoveMember(member)}
                          >
                            <Icon name="CloseIcon" className=" w-2 h-2" />
                          </span>
                        </li>
                      ),
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant={'transparent'}
            type="button"
            onClick={() => setDrawerState(false)}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant={'primary'}
            type="submit"
            className="flex-1 sm:flex-none"
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

export default ScheduleMeeting;

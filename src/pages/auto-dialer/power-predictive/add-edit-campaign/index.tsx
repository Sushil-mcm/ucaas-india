import {
  useGetAssignedDIDNumbers,
  useGetGroupList,
  useGetIVR,
  useGetQueueList,
  useGetSite,
} from '@/hooks/common';
import { useUser } from '@/hooks/use-user';
import { createCampaign, getGreetings } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { AUTO_DIALER_INITIAL_VALUES, CAMPAIGN_DAYS } from '../constant';
import { AUTO_DIALER_SCHEMA } from '../schema';
import { yupResolver } from '@hookform/resolvers/yup';
import moment from 'moment';
import { _getDates } from '../helpers';
import countriesData from '@/assets/json/countries.json';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import CustomSelect from '@/components/custom/custom-select';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import DatePicker from 'react-datepicker';
import { handleAlert } from '@/lib/utils';
import { DIALER_TYPE } from '../../campaign/add-edit-campaign/consts';

type Props = {
  editCampaign: any;
  setTabs: (state: string) => void;
};
type CampaignDayKey = keyof typeof CAMPAIGN_DAYS;

const ContactMethodTypes = ['Random', 'Ascending', 'Descending'];

const CreateCampaign = (props: Props) => {
  const { editCampaign, setTabs } = props;
  const { type } = useParams();
  const [timezonesList, setTimezonesList] = useState<any>([]);
  const [_open, _setOpen] = useState(false);
  const [_datesAvail, _setDatesAvail] = useState<any>([]);
  const { user } = useUser();
  const { countryInfo } = user;
  const { data: IVRList = [] } = useGetIVR();
  const { data: queueList = [] } = useGetQueueList();
  const { data: assignedDIDList = [], isFetched: isDidFatched } = useGetAssignedDIDNumbers();
  const { data: groupList = [], isFetched: isGroupListFatched } = useGetGroupList({
    type: 'LEAD',
    generatedBy: null,
  });

  const { data: dataSiteList = [] } = useGetSite();

  const { data: voicemailList = [] } = useQuery({
    queryKey: ['useGetVoicemails'],
    queryFn: () =>
      getGreetings({
        page: 1,
        limit: 1000,
        filters: [],
        search: '',
        type: 'voicemail',
        sort: { key: 'created_at', desc: true },
      }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<any>({
    defaultValues: AUTO_DIALER_INITIAL_VALUES,
    resolver: yupResolver(AUTO_DIALER_SCHEMA),
    mode: 'onSubmit',
  });
  const today = new Date().toISOString().split('T')[0];
  const _holidays = watch('holidays');
  const _start_date = watch('startDate');
  const _end_date = watch('endDate');
  const _days_to_run = watch('daysToRun');
  const rotateCallerId = watch('rotateCallerId');

  useMemo(() => {
    // if (!location?.state?.campaign_data && _holidays?.length)
    //   resetField("holidays");
    if (!_start_date || !_end_date) {
      return _setDatesAvail([]);
    }
    const new_start_date = moment(_start_date).format('YYYY-MM-DD');
    const new_end_date = moment(_end_date).format('YYYY-MM-DD');
    const _fetchedDates = _getDates(new_start_date, new_end_date, _days_to_run);

    _setDatesAvail(_fetchedDates._date_arr);
  }, [_start_date, _end_date, _days_to_run]);
  const queryClient: any = useQueryClient();
  useEffect(() => {
    if (countryInfo?.alpha2code) {
      const country = countriesData.find((item) => item?.isoCode === countryInfo?.alpha2code);
      setTimezonesList(country?.timezones || []);
    } else {
      setTimezonesList([]);
    }
  }, [countryInfo?.alpha2code]);

  const { mutate: mutateAddCampaign, isPending: isPendingAddCampaign } = useMutation({
    mutationFn: createCampaign,
    onSuccess: (data) => {
      handleAlert({
        text: data?.data?.message || 'Campaign created successfully!',
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: ['getCampaignListForPreview'],
        exact: false,
      });
      resetForm();
      setTabs('campaign_list');
    },
  });

  const onSubmit = () => {
    const formVal = watch();

    const payload = {
      ...formVal,
      rotateCallerId: !!JSON.parse(formVal?.rotateCallerId || '1'),
      amd: !!JSON.parse(formVal?.amd || '1'),
      callerId: formVal?.callerId?.map((item: { value: string }) => item?.value),
      forwardToId: formVal?.forwardToId?.value,
      groupId: formVal?.groupId?.map((item: { value: string }) => item?.value),
      setting: {
        call_per_second: formVal?.setting?.call_per_second,
        max_attempt: formVal?.setting?.max_attempt.value,
        retry_after: formVal?.setting?.retry_after?.value,
        ring_time: formVal?.setting?.ring_time?.value,
      },
      siteId: formVal?.siteId?.value,
      timezone: formVal?.timezone?.value,
      voicemail: formVal?.voicemail?.value || '',
      ...(editCampaign ? { campaignId: editCampaign._id } : {}),
    };
    mutateAddCampaign(payload);
  };

  useEffect(() => {
    resetForm();
  }, [type]);

  const resetForm = () => {
    reset(AUTO_DIALER_INITIAL_VALUES);
    setValue('dialMethod', type === 'predictive-dialer' ? 'PREDICTIVE' : DIALER_TYPE.NORMAL);

    _setOpen(false);
    _setDatesAvail([]);
  };

  useEffect(() => {
    setValue('callerId', []);
  }, [rotateCallerId]);

  useEffect(() => {
    patchValues();
  }, [editCampaign, groupList, assignedDIDList]);

  const patchValues = () => {
    if (editCampaign && isDidFatched && isGroupListFatched) {
      setValue('name', editCampaign.name);
      setValue('startDate', moment(editCampaign.startDate).format('YYYY-MM-DD'));
      setValue('endDate', moment(editCampaign.endDate).format('YYYY-MM-DD'));
      setValue('startTime', editCampaign.startTime);
      setValue('endTime', editCampaign.endTime);
      setValue('daysToRun', editCampaign.daysToRun);

      const label =
        type === 'power-dialer'
          ? IVRList?.find((item: { uuid: string }) => item?.uuid === editCampaign.forwardToId)?.name
          : '';
      setValue('forwardToId', { label, value: editCampaign.forwardToId });

      setValue('setting', {
        call_per_second: editCampaign.setting.call_per_second,
        max_attempt: {
          label: editCampaign.setting.max_attempt,
          value: editCampaign.setting.max_attempt,
        },
        retry_after: {
          label: `${editCampaign.setting.retry_after} sec`,
          value: editCampaign.setting.retry_after,
        },
        ring_time: { label: editCampaign.setting.ring_time, value: editCampaign.setting.ring_time },
      });

      const siteLabel = dataSiteList?.find(
        (item: { uuid: string }) => item?.uuid === editCampaign.siteId,
      )?.name;
      setValue('siteId', { label: siteLabel, value: editCampaign.siteId });
      setValue('timezone', { label: editCampaign.timezone, value: editCampaign.timezone });

      const voicemailLabel = voicemailList?.find(
        (item: { uuid: string }) => item?.uuid === editCampaign.voicemail,
      )?.name;
      setValue('voicemail', { label: voicemailLabel, value: editCampaign.voicemail });

      const groupIds = editCampaign?.groupId
        ?.map((item: any) => {
          const group = groupList?.find((group: { _id: string }) => group?._id === item);
          if (group) {
            return { label: group.name, value: item };
          }
          return null; // Invalid group ID
        })
        .filter(Boolean); // Removes nulls

      setValue('groupId', groupIds);

      const callerIds = editCampaign?.callerId
        ?.map((item: any) => {
          const data = assignedDIDList?.find(
            (group: { did_number: string }) => group?.did_number === item,
          );
          if (data) {
            return {
              label: `${data?.did_number?.startsWith('+') ? data.did_number : `+${data.did_number}`}`,
              value: data.uuid,
            };
          }
          return null;
        })
        .filter(Boolean);

      setValue('callerId', callerIds);

      setValue('rotateCallerId', editCampaign.rotateCallerId ? '1' : '0');
      setValue('contactMethod', editCampaign.contactMethod);
      setValue('amd', editCampaign.amd ? '1' : '0');
      setValue('holidays', editCampaign.holidays);
      setValue('dialMethod', editCampaign.dialMethod);
      setValue('attempt', editCampaign.attempt);
      setValue('action', editCampaign.action);
    }
  };

  return (
    <>
      {' '}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full flex flex-col gap-2 justify-between h-full p-3 "
      >
        <div
          className="flex flex-col gap-3 bg-white rounded-xl h-[calc(100vh_-_13rem)] overflow-auto"
          onClick={() => _setOpen(false)}
        >
          <div className="border border-gray-200 rounded-xl p-3 gap-4 flex flex-col">
            <div className="flex w-full gap-4">
              <div className="flex flex-col gap-1.5 w-full">
                <Input
                  placeholder="Enter name"
                  label="Name"
                  {...register('name')}
                  error={errors?.name?.message}
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <CustomSelect
                  label={'Site'}
                  options={dataSiteList.map((site: { name: string; uuid: string }) => ({
                    label: site?.name,
                    value: site?.uuid,
                  }))}
                  handleChange={(e: ISELECTVALUE | null) => {
                    setValue(`siteId`, e || { label: '', value: '' }, { shouldValidate: true });
                  }}
                  value={watch('siteId')}
                  error={(errors as any)?.siteId?.message}
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <CustomSelect
                  label={'Timezone'}
                  options={timezonesList.map((site: { zoneName: string }) => ({
                    label: site?.zoneName,
                    value: site?.zoneName,
                  }))}
                  handleChange={(e: ISELECTVALUE | null) => {
                    setValue(`timezone`, e || { label: '', value: '' }, { shouldValidate: true });
                  }}
                  value={watch('timezone')}
                  error={(errors as any)?.timezone?.message}
                />
              </div>
            </div>
            <div className="flex w-full gap-4">
              <div className="flex items-center gap-3 w-1/2">
                <div className="flex flex-col gap-1.5 w-full">
                  <Input
                    type="date"
                    label="Start Date"
                    {...register('startDate')}
                    error={errors?.startDate?.message}
                    min={today} // Prevent past dates
                  />
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <Input
                    type="date"
                    label="End Date"
                    {...register('endDate')}
                    error={errors?.endDate?.message}
                    min={_start_date || today}
                  />
                </div>
              </div>
              <div className="flex gap-3 w-1/2">
                <div className="flex flex-col gap-1.5 w-full">
                  <Input
                    type="time"
                    label="Start Time"
                    {...register('startTime')}
                    error={errors?.startTime?.message}
                  />
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <Input
                    type="time"
                    label="End Time"
                    {...register('endTime')}
                    error={errors?.endTime?.message}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col w-full gap-4">
              <p className="font-semibold text-gray-900">Days to run</p>
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <Label>Days</Label>
                  {(Object.keys(CAMPAIGN_DAYS) as CampaignDayKey[]).map((day) => (
                    <div key={day} className="flex items-center gap-2">
                      <Checkbox
                        className="cursor-pointer"
                        onCheckedChange={(checked: boolean) => {
                          const currentDays = watch('daysToRun') ?? [];

                          if (checked) {
                            if (!currentDays.includes(CAMPAIGN_DAYS[day])) {
                              setValue('daysToRun', [...currentDays, CAMPAIGN_DAYS[day]]);
                            }
                          } else {
                            const filtered = currentDays.filter(
                              (d: string) => d !== CAMPAIGN_DAYS[day], // remove the **value**, not the key
                            );
                            setValue('daysToRun', filtered);
                          }
                        }}
                        checked={watch('daysToRun')?.includes(CAMPAIGN_DAYS[day])}
                        disabled={!watch('startDate') || !watch('endDate')}
                      />
                      <Label className="cursor-pointer">{day}</Label>
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex flex-col gap-1.5 w-1/3">
                    <Label>Select Holidays</Label>
                    <div
                      className="w-full flex flex-col"
                      onClick={(e) => {
                        e.stopPropagation();
                        _setOpen(true);
                      }}
                    >
                      <DatePicker
                        placeholderText="Select Date"
                        onChange={(_val) => {
                          const _selectedVal = moment(_val).format('YYYY-MM-DD');
                          return setValue(
                            'holidays',
                            _holidays.includes(_selectedVal)
                              ? _holidays.filter((_value: any) => _selectedVal !== _value)
                              : [..._holidays, _selectedVal],
                          );
                        }}
                        selected={null}
                        className="border normal-case border-gray-300 focus:shadow-secondary/5 focus:outline-none shadow-secondary/5 disabled:bg-gray-300 disabled:text-slate-500 disabled:border-gray-200 disabled:shadow-none text-gray-700 placeholder:text-gray-700 bg-white shadow-sm text-sm  hover:border-primary rounded-xl focus:border-primary w-full px-3 min-h-10 custom-className"
                        calendarClassName="custom-className-calendar"
                        popperClassName="custom-className-popper"
                        showMonthDropdown
                        showYearDropdown
                        peekNextMonth
                        filterDate={(_date) => {
                          const yymmdd = new Date(_date);
                          const _format = `${yymmdd.getFullYear()}-${(yymmdd.getMonth() + 1).toString().padStart(2, '0')}-${yymmdd
                            .getDate()
                            .toString()
                            .padStart(2, '0')}`;
                          return _datesAvail.includes(_format);
                        }}
                        dayClassName={(_val) => {
                          const _selectedVal = moment(_val).format('YYYY-MM-DD');
                          return _holidays.includes(_selectedVal)
                            ? 'react-datepicker__day--keyboard-danger'
                            : '';
                        }}
                        dropdownMode="select"
                        dateFormat="yyyy-MM-dd"
                        id="holidays"
                        open={_open}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {_holidays && _holidays.length ? (
                      <Label className="min-h-10">
                        <span className="font-semibold pr-3">Holidays:</span>
                        {_holidays
                          .map((date: any) => moment(date).format('DD-MM-YYYY')) // adjust format as needed
                          .join(', ')}
                      </Label>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-full gap-4">
              <div className="flex flex-col w-1/3 gap-1.5">
                <div className="flex items-end gap-3">
                  <CustomSelect
                    label={'Leads'}
                    options={
                      groupList?.length > 0
                        ? groupList?.map((item: { name: string; _id: string }) => ({
                            label: item?.name,
                            value: item?._id,
                          }))
                        : [{ label: 'No record found!', value: '', disabled: true }]
                    }
                    handleChange={(e: ISELECTVALUE | null) => {
                      setValue('groupId', e, { shouldValidate: true });
                    }}
                    value={watch('groupId')}
                    isMulti={true}
                    error={(errors as any)?.groupId?.message}
                  />
                  {/* <div className="cursor-pointer flex items-center justify-center rounded-xl min-w-10 w-10 h-10 bg-white border border-primary hover:bg-primary hover:text-white text-primary">
                    <UploadLineIcon className="w-5 h-5" />
                  </div> */}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 w-1/2">&nbsp;</div>
            </div>
            <div className="flex w-full gap-4 mt-1">
              <div className="flex gap-8">
                <Label>Leads Method:</Label>
                <RadioGroup
                  className="flex items-center gap-4"
                  value={watch('contactMethod')}
                  onValueChange={(value) => setValue('contactMethod', value)}
                >
                  {ContactMethodTypes.map((item) => (
                    <div className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value={item.toUpperCase()} id={item} />
                      <Label className="cursor-pointer" htmlFor={item}>
                        {item}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl p-3 gap-4 flex flex-col">
            <div className="flex w-full gap-4">
              <div className="flex flex-col gap-1.5 w-full">
                <CustomSelect
                  label={'Ring Time'}
                  options={[5, 10, 15, 20, 25, 30].map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  handleChange={(e: ISELECTVALUE | null) => {
                    setValue('setting.ring_time', e, { shouldValidate: true });
                  }}
                  value={watch('setting.ring_time')}
                  error={(errors?.setting as any)?.ring_time?.message}
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <CustomSelect
                  label={'Max Attempts'}
                  options={[1, 2, 3].map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  handleChange={(e: ISELECTVALUE | null) => {
                    setValue('setting.max_attempt', e, { shouldValidate: true });
                  }}
                  value={watch('setting.max_attempt')}
                  error={(errors?.setting as any)?.max_attempt?.message}
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <CustomSelect
                  label={'Retry After'}
                  options={[5, 6, 7, 8, 9, 10].map((item) => ({
                    label: `${item} sec`,
                    value: item,
                  }))}
                  handleChange={(e: ISELECTVALUE | null) => {
                    setValue('setting.retry_after', e, { shouldValidate: true });
                  }}
                  value={watch('setting.retry_after')}
                  error={(errors?.setting as any)?.retry_after?.message}
                />
              </div>
            </div>
            <div className="flex w-full gap-4">
              <div className="flex flex-col justify-between w-full gap-4">
                <Label>Rotate Caller ID</Label>
                <div className="flex flex-col gap-4 w-full">
                  <RadioGroup
                    className="flex items-center gap-4"
                    value={watch('rotateCallerId')}
                    onValueChange={(value) => setValue('rotateCallerId', value)}
                  >
                    <div className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="1" id="Yes" />
                      <Label htmlFor="Yes" className="cursor-pointer">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="0" id="No" />
                      <Label htmlFor="No" className="cursor-pointer">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                  <div className="flex flex-col gap-1.5 w-full">
                    <CustomSelect
                      label={'Select Caller ID'}
                      options={
                        assignedDIDList?.length > 0
                          ? assignedDIDList?.map((item: { did_number: string; uuid: string }) => ({
                              label: item?.did_number?.startsWith('+')
                                ? item?.did_number
                                : `+${item?.did_number}`,
                              value: item?.did_number,
                            }))
                          : []
                      }
                      handleChange={(e: ISELECTVALUE | null) => {
                        setValue('callerId', e, { shouldValidate: true });
                      }}
                      value={watch('callerId')}
                      isMulti={watch('rotateCallerId') === '1'}
                      className="text-xs"
                      error={(errors as any)?.callerId?.message}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <Input
                  label={`Call per ${watch('dialMethod') === DIALER_TYPE.NORMAL ? 'cycle' : 'agent'}`}
                  type="number"
                  {...register('setting.call_per_second')}
                  max={Number(10)}
                  min={0}
                  error={(errors?.setting as any)?.call_per_second?.message}
                />
              </div>
              {type === 'power-dialer' ? (
                <>
                  <div className="flex flex-col gap-1.5 w-full">
                    <CustomSelect
                      label={'IVR'}
                      options={
                        IVRList?.length > 0
                          ? IVRList?.map((item: { name: string; uuid: string }) => ({
                              label: item?.name,
                              value: item?.uuid,
                            }))
                          : [{ label: 'No record found!', value: '', disabled: true }]
                      }
                      handleChange={(e: ISELECTVALUE | null) => {
                        setValue('forwardTo', 'IVR');
                        setValue('forwardToId', e, { shouldValidate: true });
                      }}
                      value={watch('forwardToId') || {}}
                      error={(errors as any)?.forwardToId?.message}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5 w-full">
                  <CustomSelect
                    label={'Select Queue'}
                    options={
                      queueList?.length > 0
                        ? queueList?.map((item: { name: string; uuid: string }) => ({
                            label: item?.name,
                            value: item?.uuid,
                          }))
                        : [{ label: 'No record found!', value: '', disabled: true }]
                    }
                    handleChange={(e: ISELECTVALUE | null) => {
                      setValue('forwardTo', 'QUEUE');
                      setValue('forwardToId', e, { shouldValidate: true });
                    }}
                    value={watch('forwardToId') || {}}
                    error={(errors as any)?.forwardToId?.message}
                  />
                </div>
              )}
            </div>
            <div className="flex w-full gap-4 mt-2">
              <div className="flex gap-8">
                <Label>Answering Machine Detection:</Label>
                <RadioGroup
                  className="flex items-center gap-4"
                  value={watch('amd')}
                  onValueChange={(value) => setValue('amd', value)}
                >
                  <div className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="1" id="Yes" />
                    <Label htmlFor="Yes" className="cursor-pointer">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="0" id="No" />
                    <Label htmlFor="No" className="cursor-pointer">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <div className="flex w-full gap-4 h-10">
              {watch('amd') === '1' && (
                <div className="flex w-full gap-4 items-end">
                  <div className="flex gap-8 items-center ">
                    <Label>Select Action:</Label>
                    <RadioGroup
                      className="flex items-center gap-4 h-10"
                      value={watch('action')}
                      onValueChange={(value) => setValue('action', value)}
                    >
                      <div className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="HANGUP" id="HANGUP" />
                        <Label htmlFor="HANGUP" className="cursor-pointer">
                          Hangup
                        </Label>
                      </div>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="DROP_VOICEMAIL" id="DROP_VOICEMAIL" />
                        <Label htmlFor="DROP_VOICEMAIL" className="cursor-pointer">
                          Voicemail Message
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <>
                    {watch('action') === 'DROP_VOICEMAIL' && (
                      <div className="flex gap-1.5 relative flex-row">
                        <CustomSelect
                          label={'Voicemail'}
                          options={
                            voicemailList?.length > 0
                              ? voicemailList?.map((item: { name: string; uuid: string }) => ({
                                  label: item?.name,
                                  value: item?.uuid,
                                }))
                              : [{ label: 'No record found!', value: '', disabled: true }]
                          }
                          handleChange={(e: ISELECTVALUE | null) => {
                            setValue('voicemail', e, { shouldValidate: true });
                          }}
                          value={watch('voicemail') || {}}
                          error={(errors as any)?.voicemail?.message}
                          menuPlacement="top"
                        />
                      </div>
                      //   <CustomSelect
                      //     options={voicemailList.map((item) => ({
                      //       label: item?.name,
                      //       value: item?.uuid,
                      //     }))}
                      //     onChange={(value) => {
                      //       setValue('voicemail', value, {
                      //         shouldValidate: true,
                      //       });
                      //     }}
                      //     value={watch('voicemail') || {}}
                      //     positionClasses="flex items-center gap-2 w-full"
                      //     btnMinWidth="min-w-60"
                      //     selectWidth="w-full"
                      //     label="IVR:"
                      //     mainWidth="w-1/2"
                      //     mainDirection="flex-row gap-8"
                      //     error={errors?.voicemail?.message}
                      //   />
                    )}
                  </>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end px-3">
          <Button variant={'primary'} type="submit" disabled={isPendingAddCampaign}>
            {isPendingAddCampaign ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </>
  );
};

export default CreateCampaign;

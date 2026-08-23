import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ModalProps } from '@/interfaces/common-interface';
import { FC, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import ErrorTooltip from './error-tooltip';
import { CloseIcon } from '@/assets/icons';
// import DatePicker from 'react-datepicker';
import moment from 'moment';
import { CAMPAIGN_SETTINGS_CONST } from '@/constants/common-const';

interface IBussinessModalProps extends ModalProps {
  setError: (value: string | null) => void;
}

const CampaignBussinessHoursModal: FC<IBussinessModalProps> = ({
  modalState,
  setModalState,
  setError,
  data,
}) => {
  const { settings = CAMPAIGN_SETTINGS_CONST.settings } = data || {};
  const {
    trigger,
    watch,
    setValue,
    register,
    setError: setFormError,
    clearErrors,
    formState: { errors },
  } = useFormContext();
  const _holidays = watch('settings.operational_hours.holidays');

  const watchBusinessHour = watch('settings.operational_hours');
  const startDate = watch('startDate') ? moment(watch('startDate')) : null;
  const endDate = watch('endDate') ? moment(watch('endDate')) : null;

  const handleChangeScheduleOption = (checked: boolean, day: string) => {
    const currentScheduleOptions = watchBusinessHour?.value || {};
    const updatedScheduleOptions = {
      ...currentScheduleOptions,
      [day]: {
        ...currentScheduleOptions[day],
        open: checked,
        start: checked ? '10:00' : '',
        end: checked ? '23:00' : '',
      },
    };
    setValue('settings.operational_hours.value', updatedScheduleOptions);
    const isOpen = Object.values(updatedScheduleOptions || {}).some((day: any) => day?.open);

    if (isOpen) {
      setError(null);
    } else {
      setError('You must select at least one active working day.');
    }
  };

  useEffect(() => {
    checkErrors();
  }, [watchBusinessHour]);

  const checkErrors = () => {
    if (watchBusinessHour?.type !== 'weekly') return;

    const days = Object.keys(watchBusinessHour?.value || {});

    days.forEach((day) => {
      const start = watch(`settings.operational_hours.value.${day}.start`);
      const end = watch(`settings.operational_hours.value.${day}.end`);
      const open = watch(`settings.operational_hours.value.${day}.open`);

      if (open && start && end && start >= end) {
        setFormError(`settings.operational_hours.value.${day}.end`, {
          type: 'manual',
          message: 'End time must be after start time',
        });
      } else {
        clearErrors(`settings.operational_hours.value.${day}.end`);
      }
    });
  };

  const handleSubmit = async () => {
    checkErrors();
    const hasAnyEndTimeError = Object.values(
      (errors?.settings as any)?.operational_hours?.value || {},
    ).some((day: any) => !!day?.end);
    const isValid = await trigger([
      'settings.operational_hours.holidays',
      'settings.operational_hours.closed_hour_action',
    ]);
    if (hasAnyEndTimeError || !isValid) return;

    setModalState(false);
  };

  const handleCancel = () => {
    setValue('settings.operational_hours.type', settings?.operational_hours?.type || '');
    setValue('settings.operational_hours.value', settings?.operational_hours?.value || {});
    const holidays =
      settings?.operational_hours?.holidays && settings?.operational_hours?.holidays?.length
        ? settings?.operational_hours?.holidays?.map((item: any) => ({
            title: item?.title || '',
            from: item?.from || '',
            to: item?.to || '',
            type: {
              label: item?.type_label || '',
              value: item?.type || '',
            },
            value: {
              label: item?.name || '',
              value: item?.value || '',
              name: item?.name || '',
            },
            personal: item?.personal || false,
          }))
        : [];

    setValue('settings.operational_hours.holidays', holidays);
    setModalState(false);
  };

  const isDayWithinRange = (day: string) => {
    if (!startDate || !endDate) return true; // if no range, don’t block

    const dayIndex = moment().day(day).day(); // mon=1 ... sun=0

    const checkDay = (current: moment.Moment): boolean =>
      current.isAfter(endDate, 'day')
        ? false
        : current.day() === dayIndex || checkDay(current.clone().add(1, 'day'));

    return checkDay(startDate.clone());
  };

  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-1/2 p-3 max-h-[99%] overflow-y-auto" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Campaign Hours
            <div
              onClick={handleCancel}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <div className="min-h-[350px] ">
          <div className="flex flex-col gap-2">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
              (day, index) => {
                const currentDayData = watchBusinessHour?.value?.[day];
                if (!currentDayData) return null;

                const { open } = currentDayData;
                const disabledDay = !isDayWithinRange(day);
                return (
                  <div key={`${day}-${index}`} className="flex items-center gap-4">
                    <div className="inline-flex">
                      <div className="bg-primary/20 rounded-xl py-3 px-4 flex gap-4 min-w-40 justify-between">
                        <div className="flex gap-2">
                          <Label className={`capitalize ${disabledDay ? 'text-gray-400' : ''}`}>
                            {day}
                          </Label>
                        </div>
                        <Switch
                          onCheckedChange={(checked) => {
                            if (disabledDay) return;
                            handleChangeScheduleOption(checked, day);
                          }}
                          checked={open}
                          disabled={disabledDay}
                        />
                      </div>
                    </div>
                    {open && (
                      <div className="flex gap-4 w-full">
                        <Input
                          disabled={disabledDay}
                          placeholder="Enter start"
                          type="time"
                          {...register(`settings.operational_hours.value.${day}.start`)}
                        />

                        <Input
                          disabled={disabledDay}
                          placeholder="Enter end"
                          type="time"
                          {...register(`settings.operational_hours.value.${day}.end`)}
                        />
                        {(errors?.settings as any)?.operational_hours?.value?.[day]?.end
                          ?.message && (
                          <ErrorTooltip
                            text={
                              (errors?.settings as any)?.operational_hours?.value?.[day]?.end
                                ?.message
                            }
                          />
                        )}

                        <div className="flex gap-2 items-center w-full">
                          <Checkbox
                            disabled={disabledDay}
                            checked={watch(`settings.operational_hours.value.${day}.is_checked`)}
                            onCheckedChange={(checked: boolean) => {
                              setValue(
                                `settings.operational_hours.value.${day}.is_checked`,
                                checked,
                              );
                              if (checked) {
                                setValue(`settings.operational_hours.value.${day}.start`, '00:00');
                                setValue(`settings.operational_hours.value.${day}.end`, '23:59');
                              } else {
                                setValue(`settings.operational_hours.value.${day}.start`, '10:00');
                                setValue(`settings.operational_hours.value.${day}.end`, '23:00');
                              }
                            }}
                            id={`check-${index}`}
                          />
                          <Label htmlFor={`check-${index}`} className="cursor-pointer">
                            24 Hours
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
        <div className="p-3 rounded-lg gap-3 flex flex-col">
          <div className="flex items-start gap-3 flex-col">
            <div className="flex flex-col gap-1.5 w-2/4">
              <Label>Select Holidays</Label>
              <div className="w-full flex flex-col">
                <Input
                  type="date"
                  onChange={(e) => {
                    const _val = e.target.value;
                    const _selectedVal = moment(_val).format('YYYY-MM-DD');
                    e.target.value = '';
                    return setValue(
                      'settings.operational_hours.holidays',
                      _holidays.includes(_selectedVal)
                        ? _holidays.filter((_value: any) => _selectedVal !== _value)
                        : [..._holidays, _selectedVal],
                    );
                  }}
                />
                {/* <DatePicker
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
                    /> */}
              </div>
            </div>
            {_holidays && _holidays.length ? (
              <div className="flex flex-col  gap-1">
                <span className="font-semibold text-sm">Holidays:</span>
                <div className="flex flex-wrap  gap-1">
                  {_holidays.map((day: any) => (
                    <div className="flex  gap-1.5 min-h-10  border border-gray-300 border-dashed px-3 py-2 rounded-md bg-gray-50">
                      <Label className="">{moment(day).format('MMM DD, YYYY')}</Label>
                      <span className="text-sm">{moment(day).format('ddd')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <div className="justify-end flex gap-2">
            <Button type="button" variant={'transparent'} onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" variant={'outline'} onClick={() => handleSubmit()}>
              Submit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignBussinessHoursModal;

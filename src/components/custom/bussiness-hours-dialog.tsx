import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/constants/forwarding-consts';
import { ModalProps } from '@/interfaces/common-interface';
import { FC, useEffect, useState } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import ErrorTooltip from './error-tooltip';
import { AddCircle, CloseIcon } from '@/assets/icons';
import { CustomDatePicker } from './custom-datepicker';
import moment from 'moment';
import ForwardingActions from './forwarding-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useUser } from '@/hooks/use-user';
import { getHolidaysFormVal, handleAlert } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';
import { buildHolidayImport, readCompanyHolidays } from '@/lib/company-holiday-import';
import ForwardingHolidaysActions from './forward-holidays-action';
import { OPERATIONAL_HOURS } from '../common-settings/constants';

interface IBussinessModalProps extends ModalProps {
  setError: (value: string | null) => void;
  selectedUserExt?: string | null;
  aiMode?: boolean;
}

/* A line accepts at most this many holiday rows. Worth knowing when importing:
   the US federal list alone is 11, so a full import will not fit and the user
   has to be told which dates were left out rather than losing them silently. */
const MAX_HOLIDAYS = 10;

const TABS = {
  GENERAL_SETTINGS: 'General Settings',
  CUSTOM_SETTINGS: 'Custom Settings',
};

const BussinessHoursModal: FC<IBussinessModalProps> = ({
  modalState,
  setModalState,
  setError,
  data,
  selectedUserExt = null,
  aiMode = false,
}) => {
  const { settings = {} } = data || {};
  const { operational_hours = OPERATIONAL_HOURS } = settings;
  const {
    trigger,
    watch,
    setValue,
    register,
    control,
    setError: setFormError,
    clearErrors,
    formState: { errors },
  } = useFormContext();

  const { user } = useUser();
  const { user_info } = user;

  const { append, remove, fields } = useFieldArray({
    control,
    name: 'settings.operational_hours.holidays',
  });

  const watchBusinessHour = watch('settings.operational_hours');
  const [activeTab, setActiveTab] = useState(TABS.GENERAL_SETTINGS);
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
    let hasAiClosedHourError = false;

    if (aiMode && watchBusinessHour?.type === 'weekly') {
      const closedHourAction = watch('settings.operational_hours.closed_hour_action') || {};
      const closedHourType = closedHourAction?.type?.value;
      const closedHourValue = closedHourAction?.value?.value;
      const requiresDestination = closedHourType && !['HANGUP'].includes(closedHourType);
      const typeMissing = !closedHourType;
      const valueMissing = Boolean(requiresDestination && !closedHourValue);

      if (typeMissing) {
        setFormError('settings.operational_hours.closed_hour_action.type.value', {
          type: 'manual',
          message: 'Closed hour type is required',
        });
      } else {
        clearErrors('settings.operational_hours.closed_hour_action.type.value');
      }

      if (valueMissing) {
        setFormError('settings.operational_hours.closed_hour_action.value.value', {
          type: 'manual',
          message: 'Closed hour value is required',
        });
      } else {
        clearErrors('settings.operational_hours.closed_hour_action.value.value');
      }
      hasAiClosedHourError = typeMissing || valueMissing;
    }

    const isValid = await trigger([
      'settings.operational_hours.holidays',
      'settings.operational_hours.closed_hour_action',
    ]);
    if (hasAnyEndTimeError || hasAiClosedHourError || !isValid) return;

    setModalState(false);
  };
  /* Only fetched while the dialog is open — this component is mounted on every
     queue, IVR, user and number screen, and the company record does not need
     loading until someone actually opens business hours. */
  const { data: companyDefaults } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    enabled: Boolean(modalState),
    staleTime: 5 * 60 * 1000,
  });

  const companyHolidays = readCompanyHolidays(companyDefaults?.settings);

  /* Copies the company's declared dates onto this line and gives each one an
     action, since a holiday without one will not validate. Existing rows are
     left exactly as they are: someone who has already tuned Christmas on this
     queue should not have it overwritten by a bulk import. */
  const importCompanyHolidays = () => {
    const existing = watch('settings.operational_hours.holidays') || [];
    const { toAppend, skippedDuplicate, skippedCapacity, unresolvedAction } = buildHolidayImport({
      companyHolidays,
      existingHolidays: existing,
      closedHourAction: watch('settings.operational_hours.closed_hour_action'),
      fallbackExtension: selectedUserExt || user_info?.extension,
      capacity: MAX_HOLIDAYS - existing.length,
    });

    /* Refused rather than appending rows that cannot validate — that would
       block saving with an error pointing at a date field, not at the cause. */
    if (unresolvedAction) {
      return handleAlert({
        text: 'Set what happens outside opening hours first. Each holiday needs an action, and company holidays copy that one.',
        type: 'error',
      });
    }

    toAppend.forEach((holiday) => append(holiday));

    const added = toAppend.length;
    if (!added && !skippedCapacity) {
      return handleAlert({
        text: skippedDuplicate
          ? 'Those company holidays are already on this line.'
          : 'No company holidays have been set up yet.',
        type: 'info',
      });
    }

    /* The capacity message names the limit, because "3 could not be added" with
       no reason reads as a bug. */
    handleAlert({
      text: skippedCapacity
        ? `Added ${added}. ${skippedCapacity} did not fit — a line holds ${MAX_HOLIDAYS} holidays. Remove some, or add the rest by hand.`
        : `Added ${added} company ${added === 1 ? 'holiday' : 'holidays'}. Check the action on each, then save.`,
      type: skippedCapacity ? 'info' : 'success',
    });
  };

  const appendCustomDays = () => {
    if (fields && fields?.length >= MAX_HOLIDAYS) return;
    append({
      title: '',
      from: null,
      to: null,
      type: { label: '', value: '' },
      value: { label: '', value: '' },
      personal: false,
    });
  };

  const handleRadioChange = (value: string) => {
    const type = value === '24_hours' ? '' : 'VOICEMAIL';
    const typeValue = value === '24_hours' ? '' : user_info?.extension;
    setValue('settings.operational_hours.type', value);
    setValue(
      'settings.operational_hours.value',
      value === 'weekly' ? CUSTOM_HOURS_SCHEDULE_OPTIONS : '',
    );
    setValue('settings.operational_hours.holidays', value === '24_hours' ? [] : []);
    setValue('settings.operational_hours.closed_hour_action', {
      type: { label: 'Send to Voicemail', value: type },
      value: { label: '', value: typeValue },
      personal: value !== '24_hours',
      enabled: value !== '24_hours',
    });
  };

  const handleCancel = () => {
    setValue('settings.operational_hours.type', operational_hours?.type || '');
    setValue('settings.operational_hours.value', operational_hours?.value || {});
    setValue('settings.operational_hours.closed_hour_action', {
      type: {
        label: !data?.settings?.operational_hours
          ? operational_hours?.closed_hour_action?.type?.label
          : operational_hours?.closed_hour_action?.type_label || '',
        value: !data?.settings?.operational_hours
          ? operational_hours?.closed_hour_action?.type?.value
          : operational_hours?.closed_hour_action?.type || '',
      },
      value: {
        label: !data?.settings?.operational_hours
          ? operational_hours?.closed_hour_action?.value?.label
          : operational_hours?.closed_hour_action?.value_label || '',
        value: !data?.settings?.operational_hours
          ? operational_hours?.closed_hour_action?.value?.value
          : operational_hours?.closed_hour_action?.value || '',
      },
      enabled: operational_hours?.closed_hour_action?.enabled,
      personal: operational_hours?.closed_hour_action?.personal,
    });
    const holidays =
      operational_hours?.holidays && operational_hours?.holidays?.length
        ? getHolidaysFormVal(operational_hours?.holidays)
        : [];

    setValue('settings.operational_hours.holidays', holidays);
    setModalState(false);
  };

  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="md:w-1/2   p-3 max-h-[99%] overflow-y-auto" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">Business Hours</DialogTitle>
            <div
              onClick={handleCancel}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex w-full max-h-[calc(100vh-250px)] overflow-auto pr-1"
        >
          <div className="border-b border-gray-200 w-full">
            <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none bg-transparent min-h-10 ">
              <TabsTrigger
                className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4   m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                value={TABS.GENERAL_SETTINGS}
              >
                {TABS.GENERAL_SETTINGS}{' '}
              </TabsTrigger>
              <TabsTrigger
                className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4   m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                value={TABS.CUSTOM_SETTINGS}
              >
                {TABS.CUSTOM_SETTINGS}{' '}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={TABS.GENERAL_SETTINGS}>
            <RadioGroup
              className="border border-gray-200 rounded-xl flex gap-4 p-3 min-h-10 mb-2"
              value={watch('settings.operational_hours.type')}
              onValueChange={(value) => {
                handleRadioChange(value);
              }}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="24_hours" id="24_hours" className="cursor-pointer" />
                <Label htmlFor="24_hours" className="cursor-pointer">
                  24 Hours, all times
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <RadioGroupItem value="weekly" id="weekly" className="cursor-pointer" />
                <Label htmlFor="weekly" className="cursor-pointer">
                  Weekly Schedule
                </Label>
              </div>
            </RadioGroup>
            {watchBusinessHour?.type === 'weekly' && (
              <div className="min-h-[350px]">
                <div className="flex flex-col gap-2">
                  {[
                    'monday',
                    'tuesday',
                    'wednesday',
                    'thursday',
                    'friday',
                    'saturday',
                    'sunday',
                  ].map((day, index) => {
                    const currentDayData = watchBusinessHour?.value?.[day];
                    if (!currentDayData) return null;

                    const { open } = currentDayData;

                    return (
                      <div
                        key={`${day}-${index}`}
                        className="flex items-center gap-4 bg-ucass-primary-200/50 p-2 rounded-lg"
                      >
                        <div className="inline-flex">
                          {/* <div className="bg-primary/20 rounded-xl py-3 px-4 flex gap-4 min-w-40 justify-between"> */}
                          <div className="py-2 px-3 flex gap-4 min-w-40 justify-between">
                            <div className="flex gap-2">
                              <Label className="capitalize">{day}</Label>
                            </div>
                            <Switch
                              onCheckedChange={(checked) => {
                                handleChangeScheduleOption(checked, day);
                              }}
                              checked={open}
                            />
                          </div>
                        </div>
                        {open && (
                          <div className="flex gap-4 w-full">
                            <Input
                              placeholder="Enter start"
                              type="time"
                              {...register(`settings.operational_hours.value.${day}.start`)}
                            />

                            <Input
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
                                checked={watch(
                                  `settings.operational_hours.value.${day}.is_checked`,
                                )}
                                onCheckedChange={(checked: boolean) => {
                                  setValue(
                                    `settings.operational_hours.value.${day}.is_checked`,
                                    checked,
                                  );
                                  if (checked) {
                                    setValue(
                                      `settings.operational_hours.value.${day}.start`,
                                      '00:00',
                                    );
                                    setValue(
                                      `settings.operational_hours.value.${day}.end`,
                                      '23:59',
                                    );
                                  } else {
                                    setValue(
                                      `settings.operational_hours.value.${day}.start`,
                                      '10:00',
                                    );
                                    setValue(
                                      `settings.operational_hours.value.${day}.end`,
                                      '23:00',
                                    );
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
                  })}

                  {!aiMode && (
                    <div className="p-3 border border-gray-200 rounded-lg gap-3 flex flex-col">
                      <ForwardingActions
                        setValue={setValue}
                        watch={watch}
                        errors={errors}
                        forwardState={`settings.operational_hours.closed_hour_action`}
                        mainClasses="w-full"
                        selectWidth="w-1/2"
                        selectInnerWidth="w-fit"
                        selectTwoWidth="w-fit"
                        gap="sm:gap-2 xs:gap-2"
                        mainGapClasses="gap-0"
                        mainTypeDivClass="w-1/3"
                        radioClass="w-fit pr-2"
                        mainValueJustifyClass="justify-between w-full"
                        audioCustomClass="w-80"
                        typeLabel="Closed Hour Type"
                        valueLabel="Closed Hour Value"
                        selectedUserExt={watch('basic.extension') || selectedUserExt}
                        isShowUpload={false}
                        // label="Action during holiday"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value={TABS.CUSTOM_SETTINGS}>
            {/* Custom Days */}
            <div className="p-3 bg-ucass-primary-200/50  border border-ucass-primary-200 rounded-lg gap-3 flex flex-col">
              <div className="flex justify-between items-center">
                <div className="font-semibold truncate text-md flex items-center justify-between">
                  Custom Days Settings
                </div>
                <div className="flex items-center gap-2">
                  {/* Only offered when the company has actually declared holidays,
                      so the button never promises something that does nothing. */}
                  {companyHolidays.length > 0 && (
                    <Button
                      variant={'outline'}
                      type="button"
                      onClick={() => importCompanyHolidays()}
                      disabled={fields?.length >= MAX_HOLIDAYS}
                      title={
                        fields?.length >= MAX_HOLIDAYS
                          ? `This line already holds ${MAX_HOLIDAYS} holidays`
                          : 'Copy the holidays set up for your company onto this line'
                      }
                      className="h-10 text-xs font-semibold"
                    >
                      Add company holidays ({companyHolidays.length})
                    </Button>
                  )}
                  <Button
                    variant={'outline'}
                    type="button"
                    onClick={() => appendCustomDays()}
                    className="w-10 h-10"
                  >
                    <AddCircle className="w-6 h-6" />
                  </Button>
                </div>
              </div>

              {fields.map((field, index) => {
                const prevToDate = watch(`settings.operational_hours.holidays.${index - 1}.to`);
                const fromPath = `settings.operational_hours.holidays.${index}.from`;
                const toPath = `settings.operational_hours.holidays.${index}.to`;
                const currentFromDate = watch(fromPath);
                return (
                  <div
                    key={field.id}
                    className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-ucass-primary-200"
                  >
                    <div className="flex items-end gap-2 justify-between">
                      <div className="flex items-end gap-2 w-[calc(100%_-_2.5rem)]">
                        <div className="w-1/3">
                          <Input
                            {...register(`settings.operational_hours.holidays.${index}.title`)}
                            placeholder="Title"
                            type="text"
                            error={
                              (errors?.settings as any)?.operational_hours?.holidays?.[index]?.title
                                ?.message
                            }
                          />
                        </div>
                        <div className="w-1/3">
                          <Controller
                            control={control}
                            name={fromPath}
                            render={({ field }) => (
                              <CustomDatePicker
                                placeholder="Select From"
                                minDate={prevToDate ? moment(prevToDate).toDate() : new Date()}
                                value={field.value ? moment(field.value).toDate() : null}
                                onChange={(date) => {
                                  const formattedDate = moment(date).format('YYYY-MM-DD');
                                  field.onChange(formattedDate);
                                  setValue(toPath, '');
                                }}
                                error={
                                  (errors?.settings as any)?.operational_hours?.holidays?.[index]
                                    ?.from?.message
                                }
                              />
                            )}
                          />
                        </div>
                        <div className="w-1/3">
                          <Controller
                            control={control}
                            name={toPath}
                            render={({ field }) => (
                              <CustomDatePicker
                                placeholder="Select To"
                                minDate={
                                  currentFromDate ? moment(currentFromDate).toDate() : new Date()
                                }
                                value={field.value ? moment(field.value).toDate() : null}
                                onChange={(date) => {
                                  const formattedDate = moment(date).format('YYYY-MM-DD');
                                  field.onChange(formattedDate);
                                }}
                                error={
                                  (errors?.settings as any)?.operational_hours?.holidays?.[index]
                                    ?.to?.message
                                }
                              />
                            )}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => remove(index)}
                        className="text-red-500 text-lg font-bold w-10 h-10 border-red-500 hover:bg-red-500"
                      >
                        <CloseIcon className="w-3 h-3" />
                      </Button>
                    </div>

                    {!aiMode && (
                      <ForwardingHolidaysActions
                        setValue={setValue}
                        watch={watch}
                        errors={errors}
                        forwardState={`settings.operational_hours.holidays.${index}`}
                        isShowUpload={false}
                        selectedUserExt={watch('basic.extension') || selectedUserExt}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

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

export default BussinessHoursModal;

import { useUser } from '@/hooks/use-user';
import { useQueries, useQuery } from '@tanstack/react-query';
import ErrorTooltip from './error-tooltip';
import { forwardActionType, getGreetings } from '@/services/api';
import PhoneInput from 'react-phone-input-2';
import CustomSelect from './custom-select';
import SelectGreeting from './greeting-select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { ExtensionListView } from '@/pages/admin-settings/users/extension/update-forwarding/call-rules/add-coworker';

const FORWARD_TYPES: any = {
  VOICEMAIL: 'VOICEMAIL',
  GREETING: 'GREETING',
  EXTENSION: 'EXTENSION',
  PHONE: 'PHONE',
  HANGUP: 'HANGUP',
  MESSAGE: 'MESSAGE',
  QUEUE: 'QUEUE',
};

export const callForwardAgentAI = [
  {
    label: 'Forward to Queue',
    value: 'QUEUE',
  },
].filter(Boolean);

export const callForwardingOptions = [
  {
    label: 'Send to Voicemail',
    value: 'VOICEMAIL',
  },
  {
    label: 'Play an Announcement',
    value: 'MESSAGE',
  },
  {
    label: 'Forward to Extension',
    value: 'EXTENSION',
  },
  {
    label: 'Forward to External Number',
    value: 'PHONE',
  },
  {
    label: 'Hangup',
    value: 'HANGUP',
  },
].filter(Boolean);
function getNestedValue(obj: any, path: any) {
  return path.split('.').reduce((acc: any, key: any) => acc && acc[key], obj) || {};
}

const FORWARD_TYPES_ARR = ['EXTENSION', 'DEPARTMENT', 'IVR', 'QUEUE'];

const ForwardingActions = ({
  setValue = () => {},
  watch = () => {},
  errors = {},
  forwardState = '',
  label = null,
  description = '',
  SITE_UUID = null,
  selectedUserExt = null,
  mainClasses = '',
  selectTwoWidth = 'w-fit',
  gap = 'gap-5',
  mainGapClasses = 'gap-4',
  mainValueDivClass = '',
  mainTypeDivClass = '',
  radioClass = '',
  mainValueJustifyClass = 'justify-center',
  isShowUpload = true,
  typeLabel = '',
  valueLabel = '',
  audioCustomClass = 'w-60',
  inputClass = '',
  extenstionClass = '',
  menuPlacement = 'top',
  selectCustomClassSecond = '',
  mode = 'default',
  optionsData = null,
  disableInternalFetch = false,
}: any) => {
  const { user } = useUser();
  const { user_info } = user || {};

  const forwardType = `${forwardState}.type`;
  const forwardValue = `${forwardState}.value`;
  const isPersonalVoicemail = `${forwardState}.personal`;

  const watchForwardType = watch(forwardType) || { value: '' };
  const watchForwardValue = watch(forwardValue) || null;
  const watchIsPersonalVoicemail = watch(isPersonalVoicemail) || false;

  // Safely get error message
  const errorResponse =
    getNestedValue(errors, forwardState)?.value?.value?.message ||
    getNestedValue(errors, forwardState)?.value?.message ||
    '';

  const SITE_UUID_TEMP = SITE_UUID || watch('site')?.value || user_info?.site_uuid;
  const shouldUseExternalOptions = Boolean(optionsData);
  const shouldFetchInternally = !disableInternalFetch && !shouldUseExternalOptions;

  const queries = useQueries({
    queries: FORWARD_TYPES_ARR.map((type) => ({
      queryKey: ['forwardActionType-call-forwarding', SITE_UUID_TEMP, type],
      queryFn: () =>
        forwardActionType({
          page: 1,
          limit: 1000,
          filters: [],
          search: '',
          site_uuid: SITE_UUID_TEMP || undefined,
          type,
        }),
      enabled: shouldFetchInternally,
      select: (data: any) => data?.data?.data?.result?.rows || [],
    })),
  });

  const forwardActionTypeData: any = queries?.map((query) => query.data);

  const { data: greetingList = [], refetch } = useQuery({
    queryKey: ['greetings'],
    queryFn: () => getGreetings({ page: 1, limit: 1000, search: '', type: 'greeting' }),
    select: (res) => res?.data?.data?.result?.rows ?? [],
    enabled: shouldFetchInternally,
  });
  const [
    extensionListFetched = [],
    departmentListFetched = [],
    IVRListFetched = [],
    queueListFetched = [],
  ] = forwardActionTypeData;
  const extensionList = optionsData?.extensionList ?? extensionListFetched;
  const departmentList = optionsData?.departmentList ?? departmentListFetched;
  const IVRList = optionsData?.IVRList ?? IVRListFetched;
  const queueList = optionsData?.queueList ?? queueListFetched;
  const effectiveGreetingList = optionsData?.greetingList ?? greetingList;
  let extensionData = extensionList?.map((extension: any) => ({
    label: `${extension?.first_name}${extension?.last_name ? ` ${extension?.last_name}` : ''}`,
    value: extension?.extension,
    name: `${extension?.first_name}${extension?.last_name ? ` ${extension?.last_name}` : ''}`,
  }));

  if (selectedUserExt) {
    extensionData = extensionData?.filter((item: any) => item?.value !== selectedUserExt);
  }

  if (user_info?.extension) {
    extensionData = extensionData?.filter((ext: any) => ext.value !== user_info?.extension);
  }

  const greetingData = effectiveGreetingList?.map((greeting: any) => ({
    label: greeting?.name,
    value: greeting?.filename,
    name: greeting?.name,
  }));
  const departmentData = departmentList?.map((department: any) => ({
    label: department?.name,
    value: department?.uuid,
    name: department?.name,
  }));
  const IVRData = IVRList?.map((ivr: any) => ({
    label: ivr?.name,
    value: ivr?.uuid,
    name: ivr?.name,
  }));

  const queueData = queueList?.map((queue: any) => ({
    label: queue?.name,
    value: queue?.uuid || queue?._id || queue?.id || '',
    name: queue?.name,
  }));

  // console.log(IVRData, 'IVRData', queueData);

  const FORWARD_VALUE_OPTIONS = {
    [FORWARD_TYPES.VOICEMAIL]: extensionData,
    [FORWARD_TYPES.EXTENSION]: extensionData,
    [FORWARD_TYPES.GREETING]: greetingData,
    [FORWARD_TYPES.MESSAGE]: greetingData,
    [FORWARD_TYPES.DEPARTMENT]: departmentData,
    [FORWARD_TYPES.IVR]: IVRData,
    [FORWARD_TYPES.QUEUE]: queueData,
  };

  const getLabel = () => {
    const currentOptions = FORWARD_VALUE_OPTIONS[watchForwardType?.value] || [];
    const selectedValue =
      watchForwardValue && typeof watchForwardValue === 'object'
        ? watchForwardValue?.value
        : watchForwardValue;
    const foundItem = currentOptions.find((item: any) => item?.value === selectedValue);
    return foundItem?.label || '';
  };

  const selectedForwardValue =
    watchForwardValue !== undefined && watchForwardValue !== null
      ? typeof watchForwardValue === 'object'
        ? watchForwardValue
        : { label: '', value: watchForwardValue }
      : null;

  const resolvedForwardValue =
    selectedForwardValue?.value !== undefined &&
    selectedForwardValue?.value !== null &&
    String(selectedForwardValue?.value).trim() !== ''
      ? {
          label: selectedForwardValue?.label || getLabel(),
          value: selectedForwardValue?.value,
        }
      : null;

  const renderForwardValueOption = () => {
    const currentType = watchForwardType?.value;
    const currentValue = selectedForwardValue?.value || '';
    if (!currentType) return null;

    switch (currentType) {
      case 'PHONE':
        return (
          <>
            <div className="flex gap-1 flex-col w-full">
              {valueLabel && <Label>{valueLabel}</Label>}
              <PhoneInput
                inputClass={`${inputClass}`}
                country={'us'}
                dropdownStyle={{ top: '-220px' }}
                value={currentValue || ''}
                onChange={(val) => {
                  setValue(forwardValue, { label: val, value: val }, { shouldValidate: true });
                }}
                containerClass={errorResponse ? 'phone-error' : ''}
              />
            </div>
          </>
        );
      case 'HANGUP':
        return <div className="flex w-1/3"></div>;
      case 'MESSAGE':
        return (
          <div className="flex gap-1 flex-col w-full">
            {valueLabel && <Label>{valueLabel}</Label>}
            <SelectGreeting
              name={'greeting'}
              isShowUpload={isShowUpload}
              onChangeMedia={(e) => {
                setValue(forwardValue, e, { shouldValidate: true });
              }}
              options={FORWARD_VALUE_OPTIONS[currentType] || []}
              value={resolvedForwardValue}
              errors={''}
              audioCustomClass={audioCustomClass}
              selectCustomClass={`w-full`}
              selectCustomClassSecond={selectCustomClassSecond}
              refetch={() => {
                refetch();
              }}
              isRefetchable={false}
            />
          </div>
        );
      case 'EXTENSION':
        return (
          <CustomSelect
            label={valueLabel}
            className={`${extenstionClass}`}
            placeholder="Select"
            menuPlacement={menuPlacement}
            options={FORWARD_VALUE_OPTIONS[currentType] || []}
            handleChange={(val) => setValue(forwardValue, val, { shouldValidate: true })}
            value={resolvedForwardValue}
            FormatOptionLabel={ExtensionListView}
          />
        );
      case 'QUEUE':
        return (
          <div className="flex gap-1 flex-col w-full">
            <CustomSelect
              label={valueLabel}
              className={`${extenstionClass}`}
              placeholder="Select"
              menuPlacement={menuPlacement}
              options={FORWARD_VALUE_OPTIONS[currentType] || []}
              handleChange={(val) => setValue(forwardValue, val, { shouldValidate: true })}
              value={resolvedForwardValue}
              // FormatOptionLabel={ExtensionListView}
            />
          </div>
        );

      default:
        return (
          <CustomSelect
            // label={valueLabel}
            placeholder="Select"
            menuPlacement={menuPlacement}
            options={FORWARD_VALUE_OPTIONS[currentType] || []}
            handleChange={(val) => setValue(forwardValue, val, { shouldValidate: true })}
            value={resolvedForwardValue}
            FormatOptionLabel={ExtensionListView}
          />
        );
    }
  };

  return (
    <div className={`flex flex-col ${mainClasses} ${mainGapClasses}`}>
      <div className="flex items-center gap-1">
        {label && (
          <h6
            className={`font-semibold truncate text-md text-gray-900 ${errorResponse ? 'text-red' : ''}`}
          >
            {label}
          </h6>
        )}
      </div>
      {description && <p className="text-gray-800 text-sm">{description} </p>}
      <div className={`flex sm:flex-row flex-col w-full  items-start ${gap}`}>
        <div className={`flex w-full sm:w-auto ${mainTypeDivClass}`}>
          <CustomSelect
            options={mode === 'ai-agent' ? callForwardAgentAI : callForwardingOptions}
            label={typeLabel}
            placeholder="Select Type"
            menuPlacement={menuPlacement}
            handleChange={(val) => {
              setValue(forwardType, val || {}, { shouldValidate: true });
              if (val?.value === 'VOICEMAIL') {
                setValue(isPersonalVoicemail, true, { shouldValidate: true });
                setValue(
                  forwardValue,
                  {
                    label: 'My Voicemail',
                    value: user_info?.extension || '',
                  },
                  { shouldValidate: true },
                );
              } else if (val?.value === 'HANGUP') {
                setValue(
                  forwardValue,
                  {
                    label: 'Select',
                    value: 'HANGUP',
                  },
                  { shouldValidate: true },
                );
              } else {
                setValue(forwardValue, { label: 'Select', value: '' }, { shouldValidate: true });
              }
            }}
            value={watchForwardType}
          />
        </div>

        <div
          className={`flex w-full sm:w-auto ${mainValueDivClass} ${mainValueJustifyClass} flex-col gap-1`}
        >
          {valueLabel && watchForwardType?.value && watchForwardType?.value === 'VOICEMAIL' && (
            <div className="flex items-center justify-between">
              <Label>{valueLabel}</Label>
            </div>
          )}
          <div className="w-full flex items-center gap-2">
            {watchForwardType?.value === 'VOICEMAIL' && (
              <RadioGroup
                className={`flex gap-4 items-center  min-h-10 mb-0 w-fit ${radioClass}  `}
                value={String(watchIsPersonalVoicemail)}
                onValueChange={(value) => {
                  if (value === 'true') {
                    setValue(isPersonalVoicemail, true, { shouldValidate: true });
                    setValue(
                      forwardValue,
                      {
                        label: 'Select',
                        value: user_info?.extension,
                      },
                      { shouldValidate: true },
                    );
                  } else {
                    setValue(isPersonalVoicemail, false, { shouldValidate: true });
                    setValue(
                      forwardValue,
                      { label: 'Select', value: '' },
                      { shouldValidate: true },
                    );
                  }
                }}
              >
                <div className="flex flex-col w-full gap-2 whitespace-nowrap">
                  {/* <Label className="mb-1">{typeLabel}</Label> */}
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value="true"
                      id={`${forwardState}-true`}
                      className="cursor-pointer w-4 h-4 accent-blue-500"
                    />
                    <Label htmlFor={`${forwardState}-true`} className="cursor-pointer">
                      My Voicemail
                    </Label>
                    <div className="flex items-center gap-1">
                      <RadioGroupItem
                        value="false"
                        id={`${forwardState}-false`}
                        className="cursor-pointer"
                      />
                      <Label htmlFor={`${forwardState}-false`} className="cursor-pointer">
                        Another Voicemail
                      </Label>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            )}
            {watchForwardType?.value === 'VOICEMAIL' && watchIsPersonalVoicemail ? null : (
              <div className={`flex gap-1 ${selectTwoWidth}`}>
                {renderForwardValueOption()}
                {watchForwardType?.value !== 'HANGUP' && errorResponse && (
                  <div className={`flex justify-end`}>
                    <ErrorTooltip text={errorResponse} extraClasses="bg-gray-800 text-white mb-1" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForwardingActions;

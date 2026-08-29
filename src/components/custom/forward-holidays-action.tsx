import { useUser } from '@/hooks/use-user';
import { useQueries, useQuery } from '@tanstack/react-query';
import ErrorTooltip from './error-tooltip';
import { forwardActionType, getGreetings } from '@/services/api';
import PhoneInput from 'react-phone-input-2';
import CustomSelect from './custom-select';
import SelectGreeting from './greeting-select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { ExtensionListView } from '@/pages/admin-settings/people/update-forwarding/call-rules/add-coworker';

const FORWARD_TYPES: any = {
  VOICEMAIL: 'VOICEMAIL',
  GREETING: 'GREETING',
  EXTENSION: 'EXTENSION',
  PHONE: 'PHONE',
  HANGUP: 'HANGUP',
  MESSAGE: 'MESSAGE',
};

function getNestedValue(obj: any, path: any) {
  return path.split('.').reduce((acc: any, key: any) => acc && acc[key], obj) || {};
}

const FORWARD_TYPES_ARR = ['EXTENSION', 'DEPARTMENT', 'IVR', 'QUEUE'];

const ForwardingHolidaysActions = ({
  setValue = () => {},
  watch = () => {},
  errors = {},
  forwardState = '',
  SITE_UUID = null,
  selectedUserExt = null,
  radioClass = '',
  isShowUpload = true,
  typeLabel = '',
  inputClass = '',
  extenstionClass = '',
}: any) => {
  const { user } = useUser();
  const { user_info } = user || {};

  const forwardType = `${forwardState}.type`;
  const forwardValue = `${forwardState}.value`;
  const isPersonalVoicemail = `${forwardState}.personal`;

  const watchForwardType = watch(forwardType) || { value: '' };
  const watchForwardValue = watch(forwardValue) || { value: '' };
  const watchIsPersonalVoicemail = watch(isPersonalVoicemail) || false;

  // Safely get error message
  const errorResponse =
    getNestedValue(errors, forwardState)?.value?.value?.message ||
    getNestedValue(errors, forwardState)?.value?.message ||
    '';

  const SITE_UUID_TEMP = SITE_UUID || watch('site')?.value || user_info?.site_uuid;

  const queries = useQueries({
    queries: FORWARD_TYPES_ARR.map((type) => ({
      queryKey: ['forwardActionType-call-forwarding', SITE_UUID_TEMP, type],
      queryFn: () =>
        forwardActionType({
          page: 1,
          limit: 1000,
          filters: [],
          search: '',
          site_uuid: SITE_UUID_TEMP,
          type,
        }),
      enabled: !!SITE_UUID_TEMP,
      select: (data: any) => data?.data?.data?.result?.rows || [],
    })),
  });

  const options = [
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

  const forwardActionTypeData: any = queries?.map((query) => query.data);

  const { data: greetingList = [], refetch } = useQuery({
    queryKey: ['greetings'],
    queryFn: () => getGreetings({ page: 1, limit: 1000, search: '', type: 'greeting' }),
    select: (res) => res?.data?.data?.result?.rows ?? [],
  });
  const [extensionList = [], departmentList = [], IVRList = []] = forwardActionTypeData;
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

  const greetingData = greetingList?.map((greeting: any) => ({
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

  const FORWARD_VALUE_OPTIONS = {
    [FORWARD_TYPES.VOICEMAIL]: extensionData,
    [FORWARD_TYPES.EXTENSION]: extensionData,
    [FORWARD_TYPES.GREETING]: greetingData,
    [FORWARD_TYPES.MESSAGE]: greetingData,
    [FORWARD_TYPES.DEPARTMENT]: departmentData,
    [FORWARD_TYPES.IVR]: IVRData,
  };

  const getLabel = () => {
    const currentOptions = FORWARD_VALUE_OPTIONS[watchForwardType?.value] || [];
    const foundItem = currentOptions.find((item: any) => item?.value === watchForwardValue?.value);
    return foundItem?.label || '';
  };
  const renderForwardValueOption = () => {
    const currentType = watchForwardType?.value;
    const currentValue = watchForwardValue?.value;
    if (!currentType) return null;

    switch (currentType) {
      case 'PHONE':
        return (
          <PhoneInput
            inputClass={`${inputClass}`}
            country={'us'}
            dropdownStyle={{ top: '-220px' }}
            value={currentValue || ''}
            onChange={(val) => {
              setValue(forwardValue, { label: val, value: val }, { shouldValidate: true });
            }}
            containerClass={`!w-[98%] ${errorResponse ? 'phone-error' : ''}`}
          />
        );
      case 'HANGUP':
        return <div className="flex w-1/3"></div>;
      case 'MESSAGE':
        return (
          <SelectGreeting
            name={'greeting'}
            isShowUpload={isShowUpload}
            onChangeMedia={(e) => {
              setValue(forwardValue, e, { shouldValidate: true });
            }}
            options={FORWARD_VALUE_OPTIONS[currentType] || []}
            value={
              watchForwardValue
                ? {
                    label: watchForwardValue?.label || getLabel(),
                    value: currentValue || '',
                  }
                : { label: 'Select', value: '' }
            }
            errors={''}
            audioCustomClass="w-60"
            selectCustomClass={`w-full`}
            refetch={() => {
              refetch();
            }}
            isRefetchable={false}
            // selectCustomClassSecond="w-[calc(100%_-_3.5rem)]"
          />
        );
      case 'EXTENSION':
        return (
          <CustomSelect
            className={`${extenstionClass} w-fit`}
            placeholder="Select Value"
            menuPlacement="top"
            options={FORWARD_VALUE_OPTIONS[currentType] || []}
            handleChange={(val) => setValue(forwardValue, val, { shouldValidate: true })}
            value={
              watchForwardValue
                ? {
                    label: watchForwardValue?.label || getLabel(),
                    value: currentValue || '',
                  }
                : null
            }
            FormatOptionLabel={ExtensionListView}
          />
        );
      default:
        return (
          <CustomSelect
            className="w-fit"
            placeholder="Select Value"
            menuPlacement="top"
            options={FORWARD_VALUE_OPTIONS[currentType] || []}
            handleChange={(val) => setValue(forwardValue, val, { shouldValidate: true })}
            value={
              watchForwardValue
                ? {
                    label: watchForwardValue?.label || getLabel(),
                    value: currentValue || '',
                  }
                : null
            }
            FormatOptionLabel={ExtensionListView}
          />
        );
    }
  };

  return (
    <>
      <div className="flex items-end gap-2 justify-between">
        <div className={`flex  gap-2 w-[calc(100%_-_2.5rem)]`}>
          <div className="w-1/3 max-w-fit">
            <CustomSelect
              className="w-fit"
              options={options}
              label={typeLabel}
              placeholder="Select Type"
              menuPlacement="top"
              handleChange={(val) => {
                setValue(forwardType, val || {}, { shouldValidate: true });
                if (val?.value === 'VOICEMAIL') {
                  setValue(isPersonalVoicemail, true, { shouldValidate: true });
                  setValue(
                    forwardValue,
                    {
                      label: 'Select',
                      value: user_info?.extension,
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
                  setValue(forwardValue, { label: '', value: '' });
                }
              }}
              value={watchForwardType}
            />
          </div>
          {watchForwardType?.value === 'VOICEMAIL' ? (
            <div className="w-1/3">
              <RadioGroup
                className={`flex gap-4 items-center  min-h-10 mb-0 w-full ${radioClass}  `}
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
                    setValue(forwardValue, { label: '', value: '' });
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  <RadioGroupItem
                    value="true"
                    id={`${forwardState}-true`}
                    className="cursor-pointer"
                  />
                  <Label htmlFor={`${forwardState}-true`} className="cursor-pointer">
                    My Voicemail
                  </Label>
                </div>

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
              </RadioGroup>
            </div>
          ) : null}

          {watchForwardType?.value === 'VOICEMAIL' && watchIsPersonalVoicemail ? null : (
            <div className="w-1/3 ">
              {renderForwardValueOption()}
              {watchForwardType?.value !== 'HANGUP' && errorResponse && (
                <div className={`flex justify-end`}>
                  <ErrorTooltip text={errorResponse} extraClasses="bg-gray-800 text-white mb-1" />
                </div>
              )}
            </div>
          )}
        </div>

        <span className="w-10"></span>
      </div>
    </>
  );
};

export default ForwardingHolidaysActions;

// import { useGetDepartment, useGetExtensions, useGetGreetings, useGetIVR, useGetQueueList } from '@/hooks/common';
import { useGetDepartment, useGetGreetings, useGetIVR, useGetQueueList } from '@/hooks/common';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { useQuery } from '@tanstack/react-query';
import PhoneInput from 'react-phone-input-2';
import CustomSelect from './custom-select';
import { Label } from '../ui/label';
import ErrorTooltip from './error-tooltip';
import { SetValueConfig } from 'react-hook-form';
import SelectGreeting from './greeting-select';
import { ExtensionListView } from '@/pages/admin-settings/users/extension/update-forwarding/call-rules/add-coworker';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { getAIReceptionistList } from '@/services/api';
import { useState } from 'react';
import useDebounce from '@/hooks/use-debounce';
import { usePaginatedUsers } from '@/hooks/use-paginated-users';

const FORWARD_TYPES = {
  VOICEMAIL: 'VOICEMAIL',
  GREETING: 'GREETING',
  EXTENSION: 'EXTENSION',
  PHONE: 'PHONE',
  IVR: 'IVR',
  QUEUE: 'QUEUE',
  DEPARTMENT: 'DEPARTMENT',
  CALLBACK: 'callback',
  // MESSAGE: 'MESSAGE',
  HANGUP: 'HANGUP',
} as const;

export const FORWARD_TYPES_LABEL = {
  VOICEMAIL: 'Send to Voicemail',
  GREETING: 'Play an Announcement',
  EXTENSION: 'Forward to Extension',
  PHONE: 'Forward to External Number',
  IVR: 'Forward to IVR',
  QUEUE: 'Forward to Call Queue',
  DEPARTMENT: 'Forward to Group',
  CALLBACK: 'Schedule Callback',
  callback: 'Schedule Callback', // Backward-compatible payload value.
  // MESSAGE: 'Send to Message',
  HANGUP: 'Hangup',
} as const;

interface IEXTENSION {
  first_name: string;
  last_name: string;
  extension: string;
}
interface ICOMMON {
  name: string;
  uuid: string;
}
interface ICALLQUEUE {
  name: string;
  uuid: string;
  _id?: string;
  id?: string;
}
type ForwardType = keyof typeof FORWARD_TYPES;
type ForwardTypeValue = (typeof FORWARD_TYPES)[ForwardType];

interface ForwardActionProps {
  setValue(name: string, value: any, options?: SetValueConfig): void;
  watch: (name: string) => any;
  forwardType?: string;
  forwardValue?: string;
  forwardTypeLabel?: string;
  forwardValueLabel?: string;
  forwardTypeError?: string;
  forwardValueError?: string;
  notInclude?: ForwardType[];
  initialData?: Record<string, any>;
  forwardTypeClass?: string;
  forwardValueClass?: string;
  selectCustomClassSecond?: string;
  menuPlacement?: 'auto' | 'top' | 'bottom';
  enableVoicemailChoice?: boolean;
  voicemailPersonalField?: string;
}

const ForwardActionAll: React.FC<ForwardActionProps> = ({
  setValue,
  watch,
  forwardType = '',
  forwardValue = '',
  forwardTypeLabel = '',
  forwardTypeError = '',
  forwardValueError = '',
  notInclude = [],
  initialData = {
    uuid: '',
  },
  forwardTypeClass = ' w-full',
  forwardValueClass = ' w-full',
  forwardValueLabel = '',
  selectCustomClassSecond = '',
  menuPlacement = 'auto',
  enableVoicemailChoice = false,
  voicemailPersonalField = '',
}) => {
  const { user } = useUser();
  const { user_info } = user || {};
  const watchForwardType = watch(forwardType) as ISELECTVALUE | undefined;
  const currentType = watchForwardType?.value as ForwardTypeValue | undefined;
  const shouldLoadExtensions =
    currentType === FORWARD_TYPES.EXTENSION || currentType === FORWARD_TYPES.VOICEMAIL;
  const [extensionSearch, setExtensionSearch] = useState('');
  const debouncedExtensionSearch = useDebounce(extensionSearch, 300);
  const { greetingList = [] } = useGetGreetings();
  const {
    users: extensionList,
    fetchNextPage: fetchNextExtensionPage,
    hasNextPage: hasNextExtensionPage = false,
    isFetchingNextPage: isFetchingNextExtensionPage,
    isLoading: isLoadingExtensions,
  } = usePaginatedUsers({
    search: debouncedExtensionSearch,
    enabled: shouldLoadExtensions,
    queryKey: ['forwardActionExtensions'],
  });
  const { data: departmentList = [] } = useGetDepartment();
  const { data: IVRList = [] } = useGetIVR();
  const { data: queueList = [] } = useGetQueueList();
  const { features } = useCompanyFeatures();
  const shouldLoadAIReceptionists = currentType === FORWARD_TYPES.CALLBACK;
  const { data: aiReceptionistList = [], isLoading: isAIReceptionistLoading } = useQuery({
    queryKey: ['getAIReceptionistList', 'forward-action-callback'],
    queryFn: () => getAIReceptionistList({ page: 1, limit: 1000, filters: [], search: '' }),
    select: (data) => data?.data?.data?.result?.rows || [],
    enabled: shouldLoadAIReceptionists,
  });

  const phoneSystemAccess = features?.plan_features?.phone_system_action?.access;
  const forwardTypesOptions = (Object.keys(FORWARD_TYPES) as ForwardType[])
    .filter((key) => !notInclude.includes(key))
    .filter((key) => phoneSystemAccess?.[key] !== false)
    .map((key) => ({
      label: FORWARD_TYPES_LABEL[key],
      value: FORWARD_TYPES[key],
    }));
  const extensionData = extensionList?.map((extension: IEXTENSION) => ({
    label: `${extension?.first_name}${extension?.last_name ? ` ${extension?.last_name}` : ''}`,
    value: extension?.extension,
  }));

  const greetingData = greetingList?.map((greeting) => ({
    label: greeting?.name,
    value: greeting?.filename,
  }));
  const departmentData = departmentList?.map((department: ICOMMON) => ({
    label: department?.name,
    value: department?.uuid,
  }));

  const IVRData = IVRList?.filter((ivr: ICOMMON) => ivr?.uuid !== initialData?.uuid).map(
    (ivr: ICOMMON) => ({
      label: ivr?.name,
      value: ivr?.uuid,
    }),
  );

  const QueueData = queueList
    ?.filter((queue: ICALLQUEUE) => {
      const queueId = queue?.uuid || queue?._id || queue?.id || '';
      const initialQueueId = initialData?.uuid || initialData?._id || initialData?.id || '';
      return queueId !== initialQueueId;
    })
    .map((queue: ICALLQUEUE) => ({
      label: queue?.name,
      value: queue?.uuid || queue?._id || queue?.id || '',
    }));
  const aiReceptionistData = aiReceptionistList
    ?.filter((agent: any) => agent?.agent_uuid)
    .map((agent: any) => ({
      label: agent?.agentName || 'Unnamed AI Receptionist',
      value: agent?.agent_uuid,
      name: agent?.agentName || 'Unnamed AI Receptionist',
    }));

  const FORWARD_VALUE_OPTIONS: Partial<Record<ForwardTypeValue, ISELECTVALUE[]>> = {
    [FORWARD_TYPES.VOICEMAIL]: extensionData,
    [FORWARD_TYPES.EXTENSION]: extensionData,
    [FORWARD_TYPES.GREETING]: greetingData,
    // [FORWARD_TYPES.MESSAGE]: greetingData,
    [FORWARD_TYPES.DEPARTMENT]: departmentData,
    [FORWARD_TYPES.IVR]: IVRData,
    [FORWARD_TYPES.QUEUE]: QueueData,
    [FORWARD_TYPES.CALLBACK]: aiReceptionistData,
  };

  const forwardValueOptions = currentType ? (FORWARD_VALUE_OPTIONS[currentType] ?? []) : [];
  const watchForwardValue = watch(forwardValue);
  const watchIsPersonalVoicemail = voicemailPersonalField ? watch(voicemailPersonalField) : false;

  const getLabel = () => {
    const index = forwardValueOptions?.findIndex((item) => item.value === watchForwardValue?.value);
    return index !== -1 ? forwardValueOptions[index]?.label : '';
  };

  const renderForwardValueOption = () => {
    switch (watchForwardType?.value) {
      case 'PHONE':
        return (
          <PhoneInput
            country={'us'}
            value={watchForwardValue?.value || ''}
            onChange={(val) => {
              setValue(
                forwardValue,
                { label: val, value: val },
                {
                  shouldValidate: true,
                },
              );
            }}
            containerClass={forwardValueError ? 'phone-error' : ''}
          />
        );
      case 'HANGUP':
        return (
          <>
            <div className="flex w-1/3"></div>
          </>
        );
      case 'GREETING':
        return (
          <>
            <SelectGreeting
              name={'greeting'}
              isShowUpload={true}
              onChangeMedia={(e) =>
                setValue(forwardValue, e, {
                  shouldValidate: true,
                })
              }
              options={forwardValueOptions}
              value={
                watchForwardValue
                  ? {
                      label: watchForwardValue?.label || getLabel(),
                      value: watchForwardValue?.value || '',
                    }
                  : { label: 'Select', value: '' }
              }
              errors={''}
              selectCustomClassSecond={selectCustomClassSecond}
            />
          </>
        );
      case FORWARD_TYPES.EXTENSION:
      case FORWARD_TYPES.VOICEMAIL:
        return (
          <CustomSelect
            options={forwardValueOptions}
            menuPlacement={menuPlacement}
            handleChange={(val: ISELECTVALUE) =>
              setValue(forwardValue, val, {
                shouldValidate: true,
              })
            }
            value={
              watchForwardValue
                ? {
                    label: watchForwardValue?.label || getLabel(),
                    value: watchForwardValue?.value || '',
                  }
                : { label: 'Select', value: '' }
            }
            FormatOptionLabel={ExtensionListView}
            isLoading={isLoadingExtensions || isFetchingNextExtensionPage}
            onInputChange={setExtensionSearch}
            onMenuScrollToBottom={() => {
              if (hasNextExtensionPage && !isFetchingNextExtensionPage) {
                void fetchNextExtensionPage();
              }
            }}
          />
        );
      case FORWARD_TYPES.CALLBACK:
        return (
          <CustomSelect
            options={forwardValueOptions}
            menuPlacement={menuPlacement}
            isLoading={isAIReceptionistLoading}
            handleChange={(val: ISELECTVALUE) =>
              setValue(forwardValue, val, {
                shouldValidate: true,
              })
            }
            value={
              watchForwardValue
                ? {
                    label: watchForwardValue?.label || getLabel(),
                    value: watchForwardValue?.value || '',
                  }
                : { label: 'Select', value: '' }
            }
          />
        );
      default:
        return (
          <CustomSelect
            options={forwardValueOptions}
            menuPlacement={menuPlacement}
            handleChange={(val: ISELECTVALUE) =>
              setValue(forwardValue, val, {
                shouldValidate: true,
              })
            }
            value={
              watchForwardValue
                ? {
                    label: watchForwardValue?.label || getLabel(),
                    value: watchForwardValue?.value || '',
                  }
                : { label: 'Select', value: '' }
            }
          />
        );
    }
  };

  return (
    <>
      <div className={`flex flex-col gap-1.5 ${forwardTypeClass}`}>
        <div className={`flex item-center  justify-${forwardTypeLabel ? 'between' : 'end'}`}>
          {forwardTypeLabel && <Label>{forwardTypeLabel}</Label>}
          {forwardTypeError && (
            <div className={`flex justify-end`}>
              <ErrorTooltip text={forwardTypeError} extraClasses="bg-gray-800 text-white mb-1 " />
            </div>
          )}
        </div>
        <CustomSelect
          options={forwardTypesOptions}
          menuPlacement={menuPlacement}
          handleChange={(val: ISELECTVALUE) => {
            setValue(forwardType, val, {
              shouldValidate: true,
            });
            if (
              enableVoicemailChoice &&
              voicemailPersonalField &&
              val?.value === FORWARD_TYPES.VOICEMAIL
            ) {
              setValue(voicemailPersonalField, true, { shouldValidate: true });
              setValue(
                forwardValue,
                { label: 'My Voicemail', value: user_info?.extension || '' },
                { shouldValidate: true },
              );
            } else {
              setValue(forwardValue, { label: 'Select', value: '' });
            }
          }}
          value={
            watchForwardType
              ? {
                  label:
                    watchForwardType?.label ||
                    (typeof watchForwardType.value === 'string' &&
                    watchForwardType.value in FORWARD_TYPES_LABEL
                      ? FORWARD_TYPES_LABEL[watchForwardType.value as ForwardType]
                      : ''),
                  value: watchForwardType?.value || '',
                }
              : { label: 'Select', value: '' }
          }
        />
      </div>

      {watchForwardType?.value === FORWARD_TYPES.HANGUP && (
        <div className="flex flex-col gap-1.5 w-1/3"></div>
      )}
      {watchForwardType?.value && watchForwardType?.value !== FORWARD_TYPES.HANGUP && (
        <>
          <div className={`flex flex-col gap-1.5 ${forwardValueClass}`}>
            <div
              className={`flex item-center relative justify-${forwardValueLabel ? 'between' : 'end'}`}
            >
              {forwardValueLabel && <Label>{forwardValueLabel}</Label>}
              {forwardValueError && (
                <div className={`flex justify-end absolute bottom-0 right-0`}>
                  <ErrorTooltip
                    text={forwardValueError}
                    extraClasses="bg-gray-800 text-white mb-1 "
                  />
                </div>
              )}
            </div>
            {enableVoicemailChoice &&
              voicemailPersonalField &&
              watchForwardType?.value === FORWARD_TYPES.VOICEMAIL && (
                <RadioGroup
                  className="flex gap-4 items-center min-h-10 mb-0 w-fit"
                  value={String(Boolean(watchIsPersonalVoicemail))}
                  onValueChange={(value) => {
                    const isPersonal = value === 'true';
                    setValue(voicemailPersonalField, isPersonal, { shouldValidate: true });
                    if (isPersonal) {
                      setValue(
                        forwardValue,
                        { label: 'My Voicemail', value: user_info?.extension || '' },
                        { shouldValidate: true },
                      );
                    } else {
                      setValue(
                        forwardValue,
                        { label: 'Select', value: '' },
                        { shouldValidate: true },
                      );
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value="true"
                      id={`${forwardType}-my-voicemail`}
                      className="cursor-pointer w-4 h-4 accent-blue-500"
                    />
                    <Label htmlFor={`${forwardType}-my-voicemail`} className="cursor-pointer">
                      My Voicemail
                    </Label>
                    <RadioGroupItem
                      value="false"
                      id={`${forwardType}-another-voicemail`}
                      className="cursor-pointer w-4 h-4 accent-blue-500"
                    />
                    <Label htmlFor={`${forwardType}-another-voicemail`} className="cursor-pointer">
                      Another Voicemail
                    </Label>
                  </div>
                </RadioGroup>
              )}
            {enableVoicemailChoice &&
            watchForwardType?.value === FORWARD_TYPES.VOICEMAIL &&
            Boolean(watchIsPersonalVoicemail)
              ? null
              : renderForwardValueOption()}{' '}
          </div>
        </>
      )}
    </>
  );
};

export default ForwardActionAll;

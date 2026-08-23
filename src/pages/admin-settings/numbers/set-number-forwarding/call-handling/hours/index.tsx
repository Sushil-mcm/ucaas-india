import { FORWARD_TYPES } from '@/constants/forwarding-consts';
import { useGetGreetings, useGetQueueList } from '@/hooks/common';
import { ICALLQUEUE, ICOMMON, IEXTENSION } from '@/interfaces/common-interface';
import { FC, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FORWARD_TYPES_LABEL, RING_MY_DEVICE_OPTIONS } from '../../constants';
import PhoneInput from 'react-phone-input-2';
import CustomSelect from '@/components/custom/custom-select';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import SelectGreeting from '@/components/custom/greeting-select';
import { ExtensionListView } from '@/pages/admin-settings/users/extension/update-forwarding/call-rules/add-coworker';
import { useQuery } from '@tanstack/react-query';
import { getAIReceptionistList } from '@/services/api';
// import { SettingsLine } from '@/assets/icons';
import AiForward from './ai-forwarding-modal';
// import { useUser } from '@/hooks/use-user';
// const normalizeForwardLabel = (label?: string) => {
//   if (!label) return '';
//   return label.replace(/forward(ed)?\s*to\s*/i, '').trim();
// };

const USER_FORWARD_TYPES = [
  FORWARD_TYPES.DEVICE,
  FORWARD_TYPES.VOICEMAIL,
  FORWARD_TYPES.MESSAGE,
  FORWARD_TYPES.EXTENSION,
  FORWARD_TYPES.PHONE,
  FORWARD_TYPES.HANGUP,
];

const NUMBER_FORWARD_TYPES = [
  FORWARD_TYPES.VOICEMAIL,
  FORWARD_TYPES.GREETING,
  FORWARD_TYPES.EXTENSION,
  FORWARD_TYPES.PHONE,
  FORWARD_TYPES.IVR,
  FORWARD_TYPES.QUEUE,
  FORWARD_TYPES.DEPARTMENT,
  FORWARD_TYPES.AI,
  FORWARD_TYPES.HANGUP,
];

interface IHoursProps {
  type: string;
  isUser: boolean;
  result: any;
  features: any;
}

const Hours: FC<IHoursProps> = ({ type: hourType, isUser, result = [], features }) => {
  const [modalState, setModalState] = useState(false);
  const { greetingList } = useGetGreetings();
  const [extensionList = [], departmentList = [], IVRList = []] = result;
  const { data: queueList = [] } = useGetQueueList();
  const { data: aiAgentList = [] } = useQuery({
    queryKey: ['getAIReceptionistList'],
    queryFn: () => getAIReceptionistList({ page: 1, limit: 1000, filters: [], search: '' }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();
  // const { user } = useUser();
  // const { user_info } = user || {};
  const forwardValueError =
    (errors?.callHandling as any)?.[hourType]?.forwardValue?.value?.message ||
    (errors?.callHandling as any)?.[hourType]?.forwardValue?.message;
  // const aiForwardToError = (errors?.callHandling as any)?.[hourType]?.ai_forward_to?.value?.value
  //   ?.message;
  const { forwardType = '', forwardValue = {} } = watch(`callHandling.${hourType}`) || {};
  const [selectedForwardTypeIndex, setSelectedForwardTypeIndex] = useState(0);
  const FORWARD_TYPE_OPTIONS = Object.keys(FORWARD_TYPES)?.filter((objKey) => {
    // if (objKey === FORWARD_TYPES.VOICEMAIL && !features?.plan_features?.phone_system?.VOICEMAIL)
    //   return;
    // if (objKey === FORWARD_TYPES.EXTENSION && !features?.plan_features?.phone_system?.EXTENSION)
    //   return;
    if (
      objKey === FORWARD_TYPES.GREETING &&
      !features?.plan_features?.phone_system_action?.access?.ANNOUNCEMENT
    )
      return;
    if (objKey === FORWARD_TYPES.IVR && !features?.plan_features?.phone_system_action?.access?.IVR)
      return;
    if (
      objKey === FORWARD_TYPES.DEPARTMENT &&
      !features?.plan_features?.phone_system_action?.access?.DEPARTMENT
    )
      return;
    if (
      objKey === FORWARD_TYPES.QUEUE &&
      !features?.plan_features?.phone_system_action?.access?.QUEUE
    )
      return;
    if (
      objKey === FORWARD_TYPES.AI &&
      !features?.plan_features?.ai?.access?.CHAT &&
      !features?.plan_features?.ai?.access?.VOICE &&
      !features?.plan_features?.ai?.IS_SHOW
    )
      return;
    if (isUser) {
      return USER_FORWARD_TYPES?.includes(objKey);
    } else {
      return NUMBER_FORWARD_TYPES?.includes(objKey);
    }
  });

  const extensionData = extensionList?.map((extension: IEXTENSION) => ({
    label: `${extension?.first_name}${extension?.last_name ? ` ${extension?.last_name}` : ''}`,
    value: extension?.extension,
    name: `${extension?.first_name}${extension?.last_name ? ` ${extension?.last_name}` : ''}`,
  }));

  const greetingData = greetingList?.map((greeting: any) => ({
    label: greeting?.name,
    value: greeting?.filename,
    name: greeting?.name,
  }));

  const departmentData = departmentList?.map((department: ICOMMON) => ({
    label: department?.name,
    value: department?.uuid,
    name: department?.name,
  }));

  const IVRtData = IVRList?.map((ivr: ICOMMON) => ({
    label: ivr?.name,
    value: ivr?.uuid,
    name: ivr?.name,
  }));

  const QueueData = queueList?.map((queue: ICALLQUEUE) => ({
    label: queue?.name,
    value: queue?._id,
    name: queue?.name,
    extension: queue?.extension,
  }));

  // const currentDidUuid = watch('settings.did_uuid');

  const aiAgentData = aiAgentList
    // ?.filter((agent: any) => agent?.agentType === 'data')
    // ?.filter((agent: any) => agent?.did_uuid === null || agent?.did_uuid === currentDidUuid)
    ?.map((agent: any) => ({
      label: agent?.agentName,
      value: agent?.agent_uuid || agent?.id,
      name: agent?.agentName,
    }));

  const forwardValueOptionsMap = {
    [FORWARD_TYPES.VOICEMAIL]: extensionData,
    [FORWARD_TYPES.EXTENSION]: extensionData,
    [FORWARD_TYPES.GREETING]: greetingData,
    [FORWARD_TYPES.MESSAGE]: greetingData,
    [FORWARD_TYPES.DEPARTMENT]: departmentData,
    [FORWARD_TYPES.DEVICE]: RING_MY_DEVICE_OPTIONS,
    [FORWARD_TYPES.IVR]: IVRtData,
    [FORWARD_TYPES.QUEUE]: QueueData,
    [FORWARD_TYPES.AI]: aiAgentData,
  };

  const renderForwardValueField = () => {
    switch (forwardType) {
      case FORWARD_TYPES.PHONE:
        return (
          <>
            <PhoneInput
              country={'us'}
              value={forwardValue?.value}
              onChange={(value) => {
                setValue(
                  `callHandling.${hourType}.forwardValue`,
                  {
                    label: value,
                    name: value,
                    value: value,
                  },
                  {
                    shouldValidate: true,
                  },
                );
              }}
            />
            {forwardValueError && (
              <div className="flex justify-end">
                <ErrorTooltip text={forwardValueError} />
              </div>
            )}
          </>
        );
      case FORWARD_TYPES.HANGUP:
        return <></>;
      case FORWARD_TYPES.GREETING:
        return (
          <SelectGreeting
            name={'greeting'}
            isShowUpload={true}
            onChangeMedia={(e) =>
              setValue(`callHandling.${hourType}.forwardValue`, e, {
                shouldValidate: true,
              })
            }
            options={forwardValueOptionsMap?.[forwardType]}
            value={forwardValue?.value ? forwardValue : null}
            errors={forwardValueError}
          />
        );
      case FORWARD_TYPES.EXTENSION:
      case FORWARD_TYPES.VOICEMAIL:
        return (
          <CustomSelect
            options={forwardValueOptionsMap?.[forwardType]}
            value={forwardValue?.value ? forwardValue : null}
            handleChange={(val: ISELECTVALUE) => {
              setValue(`callHandling.${hourType}.forwardValue`, val, {
                shouldValidate: true,
              });
            }}
            error={forwardValueError}
            FormatOptionLabel={ExtensionListView}
          />
        );
      default:
        return (
          <CustomSelect
            options={forwardValueOptionsMap?.[forwardType]}
            value={forwardValue?.value ? forwardValue : null}
            handleChange={(val: ISELECTVALUE) => {
              setValue(`callHandling.${hourType}.forwardValue`, val, {
                shouldValidate: true,
              });
            }}
            error={forwardValueError}
          />
        );
    }
  };

  useEffect(() => {
    setSelectedForwardTypeIndex(FORWARD_TYPE_OPTIONS.indexOf(forwardType) || 0);
  }, [forwardType]);

  return (
    <>
      <div className="flex flex-col gap-4 pt-2 template-forwarding-hours">
        <h6 className="font-semibold text-md flex items-center gap-2 text-gray-900">
          Set how you'd like to answer calls when conditions are met.{' '}
          {forwardValueError && (
            <div className="flex justify-end">
              <ErrorTooltip text={forwardValueError} />
            </div>
          )}
        </h6>
        <div className="flex flex-col gap-3 pl-1">
          <RadioGroup
            value={watch(`callHandling.${hourType}.forwardType`)}
            onValueChange={(value) => {
              setValue(`callHandling.${hourType}.forwardType`, value);
              setValue(`callHandling.${hourType}.forwardValue`, { label: '', value: '' });
              setSelectedForwardTypeIndex(FORWARD_TYPE_OPTIONS.indexOf(value));
            }}
          >
            {FORWARD_TYPE_OPTIONS.map((forwardKey, index) => (
              <div
                className="flex items-center gap-3 min-h-10 template-forwarding-hours-option"
                key={forwardKey}
              >
                <div className="w-1/4 flex items-center gap-2 template-forwarding-hours-label">
                  <RadioGroupItem value={forwardKey} id={forwardKey} />
                  <Label htmlFor={forwardKey} className="cursor-pointer">
                    {FORWARD_TYPES_LABEL?.[forwardKey as keyof typeof FORWARD_TYPES_LABEL]}
                  </Label>
                </div>
                {selectedForwardTypeIndex === index && (
                  <>
                    <div className="w-72 template-forwarding-hours-value">
                      {renderForwardValueField()}
                    </div>
                    {/* {forwardType === FORWARD_TYPES.AI ? (
                      <>
                        <span
                          onClick={() => setModalState(true)}
                          className={`cursor-pointer flex items-center justify-center w-10 h-10 rounded-lg ${aiForwardToError
                            ? 'bg-red-100 text-red-500 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-ucass-primary-200 hover:text-primary'
                            }`}
                        >
                          <SettingsLine className="w-4 h-4" />
                        </span>
                        {aiForwardToError && (
                          <div className="flex justify-end">
                            <ErrorTooltip text={aiForwardToError} />
                          </div>
                        )}
                        <p className="text-gray-900 text-sm font-semibold">
                          Forward to:{' '}
                          {watch(`callHandling.${hourType}.ai_forward_to.type.label`) ===
                            'Play an Announcement'
                            ? 'Greeting'
                            : normalizeForwardLabel(
                              watch(`callHandling.${hourType}.ai_forward_to.type.label`),
                            )}
                        </p>

                        {watch(`callHandling.${hourType}.ai_forward_to.type.value`) !==
                          FORWARD_TYPES.HANGUP ? (
                          <p className="text-gray-900 text-sm font-semibold">
                            Forward value:{' '}
                            {watch(`callHandling.${hourType}.ai_forward_to.value.value`) ===
                              user_info?.extension
                              ? 'My Extension'
                              : normalizeForwardLabel(
                                watch(`callHandling.${hourType}.ai_forward_to.value.label`),
                              )}
                          </p>
                        ) : null}
                      </>
                    ) : null} */}
                  </>
                )}
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>
      {modalState && <AiForward modalState={modalState} setModalState={setModalState} />}
    </>
  );
};

export default Hours;

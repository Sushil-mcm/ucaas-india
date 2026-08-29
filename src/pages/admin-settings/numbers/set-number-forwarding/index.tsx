import { useGetSite } from '@/hooks/common';
import {
  CALL_FORWARDING_TAB_CONSTANT,
  CALL_HANDLING_TAB_CONSTANT,
  callForwardingFormInitialState,
  CUSTOM_HOURS_SCHEDULE_OPTIONS,
  INITIAL_TYPE_CONSTANT,
  TAB_CONSTANT,
} from './constants';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FC, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { callForwardingSchema } from './schema';
import { callForwarding, upsertCallHandlingTemplate } from '@/services/api';
import {
  getHolidaysFormVal,
  getHolidaysPayload,
  getObjectLength,
  handleAlert,
  isJsonString,
} from '@/lib/utils';
import Countries from '@/assets/json/countries.json';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getScheduleHours } from './utils';
import DIDInfo from './did-info';
import CallHandling from './call-handling';
import Media from './media';
import Summary from './summary';
import { useCompanyFeatures } from '@/hooks/rbac';
import Settings from './condition';
import { invalidateNumberLists } from '@/lib/number-list-cache';
import { useUser } from '@/hooks/use-user';
import { FORWARD_TYPES } from '@/constants/forwarding-consts';
import { callForwardingOptions } from '@/components/custom/forwarding-actions';

const initialState = {
  regionalSettingsModal: {
    isOpenModal: false,
    data: 'Regional settings are not configured.',
  },
  businessHoursModal: {
    isOpenModal: false,
    data: '24 Hours, all times.',
  },
};

const schemaIndex = {
  [TAB_CONSTANT.DID_INFO]: 0,
  [TAB_CONSTANT.CONDITION]: 1,
  [TAB_CONSTANT.CALL_HANDLING]: 2,
  [TAB_CONSTANT.MEDIA]: 3,
  // [TAB_CONSTANT.SUMMARY]: 4,
};

interface UpdateForwardingProps {
  drawerState: boolean;
  setDrawerState: (state: boolean) => void;
  initialType: string | null;
  initialData: any;
  isUser: any;
}

const UpsertCallForwarding: FC<UpdateForwardingProps> = ({
  initialType = null,
  initialData = null,
  isUser = false,
  setDrawerState,
}) => {
  const isUpsertTemplate = initialType === INITIAL_TYPE_CONSTANT.UPSERT_TEMPLATE;

  const TABS_ORDER = [
    !isUpsertTemplate && CALL_FORWARDING_TAB_CONSTANT.DID_INFO,
    CALL_FORWARDING_TAB_CONSTANT.CONDITION,
    CALL_FORWARDING_TAB_CONSTANT.CALL_HANDLING,
    CALL_FORWARDING_TAB_CONSTANT.MEDIA,
    // CALL_FORWARDING_TAB_CONSTANT.SUMMARY,
  ].filter(Boolean) as string[];
  const [activeTab, setActiveTab] = useState<string>(
    isUpsertTemplate
      ? CALL_FORWARDING_TAB_CONSTANT.CONDITION
      : CALL_FORWARDING_TAB_CONSTANT.DID_INFO,
  );
  const { data: dataSiteList = [], isLoading: siteDataLoading } = useGetSite();
  const queryClient: any = useQueryClient();
  const [callHandlingTabAction, setCallHandlingTabAction] = useState<any>(
    CALL_HANDLING_TAB_CONSTANT.BUSINESS_HOURS,
  );
  const [templateUUID, setTemplateUUID] = useState(null);
  const [validationContext, setValidationContext] = useState(null);
  const [state, setState] = useState(initialState);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const { features } = useCompanyFeatures();
  const { user } = useUser();

  const closeDrawer = () => {
    setDrawerState(false);
  };

  const formInstance = useForm<any>({
    mode: 'all',
    defaultValues: callForwardingFormInitialState,
    resolver: yupResolver(callForwardingSchema[schemaIndex[activeTab]]),
    context: { validationContext, activeTab, forwardingType: initialType },
  });

  const { mutate: mutateCallForwarding, isPending } = useMutation({
    mutationFn: isUpsertTemplate ? upsertCallHandlingTemplate : callForwarding,
    onSuccess: (data) => {
      if (isUpsertTemplate) {
        setTemplateUUID(data?.data?.data?.data?.uuid);
        queryClient.invalidateQueries(['getCallHandlingTemplate']);
      } else {
        invalidateNumberLists(queryClient);
      }
      closeDrawer();
      handleAlert({
        text: data?.data?.data?.message || 'Forwarding updated successfully!',
        type: 'success',
      });
    },
  });
  const { watch, setValue, trigger } = formInstance;
  const is24Hours = watch()?.settings?.operational_hours?.type === '24_hours';
  const watchedValues = watch();

  const handleTabChange = async (nextTab: string) => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    const nextIndex = TABS_ORDER.indexOf(nextTab);

    // Allow backward navigation without validation
    if (nextIndex <= currentIndex) {
      setActiveTab(nextTab);
      return;
    }

    // Validate all intermediate steps manually
    const values = formInstance.getValues();

    for (let i = currentIndex; i < nextIndex; i++) {
      const tabKey = TABS_ORDER[i];
      const schema = callForwardingSchema[schemaIndex[tabKey]];

      try {
        await schema.validate(values, {
          abortEarly: false,
          context: {
            validationContext,
            activeTab: tabKey,
            forwardingType: initialType,
          },
        });
      } catch (err: any) {
        if (err?.inner) {
          err.inner.forEach((validationError: any) => {
            if (validationError.path) {
              formInstance.setError(validationError.path, {
                type: 'manual',
                message: validationError.message,
              });
            }
          });
        }
        return; // Stop navigation on first failure
      }
    }

    setActiveTab(nextTab);
  };

  const CALL_HANDLING_TABS_ORDER = [
    CALL_HANDLING_TAB_CONSTANT.BUSINESS_HOURS,
    !is24Hours && CALL_HANDLING_TAB_CONSTANT.CLOSED_HOURS,
    CALL_HANDLING_TAB_CONSTANT.RECORDING,
  ].filter(Boolean);

  const handleNext = async () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    // if (currentIndex === TABS_ORDER.indexOf(CALL_FORWARDING_TAB_CONSTANT.CALL_HANDLING)) {
    //   handleCallHandlingNext();
    // } else {
    const isValid = await trigger();

    if (isValid && currentIndex < TABS_ORDER.length - 1) {
      setActiveTab(TABS_ORDER[currentIndex + 1]);
      // }
    }
  };

  const handleCallHandlingTabChange = async (nextTab: string) => {
    const currentIndex = CALL_HANDLING_TABS_ORDER.indexOf(activeTab);
    const nextIndex = CALL_HANDLING_TABS_ORDER.indexOf(nextTab);

    if (nextIndex <= currentIndex) {
      setCallHandlingTabAction(nextTab); // Going backward, no validation
      return;
    }

    const isValid = await trigger();
    if (isValid) {
      setCallHandlingTabAction(nextTab); // Forward only if valid
    }
  };

  const handlePrev = () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    // if (currentIndex === TABS_ORDER.indexOf(CALL_FORWARDING_TAB_CONSTANT.CALL_HANDLING)) {
    //   handleCallHandlingPrev();
    //   return;
    // }
    if (currentIndex > 0) {
      setActiveTab(TABS_ORDER[currentIndex - 1]);
    }
  };

  const handleCallForwarding = () => {
    const { settings = {}, callHandling = {}, media = {}, did_info = {} } = watch();
    const {
      operational_hours = {},
      callerId = {},
      templateName = '',
      recording = {},
      display_number = {},
      transcription = false,
      ai_call_monitoring = false,
    } = settings;
    const { businessHours = {} } = callHandling;
    const { welcome = {}, hold = {}, voicemail = {} } = media;

    const request = {
      condition: {
        transcription: transcription,
        ai_call_monitoring: ai_call_monitoring,
        operational_hours: {
          regional: {
            timezone: operational_hours?.regional?.timezone || { label: '', value: '' },
            time_format: operational_hours?.regional?.time_format || 12,
            country_code: operational_hours?.regional?.country_code || { label: '', value: '' },
            country: operational_hours?.regional?.country || { label: '', value: '' },
          },
          type: operational_hours?.type,
          value: operational_hours?.value || CUSTOM_HOURS_SCHEDULE_OPTIONS,
          holidays: operational_hours?.holidays?.length
            ? getHolidaysPayload(operational_hours.holidays)
            : [],
          closed_hour_action: {
            type: operational_hours?.closed_hour_action?.type?.value,
            value: operational_hours?.closed_hour_action?.value?.value,
            enabled: operational_hours?.closed_hour_action?.enabled,
            personal: operational_hours?.closed_hour_action?.personal,
            type_label: operational_hours?.closed_hour_action?.type?.label,
            value_label: operational_hours?.closed_hour_action?.value?.label,
          },
        },
        recording,
        display_number: {
          incoming: display_number?.incoming,
          masking: {
            type: display_number?.masking?.type?.value || '',
            label: display_number?.masking?.type?.label || '',
            value: display_number?.masking?.value || '',
          },
        },
        caller_id: callerId?.value || '',
      },
      call_handling: {
        business_hours: {
          ...(businessHours?.forwardType === FORWARD_TYPES.AI &&
            {
              // ai_forward_to: {
              //   type: businessHours?.ai_forward_to?.type?.value || 'HANGUP',
              //   value: businessHours?.ai_forward_to?.value?.value || '',
              //   label: businessHours?.ai_forward_to?.value?.label || '',
              //   name: businessHours?.ai_forward_to?.value?.label || '',
              // },
            }),
          type: businessHours?.forwardType || '',
          value: businessHours?.forwardValue?.value || '',
          label: businessHours?.forwardValue?.label || '',
          name: businessHours?.forwardValue?.name || '',
          ...(businessHours?.forwardValue?.extension && {
            extension: businessHours?.forwardValue?.extension || '',
          }),
          /* What happens when nobody answers. This was read into the form and
             shown on the Summary tab but never sent, so the setting was
             discarded on save — and, worse, re-saving a number that already
             had one silently erased it. That is why a call could ring an
             extension and then end in silence.

             Only included when a type is set: sending an empty action would
             overwrite a stored one with nothing, which is the same data loss
             in a different disguise. */
          ...(businessHours?.missedCall?.forwardType?.value && {
            missed_call_action: {
              type: businessHours.missedCall.forwardType.value,
              value: businessHours?.missedCall?.forwardValue?.value || '',
              label: businessHours?.missedCall?.forwardValue?.label || '',
              /* '0' is the personal mailbox of the extension being rung. */
              personal: businessHours?.missedCall?.type === '0',
            },
          }),
        },
      },
      media: {
        welcome: {
          enabled: welcome?.enabled || false,
          value: welcome?.value?.value || '',
          label: welcome?.value?.label || '',
        },
        hold: {
          enabled: hold?.enabled || false,
          value: hold?.value?.value || '',
          label: hold?.value?.label || '',
        },
        voicemail: {
          enabled: voicemail?.enabled || false,
          value: voicemail?.value?.value || '',
          label: voicemail?.value?.label || '',
        },
      },
      ...(initialType === INITIAL_TYPE_CONSTANT.SELECT_TEMPLATE && {
        did_info: {
          did_name: did_info.did_name || initialData?.did_name,
          site: did_info.site?.value,
        },
      }),
    };

    const payload: any = { forward_call_actions: { ...request } };

    if (isUpsertTemplate) {
      payload.name = templateName;
      if (initialData?.uuid || templateUUID) {
        payload.templateUUID = initialData?.uuid || templateUUID;
      }
    } else {
      payload.uuid = initialData?.uuid;
    }

    mutateCallForwarding(payload);
  };

  const forwardCallActionsData = isJsonString(initialData?.forward_call_actions);
  const forwardActions = selectedTemplate?.forward_call_actions
    ? JSON.parse(selectedTemplate?.forward_call_actions)
    : forwardCallActionsData;

  const { condition = {}, call_handling = {}, media = {} } = forwardActions || {};
  useEffect(() => {
    if (!initialData?.uuid || siteDataLoading || !dataSiteList) return;
    if (!isUpsertTemplate) {
      setValue('did_info.did_name', initialData?.did_name || '');
      if (initialData?.site_uuid) {
        const name = dataSiteList?.find((item: any) => item?.uuid === initialData?.site_uuid)?.name;
        setValue('did_info.site', {
          label: name,
          value: initialData?.site_uuid || '',
          name: name,
        });
      }
    }

    // if (!forwardCallActionsData || !Object.keys(forwardCallActionsData)?.length) {
    //   return;
    // }

    const regionalSettings = condition?.operational_hours?.regional || {};
    const operationalHours = condition?.operational_hours || {};
    const scheduleHours = operationalHours?.business_hours?.value || {};
    const selectedCountry = Countries?.find(
      (item) => item?.isoCode === regionalSettings?.country_code?.value,
    );
    setValue('settings', {
      templateName: initialData?.name || '',
      // did_uuid: initialData?.uuid || null,
      site: { label: '', value: initialData?.site_uuid || '' },
      operational_hours: {
        type: operationalHours?.type || '24_hours',
        value: operationalHours?.value || CUSTOM_HOURS_SCHEDULE_OPTIONS,
        regional:
          operationalHours?.regional && Object.keys(operationalHours?.regional).length
            ? operationalHours?.regional
            : {
                override: false,
                timezone: {},
                country_code: {},
                country: {},
                time_format: '12',
              },
        holidays:
          operationalHours?.holidays && operationalHours?.holidays?.length
            ? getHolidaysFormVal(operationalHours?.holidays)
            : [],
        closed_hour_action: {
          type: {
            label: operationalHours?.closed_hour_action?.type_label || '',
            value: operationalHours?.closed_hour_action?.type || '',
          },
          value: {
            label: operationalHours?.closed_hour_action?.value_label || '',
            value: operationalHours?.closed_hour_action?.value || '',
          },
          enabled: operationalHours?.closed_hour_action?.enabled,
          personal: operationalHours?.closed_hour_action?.personal,
        },
      },
      recording:
        condition?.recording && Object.keys(condition?.recording).length
          ? condition?.recording
          : {
              on_demand: {
                enabled: false,
                recording_on: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34331.mp3',
                recording_Off: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34332.mp3',
              },
              automatic: {
                enabled: false,
                value: 'incoming',
                label: 'Incoming',
                recording_on: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34333.mp3',
              },
            },
      display_number:
        condition?.display_number && Object.keys(condition?.display_number).length
          ? {
              incoming: condition?.display_number?.incoming,
              masking: {
                type: {
                  label: condition?.display_number?.masking?.label,
                  value: condition?.display_number?.masking?.type || 'N',
                },
                value: condition?.display_number?.masking?.value || '',
              },
            }
          : {
              incoming: {
                label: 'Yes',
                value: true,
              },
              masking: {
                type: { value: 'N', label: 'None' },
                value: '',
              },
              show_number_if_blocked: 'NO',
            },
      callerId: {
        enabled: !!condition?.caller_id?.length,
        value: condition?.caller_id || [],
      },
      transcription: condition?.transcription || false,
      ai_call_monitoring: condition?.ai_call_monitoring || false,
    });
    const aiTypeLabel =
      callForwardingOptions.find(
        (item: any) => item?.value === call_handling?.business_hours?.ai_forward_to?.type,
      )?.label || '';

    console.log(aiTypeLabel);

    setValue('callHandling', {
      businessHours: {
        // ai_forward_to: {
        //   type: {
        //     label: aiTypeLabel || 'Hangup',
        //     value: call_handling?.business_hours?.ai_forward_to?.type || 'HANGUP',
        //   },
        //   value: {
        //     label: call_handling?.business_hours?.ai_forward_to?.label || 'Hangup',
        //     value: call_handling?.business_hours?.ai_forward_to?.value || 'HANGUP',
        //   },
        // },
        forwardType: call_handling?.business_hours?.type || '',
        forwardValue: {
          label: call_handling?.business_hours?.label || '',
          value: call_handling?.business_hours?.value || '',
          name: call_handling?.business_hours?.name || '',
          type: call_handling?.business_hours?.type || '',
        },
        missedCall: {
          type: call_handling?.business_hours?.missed_call_action?.personal ? '0' : '1',
          forwardType: {
            label: '',
            value: call_handling?.business_hours?.missed_call_action?.type || '',
          },
          forwardValue: {
            label: call_handling?.business_hours?.missed_call_action?.label || '',
            value: call_handling?.business_hours?.missed_call_action?.value || '',
          },
        },
      },
    });
    setValue('media', {
      welcome: {
        enabled: media?.welcome?.enabled || false,
        value: {
          label: media?.welcome?.label || '',
          value: media?.welcome?.value || '',
        },
      },
      hold: {
        enabled: media?.hold?.enabled || false,
        value: {
          label: media?.hold?.label || '',
          value: media?.hold?.value,
        },
      },
      voicemail: {
        enabled: media?.voicemail?.enabled || false,
        value: {
          label: media?.voicemail?.label || '',
          value: media?.voicemail?.value,
        },
      },
    });
    const isValidRegionalSettings =
      regionalSettings?.timezone && regionalSettings?.timezone && selectedCountry?.name;

    setState({
      regionalSettingsModal: {
        isOpenModal: false,
        data: isValidRegionalSettings
          ? `${regionalSettings?.timezone}, ${selectedCountry?.name}`
          : 'Regional settings are not configured.',
      },
      businessHoursModal: {
        isOpenModal: false,
        data:
          operationalHours?.business_hours?.type === '24_hours'
            ? '24 Hours, all times'
            : getScheduleHours(scheduleHours),
      },
    });
  }, [initialData, selectedTemplate, siteDataLoading, dataSiteList]);

  useEffect(() => {
    setValidationContext(watchedValues);
  }, [JSON.stringify(watchedValues)]);

  useEffect(() => {
    if (getObjectLength(user) && !condition?.operational_hours?.regional) {
      setValue('settings.operational_hours.regional', user?.settings?.operational_hours?.regional);
    }
  }, [user, initialData]);
  return (
    <FormProvider {...formInstance}>
      <form
        onSubmit={formInstance.handleSubmit(handleCallForwarding)}
        className={`w-full flex flex-col gap-4 justify-between h-full ${
          isUpsertTemplate ? 'call-handling-template-form' : ''
        }`}
      >
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className={`flex  w-full ${isUpsertTemplate ? 'call-handling-template-tabs' : ''}`}
        >
          <div
            className={`border-b border-gray-200 w-full ${
              isUpsertTemplate ? 'call-handling-template-tabs-header' : ''
            }`}
          >
            <TabsList
              className={`flex text-sm font-semibold text-center  p-0 rounded-none min-h-10 ${
                isUpsertTemplate ? 'call-handling-template-tabs-list' : ''
              }`}
            >
              {TABS_ORDER.map((value, index) => (
                <TabsTrigger
                  key={index}
                  value={value}
                  className={`data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6   text-gray-700 cursor-pointer h-full rounded-none    m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs ${
                    isUpsertTemplate ? 'call-handling-template-tab-trigger' : ''
                  }`}
                >
                  {value}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent
            value={CALL_FORWARDING_TAB_CONSTANT.DID_INFO}
            className={isUpsertTemplate ? 'call-handling-template-tabs-content' : ''}
          >
            <DIDInfo {...{ initialData, initialType, selectedTemplate, setSelectedTemplate }} />
          </TabsContent>
          <TabsContent
            value={CALL_FORWARDING_TAB_CONSTANT.CONDITION}
            className={isUpsertTemplate ? 'call-handling-template-tabs-content' : ''}
          >
            <Settings
              {...{
                initialType,
                state,
                setState,
                features,
                data: condition,
              }}
            />
          </TabsContent>
          <TabsContent
            value={CALL_FORWARDING_TAB_CONSTANT.CALL_HANDLING}
            className={isUpsertTemplate ? 'call-handling-template-tabs-content' : ''}
          >
            <CallHandling
              {...{ features, isUser, callHandlingTabAction, handleCallHandlingTabChange }}
            />
          </TabsContent>
          <TabsContent
            value={CALL_FORWARDING_TAB_CONSTANT.MEDIA}
            className={isUpsertTemplate ? 'call-handling-template-tabs-content' : ''}
          >
            <Media />
          </TabsContent>
          <TabsContent
            value={CALL_FORWARDING_TAB_CONSTANT.SUMMARY}
            className={isUpsertTemplate ? 'call-handling-template-tabs-content' : ''}
          >
            <Summary />
          </TabsContent>
        </Tabs>
        <div
          className={`justify-end flex gap-2 ${
            isUpsertTemplate ? 'call-handling-template-footer' : ''
          }`}
        >
          <Button
            type="button"
            variant={'transparent'}
            onClick={() => setDrawerState(false)}
            className={isUpsertTemplate ? 'call-handling-template-footer-btn' : ''}
          >
            Cancel
          </Button>
          <Button
            variant={'outline'}
            type="button"
            onClick={handlePrev}
            disabled={activeTab === TABS_ORDER[0]}
            className={isUpsertTemplate ? 'call-handling-template-footer-btn' : ''}
          >
            Prev
          </Button>
          {activeTab !== CALL_FORWARDING_TAB_CONSTANT.MEDIA && (
            <Button
              variant={'outline'}
              type="button"
              onClick={handleNext}
              className={isUpsertTemplate ? 'call-handling-template-footer-btn' : ''}
            >
              Next
            </Button>
          )}
          {activeTab === CALL_FORWARDING_TAB_CONSTANT.MEDIA && (
            <Button
              variant={'primary'}
              type="submit"
              disabled={isPending}
              className={isUpsertTemplate ? 'call-handling-template-footer-btn' : ''}
            >
              {isPending ? 'Submiting...' : 'Submit'}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
};

export default UpsertCallForwarding;

import { FC, useEffect, useMemo, useState } from 'react';
import { CAMPAIGN_UPSERT_TAB_CONSTANT } from '../const';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import BasicInformation from './basic-info';
import Settings from './settings';
import AgentsList from './agents-list';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { CAMPAIGN_SCEHAM } from './schema';
import { CAMPAIGN_TYPE_LIST, DIALER_TYPE, PREVIW_INITIALS } from './consts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { allNumbersList, createCampaign, getCallScript, getCampaignDetail } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { useGetGroupList, useGetSite } from '@/hooks/common';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import DispositionModal from '../../dispositions/add-edit-dispositions';
import SettingsAndPermission from './settings-and-permission';
import { useUser } from '@/hooks/use-user';
import GreetingNotification from './greetings';
import Spin from '@/components/spin';
import moment from 'moment';
import { buildCampaignUpsertPayload, mapCampaignToFormDefaults } from './campaign-mappers';

const TABS_ORDER = [
  CAMPAIGN_UPSERT_TAB_CONSTANT.BASIC_INFORMATION,
  CAMPAIGN_UPSERT_TAB_CONSTANT.SETTING_PERMISSION,
  CAMPAIGN_UPSERT_TAB_CONSTANT.SETTING,
  CAMPAIGN_UPSERT_TAB_CONSTANT.AGENTS,
  CAMPAIGN_UPSERT_TAB_CONSTANT.MEDIA,
];

const collectFormErrorMessages = (errorNode: any): string[] => {
  if (!errorNode) return [];
  if (typeof errorNode === 'string') return [errorNode];
  if (Array.isArray(errorNode)) {
    return errorNode.flatMap((item) => collectFormErrorMessages(item));
  }
  if (typeof errorNode === 'object') {
    const directMessage = typeof errorNode.message === 'string' ? [errorNode.message] : [];
    const nestedMessages = Object.values(errorNode).flatMap((value) =>
      collectFormErrorMessages(value),
    );
    return [...directMessage, ...nestedMessages];
  }
  return [];
};

const AddEditCampaign: FC<any> = ({ setDrawerState, selectedCampaign }) => {
  const [activeTab, setActiveTab] = useState<string>(
    CAMPAIGN_UPSERT_TAB_CONSTANT.BASIC_INFORMATION,
  );
  const { user } = useUser();
  const { user_info } = user || {};
  const isEditMode = Boolean(selectedCampaign?._id);
  const queryClient: any = useQueryClient();
  const { data: dataSiteList = [] } = useGetSite();
  const { data: groupList = [] } = useGetGroupList({ type: 'LEAD', generatedBy: null });
  const [dialMethod, setDialMethod] = useState<string>();
  console.log(dialMethod, 'dialMethoddialMethod');

  const [schemaContext, setSchemaContext] = useState(null);
  const [modalState, setModalState] = useState<boolean>(false);
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  const {
    data: campaignDetail,
    isLoading: isLoadingCampaignDetail,
    isFetching: isFetchingCampaignDetail,
  } = useQuery({
    queryKey: ['campaignDetail', selectedCampaign?._id],
    queryFn: () => getCampaignDetail({ campaignId: selectedCampaign?._id }),
    select: (data) => data?.data?.data?.result,
    enabled: isEditMode,
    refetchOnWindowFocus: false,
  });
  const campaignData = campaignDetail || selectedCampaign;
  const { campaignStatus = 'NEW' } = campaignData || {};

  const { data: inventoryNumberList = [], isLoading: isLoadingInventoryNumber } = useQuery({
    queryKey: ['allNumbersListInInventory'],
    queryFn: () =>
      allNumbersList({
        page: 1,
        limit: 1000,
      }),
    select: (data) => data?.data?.data?.result?.rows,
  });

  const { data: scriptList = [], isLoading: isLoadingScriptListing } = useQuery({
    queryKey: ['getScriptListAccToType', dialMethod],
    queryFn: () =>
      getCallScript({
        page: 1,
        limit: 200,
        filters: [],
        sort: {
          key: 'createdAt',
          desc: true,
        },
      }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });
  const formInstance = useForm<any>({
    defaultValues: useMemo(
      () => ({
        ...PREVIW_INITIALS,
        startDate: moment().format('YYYY-MM-DD'),
        endDate: moment().add(1, 'month').format('YYYY-MM-DD'),
      }),
      [],
    ),
    resolver: yupResolver(CAMPAIGN_SCEHAM[activeTab]),
    mode: 'onChange',
    context: { schemaContext },
  });
  const {
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = formInstance;

  const notifyValidationErrors = (fallback?: string) => {
    const messages = collectFormErrorMessages(errors).filter(Boolean);
    handleAlert({
      text: messages[0] || fallback || 'Please fix validation errors before continuing.',
      type: 'warning',
    });
  };

  const { mutate: mutateAddCampaign, isPending: isPendingAddCampaign } = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      handleAlert({
        text: isEditMode ? 'Campaign updated successfully!' : 'Campaign created successfully!',
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: ['getCampaignListForPreview'],
        exact: false,
      });
      setDrawerState(false);
    },
  });
  useEffect(() => {
    if (user_info && !watch('siteId')?.value && !isEditMode) {
      const obj = {
        label: user_info?.site_detail?.name,
        value: user_info?.site_uuid,
      };
      setValue('siteId', obj);
    }
  }, [user_info, selectedCampaign, isEditMode]);

  const handleTabChange = async (nextTab: string) => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    const nextIndex = TABS_ORDER.indexOf(nextTab);

    if (nextIndex <= currentIndex) {
      setActiveTab(nextTab);
      return;
    }
    const values = formInstance.getValues();

    for (let i = currentIndex; i < nextIndex; i++) {
      const tabKey = TABS_ORDER[i];
      const schema = CAMPAIGN_SCEHAM[tabKey];

      try {
        await schema.validate(values, {
          abortEarly: false,
        });
      } catch (err: any) {
        if (err?.inner) {
          err.inner.forEach((validationError: any) => {
            if (validationError.path) {
              formInstance.setError(validationError.path as any, {
                type: 'manual',
                message: validationError.message,
              });
            }
          });
        }
        notifyValidationErrors(err?.inner?.[0]?.message || err?.message);

        return;
      }
    }

    setActiveTab(nextTab);
  };

  const handleNext = async () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    const isValid = await trigger();

    if (!isValid) {
      notifyValidationErrors();
      return;
    }

    if (currentIndex < TABS_ORDER.length - 1) {
      setActiveTab(TABS_ORDER[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS_ORDER[currentIndex - 1]);
    }
  };

  const stepLookUp: any = useMemo(
    () => ({
      [CAMPAIGN_UPSERT_TAB_CONSTANT.BASIC_INFORMATION]: (
        <BasicInformation {...{ dataSiteList, groupList, inventoryNumberList, campaignStatus }} />
      ),
      [CAMPAIGN_UPSERT_TAB_CONSTANT.SETTING_PERMISSION]: (
        <SettingsAndPermission campaignStatus={campaignStatus} />
      ),
      [CAMPAIGN_UPSERT_TAB_CONSTANT.SETTING]: (
        <Settings
          dialMethod={dialMethod}
          setModalState={setModalState}
          campaignStatus={campaignStatus}
        />
      ),
      [CAMPAIGN_UPSERT_TAB_CONSTANT.AGENTS]: (
        <AgentsList scriptList={scriptList} dialMethod={dialMethod} />
      ),
      [CAMPAIGN_UPSERT_TAB_CONSTANT.MEDIA]: <GreetingNotification />,
    }),
    [
      dataSiteList,
      groupList,
      inventoryNumberList,
      campaignStatus,
      dialMethod,
      scriptList,
      setModalState,
    ],
  );

  const onSubmit = () => {
    const payload = buildCampaignUpsertPayload({
      formValues: getValues(),
      dialMethod,
      campaignStatus,
      selectedCampaignId: campaignData?._id,
      fallbackDomain: user?.sip_credentials?.domain || '',
    });
    mutateAddCampaign(payload);
  };
  useEffect(() => {
    if (scriptList?.length > 0 && campaignData?._id) {
      const scriptLabel = scriptList?.find((item: any) => item._id === campaignData?.script)?.name;
      setValue('script', { label: scriptLabel || '', value: campaignData?.script || '' });
    }
  }, [scriptList, campaignData, setValue]);

  useEffect(() => {
    setIsFormInitialized(false);
    if (!isEditMode) {
      setDialMethod(DIALER_TYPE.PREVIEW);
    } else setDialMethod(campaignData?.dialMethod || DIALER_TYPE.PREVIEW);
  }, [selectedCampaign?._id, isEditMode, campaignData?.dialMethod]);

  useEffect(() => {
    if (
      !isFormInitialized &&
      campaignData &&
      (!isEditMode || (campaignDetail && !isFetchingCampaignDetail))
    ) {
      const prefilledValues = mapCampaignToFormDefaults({
        selectedCampaign: campaignData,
        dataSiteList,
        groupList,
        inventoryNumberList,
      });

      setValue('name', prefilledValues.name);
      setValue('description', prefilledValues.description);
      setValue('dialerSetting', prefilledValues.dialerSetting);
      setValue('greetings', prefilledValues.greetings);
      setValue('agentDisposition', prefilledValues.agentDisposition);
      setValue('allowSkipping', prefilledValues.allowSkipping);
      setValue('agentScripting', prefilledValues.agentScripting);
      setValue('members', prefilledValues.members);
      setValue('startDate', prefilledValues.startDate);
      setValue('endDate', prefilledValues.endDate);
      setValue('settings', prefilledValues.settings);
      setValue('settings.display_number.masking.type', prefilledValues.maskingType);
      setValue('siteId', prefilledValues.siteId);
      setValue('groupId', prefilledValues.groupId);
      setValue('callerId', prefilledValues.callerId);
      setIsFormInitialized(true);
    }
  }, [
    isFormInitialized,
    campaignData,
    campaignDetail,
    isFetchingCampaignDetail,
    inventoryNumberList,
    groupList,
    dataSiteList,
    setValue,
    isEditMode,
  ]);

  useEffect(() => {
    const subscription = watch((value) => {
      setSchemaContext(value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  return (
    <>
      <Spin
        loading={
          isLoadingInventoryNumber ||
          isLoadingScriptListing ||
          isLoadingCampaignDetail ||
          isFetchingCampaignDetail
        }
      >
        <div className="flex h-full w-full flex-col gap-4 justify-between">
          <RadioGroup
            value={dialMethod}
            disabled={isEditMode}
            onValueChange={(val) => {
              setDialMethod(val);
              setValue('dialMethod', val);
              setValue('script', { label: '', value: '' });
            }}
            className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-4"
          >
            {CAMPAIGN_TYPE_LIST.map((item, index) => {
              const id = `dial-option-${index}`;
              return (
                <label
                  key={index}
                  htmlFor={id}
                  className={`w-full flex items-start justify-between gap-2 px-4 py-3 border rounded-xl ${isEditMode ? 'pointer-events-none opacity-50' : 'cursor-pointer'} ${
                    dialMethod === item?.value
                      ? 'border-gray-200 bg-gray-100'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="text-gray-900 font-semibold text-md">{item.label}</h3>
                    <p className="text-gray-500 font-normal text-sm">{item.description}</p>
                  </div>
                  <RadioGroupItem id={id} value={item.value} className="peer cursor-pointer" />
                </label>
              );
            })}
          </RadioGroup>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex w-full">
            <div className="w-full overflow-x-auto border-b border-gray-200">
              <TabsList className="flex min-h-10 min-w-max rounded-none bg-transparent p-0 text-center text-sm font-semibold sm:min-w-full">
                {Object.entries(CAMPAIGN_UPSERT_TAB_CONSTANT).map(([key, value]) => (
                  <TabsTrigger
                    className="relative flex h-full flex-none gap-1 rounded-none border-b-2 bg-transparent px-4 text-xs font-semibold text-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-2xs sm:flex-1 sm:justify-center sm:px-6 sm:text-sm"
                    key={key}
                    value={value}
                  >
                    {value}{' '}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
          <FormProvider {...formInstance}>
            <form
              onSubmit={formInstance.handleSubmit(onSubmit)}
              className="flex h-full w-full flex-col gap-4 justify-between"
            >
              {stepLookUp?.[activeTab]}
              <div className="flex flex-row items-center justify-between gap-2">
                <Button variant={'transparent'} type="button" onClick={() => setDrawerState(false)}>
                  Cancel
                </Button>
                <div className="flex flex-row items-center gap-2">
                  <Button
                    variant={'outline'}
                    type="button"
                    onClick={handlePrev}
                    disabled={activeTab === TABS_ORDER[0]}
                  >
                    Prev
                  </Button>
                  {activeTab !== CAMPAIGN_UPSERT_TAB_CONSTANT.MEDIA && (
                    <Button variant={'outline'} type="button" onClick={handleNext}>
                      Next
                    </Button>
                  )}
                  {activeTab === CAMPAIGN_UPSERT_TAB_CONSTANT.MEDIA && (
                    <Button variant={'primary'} type="submit" disabled={isPendingAddCampaign}>
                      {isPendingAddCampaign ? 'Submitting...' : 'Submit'}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </FormProvider>
        </div>
      </Spin>
      {modalState && (
        <DispositionModal modalState={modalState} setModalState={() => setModalState(false)} />
      )}
    </>
  );
};

export default AddEditCampaign;

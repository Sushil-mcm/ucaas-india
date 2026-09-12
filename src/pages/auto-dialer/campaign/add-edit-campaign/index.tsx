import { FC, useEffect, useMemo, useRef, useState } from 'react';
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
import { allNumbersList, createCampaign, getCallScript, getCampaignDetail, playPauseCampaign } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { handleAlert } from '@/lib/utils';
import { useGetGroupList, useGetSite } from '@/hooks/common';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import DispositionModal from '../../dispositions/add-edit-dispositions';
import SettingsAndPermission from './settings-and-permission';
import { useUser } from '@/hooks/use-user';
import InboundAndCallbacks from './inbound';
import Review from './review';
import { findDidRow, routeNumberToCampaign } from '../inbound-routing';
import Spin from '@/components/spin';
import { buildCampaignUpsertPayload, mapCampaignToFormDefaults } from './campaign-mappers';
import { defaultCampaignDates, followZoneDates } from '@/lib/campaign-dates';
import { readBrowserZone } from '@/lib/campaign-timezone';
import { useCampaignTimers } from '@/hooks/use-campaign-timers';
import { planCampaignTimerSeed } from '@/lib/campaign-timers';

const TABS_ORDER = [
  CAMPAIGN_UPSERT_TAB_CONSTANT.BASIC_INFORMATION,
  CAMPAIGN_UPSERT_TAB_CONSTANT.AGENTS,
  CAMPAIGN_UPSERT_TAB_CONSTANT.SETTING,
  CAMPAIGN_UPSERT_TAB_CONSTANT.SETTING_PERMISSION,
  CAMPAIGN_UPSERT_TAB_CONSTANT.INBOUND,
  CAMPAIGN_UPSERT_TAB_CONSTANT.REVIEW,
];
const LAST_TAB = TABS_ORDER[TABS_ORDER.length - 1];

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
  const navigate = useNavigate();
  const { data: dataSiteList = [] } = useGetSite();
  const { data: groupList = [] } = useGetGroupList({ type: 'LEAD', generatedBy: null });
  const [dialMethod, setDialMethod] = useState<string>();

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
        /* A draft is not offered: it is still being written. */
        filters: [{ key: 'status', value: 'published' }],
        sort: {
          key: 'createdAt',
          desc: true,
        },
      }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });
  const formInstance = useForm<any>({
    /* The dates start from the browser's day only until the Hours step has
       settled the campaign's zone; the effect below then moves them to that
       zone's day. Filling them from the browser alone left a New York
       campaign created after midnight in India dated tomorrow, paused
       "Before the campaign start date" (live test, 9 Sep). */
    defaultValues: useMemo(
      () => ({
        ...PREVIW_INITIALS,
        ...defaultCampaignDates(readBrowserZone()),
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
    formState: { dirtyFields, touchedFields },
  } = formInstance;

  /* A new campaign's dates follow its zone until somebody types a date. The
     zone is chosen on the Hours step (src/lib/campaign-timezone.ts), which
     may be after this form was created, and may change again; each time,
     "today" is re-read in the new zone unless the person has already set a
     date of their own. An existing campaign keeps what it saved. */
  const campaignZone = String(watch('settings.operational_hours.regional.timezone')?.value || '');
  const datesTouched = Boolean(
    dirtyFields?.startDate || dirtyFields?.endDate || touchedFields?.startDate || touchedFields?.endDate,
  );
  useEffect(() => {
    /* The rule itself lives in src/lib/campaign-dates.ts (followZoneDates),
       where it is tested; this only writes what it returns. */
    const next = followZoneDates({
      isEditMode,
      timezone: campaignZone,
      datesTouched,
      startDate: getValues('startDate'),
      endDate: getValues('endDate'),
    });
    if (!next) return;
    if (getValues('startDate') !== next.startDate) setValue('startDate', next.startDate, { shouldValidate: true });
    if (getValues('endDate') !== next.endDate) setValue('endDate', next.endDate, { shouldValidate: true });
  }, [campaignZone, datesTouched, getValues, isEditMode, setValue]);

  const notifyValidationErrors = (fallback?: string) => {
    /* Read the live error state: the closure copy lags one render behind and
       used to turn every real message into the generic one. */
    const messages = collectFormErrorMessages(formInstance.formState.errors).filter(Boolean);
    handleAlert({
      text: messages[0] || fallback || 'Please fix validation errors before continuing.',
      type: 'warning',
    });
  };

  const { mutate: mutateAddCampaign, isPending: isPendingAddCampaign } = useMutation({
    mutationFn: createCampaign,
    onSuccess: async (response: any, payload: any) => {
      handleAlert({
        text: isEditMode ? 'Campaign updated successfully!' : 'Campaign created successfully!',
        type: 'success',
      });
      /* Inbound: point the outgoing number at the campaign's team when asked.
         The queue is made by the save above, so its id is read back from the
         campaign after the save. A failure here is reported, not hidden: the
         campaign exists either way. */
      if (payload?.settings?.inbound?.route_number) {
        try {
          const id = response?.data?.data?.result?.campaignObjId || campaignData?._id;
          const detail = (await getCampaignDetail({ campaignId: id }))?.data?.data?.result;
          const didRow = findDidRow(inventoryNumberList, payload?.settings?.inbound?.did_number);
          await routeNumberToCampaign(didRow, detail || {});
          handleAlert({
            text: `Calls to ${didRow?.did_number ? `+${String(didRow.did_number).replace(/^\+/, '')}` : 'the number'} now go to the campaign team.`,
            type: 'success',
          });
        } catch (error: any) {
          handleAlert({
            text: `The campaign is saved, but the number could not be routed to its team: ${error?.response?.data?.error?.message || error?.message || 'unknown error'}. You can set it on the campaign page.`,
            type: 'warning',
          });
        }
      }
      queryClient.invalidateQueries({
        queryKey: ['getCampaignListForPreview'],
        exact: false,
      });
      /* The campaign list page reads its rows and KPI strip from this key,
         so without it a new campaign only appeared after a full reload. */
      queryClient.invalidateQueries({ queryKey: ['campaignListForKpis'] });
      setDrawerState(false);
      /* A new campaign lands on its own page, where the Start button is. */
      if (!isEditMode) {
        const newId = response?.data?.data?.result?.campaignObjId;
        if (newId) navigate('/campaign/all-campaigns/compaign-record', { state: { campaignId: String(newId) } });
      }
    },
    /* A refused save used to arrive only as a red toast in the corner, while the
       wizard sat on whichever step it was on with nothing marked. The commonest
       refusal by far names a field - the campaign name is already used in this
       company - so put it ON that field and go back to the step that holds it,
       the way a client-side validation error behaves. Anything the server sends
       that cannot be placed still falls through to the toast. */
    onError: (error: any) => {
      const serverMessage = String(
        error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          error?.message ||
          '',
      );
      if (/name already taken/i.test(serverMessage)) {
        const typedName = String(formInstance.getValues('name') || '').trim();
        formInstance.setError('name', {
          type: 'server',
          message: typedName
            ? `A campaign called "${typedName}" already exists in this company. Choose a different name.`
            : 'That campaign name is already used in this company. Choose a different name.',
        });
        setActiveTab(CAMPAIGN_UPSERT_TAB_CONSTANT.BASIC_INFORMATION);
        formInstance.setFocus('name');
      }
    },
  });

  /* Running campaigns are locked; offer the pause right here instead of
     sending the person back to the list to find the icon. */
  const { mutate: mutatePause, isPending: isPausing } = useMutation({
    mutationFn: playPauseCampaign,
    onSuccess: () => {
      handleAlert({ text: 'Campaign paused. You can edit it now.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['campaignDetail', selectedCampaign?._id] });
      queryClient.invalidateQueries({ queryKey: ['campaignListForKpis'] });
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
      [CAMPAIGN_UPSERT_TAB_CONSTANT.INBOUND]: (
        <InboundAndCallbacks campaignStatus={campaignStatus} inventoryNumberList={inventoryNumberList} />
      ),
      [CAMPAIGN_UPSERT_TAB_CONSTANT.REVIEW]: (
        <Review dialMethod={dialMethod} groupList={groupList} isEditMode={isEditMode} />
      ),
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
      inventoryNumberList,
      existingSettings: campaignData?.settings || null,
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

      /* Put back EVERY field the mapper produced, not a hand-kept subset.
         This used to be fifteen named setValue calls against a mapper that
         returns twenty fields, so six of them were read from the campaign and
         then dropped on the floor: the Skip-reason ticks
         (`declineDispositions`), the whole `inbound` block including "send all
         calls to this team", agent-owned records, country, caller-ID rotation
         and the consent gate. Every one of them saved correctly and came back
         empty the next time the campaign was opened — the classic shape of this
         bug, where the list of fields to restore has to be remembered by hand
         and quietly falls behind the list of fields that exist.
         Driving it off the mapper's own keys means a field added there is
         restored the same day it is added.
         `maskingType` is the one deliberate exception: it is a flattened alias
         the form stores at a nested path, so it keeps its explicit line and is
         not written as a top-level key. */
      const MAPPER_ONLY_KEYS = new Set(['maskingType']);
      (Object.keys(prefilledValues) as Array<keyof typeof prefilledValues>).forEach((key) => {
        if (MAPPER_ONLY_KEYS.has(key as string)) return;
        setValue(key as any, (prefilledValues as any)[key]);
      });
      setValue('settings.display_number.masking.type', prefilledValues.maskingType);
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

  /* The company's timer defaults (Company › Campaign timers). A NEW campaign
     starts from them once they have loaded - the built-in numbers in
     PREVIW_INITIALS only hold the form until then. An EXISTING campaign keeps
     its own numbers, and only a timer it never had stored (wait_after_call on
     a campaign saved before it existed) is filled in from the company, so the
     form does not open with a blank the schema would refuse. A server without
     the section resolves to the built-in defaults, so this never blocks. */
  const { timers: companyTimers, isFetched: companyTimersFetched } = useCampaignTimers();
  const timersSeededRef = useRef<string>('');
  useEffect(() => {
    if (!companyTimersFetched) return;
    /* The decision itself is planCampaignTimerSeed (src/lib/campaign-timers.ts,
       unit-tested); this effect only writes what it returns. A new campaign
       is seeded once per company value, so an admin's own edits are not
       overwritten by a refetch of the same numbers. */
    const writes = planCampaignTimerSeed({
      isEditMode,
      isFormInitialized,
      companyTimers,
      current: isEditMode ? getValues('dialerSetting') || {} : null,
    });
    if (!isEditMode) {
      const seedKey = JSON.stringify(writes);
      if (timersSeededRef.current === seedKey) return;
      timersSeededRef.current = seedKey;
    }
    for (const [key, value] of Object.entries(writes)) {
      setValue(`dialerSetting.${key}` as any, value, { shouldValidate: false });
    }
  }, [companyTimersFetched, companyTimers, isEditMode, isFormInitialized, setValue, getValues]);

  useEffect(() => {
    const subscription = watch((value) => {
      setSchemaContext(value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  /* The mode lives in component state; the schemas read it from the form
     values, and an inbound campaign starts with its number routed to the
     team, which is the whole point of it. */
  useEffect(() => {
    if (!dialMethod) return;
    setValue('dialMethod', dialMethod);
    if (dialMethod === DIALER_TYPE.INBOUND && !isEditMode) {
      setValue('inbound.route_number', true);
    }
  }, [dialMethod, isEditMode, setValue]);

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
                      ? 'border-[#EEE7DD] bg-[#FBE2C8]/40'
                      : 'border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[#2E2D35] font-semibold text-md">{item.label}</h3>
                    <p className="text-[#9A948F] font-normal text-sm">{item.description}</p>
                  </div>
                  <RadioGroupItem id={id} value={item.value} className="peer cursor-pointer" />
                </label>
              );
            })}
          </RadioGroup>

          {campaignStatus === 'PROCESSING' && dialMethod !== DIALER_TYPE.INBOUND ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span>This campaign is running, so its settings are locked. Pause it to make changes; start it again when done.</span>
              <Button type="button" variant="secondary" size="sm" className="shadow-none whitespace-nowrap" disabled={isPausing} onClick={() => mutatePause({ campaignId: campaignData?._id, campaignStatus: 'PAUSE' })}>
                {isPausing ? 'Pausing…' : 'Pause and edit'}
              </Button>
            </div>
          ) : campaignStatus && campaignStatus !== 'NEW' ? (
            <p className="text-xs text-gray-500">The number and the lead list are fixed once a campaign has started; everything else can change.</p>
          ) : null}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex w-full">
            <div className="w-full overflow-x-auto border-b border-[#EEE7DD]">
              <TabsList className="flex min-h-10 min-w-max rounded-none bg-transparent p-0 text-center text-sm font-semibold sm:min-w-full">
                {Object.entries(CAMPAIGN_UPSERT_TAB_CONSTANT).map(([key, value]) => (
                  <TabsTrigger
                    className="relative flex h-full flex-none gap-1 rounded-none border-b-2 bg-transparent px-4 text-xs font-semibold text-[#2E2D35] data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-2xs sm:flex-1 sm:justify-center sm:px-6 sm:text-sm"
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
                  {activeTab !== LAST_TAB && (
                    <Button variant={'outline'} type="button" onClick={handleNext}>
                      Next
                    </Button>
                  )}
                  {activeTab === LAST_TAB && (
                    <Button variant={'primary'} type="submit" disabled={isPendingAddCampaign}>
                      {isPendingAddCampaign ? 'Saving...' : isEditMode ? 'Save changes' : 'Launch campaign'}
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

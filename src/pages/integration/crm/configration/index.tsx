import { Icon, IconName } from '@/assets/icons/icon';
import Flag from '@/components/flag';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { formatPhoneNumber, handleAlert } from '@/lib/utils';
import { FC, useEffect, useState } from 'react';
import {
  CRMConfigurationForm,
  CRMConfigurationInitialValues,
  CRMConfigurationProps,
  generalSettings,
} from '../../constant';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getCRMSettings, saveCRMSettings } from '@/services/api';

const CRMConfigration: FC<CRMConfigurationProps> = ({ drawerData: crmData, setDrawerState }) => {
  const formInstance = useForm<CRMConfigurationForm>({
    defaultValues: CRMConfigurationInitialValues,
  });

  const { reset, control, handleSubmit } = formInstance;
  const [selectedDID, setSelectedDID] = useState<any>();

  // const { data: allDIDNumbers = [], isLoading: isPendingDIDList } = useQuery({
  //   queryKey: ['allNumbersList'],
  //   queryFn: () => allNumbersList(),
  //   select: (data) => data?.data?.data?.result?.rows || [],
  // });

  const { data: getCRMSettingData = {} } = useQuery({
    queryKey: ['getCRMSettings', crmData?.id],
    queryFn: () => getCRMSettings(crmData?.id?.toLocaleLowerCase()),
    select: (data) => data?.data?.data?.result || {},
  });

  useEffect(() => {
    if (getCRMSettingData?.crmSettings?.settings) {
      const {
        contacts2WaySync = false,
        createNewContacts = false,
        incomingCalls = false,
        notesLogging = false,
        syncCallLogs = false,
        phoneAsContactName = false,
        voicemail = false,
        log_calls_numbers = [],
      } = getCRMSettingData?.crmSettings?.settings || {};
      reset({
        contacts2WaySync,
        createNewContacts,
        incomingCalls,
        notesLogging,
        syncCallLogs,
        phoneAsContactName,
        voicemail,
      });
      const getDIDNumbers = (log_calls_numbers || [])?.map((did_number: string) => ({
        label: did_number,
        value: did_number,
        icon: (
          <div className="w-5">
            <Flag phoneNumber={formatPhoneNumber(did_number)} />
          </div>
        ),
      }));
      setSelectedDID(getDIDNumbers);
    }
  }, [getCRMSettingData]);

  const { mutate: mutateSaveCRMSettings, isPending } = useMutation({
    mutationFn: saveCRMSettings,
    mutationKey: ['saveCRMSettings'],
    onSuccess: (data) => {
      handleAlert({
        text: data?.data?.message || 'Configuration updated successfully',
        type: 'success',
      });
      setDrawerState(false);
    },
  });

  // useEffect(() => {
  //   if (allDIDNumbers && allDIDNumbers.length > 0) {
  //     const firstDid = allDIDNumbers[0];
  //     setSelectedDID({
  //       label: firstDid?.did_number,
  //       value: firstDid?.did_number,
  //       icon: (
  //         <div className="w-5">
  //           <Flag phoneNumber={formatPhoneNumber(firstDid?.did_number)} />
  //         </div>
  //       ),
  //     });
  //   }
  // }, [allDIDNumbers]);
  const onSubmit = (values: CRMConfigurationForm) => {
    const didArray = Array.isArray(selectedDID) ? selectedDID : selectedDID ? [selectedDID] : [];
    const getDIDs = didArray?.map((item: { value: string }) => item?.value);
    const payload = {
      type: crmData?.id?.toLocaleUpperCase(),
      id: getCRMSettingData?.crmSettings?._id,
      settings: { ...values, log_calls_numbers: getDIDs },
    };
    mutateSaveCRMSettings(payload);
  };
  return (
    <section className="flex h-full w-full min-w-0 min-h-0 flex-col gap-3 overflow-hidden">
      <FormProvider {...formInstance}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden"
        >
          <div className="flex min-w-0 shrink-0 flex-col gap-3 rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#FBE2C8]/40">
              <img src={crmData?.image} alt={crmData?.alt} className="w-10 h-10 object-contain" />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <h4 className="text-start font-semibold text-primary">{crmData?.name}</h4>
              <p className="text-[#2E2D35] text-xs whitespace-normal">
                {`Integrate ${crmData?.name} for efficient customer relationship management.`}
              </p>
              <p className="text-[#2E2D35] text-xs whitespace-normal">
                Connected Account :{' '}
                <span className="font-semibold break-all">{getCRMSettingData?.email}</span>
              </p>
            </div>
          </div>

          {/* <div className="flex flex-col gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Icon name="CRMIcon" className="w-20 h-20" />
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-md">
                <Icon name="Light" className="w-4 h-4 text-white" />
              </div>
              <h5 className="font-bold text-primary text-[10px] uppercase tracking-wider">
                Configuration Insight
              </h5>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-gray-900">
                Seamlessly Synchronize Your Workflow
              </p>
              <p className="text-xs text-gray-600 max-w-[85%] leading-relaxed">
                You&apos;re now connected! Customize how {crmData?.name} interacts with MCM below.
                Toggle settings to automate contact creation, sync data bidirectionally, and log
                calls automatically.
              </p>
            </div>
          </div> */}

          <Tabs
            defaultValue="general-settings"
            className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-none"
          >
            {/* <div className="border-b border-gray-200 w-full">
              <TabsList className="justify-start bg-white p-0 rounded-tl-sm rounded-tr-sm rounded-bl-none rounded-br-none min-h-10 w-full overflow-x-auto">
                <TabsTrigger
                  value="general-settings"
                  className="shrink-0 max-w-fit font-semibold cursor-pointer data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none  data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:rounded-none h-full px-4 data-[state=inactive]:text-gray-700"
                >
                  General Settings
                </TabsTrigger>
                <TabsTrigger
                  value="connected-numbers"
                  className="shrink-0 max-w-fit font-semibold cursor-pointer data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:rounded-none h-full px-4 data-[state=inactive]:text-gray-700"
                >
                  Connected Numbers
                </TabsTrigger>
              </TabsList>
            </div> */}

            <TabsContent value="general-settings" className="mt-0 min-h-0 flex-1 overflow-y-auto">
              {generalSettings?.map((item, index) => {
                // const isHubspot = crmData?.name === 'HubSpot';
                // const isPipedrive = crmData?.name === 'Pipedrive';
                // const isZoho = crmData?.name === 'Zoho';
                // const is2WaySync = item.id === 'contacts2WaySync';
                // const isSyncCalls = item.id === 'syncCallLogs';
                // const isMsTeams = crmData?.name === 'MS Teams';
                // const showComingSoon = is2WaySync
                //   ? !(isHubspot || isPipedrive || isZoho || isMsTeams)
                //   : isSyncCalls
                //     ? isMsTeams
                //     : false;
                return (
                  <div
                    key={index}
                    className="flex min-w-0 flex-col gap-4 p-3 sm:flex-row sm:items-start"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#FBE2C8]/40 p-3">
                      <Icon name={item?.icon as IconName} className="w-6 h-6" />
                    </div>
                    <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <h5 className="text-start font-semibold">{item?.title}</h5>
                        <p className="text-[#2E2D35] text-sm whitespace-normal">
                          {item?.description?.replace('{crmName}', crmData?.name || 'CRM')}
                        </p>
                      </div>
                      {/* {showComingSoon ? (
                        <div className="flex shrink-0 items-center">
                          <span className="text-primary font-medium text-xs whitespace-nowrap bg-primary/10 px-2 py-1 rounded-full">
                            Coming Soon
                          </span>
                        </div>
                      ) : ( */}
                      <Controller
                        name={item?.id as keyof CRMConfigurationForm}
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field?.value}
                            onCheckedChange={field?.onChange}
                            className="cursor-pointer shrink-0"
                          />
                        )}
                      />
                      {/* )} */}
                    </div>
                  </div>
                );
              })}
              <div className="mt-2 shrink-0 border-t border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] pt-4">
                <div className="flex min-w-max flex-nowrap justify-start gap-2 overflow-x-auto overflow-y-hidden sm:justify-end">
                  <Button
                    variant="transparent"
                    type="button"
                    onClick={() => {
                      reset();
                      setDrawerState(false);
                    }}
                    className="shrink-0"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={isPending}
                    variant={'primary'}
                    type="submit"
                    className="shrink-0"
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </TabsContent>
            {/* 
            <TabsContent value="connected-numbers">
              <div className="flex flex-col gap-3 w-full items-start p-4 sm:flex-row sm:justify-between">
                <h5 className="text-gray-800 text-sm font-medium">
                  Select a phone number to place calls
                </h5>
                <CustomSelect
                  isMulti
                  isLoading={isPendingDIDList}
                  options={
                    allDIDNumbers && allDIDNumbers?.length > 0
                      ? allDIDNumbers?.map((number: any) => ({
                          label: number?.did_number,
                          value: number?.did_number,
                          icon: (
                            <div className="w-5">
                              <Flag phoneNumber={formatPhoneNumber(number?.did_number)} />
                            </div>
                          ),
                        }))
                      : []
                  }
                  className="w-full sm:w-2/4"
                  handleChange={setSelectedDID}
                  value={selectedDID}
                  inputClass="team_chat"
                />
              </div>
            </TabsContent> */}
          </Tabs>
        </form>
      </FormProvider>
    </section>
  );
};

export default CRMConfigration;

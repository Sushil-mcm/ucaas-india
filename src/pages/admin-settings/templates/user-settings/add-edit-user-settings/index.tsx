import { useEffect, useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { yupResolver } from '@hookform/resolvers/yup';

import { FormProvider, useForm } from 'react-hook-form';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertTemplate } from '@/services/api';
import { useUser } from '@/hooks/use-user';
import { getObjectLength, handleAlert } from '@/lib/utils';
import { ADD_TEMPLATE_INITIAL, settingsInitialState, TAB_CONSTANT } from './constants';
import { UPSERT_TEMPLATE_SCHEMA } from './schema';
import {
  buildTemplatePayload,
  hydrateTemplateForm,
} from '@/lib/user-settings-template-form';
import SettingPermission from './settings';
import GreetingNotification from './greetings';
import '@/components/mcm/mcm-page.css';

interface UpdateForwardingProps {
  drawerState: boolean;
  setDrawerState: (state: boolean) => void;
  data?: any;
  setTabData?: any;
}

const TABS_ORDER = [TAB_CONSTANT.SETTING_PERMISSIONS, TAB_CONSTANT.GREETING_NOTIFICATION];

const UpsertUserSettingsTemplate: FC<UpdateForwardingProps> = ({ setDrawerState, data }) => {
  const [activeTab, setActiveTab] = useState<string>(TAB_CONSTANT.SETTING_PERMISSIONS);
  const queryClient: any = useQueryClient();

  const [schemaContext, setSchemaContext] = useState<any>(null);
  const formInstance = useForm<any>({
    defaultValues: ADD_TEMPLATE_INITIAL,
    resolver: yupResolver(UPSERT_TEMPLATE_SCHEMA[activeTab]),
    mode: 'onChange',
    context: { activeTab, schemaContext },
  });

  const { user } = useUser();
  const { company_info } = user || {};
  const {
    setValue,
    trigger,
    // formState: { errors },
    watch,
  } = formInstance;
  const handleTabChange = async (nextTab: string) => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    const nextIndex = TABS_ORDER.indexOf(nextTab);

    if (nextIndex <= currentIndex) {
      setActiveTab(nextTab); // Going backward, no validation
      return;
    }

    const isValid = await trigger();
    if (isValid) {
      setActiveTab(nextTab); // Forward only if valid
    }
  };

  const handleNext = async () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    const isValid = await trigger();

    if (isValid && currentIndex < TABS_ORDER.length - 1) {
      setActiveTab(TABS_ORDER[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS_ORDER[currentIndex - 1]);
    }
  };

  useEffect(() => {
    const subscription = watch((value) => {
      setSchemaContext(value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const { mutate: mutateUpsertTemplate, isPending: isPendingUpdateMember } = useMutation({
    mutationFn: upsertTemplate,
    onSuccess: (data) => {
      handleAlert({ text: data?.data?.message || 'Template saved successfully!', type: 'success' });
      queryClient.invalidateQueries(['userTemplateList']);
      setDrawerState(false);
    },
  });

  const onSubmit = () => {
    const { greetings = {}, settings = {} } = watch();
    mutateUpsertTemplate(
      buildTemplatePayload({
        name: watch('name'),
        settings,
        greetings,
        uuid: data?.uuid,
      }),
    );
  };

  useEffect(() => {
    if (!data?.uuid) return;
    try {
      hydrateTemplateForm(setValue, data, settingsInitialState);
    } catch (error: any) {
      console.error('Something went wrong', error?.message);
    }
  }, [data]);

  useEffect(() => {
    if (getObjectLength(user) && !data?.uuid)
      setValue('settings.operational_hours.regional', user?.settings?.operational_hours?.regional);
  }, [user, data]);

  return (
    <FormProvider {...formInstance}>
      <form
        onSubmit={formInstance.handleSubmit(onSubmit)}
        className="mcm-page mcm-userform user-settings-template-form"
      >
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex w-full user-settings-template-tabs"
        >
          <div className="border-b border-gray-200 w-full user-settings-template-tabs-header">
            <TabsList className="bg-white p-0 rounded-tl-sm rounded-tr-sm rounded-bl-none rounded-br-none min-h-10 justify-start user-settings-template-tabs-list">
              {Object.entries(TAB_CONSTANT).map(([key, value]) => (
                <TabsTrigger
                  key={key}
                  value={value}
                  className="max-w-fit font-semibold cursor-pointer data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-b-primary px-4 data-[state=active]:text-primary data-[state=active]:shadow-none  data-[state=active]:rounded-none h-full data-[state=inactive]:text-gray-700 user-settings-template-tab-trigger"
                >
                  {value}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent
            value={TAB_CONSTANT.SETTING_PERMISSIONS}
            className="user-settings-template-tabs-content"
          >
            <SettingPermission {...{ data, company_info }} />
          </TabsContent>
          <TabsContent
            value={TAB_CONSTANT.GREETING_NOTIFICATION}
            className="user-settings-template-tabs-content"
          >
            <GreetingNotification {...{ company_info }} />
          </TabsContent>
        </Tabs>
        <div className="justify-end flex gap-2 user-settings-template-footer">
          <Button
            type="button"
            variant={'transparent'}
            onClick={() => setDrawerState(false)}
            className="user-settings-template-footer-btn"
          >
            Cancel
          </Button>
          <Button
            variant={'outline'}
            type="button"
            onClick={handlePrev}
            disabled={activeTab === TABS_ORDER[0]}
            className="user-settings-template-footer-btn"
          >
            Prev
          </Button>
          {activeTab !== TAB_CONSTANT.GREETING_NOTIFICATION && (
            <Button
              variant={'outline'}
              type="button"
              onClick={handleNext}
              className="user-settings-template-footer-btn"
            >
              Next
            </Button>
          )}
          {activeTab === TAB_CONSTANT.GREETING_NOTIFICATION && (
            <Button
              variant={'primary'}
              type="submit"
              disabled={isPendingUpdateMember}
              className="user-settings-template-footer-btn"
            >
              {isPendingUpdateMember ? 'Submiting...' : 'Submit'}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
};

export default UpsertUserSettingsTemplate;

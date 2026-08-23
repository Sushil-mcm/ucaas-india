import { Icon } from '@/assets/icons/icon';
import { IconType } from '@/assets/icons/type';
import CustomSelect from '@/components/custom/custom-select';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
import { AISettingConfig, getAISettingConfig, getChatAgentList } from '@/services/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { handleAlert } from '@/lib/utils';

const socialMediaList = [
  { key: 'facebook', apiName: 'FACEBOOK', name: 'Facebook', icon: 'Messanger' },
  { key: 'whatsapp', apiName: 'WHATSAPP', name: 'WhatsApp', icon: 'WhatsappIcon' },
  { key: 'telegram', apiName: 'TELEGRAM', name: 'Telegram', icon: 'TelegramIcon' },
  { key: 'instagram', apiName: 'INSTAGRAM', name: 'Instagram', icon: 'Instagram' },
  { key: 'on_call', apiName: 'ON_CALL', name: 'On call', icon: 'PhoneCallingLine' },
  { key: 'chat_assistant', apiName: 'CHAT_ASSISTANT', name: 'Chat Assistant', icon: 'Chat2' },
];

function AISettings() {
  const navigate = useNavigate();
  const [initialized, setInitialized] = useState(false);

  const {
    control,
    reset,
    formState: { errors },
  } = useForm<any>({
    mode: 'onSubmit',
    defaultValues: {
      aiBot: {},
      aiAssistance: {},
    },
  });

  // const [customModel, setCustomModel] = useState<any>(null);
  // const [secretKey, setSecretKey] = useState('');

  const { data: typeListData = [] } = useQuery({
    queryKey: ['getChatAgentList'],
    queryFn: () => getChatAgentList(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const allAgents = useMemo(() => {
    return (
      (typeListData || []).map((agent: any) => ({
        label: agent?.agentName,
        value: agent?._id,
      })) || []
    );
  }, [typeListData]);

  // const modelOptions = useMemo(() => {
  //   return [{ label: 'Open AI', value: 'openai' }];
  // }, [chatAgents]);
  // const modelOptions = useMemo(() => {
  //   return [{ label: 'Open AI', value: 'openai' }, ...(chatAgents || [])];
  // }, [chatAgents]);

  const { data: savedSettings = [], isLoading } = useQuery({
    queryKey: ['getAISettingConfig'],
    queryFn: () => getAISettingConfig(),
    select: (data) => data?.data?.data || [],
  });
  const { mutate } = useMutation({
    mutationFn: AISettingConfig,
    mutationKey: ['AISettingConfig'],
    onSuccess: (data) => {
      handleAlert({
        text:
          data?.data?.data?.message ||
          data?.data?.message ||
          'AI agent setting updated successfully',
        type: 'success',
      });
    },
  });

  useEffect(() => {
    if (initialized) return;

    if (savedSettings?.length && allAgents?.length) {
      const values = mapSavedValues(savedSettings, allAgents);
      reset(values);
      setInitialized(true);
    }
  }, [savedSettings, allAgents, initialized, reset]);
  useEffect(() => {
    if (savedSettings?.length && allAgents?.length) {
      const values = mapSavedValues(savedSettings, allAgents);
      reset(values);
    }
  }, [savedSettings, allAgents]);

  const mapSavedValues = (settings: any[], agents: any[]) => {
    const defaults: any = {
      aiBot: {},
      aiAssistance: {},
    };

    settings?.forEach((item) => {
      const media = socialMediaList?.find((m) => m?.apiName === item?.name);
      if (!media) return;

      const agent = agents?.find((a) => a?.value === item?.agentId);
      if (!agent) return;

      if (item.type === 'AI_BOT') {
        defaults.aiBot[media.key] = agent;
      } else {
        defaults.aiAssistance[media.key] = agent;
      }
    });

    return defaults;
  };

  const handleAgentUpdate = (type: 'AI_BOT' | 'AI_ASSISTANT', media: any, selectedAgent: any) => {
    const payload = {
      type,
      name: media?.apiName,
      agentId: selectedAgent?.value || '',
    };
    mutate(payload);
  };

  return (
    <form className="w-full bg-gray-200/15 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <div className="text-gray-900 font-semibold text-lg flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate('/admin-settings/knowledge/ai-agent')}
            className="text-slate-500 transition-colors hover:text-primary"
          >
            AI Agents
          </button>
          <div className="-rotate-90 text-gray-800">
            <Icon name="ChevronIcon" className="w-5 h-5" />
          </div>
          <span className="text-primary text-md">Settings</span>
        </div>
      </div>

      <div className="w-full h-full flex  flex-col sm:flex-row gap-4 justify-between p-3">
        <div className="h-full bg-white rounded-lg border p-4 w-full">
          <h3 className="font-semibold text-gray-800 mb-3">AI Bot</h3>
          <div className="flex flex-col gap-1 h-[calc(100vh-14rem)] overflow-y-auto pr-1">
            <div className="flex flex-col gap-2">
              {socialMediaList
                ?.filter((media) => media.key !== 'on_call' && media.key !== 'chat_assistant')
                ?.map((media) => (
                  <div
                    key={media.key}
                    className="flex items-center justify-between border rounded-md p-2 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-2 text-gray-800">
                      <Icon name={media.icon as IconType} className="w-5 h-5 text-gray-700" />
                      <span className="font-medium">{media.name}</span>
                    </div>

                    <Controller
                      control={control}
                      name={`aiBot.${media.key}`}
                      render={({ field }) => (
                        <CustomSelect
                          {...field}
                          isClearable
                          isLoading={isLoading}
                          placeholder="Select agent"
                          className="max-w-60"
                          handleChange={(value) => {
                            field.onChange(value);
                            handleAgentUpdate('AI_BOT', media, value);
                          }}
                          options={allAgents || []}
                          error={(errors?.aiBot as any)?.[media.key]?.message}
                        />
                      )}
                    />
                  </div>
                ))}
            </div>
            {/* <h3 className="font-semibold text-gray-800 mb-3 mt-4">Add your own AI Model</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5 w-full">
                <p className="text-sm leading-none font-semibold text-gray-800">Select model</p>
                <CustomSelect
                  value={customModel}
                  isLoading={isLoading}
                  placeholder="Select model"
                  className=""
                  handleChange={(value) => {
                    setCustomModel(value);
                  }}
                  options={modelOptions || []}
                />
              </div>
              {customModel?.value === 'openai' && (
                <>
                  <Input
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Enter secret key"
                    label="Secret Key"
                    type="password"
                    autoComplete="false"
                  />
                  <Button variant="outline" className="w-full max-w-32">
                    Save
                  </Button>
                </>
              )}
            </div> */}
          </div>
        </div>

        <div className="h-full bg-white rounded-lg border p-4 w-full">
          <h3 className="font-semibold text-gray-800 mb-3">AI Assistance</h3>
          <div className="flex flex-col gap-2 h-[calc(100vh-14rem)] overflow-y-auto pr-1">
            {socialMediaList.map((media) => (
              <div
                key={media?.key}
                className="flex items-center justify-between border rounded-md p-2 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-2 text-gray-800">
                  <Icon name={media?.icon as IconType} className="w-5 h-5 text-gray-700" />
                  <span className="font-medium">{media?.name}</span>
                </div>

                <Controller
                  control={control}
                  name={`aiAssistance.${media?.key}`}
                  render={({ field }) => (
                    <CustomSelect
                      {...field}
                      isClearable
                      isLoading={isLoading}
                      placeholder="Select agent"
                      className="max-w-60"
                      handleChange={(value) => {
                        field.onChange(value);
                        handleAgentUpdate('AI_ASSISTANT', media, value);
                      }}
                      options={allAgents || []}
                      error={(errors?.aiAssistance as any)?.[media.key]?.message}
                    />
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}

export default AISettings;

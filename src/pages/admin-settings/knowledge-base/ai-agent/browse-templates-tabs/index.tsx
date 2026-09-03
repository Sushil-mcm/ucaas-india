import { Button } from '@/components/ui/button';
import { Icon } from '@/assets/icons/icon';
import { HandCoins, Home, ReceiptText, ShieldUser, Stethoscope } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAIAgentType } from '@/services/api';
import { useMemo } from 'react';

const ICON_MAP: Record<string, any> = {
  'customer-support-chat': <ReceiptText />,
  'healthcare-chat': <Stethoscope />,
  'real-estate-chat': <Home />,
  'legal-services-chat': <ShieldUser />,
  'finance-banking-chat': <HandCoins />,
  'retail-e-commerce-chat': <ReceiptText />,
  voice: <ReceiptText />,
};

const SMALL_ICON_MAP: Record<string, any> = {
  'customer-support-chat': <ReceiptText className="w-4 h-4" />,
  'healthcare-chat': <Stethoscope className="w-4 h-4" />,
  'real-estate-chat': <Home className="w-4 h-4" />,
  'legal-services-chat': <ShieldUser className="w-4 h-4" />,
  'finance-banking-chat': <HandCoins className="w-4 h-4" />,
  'retail-e-commerce-chat': <ReceiptText className="w-4 h-4" />,
  voice: <ReceiptText className="w-4 h-4" />,
};

function BrowseTemplates() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fromTab } = location?.state || {};

  const { data: agentTypeData } = useQuery({
    queryKey: ['getAIAgentType'],
    queryFn: () => getAIAgentType({ type: 'chat' }),
  });

  const dynamicAgents = useMemo(() => {
    const rawApiData = agentTypeData?.data || [];
    if (rawApiData.length === 0) return [];

    return rawApiData.map((item: any) => ({
      title: item?.label,
      category: item?.label,
      agentType: item?.value,
      firstMessage: item?.welcome_greeting || 'Welcome to UCAAS',
      additionalPrompt:
        'If the user asks to connect with agent or support executive than respond with this exact text "Connecting to Agent"',
      icon: ICON_MAP[item?.value] || <ReceiptText />,
      smallIcon: SMALL_ICON_MAP[item?.value] || <ReceiptText className="w-4 h-4" />,
      systemPrompt: item?.systemPrompt || '',
      description: item?.systemPrompt,
    }));
  }, [agentTypeData]);

  return (
    <section className="w-full flex flex-col  gap-3">
      <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-b border-[rgba(225,200,165,0.9)] min-h-[65px] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
        <div className="text-[#2E2D35] font-semibold text-lg flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('/admin-settings/knowledge/ai-agent')}
              className="text-slate-500 transition-colors hover:text-primary"
            >
              AI Agents
            </button>
            <div className="-rotate-90 text-[#2E2D35]">
              <Icon name="ChevronIcon" className="w-5 h-5" />
            </div>
            <span className="text-primary text-md">AI Chatbot Agents</span>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
      <div className="w-full h-full  p-3 pt-0 flex flex-col  gap-3">
        <div className="w-full h-full  p-3 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-xl flex flex-col  gap-3 border border-[rgba(225,200,165,0.9)]">
          <div className="w-full h-[calc(100vh-14.5rem)] overflow-y-auto pr-1">
            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dynamicAgents?.map((item: any, index: number) => (
                <AgentCard
                  key={index}
                  {...item}
                  onClick={() =>
                    navigate('/admin-settings/knowledge/create-agent', {
                      state: {
                        fromTab,
                        agentData: {
                          agentType: item?.agentType,
                          firstMessage: item?.firstMessage,
                          agentName: item?.title,
                          initialTemplateName: item?.title,
                          initialTopicId: item?.agentType || '',
                          systemPrompt: item?.systemPrompt || '',
                        },
                      },
                    })
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BrowseTemplates;

function AgentCard({ title, description, onClick, icon }: any) {
  return (
    <div
      className="flex flex-col gap-5 border border-[#EEE7DD] rounded-xl p-3 cursor-pointer hover:shadow-sm transition-all"
      onClick={onClick}
    >
      <div className="flex gap-3">
        <div className="w-12 min-w-12 h-12 bg-[#FBE2C8]/45 text-[#9A948F] border border-[#EEE7DD] rounded-md flex items-center justify-center p-2">
          {icon}
        </div>

        <div className="w-full flex flex-col gap-2">
          <h3 className="text-[#2E2D35] text-sm font-semibold">{title || ''}</h3>

          {/* <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-md bg-ucass-primary-200 text-primary text-sm font-medium inline-flex items-center gap-1">
              {smallIcon}
              <span className="capitalize text-xs">{category}</span>
            </span>
          </div> */}
        </div>
      </div>
      <h6 className="text-[#9A948F] text-sm line-clamp-4 leading-6">{description || ''}</h6>
    </div>
  );
}

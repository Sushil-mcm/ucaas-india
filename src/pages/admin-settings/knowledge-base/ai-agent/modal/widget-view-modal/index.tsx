import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAgentList } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import Loader from '@/components/custom/loader';
import { getAi360WidgetKey, getChatWidgetScriptSrc } from '../../chat-agent-configure-modal';

interface IWidgetViewModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  //   data?: string | null;
  data?: any;
}

function WidgetViewModal({ modalState, setModalState, data }: IWidgetViewModalProps) {
  const [copied, setCopied] = useState(false);
  const [agent, setAgent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'talk'>('chat');
  const { agentId = '' } = data || {};
  // const baseURL = window.location.origin;
  console.log(setActiveTab, 'setActiveTab');

  const { data: agentList = [], isLoading: isAgentLoading } = useQuery({
    queryFn: getAgentList,
    queryKey: ['getAgentList', agentId],
    select: (data) => data?.data?.data?.result?.rows || [],
    enabled: modalState && Boolean(agentId),
  });

  const isLoading = isAgentLoading;

  useEffect(() => {
    if (agentList && agentList?.length > 0 && !isAgentLoading) {
      const response = agentList?.find(
        (val: any) =>
          val?.agentId === agentId ||
          val?.agent_uuid === agentId ||
          val?.id === agentId ||
          val?._id === agentId,
      );
      setAgent(response);
    }
  }, [agentList, isAgentLoading, agentId]);

  const scriptAgent = agent || data || {};
  const widgetKey = getAi360WidgetKey(scriptAgent);
  const widgetMode = activeTab === 'talk' ? 'call' : 'chat';
  const widgetScriptSrc = getChatWidgetScriptSrc();
  const sampleCode = `<script 
    src="${widgetScriptSrc}"
    data-widget-mode="${widgetMode}"
    data-widget-key="${widgetKey}"
    data-position="bottom-right"
    data-label="Need Help?"
    async 
    type="text/javascript">
  </script>`;

  const codeToShow = sampleCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeToShow);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      handleAlert({ text: 'Copied successfully!', type: 'success' });
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-1/3 p-4 max-h-[95vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg min-h-[300px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader variant="custom" />
            <p className="text-sm text-gray-400 animate-pulse">Loading agent configuration...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-semibold text-gray-800">Code Preview</h3>

              <div className="flex justify-between items-end">
                <div className="flex gap-1 p-1 bg-gray-100 rounded-md w-fit">
                  {/* <button
                    onClick={() => setActiveTab('chat')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-all ${activeTab === 'chat'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('talk')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-all ${activeTab === 'talk'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Talk
                  </button> */}
                </div>

                <Button
                  onClick={handleCopy}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-black hover:bg-gray-100 cursor-pointer h-9"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-gray-300 overflow-hidden">
              <pre className="bg-[#1e1e1e] text-sm text-gray-100 p-4 overflow-x-auto font-mono">
                <code className="whitespace-pre-wrap">{codeToShow}</code>
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default WidgetViewModal;

import { SearchLine } from '@/assets/icons';
import { Icon, IconName } from '@/assets/icons/icon';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { capitalizeFirstLetter, convertDateFormateApis, handleAlert } from '@/lib/utils';
import { deleteAIAgent, getChatAgentList, getAIAgentToken, updateAIAgent } from '@/services/api';
import { useNavigate } from 'react-router-dom';
// import VoicePlayerCell from './Voice-player-cell';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompanyFeatures } from '@/hooks/rbac';
import { Check, Copy } from 'lucide-react';
import PromptModal from '../ai-receptionist/update-prompt';
import {
  buildChatAgentEmbedScript,
  getAi360WidgetKey,
  getChatWidgetScriptSrc,
} from './chat-agent-configure-modal';

const EMBED_SCRIPT_ID = 'ai-agent-test-embed-script';

const unloadEmbedScript = () => {
  // Remove injected script tag
  const existing = document.getElementById(EMBED_SCRIPT_ID);
  if (existing) existing.remove();

  // Remove the iframe embed.js injects — id is 'agent-chat-widget' or 'agent-talk-widget'
  ['agent-chat-widget', 'agent-talk-widget'].forEach((id) => {
    const iframe = document.getElementById(id);
    if (iframe) iframe.remove();
  });

  // Legacy / fallback sweep for any other widget containers
  const widgetRoot = document.getElementById('ai-chat-widget-root');
  if (widgetRoot) widgetRoot.remove();
  document
    .querySelectorAll(
      '[data-ai-widget], [id^="ai-widget"], [id^="mcm-widget"], [id^="ai360-widget-"]',
    )
    .forEach((el) => el.remove());
};

function AiAgent() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedRowData, setSelectedRowData] = useState(null);
  console.log(selectedRowData, 'selectedRowData');

  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [isUpdatingPrompt, setIsUpdatingPrompt] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // const [modalState, setModalState] = useState({
  //   widget: false,
  //   addDomain: false,
  //   test: false,
  // });

  const [deleteAgent, setDeleteAgent] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewScript, setPreviewScript] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isScriptCopied, setIsScriptCopied] = useState(false);
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const agentAccess = features?.plan_features?.ai?.action?.agent;
  const { mutateAsync: mutateGetToken } = useMutation({
    mutationFn: getAIAgentToken,
    mutationKey: ['getAIAgentToken'],
  });

  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const embedLoadingRef = useRef(false);

  // Fetch agent list for widget colors when an embed is active
  // const { data: agentList } = useQuery({
  //   queryFn: getAgentList,
  //   queryKey: ['getAgentList'],
  //   select: (data: any) => {
  //     return data?.data?.data?.result?.rows || [];
  //   },
  // });

  // Cleanup embed script on unmount
  useEffect(() => {
    return () => {
      unloadEmbedScript();
    };
  }, []);

  const handleTestChatClick = async (rowData: any) => {

    // if (rowData?.domain !== window.location.hostname) {
    //   handleAlert({
    //     text: 'You cannot test the chat widget on a different domain',
    //     type: 'warning',
    //   });
    //   return;
    // }

    const rowId = rowData?.agent_uuid || rowData?.id;

    // Toggle off: same row clicked again
    if (activeEmbedId === rowId) {
      unloadEmbedScript();
      setActiveEmbedId(null);
      setSelectedRowData(null);
      return;
    }

    // Remove any previously loaded script first
    unloadEmbedScript();
    setActiveEmbedId(null);

    if (embedLoadingRef.current) return;
    embedLoadingRef.current = true;

    try {
      const widgetKey = getAi360WidgetKey(rowData);
      const widgetScriptSrc = getChatWidgetScriptSrc();

      if (!widgetKey) {
        handleAlert({ text: 'Widget key is missing for this agent.', type: 'error' });
        return;
      }

      if (!widgetScriptSrc) {
        handleAlert({ text: 'Widget URL is missing.', type: 'error' });
        return;
      }

      // Find agent widget colors from agentList
      // const agent = agentList?.find((a: any) => a?.agentId === agentId || a?._id === agentId);
      console.log(rowData, 'llllllOOOOO');

      const script = document.createElement('script');
      script.id = EMBED_SCRIPT_ID;
      script.src = widgetScriptSrc;
      script.setAttribute('data-widget-mode', 'chat');
      script.setAttribute('data-widget-key', widgetKey);
      script.setAttribute('data-position', 'bottom-right');
      script.setAttribute('data-label', 'Need Help?');
      script.async = true;
      script.type = 'text/javascript';
      script.onload = () => {
        setTimeout(() => {
          const widgetId = `ai360-widget-chat-${widgetKey.replace(/[^a-zA-Z0-9_-]/g, '')}`;
          document.getElementById(widgetId)?.querySelector('button')?.click();
        }, 0);
      };
      console.log(script, 'scriptscript', rowData, 'PPPPPPPPProwData');

      document.body.appendChild(script);

      setSelectedRowData(rowData);
      setActiveEmbedId(rowId);
    } catch (err) {
      console.error('Failed to load embed script:', err);
      handleAlert({ text: 'Failed to load chat widget. Please try again.', type: 'error' });
      unloadEmbedScript();
    } finally {
      embedLoadingRef.current = false;
    }
  };

  const buildEmbedScriptPreview = useCallback((rowData: any) => {
    return buildChatAgentEmbedScript({ agent: rowData });
  }, []);

  const handlePreviewScriptClick = useCallback(
    async (rowData: any) => {
      setIsPreviewLoading(true);
      setIsScriptCopied(false);
      setPreviewScript('');
      setIsPreviewModalOpen(true);
      try {
        const script = buildEmbedScriptPreview(rowData);
        setPreviewScript(script);
      } catch (err) {
        console.error('Failed to generate preview script:', err);
        handleAlert({
          text: 'Failed to generate script preview. Please try again.',
          type: 'error',
        });
        setPreviewScript('');
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [buildEmbedScriptPreview],
  );

  const handleCopyPreviewScript = useCallback(async () => {
    if (!previewScript) return;
    try {
      await navigator.clipboard.writeText(previewScript);
      setIsScriptCopied(true);
      setTimeout(() => setIsScriptCopied(false), 1600);
      handleAlert({ text: 'Script copied successfully!', type: 'success' });
    } catch (err) {
      console.error('Failed to copy script:', err);
      handleAlert({ text: 'Failed to copy script.', type: 'error' });
    }
  }, [previewScript]);

  const { mutate: mutateDeleteAgent, isPending: isDeletePending } = useMutation({
    mutationKey: ['deleteAIAgent'],
    mutationFn: deleteAIAgent,
    onSuccess: () => {
      setDeleteAgent(null);
      queryClient.invalidateQueries(['getChatAgentList'], { exact: true });
      handleAlert({
        text: 'Agent deleted successfully!',
        type: 'success',
      });
    },
  });
  const { mutate: submitAgent } = useMutation({
    mutationFn: updateAIAgent,
    onSuccess: () => {
      queryClient.invalidateQueries(['getChatAgentList']);
      handleAlert({
        text: `AI Agent updated successfully!`,
        type: 'success',
      });
    },
    onError: (err: any) => {
      console.error(`Failed to update AI Agent:`, err);
    },
  });

  const handleUpdatePrompt = useCallback(
    async (rowOriginal: any, newPrompt: string, onDone: () => void) => {
      setIsUpdatingPrompt(true);
      let token = '';
      try {
        const tokenRes = await mutateGetToken();
        token = tokenRes?.data?.data?.result?.tokenId || '';
      } catch (error) {
        console.error('Failed to fetch token:', error);
      }

      const payload = {
        ...rowOriginal,
        agentId: rowOriginal.agent_uuid || rowOriginal.id,
        token,
        systemPrompt: newPrompt,
      };

      const {
        agent_uuid,
        uuid,
        did_uuid,
        company_uuid,
        created_at,
        useMessageExactly,
        ...updatedData
      } = payload;
      console.log(agent_uuid, uuid, did_uuid, company_uuid, created_at, useMessageExactly);

      submitAgent(updatedData, {
        onSuccess: () => {
          onDone();
          setIsUpdatingPrompt(false);
        },
        onError: () => {
          onDone();
          setIsUpdatingPrompt(false);
        },
      });
    },
    [mutateGetToken, submitAgent],
  );

  const columns = [
    {
      header: 'Agent',
      accessorKey: 'agentName',
      cell: ({ row }: any) => {
        const value = row?.original?.agentName || '---';
        return (
          <span
            className="truncate block max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap"
            title={value}
          >
            {value}
          </span>
        );
      },
    },
    // {
    //   header: 'Type',
    //   accessorKey: 'agentType',
    //   cell: ({ row }: any) => {
    //     const type = row?.original?.agentType;
    //     if (type === 'data') return 'Voice';
    //     return capitalizeFirstLetter(type);
    //   },
    // },
    // {
    //   header: 'Voice',
    //   accessorKey: 'agentVoice',
    //   cell: ({ row }: any) =>
    //     row?.original?.agentType === 'data' ? (
    //       <VoicePlayerCell value={row?.original?.agentVoice} />
    //     ) : (
    //       '---'
    //     ),
    // },
    {
      header: 'First Message',
      accessorKey: 'firstMessage',
      cell: ({ row }: any) => {
        const value = row?.original?.firstMessage;
        return (
          <div title={value} className="max-w-[200px] truncate">
            {value || '---'}
          </div>
        );
      },
    },
    {
      header: 'Details To Collect',
      accessorKey: 'forward_call_actions.data_agent.details_to_collect',
      cell: ({ row }: any) => {
        const value = row?.original?.forward_call_actions?.data_agent?.details_to_collect;
        if (!value || (Array.isArray(value) && value?.length === 0)) {
          return '---';
        }
        const formatted =
          typeof value === 'string'
            ? value.split(',').map(capitalizeFirstLetter).join(', ')
            : Array.isArray(value)
              ? value.map(capitalizeFirstLetter).join(', ')
              : '---';
        return formatted;
      },
    },
    {
      header: 'Last Updated',
      accessorKey: 'updatedAt',
      cell: ({ row }: any) => {
        const date = row?.original?.updatedAt || row?.original?.updated_at;
        return date ? (
          <span className="text-xs xxl:text-sm font-medium text-gray-600">
            {convertDateFormateApis(date, 'DD/MM/YYYY hh:mm A')}
          </span>
        ) : (
          <div className="text-center font-medium text-gray-600">---</div>
        );
      },
    },
    {
      header: 'Actions',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        const data = row?.original;
        const isDeleted = row?.original?.deletedAt || row?.original?.deleted_at;
        const actions = isDeleted
          ? []
          : [
              {
                icon: 'AIChatIcon',
                onClick: () => handleTestChatClick(data),
                className:
                  activeEmbedId === (data?.agent_uuid || data?.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-green-100 text-green-900/80 hover:bg-green-500 hover:text-white',
                tooltipText:
                  activeEmbedId === (data?.agent_uuid || data?.id) ? 'Close Chat' : 'wwTest Chat',
              },
              agentAccess?.edit && {
                icon: 'Chat',
                onClick: () => {
                  setEditData(data);
                  setPromptModalOpen(true);
                },
                className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
                tooltipText: 'Edit Prompt',
              },
              agentAccess?.edit && {
                icon: 'EditStrokIcon',
                onClick: () => {
                  navigate('/admin-settings/knowledge/create-agent', {
                    state: { rowData: { isEdit: true, formData: data } },
                  });
                },
                className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
                tooltipText: 'Edit',
              },
              agentAccess?.delete && {
                icon: 'TrashBin',
                onClick: () => setDeleteAgent(data),
                className: 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white',
                tooltipText: 'Delete',
              },
            ]?.filter(Boolean);

        return isDeleted ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-[12px] font-normal text-ucass-red select-none">
            Marked Deleted
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <CustomTooltip text="Preview Script" side="top">
              <div
                style={{ display: 'none' }}
                className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-ucass-active-bg text-ucass-active hover:bg-ucass-active hover:text-white"
                onClick={() => handlePreviewScriptClick(data)}
              >
                <Icon name="EyeLine" className="w-5 h-5" />
              </div>
            </CustomTooltip>
            {actions?.map((action, index) => (
              <CustomTooltip text={action.tooltipText} side="top">
                <div
                  key={index}
                  className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8 ${action.className}`}
                  onClick={() => {
                    action.onClick();
                  }}
                >
                  <Icon name={action.icon as IconName} className="w-5 h-5" />
                </div>
              </CustomTooltip>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <div>
            <div className="text-gray-900 font-semibold text-lg flex items-center gap-1">
              AI Tools
              <div className="-rotate-90 text-gray-800">
                <Icon name="ChevronIcon" className="w-5 h-5" />
              </div>
              <span className="text-primary text-md">Chat Agents</span>
            </div>
            <div className="flex gap-2 filters">
              <Input
                placeholder="Search"
                className="pl-10 w-full min-h-9 rounded-lg"
                IconPosition="left-0 pl-2 inset-y-0"
                value={search}
                maxLength={50}
                onChange={(e) => setSearch(e?.target?.value)}
                Icon={<SearchLine className=" text-gray-700" />}
              />
              {agentAccess?.add && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin-settings/knowledge/create-agent')}
                  className="min-h-9"
                >
                  <Icon name="Plus" className="w-3 h-3" /> Create Agent
                </Button>
              )}
            </div>
          </div>
          <p className="text-gray-500 text-xs">
            AI agents that answer chats on your behalf, and the knowledge they answer from.
          </p>
        </div>
        <div className="w-full h-full p-3 flex flex-col gap-2">
          <TableManager
            {...{
              emptyTablePlaceholder: 'No agents yet',
              descriptionEmptyTable:
                'An agent answers using what you have taught it. Make one to get started.',
              fetcherKey: 'getChatAgentList',
              fetcherFn: getChatAgentList,
              columns,
              search,
              clientSideSearch: true,
            }}
          />
        </div>
      </section>
      {!!deleteAgent && (
        <AlertConfirm
          {...{
            apiLoading: isDeletePending,
            onConfirm: async () => {
              mutateDeleteAgent({ agentId: deleteAgent?.agent_uuid || deleteAgent?.id });
            },
            open: !!deleteAgent,
            setOpen: () => setDeleteAgent(null),
          }}
        />
      )}

      <PromptModal
        open={promptModalOpen}
        setOpen={setPromptModalOpen}
        data={editData}
        onUpdate={handleUpdatePrompt}
        isUpdating={isUpdatingPrompt}
      />

      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="w-[92vw] max-w-2xl p-4">
          <DialogHeader>
            <DialogTitle>Embed Script Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-8"
                onClick={handleCopyPreviewScript}
                disabled={!previewScript || isPreviewLoading}
              >
                {isScriptCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </>
                )}
              </Button>
            </div>
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <pre className="bg-[#111827] text-gray-100 p-4 text-xs sm:text-sm overflow-x-auto max-h-[60vh]">
                <code className="whitespace-pre-wrap">
                  {isPreviewLoading
                    ? 'Generating script preview...'
                    : previewScript || 'No script available.'}
                </code>
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AiAgent;

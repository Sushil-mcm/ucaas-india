import { SearchLine } from '@/assets/icons';
import { Icon, IconName } from '@/assets/icons/icon';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import { deleteAIDomain, getAgentList, getAIDomainList } from '@/services/api';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import WidgetViewModal from '../ai-agent/modal/widget-view-modal';
import AddDomainModal from './modals/add-domain-modal';
import TestTalkModal from './modals/test-talk-modal';
import { useCompanyFeatures } from '@/hooks/rbac';
import { getAi360WidgetKey, getChatWidgetScriptSrc } from '../ai-agent/chat-agent-configure-modal';

const EMBED_SCRIPT_ID = 'ai-domain-test-embed-script';

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

function AIDomain() {
  const navigate = useNavigate();
  const [deleteDomain, setDeleteDomain] = useState<any>(null);
  const [selectedRowData, setSelectedRowData] = useState<any>(null);
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const domainAccess = features?.plan_features?.ai?.action?.domain;
  const [search, setSearch] = useState('');

  // Track which row currently has the embed script loaded (by _id)
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const embedLoadingRef = useRef(false);

  const [modalState, setModalState] = useState({
    widget: false,
    addDomain: false,
    testTalk: false,
  });

  // Fetch agent list for widget colors when an embed is active
  const activeEmbedAgentId = selectedRowData?.agentId || '';
  const { data: agentList } = useQuery({
    queryFn: getAgentList,
    queryKey: ['getAgentList', activeEmbedAgentId],
    select: (data: any) => {
      return data?.data?.data?.result?.rows || [];
    },
    // enabled: Boolean(activeEmbedAgentId),
  });

  // Cleanup embed script on unmount
  useEffect(() => {
    return () => {
      unloadEmbedScript();
    };
  }, []);

  const handleTestChatClick = async (rowData: any) => {
    console.log(rowData?.domain, 'rowData???', window.location.origin);

    if (rowData?.domain !== window.location.hostname) {
      handleAlert({
        text: 'You cannot test the chat widget on a different domain',
        type: 'warning',
      });
      return;
    }
    const rowId = rowData?._id;

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
      const agentId = rowData?.agentId || '';

      // Find agent widget colors from agentList (may be stale, fallback to empty)
      const agent = agentList?.find(
        (a: any) => a?._id === agentId || a?.agent_uuid === agentId || a?.id === agentId,
      );
      console.log(agent, 'rowData3', agentId, 'agentList', agentList);
      const widgetKey = getAi360WidgetKey(agent || rowData);
      const widgetScriptSrc = getChatWidgetScriptSrc();

      if (!widgetKey) {
        handleAlert({ text: 'Widget key is missing for this agent.', type: 'error' });
        return;
      }

      if (!widgetScriptSrc) {
        handleAlert({ text: 'Widget URL is missing.', type: 'error' });
        return;
      }

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

      console.log(script, 'rowData4');

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

  console.log(handleTestChatClick);

  const { mutate: mutateDeleteDomain, isPending: isDeletePending } = useMutation({
    mutationKey: ['deleteAIDomain'],
    mutationFn: deleteAIDomain,
    onSuccess: ({ data }: any) => {
      setDeleteDomain(null);
      queryClient.invalidateQueries(['getAgentList'], { exact: true });
      handleAlert({
        text: data?.data?.message || 'Domain deleted successfully!',
        type: 'success',
      });
    },
  });

  const columns = [
    // {
    //   header: 'Agent',
    //   accessorKey: 'agentName',
    // },

    {
      header: 'Agent Name',
      accessorKey: 'agentName',
      cell: ({ row }: any) => {
        return (
          <span className="flex items-center gap-2 max-w-full overflow-hidden">
            <span
              className="font-medium text-gray-900 truncate max-w-[170px] inline-block"
              title={row?.original?.agentName || 'Unknown'}
            >
              {row?.original?.agentName || 'Unknown'}
            </span>
          </span>
        );
      },
    },

    // {
    //   header: 'Status',
    //   accessorKey: 'status',
    // },
    {
      header: 'Domain',
      accessorKey: 'domain',
      cell: ({ row }: any) => {
        const isDeleted = row?.original?.deletedAt || row?.original?.deleted_at;
        return (
          <span className="flex items-center gap-2 max-w-full overflow-hidden">
            <span
              className="font-medium text-gray-900 truncate max-w-[190px] inline-block"
              title={row?.original?.domain || 'Unknown'}
            >
              {row?.original?.domain || 'Unknown'}
            </span>
            {isDeleted ? (
              <span className="inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ucass-red/10 text-ucass-red border border-ucass-red/20 select-none">
                Deleted
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        const data = row?.original;
        const isDeleted = row?.original?.deletedAt || row?.original?.deleted_at;
        const actions = [
          // {
          //   icon: 'AIChatIcon',
          //   onClick: () => handleTestChatClick(data),
          //   className:
          //     activeEmbedId === data?._id
          //       ? 'bg-green-500 text-white'
          //       : 'bg-green-100 text-green-900/80 hover:bg-green-500 hover:text-white',
          //   tooltipText: activeEmbedId === data?._id ? 'Close Chat' : 'Test Chat',
          // },
          // {
          //   icon: 'AIChatIcon',
          //   onClick: () => {
          //     setSelectedRowData(data);
          //     setModalState((prev) => ({ ...prev, test: true }));
          //   },
          //   className: 'bg-green-100 text-green-900/80 hover:bg-green-500 hover:text-white',
          //   tooltipText: 'Test',
          // },

          // {
          //   icon: 'PhoneCalling',
          //   onClick: () => {
          //     setSelectedRowData(data);
          //     setModalState((prev) => ({ ...prev, testTalk: true }));
          //   },
          //   className: 'bg-ucass-active-bg text-ucass-active/80 hover:bg-ucass-active hover:text-white',
          //   tooltipText: 'Test Talk',
          // },
          {
            icon: 'SquareCode',
            onClick: () => {
              setSelectedRowData(data);
              setModalState((prev) => ({ ...prev, widget: true }));
            },
            className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
            tooltipText: 'Widget',
          },
          domainAccess?.delete &&
            !isDeleted && {
              icon: 'TrashBin',
              onClick: () => setDeleteDomain(data),
              className: 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white',
              tooltipText: 'Delete',
            },
        ]?.filter(Boolean);

        return (
          <div className="flex items-center justify-start  gap-2 w-full max-w-21">
            {actions?.map((action, index) => (
              <CustomTooltip key={index} text={action.tooltipText} side="top">
                <div
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
            <span className="text-primary text-md">Domain</span>
          </div>
          <div className="flex gap-2 filters">
            <Input
              placeholder="Search"
              className="pl-10 w-full min-h-9 rounded-lg"
              IconPosition="left-0 pl-2 inset-y-0"
              value={search}
              onChange={(e) => setSearch(e?.target?.value)}
              Icon={<SearchLine className=" text-gray-700" />}
            />
            {domainAccess?.add && (
              <Button
                type="button"
                variant="outline"
                className="min-h-9"
                onClick={() => setModalState((prev) => ({ ...prev, addDomain: true }))}
              >
                <Icon name="Plus" className="w-3 h-3" /> Add Domain
              </Button>
            )}
          </div>
        </div>
        <div className="w-full h-full  p-3 flex flex-col  gap-2 max-h-[calc(100vh-130px)]">
          <TableManager
            {...{
              showPagination: false,
              columns,
              fetcherKey: 'getAIDomainList',
              fetcherFn: getAIDomainList,
              select: (data: any) => data?.data?.data?.result?.integrations,
              search,
              clientSideSearch: true,
            }}
          />
        </div>
      </section>
      {modalState?.widget && (
        <WidgetViewModal
          modalState={modalState?.widget}
          setModalState={(value) => {
            setModalState((prev) => ({ ...prev, widget: value }));
            setSelectedRowData(null);
          }}
          data={selectedRowData}
        />
      )}
      {modalState?.addDomain && (
        <AddDomainModal
          modalState={modalState?.addDomain}
          setModalState={(value) => {
            setModalState((prev) => ({ ...prev, addDomain: value }));
          }}
        />
      )}

      {modalState?.testTalk && (
        <TestTalkModal
          modalState={modalState?.testTalk}
          setModalState={(value) => {
            setModalState((prev) => ({ ...prev, testTalk: value }));
            if (!value) {
              setSelectedRowData(null);
            }
          }}
          data={selectedRowData}
        />
      )}
      {!!deleteDomain && (
        <AlertConfirm
          {...{
            apiLoading: isDeletePending,
            onConfirm: async () => {
              mutateDeleteDomain({ domainId: deleteDomain?._id });
            },
            open: !!deleteDomain,
            setOpen: () => setDeleteDomain(null),
          }}
        />
      )}
    </>
  );
}

export default AIDomain;

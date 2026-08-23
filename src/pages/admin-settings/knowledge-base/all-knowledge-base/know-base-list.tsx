import { Icon, IconName } from '@/assets/icons/icon';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomTooltip from '@/components/custom/custom-tooltip';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { handleAlert } from '@/lib/utils';
import {
  AIUserKnowledgeBase,
  deleteAIAgentKnowledgeBase,
  // downloadPdf,
  getAIAgentToken,
} from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Link2, Type } from 'lucide-react';
import AttachAgent from './modals/attach-agent';
import AttachedAgentsLists from './modals/attached-agents-list-modal';
import { useCompanyFeatures } from '@/hooks/rbac';
import BlankFileModal from './modals/create-content-modal';
import PasteUrlModal from './modals/paste-url-modal';
import UploadPdfModal from './modals/upload-pdf-modal';
export const iconObj = {
  url: <Link2 className="w-4 h-4 shrink-0" />,
  pdf: <FileText className="w-4 h-4 shrink-0 text-red-600" />,
  text: <Type className="w-4 h-4 shrink-0" />,
};
export const knowledgeBaseInitialColumn = [
  {
    header: 'Name',
    accessorKey: 'name',
  },
  {
    header: 'Created Date',
    accessorKey: 'createdAt',
  },
  {
    header: 'Type',
    accessorKey: 'type',
    cell: ({ row }: any) => {
      const value =
        row?.original?.type ||
        (row?.original?.file == null && row?.original?.text == null && 'URL');
      return <div className="uppercase">{value || '---'}</div>;
    },
  },
  {
    header: 'Data',
    accessorKey: 'text',
    cell: ({ row }: any) => {
      const { urls, files, text, type } = row.original;
      let values: string[] = [];
      if (urls?.length > 0) {
        values = urls;
      } else if (files?.length > 0) {
        values = files;
      } else if (text) {
        values = [text];
      }
      return (
        <div className="max-w-[300px] overflow-hidden">
          {values?.length > 0 ? (
            <div className="flex flex-col gap-1">
              {values?.map((item, index) => (
                <div key={index} className="flex items-center gap-1 min-w-0">
                  {iconObj[type as keyof typeof iconObj]}

                  <span
                    title={item}
                    className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm"
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-gray-400">--</span>
          )}
        </div>
      );
    },
  },
];

function KnowledgeBaseList() {
  const [modalState, setModalState] = useState({
    delete: false,
    attachAgent: false,
    pasteUrl: false,
    attachedAgents: false,
    blankDocument: false,
    uploadPdfFile: false,
  });
  const [selectedRowData, setSelectedRowData] = useState<any>(null);
  const navigate = useNavigate();
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const knowledgeBaseAccess = features?.plan_features?.ai?.action?.knowledge_base;

  const { mutateAsync: mutateGetToken, isPending: isPendingGetToken } = useMutation({
    mutationFn: getAIAgentToken,
    mutationKey: ['getAIAgentToken'],
  });
  // const { mutateAsync: mutateDownload } = useMutation({
  //   mutationFn: downloadPdf,
  //   onSuccess: ({ data }) => {
  //     downloadFileFromURL(data?.url);
  //   },
  // });

  const { mutate: mutateDeleteKnowledgeBase, isPending: isDeletePending } = useMutation({
    mutationKey: ['deleteAIAgentKnowledgeBase'],
    mutationFn: deleteAIAgentKnowledgeBase,
    onSuccess: ({ data }: any) => {
      setModalState((prev) => ({ ...prev, delete: false }));
      setSelectedRowData(null);
      queryClient.invalidateQueries(['AIUserKnowledgeBase'], {
        exact: false,
      });
      handleAlert({
        text: data?.data?.message || 'Knowledge Base deleted successfully!',
        type: 'success',
      });
    },
  });

  const columns = [
    knowledgeBaseInitialColumn?.[0],
    {
      header: 'Agent',
      accessorKey: 'agentName',
      cell: ({ row }: any) => {
        const data = row?.original;
        return (
          <div
            className="text-ucass-active cursor-pointer "
            onClick={() => {
              setModalState((prev) => ({ ...prev, attachedAgents: true }));
              setSelectedRowData(data);
            }}
          >
            Attached Agents
          </div>
        );
      },
    },
    ...knowledgeBaseInitialColumn.slice(1),
    {
      header: 'Actions',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        const data = row?.original;
        // const isGlobal = data?.scope === 'global';
        const actions = [
          // isGlobal
          //   ? {
          //       icon: 'AttachLine',
          //       onClick: () => {
          //         setModalState((prev) => ({ ...prev, attachAgent: true }));
          //         setSelectedRowData(data);
          //       },
          //       className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
          //       tooltipText: 'Attach Agent',
          //     }
          //   : {},
          // {
          //   icon: 'PDFIcon',
          //   onClick: async () => {
          //     if (data?.type !== 'pdf') return;
          //     const response = await mutateGetToken();
          //     const tokenId = response?.data?.data?.result?.tokenId;
          //     mutateDownload({
          //       file: data?.file,
          //       token: tokenId,
          //     });
          //   },
          //   className: `${data?.type === 'pdf' ? 'cursor-pointer bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white' : 'cursor-not-allowed opacity-50 bg-gray-100 text-gray-400'}`,
          //   tooltipText: 'Download',
          // },
          knowledgeBaseAccess?.edit && {
            icon: 'EditStrokIcon',
            onClick: () => {
              if (data?.type === 'text') {
                setModalState((prev) => ({ ...prev, blankDocument: true }));
                setSelectedRowData({ isEdit: true, formData: data });
              } else if (data?.type == 'url') {
                setModalState((prev) => ({ ...prev, pasteUrl: true }));
                setSelectedRowData({ isEdit: true, formData: data });
              } else if (data?.type == 'pdf') {
                setModalState((prev) => ({ ...prev, uploadPdfFile: true }));
                setSelectedRowData({ isEdit: true, formData: data });
              } else {
                return;
              }
            },
            // className: `${data?.type === 'pdf' ? 'cursor-not-allowed opacity-50 bg-gray-100 text-gray-400' : 'cursor-pointer bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white'}`,
            className: `cursor-pointer bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white`,
            tooltipText: 'Edit',
          },
          knowledgeBaseAccess?.delete && {
            icon: 'TrashBin',
            onClick: () => {
              setModalState((prev) => ({ ...prev, delete: true }));
              setSelectedRowData(data);
            },
            className: 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white',
            tooltipText: 'Delete',
          },
        ]?.filter(Boolean);
        return (
          <div className="flex items-center gap-2">
            {actions?.map((action, index) => (
              <CustomTooltip text={action.tooltipText} side="top">
                <div
                  key={index}
                  className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8 ${action.className}`}
                  onClick={() => {
                    if (action?.onClick) action?.onClick();
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
            AI Tools
            <div className="-rotate-90 text-gray-800">
              <Icon name="ChevronIcon" className="w-5 h-5" />
            </div>
            <span className="text-primary text-md">Knowledge Base</span>
          </div>
          {knowledgeBaseAccess?.add && (
            <div className="flex gap-2 filters">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin-settings/knowledge/all-knowledge-base')}
                className="min-h-9"
              >
                <Icon name="Plus" className="w-3 h-3" /> Add Knowledge Base
              </Button>
            </div>
          )}
        </div>
        <div className="w-full h-full p-3 flex flex-col gap-2">
          <TableManager
            columns={columns}
            fetcherKey="AIUserKnowledgeBase"
            fetcherFn={AIUserKnowledgeBase}
          />
        </div>
      </section>
      {modalState?.attachAgent && (
        <AttachAgent
          modalState={modalState?.attachAgent}
          setModalState={(value) => {
            setModalState((prev) => ({ ...prev, attachAgent: value }));
            setSelectedRowData(null);
          }}
          data={selectedRowData}
        />
      )}
      {modalState?.attachedAgents && (
        <AttachedAgentsLists
          modalState={modalState?.attachedAgents}
          setModalState={(value) => {
            setModalState((prev) => ({ ...prev, attachedAgents: value }));
            setSelectedRowData(null);
          }}
          data={selectedRowData}
        />
      )}
      {modalState?.delete && (
        <AlertConfirm
          {...{
            apiLoading: isPendingGetToken || isDeletePending,
            onConfirm: async () => {
              const response = await mutateGetToken();
              const tokenId = response?.data?.data?.result?.tokenId;
              mutateDeleteKnowledgeBase({
                ingestionId: selectedRowData?.ingestionId,
                token: tokenId,
              });
            },
            open: modalState?.delete,
            setOpen: (value) => setModalState((prev) => ({ ...prev, delete: value })),
          }}
        />
      )}
      {modalState.pasteUrl && (
        <PasteUrlModal
          modalState={modalState.pasteUrl}
          rowData={selectedRowData}
          setModalState={(val) => {
            setModalState((prev) => ({
              ...prev,
              pasteUrl: val,
            }));
            setSelectedRowData(null);
          }}
        />
      )}
      {modalState.blankDocument && (
        <BlankFileModal
          rowData={selectedRowData}
          modalState={modalState.blankDocument}
          setModalState={(val) =>
            setModalState((prev) => ({
              ...prev,
              blankDocument: val,
            }))
          }
        />
      )}
      {modalState.uploadPdfFile && (
        <UploadPdfModal
          rowData={selectedRowData}
          modalState={modalState.uploadPdfFile}
          setModalState={(val) =>
            setModalState((prev) => ({
              ...prev,
              uploadPdfFile: val,
            }))
          }
        />
      )}
    </>
  );
}

export default KnowledgeBaseList;

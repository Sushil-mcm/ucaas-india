import { Dialog, DialogContent } from '@/components/ui/dialog';
import TableManager from '@/components/custom/table-manager';
import { CloseIcon } from '@/assets/icons';
import {
  addGlobalKnowledgeBase,
  getAgentList,
  getAIAgentToken,
  getMultipleAttachedAgentsList,
} from '@/services/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { capitalizeFirstLetter, handleAlert } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import Loader from '@/components/custom/loader';

interface AttachedAgentsModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  data: any;
}

function AttachedAgentsLists({ modalState, setModalState, data }: AttachedAgentsModalProps) {
  const [selectedTableRow, setSelectedTableRow] = useState<string[]>([]);
  const tableRef = useRef<any>(null);
  const { data: token } = useQuery({
    queryFn: getAIAgentToken,
    queryKey: ['getAIAgentToken'],
    select: (data) => data?.data?.data?.result?.tokenId || '',
  });

  const { data: getKownledgeBaseIds = {} } = useQuery({
    queryKey: ['getMultipleAttachedAgentsList', data?.ingestionId],
    queryFn: () =>
      getMultipleAttachedAgentsList({
        token: token,
        ingestionId: data?.ingestionId,
      }),
    select: (data) => data?.data || {},
    enabled: Boolean(token),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: addGlobalKnowledgeBase,
    mutationKey: ['addGlobalKnowledgeBase'],
    onSuccess: (data) => {
      setModalState(false);
      handleAlert({
        text: data?.data?.data?.message || 'Knowledge attached successfully.',
        type: 'success',
      });
    },
  });

  const onCheckUncheckRow = (checked: boolean, row: any) => {
    if (checked) {
      setSelectedTableRow((prev: any) => [...prev, row.agentId]);
    } else {
      setSelectedTableRow((prev: any) => prev.filter((id: any) => id !== row.agentId));
    }
  };

  const onSelectAll = (checked: boolean) => {
    const tableData = tableRef?.current?.getTableData();
    if (checked) {
      setSelectedTableRow(tableData?.map((row: any) => row.agentId));
    } else {
      setSelectedTableRow([]);
    }
  };
  const getAttachedAgent = (id: any) => {
    const agent = getKownledgeBaseIds?.agents?.find(({ agentId }: any) => agentId === id);
    return agent?.attachedAt ? agent?.attachedAt : '--';
  };
  const columns = [
    {
      header: () => {
        const tableData = tableRef?.current?.getTableData();
        return (
          <Checkbox
            checked={selectedTableRow?.length === tableData?.length}
            onCheckedChange={(checked: boolean) => onSelectAll(checked)}
          />
        );
      },
      id: 'select',
      accessorKey: 'ingestionId',
      cell: ({ row }: any) => {
        const isChecked = selectedTableRow?.includes(row?.original?.agentId);
        return (
          <div>
            <Checkbox
              checked={isChecked}
              onCheckedChange={(checked: boolean) => onCheckUncheckRow(checked, row?.original)}
            />
          </div>
        );
      },
    },
    {
      header: 'Agent',
      accessorKey: 'agentName',
    },
    {
      header: 'Attached At (UTC)	',
      accessorKey: 'attachedAt',
      cell: ({ row }: any) => {
        const data = row?.original;
        return getAttachedAgent(data?.agentId);
      },
    },
    {
      header: 'Type',
      accessorKey: 'agentType',
      cell: ({ row }: any) => capitalizeFirstLetter(row?.original?.agentType || ''),
    },
  ];

  useEffect(() => {
    if (getKownledgeBaseIds && getKownledgeBaseIds?.agents?.length > 0) {
      const getIds = getKownledgeBaseIds?.agents?.map((item: { agentId: string }) => item?.agentId);
      setSelectedTableRow(getIds);
    }
  }, [getKownledgeBaseIds]);

  const handleClose = () => setModalState(false);
  const handleSubmit = () => {
    const payload = {
      token: token,
      ingestionIds: [data?.ingestionId],
      agentIds: selectedTableRow,
    };
    mutate(payload);
  };
  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-full p-3 max-w-4xl  " showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Attached Agents
            <div
              onClick={handleClose}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <div className="w-full p-3 flex flex-col gap-2 max-h-[calc(100vh-200px)]">
          <TableManager
            {...{
              columns,
              tableRef: tableRef,
              fetcherKey: 'getAgentList',
              fetcherFn: getAgentList,
            }}
          />
        </div>
        <div className="justify-end flex gap-2">
          <Button type="button" variant={'transparent'} onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" variant={'outline'} disabled={isPending} onClick={handleSubmit}>
            {isPending && <Loader variant="blue" />} Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AttachedAgentsLists;

import { Plus, SearchLine } from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
import Loader from '@/components/custom/loader';
import NumberWithFlag from '@/components/custom/number-with-flag';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import { addReceptionistDid, allNumbersList, removeForwarding } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FC, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface AssignReceptionistCallerIdModalProps {
  open: boolean;
  onClose: () => void;
  receptionistData: any;
}

const defaultReceptionistForwardActions = {
  condition: {
    operational_hours: {
      type: '24_hours',
      regional: {},
      value: {},
      holidays: [],
    },
    recording: {
      on_demand: { enabled: true },
      automatic: { enabled: true, label: 'All', value: 'all' },
    },
    display_number: {
      incoming: { label: 'Yes', value: true },
      masking: { type: 'N', value: '', label: 'None' },
      show_number_if_blocked: 'NO',
    },
    caller_id: [],
  },
  call_handling: {
    business_hours: {
      type: 'VOICEMAIL',
      value: '',
      label: 'Voicemail',
    },
  },
  media: {
    welcome: { enabled: false, value: '' },
    hold: { enabled: false, value: '' },
    voicemail: { enabled: false, value: '' },
  },
  transcription: true,
  temperature: 'low',
  detailsToCollect: ['name', 'phone'],
};

const invalidateReceptionistAndNumberQueries = (queryClient: any) => {
  queryClient.invalidateQueries({
    predicate: (query: any) => {
      const key = String(query.queryKey?.[0] || '');
      return (
        key.includes('getAIReceptionistList') ||
        key.includes('numbers-list-modal') ||
        key.includes('allNumbersList') ||
        key.includes('getAllNumbers')
      );
    },
  });
};

const AssignReceptionistCallerIdModal: FC<AssignReceptionistCallerIdModalProps> = ({
  open,
  onClose,
  receptionistData,
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [removingForwardingUuid, setRemovingForwardingUuid] = useState('');
  const [reassignData, setReassignData] = useState<{
    open: boolean;
    didUuid: string;
    didNumber: string;
    assignedTo: string;
  }>({
    open: false,
    didUuid: '',
    didNumber: '',
    assignedTo: '',
  });

  const agentName = receptionistData?.agentName || 'AI Receptionist';
  const assignedDidList = useMemo(
    () =>
      (Array.isArray(receptionistData?.did_uuid) ? receptionistData.did_uuid : []).filter(
        (item: any) => item && typeof item === 'object' && (item?.uuid || item?.did_number),
      ),
    [receptionistData?.did_uuid],
  );
  const assignedDidKeys = useMemo(
    () =>
      new Set(
        assignedDidList
          .flatMap((item: any) => [item?.uuid, item?.did_number])
          .map((value: any) => String(value || '').trim())
          .filter(Boolean),
      ),
    [assignedDidList],
  );

  const { data: allNumbers = [], isLoading: isLoadingNumbers } = useQuery({
    queryKey: ['numbers-list-modal', 'ai-receptionist', 1, 9999999],
    queryFn: () =>
      allNumbersList({
        page: 1,
        limit: 9999999,
      }),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: open,
  });

  const { mutate: assignNumber, isPending: isAssigning } = useMutation({
    mutationFn: addReceptionistDid,
    onSuccess: () => {
      handleAlert({ text: 'Number assigned successfully!', type: 'success' });
      invalidateReceptionistAndNumberQueries(queryClient);
      resetModalState();
      onClose();
    },
    onError: (err: any) => {
      handleAlert({
        text: err?.response?.data?.data?.message || 'Failed to assign number',
        type: 'error',
      });
    },
  });

  const { mutate: mutateRemoveForwarding, isPending: isRemovingForwarding } = useMutation({
    mutationFn: removeForwarding,
    onSuccess: (data: any) => {
      invalidateReceptionistAndNumberQueries(queryClient);
      handleAlert({
        text: data?.data?.data?.message || 'Forwarding removed successfully.',
        type: 'success',
      });
    },
    onSettled: () => setRemovingForwardingUuid(''),
  });

  const filteredNumbers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return allNumbers;

    return allNumbers.filter((item: any) => {
      const assignedName = `${item?.User?.first_name || ''} ${item?.User?.last_name || ''}`
        .trim()
        .toLowerCase();

      return (
        String(item?.did_number || '')
          .toLowerCase()
          .includes(keyword) ||
        String(item?.did_name || '')
          .toLowerCase()
          .includes(keyword) ||
        assignedName.includes(keyword)
      );
    });
  }, [allNumbers, search]);

  function resetModalState() {
    setSearch('');
    setReassignData({
      open: false,
      didUuid: '',
      didNumber: '',
      assignedTo: '',
    });
  }

  const closeModal = () => {
    resetModalState();
    onClose();
  };

  const handleAssignNumber = (didUuid: string, type?: 're-assign') => {
    if (!didUuid) return;

    assignNumber({
      agentId: receptionistData?.agent_uuid || receptionistData?.id,
      did_uuid: didUuid,
      ...(type ? { type } : {}),
      forward_call_actions:
        receptionistData?.forward_call_actions || defaultReceptionistForwardActions,
    });
  };

  const handleRemoveForwarding = (uuid?: string) => {
    if (!uuid) return;
    setRemovingForwardingUuid(uuid);
    mutateRemoveForwarding({ uuid });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) closeModal();
      }}
    >
      <DialogContent className="w-[680px] p-0 gap-0" showCloseButton={false}>
        <div className="p-5 border-b border-gray-200 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Assign Caller ID
            </DialogTitle>
            <p className="text-sm text-gray-500">
              Selecting number for <span className="text-primary font-semibold">{agentName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="text-gray-500 hover:text-gray-900 cursor-pointer"
          >
            <Icon name="XIcon" className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <Input
            placeholder="Search numbers..."
            className="pl-10"
            IconPosition="left-0 pl-3 inset-y-0"
            value={search}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(event) => setSearch(event.target.value.replace(/\D/g, ''))}
            Icon={<SearchLine className="text-gray-500" />}
          />

          <div className="flex flex-col gap-3 max-h-[calc(100vh_-_23rem)] overflow-y-auto pr-1 min-h-[240px]">
            {isLoadingNumbers ? (
              <div className="w-full h-full min-h-[200px] flex items-center justify-center">
                <Loader variant="blue" />
              </div>
            ) : filteredNumbers.length > 0 ? (
              filteredNumbers.map((item: any) => {
                const assignedName =
                  `${item?.User?.first_name || ''}${item?.User?.last_name ? ` ${item.User.last_name}` : ''}`.trim();
                const isAssignedToCurrentAgent =
                  assignedDidKeys.has(String(item?.uuid || '')) ||
                  assignedDidKeys.has(String(item?.did_number || ''));
                const isAssignedToUser = Boolean(item?.user_uuid || assignedName);
                const isForwarded = Boolean(item?.forward_call_actions);
                const isRemovingThisForwarding =
                  isRemovingForwarding && removingForwardingUuid === item?.uuid;
                const isReassignDisabled = isAssigning || isRemovingForwarding || isForwarded;

                return (
                  <div
                    key={item?.uuid || item?.did_number}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col gap-1">
                      <NumberWithFlag number={item?.did_number} />
                      {isAssignedToCurrentAgent ? (
                        <p className="text-xs font-medium flex items-center gap-1 text-gray-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                          Assigned to this Receptionist
                          <span className="text-gray-700">- {agentName}</span>
                        </p>
                      ) : isAssignedToUser ? (
                        <p className="text-xs font-medium flex items-center gap-1 text-gray-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                          Assigned to User
                          {assignedName ? (
                            <span className="text-gray-700">- {assignedName}</span>
                          ) : null}
                        </p>
                      ) : isForwarded ? (
                        <p className="text-primary text-xs font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                          Forwarded
                        </p>
                      ) : (
                        <p className="text-green-600 text-xs font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          {item?.type === 'F' ? 'Free' : 'Paid'}
                        </p>
                      )}
                    </div>

                    {isAssignedToCurrentAgent ? (
                      <Button
                        size="sm"
                        variant="destructiveOutline"
                        className="min-w-[110px]"
                        disabled
                      >
                        <Icon name="DoneIcon" className="w-4 h-4" />
                        Assigned
                      </Button>
                    ) : isAssignedToUser ? (
                      <Button
                        size="sm"
                        variant="destructiveOutline"
                        className="min-w-[110px]"
                        disabled={isReassignDisabled}
                        title={
                          isForwarded
                            ? 'Remove forwarding before re-assigning this caller ID'
                            : undefined
                        }
                        onClick={() => {
                          if (isReassignDisabled) return;
                          setReassignData({
                            open: true,
                            didUuid: item?.uuid || '',
                            didNumber: item?.did_number || '',
                            assignedTo: assignedName || 'another user',
                          });
                        }}
                      >
                        <Icon name="Refresh" className="w-4 h-4" />
                        Re-assign
                      </Button>
                    ) : isForwarded ? (
                      <Button
                        size="sm"
                        variant="destructiveOutline"
                        className="min-w-[150px] shrink-0"
                        disabled={isAssigning || isRemovingForwarding}
                        onClick={() => handleRemoveForwarding(item?.uuid)}
                      >
                        {isRemovingThisForwarding ? (
                          <Loader variant="blue" />
                        ) : (
                          <>
                            <Icon name="CallCancelLine" className="w-4 h-4" />
                            Remove Forwarding
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-w-[110px]"
                        disabled={isAssigning || isRemovingForwarding}
                        onClick={() => handleAssignNumber(item?.uuid)}
                      >
                        <Icon name="AssignNumberLine" className="w-4 h-4" />
                        Assign
                      </Button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full min-h-[200px] flex items-center justify-center text-sm text-gray-500">
                No numbers found.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              closeModal();
              navigate('/admin-settings/numbers/all?openAddNumber=1', {
                state: location.state,
              });
            }}
          >
            <Plus className="w-3 h-3" />
            Add Additional Number
          </Button>
          <Button
            type="button"
            variant="transparent"
            className="text-gray-700"
            onClick={closeModal}
          >
            Done
          </Button>
        </div>
      </DialogContent>

      <Dialog
        open={reassignData.open}
        onOpenChange={(value) =>
          setReassignData((previous) => ({
            ...previous,
            open: value,
          }))
        }
      >
        <DialogContent className="w-[460px] max-w-[calc(100%-2rem)] p-6" showCloseButton={false}>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500">
              <Icon name="AlertIcon" className="w-8 h-8" />
            </div>

            <DialogTitle className="text-[34px] font-semibold leading-none text-gray-900">
              Re-assign Caller ID?
            </DialogTitle>

            <p className="text-gray-500 text-sm leading-6">
              The number{' '}
              <span className="text-gray-800 font-semibold">{reassignData.didNumber}</span> is
              currently assigned to User{' '}
              <span className="text-primary font-semibold">- {reassignData.assignedTo}</span>.{' '}
              Re-assigning it will assign it to{' '}
              <span className="text-green-600 font-semibold">{agentName}</span>. Proceed?
            </p>

            <div className="w-full flex items-center gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 min-w-0"
                onClick={() =>
                  setReassignData({
                    open: false,
                    didUuid: '',
                    didNumber: '',
                    assignedTo: '',
                  })
                }
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1 min-w-0"
                disabled={isAssigning || !reassignData.didUuid}
                onClick={() => {
                  if (!reassignData.didUuid) return;
                  handleAssignNumber(reassignData.didUuid, 're-assign');
                  setReassignData({
                    open: false,
                    didUuid: '',
                    didNumber: '',
                    assignedTo: '',
                  });
                }}
              >
                {isAssigning ? <Loader variant="blue" /> : 'Yes, Re-assign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default AssignReceptionistCallerIdModal;

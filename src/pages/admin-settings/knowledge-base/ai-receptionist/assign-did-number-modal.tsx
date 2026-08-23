import { SearchLine } from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
import NotFound from '@/assets/images/not-found-img.svg';
import Loader from '@/components/custom/loader';
import NumberWithFlag from '@/components/custom/number-with-flag';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { capitalizeFirstLetter, handleAlert } from '@/lib/utils';
import { addReceptionistDid, allNumbersList } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FC, useMemo, useState } from 'react';

interface AssignDIDNumberModalProps {
  open: boolean;
  onClose: () => void;
  userData: any;
  onOpenMultipleAssignModal?: (users: any[]) => void;
}

const AssignDIDNumberModal: FC<AssignDIDNumberModalProps> = ({ open, onClose, userData }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: dataGetAllNumbers = [], isLoading: isLoadingGetAllNumbers } = useQuery({
    queryKey: ['numbers-list-modal', 1, 9999999],
    queryFn: () =>
      allNumbersList({
        page: 1,
        limit: 9999999,
      }),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: open,
  });
  const fullName =
    `${capitalizeFirstLetter(userData?.first_name || '')}${userData?.last_name ? ` ${userData?.last_name}` : ''}`.trim() ||
    'User';

  const filteredNumbers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return dataGetAllNumbers;

    return dataGetAllNumbers?.filter((item: any) => {
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
  }, [dataGetAllNumbers, search]);

  const assignedDidList = useMemo(
    () =>
      (Array.isArray(userData?.did_uuid) ? userData.did_uuid : []).filter(
        (item: any) =>
          item &&
          typeof item === 'object' &&
          Boolean(item?.did_number) &&
          Boolean(item?.uuid || item?.did_number),
      ),
    [userData?.did_uuid],
  );

  const assignedDidUuids = useMemo(
    () =>
      new Set(
        (Array.isArray(userData?.did_uuid) ? userData.did_uuid : [])
          .map((item: any) => (typeof item === 'string' ? item : item?.uuid))
          .filter((id: any) => (typeof id === 'string' ? id.trim().length > 0 : Boolean(id))),
      ),
    [userData?.did_uuid],
  );

  const assignableNumbers = useMemo(
    () =>
      filteredNumbers?.filter(
        (item: any) =>
          !assignedDidUuids.has(item?.uuid) && !item?.user_uuid && !item?.forward_call_actions,
      ) || [],
    [filteredNumbers, assignedDidUuids],
  );

  // const handleAssignNumber = (didNumber: string, type?: 're-assign') => {
  //     if (!didNumber || !targetUserUuid) return;

  //     mutateAssignNumber({
  //         user_uuid: targetUserUuid,
  //         did_number: didNumber,
  //         ...(type ? { type } : {}),
  //     });
  // };
  const { mutate: assignNumber } = useMutation({
    mutationFn: addReceptionistDid,
    onSuccess: () => {
      handleAlert({ text: 'Number assigned successfully!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['getAIReceptionistList'] });
      queryClient.invalidateQueries({ queryKey: ['getAllNumbers'] });
      onClose();
    },
    onError: (err: any) => {
      handleAlert({
        text: err?.response?.data?.data?.message || 'Failed to assign number',
        type: 'error',
      });
    },
  });
  const handleAssignNumber = (val: any) => {
    const payload = {
      agentId: userData?.agent_uuid || userData?.id,
      did_uuid: val,
      forward_call_actions: userData?.forward_call_actions || {
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
      },
    };
    assignNumber(payload);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          setSearch('');
          onClose();
        }
      }}
    >
      <DialogContent className="w-[680px] p-0 gap-0" showCloseButton={false}>
        <div className="p-5 border-b border-gray-200 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h4 className="text-gray-900 font-semibold text-xl">Assign Caller ID</h4>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              onClose();
            }}
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
            onChange={(e) => {
              const numericValue = e.target.value.replace(/\D/g, '');
              setSearch(numericValue);
            }}
            Icon={<SearchLine className="text-gray-500" />}
          />

          <div className="flex flex-col gap-3 max-h-[calc(100vh_-_23rem)] overflow-y-auto pr-1 min-h-[240px]">
            {isLoadingGetAllNumbers ? (
              <div className="w-full h-full min-h-[200px] flex items-center justify-center">
                <Loader variant="blue" />
              </div>
            ) : assignableNumbers?.length > 0 || assignedDidList?.length > 0 ? (
              <>
                {assignedDidList?.map((item: any) => (
                  <div
                    key={item?.uuid || item?.did_number}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col gap-1">
                      <NumberWithFlag number={item?.did_number} />
                      <p className="text-xs font-medium flex items-center gap-1 text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                        Assigned to this Agent
                        <span className="text-gray-700">- {fullName}</span>
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="destructiveOutline"
                      className="min-w-[110px]"
                      disabled={true}
                    >
                      <Icon name="DoneIcon" className="w-4 h-4" />
                      Assigned
                    </Button>
                  </div>
                ))}

                {assignableNumbers?.map((item: any) => {
                  return (
                    <div
                      key={item?.uuid || item?.did_number}
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1">
                        <NumberWithFlag number={item?.did_number} />
                        <p className="text-green-600 text-xs font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Available
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="min-w-[110px]"
                        onClick={() => handleAssignNumber(item?.uuid)}
                      >
                        <Icon name="AssignNumberLine" className="w-4 h-4" />
                        Assign
                      </Button>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-1">
                <img src={NotFound} alt="No Numbers Found" className="min-w-36 max-w-36" />
                <p className="text-md font-medium text-gray-900">No numbers found</p>
                <p className="text-sm text-gray-700">Try adjusting your search criteria.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignDIDNumberModal;

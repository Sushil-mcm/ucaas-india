import { Icon } from '@/assets/icons/icon';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { convertDateFormateApis, handleAlert } from '@/lib/utils';
import { deleteReposition, getDispositions } from '@/services/api';
import { useState } from 'react';
import DispositionModal from './add-edit-dispositions';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompanyFeatures } from '@/hooks/rbac';

const DispositionsList = () => {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<any>(null);
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const dispositionAccess = features?.plan_features?.campaign?.action;
  const [modalState, setModalState] = useState<{ isModalOpen: boolean; selectedCampaign: any }>({
    isModalOpen: false,
    selectedCampaign: null,
  });

  const { mutate: mutateDeleteDisposition, isPending: isPendingDeleteCampaign } = useMutation({
    mutationFn: deleteReposition,
    onSuccess: (data) => {
      if (data?.data?.success) {
        handleAlert({
          text: data?.data?.message || 'Disposition deleted successfully!',
          type: 'success',
        });
        setShowDeleteConfirmation(null);
        queryClient.invalidateQueries(['getDispositionsList']);
      }
    },
  });

  const columns: any = [
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{convertDateFormateApis(data?.createdAt, 'MMM D, YYYY')}</div>;
      },
    },
    {
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{data?.disposition?.name}</div>;
      },
    },

    {
      header: 'Description',
      accessorKey: 'description',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{data?.disposition?.description}</div>;
      },
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        // const companyId = row?.original?.companyId;
        const campaign = row?.original;

        // if (!companyId) return null;

        const hasAccess = campaign?.dispositionType !== 'SYSTEM';

        return (
          <span className="flex gap-2 items-center">
            <span
              className={`flex items-center justify-center rounded-full w-8 h-8 ${
                hasAccess
                  ? 'cursor-pointer bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white'
                  : 'cursor-not-allowed bg-gray-100 text-gray-400 opacity-50'
              }`}
              onClick={() => {
                if (campaign?.dispositionType === 'SYSTEM') return;
                setModalState((prev) => ({
                  ...prev,
                  selectedCampaign: campaign,
                  isModalOpen: true,
                }));
              }}
            >
              <Icon
                name="EditStrokIcon"
                className={`w-5 h-5 ${
                  campaign?.campaignStatus === 'PROCESSING' ? 'text-gray-400' : ''
                }`}
              />
            </span>

            <span
              className={`flex items-center justify-center rounded-full w-8 h-8 ${
                hasAccess
                  ? 'cursor-pointer bg-red-100 text-red-500 hover:bg-red-500 hover:text-white'
                  : 'cursor-not-allowed bg-red-100 text-red-300 opacity-50'
              }`}
              onClick={() => {
                if (campaign?.dispositionType === 'SYSTEM') return;
                setShowDeleteConfirmation(campaign);
              }}
            >
              <Icon name="TrashBin" className="w-5 h-5" />
            </span>
          </span>
        );
      },
    },
  ];
  return (
    <>
      <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden  h-full">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
            Dispositions
          </p>
          {dispositionAccess?.add && (
            <div className="flex gap-2 filters">
              <Button
                variant={'outline'}
                onClick={() => setModalState((prev) => ({ ...prev, isModalOpen: true }))}
                className="min-h-9"
              >
                Add Disposition
              </Button>
            </div>
          )}
        </div>
        <div className="w-full  p-3 flex flex-col gap-2 ">
          <TableManager
            {...{
              columns,
              fetcherKey: 'getDispositionsList',
              fetcherFn: getDispositions,
              emptyTablePlaceholder: 'No disposition logs found',
              descriptionEmptyTable:
                'Disposition details will be available after calls are completed.',
            }}
          />
        </div>
      </section>
      {modalState?.isModalOpen && (
        <DispositionModal
          modalState={modalState?.isModalOpen}
          setModalState={() => setModalState({ isModalOpen: false, selectedCampaign: null })}
          editdata={modalState?.selectedCampaign}
        />
      )}

      {!!showDeleteConfirmation && (
        <AlertConfirm
          {...{
            apiLoading: isPendingDeleteCampaign,
            onConfirm: () => {
              mutateDeleteDisposition({ uuid: showDeleteConfirmation?._id });
            },
            open: !!showDeleteConfirmation,
            setOpen: () => {
              setShowDeleteConfirmation(null);
            },
          }}
        />
      )}
    </>
  );
};

export default DispositionsList;

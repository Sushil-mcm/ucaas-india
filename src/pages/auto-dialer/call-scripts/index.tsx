import { Button } from '@/components/ui/button';
import { convertDateFormateApis, getObjectLength, handleAlert } from '@/lib/utils';
import { useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import TableManager from '@/components/custom/table-manager';
import { deleteCallScript, getCallScript } from '@/services/api';
import SideDrawer from '@/components/custom/side-drawer';
import ScriptForm from './add-edit-script';
import { EyeIcon } from 'lucide-react';
import { dailMethodsArr } from './constants';

import OverviewScript from './overview-script';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AlertConfirm from '@/components/custom/alert-confirm';

const CallScripts = () => {
  const { features } = useCompanyFeatures();
  const scriptAccess = features?.plan_features?.campaign?.action || {};
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<any>(null);
  const queryClient: any = useQueryClient();
  const [drawerState, setDrawerState] = useState<{ isModalOpen: boolean; selectedCampaign: any }>({
    isModalOpen: false,
    selectedCampaign: null,
  });
  const [modalState, setModalState] = useState<{ isModalOpen: boolean; selectedCampaign: any }>({
    isModalOpen: false,
    selectedCampaign: null,
  });

  const { mutate: mutateDeleteScript, isPending: isPendingDeleteScript } = useMutation({
    mutationFn: deleteCallScript,
    onSuccess: (data) => {
      if (data?.data?.success) {
        handleAlert({
          text: data?.data?.message || 'Call script deleted successfully!',
          type: 'success',
        });
        setShowDeleteConfirmation(null);
        queryClient.invalidateQueries(['getCallScript']);
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
    },
    {
      header: 'Type',
      accessorKey: 'dialMethod',
      cell: ({ getValue }: any) => {
        return <div>{dailMethodsArr?.find((i) => i.value === getValue())?.label}</div>;
      },
    },

    {
      header: 'Content',
      accessorKey: 'description',
      cell: ({ row }: any) => {
        return (
          <div
            className="flex items-center gap-1 text-primary cursor-pointer"
            onClick={() => {
              setModalState({ selectedCampaign: row?.original, isModalOpen: true });
            }}
          >
            <EyeIcon className="h-4 w-4" /> Overview
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        const data = row?.original;
        return (
          <span className="flex gap-2 items-center">
            {scriptAccess?.edit && (
              <span
                className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white`}
                onClick={() => {
                  setDrawerState({ selectedCampaign: row?.original, isModalOpen: true });
                }}
              >
                <Icon name="EditStrokIcon" className={`w-5 h-5 `} />
              </span>
            )}
            <span
              className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white`}
              onClick={() => {
                setShowDeleteConfirmation(data?._id);
              }}
            >
              <Icon name="TrashBin" className={`w-5 h-5 `} />
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
          <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">Call Script</p>
          <div className="flex gap-2 filters">
            {scriptAccess?.add && (
              <Button
                variant={'outline'}
                onClick={() => setDrawerState((prev) => ({ ...prev, isModalOpen: true }))}
                className="min-h-9"
              >
                Add Call Script
              </Button>
            )}
          </div>
        </div>
        <div className="w-full  p-3 flex flex-col gap-2 ">
          <TableManager
            {...{
              columns,
              fetcherKey: 'getCallScript',
              fetcherFn: getCallScript,
              emptyTablePlaceholder: 'No call scripts found',
              descriptionEmptyTable: 'Create a call script to guide agents during campaigns',
            }}
          />
        </div>
      </section>

      {drawerState?.isModalOpen && (
        <SideDrawer
          width="min(500px, 96vw)"
          isOpen={drawerState.isModalOpen}
          title={
            getObjectLength(drawerState.selectedCampaign)
              ? `Update Call Script (${drawerState.selectedCampaign?.name || ''})`
              : 'Create Call Script'
          }
          handleClose={() =>
            setDrawerState({
              isModalOpen: false,
              selectedCampaign: null,
            })
          }
          isTab={false}
          content={
            <div className="mx-auto h-full w-full max-w-full ">
              <ScriptForm
                isEdit={getObjectLength(drawerState.selectedCampaign)}
                data={drawerState.selectedCampaign}
                handleClose={() =>
                  setDrawerState({
                    isModalOpen: false,
                    selectedCampaign: null,
                  })
                }
              />
            </div>
          }
        />
      )}

      {modalState?.isModalOpen && (
        <OverviewScript modalState={modalState} setModalState={setModalState} />
      )}
      {!!showDeleteConfirmation && (
        <AlertConfirm
          {...{
            apiLoading: isPendingDeleteScript,
            onConfirm: () => {
              mutateDeleteScript({ uuid: showDeleteConfirmation });
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

export default CallScripts;

import { Icon, IconName } from '@/assets/icons/icon';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomTooltip from '@/components/custom/custom-tooltip';
import TableManager from '@/components/custom/table-manager';
import { getVerificationList } from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const Verification = ({ search }: { search: string }) => {
  const [, setRowData] = useState<any>(null);
  //   const [drawerState, setDrawerState] = useState({
  //     editAddress: false,
  //   });
  const [modalState, setModalState] = useState({
    deleteAddress: false,
  });
  const queryClient: any = useQueryClient();
  const handleModalClose = () => {
    setModalState((prev) => ({ ...prev, deleteAddress: false }));
    setRowData(null);
  };

  const { mutateAsync: mutateDeleteAddress, isPending: isDeleteAddressPending } = useMutation({
    mutationKey: ['deleteAddress'],
    // mutationFn: deleteAddress,
    onSuccess: () => {
      handleModalClose();
      queryClient.invalidateQueries({
        queryKey: ['getAddressesList'],
      });
    },
  });
  const columns = [
    {
      header: 'DID Number',
      accessorKey: 'did_number',
      cell: ({ row }: any) => {
        const { country = '', state = '' } = row?.original?.address || {};
        const name = `${country}/${state}`;
        return name;
      },
    },
    {
      header: 'Country/City',
      accessorKey: 'country',
    },
    {
      header: 'Status',
      accessorKey: 'awaiting_registration',
    },
    {
      header: 'Time Left',
      accessorKey: 'expires_at',
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: (props: any) => {
        const data = props?.row?.original;
        if (data?.is_primary) return;
        const actions = [
          {
            icon: 'View',
            onClick: () => {
              setRowData({ isEdit: true, formData: data });
              //   setDrawerState((prev) => ({ ...prev, editAddress: true }));
            },
            className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
            tooltipText: 'View Verification',
          },
          {
            icon: 'TrashBin',
            onClick: () => {
              setRowData({ isEdit: true, formData: data });
              setModalState((prev) => ({ ...prev, deleteAddress: true }));
            },
            className: 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white',
            tooltipText: 'Delete',
          },
        ];

        return (
          <div className="flex items-center gap-2">
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
    <div>
      <div className="w-ful p-3 flex flex-col gap-2">
        <TableManager
          {...{
            columns,
            search,
            fetcherKey: 'getVerificationList',
            fetcherFn: getVerificationList,
            emptyTablePlaceholder: 'No verifications found',
          }}
        />
      </div>

      {modalState?.deleteAddress && (
        <AlertConfirm
          {...{
            apiLoading: isDeleteAddressPending,
            onConfirm: () => {
              return;
              mutateDeleteAddress();
            },
            open: modalState?.deleteAddress,
            setOpen: () => handleModalClose(),
          }}
        />
      )}
    </div>
  );
};

export default Verification;

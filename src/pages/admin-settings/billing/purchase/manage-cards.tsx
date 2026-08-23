import { Icon, IconName } from '@/assets/icons/icon';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { formatDate, handleAlert } from '@/lib/utils';
import { cardList, deleteCard, setDefaultCard } from '@/services/api';
import AddCardModal from './add-card-modal';
import { useState } from 'react';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { CircleFadingArrowUp, IdCard } from 'lucide-react';

const ManageCards = () => {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [rowData, setRowData] = useState<any>({});
  const [deleteModal, setDeleteModal] = useState(false);
  const [primarModal, setPrimarModal] = useState(false);

  const { mutate: mutateDeleteCard, isPending: isPendingDeleteCard } = useMutation({
    mutationFn: deleteCard,
    onSuccess: ({ data }: any) => {
      setDeleteModal(false);
      handleSuccess(data);
    },
  });

  const { mutate: mutateSetDefaultCard, isPending: isPendingDefaultCard } = useMutation({
    mutationFn: setDefaultCard,
    onSuccess: ({ data }: any) => {
      setPrimarModal(false);
      handleSuccess(data);
    },
  });

  const handleSuccess = (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['useGetSavedCards'] });
    handleAlert({ text: data?.data?.message || 'Success', type: 'success' });
    setRowData({});
  };

  const columns = [
    {
      header: 'Date',
      accessorKey: 'created_at',
      cell: ({ getValue }: any) => formatDate(getValue()),
    },
    {
      header: 'Last 4 Digits',
      accessorKey: 'last4',
      cell: ({ row, getValue }: any) =>
        `${row?.original?.brand.toUpperCase()} **** **** **** ${getValue()}`,
    },
    {
      header: 'Expiry Year',
      accessorKey: 'exp_year',
    },
    {
      header: 'Is Primary',
      accessorKey: 'is_primary',
      cell: ({ getValue }: any) => (getValue() ? 'Yes' : 'No'),
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: (props: any) => {
        const data = props?.row?.original;
        if (data?.is_primary) return;

        const actions = [
          {
            icon: 'AddCardIcon',
            onClick: () => {
              setPrimarModal(true);
              setRowData(data);
            },
            className: 'border-primary text-primary hover:bg-primary hover:text-white',
            tooltipText: 'Set as Primary',
          },
          {
            icon: 'TrashBin',
            onClick: () => {
              setDeleteModal(true);
              setRowData(data);
            },
            className: 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white',
            tooltipText: 'Delete',
          },
        ];

        return (
          <div className="flex items-center gap-2">
            {actions?.map((action, index) => (
              <CustomTooltip text={action.tooltipText} side="top">
                <div
                  key={index}
                  className={`cursor-pointer flex items-center justify-center rounded-xl w-8 h-8 bg-white border ${action.className}`}
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
    <section className="w-full overflow-x-auto overflow-y-hidden">
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-between absolute -top-16 sm:-top-1 right-0">
          <div className="flex justify-end gap-2 w-full ">
            <Button type="button" variant={'outline'} onClick={() => setOpen(true)}>
              <Icon name="AddCardIcon" /> Add card
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:gap-0.5 p-4 rounded-lg bg-white border border-gray-100">
          <p className="text-gray-800 text-sm inline-flex sm:items-center gap-1">
            <IdCard className="w-4" />
            Your primary card will be used for auto purchases.
          </p>
          <p className="text-gray-800 text-sm inline-flex sm:items-center gap-1">
            <CircleFadingArrowUp className="w-4.5" />
            You can update or remove cards anytime.
          </p>
        </div>
        <TableManager {...{ columns, fetcherKey: 'useGetSavedCards', fetcherFn: cardList }} />

        {open && <AddCardModal {...{ open, setOpen }} />}

        <AlertConfirm
          {...{
            apiLoading: isPendingDeleteCard,
            onConfirm: () => {
              mutateDeleteCard({ card_id: rowData?.card_id });
            },
            open: deleteModal,
            setOpen: setDeleteModal,
          }}
        />

        <AlertConfirm
          {...{
            apiLoading: isPendingDefaultCard,
            onConfirm: () => {
              mutateSetDefaultCard({ card_id: rowData?.card_id });
            },
            open: primarModal,
            setOpen: setPrimarModal,
            descriptionTextComp: (
              <div className="text-md">Are you sure, Want to set this card as primary card?</div>
            ),
          }}
        />
      </div>
    </section>
  );
};

export default ManageCards;

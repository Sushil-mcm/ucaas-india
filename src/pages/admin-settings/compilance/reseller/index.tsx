import { Icon, IconName } from '@/assets/icons/icon';
import CustomTooltip from '@/components/custom/custom-tooltip';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import CreateReseller from './create-reseller';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getResellerList, resellerDelete } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import AlertConfirm from '@/components/custom/alert-confirm';

const Reseller = () => {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [rowData, setRowData] = useState<any>({});

  const { mutate: mutateResellerDelete, isPending } = useMutation({
    mutationKey: ['resellerDelete'],
    mutationFn: resellerDelete,
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['getResellerList'] });
      handleAlert({
        text: data?.data?.message,
        type: 'success',
      });
      setOpen(false);
    },
  });

  const columns = [
    {
      header: 'Legal Company Name',
      accessorKey: 'companyName',
    },
    {
      header: 'Reseller ID',
      accessorKey: 'resellerId',
    },
    {
      header: 'Email Address',
      accessorKey: 'email',
    },
    {
      header: 'Phone Number',
      accessorKey: 'phone',
    },

    {
      header: 'Action',
      accessorKey: 'action',
      cell: (props: any) => {
        const data = props?.row?.original;
        const isDefault = data?.is_default === '1';
        const actions = [
          {
            icon: 'TrashBin',
            onClick: () => {
              setOpen(true);
              setRowData(data);
            },
            className: 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white',
            tooltipText: 'Delete',
          },
        ].filter(Boolean);

        if (!actions?.length) return '---';

        return (
          <div className="flex items-center gap-2">
            {actions?.map((action, index) => (
              <CustomTooltip text={action.tooltipText} side="top">
                <div
                  key={index}
                  className={`${isDefault ? 'cursor-not-allowed bg-gray-100 text-gray-900/80' : `cursor-pointer ${action.className}`} flex items-center justify-center rounded-full w-8 h-8   `}
                  onClick={() => {
                    action.onClick();
                  }}
                >
                  <Icon
                    name={action.icon as IconName}
                    className={`w-5 h-5 ${isDefault ? 'text-gray-400' : ''}`}
                  />
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
      <section className="w-full overflow-x-auto overflow-y-hidden">
        <div className="w-full  flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
            <div>
              <p className="text-gray-900 font-semibold text-lg">10DLC Reseller</p>
              <p className="text-gray-500 text-xs">
                Reseller records used when you register brands and campaigns on behalf of your own
                customers.
              </p>
            </div>
            <div className="flex gap-2 filters">
              <Button className="min-h-9" variant={'outline'} onClick={() => setModalOpen(true)}>
                Create 10DLC Reseller
              </Button>
            </div>
          </div>
          <div className="px-3 w-full flex flex-col gap-2">
            <TableManager
              {...{
                fetcherKey: 'getResellerList',
                fetcherFn: getResellerList,
                columns,
                emptyTablePlaceholder: 'No Reseller found',
                descriptionEmptyTable: 'Create 10 DLC Resellers to see data here.',
              }}
            />
          </div>
        </div>
      </section>

      {modalOpen && (
        <CreateReseller
          handleClose={() => setModalOpen(false)}
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
        />
      )}

      <AlertConfirm
        {...{
          apiLoading: isPending,
          onConfirm: () => {
            mutateResellerDelete({
              resellerId: rowData?.resellerId,
            });
          },
          open,
          setOpen,
        }}
      />
    </>
  );
};

export default Reseller;

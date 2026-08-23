import TableManager from '@/components/custom/table-manager';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SearchLine } from '@/assets/icons';
import { Icon, IconName } from '@/assets/icons/icon';
import CustomTooltip from '@/components/custom/custom-tooltip';
import SideDrawer from '@/components/custom/side-drawer';
import Create10DLCBrand from './create-10DLC-brand';
import { brandDelete, getBrandList } from '@/services/api';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { convertDateFormateApis, handleAlert } from '@/lib/utils';

const DLCBrands = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState<string>('');
  const [drawerState, setDrawerState] = useState({
    create10DLCBrand: false,
  });
  const [open, setOpen] = useState(false);
  const [rowData, setRowData] = useState<any>({});

  const { mutate: mutateBrandDelete, isPending } = useMutation({
    mutationKey: ['brandDelete'],
    mutationFn: brandDelete,
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['getBrandList'] });
      handleAlert({
        text: data?.data?.message,
        type: 'success',
      });
      setOpen(false);
    },
  });

  const columns = [
    {
      header: 'Brand Name',
      accessorKey: 'displayName',
    },
    {
      header: 'Brand ID',
      accessorKey: 'brandId',
    },
    {
      header: 'Registration On',
      accessorKey: 'createdAt',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{convertDateFormateApis(data?.createdAt, 'MMM D, YYYY')}</div>;
      },
    },
    {
      header: 'Entity Type',
      accessorKey: 'entityType',
    },
    {
      header: 'Country',
      accessorKey: 'country',
    },
    {
      header: 'Identity Status',
      accessorKey: 'identityStatus',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{data?.identityStatus || '---'}</div>;
      },
    },
    {
      header: 'TCR Status',
      accessorKey: 'status',
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
          <div className="flex  flex-col sm:flex-row items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
            <p className="text-gray-900 font-semibold text-lg">10DLC Brands</p>
            <div className="flex gap-2 filters">
              <Input
                placeholder="Search"
                className="pl-10 min-h-9 rounded-lg"
                IconPosition="left-0 pl-2 inset-y-0"
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.startsWith(' ')) return;
                  setSearch(e.target.value);
                }}
                Icon={<SearchLine className=" text-gray-700" />}
              />
              <Button
                className="min-h-9"
                variant={'outline'}
                onClick={() => setDrawerState((prev) => ({ ...prev, create10DLCBrand: true }))}
              >
                Create 10DLC Brand
              </Button>
            </div>
          </div>
          <div className="px-3 w-full flex flex-col gap-2">
            <TableManager
              {...{
                fetcherKey: 'getBrandList',
                fetcherFn: getBrandList,
                columns,
                search,
                emptyTablePlaceholder: 'No brands found',
                descriptionEmptyTable: 'Create a 10DLC brand to begin compliance registration.',
              }}
            />
          </div>
        </div>
      </section>
      {drawerState?.create10DLCBrand && (
        <SideDrawer
          isOpen={drawerState?.create10DLCBrand}
          isTab={false}
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
          title={'Create 10DLC Brand'}
          handleClose={() => setDrawerState((prev) => ({ ...prev, create10DLCBrand: false }))}
          content={
            <Create10DLCBrand
              drawerState={drawerState?.create10DLCBrand}
              setDrawerState={() =>
                setDrawerState((prev) => ({ ...prev, create10DLCBrand: false }))
              }
            />
          }
        />
      )}

      <AlertConfirm
        {...{
          apiLoading: isPending,
          onConfirm: () => {
            mutateBrandDelete({
              brandId: rowData?.brandId,
            });
          },
          open,
          setOpen,
        }}
      />
    </>
  );
};

export default DLCBrands;

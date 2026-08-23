import TableManager from '@/components/custom/table-manager';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SearchLine } from '@/assets/icons';
import { Icon, IconName } from '@/assets/icons/icon';
import CustomTooltip from '@/components/custom/custom-tooltip';
import CustomSelect from '@/components/custom/custom-select';
import SideDrawer from '@/components/custom/side-drawer';
import Create10DLCCampaign from './create-10DLC-campaign';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaign10DLCList, campaignDelete } from '@/services/api';
import { convertDateFormateApis, handleAlert } from '@/lib/utils';
import AlertConfirm from '@/components/custom/alert-confirm';

const DLCCampaigns = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState<string>('');
  const [drawerState, setDrawerState] = useState({
    create10DLCCamapign: false,
  });

  const [open, setOpen] = useState(false);
  const [rowData, setRowData] = useState<any>({});

  const { mutate: mutateBrandDelete, isPending } = useMutation({
    mutationKey: ['campaignDelete'],
    mutationFn: campaignDelete,
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign10DLCList'] });
      handleAlert({
        text: data?.data?.message,
        type: 'success',
      });
      setOpen(false);
    },
  });

  const columns = [
    {
      header: 'Campaign ID',
      accessorKey: 'campaignId',
      // cell: (props: any) => {
      //   const data = props?.row?.original;
      //   return (
      //     <span className="text-primary cursor-pointer">{`${data?.name} ${data?.is_default === '1' ? `(Main Site)` : ''}`}</span>
      //   );
      // },
    },
    {
      header: 'BRAND ID',
      accessorKey: 'brandId',
    },
    {
      header: 'BRAND NAME',
      accessorKey: 'brandName',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{data?.brandName || '--'}</div>;
      },
    },
    {
      header: 'USE-CASE',
      accessorKey: 'usecase',
    },
    {
      header: 'REGISTERED ON',
      accessorKey: 'createdAt',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{convertDateFormateApis(data?.createdAt, 'MMM D, YYYY')}</div>;
      },
    },
    {
      header: 'UPSTREAM CNP',
      accessorKey: 'upstreamCnpName',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{data?.upstreamCnpName || '--'}</div>;
      },
    },
    {
      header: 'RESELLER NAME',
      accessorKey: 'resellerName',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{data?.resellerName || '--'}</div>;
      },
    },
    {
      header: 'TCR STATUS',
      accessorKey: 'tcrStatus',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{data?.tcrStatus || 'Active'}</div>;
      },
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
          <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
            <p className="text-gray-900 font-semibold text-lg">10DLC Campaigns</p>
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
              <CustomSelect />
              <Button
                className="min-h-9"
                variant={'outline'}
                onClick={() => setDrawerState((prev) => ({ ...prev, create10DLCCamapign: true }))}
              >
                Create 10DLC Campaign
              </Button>
            </div>
          </div>
          <div className="px-3 w-full flex flex-col gap-2">
            <TableManager
              {...{
                fetcherKey: 'campaign10DLCList',
                fetcherFn: campaign10DLCList,
                columns,
                search,
                emptyTablePlaceholder: 'No campaigns found',
                descriptionEmptyTable: 'Create campaign to see data here',
              }}
            />
          </div>
        </div>
      </section>
      {drawerState?.create10DLCCamapign && (
        <SideDrawer
          isOpen={drawerState?.create10DLCCamapign}
          isTab={false}
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
          title={'Create 10DLC Campaign'}
          handleClose={() => setDrawerState((prev) => ({ ...prev, create10DLCCamapign: false }))}
          content={
            <Create10DLCCampaign
              drawerState={drawerState?.create10DLCCamapign}
              setDrawerState={() =>
                setDrawerState((prev) => ({ ...prev, create10DLCCamapign: false }))
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
              campaignId: rowData?.campaignId || '',
            });
          },
          open,
          setOpen,
        }}
      />
    </>
  );
};

export default DLCCampaigns;

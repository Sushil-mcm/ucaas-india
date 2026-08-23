import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';

import { convertDateFormateApis, handleAlert } from '@/lib/utils';
import { deleteDncCampaign, getDncCampaign } from '@/services/api';
import { useState } from 'react';
import AddDncModal from './addDnc';
import { Icon } from '@/assets/icons/icon';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CustomTooltip from '@/components/custom/custom-tooltip';
import UploadDnc from './uploadDnc';

export const DNC_TABS = {
  DEFAULT: 'Default DNC',
  PERSONAL: 'Personal DNC',
};

// const columns: any = [
//   {
//     header: 'Created Date',
//     accessorKey: 'attributes.created-date',
//     cell: ({ row }: any) => {
//       const date = row?.original?.attributes?.['created-date'];
//       return <div>{date ? convertDateFormateApis(date, 'MM/DD/YYYY hh:mm A') : '---'}</div>;
//     },
//   },
//   {
//     header: 'Company Phone Number',
//     accessorKey: 'attributes.company-phone-number',
//     cell: ({ row }: any) => row?.original?.attributes?.['company-phone-number'] || '---',
//   },
//   {
//     header: 'Area Code',
//     accessorKey: 'attributes.consumer-area-code',
//     cell: ({ row }: any) => row?.original?.attributes?.['consumer-area-code'] || '---',
//   },
//   {
//     header: 'State',
//     accessorKey: 'attributes.consumer-state',
//     cell: ({ row }: any) => row?.original?.attributes?.['consumer-state'] || '---',
//   },
//   {
//     header: 'City',
//     accessorKey: 'attributes.consumer-city',
//     cell: ({ row }: any) => row?.original?.attributes?.['consumer-city'] || '---',
//   },
//   // {
//   //   header: 'Violation Date',
//   //   accessorKey: 'attributes.violation-date',
//   //   cell: ({ row }: any) => {
//   //     const date = row?.original?.attributes?.['violation-date'];
//   //     return <div>{date ? convertDateFormateApis(date, 'MM/DD/YYYY') : '---'}</div>;
//   //   },
//   // },
// ];

const DNC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [openUpload, setOpenUpload] = useState<boolean>(false);

  const queryClient: any = useQueryClient();
  const [confirmModelState, setConfirmState] = useState<{
    isModal: boolean;
    selectedId: string;
  }>({
    isModal: false,
    selectedId: '',
  });

  const columnsPersonal: any = [
    {
      header: 'Created Date',
      accessorKey: 'createdAt',
      cell: ({ row }: any) => {
        const date = row?.original?.createdAt;
        return <div>{date ? convertDateFormateApis(date, 'MM/DD/YYYY hh:mm A') : '---'}</div>;
      },
    },
    {
      header: 'User Name',
      accessorKey: 'name',
      cell: ({ row }: any) => row?.original?.name || '---',
    },
    {
      header: 'Phone Number',
      accessorKey: 'phone',
      cell: ({ row }: any) => row?.original?.phone || '---',
    },
    {
      header: 'Email',
      accessorKey: 'email',
      cell: ({ row }: any) => row?.original?.email || '---',
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        return (
          <span className="flex gap-2 items-center">
            <CustomTooltip
              text={row?.original?.type == 'SYSTEM' ? 'System generated DNC' : 'Delete DNC'}
            >
              <span
                onClick={() => {
                  if (row?.original?.type !== 'SYSTEM') {
                    setConfirmState({
                      isModal: true,
                      selectedId: row.original?._id,
                    });
                  }
                }}
                className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8 ${row?.original?.type == 'SYSTEM' ? 'bg-red-100 text-red-500' : 'bg-red-100 text-red-500'}  hover:bg-red-500 hover:text-white`}
              >
                <Icon name="TrashBin" className="w-5 h-5" />
              </span>
            </CustomTooltip>
          </span>
        );
      },
    },
  ];
  const { mutate: mutateDeleteGroup, isPending: isPendingDeleteGroup } = useMutation({
    mutationFn: deleteDncCampaign,
    onSuccess: (data) => {
      if (data?.data?.success) {
        handleAlert({ text: data?.data?.message || 'DNC deleted successfully!', type: 'success' });
        setConfirmState({
          isModal: false,
          selectedId: '',
        });
        queryClient.invalidateQueries({ queryKey: ['getPersonalDncList'] });
      }
    },
  });
  return (
    <>
      <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
            Do Not Contact List
          </p>

          <div className="flex gap-2 filters">
            <Button
              onClick={() => setOpen(true)}
              className="cursor-pointer min-h-9"
              variant={'outline'}
              type="button"
            >
              Add DNC
            </Button>
            <Button
              onClick={() => setOpenUpload(true)}
              className="cursor-pointer min-h-9"
              variant={'outline'}
              type="button"
            >
              Upload DNC
            </Button>
          </div>
        </div>
        <div className="w-full flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] ">
          {/* <Tabs value={tabName} onValueChange={handleTabChange} className="flex w-full">
            <div className="w-full">
              <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none bg-transparent min-h-10 ">
                <TabsTrigger
                  value={DNC_TABS.DEFAULT}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4 m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                >
                  {DNC_TABS.DEFAULT}
                </TabsTrigger>
                <TabsTrigger
                  value={DNC_TABS.PERSONAL}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4 m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                >
                  {DNC_TABS.PERSONAL}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value={DNC_TABS.DEFAULT}>
              <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden  h-full">
                <div className="w-full  p-3 flex flex-col gap-2 ">
                  <TableManager
                    {...{
                      columns,
                      fetcherKey: 'getDNCComplaintsList',
                      fetcherFn: getDNCComplaintsList,
                      select: (data) => data?.data?.data?.result || [],
                      emptyTablePlaceholder: 'No DNC records found',
                      descriptionEmptyTable: 'Numbers added to Do Not Call will appear here.',
                    }}
                  />
                </div>
              </section>
            </TabsContent>
            <TabsContent value={DNC_TABS.PERSONAL}>
              <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden  h-full">
                <div className="w-full  p-3 flex flex-col gap-2 ">
                  <TableManager
                    {...{
                      columns: columnsPersonal,
                      fetcherKey: 'getPersonalDncList',
                      fetcherFn: getDncCampaign,
                      emptyTablePlaceholder: 'No DNC records found',
                      descriptionEmptyTable: 'Numbers added to Do Not Call will appear here.',
                    }}
                  />
                </div>
                <AlertConfirm
                  {...{
                    headerText:"Confirm Delete",
                    apiLoading: isPendingDeleteGroup,
                    onConfirm: () => {
                      mutateDeleteGroup({ dncId: confirmModelState?.selectedId });
                      queryClient.invalidateQueries(['getPersonalDncList'], { exact: true });
                    },
                    open: confirmModelState?.isModal,
                    setOpen: () => {
                      setConfirmState({
                        isModal: false,
                        selectedId: '',
                      });
                    },
                    descriptionTextComp:"Are you sure, you want to delete this DNC ?"
                  }}
                />
              </section>
            </TabsContent>
          </Tabs> */}
          <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden  h-full">
            <div className="w-full flex flex-col gap-2 ">
              <TableManager
                {...{
                  columns: columnsPersonal,
                  fetcherKey: 'getPersonalDncList',
                  fetcherFn: getDncCampaign,
                  emptyTablePlaceholder: 'No DNC records found',
                  descriptionEmptyTable: 'Numbers added to Do Not Call will appear here.',
                }}
              />
            </div>
            <AlertConfirm
              {...{
                headerText: 'Confirm Delete',
                apiLoading: isPendingDeleteGroup,
                onConfirm: () => {
                  mutateDeleteGroup({ dncId: confirmModelState?.selectedId });
                },
                open: confirmModelState?.isModal,
                setOpen: () => {
                  setConfirmState({
                    isModal: false,
                    selectedId: '',
                  });
                },
                descriptionTextComp: 'Are you sure, you want to delete this DNC ?',
              }}
            />
          </section>
        </div>
      </section>
      <AddDncModal modalState={open} setModalState={setOpen} />
      <UploadDnc drawerState={openUpload} setDrawerState={setOpenUpload} />
    </>
  );
};

export default DNC;

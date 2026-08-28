import { Plus } from '@/assets/icons';
// import Breadcrumb from '@/components/custom/breadcrumb';
import SideDrawer from '@/components/custom/side-drawer';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { capitalizeFirstLetter, formatDate, handleAlert } from '@/lib/utils';
import { deleteCallHandlingTemplate, getCallHandlingList } from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import UpsertCallForwarding from '../../numbers/set-number-forwarding';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { Icon, IconName } from '@/assets/icons/icon';
import useDebounce from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';

// const breadcrumbData = [{ label: 'Templates' }, { label: 'Call Handling' }];

interface IUserSettingsState {
  isAddEdit: boolean;
  tempDetails: any;
  isDeleteAlert: boolean;
}

const CallHandling = () => {
  const [drawerState, setDrawerState] = useState<IUserSettingsState>({
    isAddEdit: false,
    tempDetails: null,
    isDeleteAlert: false,
  });
  const queryClient: any = useQueryClient();
  const [searchedText, setSearchedText] = useState('');
  const debouncedSearch = useDebounce(searchedText || '', 1000);

  const { mutate: mutateDeleteTemplate, isPending } = useMutation({
    mutationFn: deleteCallHandlingTemplate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['getCallHandlingTemplate'] });
      handleAlert({
        text: data?.data?.message || 'Template deleted successfully',
        type: 'success',
      });
      setDrawerState((prev) => ({
        ...prev,
        isDeleteAlert: false,
        tempDetails: null,
      }));
    },
  });

  const columns: ColumnDef<any>[] = [
    {
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }) => (
        <span
          onClick={() =>
            setDrawerState((prev) => ({
              ...prev,
              isAddEdit: true,
              tempDetails: row.original,
            }))
          }
          className="text-primary  cursor-pointer"
        >
          {capitalizeFirstLetter(row?.original?.name)}
        </span>
      ),
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: ({ row }) => <span>{formatDate(row?.original?.created_at)}</span>,
    },

    {
      header: 'Last Modified',
      accessorKey: 'updated_at',
      cell: ({ row }) => <span>{formatDate(row?.original?.updated_at)}</span>,
    },
    {
      header: 'Actions',
      accessorKey: 'action',
      cell: ({ row }) => {
        const data = row?.original;
        const actions = [
          {
            icon: 'EditStrokIcon',
            onClick: () =>
              setDrawerState((prev) => ({
                ...prev,
                isAddEdit: true,
                tempDetails: data,
              })),
            className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
            tooltipText: 'Edit',
          },
          {
            icon: 'TrashBin',
            onClick: () =>
              setDrawerState((prev) => ({
                ...prev,
                isDeleteAlert: true,
                tempDetails: data,
              })),
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
    <>
      <section className="w-full flex flex-col bg-gray-200/15">
        {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
        <div className="flex  flex-col sm:flex-row items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <div>
            <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
              Templates
              <div className="-rotate-90 text-gray-800">
                <Icon name="ChevronIcon" className="w-5 h-5" />
              </div>
              <span className="text-primary text-md">Call Handling</span>
            </p>
            <p className="text-gray-500 text-xs">
              Reusable call-routing rules you can apply to numbers, queues and people.
            </p>
          </div>
          <div className="flex gap-2 filters  flex-col sm:flex-row">
            <Input
              type="search"
              placeholder="Search Call Queue"
              onChange={(e) => {
                const value = e.target.value;
                if (value.startsWith(' ')) return;
                setSearchedText(e.target.value);
              }}
              className="w-64 min-h-9 rounded-lg"
            />
            <Button
              type="button"
              variant={'outline'}
              onClick={() =>
                setDrawerState((prev) => ({ ...prev, isAddEdit: true, tempDetails: null }))
              }
              className="min-h-9"
            >
              <Plus className="w-3 h-3" />
              Add Call Handling Template
            </Button>
          </div>
        </div>
        <div>
          <div className="w-full p-3 flex flex-col gap-2">
            <TableManager
              {...{
                columns,
                fetcherKey: 'getCallHandlingTemplate',
                fetcherFn: getCallHandlingList,
                extraParams: { filter: [{ key: 'name', value: debouncedSearch }] },
                emptyTablePlaceholder: 'No call handling templates found',
              }}
            />
          </div>
        </div>
      </section>
      {drawerState?.isAddEdit && (
        <SideDrawer
          width="min(1040px, 84vw)"
          isOpen={drawerState?.isAddEdit}
          isTab={false}
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
          title={`${drawerState?.tempDetails ? 'Update' : 'Add'} Call Handling Template`}
          handleClose={() =>
            setDrawerState((prev) => ({ ...prev, isAddEdit: false, tempDetails: null }))
          }
          content={
            <UpsertCallForwarding
              drawerState={drawerState?.isAddEdit}
              setDrawerState={() =>
                setDrawerState((prev) => ({ ...prev, isAddEdit: false, tempDetails: null }))
              }
              initialData={drawerState?.tempDetails}
              initialType={'UPSERT_TEMPLATE'}
              isUser={false}
            />
          }
        />
      )}

      {drawerState?.isDeleteAlert && (
        <AlertConfirm
          {...{
            apiLoading: isPending,
            onConfirm: () => {
              mutateDeleteTemplate(drawerState?.tempDetails?.uuid);
            },
            open: drawerState?.isDeleteAlert,
            setOpen: () => {
              setDrawerState((prev) => ({
                ...prev,
                isDeleteAlert: false,
                tempDetails: null,
              }));
            },
            headerText: 'Delete Confirmation',
            descriptionTextComp: 'Are you sure, you want to delete this template?',
          }}
        />
      )}
    </>
  );
};

export default CallHandling;

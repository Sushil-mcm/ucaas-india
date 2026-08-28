import { Plus } from '@/assets/icons';
// import Breadcrumb from '@/components/custom/breadcrumb';
import SideDrawer from '@/components/custom/side-drawer';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { formatDate, handleAlert } from '@/lib/utils';
import { templateDelete, templateList } from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { FC, useState } from 'react';
import UpsertUserSettingsTemplate from './add-edit-user-settings';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { Icon, IconName } from '@/assets/icons/icon';
import { Input } from '@/components/ui/input';
import useDebounce from '@/hooks/use-debounce';
import { useNavigate } from 'react-router-dom';
import { COMPANY_DEFAULT_TEMPLATE_NAME } from '@/lib/company-defaults';

// const breadcrumbData = [{ label: 'Templates' }, { label: 'User Settings' }];

interface IUserSettingsState {
  isAddEdit: boolean;
  tempDetails: any;
  isDeleteAlert: boolean;
}

const UserSettings: FC = () => {
  const navigate = useNavigate();
  const [drawerState, setDrawerState] = useState<IUserSettingsState>({
    isAddEdit: false,
    tempDetails: null,
    isDeleteAlert: false,
  });
  const [searchedText, setSearchedText] = useState('');
  const debouncedSearch = useDebounce(searchedText || '', 1000);
  const queryClient: any = useQueryClient();

  const { mutate: mutateDelete, isPending } = useMutation({
    mutationFn: templateDelete,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['userTemplateList'] });
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
      cell: ({ row }) => {
        /* The company record is stored as a reserved template row because there
           is no company-settings table. It is not a template — nobody applies it
           to a person — so it opens the company page, never the template drawer.
           Editing it here would let an admin overwrite the company's phone rules,
           emergency address, holidays and policies while believing they were
           editing a template. */
        if (row?.original?.name === COMPANY_DEFAULT_TEMPLATE_NAME) {
          return (
            <span className="flex items-center gap-2">
              <span
                onClick={() => navigate('/admin-settings/company-info/rules')}
                className="text-primary hover:text-primary/80 underline-offset-4 cursor-pointer"
              >
                {row?.original?.name}
              </span>
              <span className="rounded-sm bg-ucass-primary-200 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                Company record
              </span>
            </span>
          );
        }
        return (
          <span
            onClick={() =>
              setDrawerState((prev) => ({
                ...prev,
                isAddEdit: true,
                tempDetails: row?.original,
              }))
            }
            className="text-primary hover:text-primary/80  underline-offset-4 cursor-pointer"
          >
            {row?.original?.name}
          </span>
        );
      },
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: ({ row }) => <span>{formatDate(row?.original?.created_at)}</span>,
    },

    {
      header: 'Updated',
      accessorKey: 'updated_at',
      cell: ({ row }) => <span>{formatDate(row?.original?.updated_at)}</span>,
    },
    {
      header: 'Actions',
      accessorKey: 'action',
      cell: ({ row }) => {
        const data = row?.original;

        /* Deleting this row would silently wipe every company-wide setting, with
           no warning that it was anything other than a spare template. */
        if (data?.name === COMPANY_DEFAULT_TEMPLATE_NAME) {
          return (
            <span
              onClick={() => navigate('/admin-settings/company-info/rules')}
              className="cursor-pointer text-xs font-medium text-primary hover:underline"
            >
              Open company settings
            </span>
          );
        }

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
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <div>
            <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
              Templates
              <div className="-rotate-90 text-gray-800">
                <Icon name="ChevronIcon" className="w-5 h-5" />
              </div>
              <span className="text-primary text-md">User Settings</span>
            </p>
            <p className="text-gray-500 text-xs">
              Saved bundles of user settings you can apply when creating or editing someone.
            </p>
          </div>
          <div className="flex gap-2 filters  flex-col sm:flex-row">
            <Input
              type="search"
              placeholder="Search"
              onChange={(e) => setSearchedText(e.target.value)}
              className="w-64 min-h-9 rounded-lg"
            />
            <Button
              variant={'outline'}
              type="button"
              className="min-h-9"
              onClick={() =>
                setDrawerState((prev) => ({ ...prev, isAddEdit: true, tempDetails: null }))
              }
            >
              <Plus className="w-3 h-3" />
              Add User Settings Template
            </Button>
          </div>
        </div>
        <div className="w-full p-3 flex flex-col gap-2">
          <TableManager
            {...{
              columns,
              fetcherKey: 'userTemplateList',
              fetcherFn: templateList,
              extraParams: { filter: [{ key: 'name', value: debouncedSearch }] },
              emptyTablePlaceholder: 'No user settings templates found',
            }}
          />
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
          title={`${drawerState?.tempDetails ? `Update User Settings Template (${drawerState?.tempDetails?.name})` : 'Add User Settings Template'}`}
          handleClose={() =>
            setDrawerState((prev) => ({ ...prev, isAddEdit: false, tempDetails: null }))
          }
          content={
            <UpsertUserSettingsTemplate
              drawerState={drawerState?.isAddEdit}
              setDrawerState={() =>
                setDrawerState((prev) => ({ ...prev, isAddEdit: false, tempDetails: null }))
              }
              data={drawerState?.tempDetails}
            />
          }
        />
      )}

      {drawerState?.isDeleteAlert && (
        <AlertConfirm
          {...{
            apiLoading: isPending,
            onConfirm: () => {
              mutateDelete(drawerState?.tempDetails?.uuid);
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

export default UserSettings;

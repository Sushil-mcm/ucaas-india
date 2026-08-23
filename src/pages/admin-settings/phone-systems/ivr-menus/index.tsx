import TableManager from '@/components/custom/table-manager';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { deleteIvr, ivrList } from '@/services/api';
import { FC, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import AddEditIvrMenu from './add-edit-ivr';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { handleAlert } from '@/lib/utils';
import AlertConfirm from '@/components/custom/alert-confirm';
import { Plus } from '@/assets/icons';
import SideDrawer from '@/components/custom/side-drawer';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { Icon, IconName } from '@/assets/icons/icon';
// import Breadcrumb from '@/components/custom/breadcrumb';
import useDebounce from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { useCompanyFeatures } from '@/hooks/rbac';

interface IIVR {
  name: string;
  extension: string;
  site: string;
}
// const breadcrumbData = [{ label: 'Phone System' }, { label: 'IVR Menus' }];

const IvrMenus: FC = () => {
  const [drawerState, setDrawerState] = useState<boolean>(false);
  const queryClient: any = useQueryClient();
  const [selectedIvr, setSelectedIvr] = useState<any>(null);
  const [deleteIVRMenu, setDeleteIVRMenu] = useState<any>(null);
  const [searchedText, setSearchedText] = useState('');
  const debouncedSearch = useDebounce(searchedText || '', 1000);
  const { features } = useCompanyFeatures();

  const phoneSystem = features?.plan_features?.phone_system_action;
  const hasIvrAccess = Boolean(phoneSystem?.access?.IVR);
  const ivrActions = phoneSystem?.action;

  const { mutate: deleteIvrMutate, isPending: isDeletePending } = useMutation({
    mutationFn: deleteIvr,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries(['fetchIvrList'], { exact: true });
      handleAlert({ text: data?.data?.data?.message, type: 'success' });
      setDeleteIVRMenu(null);
    },
  });
  const columns: ColumnDef<IIVR>[] = [
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'Extension',
      accessorKey: 'extension',
    },
    {
      header: 'Site',
      accessorKey: 'site',
      cell: ({ row }) => {
        const data = row?.original;
        try {
          const getSiteObj = JSON.parse(data?.site);
          return getSiteObj?.label || '---';
        } catch (error) {
          console.error('ERROR ON SITE: ', error);
        }
      },
    },
    {
      header: 'Actions',
      accessorKey: 'action',
      cell: ({ row }) => {
        const data = row?.original;
        const actions = [
          hasIvrAccess &&
            ivrActions?.edit && {
              icon: 'EditStrokIcon',
              onClick: () => {
                setDrawerState(true);
                setSelectedIvr(data);
              },
              className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
              tooltipText: 'Edit',
            },
          hasIvrAccess &&
            ivrActions?.delete && {
              icon: 'TrashBin',
              onClick: () => setDeleteIVRMenu(data),
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
                  className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8  ${action.className}`}
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
      <AdminPage
        section="Phone System"
        title="IVR menus"
        description="Automated menus that greet callers and route them. Assign one to any number to control greetings, routing and voicemail."
        actions={
          hasIvrAccess && ivrActions?.add ? (
            <button type="button" className="btn primary" onClick={() => setDrawerState(true)}>
              <Plus className="w-3 h-3" />
              New IVR menu
            </button>
          ) : null
        }
        filters={
          <Input
            type="search"
            placeholder="Search IVR menus"
            onChange={(e) => setSearchedText(e.target.value)}
            className="w-full min-h-9 rounded-lg"
          />
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-gray-900 text-sm">
            Use this to build your automated menu. After creating your IVR here, you can assign it
            to any Phone Number in your system to manage greetings, routing, and voicemail messages
            automatically.
          </p>
          <TableManager
            {...{
              columns,
              fetcherKey: 'fetchIvrList',
              fetcherFn: ivrList,
              extraParams: { filter: [{ key: 'name', value: debouncedSearch }] },
              emptyTablePlaceholder: 'No IVR menus found',
              descriptionEmptyTable: 'Set up an IVR menu to manage incoming call flows',
            }}
          />
        </div>
      </AdminPage>
      {drawerState && (
        <SideDrawer
          isOpen={drawerState}
          isTab={false}
          enableResponsive
          title={selectedIvr ? `Update IVR (${selectedIvr?.name})` : 'Add IVR Menu'}
          handleClose={() => {
            setDrawerState(false);
            setSelectedIvr(null);
          }}
          content={
            <AddEditIvrMenu
              drawerState={drawerState}
              setDrawerState={() => {
                setDrawerState(false);
                setSelectedIvr(null);
              }}
              initialData={selectedIvr}
            />
          }
        />
      )}

      {!!deleteIVRMenu && (
        <AlertConfirm
          {...{
            apiLoading: isDeletePending,
            onConfirm: () => {
              deleteIvrMutate({ uuid: deleteIVRMenu?.uuid });
            },
            open: !!deleteIVRMenu,
            setOpen: () => {
              setDeleteIVRMenu(null);
            },
          }}
        />
      )}
    </>
  );
};

export default IvrMenus;

import TableManager from '@/components/custom/table-manager';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { deleteIvr, ivrList } from '@/services/api';
import { FC, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import AddEditIvrMenu from './add-edit-ivr';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { handleAlert } from '@/lib/utils';
import AlertConfirm from '@/components/custom/alert-confirm';
import { Plus } from '@/assets/icons';
import SideDrawer from '@/components/custom/side-drawer';
import { IVR_PATH, IVR_DEFAULT_TAB } from './ivr-tabs';
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
  /* Which IVR is open, and which tab, both come from the URL so an IVR can be
     linked in a ticket and survives a reload.

     Unlike a queue, an IVR is hydrated from the row in the list — there is no
     endpoint that returns one IVR by id. So the row is resolved from the loaded
     page of results, and when it is not there the editor is NOT opened with a
     bare id. Doing that would hand the editor an object with a uuid and no
     fields, and saving would overwrite a real IVR with empty values. A pasted
     link to an IVR on another page of results gets an honest message instead. */
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { ivrId, tab: tabSlug } = useParams();
  const isCreating = pathname === `${IVR_PATH}/new`;
  const [loadedRows, setLoadedRows] = useState<any[]>([]);
  const selectedIvr = ivrId ? loadedRows.find((row: any) => row?.uuid === ivrId) || null : null;
  const ivrNotFound = Boolean(ivrId) && !selectedIvr;
  const drawerState = Boolean(ivrId) || isCreating;

  const openIvr = (row: any) => navigate(`${IVR_PATH}/${row?.uuid}/${IVR_DEFAULT_TAB.slug}`);
  const closeIvr = () => navigate(IVR_PATH);
  const queryClient: any = useQueryClient();
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
              onClick: () => openIvr(data),
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
      hideHead
        section="Phone System"
        title="IVR menus"
        description="Automated menus that greet callers and route them. Assign one to any number to control greetings, routing and voicemail."
        actions={
          hasIvrAccess && ivrActions?.add ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => navigate(`${IVR_PATH}/new`)}
            >
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
              /* TableManager hands back the raw response, not the rows. Reading
                 the wrong depth here meant the list of loaded rows was always
                 empty, so an IVR opened from a pasted link always claimed it was
                 not on the current page — including when it plainly was. */
              onSuccess: (data: any) => setLoadedRows(data?.data?.data?.result?.rows || []),
              extraParams: { filter: [{ key: 'name', value: debouncedSearch }] },
              emptyTablePlaceholder: 'No IVR menus found',
              descriptionEmptyTable: 'Set up an IVR menu to manage incoming call flows',
            }}
          />
        </div>
      </AdminPage>
      {drawerState && (
        <SideDrawer
          width="min(1040px, 84vw)"
          isOpen={drawerState}
          isTab={false}
          enableResponsive
          title={
            ivrNotFound
              ? 'IVR menu'
              : selectedIvr
                ? `Update IVR (${selectedIvr?.name})`
                : 'Add IVR Menu'
          }
          handleClose={closeIvr}
          content={
            ivrNotFound ? (
              <div className="p-6">
                <p className="text-sm font-semibold text-gray-900">
                  This IVR menu is not on the current page of results
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Search for it by name in the list behind this panel, then open it from there.
                </p>
                <button type="button" className="btn primary mt-4" onClick={closeIvr}>
                  Back to the list
                </button>
              </div>
            ) : (
              <AddEditIvrMenu
                drawerState={drawerState}
                setDrawerState={closeIvr}
                initialData={selectedIvr}
                tabSlug={tabSlug}
              />
            )
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

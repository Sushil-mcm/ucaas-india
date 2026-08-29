import { SearchLine } from '@/assets/icons';
import { parseForwardActions } from '@/lib/call-standard';
import { Icon, IconName } from '@/assets/icons/icon';
import AlertConfirm from '@/components/custom/alert-confirm';
// import Breadcrumb from '@/components/custom/breadcrumb';
import CustomTooltip from '@/components/custom/custom-tooltip';
import NumberWithFlag from '@/components/custom/number-with-flag';
import SideDrawer from '@/components/custom/side-drawer';
import TableManager from '@/components/custom/table-manager';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { Input } from '@/components/ui/input';
import { capitalizeFirstLetter, handleAlert } from '@/lib/utils';
import {
  allNumbersList,
  releaseForwarding,
  removeAssignNumber,
  removeForwarding,
} from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import UpsertCallForwarding from '../set-number-forwarding';
import AssignDIDNumber from '../assign-did';
import { useCompanyFeatures } from '@/hooks/rbac';
import {
  FORWARD_TYPES_WITH_EXTENSION,
  FORWARD_TYPES_WITH_NAME,
  FORWARD_TYPES_WITH_PHONE,
  getDidTypeLabel,
} from '../utils';
import { invalidateNumberLists } from '@/lib/number-list-cache';

interface IAllNumberState {
  updateForwarding: boolean;
  assignDID: boolean;
  selectedDID: any;
  deleteConfirmationAlert: boolean;
  removeConfirmationAlert: boolean;
  releaseConfirmationAlert: boolean;
}
const NumbersInventory = () => {
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const virtualNumberAccess = features?.plan_features?.virtual_numbers;
  const [search, setSearch] = useState<string>('');
  // const breadcrumbData = [{ label: 'Numbers' }, { label: 'Number Inventory' }];
  const [allNumberState, setAllNumberState] = useState<IAllNumberState>({
    updateForwarding: false,
    assignDID: false,
    selectedDID: null,
    deleteConfirmationAlert: false,
    removeConfirmationAlert: false,
    releaseConfirmationAlert: false,
  });

  const { mutate: mutateRemoveAssignDID, isPending: isPendingRemoveAssignDID } = useMutation({
    mutationFn: removeAssignNumber,
    onSuccess: (data: any) => {
      invalidateNumberLists(queryClient);
      handleAlert({
        text: data?.data?.data?.message || 'Assigned DID Removed Successfully.',
        type: 'success',
      });
      setAllNumberState((prev) => ({
        ...prev,
        deleteConfirmationAlert: false,
        selectedDID: null,
      }));
    },
  });

  const { mutate: mutateReleaseForwarding, isPending: isPendingReleaseForwarding } = useMutation({
    mutationFn: releaseForwarding,
    onSuccess: (data) => {
      invalidateNumberLists(queryClient);
      handleAlert({
        text: data?.data?.data?.message || 'Forwarding Removed Successfully.',
        type: 'success',
      });
      setAllNumberState((prev) => ({
        ...prev,
        releaseConfirmationAlert: false,
        selectedDID: null,
      }));
    },
  });
  const { mutate: mutateRemoveForwarding, isPending: isPendingRemovingForwarding } = useMutation({
    mutationFn: removeForwarding,
    onSuccess: (data) => {
      invalidateNumberLists(queryClient);
      handleAlert({
        text: data?.data?.data?.message || 'Forwarding Removed Successfully.',
        type: 'success',
      });
      setAllNumberState((prev) => ({
        ...prev,
        removeConfirmationAlert: false,
        selectedDID: null,
      }));
    },
  });
  const columns = [
    {
      header: 'Number/Name',
      accessorKey: 'did_number',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        return (
          <div className="flex flex-col items-start">
            <NumberWithFlag number={data?.did_number} />
            <small className="pl-6">{data?.did_name || ''}</small>
          </div>
        );
      },
    },
    {
      header: 'Assigned to',
      accessorKey: 'uuid',
      cell: ({ row }: any) => {
        const data = row?.original?.User || {};

        const username = data?.first_name ? (
          `${data?.first_name}${data?.last_name ? ` ${data?.last_name}` : ''}`
        ) : (
          <>
            {row?.original?.forward_call_actions || !virtualNumberAccess?.action?.set_forwarding ? (
              <p className="text-grey cursor-not-allowed"> Assign to extension</p>
            ) : (
              <p
                className="text-primary cursor-pointer"
                onClick={() => {
                  handleAllNumberState(row?.original, 'assignDID');
                }}
              >
                Assign to extension
              </p>
            )}
          </>
        );
        return username;
      },
    },
    {
      header: 'Forwarded to',
      accessorKey: 'uuid',
      cell: ({ row }: any) => {
        const data = row?.original || {};

        /* Parsed defensively: an unguarded JSON.parse here throws during render,
           and one malformed forward_call_actions row would blank the entire
           table rather than that single cell. */
        const parsedForwardTo = parseForwardActions(data?.forward_call_actions);
        const forwardedValue = parsedForwardTo?.call_handling?.business_hours || '';
        return (
          <div>
            {FORWARD_TYPES_WITH_EXTENSION.includes(forwardedValue?.type) ? (
              <div className="flex flex-col items-start">
                {capitalizeFirstLetter(forwardedValue?.type)}
                <small>
                  {forwardedValue?.name}
                  {forwardedValue?.value ? ` (${forwardedValue.value})` : ''}
                </small>
              </div>
            ) : FORWARD_TYPES_WITH_NAME.includes(forwardedValue?.type) ? (
              <div className="flex flex-col items-start">
                {capitalizeFirstLetter(forwardedValue?.type)}
                <small>{forwardedValue?.name}</small>
              </div>
            ) : FORWARD_TYPES_WITH_PHONE.includes(forwardedValue?.type) ? (
              <div className="flex flex-col items-start">
                {capitalizeFirstLetter(forwardedValue?.type)}
                <small>
                  <NumberWithFlag number={`+${forwardedValue?.name}`} />
                </small>
              </div>
            ) : (
              <>
                {data?.User || !virtualNumberAccess?.action?.set_forwarding ? (
                  <p className="text-grey cursor-not-allowed">Set Forwarding</p>
                ) : (
                  <p
                    className="text-primary cursor-pointer"
                    onClick={() => {
                      handleAllNumberState(data, 'updateForwarding');
                    }}
                  >
                    Set Forwarding
                  </p>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      header: 'Type',
      accessorKey: 'did_type',
      cell: ({ row: { original: _val } }: any) => {
        return getDidTypeLabel(_val?.did_type);
      },
    },

    {
      header: 'Site',
      accessorKey: 'type',
      cell: ({ row: { original: _val } }: any) => {
        return _val?.Site?.name ?? '--';
      },
    },

    {
      header: 'Action',
      accessorKey: 'action',
      cell: (props: any) => {
        const data = props?.row?.original;

        const createAction = (
          id: number,
          tooltip: string,
          icon: string,
          iconClass: string,
          className: string,
          stateAction: string,
        ) => ({
          id,
          tooltipText: tooltip,
          icon,
          iconClass,
          className,
          cb: () => handleAllNumberState(data, stateAction),
        });

        const setForwardingActions =
          !data?.forward_call_actions && !data?.User
            ? [
                virtualNumberAccess?.action?.set_forwarding &&
                  createAction(
                    1,
                    'Set Forwarding',
                    'CallForward',
                    'w-5.5 h-5.5',
                    'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
                    'updateForwarding',
                  ),
                virtualNumberAccess?.action?.assign_number &&
                  createAction(
                    2,
                    'Assign Number',
                    'AssignNumberIcon',
                    'w-5 h-5',
                    'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
                    'assignDID',
                  ),
              ].filter(Boolean)
            : [];

        const updateForwardingActions =
          !data?.User && data?.forward_call_actions
            ? [
                virtualNumberAccess?.action?.update_forwarding &&
                  createAction(
                    1,
                    'Update Forwarding',
                    'EditStrokIcon',
                    'w-5 h-5',
                    'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
                    'updateForwarding',
                  ),
                virtualNumberAccess?.action?.remove_forwarding &&
                  createAction(
                    3,
                    'Remove Forwarding',
                    'CallCancel',
                    'w-5.5 h-5.5',
                    'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
                    'removeConfirmationAlert',
                  ),
              ].filter(Boolean)
            : [];

        const removeAssignmentAction = data?.User
          ? [
              createAction(
                2,
                'Remove Assignment',
                'RemoveAssignmentLine',
                'w-5 h-5',
                'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
                'deleteConfirmationAlert',
              ),
            ]
          : [];

        const releaseNumberAction = virtualNumberAccess?.action?.release
          ? [
              createAction(
                4,
                'Release Number',
                'ReleaseNumber',
                'w-5 h-5',
                'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white',
                'releaseConfirmationAlert',
              ),
            ]
          : [];

        const actions = [
          ...removeAssignmentAction,
          ...setForwardingActions,
          ...updateForwardingActions,
          ...releaseNumberAction,
        ];

        // If actions are empty, show ---
        if (actions.length === 0) {
          return '---';
        }

        return (
          <div className="flex items-center gap-2">
            {actions.map((action) => (
              <CustomTooltip key={action.id} text={action.tooltipText} side="top">
                <div
                  className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8 ${action.className}`}
                  onClick={action.cb}
                >
                  <Icon name={action.icon as IconName} className={action.iconClass} />
                </div>
              </CustomTooltip>
            ))}
          </div>
        );
      },
    },
  ];
  const handleAllNumberState = (data: any, key: string) => {
    setAllNumberState((prev) => ({ ...prev, [key]: true, selectedDID: data }));
  };
  return (
    <AdminPage
      section="Numbers"
      title="Unused numbers"
      description="Numbers you own that are not assigned to anyone and have no call forwarding set."
      filters={
        <Input
          placeholder="Search numbers"
          className="pl-10 w-full min-h-9 rounded-lg"
          IconPosition="left-0 pl-2 inset-y-0"
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            if (value.startsWith(' ')) return;
            setSearch(e.target.value);
          }}
          Icon={<SearchLine className=" text-gray-700" />}
        />
      }
    >
      <div className="flex flex-col gap-2">
        <TableManager
          {...{
            fetcherKey: 'inventoryNumbersList',
            fetcherFn: allNumbersList,
            columns,
            search,
            emptyTablePlaceholder: 'No numbers available',
            descriptionEmptyTable:
              'Numbers that are not assigned or have no call forwarding will be listed here.',
            extraParams: {
              type: 'inventory',
            },
          }}
        />
      </div>

      {allNumberState.updateForwarding && (
        <SideDrawer
          width="min(1040px, 84vw)"
          isOpen={allNumberState.updateForwarding}
          title="Update Forwarding"
          isTab={false}
          handleClose={() =>
            setAllNumberState((prev) => ({ ...prev, updateForwarding: false, selectedDID: null }))
          }
          content={
            <UpsertCallForwarding
              drawerState={allNumberState.updateForwarding}
              setDrawerState={(val) =>
                setAllNumberState((prev) => ({ ...prev, updateForwarding: val, selectedDID: null }))
              }
              initialType={'SELECT_TEMPLATE'}
              isUser={false}
              initialData={allNumberState?.selectedDID}
            />
          }
        />
      )}
      {allNumberState.assignDID && (
        <AssignDIDNumber
          modalState={allNumberState.assignDID}
          setModalState={(val) =>
            setAllNumberState((prev) => ({ ...prev, assignDID: val, selectedDID: null }))
          }
          selectedDidNumber={allNumberState?.selectedDID}
        />
      )}

      {allNumberState?.deleteConfirmationAlert && (
        <AlertConfirm
          {...{
            apiLoading: isPendingRemoveAssignDID,
            onConfirm: () => {
              mutateRemoveAssignDID({
                did_number: allNumberState.selectedDID?.did_number,
              });
            },
            open: allNumberState?.deleteConfirmationAlert,
            setOpen: () => {
              setAllNumberState((prev) => ({
                ...prev,
                deleteConfirmationAlert: false,
                selectedDID: null,
              }));
            },
            descriptionTextComp:
              'Are you sure you want to remove the assignment of this DID number? ',
          }}
          headerText="Remove DID Assignment"
        />
      )}
      {allNumberState?.releaseConfirmationAlert && (
        <AlertConfirm
          {...{
            apiLoading: isPendingReleaseForwarding,
            onConfirm: () => {
              mutateReleaseForwarding(allNumberState.selectedDID?.did_number);
            },
            open: allNumberState?.releaseConfirmationAlert,
            setOpen: () => {
              setAllNumberState((prev) => ({
                ...prev,
                releaseConfirmationAlert: false,
                selectedDID: null,
              }));
            },
            descriptionTextComp:
              'Are you sure you want to release this DID number? This action cannot be undone.',
          }}
        />
      )}
      {allNumberState?.removeConfirmationAlert && (
        <AlertConfirm
          {...{
            apiLoading: isPendingRemovingForwarding,
            onConfirm: () => {
              mutateRemoveForwarding({
                uuid: allNumberState.selectedDID?.uuid,
              });
            },
            open: allNumberState?.removeConfirmationAlert,
            setOpen: () => {
              setAllNumberState((prev) => ({
                ...prev,
                removeConfirmationAlert: false,
                selectedDID: null,
              }));
            },
            descriptionTextComp:
              'Are you sure you want to remove the forwarding of this DID number? This action cannot be undone.',
          }}
        />
      )}
    </AdminPage>
  );
};

export default NumbersInventory;

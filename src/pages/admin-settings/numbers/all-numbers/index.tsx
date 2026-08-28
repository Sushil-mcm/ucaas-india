import NumberWithFlag from '@/components/custom/number-with-flag';
import { parseForwardActions } from '@/lib/call-standard';
import TableManager from '@/components/custom/table-manager';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import { capitalizeFirstLetter, handleAlert } from '@/lib/utils';
import {
  allNumbersList,
  releaseForwarding,
  removeAssignNumber,
  removeForwarding,
} from '@/services/api';
import { useEffect, useState } from 'react';
import { SearchLine, Plus } from '@/assets/icons';
import UpsertCallForwarding from '../set-number-forwarding';
import AssignDIDNumber from '../assign-did';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AlertConfirm from '@/components/custom/alert-confirm';
import SideDrawer from '@/components/custom/side-drawer';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { Icon, IconName } from '@/assets/icons/icon';
import { useCompanyFeatures } from '@/hooks/rbac';
import AddNumber from './add-number-new';
import {
  FORWARD_TYPES_WITH_EXTENSION,
  FORWARD_TYPES_WITH_NAME,
  FORWARD_TYPES_WITH_PHONE,
  getDidTypeLabel,
} from '../utils';
import { featuresLookUp, featuresObj } from './constants';
import { useSearchParams } from 'react-router-dom';

interface IAllNumberState {
  updateForwarding: boolean;
  assignDID: boolean;
  selectedDID: any;
  deleteConfirmationAlert: boolean;
  removeConfirmationAlert: boolean;
  releaseConfirmationAlert: boolean;
}

const AllNumbers = () => {
  const [search, setSearch] = useState<string>('');
  const [openDrawer, setOpenDrawer] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useUser();
  /* `companyInfo` does not exist on the user object — the field is `company_info`
     everywhere else in the codebase, including the next line of this same file.
     So this always read undefined and a customer with an expired subscription
     could still open the buy-a-number flow. */
  const isPlanExpired = user?.company_info?.plan_status === 'EXPIRED';
  const isTrial = user?.company_info?.is_trial === 'Y';
  const [allNumberState, setAllNumberState] = useState<IAllNumberState>({
    updateForwarding: false,
    assignDID: false,
    selectedDID: null,
    deleteConfirmationAlert: false,
    removeConfirmationAlert: false,
    releaseConfirmationAlert: false,
  });
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const virtualNumberAccess = features?.plan_features?.virtual_numbers || {};
  const handleAddNumber = () => {
    if (isTrial) return;

    if (isPlanExpired) {
      handleAlert({
        text: 'You cannot add users until your subscription is renewed.',
        type: 'error',
      });
      return;
    }
    setOpenDrawer(true);
  };

  useEffect(() => {
    const shouldOpenAddNumber = searchParams.get('openAddNumber') === '1';
    if (!shouldOpenAddNumber || isTrial) return;

    setOpenDrawer(true);
    const params = new URLSearchParams(searchParams);
    params.delete('openAddNumber');
    setSearchParams(params, { replace: true });
  }, [isTrial, searchParams, setSearchParams]);

  const { mutate: mutateRemoveAssignDID, isPending: isPendingRemoveAssignDID } = useMutation({
    mutationFn: removeAssignNumber,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['allNumbersList'] });
      queryClient.invalidateQueries({ queryKey: ['getUsersDetails'] });
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

  const { mutate: mutateRemoveForwarding, isPending: isPendingRemovingForwarding } = useMutation({
    mutationFn: removeForwarding,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['allNumbersList'] });
      queryClient.invalidateQueries({ queryKey: ['getUsersDetails'] });
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

  const { mutate: mutateReleaseForwarding, isPending: isPendingReleaseForwarding } = useMutation({
    mutationFn: releaseForwarding,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['allNumbersList'] });
      queryClient.invalidateQueries({ queryKey: ['getUsersDetails'] });
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

  const columns = [
    {
      header: 'Number/Name',
      accessorKey: 'did_number',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        return (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <NumberWithFlag number={data?.did_number} />
              {data?.is_fax_enabled && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  FAX
                </span>
              )}
            </div>
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

        if (data?.is_fax_enabled) return '--';

        /* Parsed defensively: an unguarded JSON.parse here throws during render,
           and one malformed forward_call_actions row would blank the entire
           table rather than that single cell. */
        const parsedForwardTo = parseForwardActions(data?.forward_call_actions);
        const forwardedValue = parsedForwardTo?.call_handling?.business_hours || '';
        return (
          <div>
            {FORWARD_TYPES_WITH_EXTENSION.includes(forwardedValue?.type) ? (
              <div className="flex">
                <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-2.5 py-1 w-auto">
                  <div className="w-7 h-7 rounded-lg border border-primary/30 bg-white flex items-center justify-center text-primary text-base font-semibold leading-none">
                    #
                  </div>
                  <div className="flex flex-col gap-1 leading-tight">
                    <div className="text-[9px] font-semibold tracking-[0.08em] text-gray-500 uppercase">
                      {capitalizeFirstLetter(forwardedValue?.type)}
                    </div>
                    <small className="text-gray-900 text-xs font-semibold leading-none">
                      {forwardedValue?.name}
                      {forwardedValue?.value ? ` (${forwardedValue.value})` : ''}
                    </small>
                  </div>
                </div>
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
      header: 'Features',
      accessorKey: 'features',
      cell: ({ getValue }: any) => {
        const features = getValue();

        return (
          <div className="flex justify-center items-center gap-2 px-4">
            {features?.map((v: any) => {
              if (!featuresLookUp[v]) return;
              return (
                <CustomTooltip text={featuresObj[v]} side="top">
                  <img
                    key={v}
                    src={featuresLookUp[v]}
                    alt={`${featuresLookUp[v]}`}
                    width={24}
                    height={24}
                  />
                </CustomTooltip>
              );
            })}
          </div>
        );
      },
      meta: {
        textAlign: 'center',
      },
    },
    {
      header: 'Site',
      accessorKey: 'type',
      cell: ({ row: { original: _val } }: any) => {
        return _val?.Site?.name ?? '--';
      },
    },
    // {
    //   header: 'Status',
    //   accessorKey: 'did_status_response',
    //   cell: ({ getValue }: any) => {
    //     console.log('getValue',getValue())
    //     if (!getValue()) {
    //       return '--';
    //     }
    //     return getValue()?? '';
    //   },
    // },
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

        const assignNumberAction =
          !data?.User && virtualNumberAccess?.action?.assign_number
            ? [
                createAction(
                  2,
                  'Assign Number',
                  'AssignNumberIcon',
                  'w-5 h-5',
                  'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
                  'assignDID',
                ),
              ]
            : [];

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
                ...assignNumberAction,
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

        const removeAssignmentAction =
          data?.User && virtualNumberAccess?.action?.assign_number
            ? [
                createAction(
                  2,
                  'Remove Assignment',
                  'RemoveAssignmentLine',
                  'w-5 h-5 ',
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

        const faxActions = data?.User ? removeAssignmentAction : assignNumberAction;

        const actions = data?.is_fax_enabled
          ? faxActions
          : [
              ...removeAssignmentAction,
              ...setForwardingActions,
              ...updateForwardingActions,
              ...releaseNumberAction,
            ];

        // If actions are empty, show ---
        if (actions?.length === 0) {
          return '---';
        }

        return (
          <div className="flex items-center justify-end w-full gap-2">
            {actions?.map((action) => {
              return (
                <CustomTooltip key={action.id} text={action.tooltipText} side="top">
                  <div
                    className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8 ${action.className}`}
                    onClick={action.cb}
                  >
                    <Icon name={action.icon as IconName} className={action.iconClass} />
                  </div>
                </CustomTooltip>
              );
            })}
          </div>
        );
      },
    },
  ];

  const handleAllNumberState = (data: any, key: string) => {
    setAllNumberState((prev) => ({ ...prev, [key]: true, selectedDID: data }));
  };
  return (
    <>
      <AdminPage
        section="Numbers"
        title="All numbers"
        description="Every number on the account, whether it is assigned, routed or sitting unused."
        actions={
          !isTrial && virtualNumberAccess?.action?.buy ? (
            <button type="button" className="btn primary" onClick={handleAddNumber}>
              <Plus className="w-3 h-3" />
              Add number
            </button>
          ) : null
        }
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
          <p className="text-gray-900 text-sm">
            Adding an additional number to an existing user/plan will only incur a charge for the
            phone number itself. This action does not create a new subscription or user plan. Your
            monthly recurring total will be updated based on the quantity of numbers added.
          </p>
          <TableManager
            {...{
              fetcherKey: 'allNumbersList',
              fetcherFn: allNumbersList,
              columns,
              search,
              emptyTablePlaceholder: 'No numbers available',
            }}
          />

          {openDrawer && (
            <SideDrawer
              width="min(1040px, 84vw)"
              title="Add Number"
              isOpen={openDrawer}
              isTab={false}
              enableResponsive
              handleClose={() => setOpenDrawer(false)}
              content={<AddNumber handleClose={() => setOpenDrawer(false)} />}
            />
          )}
        </div>
      </AdminPage>
      {allNumberState.updateForwarding && (
        <SideDrawer
          width="min(1040px, 84vw)"
          isOpen={allNumberState.updateForwarding}
          title="Update Forwarding"
          handleClose={() =>
            setAllNumberState((prev) => ({ ...prev, updateForwarding: false, selectedDID: null }))
          }
          isTab={false}
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
              !!allNumberState.selectedDID?.User ||
              !!allNumberState.selectedDID?.forward_call_actions
                ? ' You must remove the assignment or forwarding before releasing this DID number.'
                : 'Are you sure you want to release this DID number? This action cannot be undone.',
            confirmBtnDisabled:
              !!allNumberState.selectedDID?.User ||
              !!allNumberState.selectedDID?.forward_call_actions,
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
    </>
  );
};

export default AllNumbers;

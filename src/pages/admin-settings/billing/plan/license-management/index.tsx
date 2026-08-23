import { CloseIcon } from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import SideDrawer from '@/components/custom/side-drawer';
import TableManager from '@/components/custom/table-manager';
import PaymentScreen from '@/components/payment';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CARDS_TYPE } from '@/constants/common-const';
import { useUser } from '@/hooks/use-user';
import { getFullFormateDate, handleAlert } from '@/lib/utils';
import AddUsers from '@/pages/admin-settings/users/extension/add-users';
import {
  getLicenseUserList,
  getTaxesAndFees,
  purchaseLicenses,
  revokeLicense,
} from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { FC, useMemo, useRef, useState } from 'react';

const LicenseManagement: FC<any> = ({ dataGetMyPlanDetails, restrictPlan }) => {
  const [showCounter, setShowCounter] = useState(false);
  const [isDowngradClicked, setIsDowngradClicked] = useState(false);
  const [count, setCount] = useState(1);
  const [isPaymentInitiate, setIsPaymentInitiate] = useState(false);
  const [drawerState, setDrawerState] = useState<any>({
    addUser: false,
  });
  const [deleteUserState, setDeleteUserState] = useState<any>({
    isOpen: false,
    selectedUser: null,
    type: null,
  });
  const queryClient: any = useQueryClient();
  const paymentRef = useRef<any>(null);
  const { user: userInfo } = useUser();
  const { data: getTaxes = {}, isLoading } = useQuery({
    queryKey: ['getDepartmentAndCallLogs', count],
    queryFn: () =>
      getTaxesAndFees({
        company_uuid: userInfo?.company_info?.uuid,
        licenses: count,
      }),
    select: (data) => data?.data?.data?.result || {},
    enabled: count > 0 && showCounter,
  });
  const isPlanExpired = dataGetMyPlanDetails?.current_plan_details?.plan_status === 'EXPIRED';
  const isTrial = dataGetMyPlanDetails?.current_plan_details?.is_trial === 'Y';

  const maxLicenses =
    dataGetMyPlanDetails?.current_plan_details?.licenses_limit === 0
      ? null
      : dataGetMyPlanDetails?.current_plan_details?.licenses_limit || 50;

  const totalLicenses = dataGetMyPlanDetails?.license_detail?.total_licenses || 0;
  const availableLicenses = maxLicenses !== null ? Math.max(0, maxLicenses - totalLicenses) : null;

  // const planCost = dataGetMyPlanDetails?.current_plan_details?.discount_enabled
  //   ? dataGetMyPlanDetails?.current_plan_details?.discount_price
  //   : dataGetMyPlanDetails?.current_plan_details?.original_price;
  // const planExpiration = dataGetMyPlanDetails?.current_plan_details?.plan_expiration_date;

  // const proratedCost = getLicenseCalculatedPlanCost({
  //   planCost,
  //   plan_expiration_date: planExpiration,
  // });

  // const totalAmountPayable = count * +proratedCost;
  // const taxPercentage = Number(dataGetMyPlanDetails?.last_billing?.tax_detail?.tax_percentage ?? 0);
  // const totalTax = (taxPercentage * (totalAmountPayable ?? 0)) / 100;
  // const totalAmountIncludingTax = totalAmountPayable + totalTax;
  const { mutate: mutateDeleteUser, isPending } = useMutation({
    mutationKey: ['revokeLicense'],
    mutationFn: revokeLicense,
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries(['getLicenseUserList'], { exact: true });
      // handleAlert({
      //   text: data?.data?.message || 'License revoked successfully',
      //   type: 'success',
      // });
      setDeleteUserState({ isOpen: false, selectedUser: data });
    },
  });

  const { mutate: mutatePurchaseLicense, isPending: isPurchasePending } = useMutation({
    mutationKey: ['purchaseLicenses'],
    mutationFn: purchaseLicenses,
    onSuccess: ({ data }) => {
      const result = data?.data?.result;
      if (result?.requires_action || result?.status === 'requires_action') {
        paymentRef.current?.handle3DSPayment(
          result?.client_secret || result?.payment_intent || result?.payment_intent_id,
        );
        return;
      }

      paymentSuccess(data);
    },
  });

  const onSuccessPayment = (data: any) => {
    if (availableLicenses !== null && count > availableLicenses) {
      handleAlert({
        text: `You can only add ${availableLicenses} more license(s). Your current total is ${totalLicenses} out of ${maxLicenses} maximum.`,
        type: 'error',
      });
      queryClient.invalidateQueries(['getMyPlanDetails'], { exact: true });
      setIsPaymentInitiate(false);
      return;
    }

    const isNewCardRequest = data?.paymentType === 'NEW_CARD';
    const amount = getTaxes?.total_amount || 0;
    const payload = {
      licenses: count,
      payment: {
        tax_calculation_id: getTaxes?.tax_calculation_id,
        type: isNewCardRequest ? CARDS_TYPE.NEW_CARD : CARDS_TYPE.SAVED_CARD,
        charge_amount: amount,
        ...(isNewCardRequest ? { payment_method_id: data?.id } : { card_id: data?.uuid }),
      },
    };
    mutatePurchaseLicense(payload);
  };

  const paymentSuccess = (data: any) => {
    paymentRef.current?.resetPaymentState();
    handleAlert({
      text: data?.data?.message || 'Licenses purchased successfully',
      type: 'success',
    });
    setIsPaymentInitiate(false);
    setCount(1);
    setShowCounter(false);
    queryClient.invalidateQueries(['getUsersDetails', 'getLicenseUserList', 'getMyPlanDetails'], {
      exact: true,
    });
  };
  const handleAddUsers = () => {
    if (isPlanExpired) {
      handleAlert({
        text: 'You cannot add users until your subscription is renewed.',
        type: 'error',
      });
      return;
    }
    if (isTrial) {
      handleAlert({
        text: 'This feature is not available in your current plan. Please upgrade',
        type: 'error',
      });
      return;
    }
    setDrawerState((prev: any) => ({ ...prev, addUser: true }));
  };
  const columns: ColumnDef<any>[] = useMemo(() => {
    return [
      {
        header: 'Name',
        accessorKey: 'first_name',
        cell: ({ row }) => {
          const data = row?.original;
          const fullName = `${data?.user?.first_name}${data?.user?.last_name ? ` ${data?.user.last_name}` : ''}`;
          const user_uuid = row?.original?.user_uuid;
          if (!user_uuid) {
            return (
              <div className="flex items-center justify-between  gap-2">
                <div className="flex flex-col items-start">
                  <p className="capitalize font-medium">License</p>
                  <p className="text-xs text-gray-600">
                    Purchased At: {data?.createdAt ? getFullFormateDate(data?.createdAt) : 'NA'}
                  </p>
                </div>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2 w-full">
              <div className="flex ">
                <CustomAvatar
                  name={fullName}
                  showPresence
                  extension={data?.user?.extension}
                  image={data?.user?.profile}
                />
              </div>
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between  gap-2">
                  <div className="flex flex-col items-start ">
                    <p className="capitalize">{fullName}</p>
                    <small className="text-primary text-[10px]">
                      {data?.user?.custom_role_data?.name ||
                        data?.user?.role_data?.name ||
                        data?.user?.role}
                    </small>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Icon name="Grid" className="w-4 h-4 " />
                    <div>{data?.user?.extension}</div>
                  </div>
                </div>
                <p className="text-gray-500 flex justify-between">
                  <div>{data?.user?.email}</div>
                </p>
              </div>
            </div>
          );
        },
      },
      {
        header: 'Actions',
        accessorKey: 'action',
        cell: ({ row }: any) => {
          const data = row?.original;
          const user_uuid = row?.original?.user_uuid;
          if (data?.is_license_revoked && !isDowngradClicked && !user_uuid) {
            return (
              <CustomTooltip text="Licence will be deleted from next billing." side="top">
                <div className="cursor-pointer bg-gray-200 border-transparent flex items-center justify-center rounded-full w-8 h-8">
                  <Icon name={'NoticeLine'} className={`w-5 h-5}`} />
                </div>
              </CustomTooltip>
            );
          }
          if (!data?.is_license_revoked && !user_uuid) {
            return (
              <CustomTooltip text="Assign License" side="top">
                <div
                  className="cursor-pointer bg-green-100 text-green-600 hover:bg-green-600 hover:text-white flex items-center justify-center rounded-full w-8 h-8"
                  onClick={handleAddUsers}
                >
                  <Icon name="Plus" className="w-3 h-3" />
                </div>
              </CustomTooltip>
            );
          }

          if (data?.is_license_revoked) {
            return (
              <div className="flex items-center justify-end gap-1">
                <CustomTooltip text="Revert license revoke" side="top">
                  <div
                    onClick={() => {
                      if (userInfo?.uuid === data?.user?.uuid) return;
                      setDeleteUserState({ isOpen: true, selectedUser: data, type: 'revert' });
                    }}
                    className="cursor-pointer bg-gray-200 border-transparent flex items-center justify-center rounded-full w-8 h-8 hover:bg-black hover:text-white"
                  >
                    <Icon name={'UndoIcon'} className={`w-5 h-5}`} />
                  </div>
                </CustomTooltip>
                <CustomTooltip text="Licence will be deleted from next billing." side="top">
                  <div className="cursor-pointer bg-gray-200 border-transparent flex items-center justify-center rounded-full w-8 h-8">
                    <Icon name={'NoticeLine'} className={`w-5 h-5}`} />
                  </div>
                </CustomTooltip>
              </div>
            );
          }

          if (isDowngradClicked) {
            return (
              <CustomTooltip text="Delete" side="top">
                <div
                  className={` hover:bg-red-500 ${userInfo?.uuid === data?.user?.uuid ? 'cursor-not-allowed bg-gray-100 text-gray-900/80' : `cursor-pointer bg-red-100 text-red-500`}  hover:text-white flex items-center justify-center rounded-full w-8 h-8`}
                  onClick={() => {
                    if (userInfo?.uuid === data?.user?.uuid) return;
                    setDeleteUserState({ isOpen: true, selectedUser: data, type: 'delete' });
                  }}
                >
                  <Icon name={'TrashBin'} className={`w-4 h-4}`} />
                </div>
              </CustomTooltip>
            );
          }

          return null;
        },
        meta: {
          textAlign: 'right',
        },
      },
    ];
  }, [isDowngradClicked]);
  return (
    <>
      <div className="h-full w-full  flex flex-col gap-2  overflow-y-auto pr-1">
        <div className="border border-grey-200 bg-gray-50 p-3 rounded-xl mt-2 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 ">
            <h4 className="font-semibold text-gray-900  text-sm w-1/2">Used License</h4>
            <h4 className="font-semibold text-gray-700 flex items-center justify-end gap-2  text-sm w-1/2">
              {dataGetMyPlanDetails?.license_detail?.used_licenses || 0}
            </h4>
          </div>
          <div className="flex items-center justify-between gap-3 ">
            <h4 className="font-semibold text-gray-900  text-sm w-1/2">Available License</h4>
            <h4 className="font-semibold text-gray-700 flex items-center justify-end gap-2  text-sm w-1/2">
              {dataGetMyPlanDetails?.license_detail?.free_licenses || 0}
            </h4>
          </div>
          <div className="flex items-center justify-between gap-3 ">
            <h4 className="font-semibold text-gray-900  text-sm w-1/2">Revoked License</h4>
            <h4 className="font-semibold text-gray-700 flex items-center justify-end gap-2  text-sm w-1/2">
              {dataGetMyPlanDetails?.license_detail?.revoked_licenses || 0}
            </h4>
          </div>
          <div className="flex items-center justify-between gap-3 ">
            <h4 className="font-semibold text-gray-900  text-sm w-1/2">Total License</h4>
            <h4 className="font-semibold text-gray-700 flex items-center justify-end gap-2  text-sm w-1/2">
              {dataGetMyPlanDetails?.license_detail?.total_licenses || 0}
            </h4>
          </div>
          {!showCounter &&
            !isDowngradClicked &&
            dataGetMyPlanDetails?.current_plan_details?.is_trial == 'N' && (
              <div className="w-full flex items-center gap-2 justify-end border-t border-grey-200 pt-2 mt-2">
                <Button
                  onClick={() => {
                    if (restrictPlan === 'DOWNGRADE') {
                      handleAlert({
                        text: 'You cannot downgrade your plan as you have pending plan request.',
                        type: 'error',
                      });
                    } else {
                      setIsDowngradClicked(true);
                    }
                  }}
                  variant={'outline'}
                  size={'sm'}
                >
                  Downgrade
                </Button>
                <Button
                  onClick={() => {
                    if (restrictPlan === 'DOWNGRADE') {
                      handleAlert({
                        text: 'You cannot upgrade your plan as you have pending plan request.',
                        type: 'error',
                      });
                    } else {
                      setShowCounter(true);
                    }
                  }}
                  variant={'outline'}
                  size={'sm'}
                >
                  Upgrade
                </Button>
              </div>
            )}

          {showCounter && (
            <>
              <div className="w-full flex items-center gap-2 justify-between mt-2">
                <h4 className="font-semibold text-gray-900  text-sm w-1/2">Number of Licenses</h4>
                <div className="w-full flex items-center gap-2 justify-end ">
                  <button
                    onClick={() => {
                      if (count > 1) {
                        setCount((prev) => prev - 1);
                      }
                    }}
                    type="button"
                    disabled={count === 1}
                    className="cursor-pointer text-white font-semibold h-8 w-8 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center"
                  >
                    <Icon name="Minus" />
                  </button>
                  <p className="text-grey-800 font-semibold text-lg">{count}</p>
                  <button
                    disabled={availableLicenses !== null && count >= availableLicenses}
                    onClick={() => {
                      if (availableLicenses !== null && count >= availableLicenses) {
                        handleAlert({
                          text: `You can only add ${availableLicenses} more license(s). Your current total is ${totalLicenses} out of ${maxLicenses} maximum.`,
                          type: 'warning',
                        });
                        return;
                      }
                      setCount((prev) => prev + 1);
                    }}
                    type="button"
                    className={`${
                      availableLicenses !== null && count >= availableLicenses
                        ? 'cursor-not-allowed bg-gray-400 hover:bg-gray-400'
                        : 'cursor-pointer bg-primary hover:bg-primary/90'
                    } text-white font-semibold h-8 w-8 rounded-full flex items-center justify-center`}
                  >
                    <Icon name="Plus" className="h-10" />
                  </button>

                  <Button onClick={() => setShowCounter(false)} variant={'secondary'} size="sm">
                    Cancel
                  </Button>
                  <Button
                    variant={'outline'}
                    size="sm"
                    onClick={() => {
                      if (availableLicenses !== null && count > availableLicenses) {
                        handleAlert({
                          text: `You can only add ${availableLicenses} more license(s). Your current total is ${totalLicenses} out of ${maxLicenses} maximum.`,
                          type: 'warning',
                        });
                        return;
                      }
                      setIsPaymentInitiate(true);
                    }}
                  >
                    Pay
                  </Button>
                </div>
              </div>
              <div className="border border-grey-100 bg-white p-3 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 ">
                  <div className="font-medium text-gray-500  text-sm w-1/2">Monthly Cost</div>
                  <div className="font-semibold text-gray-700 flex items-center justify-end gap-2  text-sm w-1/2">
                    {isLoading ? (
                      <Skeleton className="h-3 w-[55px] bg-gray-200" />
                    ) : (
                      <>${getTaxes?.plan_cost || 0}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 ">
                  <div className="font-medium text-gray-500  text-sm w-1/2 flex items-center gap-2">
                    Prorated Amount
                    <CustomTooltip
                      text="Calculated based on the remaining days until your next billing date."
                      side="top"
                    >
                      <span>
                        <Icon name={'NoticeLine'} className={`w-4 h-4 cursor-pointer}`} />
                      </span>
                    </CustomTooltip>
                  </div>
                  <div className="font-semibold text-gray-700 flex items-center justify-end gap-2  text-sm w-1/2">
                    {isLoading ? (
                      <Skeleton className="h-3 w-[150px] bg-gray-200" />
                    ) : (
                      <>
                        ${getTaxes?.per_license_cost || 0} X {count} = ${getTaxes?.sub_total || 0}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 ">
                  <div className="font-medium text-gray-500  text-sm w-1/2">Total Tax</div>
                  <div className="font-semibold text-gray-700 flex items-center justify-end gap-1 text-sm w-1/2">
                    {isLoading ? (
                      <Skeleton className="h-3 w-[90px] bg-gray-200" />
                    ) : (
                      <>
                        ${getTaxes?.tax_amount || 0}
                        <span className="font-normal">
                          ({Number(getTaxes?.tax_percentage ?? 0)}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-2">
                  <div className="font-medium text-gray-700  text-sm w-1/2">
                    Total Payable Amount
                  </div>
                  <div className="font-semibold text-gray-700 flex items-center justify-end gap-2  text-sm w-1/2">
                    {isLoading ? (
                      <Skeleton className="h-3 w-[55px] bg-gray-200" />
                    ) : (
                      <>${getTaxes?.total_amount || 0}</>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          {isDowngradClicked && (
            <div className="w-full flex items-center gap-2 justify-end mt-2">
              <Button onClick={() => setIsDowngradClicked(false)} variant={'secondary'} size="sm">
                Cancel
              </Button>
            </div>
          )}
        </div>

        <TableManager
          {...{
            columns,
            fetcherKey: 'getLicenseUserList',
            fetcherFn: getLicenseUserList,
            isHeightSet: false,
            extraParams: {
              limit: 999,
            },
            customClass: 'h-auto overflow-visible',
            showPagination: false,
          }}
        />
      </div>
      {deleteUserState?.isOpen && (
        <AlertConfirm
          {...{
            apiLoading: isPending,
            descriptionTextComp:
              deleteUserState?.type == 'delete'
                ? 'Are you sure you want to delete licence(s) from next billing?'
                : 'Are you sure you want to retrieve this license and make it available again?',
            onConfirm: () => {
              mutateDeleteUser({
                licenses: [
                  {
                    company_license_uuid: deleteUserState?.selectedUser?.uuid,
                    user_uuid: deleteUserState?.selectedUser?.user_uuid,
                  },
                ],
                revoke: deleteUserState?.type !== 'revert',
              });
            },
            open: deleteUserState?.isOpen,
            setOpen: () => {
              setDeleteUserState({ isOpen: false, selectedUser: null });
            },
            headerText: deleteUserState?.type == 'delete' ? 'Delete Licence' : 'Retrieve License',
          }}
        />
      )}
      {drawerState.addUser && (
        <SideDrawer
          isOpen={drawerState.addUser}
          title="Add Users"
          isTab={false}
          handleClose={() => setDrawerState({ addUser: false })}
          content={
            <AddUsers
              setDrawerState={(val) => setDrawerState((prev: any) => ({ ...prev, addUser: val }))}
            />
          }
        />
      )}
      {isPaymentInitiate && (
        <Dialog open={isPaymentInitiate} onOpenChange={setIsPaymentInitiate}>
          <DialogContent
            className="w-2/5 p-3 max-h-[99%] overflow-y-auto bg-white"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            showCloseButton={false}
          >
            <div className="flex flex-col gap-1.5  text-900/80">
              <div className="font-semibold truncate text-md flex items-center justify-between">
                Purchase License
                <div
                  onClick={() => setIsPaymentInitiate(false)}
                  className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
                >
                  <CloseIcon className="w-3 h-3" />
                </div>
              </div>
            </div>
            <div className="px-3">
              <PaymentScreen
                ref={paymentRef}
                onSuccessPayment={onSuccessPayment}
                isSavedPaymentCard={false}
                onSuccess3dsPayment={() => paymentSuccess(null)}
                onFailure3dsPayment={() => setIsPaymentInitiate(false)}
                isApiLoad={isPurchasePending}
                submitButtonText={`Pay $${getTaxes?.total_amount || 0}`}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default LicenseManagement;

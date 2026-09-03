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
import { formatMoney, knownNumber, moneyOrUnavailable } from '@/lib/billing-money';
import AddUsers from '@/pages/admin-settings/people/add-users';
import {
  getLicenseUserList,
  getTaxesAndFees,
  purchaseLicenses,
  revokeLicense,
} from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import { FC, useMemo, useRef, useState } from 'react';

type ConfirmType = 'delete' | 'revert' | 'bulk-idle';

interface ConfirmState {
  isOpen: boolean;
  type: ConfirmType | null;
  selectedUser: any;
  licenses: { company_license_uuid: string; user_uuid?: string | null }[];
}

const EMPTY_CONFIRM: ConfirmState = {
  isOpen: false,
  type: null,
  selectedUser: null,
  licenses: [],
};

const formatBillingDate = (value: any) =>
  value && moment(value).isValid() ? moment(value).format('DD MMM YYYY') : 'your next renewal date';

const currency = (value: unknown) => moneyOrUnavailable(value);

const LicenseManagement: FC<any> = ({ dataGetMyPlanDetails, restrictPlan }) => {
  const [showCounter, setShowCounter] = useState(false);
  const [isDowngradClicked, setIsDowngradClicked] = useState(false);
  const [count, setCount] = useState(1);
  const [isPaymentInitiate, setIsPaymentInitiate] = useState(false);
  const [drawerState, setDrawerState] = useState<any>({
    addUser: false,
  });
  const [confirmState, setConfirmState] = useState<ConfirmState>(EMPTY_CONFIRM);
  const queryClient: any = useQueryClient();
  const paymentRef = useRef<any>(null);
  const { user: userInfo } = useUser();
  const { data: getTaxes = {}, isLoading } = useQuery({
    queryKey: ['getLicenseTaxesAndFees', count],
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

  const licenseDetail = dataGetMyPlanDetails?.license_detail || {};
  const totalLicenses = Number(licenseDetail?.total_licenses || 0);
  const usedLicenses = Number(licenseDetail?.used_licenses || 0);
  /** Paid for, not revoked, nobody assigned. These are the seats that quietly cost money. */
  const idleLicenses = Number(licenseDetail?.free_licenses || 0);
  const revokedLicenses = Number(licenseDetail?.revoked_licenses || 0);
  const idleRevokedLicenses = Number(licenseDetail?.free_revoked_licenses || 0);
  const payableLicenses = Number(
    licenseDetail?.payable_licenses ?? Math.max(0, totalLicenses - revokedLicenses),
  );
  const availableLicenses = maxLicenses !== null ? Math.max(0, maxLicenses - totalLicenses) : null;

  /* Read before converting. `Number(null)` is 0, and a seat price of zero says
     "this seat is free" — which is the opposite of what somebody removing a seat
     needs to hear, and the sort of sentence that gets quoted back at us. */
  const perSeatPrice = knownNumber(dataGetMyPlanDetails?.next_billing_details?.original_price);
  const nextBillingDate = dataGetMyPlanDetails?.next_billing_details?.next_billing_date;
  const nextBillingDateLabel = formatBillingDate(nextBillingDate);
  const periodLabel =
    Number(dataGetMyPlanDetails?.current_plan_details?.plan_duration) === 12 ? 'year' : 'month';
  const idleSeatCost = perSeatPrice === null ? null : idleLicenses * perSeatPrice;

  /* What comes off the bill when seats are removed, as a phrase for the middle
     of a sentence. Without a per-seat price the phrase drops the figure rather
     than printing $0.00. */
  const offTheBill = (seats: number, fallback: string): string => {
    const total = perSeatPrice === null ? null : formatMoney(seats * perSeatPrice);
    return total ? `${total} per ${periodLabel}` : fallback;
  };

  /**
   * Every licence row with no user sorts to the end of the server-side list
   * (the API orders `CASE WHEN user.uuid IS NULL THEN 1 ELSE 0 END ASC`), so on a
   * large tenant the unused seats land on the very last page and an admin never
   * sees them. We fetch just that tail so the wasted seats are always in view.
   */
  const unassignedRowCount = idleLicenses + idleRevokedLicenses;

  const { data: licenseRowTotal = 0 } = useQuery({
    queryKey: ['getLicenseUserList', 'row-total'],
    queryFn: () => getLicenseUserList({ page: 1, limit: 1 }),
    select: (data) => Number(data?.data?.data?.result?.total || 0),
    enabled: unassignedRowCount > 0,
  });

  const tailPage =
    unassignedRowCount > 0 && licenseRowTotal > 0
      ? Math.ceil(licenseRowTotal / unassignedRowCount)
      : 0;

  const { data: idleSeats = [], isLoading: isIdleSeatsLoading } = useQuery({
    queryKey: ['getLicenseUserList', 'idle-seats', tailPage, unassignedRowCount],
    queryFn: async () => {
      const pages = tailPage > 1 ? [tailPage - 1, tailPage] : [tailPage];
      const responses = await Promise.all(
        pages.map((page) => getLicenseUserList({ page, limit: unassignedRowCount })),
      );
      const seen = new Set<string>();
      const rows: any[] = [];
      responses.forEach((response) => {
        (response?.data?.data?.result?.rows || []).forEach((row: any) => {
          if (row?.user_uuid || row?.is_license_revoked) return;
          if (!row?.uuid || seen.has(row.uuid)) return;
          seen.add(row.uuid);
          rows.push(row);
        });
      });
      return rows;
    },
    enabled: unassignedRowCount > 0 && tailPage > 0,
  });

  const idleSeatRows: any[] = Array.isArray(idleSeats) ? idleSeats : [];

  const invalidateLicenseData = () => {
    queryClient.invalidateQueries({ queryKey: ['getLicenseUserList'] });
    queryClient.invalidateQueries({ queryKey: ['getMyPlanDetails'] });
    queryClient.invalidateQueries({ queryKey: ['getUsersDetails'] });
  };

  const { mutate: mutateRevokeLicense, isPending } = useMutation({
    mutationKey: ['revokeLicense'],
    mutationFn: revokeLicense,
    onSuccess: () => {
      invalidateLicenseData();
      handleAlert({
        text:
          confirmState?.type === 'revert'
            ? 'Seat restored. It stays on your plan and on your bill.'
            : `Seat removal scheduled. It leaves your plan on ${nextBillingDateLabel}.`,
        type: 'success',
      });
      setConfirmState(EMPTY_CONFIRM);
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
      queryClient.invalidateQueries({ queryKey: ['getMyPlanDetails'] });
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
    invalidateLicenseData();
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

  const openRevokeConfirm = (row: any, type: ConfirmType) => {
    setConfirmState({
      isOpen: true,
      type,
      selectedUser: row,
      licenses: [
        {
          company_license_uuid: row?.uuid,
          user_uuid: row?.user_uuid,
        },
      ],
    });
  };

  const openBulkIdleConfirm = () => {
    if (!idleSeatRows.length) return;
    setConfirmState({
      isOpen: true,
      type: 'bulk-idle',
      selectedUser: null,
      licenses: idleSeatRows.map((row: any) => ({ company_license_uuid: row?.uuid })),
    });
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
                  <p className="capitalize font-medium">
                    Unassigned seat
                    {!data?.is_license_revoked && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 align-middle">
                        Paid for, nobody using it
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#9A948F]">
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
                  <div className="flex items-center gap-1 text-[#9A948F]">
                    <Icon name="Grid" className="w-4 h-4 " />
                    <div>{data?.user?.extension}</div>
                  </div>
                </div>
                <div className="text-[#9A948F] flex justify-between">
                  <div>{data?.user?.email}</div>
                </div>
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
          const revokedNoticeText = user_uuid
            ? `Scheduled for removal. This seat leaves your plan on ${nextBillingDateLabel}. Until then this person keeps full access — on that date their account is deactivated.`
            : `Scheduled for removal. This seat leaves your plan on ${nextBillingDateLabel}.`;

          if (data?.is_license_revoked && !isDowngradClicked && !user_uuid) {
            return (
              <CustomTooltip text={revokedNoticeText} side="top">
                <div className="cursor-pointer bg-[#F0DFC5] border-transparent flex items-center justify-center rounded-full w-8 h-8">
                  <Icon name={'NoticeLine'} className={`w-5 h-5}`} />
                </div>
              </CustomTooltip>
            );
          }
          if (!data?.is_license_revoked && !user_uuid) {
            return (
              <CustomTooltip text="Assign this paid seat to a user" side="top">
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
                <CustomTooltip text="Keep this seat (cancel the scheduled removal)" side="top">
                  <div
                    onClick={() => {
                      if (userInfo?.uuid === data?.user?.uuid) return;
                      openRevokeConfirm(data, 'revert');
                    }}
                    className="cursor-pointer bg-[#F0DFC5] border-transparent flex items-center justify-center rounded-full w-8 h-8 hover:bg-black hover:text-white"
                  >
                    <Icon name={'UndoIcon'} className={`w-5 h-5}`} />
                  </div>
                </CustomTooltip>
                <CustomTooltip text={revokedNoticeText} side="top">
                  <div className="cursor-pointer bg-[#F0DFC5] border-transparent flex items-center justify-center rounded-full w-8 h-8">
                    <Icon name={'NoticeLine'} className={`w-5 h-5}`} />
                  </div>
                </CustomTooltip>
              </div>
            );
          }

          if (isDowngradClicked) {
            return (
              <CustomTooltip text="Remove this seat from the next bill" side="top">
                <div
                  className={` hover:bg-red-500 ${userInfo?.uuid === data?.user?.uuid ? 'cursor-not-allowed bg-[#FBE2C8]/40 text-[#2E2D35]/80' : `cursor-pointer bg-red-100 text-red-500`}  hover:text-white flex items-center justify-center rounded-full w-8 h-8`}
                  onClick={() => {
                    if (userInfo?.uuid === data?.user?.uuid) return;
                    openRevokeConfirm(data, 'delete');
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
  }, [isDowngradClicked, nextBillingDateLabel, userInfo?.uuid]);

  const confirmIsAssigned = Boolean(confirmState?.selectedUser?.user_uuid);
  const confirmUserName = confirmState?.selectedUser?.user
    ? `${confirmState.selectedUser.user?.first_name || ''} ${
        confirmState.selectedUser.user?.last_name || ''
      }`.trim() || 'This user'
    : 'This user';

  const renderConfirmBody = () => {
    if (confirmState?.type === 'revert') {
      return (
        <span className="block text-sm text-[#2E2D35]">
          This seat is currently scheduled to be removed on {nextBillingDateLabel}. Keeping it means
          it stays on your plan and you keep paying {offTheBill(1, 'for')} it.
        </span>
      );
    }

    if (confirmState?.type === 'bulk-idle') {
      return (
        <span className="block text-sm text-[#2E2D35]">
          <span className="block font-medium text-[#2E2D35]">
            Remove {confirmState.licenses.length} unused seat
            {confirmState.licenses.length === 1 ? '' : 's'} from your plan?
          </span>
          <span className="block mt-2">
            Nobody is assigned to these seats. Removing them takes{' '}
            {offTheBill(confirmState.licenses.length, 'what they cost')} off your bill from{' '}
            {nextBillingDateLabel}.
          </span>
          <span className="block mt-2 text-[#9A948F]">
            The current billing period is not refunded. You can undo this at any time before{' '}
            {nextBillingDateLabel}.
          </span>
        </span>
      );
    }

    if (confirmIsAssigned) {
      return (
        <span className="block text-sm text-[#2E2D35]">
          <span className="block font-medium text-[#2E2D35]">
            {confirmUserName} is still using this seat.
          </span>
          <span className="block mt-2">
            Removing it takes {offTheBill(1, 'what it costs')} off your bill from{' '}
            {nextBillingDateLabel}.
          </span>
          <span className="block mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-amber-900">
            Until {nextBillingDateLabel}, {confirmUserName} keeps full access to the platform —
            removing the seat does not lock them out now, and the seat cannot be reassigned to
            somebody else in the meantime. On {nextBillingDateLabel} the seat is deleted and{' '}
            {confirmUserName}&apos;s account is deactivated.
          </span>
          <span className="block mt-2 text-[#9A948F]">
            The current billing period is not refunded. You can undo this at any time before{' '}
            {nextBillingDateLabel}.
          </span>
        </span>
      );
    }

    return (
      <span className="block text-sm text-[#2E2D35]">
        <span className="block font-medium text-[#2E2D35]">
          Remove this unused seat from your plan?
        </span>
        <span className="block mt-2">
          Nobody is assigned to it. Removing it takes {offTheBill(1, 'what it costs')} off your bill
          from {nextBillingDateLabel}.
        </span>
        <span className="block mt-2 text-[#9A948F]">
          The current billing period is not refunded. You can undo this at any time before{' '}
          {nextBillingDateLabel}.
        </span>
      </span>
    );
  };

  return (
    <>
      <div className="h-full w-full  flex flex-col gap-2  overflow-y-auto pr-1">
        <div className="border border-grey-200 bg-[#FBE2C8]/45 p-3 rounded-xl mt-2 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 ">
            <h4 className="font-semibold text-[#2E2D35]  text-sm w-1/2">Seats in use</h4>
            <h4 className="font-semibold text-[#2E2D35] flex items-center justify-end gap-2  text-sm w-1/2">
              {usedLicenses}
            </h4>
          </div>
          <div className="flex items-center justify-between gap-3 ">
            <h4 className="font-semibold text-[#2E2D35]  text-sm w-1/2 flex items-center gap-2">
              Paid but unassigned
              <CustomTooltip
                text="Seats you are paying for that nobody is assigned to. Deleting a user puts their seat here — it does not stop the charge."
                side="top"
              >
                <span>
                  <Icon name={'NoticeLine'} className="w-4 h-4 cursor-pointer" />
                </span>
              </CustomTooltip>
            </h4>
            <h4
              className={`font-semibold flex items-center justify-end gap-2 text-sm w-1/2 ${
                idleLicenses > 0 ? 'text-amber-700' : 'text-[#2E2D35]'
              }`}
            >
              {idleLicenses}
            </h4>
          </div>
          <div className="flex items-center justify-between gap-3 ">
            <h4 className="font-semibold text-[#2E2D35]  text-sm w-1/2 flex items-center gap-2">
              Scheduled for removal
              <CustomTooltip
                text={`These seats leave your plan on ${nextBillingDateLabel}. They are already excluded from your next bill.`}
                side="top"
              >
                <span>
                  <Icon name={'NoticeLine'} className="w-4 h-4 cursor-pointer" />
                </span>
              </CustomTooltip>
            </h4>
            <h4 className="font-semibold text-[#2E2D35] flex items-center justify-end gap-2  text-sm w-1/2">
              {revokedLicenses}
            </h4>
          </div>
          <div className="flex items-center justify-between gap-3 ">
            <h4 className="font-semibold text-[#2E2D35]  text-sm w-1/2">Total seats on plan</h4>
            <h4 className="font-semibold text-[#2E2D35] flex items-center justify-end gap-2  text-sm w-1/2">
              {totalLicenses}
            </h4>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[#EEE7DD] pt-2">
            <h4 className="font-semibold text-[#2E2D35]  text-sm w-1/2 flex items-center gap-2">
              Seats you pay for next
              <CustomTooltip
                text={`Total seats minus seats scheduled for removal. Billed on ${nextBillingDateLabel}.`}
                side="top"
              >
                <span>
                  <Icon name={'NoticeLine'} className="w-4 h-4 cursor-pointer" />
                </span>
              </CustomTooltip>
            </h4>
            <h4 className="font-semibold text-[#2E2D35] flex items-center justify-end gap-2  text-sm w-1/2">
              {payableLicenses}
              {perSeatPrice !== null && perSeatPrice > 0 && (
                <span className="font-normal text-[#9A948F]">
                  ({currency(payableLicenses * perSeatPrice)}/{periodLabel})
                </span>
              )}
            </h4>
          </div>

          <p className="text-xs text-[#9A948F] leading-relaxed border-t border-[#EEE7DD] pt-2">
            A seat is something you buy, not something a user owns. Deleting a user in{' '}
            <span className="font-medium text-[#2E2D35]">Users</span> frees their seat but keeps it
            on your bill — you have to remove the seat here as well. Seat removals take effect on{' '}
            {nextBillingDateLabel}; the current period is never refunded.
          </p>

          {idleLicenses > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Icon name={'NoticeLine'} className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-amber-900">
                    You are paying for {idleLicenses} seat{idleLicenses === 1 ? '' : 's'} that
                    nobody is using
                    {idleSeatCost !== null && idleSeatCost > 0
                      ? ` — ${currency(idleSeatCost)} per ${periodLabel}`
                      : ''}.
                  </p>
                  <p className="text-xs text-amber-900/90 leading-relaxed">
                    Seats end up here when you delete a user, or when you buy more seats than you
                    assign. They stay on your bill until you remove them. Removing them now takes
                    them off the bill from {nextBillingDateLabel} — you can assign them to new users
                    instead, and you can undo a removal any time before that date.
                  </p>
                </div>
              </div>

              {isIdleSeatsLoading && <Skeleton className="h-8 w-full bg-amber-100" />}

              {!isIdleSeatsLoading && idleSeatRows.length > 0 && (
                <div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-white p-2">
                  {idleSeatRows.slice(0, 10).map((seat: any) => (
                    <div
                      key={seat?.uuid}
                      className="flex items-center justify-between gap-2 text-xs text-[#2E2D35] py-1"
                    >
                      <span>
                        Unassigned seat
                        <span className="text-[#9A948F]">
                          {' '}
                          · purchased{' '}
                          {seat?.createdAt ? getFullFormateDate(seat?.createdAt) : 'unknown'}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="cursor-pointer text-red-600 hover:underline font-medium"
                        onClick={() => openRevokeConfirm(seat, 'delete')}
                      >
                        Remove from bill
                      </button>
                    </div>
                  ))}
                  {idleSeatRows.length > 10 && (
                    <p className="text-[11px] text-[#9A948F] pt-1">
                      and {idleSeatRows.length - 10} more.
                    </p>
                  )}
                </div>
              )}

              {!isIdleSeatsLoading && idleSeatRows.length < idleLicenses && (
                <p className="text-[11px] text-amber-900/80">
                  Showing {idleSeatRows.length} of {idleLicenses} unused seats. Use{' '}
                  <span className="font-medium">Remove seats</span> below and page to the end of the
                  list to see the rest.
                </p>
              )}

              {idleSeatRows.length > 0 && (
                <div className="flex justify-end">
                  <Button variant={'outline'} size={'sm'} onClick={openBulkIdleConfirm}>
                    Remove {idleSeatRows.length} unused seat
                    {idleSeatRows.length === 1 ? '' : 's'} from next bill
                  </Button>
                </div>
              )}
            </div>
          )}

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
                  Remove seats
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
                  Buy seats
                </Button>
              </div>
            )}

          {showCounter && (
            <>
              <div className="w-full flex items-center gap-2 justify-between mt-2">
                <h4 className="font-semibold text-[#2E2D35]  text-sm w-1/2">Number of Licenses</h4>
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
              {idleLicenses > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  You already have {idleLicenses} paid seat{idleLicenses === 1 ? '' : 's'} that
                  nobody is using. You can assign {idleLicenses === 1 ? 'it' : 'them'} to new users
                  for free instead of buying more.
                </p>
              )}
              <div className="border border-grey-100 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 ">
                  <div className="font-medium text-[#9A948F]  text-sm w-1/2">Monthly Cost</div>
                  <div className="font-semibold text-[#2E2D35] flex items-center justify-end gap-2  text-sm w-1/2">
                    {isLoading ? (
                      <Skeleton className="h-3 w-[55px] bg-[#F0DFC5]" />
                    ) : (
                      <>${getTaxes?.plan_cost || 0}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 ">
                  <div className="font-medium text-[#9A948F]  text-sm w-1/2 flex items-center gap-2">
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
                  <div className="font-semibold text-[#2E2D35] flex items-center justify-end gap-2  text-sm w-1/2">
                    {isLoading ? (
                      <Skeleton className="h-3 w-[150px] bg-[#F0DFC5]" />
                    ) : (
                      /* A quote, so nothing here may fall back to zero: a
                         prorated amount of $0.00 reads as "these seats are free
                         until your next bill", and somebody would buy on it. */
                      <>
                        {moneyOrUnavailable(getTaxes?.per_license_cost)} X {count} ={' '}
                        {moneyOrUnavailable(getTaxes?.sub_total)}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 ">
                  <div className="font-medium text-[#9A948F]  text-sm w-1/2">Total Tax</div>
                  <div className="font-semibold text-[#2E2D35] flex items-center justify-end gap-1 text-sm w-1/2">
                    {isLoading ? (
                      <Skeleton className="h-3 w-[90px] bg-[#F0DFC5]" />
                    ) : (
                      <>
                        {moneyOrUnavailable(getTaxes?.tax_amount)}
                        {knownNumber(getTaxes?.tax_percentage) === null ? null : (
                          <span className="font-normal">({getTaxes.tax_percentage}%)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#EEE7DD] pt-2">
                  <div className="font-medium text-[#2E2D35]  text-sm w-1/2">
                    Total Payable Amount
                  </div>
                  <div className="font-semibold text-[#2E2D35] flex items-center justify-end gap-2  text-sm w-1/2">
                    {isLoading ? (
                      <Skeleton className="h-3 w-[55px] bg-[#F0DFC5]" />
                    ) : (
                      <>{moneyOrUnavailable(getTaxes?.total_amount)}</>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          {isDowngradClicked && (
            <div className="w-full flex flex-col gap-2 mt-2">
              <p className="text-xs text-[#9A948F] leading-relaxed bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] rounded-lg p-2">
                Pick the seats to take off your plan. Removals apply on {nextBillingDateLabel} and
                the current period is not refunded. Removing a seat that is{' '}
                <span className="font-medium">still assigned to someone</span> does not lock them
                out straight away — they keep full access until {nextBillingDateLabel}, when their
                account is deactivated.
              </p>
              <div className="w-full flex items-center gap-2 justify-end">
                <Button onClick={() => setIsDowngradClicked(false)} variant={'secondary'} size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <TableManager
          {...{
            columns,
            fetcherKey: 'getLicenseUserList',
            fetcherFn: getLicenseUserList,
            isHeightSet: false,
            customClass: 'h-auto overflow-visible',
            emptyTablePlaceholder: 'No seats found',
          }}
        />
      </div>
      {confirmState?.isOpen && (
        <AlertConfirm
          {...{
            apiLoading: isPending,
            descriptionTextComp: renderConfirmBody(),
            confirmBtnText: confirmState?.type === 'revert' ? 'Keep seat' : 'Remove seat(s)',
            onConfirm: () => {
              mutateRevokeLicense({
                licenses: confirmState.licenses,
                revoke: confirmState.type !== 'revert',
              });
            },
            open: confirmState?.isOpen,
            setOpen: () => {
              setConfirmState(EMPTY_CONFIRM);
            },
            headerText:
              confirmState?.type === 'revert'
                ? 'Keep this seat'
                : confirmState?.type === 'bulk-idle'
                  ? 'Remove unused seats'
                  : confirmIsAssigned
                    ? 'Remove a seat that is still in use'
                    : 'Remove an unused seat',
          }}
        />
      )}
      {drawerState.addUser && (
        <SideDrawer
          width="min(1040px, 84vw)"
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
            className="w-2/5 p-3 max-h-[99%] overflow-y-auto bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            showCloseButton={false}
          >
            <div className="flex flex-col gap-1.5  text-900/80">
              <div className="font-semibold truncate text-md flex items-center justify-between">
                Purchase License
                <div
                  onClick={() => setIsPaymentInitiate(false)}
                  className="cursor-pointer text-[#9A948F] ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
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
                /* Never "Pay $0" — see the quote above. */
                submitButtonText={
                  formatMoney(getTaxes?.total_amount)
                    ? `Pay ${formatMoney(getTaxes?.total_amount)}`
                    : 'Pay'
                }
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default LicenseManagement;

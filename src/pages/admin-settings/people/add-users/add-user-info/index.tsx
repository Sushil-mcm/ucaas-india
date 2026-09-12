import { useFieldArray, useFormContext } from 'react-hook-form';
import CustomSelect from '@/components/custom/custom-select';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { userInitialState } from '../../../constants';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getRoleList, getUserList, validateUser } from '@/services/api';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import type { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { useGetSite } from '@/hooks/common';
import OrderSummary from '../order-summary';
import { Label } from '@/components/ui/label';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { generateRandomExtension, handleAlert } from '@/lib/utils';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { AlertTriangle, Info, Minus, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';
import { NEW_PERSON_ROLE_KEY, readNewPersonRole } from '@/lib/role-permission-defaults';
import { decideInviteRole, describeRole, roleWarning, toRoleChoice } from '@/lib/invite-role';
import { roleDisplayName } from '@/pages/admin-settings/roles/role-names';
import {
  blocksInvite,
  clashForField,
  explainTakenEmail,
  findInviteClashes,
  summariseClashes,
} from '@/lib/invite-duplicates';
import './invite-glass.css';

type User = typeof userInitialState;
type ValidationErrorMap = {
  [index: number]: {
    email?: string;
    phone?: string;
    extension?: string;
  };
};
/* Solid triangles rather than chevrons: at 12px a stroked chevron in a 26px
   circle reads as a hairline, and these two are the whole way through the
   list. */
const TriangleLeft = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15 4.5 7.5 12l7.5 7.5z" />
  </svg>
);

const TriangleRight = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9 4.5 16.5 12 9 19.5z" />
  </svg>
);

const debounce = (fn: any, delay: any) => {
  let timer: any;
  return (...args: any) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const AddUserInfo = ({
  setIspaymentRequired,
  setOrderSummary,
  setIsUserValidatorError,
  dataGetMyPlanDetails,
  setPaymentCalculation,
}: any) => {
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors, submitCount },
  }: any = useFormContext<any>();
  const { user } = useUser();

  /* Which person is on screen. Ten of them stacked was a long scroll in a
     drawer, and the fields of person nine looked exactly like the fields of
     person two; a page each means the form is always the same height and the
     card header says whose it is. */
  const [page, setPage] = useState(0);

  const [validationErrors, setValidationErrors] = useState<ValidationErrorMap>({});
  const formFieldArrayInstance = useFieldArray({
    control: control,
    name: 'users',
  });

  const { data: companySiteList, isLoading } = useGetSite();

  const { data: roleList = [], isPending } = useQuery({
    queryKey: ['useRolesList', false],
    queryFn: () => getRoleList(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  /* The role a new person should start on, if the company has chosen one under
     Admin > People > Default permissions. Without it this box opens empty and
     whoever is adding somebody has to remember which of the roles is right. */
  const { data: companyDefaults } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
  });
  const defaultRoleId = readNewPersonRole(
    (companyDefaults as any)?.settings?.[NEW_PERSON_ROLE_KEY],
  );

  /* Everybody already on the account, read under the key the People page
     already uses so opening this form from there costs nothing extra.
     It is what lets a clash say "Amara Osei, at London" instead of the
     platform's four words, "Email already exists!". */
  const { data: roster = [] } = useQuery({
    queryKey: ['directoryPeople'],
    queryFn: () => getUserList({ page: 1, limit: 500 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  /* Which role a new person starts on, and why that one. The company's own
     answer wins; with no answer the narrowest role on the account is used, and
     an administrator is never chosen for somebody automatically. The reasoning
     and its tests live in lib/invite-role.ts, so this form and the Default
     permissions screen cannot drift apart. */
  const roleDecision = useMemo(
    () => decideInviteRole({ savedRoleId: defaultRoleId, roles: roleList }),
    [defaultRoleId, roleList],
  );

  /* Which rows have already been offered that answer, held by the row's own id
     rather than its position — removing the first row renumbers every other
     one, and a set of positions would then re-fill a row somebody had
     deliberately cleared. A row is filled in once and never again. */
  const seededRows = useRef<Set<string>>(new Set());

  const { fields, append, remove } = formFieldArrayInstance;

  const [users] = watch(['users']) as [User[]];

  useEffect(() => {
    const picked = roleDecision.role;
    if (!picked || !Array.isArray(users)) return;

    fields.forEach((field: any, index: number) => {
      const rowId = String(field?.id || index);
      if (seededRows.current.has(rowId)) return;
      seededRows.current.add(rowId);
      // Never overwrite a row somebody has already answered.
      if ((users as any[])[index]?.role?.value) return;

      setValue(`users.${index}.role`, { label: picked.name, value: picked.id });
      setValue(`users.${index}.role_uuid`, picked.custom ? '' : picked.id);
      setValue(`users.${index}.custom_role_uuid`, picked.custom ? picked.id : '');
    });
  }, [roleDecision, fields, users, setValue]);

  /* The role showing on one row right now, whether it was filled in for the
     admin or picked by hand. Used to say underneath what that role actually
     allows, because the names alone do not. */
  const chosenRoleOf = (index: number) => {
    const value = (users as any[])?.[index]?.role?.value;
    if (!value) return null;
    return toRoleChoice(
      roleList.find(
        (item: any) => (item?.type === 'custom' ? item?.uuid : item?.role_uuid) === value,
      ),
    );
  };

  /* The same person typed twice, or somebody who is already here. The platform
     cannot find either — two unsaved rows are not "taken" yet, and its check
     spans every company it hosts rather than just this one. */
  const clashes = useMemo(() => findInviteClashes({ rows: users, roster }), [users, roster]);
  const { plan_info, user_info = {}, company_info } = user || {};
  const isPlanExpired = company_info?.plan_status === 'EXPIRED';
  const isTrial = company_info?.is_trial === 'Y';

  const planCost = dataGetMyPlanDetails?.current_plan_details?.discount_enabled
    ? dataGetMyPlanDetails?.current_plan_details?.discount_price || 0
    : dataGetMyPlanDetails?.current_plan_details?.original_price || 0;

  const licenseInfo = useMemo(() => {
    const licenseDetail = dataGetMyPlanDetails?.license_detail || {};

    /* What this screen used to show on its own: spare licences + licences freed
       by revoked users. */
    const reportedFree =
      (licenseDetail?.free_licenses || 0) + (licenseDetail?.free_revoked_licenses || 0);

    /* What the API actually enforces when it decides whether to charge:
       licences owned minus licences already in use. If either field is missing
       we fall back to the old number rather than guess. */
    const totalLicenses = Number(licenseDetail?.total_licenses);
    const usedLicenses = Number(licenseDetail?.used_licenses);
    const enforcedFree =
      Number.isFinite(totalLicenses) && Number.isFinite(usedLicenses)
        ? Math.max(0, totalLicenses - usedLicenses)
        : null;

    /* Trust the smaller of the two. Promising a free seat the API then refuses
       to create is what dead-ends the admin, so we would rather show the
       payment step they can actually complete. */
    const available = enforcedFree === null ? reportedFree : Math.min(reportedFree, enforcedFree);
    const hasLicenseMismatch = enforcedFree !== null && enforcedFree !== reportedFree;

    const currentUserCount = users?.length || 0;
    const extraUnits = Math.max(0, currentUserCount - available);

    const extraCharge = extraUnits > 0;
    const cost = extraUnits * planCost;

    return {
      available,
      reportedFree,
      enforcedFree,
      hasLicenseMismatch,
      currentUserCount,
      extraUnits,
      extraCharge,
      cost,
    };
  }, [users, dataGetMyPlanDetails, planCost]);
  const { mutate: mutateValidateUser } = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: ({ index, ...payload }: any) => validateUser(payload),

    onSuccess: (_, variables) => {
      const { index, type } = variables;

      setValidationErrors((prev) => ({
        ...prev,
        [index]: {
          ...prev[index],
          [type]: undefined,
        },
      }));
    },

    onError: (err: any, variables) => {
      const { index, type } = variables;
      const errMsg = err?.response?.data?.message;

      setValidationErrors((prev) => ({
        ...prev,
        [index]: {
          ...prev[index],
          [type]: errMsg,
        },
      }));
    },
  });

  /* Whether the platform has rejected anything still on the form.
     It used to be set straight from each reply, which meant a successful check
     on row two's phone cleared the flag row one's rejected email had raised —
     and the Continue button came back on with a known-bad row on screen. Read
     from the errors themselves and that cannot happen: the flag is true exactly
     while a rejection is showing. */
  const apiRejected = useMemo(
    () =>
      Object.values(validationErrors).some(
        (row: any) => row && Object.values(row).some((message) => Boolean(message)),
      ),
    [validationErrors],
  );

  /* Continue is off while anything on this form would be refused — by the
     platform, or by the duplicate checks it cannot make. */
  useEffect(() => {
    setIsUserValidatorError(apiRejected || blocksInvite(clashes));
  }, [apiRejected, clashes, setIsUserValidatorError]);

  /* What to show under a field, worst first: a clash we can explain properly
     beats the platform's wording, and the platform's wording beats nothing.
     "Email already exists!" is turned into a sentence naming the colleague, or
     saying plainly that the address belongs outside this company — which the
     platform's own answer never distinguishes. */
  const emailProblem = (index: number) => {
    const clash = clashForField(clashes, index, 'email');
    if (clash) return clash.message;
    const fromApi = validationErrors?.[index]?.email;
    if (fromApi) {
      return /already exists/i.test(String(fromApi))
        ? explainTakenEmail((users as any[])?.[index]?.email, roster) || fromApi
        : fromApi;
    }
    return errors?.users?.[index]?.email?.message;
  };

  const extensionProblem = (index: number) =>
    clashForField(clashes, index, 'extension')?.message ||
    errors?.users?.[index]?.extension?.message ||
    validationErrors?.[index]?.extension;

  const phoneProblem = (index: number) =>
    clashForField(clashes, index, 'phone')?.message ||
    errors?.users?.[index]?.phone?.message ||
    validationErrors?.[index]?.phone;

  /* Whether anything on this one person is wrong. Ten collapsed-looking cards
     and one bad field in the middle is the case this is for: the card says so
     on its own header, so the problem is findable without opening each one. */
  const rowProblem = (index: number) =>
    Boolean(
      emailProblem(index) ||
        phoneProblem(index) ||
        extensionProblem(index) ||
        errors?.users?.[index]?.first_name?.message ||
        errors?.users?.[index]?.last_name?.message ||
        errors?.users?.[index]?.role?.value?.message,
    );

  const useDebouncedValidateUser = (mutateFn: any, delay = 500) => {
    return useCallback(
      debounce((value: any, index: number) => {
        mutateFn({ ...value, index });
      }, delay),
      [mutateFn, delay],
    );
  };

  const handleValidateUser = useDebouncedValidateUser(mutateValidateUser);

  const MAX_USERS = 10;

  /* How many more seats the plan itself will sell, as opposed to how many are
     already paid for and idle. "Unlimited" is a real answer here. */
  const purchasableSeats =
    plan_info?.dataValues?.licenses !== 0
      ? (plan_info?.dataValues?.licenses || 0) -
        (dataGetMyPlanDetails?.license_detail?.total_licenses || 0)
      : 'Unlimited';

  /* The person as they are being typed, for the card header. Falls back to the
     position so a card is never nameless. */
  const rowName = (index: number) => {
    const row: any = (users as any[])?.[index] || {};
    const full = [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim();
    return full || `Person ${index + 1}`;
  };

  const rowInitials = (index: number) => {
    const row: any = (users as any[])?.[index] || {};
    const first = String(row?.first_name || '').trim().charAt(0);
    const last = String(row?.last_name || '').trim().charAt(0);
    const initials = `${first}${last}`.toUpperCase();
    return initials || String(index + 1);
  };

  const addRows = (count: number) => {
    Array.from({ length: count }).forEach(() => {
      append({ ...userInitialState });
    });
    /* Stay where you are. The plus adds a page at the end and the chip for it
       appears in the strip, but it does not move you: being thrown onto an
       empty form loses your place in the one you were part-way through
       filling in. You go to the new person by clicking their chip. */
  };

  /* The last person off the end. Never the only one — a form with nobody on it
     has nothing to submit, so the minus is disabled at one rather than leaving
     an empty list behind. */
  const removeLastRow = () => {
    if (fields.length <= 1) return;
    remove(fields.length - 1);
  };

  /* Remove whoever is on screen, then stay in range. */
  const removeRow = (index: number) => {
    if (fields.length <= 1) return;
    remove(index);
  };

  /* Every route that adds people comes through here, so none of them can
     disagree about what the plan allows. `requested` is how many rows the
     admin is asking for. */
  const handleAddUser = (requested: number) => {
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

    if (requested < 1 || requested > MAX_USERS) {
      handleAlert({
        text: `Please enter a number between 1 and ${MAX_USERS}.`,
        type: 'warning',
      });
      return;
    }

    const currentCount = users?.length;

    const availableLicensesToPurchase =
      plan_info?.dataValues?.licenses !== 0
        ? (plan_info?.dataValues?.licenses || 0) -
          (dataGetMyPlanDetails?.license_detail?.total_licenses || 0)
        : 'Unlimited';

    const maxAllowed =
      availableLicensesToPurchase !== 'Unlimited'
        ? Math.min(MAX_USERS, availableLicensesToPurchase)
        : MAX_USERS;

    if (currentCount >= maxAllowed) {
      handleAlert({
        text:
          availableLicensesToPurchase !== 'Unlimited' && currentCount >= availableLicensesToPurchase
            ? `You have reached the maximum limit of available licenses.`
            : `Maximum of 10 users can be added at once.`,
        type: 'warning',
      });
      return;
    }

    if (requested > maxAllowed) {
      handleAlert({
        text:
          availableLicensesToPurchase !== 'Unlimited' && requested > availableLicensesToPurchase
            ? `You can only add up to ${availableLicensesToPurchase} users based on available licenses.`
            : `Maximum of 10 users can be added at once.`,
        type: 'warning',
      });
      return;
    }

    const remainingSlots = maxAllowed - currentCount;

    if (requested > remainingSlots) {
      if (currentCount === 1 && requested === maxAllowed) {
        // Silently allow it if there's only the default row and they entered the max allowed,
        // it will append (maxAllowed - 1) rows, bringing the total exactly to maxAllowed.
      } else {
        handleAlert({
          text:
            availableLicensesToPurchase !== 'Unlimited' && remainingSlots < MAX_USERS - currentCount
              ? `You can only add ${remainingSlots} more user${remainingSlots === 1 ? '' : 's'} based on available licenses.`
              : `You can only add ${remainingSlots} more user${remainingSlots === 1 ? '' : 's'}.`,
          type: 'warning',
        });
        return;
      }
    }

    const count = Math.min(requested, remainingSlots);
    if (count <= 0) return;

    addRows(count);
  };

  const generateNewExtension = (index: number) => {
    const newExtension = generateRandomExtension();
    setValue(`users.[${index}].extension`, newExtension, { shouldValidate: true });
    handleValidateUser({ value: newExtension, type: 'extension' }, index);
  };

  useEffect(() => {
    if (user_info) {
      const obj = {
        label: user_info?.site_detail?.name,
        value: user_info?.site_uuid,
      };
      setValue('site', obj);
    }
  }, [user_info]);

  useEffect(() => {
    setIspaymentRequired(licenseInfo.extraCharge);
  }, [licenseInfo.extraCharge]);

  useEffect(() => {
    setOrderSummary({
      watchUserLength: users.length,
      availableLicenses: licenseInfo?.available,
      totalPayableUnit: licenseInfo?.extraUnits,
    });
  }, [users.length, licenseInfo?.available, licenseInfo?.extraUnits]);

  useEffect(() => {
    fields.forEach((_, index) => {
      if (!watch(`users.[${index}].extension`)) {
        generateNewExtension(index);
      }
    });
  }, [fields?.length]);

  /* Never point at a person who is no longer there — deleting the last one
     while looking at them would otherwise leave the page blank. */
  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, fields.length - 1)));
  }, [fields.length]);

  /* One person at a time hides the others, and with them their errors: filling
     in person one and pressing Continue would look like nothing had happened
     when it was person three that was incomplete. On a refused submit, go to
     the first person who needs something. */
  const handledSubmit = useRef(0);
  useEffect(() => {
    if (!submitCount || submitCount === handledSubmit.current) return;
    handledSubmit.current = submitCount;

    const firstBad = fields.findIndex((_, index) => rowProblem(index));
    if (firstBad >= 0) setPage(firstBad);
  }, [submitCount]);

  return (
    <div className="mcm-invite-step flex min-h-0 flex-col gap-4 overflow-y-auto pb-1 pr-0.5">
      {/* Where these people work, and how many of them there are. Both are
          true of the whole form, so they sit on one line above the list rather
          than being repeated per person. The count is the control: it adds and
          removes the cards below it, which is what the unlabelled "Enter no."
          box and its Add button used to do in two steps. */}
      <section className="mcm-invite-bar">
        <div className="mcm-invite-loc">
          <CustomSelect
            label="Location"
            options={companySiteList?.map((site: { name: string; uuid: string }) => ({
              label: site?.name,
              value: site?.uuid,
            }))}
            placeholder="Select location"
            isLoading={isLoading}
            handleChange={(e: ISELECTVALUE | null) => {
              setValue(`site`, e || { label: '', value: '' }, { shouldValidate: true });
            }}
            value={watch('site')}
            error={errors?.site?.value?.message}
          />
        </div>

        <div className="mcm-count">
          <span className="mcm-count-label">People</span>
          <div className="mcm-count-ctrl">
            <button
              type="button"
              className="mcm-count-btn"
              aria-label="Remove the last person"
              title="Remove the last person"
              disabled={fields.length <= 1}
              onClick={removeLastRow}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="mcm-count-value" aria-live="polite">
              {fields.length}
            </span>
            <button
              type="button"
              className="mcm-count-btn"
              aria-label="Add another person"
              title="Add another person"
              disabled={fields.length >= MAX_USERS}
              onClick={() => handleAddUser(1)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <CustomTooltip
            text={
              purchasableSeats === 'Unlimited'
                ? 'Your plan has no cap on the number of seats you can buy.'
                : `Your plan will sell you up to ${purchasableSeats} more seat${purchasableSeats === 1 ? '' : 's'}.`
            }
            side="left"
          >
            <Info className="mcm-count-info" />
          </CustomTooltip>
        </div>
      </section>

      {roleDecision.reason ? (
        <p className="mcm-invite-rolenote">{roleDecision.reason}</p>
      ) : null}
      {roleDecision.warning ? (
        <p className="mcm-note is-warn">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{roleDecision.warning}</span>
        </p>
      ) : null}
      {licenseInfo?.hasLicenseMismatch ? (
        <p className="mcm-note is-warn">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Your plan lists {licenseInfo?.reportedFree} unused licence
            {licenseInfo?.reportedFree === 1 ? '' : 's'}, but billing can only confirm{' '}
            {licenseInfo?.enforcedFree}. We use the lower number so you are not blocked at checkout.
          </span>
        </p>
      ) : null}

      {/* One line saying what is wrong with the list as a whole, so somebody
          scrolling ten rows knows there is something to find. */}
      {clashes.length ? (
        <p role="status" className="mcm-note is-warn is-block">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{summariseClashes(clashes)}</span>
        </p>
      ) : null}

      {/* ----------------------------------------------------------------
          The people. A card each, headed by who they are rather than by
          nothing: the initials, the name as it is typed, the role and
          extension underneath, and the remove button on that person's own
          header instead of loose in the field grid.
          ---------------------------------------------------------------- */}
      {/* One page per person. The dots are the reason this is safe: with the
          others off screen there would otherwise be nothing to say that
          person three is the one still missing an e-mail address. */}
      {/* Always on screen, even for one person. Appearing only at two moved
          everything below it down the moment somebody pressed the plus, and
          the row you were reading jumped as you added to it. */}
      <div className="mcm-pager">
        <span className="mcm-pager-count">
          Person {page + 1} of {fields.length}
        </span>

          <div className="mcm-pager-nav">
            <button
              type="button"
              className="mcm-pager-btn"
              aria-label="Previous person"
              title="Previous person"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              <TriangleLeft className="mcm-pager-tri" />
            </button>

            {/* Numbered, not dots. Seven identical 7px circles said nothing
                about what they were or what clicking one would do; the number
                is the person's position, which is the same thing the card
                header and the count already say. */}
            <div className="mcm-pager-chips">
              {fields.map((field: any, index: number) => {
                const bad = rowProblem(index);
                return (
                  <button
                    key={field?.id || index}
                    type="button"
                    aria-label={`Go to ${rowName(index)}${bad ? ', needs a fix' : ''}`}
                    aria-current={index === page ? 'true' : undefined}
                    title={`${rowName(index)}${bad ? ' — needs a fix' : ''}`}
                    className={`mcm-pager-chip ${index === page ? 'is-current' : ''} ${
                      bad ? 'is-bad' : ''
                    }`}
                    onClick={() => setPage(index)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="mcm-pager-btn"
              aria-label="Next person"
              title="Next person"
              disabled={page >= fields.length - 1}
              onClick={() => setPage((current) => Math.min(fields.length - 1, current + 1))}
            >
              <TriangleRight className="mcm-pager-tri" />
            </button>
          </div>
      </div>

      <ol className="mcm-invitee-list">
        {fields?.map((field: any, index: number) => {
          const chosen = chosenRoleOf(index);
          const caution = roleWarning(chosen);
          const extension = watch(`users.[${index}].extension`);
          const flagged = rowProblem(index);

          return (
            /* Hidden rather than unmounted. Every person stays registered with
               the form, so their answers and their errors survive being paged
               away from — unmounting them would quietly drop both. */
            <li
              key={field?.id || index}
              hidden={index !== page}
              style={{ display: index === page ? undefined : 'none' }}
              className={`mcm-invitee ${flagged ? 'is-flagged' : ''}`}
            >
              <header className="mcm-invitee-head">
                <span className="mcm-invitee-avatar" aria-hidden="true">
                  {rowInitials(index)}
                </span>
                <div className="mcm-invitee-id">
                  <p className="mcm-invitee-name">{rowName(index)}</p>
                  <p className="mcm-invitee-meta">
                    <span>{chosen?.name || (users as any[])?.[index]?.role?.label || 'No role yet'}</span>
                    {extension ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Ext {extension}</span>
                      </>
                    ) : null}
                  </p>
                </div>

                {flagged ? (
                  <span className="mcm-invitee-flag">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Needs a fix
                  </span>
                ) : null}

                {fields.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove ${rowName(index)}`}
                    title="Remove this person"
                    className="mcm-invitee-remove"
                    onClick={() => removeRow(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </header>

              <div className="mcm-invitee-body">
                <Input
                  label="First name"
                  type="text"
                  placeholder="First name"
                  {...register(`users.${index}.first_name`)}
                  error={errors?.users?.[index]?.first_name?.message}
                  maxLength={50}
                />

                <Input
                  label="Last name"
                  type="text"
                  placeholder="Last name"
                  {...register(`users.${index}.last_name`)}
                  error={errors?.users?.[index]?.last_name?.message}
                  maxLength={50}
                />

                <Input
                  label="Email"
                  type="email"
                  placeholder="name@company.com"
                  {...register(`users.${index}.email`)}
                  error={emailProblem(index)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setValue(`users.[${index}].email`, value, {
                      shouldValidate: true,
                    });
                    handleValidateUser({ value, type: 'email' }, index);
                  }}
                />

                <div className="flex w-full flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label>
                      Phone <span className="text-[10.5px] font-normal text-gray-400">optional</span>
                    </Label>
                    <div className="flex items-start">
                      {phoneProblem(index) ? <ErrorTooltip text={phoneProblem(index)} /> : null}
                    </div>
                  </div>
                  <PhoneInput
                    country={'in'}
                    onlyCountries={['in']}
                    disableDropdown
                    value={watch(`users.${index}.phone`)}
                    onChange={(value) => {
                      /* ucaas.in: countryCodeEditable={false} freezes this library's input entirely
                         (can't type or delete at all), so +91 is protected here instead:
                         if editing eats into the dial code, snap back to a bare 91 rather
                         than let it disappear. */
                      const next = value.startsWith('91') ? value : '91';
                      setValue(`users.[${index}].phone`, next, {
                        shouldValidate: true,
                      });
                      /* An empty box is a valid answer now, and must not be
                         sent to be checked for duplicates: every blank row
                         would clash with every other blank row. */
                      if (String(next || '').replace(/\D/g, '').length >= 9)
                        handleValidateUser({ value: next, type: 'phone' }, index);
                    }}
                    containerClass={`w-full ${phoneProblem(index) ? 'phone-error' : ''}`}
                  />
                </div>

                <div className="w-full">
                  <CustomSelect
                    label="Role"
                    value={watch(`users.${index}.role`)}
                    options={roleList.map(
                      (role: { name: string; role_uuid: string; type: string; uuid: string }) => ({
                        /* The same friendly name every other People screen shows
                           ("Location admin", not MANAGER). A custom role keeps
                           the name the company gave it. */
                        label: roleDisplayName(role?.name),
                        value: role?.type === 'custom' ? role?.uuid : role?.role_uuid,
                      }),
                    )}
                    handleChange={(e: ISELECTVALUE | null) => {
                      setValue(`users.${index}.role`, e || { label: '', value: '' }, {
                        shouldValidate: true,
                      });
                      /* Branch on the role's `type`, not on its display name: a custom
                         role may legitimately be called "ADMIN", and the old test
                         would then have written it into role_uuid. Both fields are
                         set every time — one to the id, the other cleared — because
                         leaving the previous one behind meant switching from a custom
                         role back to a system role silently kept the custom role, the
                         backend checking custom_role_uuid first. */
                      const picked = roleList.find(
                        (item: any) =>
                          (item?.type === 'custom' ? item?.uuid : item?.role_uuid) === e?.value,
                      );
                      const isCustomRole = picked?.type === 'custom';
                      setValue(`users.${index}.role_uuid`, isCustomRole ? '' : e?.value || '', {
                        shouldValidate: true,
                      });
                      setValue(
                        `users.${index}.custom_role_uuid`,
                        isCustomRole ? e?.value || '' : '',
                        {
                          shouldValidate: true,
                        },
                      );
                    }}
                    error={errors?.users?.[index]?.role?.value?.message}
                    isLoading={isPending}
                  />
                  {/* What that role actually allows. The names the platform ships
                      with — AGENT, MANAGER, SUB-ADMIN — do not say, and the
                      permissions behind them barely differ, so the box on its own is
                      a guess dressed up as a decision. The words come from the same
                      place the Default permissions screen reads them, so the two
                      screens describe a role identically. */}
                  {chosen ? (
                    <p className="mcm-role-hint">{describeRole(chosen)}</p>
                  ) : null}
                  {chosen && caution ? (
                    <p className="mcm-role-hint is-warn">{caution}</p>
                  ) : null}
                </div>

                {/* Extension, with its dice next to it rather than adrift in the
                    grid — the button acts on this field and nothing else. */}
                <div className="mcm-ext-field">
                  <Input
                    label="Extension"
                    type="text"
                    placeholder="Extension"
                    value={extension}
                    error={extensionProblem(index)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setValue(`users.[${index}].extension`, value, {
                        shouldValidate: true,
                      });
                      handleValidateUser({ value, type: 'extension' }, index);
                    }}
                    maxLength={5}
                  />
                  <button
                    type="button"
                    className="mcm-ext-regen"
                    aria-label="Pick a different extension"
                    title="Pick a different extension"
                    onClick={() => generateNewExtension(index)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {licenseInfo.extraCharge ? (
        <OrderSummary
          customClass="w-full"
          orderSummary={{
            watchUserLength: users?.length,
            availableLicenses: licenseInfo?.available,
            totalPayableUnit: licenseInfo?.extraUnits,
          }}
          dataGetMyPlanDetails={dataGetMyPlanDetails}
          onCalculationChange={setPaymentCalculation}
        />
      ) : null}
    </div>
  );
};

export default AddUserInfo;

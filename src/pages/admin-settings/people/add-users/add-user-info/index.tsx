import { useFieldArray, useFormContext } from 'react-hook-form';
import CustomSelect from '@/components/custom/custom-select';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { userInitialState } from '../../../constants';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getRoleList, getUserList, validateUser } from '@/services/api';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import type { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { Minus, Plus, TrashBin } from '@/assets/icons';
import { useGetSite } from '@/hooks/common';
import OrderSummary from '../order-summary';
import { Label } from '@/components/ui/label';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { generateRandomExtension, handleAlert, withIndianDialCode } from '@/lib/utils';
import CustomTooltip from '@/components/custom/custom-tooltip';
import {
  ChevronLeft,
  ChevronRight,
  InfoIcon,
  Layers,
  Mail,
  MapPin,
  ShieldCheck,
  User as UserIcon,
  Phone as PhoneIcon,
} from 'lucide-react';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';
import { NEW_PERSON_ROLE_KEY, readNewPersonRole } from '@/lib/role-permission-defaults';
import {
  decideInviteRole,
  describeRole,
  roleWarning,
  toRoleChoice,
} from '@/lib/invite-role';
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
  onLicenseStatsChange,
}: any) => {
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  }: any = useFormContext<any>();
  const { user } = useUser();
  // const [errorType, setErrorType] = useState(null);
  // const [errIndex, setErrIndex] = useState(null);
  // const [validatorErrors, setValidatorErrors] = useState(null);

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

  /* Which invitee card is showing -- one at a time, like the reference,
     rather than every card stacked in one long scroll. Clamped whenever
     the list shrinks (removing the last card) so it never points past the
     end. */
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    if (activeIndex > fields.length - 1) setActiveIndex(Math.max(0, fields.length - 1));
  }, [activeIndex, fields.length]);

  const users = watch('users') as User[];

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
      roleList.find((item: any) => (item?.type === 'custom' ? item?.uuid : item?.role_uuid) === value),
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

  /* Every already-filled-in person before the one on screen, so they stay
     visible on the rail while a later card (Person 2, 3, ...) is being
     filled in -- once the pager moves off a card, its own fields scroll out
     of view with nothing on screen to check against while filling the next
     one. Only people before the active card, not all of them: the ones
     after haven't been touched yet and have nothing worth showing. */
  const precedingNames = (users || [])
    .slice(0, activeIndex)
    .map((person) => [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim());
  const precedingNamesKey = precedingNames.join('|');

  /* Handed up to the step rail (Directory's invite dialog only -- every
     other caller of this wizard leaves `onLicenseStatsChange` undefined) so
     the pills sit under "Invite people" instead of inside this form. No
     "Add Multiple Users" action to keep fresh here any more -- the stepper
     itself adds/removes cards immediately (see `applyPeopleCount`). */
  useEffect(() => {
    if (!onLicenseStatsChange) return;
    onLicenseStatsChange(
      <>
        {precedingNames.some(Boolean) ? (
          <div className="mcm-invite-person1-ref">
            {precedingNames.map((name, index) =>
              name ? (
                <p key={index} className="mcm-invite-person1-ref-name">
                  {index + 1}. {name}
                </p>
              ) : null,
            )}
          </div>
        ) : null}
        <div className="mcm-license-stats flex flex-col items-start gap-2">
          <span className="mcm-invite-stat">
            Unused licenses: <strong>{licenseInfo?.available || 0}</strong>
            <CustomTooltip text="License purchased" side="top">
              <InfoIcon className="w-3.5 h-3.5 cursor-pointer" />
            </CustomTooltip>
          </span>
          <span className="mcm-invite-stat">
            New licenses purchased: <strong>{licenseInfo?.extraUnits || 0}</strong>
          </span>
        </div>
      </>,
    );
  }, [licenseInfo?.available, licenseInfo?.extraUnits, onLicenseStatsChange, precedingNamesKey]);

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

  // const { mutate: mutateValidateUser } = useMutation({
  //   mutationFn: validateUser,
  //   onSuccess: () => {
  //     setErrorType(null);
  //     setErrIndex(null);
  //     setIsUserValidatorError(false);
  //     setValidatorErrors(null);
  //   },
  //   onError: (err: any) => {
  //     const errMsg = err?.response?.data?.message;
  //     setIsUserValidatorError(true);
  //     setValidatorErrors(errMsg);
  //   },
  // });

  // const useDebouncedValidateUser = (mutateValidateUser: any, delay = 500) => {
  //   return useCallback(
  //     debounce((value: any, index: any) => {
  //       setErrIndex(index);
  //       setErrorType(value?.type);
  //       mutateValidateUser({ ...value });
  //     }, delay),
  //     [mutateValidateUser, delay],
  //   );
  // };
  // const handleValidateUser = useDebouncedValidateUser(mutateValidateUser);

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

  /* How many licenses are actually left to buy -- `null` (not 0) when the
     plan/license data simply hasn't loaded yet, so a slow API response
     reads as "unknown, don't block" rather than "zero, block everything".
     `licenses === 0` from the plan itself is the one case that genuinely
     means unlimited (an unmetered plan), kept as-is from the original
     check this replaces. */
  const availableLicensesToPurchase = useMemo(() => {
    const licenses = plan_info?.dataValues?.licenses;
    const totalLicenses = dataGetMyPlanDetails?.license_detail?.total_licenses;
    if (licenses === 0) return 'Unlimited';
    if (licenses == null || totalLicenses == null) return 'Unlimited';
    return licenses - totalLicenses;
  }, [plan_info?.dataValues?.licenses, dataGetMyPlanDetails?.license_detail?.total_licenses]);

  /* Number of users now IS the person count -- the stepper (and typing in
     the box) add or remove cards immediately, rather than staging a count
     for a separate "Add Multiple Users" click. */
  const applyPeopleCount = (rawNext: number) => {
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

    const current = fields.length;
    const target = Math.min(MAX_USERS, Math.max(1, rawNext));
    if (target === current) return;

    if (target < current) {
      for (let i = current - 1; i >= target; i -= 1) remove(i);
      setActiveIndex((i) => Math.min(i, target - 1));
      return;
    }

    const maxAllowed =
      availableLicensesToPurchase !== 'Unlimited'
        ? Math.min(MAX_USERS, availableLicensesToPurchase)
        : MAX_USERS;

    if (current >= maxAllowed) {
      handleAlert({
        text:
          availableLicensesToPurchase !== 'Unlimited'
            ? `You have reached the maximum limit of available licenses.`
            : `Maximum of ${MAX_USERS} users can be added at once.`,
        type: 'warning',
      });
      return;
    }

    const cappedTarget = Math.min(target, maxAllowed);
    if (cappedTarget < target) {
      handleAlert({
        text: `You can only add up to ${maxAllowed} users based on available licenses.`,
        type: 'warning',
      });
    }

    const toAdd = cappedTarget - current;
    if (toAdd <= 0) return;

    Array.from({ length: toAdd }).forEach(() => {
      append({ ...userInitialState });
    });
    // Jump to the first of the newly-added cards, same as clicking its pager number.
    setActiveIndex(current);
  };

  /* A random 4-digit extension has a real chance of repeating somebody else
     already on this same invite -- ~1 in 9000 per pair, but with several
     rows generated back-to-back that shows up often enough to trip the
     duplicate-extension check before anybody has typed a thing. Re-roll
     against the extensions already sitting on other rows instead of
     trusting one draw to be unique. Reads `watch('users')` fresh rather
     than the `users` closed over from render: several rows can get their
     extension generated in the same pass (see the effect below), and each
     one needs to see the ones just assigned to the rows before it, not the
     snapshot from before any of them ran. */
  const generateNewExtension = (index: number) => {
    const liveUsers = watch('users') as User[];
    const taken = new Set(
      (liveUsers || [])
        .map((row, rowIndex) => (rowIndex === index ? '' : String(row?.extension || '')))
        .filter(Boolean),
    );
    let newExtension = generateRandomExtension();
    while (taken.has(newExtension)) {
      newExtension = generateRandomExtension();
    }
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

  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="mcm-invite-summary flex flex-col gap-1 mt-3">
        <div className="mcm-invite-banner">
          <span className="mcm-invite-banner-icon">
            <Layers className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-gray-900 dark:text-mcm-ink">
              Licenses available to purchase:{' '}
              <strong className="mcm-invite-count">
                {plan_info?.dataValues?.licenses !== 0
                  ? plan_info?.dataValues?.licenses -
                    dataGetMyPlanDetails?.license_detail?.total_licenses
                  : 'Unlimited'}
              </strong>
            </p>
            <p className="text-xs text-gray-500 dark:text-mcm-ink-3">
              Add one or more users and assign a location.
            </p>
          </div>
        </div>
      </div>

      <div className="mcm-invite-users flex flex-col gap-1">
        <h4 className="mcm-invite-heading text-center">Add Users</h4>
        <div className="mcm-bulk-add grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="mcm-field-label">Number of users</span>
            <div className="mcm-count-stepper flex items-center">
              <button
                type="button"
                aria-label="Fewer users"
                disabled={fields.length <= 1}
                onClick={() => applyPeopleCount(fields.length - 1)}
              >
                <Minus className="w-3 h-3" />
              </button>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="1"
                value={String(fields.length)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const sanitized = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                  if (!sanitized) return;
                  applyPeopleCount(Number(sanitized));
                }}
                maxLength={2}
              />
              <button
                type="button"
                aria-label="More users"
                disabled={fields.length >= MAX_USERS}
                onClick={() => applyPeopleCount(fields.length + 1)}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[10px] ps-[2px] pt-1 text-gray-500 dark:text-mcm-ink-3">
              Enter number between 1-{MAX_USERS}
            </p>
          </div>
          <div className="mcm-icon-select-field relative w-full">
            <MapPin className="mcm-icon-select-field-icon" />
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
        </div>

        {/* {licenseInfo.extraCharge && (
        <p className="text-grey-700 text-center text-sm">
          Additional licenses to purchase: {licenseInfo.extraUnits}
        </p>
      )} */}
        {licenseInfo?.hasLicenseMismatch ? (
          <p className="text-amber-600 text-center text-xs">
            Your plan lists {licenseInfo?.reportedFree} unused licence
            {licenseInfo?.reportedFree === 1 ? '' : 's'}, but billing can only confirm{' '}
            {licenseInfo?.enforcedFree}. We use the lower number so you are not blocked at checkout.
          </p>
        ) : null}

        {/* Which role everybody on this form starts on, and why that one. Said
            once at the top rather than repeated on every row: it is the same
            answer for all of them, and it is a company-wide setting somebody
            can go and change. */}
        {roleDecision.reason ? (
          <p className="mx-auto mt-1 max-w-3xl text-center text-xs text-gray-600 dark:text-mcm-ink-3">
            {roleDecision.reason}
          </p>
        ) : null}
        {roleDecision.warning ? (
          <p className="mx-auto max-w-3xl text-center text-xs font-medium text-amber-600">
            {roleDecision.warning}
          </p>
        ) : null}

        {/* One line saying what is wrong with the list as a whole, so somebody
            scrolling ten rows knows there is something to find. */}
        {clashes.length ? (
          <p
            role="status"
            className="mx-auto mt-2 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800"
          >
            {summariseClashes(clashes)}
          </p>
        ) : null}
      </div>
      {/* Two columns from here down: the invitee cards on the left, the
          running cost pinned on the right — so the total is still visible
          while scrolling a long list of people, instead of buried below
          all of them. Collapses to one column under `lg` (this dialog is
          also used at its old 600px width in narrower contexts), where the
          summary just falls in after the last card. */}
      <div
        className={`mcm-invite-columns flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-10 ${
          fields.length > 1 ? 'mcm-invite-columns--paged' : ''
        }`}
      >
        <div className="mcm-invite-main min-w-0 flex-1">
          <h4 className="mcm-invite-heading">User Information</h4>
          {fields.length > 1 ? (
            <div className="mcm-invitee-pager flex items-center justify-between">
              <span className="mcm-invitee-pager-label">
                Person {activeIndex + 1} of {fields.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous person"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {fields.map((field, i) => (
                  <button
                    key={field.id}
                    type="button"
                    aria-label={`Person ${i + 1}`}
                    aria-current={i === activeIndex}
                    className={i === activeIndex ? 'is-active' : ''}
                    onClick={() => setActiveIndex(i)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Next person"
                  disabled={activeIndex === fields.length - 1}
                  onClick={() => setActiveIndex((i) => Math.min(fields.length - 1, i + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}
          <div className="mcm-invite-list flex flex-col my-2 gap-3 pr-0 md:pr-3 lg:gap-2">
            {(() => {
              const index = activeIndex;
              const field = fields[index];
              if (!field) return null;
              return (
          <div
            key={field.id}
            className="mcm-invitee grid grid-cols-1 gap-3 rounded-xl border border-gray-200 p-3 md:grid-cols-2 xl:grid-cols-3"
          >
            <div className="w-full">
              <Input
                label="First Name"
                required
                type="text"
                placeholder="First name"
                Icon={<UserIcon className="w-4 h-4" />}
                IconPosition="left-0 inset-y-0 pl-3"
                className="pl-9"
                {...register(`users.${index}.first_name`)}
                error={errors?.users?.[index]?.first_name?.message}
                maxLength={50}
              />
            </div>
            <div className="w-full">
              <Input
                label="Last Name"
                required
                type="text"
                placeholder="Last name"
                Icon={<UserIcon className="w-4 h-4" />}
                IconPosition="left-0 inset-y-0 pl-3"
                className="pl-9"
                {...register(`users.${index}.last_name`)}
                error={errors?.users?.[index]?.last_name?.message}
                maxLength={50}
              />
            </div>
            <div className="mcm-invitee-email w-full">
              <Input
                label="Email"
                required
                type="email"
                placeholder="you@company.com"
                Icon={<Mail className="w-4 h-4" />}
                IconPosition="left-0 inset-y-0 pl-3"
                className="pl-9"
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
            </div>

            <div className="mcm-invitee-full flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <Label required>Phone</Label>
                <div className="flex items-start">
                  {phoneProblem(index) ? <ErrorTooltip text={phoneProblem(index)} /> : null}
                </div>
              </div>
              <div className="flex w-full gap-1">
                <PhoneInput
                  country={'in'}
                  onlyCountries={['in']}
                  disableDropdown
                  placeholder="Phone number"
                  value={watch(`users.${index}.phone`)}
                  onChange={(value) => {
                    const next = withIndianDialCode(value);
                    setValue(`users.[${index}].phone`, next, {
                      shouldValidate: true,
                    });
                    handleValidateUser({ value: next, type: 'phone' }, index);
                  }}
                  containerClass={`w-full ${errors?.users?.[index]?.phone?.message ? 'phone-error' : ''}`}
                />
              </div>
            </div>

            <div className="mcm-icon-select-field mcm-invitee-full relative w-full">
              <ShieldCheck className="mcm-icon-select-field-icon" />
              <CustomSelect
                label="Role"
                required
                placeholder="Select role"
                value={watch(`users.${index}.role`)}
                options={roleList.map(
                  (role: { name: string; role_uuid: string; type: string; uuid: string }) => ({
                    label: role?.name,
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
                  setValue(`users.${index}.custom_role_uuid`, isCustomRole ? e?.value || '' : '', {
                    shouldValidate: true,
                  });
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
              {(() => {
                const chosen = chosenRoleOf(index);
                const caution = roleWarning(chosen);
                return chosen ? (
                  <>
                    <p className="mt-1 text-[11px] leading-snug text-gray-500 dark:text-mcm-ink-3">
                      {describeRole(chosen)}
                    </p>
                    {caution ? (
                      <p className="mt-0.5 text-[11px] font-medium leading-snug text-amber-600">
                        {caution}
                      </p>
                    ) : null}
                  </>
                ) : null;
              })()}
            </div>

            <div className="w-full">
              <Input
                label="Extension"
                required
                type="text"
                placeholder="Extension"
                Icon={<PhoneIcon className="w-4 h-4" />}
                IconPosition="left-0 inset-y-0 pl-3"
                className="pl-9"
                value={watch(`users.[${index}].extension`)}
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
            </div>

            <div className="mcm-invitee-actions flex items-center justify-end gap-2">
              {fields.length > 1 && (
                <div
                  className="border-0 cursor-pointer min-w-10 w-10 h-10 text-red-500 hover:text-red-700 flex items-center justify-center"
                  onClick={() => {
                    remove(index);
                    // Stay on the same position unless the last card was removed.
                    setActiveIndex((i) => Math.min(i, fields.length - 2));
                  }}
                >
                  <TrashBin className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
              );
            })()}
          </div>
        </div>

        {licenseInfo.extraCharge ? (
          <div className="mcm-invite-side lg:sticky lg:top-0 lg:w-[280px] lg:shrink-0">
            <OrderSummary
              customClass="w-full mcm-order-summary"
              subtitle="Review your license details"
              note="Final amount may vary based on selected location and license type."
              orderSummary={{
                watchUserLength: users?.length,
                availableLicenses: licenseInfo?.available,
                totalPayableUnit: licenseInfo?.extraUnits,
              }}
              dataGetMyPlanDetails={dataGetMyPlanDetails}
              onCalculationChange={setPaymentCalculation}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AddUserInfo;

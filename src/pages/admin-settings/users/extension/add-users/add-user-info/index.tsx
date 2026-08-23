import { useFieldArray, useFormContext } from 'react-hook-form';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { userInitialState } from '../../../constants';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getRoleList, validateUser } from '@/services/api';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import type { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { Plus, TrashBin } from '@/assets/icons';
import { useGetSite } from '@/hooks/common';
import OrderSummary from '../order-summary';
import { Label } from '@/components/ui/label';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { generateRandomExtension, handleAlert } from '@/lib/utils';
import { Icon } from '@/assets/icons/icon';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { InfoIcon } from 'lucide-react';

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
    queryKey: ['useRolesList'],
    queryFn: () => getRoleList(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const { fields, append, remove } = formFieldArrayInstance;

  const [users, userAddCountRaw] = watch(['users', 'user_add_count']) as [User[], number | null];
  const userAddCount = Number(userAddCountRaw) || 0;
  const { plan_info, user_info = {}, company_info } = user || {};
  const isPlanExpired = company_info?.plan_status === 'EXPIRED';
  const isTrial = company_info?.is_trial === 'Y';
  console.log(
    plan_info?.dataValues?.licenses,
    dataGetMyPlanDetails?.license_detail?.total_licenses,
    'plan_info?.dataValues',
  );

  const planCost = dataGetMyPlanDetails?.current_plan_details?.discount_enabled
    ? dataGetMyPlanDetails?.current_plan_details?.discount_price || 0
    : dataGetMyPlanDetails?.current_plan_details?.original_price || 0;

  const licenseInfo = useMemo(() => {
    const available =
      (dataGetMyPlanDetails?.license_detail?.free_licenses || 0) +
      (dataGetMyPlanDetails?.license_detail?.free_revoked_licenses || 0);
    const currentUserCount = users?.length || 0;
    const extraUnits = Math.max(0, currentUserCount - available);

    const extraCharge = extraUnits > 0;
    const cost = extraUnits * planCost;

    return {
      available,
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

      setIsUserValidatorError(false);
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

      setIsUserValidatorError(true);
    },
  });

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

  const handleUserAddCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = event.target.value.replace(/[^1-9]/g, '').slice(0, 1);
    setValue('user_add_count', sanitizedValue ? Number(sanitizedValue) : null, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleAddUser = () => {
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

    if (userAddCount < 1 || userAddCount > 9) {
      handleAlert({
        text: 'Please enter a number between 1 and 9.',
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

    if (userAddCount > maxAllowed) {
      handleAlert({
        text:
          availableLicensesToPurchase !== 'Unlimited' && userAddCount > availableLicensesToPurchase
            ? `You can only add up to ${availableLicensesToPurchase} users based on available licenses.`
            : `Maximum of 10 users can be added at once.`,
        type: 'warning',
      });
      return;
    }

    const remainingSlots = maxAllowed - currentCount;

    if (userAddCount > remainingSlots) {
      if (currentCount === 1 && userAddCount === maxAllowed) {
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

    const count = Math.min(userAddCount, remainingSlots);
    if (count <= 0) return;

    Array.from({ length: count }).forEach(() => {
      append({ ...userInitialState });
    });

    setValue('user_add_count', '');
  };

  // const handleAddUser = () => {
  //   const count = Math.min(userAddCount, 10 - users.length);

  //   if (count <= 0) return;

  //   for (let i = 0; i < count; i++) {
  //     append({ ...userInitialState });
  //   }
  //   setValue('user_add_count', '');
  // };

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

  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
      <div className="flex flex-col gap-1 mt-3">
        <p className="text-gray-900 text-center mb-2">
          Licenses available to purchase:{' '}
          {plan_info?.dataValues?.licenses !== 0
            ? plan_info?.dataValues?.licenses - dataGetMyPlanDetails?.license_detail?.total_licenses
            : 'Unlimited'}
        </p>

        <div className="flex flex-col items-stretch justify-center gap-3 md:flex-row md:items-start lg:justify-center">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="w-34">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[1-9]"
                placeholder="Enter no."
                value={String(userAddCountRaw ?? '')}
                onChange={handleUserAddCountChange}
              />
              <p className="text-[10px] ps-[2px] pt-1 text-gray-500">Enter number between 1-9</p>
            </div>
            <Button variant={'outline'} type="button" onClick={handleAddUser}>
              <Plus className="w-3 h-3" />
              Add Users
            </Button>
          </div>
          <div className="w-full md:max-w-[260px] lg:max-w-none lg:w-auto">
            <CustomSelect
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
        <p className="text-gray-700 text-center text-sm mt-1 flex items-center justify-center gap-1">
          Unused licenses: {licenseInfo?.available || 0}
          <CustomTooltip text="License purchased" side="top">
            <InfoIcon className="w-4 h-4 text-gray-500 cursor-pointer" />
          </CustomTooltip>
        </p>
        <p className="text-gray-700 text-center text-sm">
          New licenses purchased: {licenseInfo?.extraUnits || 0}
        </p>
      </div>
      <div className="flex flex-col my-2 gap-3 pr-0 md:pr-3 lg:gap-2">
        {fields?.map((_, index) => (
          <div
            key={index}
            className="mcm-invitee grid grid-cols-1 gap-3 rounded-xl border border-gray-200 p-3 md:grid-cols-2 xl:grid-cols-3"
          >
            <div className="w-full">
              <Input
                label="First Name"
                type="text"
                placeholder="First Name"
                {...register(`users.${index}.first_name`)}
                error={errors?.users?.[index]?.first_name?.message}
                maxLength={50}
              />
            </div>
            <div className="w-full">
              <Input
                label="Last Name"
                type="text"
                placeholder="Last Name"
                {...register(`users.${index}.last_name`)}
                error={errors?.users?.[index]?.last_name?.message}
                maxLength={50}
              />
            </div>
            <div className="w-full">
              <Input
                label="Email"
                type="email"
                placeholder="Email"
                {...register(`users.${index}.email`)}
                error={errors?.users?.[index]?.email?.message || validationErrors?.[index]?.email}
                onChange={(e) => {
                  const value = e.target.value;
                  setValue(`users.[${index}].email`, value, {
                    shouldValidate: true,
                  });
                  handleValidateUser({ value, type: 'email' }, index);
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <Label>Phone</Label>
                <div className="flex items-start">
                  {(errors?.users?.[index]?.phone?.message || validationErrors?.[index]?.phone) && (
                    <ErrorTooltip
                      text={
                        errors?.users?.[index]?.phone?.message || validationErrors?.[index]?.phone
                      }
                    />
                  )}
                </div>
              </div>
              <div className="flex w-full gap-1">
                <PhoneInput
                  country={'us'}
                  value={watch(`users.${index}.phone`)}
                  onChange={(value) => {
                    setValue(`users.[${index}].phone`, value, {
                      shouldValidate: true,
                    });
                    handleValidateUser({ value, type: 'phone' }, index);
                  }}
                  containerClass={`w-full ${errors?.users?.[index]?.phone?.message ? 'phone-error' : ''}`}
                  enableSearch={true}
                />
              </div>
            </div>

            <div className="w-full">
              <CustomSelect
                label="Role"
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
                  setValue(
                    `users.${index}.${['MANAGER', 'ADMIN', 'AGENT', 'SUB-ADMIN'].includes(e?.label || '') ? 'role_uuid' : 'custom_role_uuid'}`,
                    e?.value || { label: '', value: '' },
                    {
                      shouldValidate: true,
                    },
                  );
                }}
                error={errors?.users?.[index]?.role?.value?.message}
                isLoading={isPending}
              />
            </div>

            <div className="w-full">
              <Input
                label="Extension"
                type="text"
                placeholder="Extension"
                value={watch(`users.[${index}].extension`)}
                error={
                  errors?.users?.[index]?.extension?.message || validationErrors?.[index]?.extension
                }
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

            <Button
              type="button"
              variant={'outline'}
              className="w-10 h-10 self-end rounded-xl bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white border-0 lg:self-auto"
              onClick={() => generateNewExtension(index)}
            >
              <Icon name="Refresh" className="w-5 h-5" />
            </Button>

            {fields.length > 1 && (
              <div
                className="border-0 cursor-pointer self-end min-w-10 w-10 h-10 rounded-xl bg-red-100 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center lg:self-auto"
                onClick={() => remove(index)}
              >
                <TrashBin className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}
      </div>

      {licenseInfo.extraCharge ? (
        <OrderSummary
          customClass="w-full lg:w-4/6 xl:w-3/5 xxl:w-3/6"
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

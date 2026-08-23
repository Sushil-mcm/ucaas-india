import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getObjectLength } from '@/lib/utils';
import { FC, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { PermissionsAccordion } from '../role-permissions';
import { ROLE_DESCRIPTION_MAX_LENGTH, ROLE_NAME_MAX_LENGTH } from '../schema';
import { sanitizePlainTextInput } from '@/lib/utils';
import { extractPlanFeatures } from '@/hooks/rbac';

const SelectRole: FC<any> = ({
  rolesListData,
  setSelectedRole,
  selectedRole,
  companyJson,
  roleData,
  viewPermission,
}) => {
  const {
    setValue,
    register,
    watch,
    formState: { errors },
  } = useFormContext();
  const descriptionValue = String(watch('description') || '');
  const descriptionLength = Math.min(descriptionValue.length, ROLE_DESCRIPTION_MAX_LENGTH);

  useEffect(() => {
    if (rolesListData?.length && !roleData) {
      setSelectedRole(rolesListData[0]);
      setValue('permission', extractPlanFeatures(rolesListData[0]?.permission));
    }
  }, [rolesListData, setValue]);

  const handleRoleChange = (role_uuid: string) => {
    const findRoleObj = rolesListData?.find((item: any) => item?.role_uuid === role_uuid);
    if (getObjectLength(findRoleObj)) {
      setSelectedRole(findRoleObj);
      setValue('permission', extractPlanFeatures(findRoleObj?.permission));
    }
  };

  const filteredRoleListData =
    rolesListData?.filter((role: { company_uuid: string }) => role.company_uuid === 'PREDEFINED') ||
    [];
  return (
    <div className="flex w-full flex-col gap-4">
      {viewPermission ? (
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start">
            <span className="font-medium text-gray-900">Description:</span>
            <div className="font-normal text-gray-700 break-words">
              {sanitizePlainTextInput(selectedRole?.description, ROLE_DESCRIPTION_MAX_LENGTH)}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          {/* <div className="flex flex-col gap-1">
          <h5 className="font-semibold text-gray-900 text-md">Describe User Role</h5>
          <p className="text-gray-800 text-sm">Describe your user role here.</p>
        </div> */}
          <div className="w-full flex items-center gap-3">
            <div className="flex gap-4 w-full">
              <div className="flex w-full gap-1 relative">
                <Input
                  {...register(`name`)}
                  placeholder={'Enter Name'}
                  label="Enter Role Name"
                  error={errors?.name?.message}
                  maxLength={ROLE_NAME_MAX_LENGTH}
                />
              </div>
            </div>
          </div>
          <div className="w-full flex items-center gap-3">
            <div className="flex gap-4 w-full">
              <div className="flex w-full gap-1 relative">
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between">
                    <Label>Description</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-gray-500">
                        {descriptionLength}/{ROLE_DESCRIPTION_MAX_LENGTH}
                      </span>
                      {errors?.description?.message && (
                        <div className="flex items-start ">
                          <ErrorTooltip text={errors?.description?.message} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative w-full">
                    <div className="flex">
                      <textarea
                        className={`border normal-case focus:outline-none
  disabled:bg-gray-300 disabled:text-slate-500 disabled:border-gray-200 disabled:shadow-none
  text-gray-700 placeholder:text-gray-700 bg-white text-sm
  rounded-xl w-full p-3 min-h-10 resize-none
  ${
    errors?.description
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-primary hover:border-primary'
  }
`}
                        placeholder="Enter description"
                        rows={6}
                        maxLength={ROLE_DESCRIPTION_MAX_LENGTH}
                        {...register(`description`)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {!viewPermission && (
        <div className="flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex w-full flex-col gap-3">
            <h5 className="font-semibold text-gray-900 text-md">
              Select a role to use as a starting point.
            </h5>
            <RadioGroup
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4"
              value={selectedRole?.role_uuid}
              onValueChange={(value) => handleRoleChange(value)}
              disabled={selectedRole?.type === 'custom' && roleData}
            >
              {filteredRoleListData && filteredRoleListData?.length > 0
                ? filteredRoleListData?.map((role: any, index: number) => (
                    <div className="flex items-center gap-3" key={index}>
                      <RadioGroupItem
                        value={role.role_uuid}
                        id={role?.uuid}
                        className="cursor-pointer"
                      />
                      <Label htmlFor={role?.uuid} className="cursor-pointer break-words">
                        {role.name}
                      </Label>
                    </div>
                  ))
                : null}
            </RadioGroup>
          </div>
        </div>
      )}
      <div className="flex w-full rounded-xl border border-gray-200 bg-white">
        <div className="flex w-full flex-col gap-4 p-3 sm:p-4">
          {selectedRole?.permission && (
            // <RolePsermisions
            //   companyJson={companyJson}
            //   userJson={selectedRole?.permission?.plan_features}
            //   isRolesViewOnly={viewPermission}
            // />
            <PermissionsAccordion
              companyJson={companyJson}
              userJson={extractPlanFeatures(selectedRole.permission)}
              readOnly={viewPermission}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectRole;

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
            {/* The list below is ADMIN, SUB-ADMIN, MANAGER, AGENT, sitting
                directly under a free-text name box. It reads as "which of these
                is this person" rather than "which one shall I copy", so the role
                being built looks like it has to be one of them. It does not: the
                name above is the role, and this only decides what it starts
                with. */}
            <h5 className="font-semibold text-gray-900 text-md">
              Which role should this one start from?
            </h5>
            <p className="text-sm text-gray-600">
              Its permissions are copied in as a starting point, then you change what you need.
              The role you pick is not affected, and your new role keeps the name you typed
              above.
            </p>
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
          {/* Nothing was shown here until a starting point had been chosen — no
              list, no message, just an empty white box. A new role therefore
              looked like a form with no permissions in it, and the reasonable
              conclusion was that nothing could be ticked. The step above is
              required; it now says so here, where the missing thing is. */}
          {!selectedRole?.permission && !viewPermission && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                Choose a starting point above first
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Everything that role can do appears here, and you change what you need from
                there. It is a copy — the role you pick is not affected.
              </p>
            </div>
          )}
          {selectedRole?.permission && (
            // <RolePsermisions
            //   companyJson={companyJson}
            //   userJson={selectedRole?.permission?.plan_features}
            //   isRolesViewOnly={viewPermission}
            // />
            <>
              {!viewPermission && (
                /* The tree disables every other box in a group until that
                   group's own "view" is ticked, which reads as half the list
                   being broken unless somebody says why. */
                <p className="mb-2 text-xs text-gray-600">
                  Tick <b>view</b> in a section first — the rest of that section stays greyed
                  out until somebody can see it at all.
                </p>
              )}
              <PermissionsAccordion
                companyJson={companyJson}
                userJson={extractPlanFeatures(selectedRole.permission)}
                readOnly={viewPermission}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectRole;

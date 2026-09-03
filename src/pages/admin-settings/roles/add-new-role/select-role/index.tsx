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
import { ROLE_PRESETS, buildPresetPermission } from '../role-presets';
import { extractPlanFeatures } from '@/hooks/rbac';

/* Chosen as the value for "start empty". It is never sent to the API — the
   save strips it, because it names no real role. */
const BLANK_ROLE = '__blank__';

/* Marks a radio value as one of the ready-made roles rather than a real role id.
   Stripped before saving, like BLANK_ROLE. */
const PRESET_PREFIX = '__preset__:';

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
    /* A new role starts empty, not pre-copied from whichever role happened to be
       first in the list. Copying by default is how an administrator ends up with
       an Assistant that quietly holds everything ADMIN holds, having never
       chosen any of it. Starting empty makes every permission on the new role
       something somebody decided to grant. */
    if (rolesListData?.length && !roleData) {
      setSelectedRole({
        role_uuid: BLANK_ROLE,
        name: 'Nothing',
        permission: { plan_features: {} },
      });
      setValue('permission', {});
    }
  }, [rolesListData, setValue]);

  const handleRoleChange = (role_uuid: string) => {
    /* Starting from nothing.
    
       Every new role had to be copied from ADMIN, SUB-ADMIN, MANAGER or AGENT,
       which meant an administrator could not build a category of their own --
       an Assistant, a Billing clerk -- without first inheriting somebody else's
       permissions and then hunting through them for what to take away. That is
       backwards: the point of a custom role is deciding what it holds, not
       editing what it inherited.
    
       The whole menu comes from the company's own plan, not from the role being
       copied, so nothing is lost by starting empty: every permission the company
       has is listed, all of it unticked. */
    const preset = ROLE_PRESETS.find((entry) => `${PRESET_PREFIX}${entry.id}` === role_uuid);
    if (preset) {
      const permission = buildPresetPermission(preset, companyJson || {});
      setSelectedRole({ role_uuid, name: preset.name, permission: { plan_features: permission } });
      setValue('permission', permission);
      /* The name and description are filled in too. A ready-made role that still
         makes you type its name is only half a shortcut. Both stay editable. */
      setValue('name', preset.name);
      setValue('description', preset.description);
      return;
    }
    if (role_uuid === BLANK_ROLE) {
      setSelectedRole({ role_uuid: BLANK_ROLE, name: 'Nothing', permission: { plan_features: {} } });
      setValue('permission', {});
      return;
    }
    const findRoleObj = rolesListData?.find((item: any) => item?.role_uuid === role_uuid);
    if (getObjectLength(findRoleObj)) {
      setSelectedRole(findRoleObj);
      setValue('permission', extractPlanFeatures(findRoleObj?.permission));
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {viewPermission ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[#EEE7DD] bg-[#FBE2C8]/45 p-4">
          <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start">
            <span className="font-medium text-[#2E2D35]">Description:</span>
            <div className="font-normal text-[#2E2D35] break-words">
              {sanitizePlainTextInput(selectedRole?.description, ROLE_DESCRIPTION_MAX_LENGTH)}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-[#EEE7DD] bg-[#FBE2C8]/45 p-4 sm:p-5">
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
                    <Label required>Description</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-[#9A948F]">
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
  text-[#2E2D35] placeholder:text-[#2E2D35] bg-white text-sm
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
        <div className="flex w-full flex-col gap-3 rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-4 sm:p-5">
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
              Pick <b>Nothing</b> to choose every permission yourself, or copy an existing role
              and adjust it. Either way the role you pick is not affected, and your new role keeps
              the name you typed above.
            </p>
            {/* One option per line, always.

                This was a wrapping row on wider screens. Once the ready-made
                roles arrived — each two lines, a name above a description — they
                wrapped around the older single-line ones and the list came out
                jumbled: nine choices at three different heights, "Nothing"
                stranded mid-row. A list of things you pick exactly one of reads
                down, not across.

                The five are the answer for most companies, so they come first
                and stand alone. Copying an existing role is the rarer case and
                sits below a divider, out of the way of the decision. */}
            <RadioGroup
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4"
              value={selectedRole?.role_uuid}
              onValueChange={(value) => handleRoleChange(value)}
              disabled={selectedRole?.type === 'custom' && roleData}
            >
              {ROLE_PRESETS.map((preset) => (
                <label
                  key={preset.id}
                  htmlFor={`${PRESET_PREFIX}${preset.id}`}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2 py-2 hover:border-gray-200 hover:bg-gray-50"
                >
                  <RadioGroupItem
                    value={`${PRESET_PREFIX}${preset.id}`}
                    id={`${PRESET_PREFIX}${preset.id}`}
                    className="mt-0.5 shrink-0 cursor-pointer"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{preset.name}</span>
                    <span className="block text-xs text-gray-600">{preset.description}</span>
                  </span>
                </label>
              ))}

              <div className="my-2 border-t border-gray-200 pt-2">
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Or build it yourself
                </p>
              </div>

              <label
                htmlFor={BLANK_ROLE}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2 py-2 hover:border-gray-200 hover:bg-gray-50"
              >
                <RadioGroupItem
                  value={BLANK_ROLE}
                  id={BLANK_ROLE}
                  className="mt-0.5 shrink-0 cursor-pointer"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">
                    Nothing — start empty
                  </span>
                  <span className="block text-xs text-gray-600">
                    Every permission your plan has, all switched off. Tick only what this role
                    should hold.
                  </span>
                </span>
              </label>

              {/* MANAGER, AGENT and SUB-ADMIN used to be offered here as copy
                  sources, which made nine choices for one decision and buried
                  the five that answer it. Copying one of those is now the
                  Duplicate button on the roles list, which does the same job
                  from where you are already looking at the role you want to
                  copy. */}
            </RadioGroup>
          </div>
        </div>
      )}
      <div className="flex w-full rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
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
                Choose <b>Nothing</b> to start empty and tick only what this role should have,
                or copy an existing role and adjust it.
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

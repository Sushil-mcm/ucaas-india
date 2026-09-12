import { FC, useEffect, useState } from 'react';
import AlertConfirm from '@/components/custom/alert-confirm';
import { Button } from '@/components/ui/button';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { UPSERT_ROLE_INITIAL } from '../constants';
import { ROLE_DESCRIPTION_MAX_LENGTH, ROLE_NAME_MAX_LENGTH, UPSERT_ROLE_SCHEMA } from './schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { upsertCustomRole, userRolesList } from '@/services/api';
import SelectRole from './select-role';
import { extractPlanFeatures, useCompanyFeatures } from '@/hooks/rbac';
import { withWorkdayGroup } from '@/lib/workday-permissions';
import Loader from '@/components/custom/loader';
import { handleAlert, sanitizePlainTextInput } from '@/lib/utils';
import { invalidateRoleLists } from '@/lib/role-list-cache';
import { BLANK_PARENT, systemRoleUuid } from './role-presets';
import '@/components/mcm/mcm-page.css';

interface AddEditRoleProps {
  drawerState: boolean;
  setDrawerState: (state: boolean) => void;
  initialData?: Record<string, unknown> | null;
  roleData?: any;
  viewPermission?: boolean;
}

const AddEditUserRole: FC<AddEditRoleProps> = ({
  setDrawerState,
  initialData = null,
  roleData = null,
  viewPermission = false,
}) => {
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const { companyPlanFeatures } = useCompanyFeatures();
  const queryClient: any = useQueryClient();
  const form = useForm<typeof UPSERT_ROLE_INITIAL>({
    mode: 'onChange',
    defaultValues: UPSERT_ROLE_INITIAL,
    resolver: yupResolver(UPSERT_ROLE_SCHEMA as yup.AnyObjectSchema),
  });
  const { setValue } = form;

  const { data: allRoleList = [], isFetched } = useQuery({
    queryKey: ['useRolesListQueryFn'],
    queryFn: userRolesList,
    select: (res) => res?.data?.data?.result?.rows,
  });

  const { mutate: mutateUpsertCustomRole, isPending: isPendingCustomRole } = useMutation({
    mutationFn: upsertCustomRole,
    onSuccess: (data) => {
      handleAlert({
        text: data?.data?.data?.message || 'Custom role updated successfully!',
        type: 'success',
      });
      invalidateRoleLists(queryClient);
      setDrawerState(false);
    },
  });

  /* Saving a role is held behind a confirmation.
  
     A role decides what every person holding it can see. Changing one is not
     like changing a setting on your own phone: the people affected are not in
     the room, will not be told, and will simply find a screen missing the next
     time they look. The count of who holds it is shown, because "this changes
     what 12 people can see" is the fact that decides whether you meant to. */
  const [pendingSave, setPendingSave] = useState<typeof UPSERT_ROLE_INITIAL | null>(null);

  const onSubmit = (values: typeof UPSERT_ROLE_INITIAL) => setPendingSave(values);

  /* The parent built-in role this role is saved under.

     The server keeps a parent on every company role (custom_roles.role_uuid,
     NOT NULL) and it is what the holder becomes on the server side - AGENT
     means their own calls and numbers only. The sentinels for "Nothing" and
     the ready-made roles name no real row, so for those the parent is looked
     up by name in the list the server returned. A copied or edited role
     already carries its own. Without a parent the server refused every save
     from a preset or from "Nothing" - silently, as a 500. */
  const parentRoleUuid = (): string => {
    const chosen = String(selectedRole?.role_uuid || '');
    if (chosen && chosen !== '__blank__' && !chosen.startsWith('__preset__:')) return chosen;
    return systemRoleUuid(allRoleList, selectedRole?.parent || BLANK_PARENT);
  };

  const confirmSave = () => {
    if (!pendingSave) return;
    const role_uuid = parentRoleUuid();
    if (!role_uuid) {
      handleAlert({
        text: 'This company has no built-in role to base a new one on, so the role cannot be saved.',
        type: 'error',
      });
      setPendingSave(null);
      return;
    }
    mutateUpsertCustomRole({
      name: pendingSave.name,
      description: pendingSave.description,
      permission: { plan_features: pendingSave.permission },
      role_uuid,
      ...(roleData?.uuid ? { uuid: roleData.uuid } : {}),
    });
    setPendingSave(null);
  };

  useEffect(() => {
    if (roleData) {
      setValue('name', sanitizePlainTextInput(roleData?.name, ROLE_NAME_MAX_LENGTH));
      setValue(
        'description',
        sanitizePlainTextInput(roleData?.description, ROLE_DESCRIPTION_MAX_LENGTH),
      );
      setValue('permission', extractPlanFeatures(roleData?.permission));
      setSelectedRole(roleData);
    }
  }, [roleData]);

  return (
    <>
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mcm-page mcm-userform flex h-full min-h-0 flex-col gap-4 pt-3 sm:pt-4"
        >
          {isFetched ? (
            <div className="flex h-full min-h-0 w-full flex-col justify-between gap-4">
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                <SelectRole
                  {...{
                    rolesListData: allRoleList,
                    setSelectedRole,
                    selectedRole,
                    /* The agent workday group is not a plan feature - everybody
                       has a workday - so it is merged in here for the boxes. */
                    companyJson: withWorkdayGroup(companyPlanFeatures),
                    initialData,
                    roleData,
                    viewPermission,
                  }}
                />
              </div>
              <div className="gp-role-form-footer flex flex-col-reverse gap-2 border-t border-gray-200 pt-3 sm:flex-row sm:justify-end sm:pt-4">
                <Button
                  type="button"
                  variant={'transparent'}
                  onClick={() => setDrawerState(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>

                {/* Rendered here rather than beside the list, because this is the
                    screen that knows what is about to change. */}
                <AlertConfirm
                  open={!!pendingSave}
                  setOpen={() => setPendingSave(null)}
                  onConfirm={confirmSave}
                  apiLoading={isPendingCustomRole}
                  headerText={roleData?.uuid ? 'Update this role?' : 'Create this role?'}
                  confirmBtnText={roleData?.uuid ? 'Yes, update it' : 'Yes, create it'}
                  closeBtnText="Go back"
                  descriptionTextComp={
                    roleData?.uuid ? (
                      <span>
                        Everyone on <b>{pendingSave?.name || roleData?.name}</b> sees the change the
                        next time they open the app
                        {typeof roleData?.user_count === 'number'
                          ? ` — that is ${roleData.user_count} ${
                              roleData.user_count === 1 ? 'person' : 'people'
                            }`
                          : ''}
                        . Nobody is told, so anything you remove simply stops being there for them.
                      </span>
                    ) : (
                      <span>
                        <b>{pendingSave?.name}</b> will be created. Nobody holds it until you assign
                        it, so nothing changes for anyone yet.
                      </span>
                    )
                  }
                />

                {roleData?.company_uuid === 'PREDEFINED' ? null : (
                  <Button
                    type="submit"
                    variant={'primary'}
                    disabled={isPendingCustomRole}
                    className="w-full sm:w-auto"
                  >
                    {isPendingCustomRole ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center gap-2 h-[calc(100%_-_45px)] w-full mx-auto">
              <Loader variant="blue" />
            </div>
          )}
        </form>
      </FormProvider>
    </>
  );
};

export default AddEditUserRole;

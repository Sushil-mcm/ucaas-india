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
import Loader from '@/components/custom/loader';
import { handleAlert, sanitizePlainTextInput } from '@/lib/utils';
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
      queryClient.invalidateQueries(['rolesList'], { exact: true });
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

  const confirmSave = () => {
    if (!pendingSave) return;
    mutateUpsertCustomRole({
      name: pendingSave.name,
      description: pendingSave.description,
      permission: { plan_features: pendingSave.permission },
      /* The blank starting point names no real role, so it is not sent. */
      ...(selectedRole?.role_uuid && selectedRole.role_uuid !== '__blank__'
        ? { role_uuid: selectedRole.role_uuid }
        : {}),
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
                    companyJson: companyPlanFeatures,
                    initialData,
                    roleData,
                    viewPermission,
                  }}
                />
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-3 sm:flex-row sm:justify-end sm:pt-4">
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

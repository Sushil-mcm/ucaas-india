import { FC, useEffect, useState } from 'react';
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

  const onSubmit = (values: typeof UPSERT_ROLE_INITIAL) => {
    const data = {
      name: values.name,
      description: values.description,
      permission: { plan_features: values.permission },
      role_uuid: selectedRole?.role_uuid,
      ...(roleData && { uuid: roleData?.uuid }),
    };

    mutateUpsertCustomRole(data);
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
          className="flex h-full min-h-0 flex-col gap-4 pt-3 sm:pt-4"
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

                {roleData?.company_uuid === 'PREDEFINED' ? null : (
                  <Button
                    type="submit"
                    variant={'outline'}
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

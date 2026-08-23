import { capitalizeFirstLetter, handleAlert } from '@/lib/utils';
import { assignNumber, reserveDid } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';
import AssignItem from './assign-item';
import { Button } from '@/components/ui/button';
import Loader from '@/components/custom/loader';
import { CloseIcon } from '@/assets/icons';
import { requiredString } from '@/schema/common';
import { useUser } from '@/hooks/use-user';
import { normalizeDidCountries } from '@/lib/did-countries';
import { useMemo } from 'react';

const assignNumberSchemaValidation = yup.object().shape({
  users: yup
    .array()
    .of(
      yup.object().shape({
        country: yup.object({ value: requiredString('Country') }),
        state: yup.object({ value: requiredString('State') }),
        city: yup.object({ value: requiredString('Area Code') }),
        groupId: yup.object({ value: yup.string().required(` DID Prefix is required`) }),
        did_number: yup.object({
          value: yup
            .number()
            .required(`DID Number is required`)
            .typeError('DID Number is required'),
        }),
      }),
    )
    .min(1, 'At least one assign number is required'),
});

const MultipleAssignNumber = ({ users, handleClose }: { users: any; handleClose: any }) => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const countryOptions = useMemo(() => {
    return normalizeDidCountries(user?.company_info?.allow_country)
      .sort((a, b) => a.country_name.localeCompare(b.country_name))
      .map((country) => ({
        label: country.country_name,
        value: country.country_code_iso2,
      }));
  }, [user?.company_info?.allow_country]);

  const formInstance = useForm({
    defaultValues: {
      users: users || [],
    },
    resolver: yupResolver(assignNumberSchemaValidation),
  });

  const { handleSubmit, control } = formInstance;

  const { fields }: any = useFieldArray({
    control,
    name: 'users',
  });

  const showName =
    fields?.length === 1
      ? `${capitalizeFirstLetter(fields?.[0]?.first_name)} ${capitalizeFirstLetter(fields?.[0]?.last_name)}`
      : null;

  const { mutate, isPending } = useMutation({
    mutationFn: assignNumber,
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['fetchUsersList'], exact: false, type: 'all' });
      handleAlert({ text: data?.data?.message, type: 'success' });
      handleClose();
    },
  });
  const { mutateAsync: reserveNumbers, isPending: reserveLoading } = useMutation({
    mutationKey: ['reserveDid'],
    mutationFn: reserveDid,
  });

  const onSubmit = async (data: any) => {
    const payload = data?.users?.map(
      ({
        country = null,
        state = null,
        city = null,
        did_number = null,
        extension = null,
        first_name = '',
        last_name = '',
        uuid: user_uuid = '',
      }: any) => ({
        id: String(did_number?.value) || '',
        name: `${first_name} ${last_name}`,
        country: country?.label || '',
        state: state?.value || '',
        city: city?.value || '',
        extension,
        user_uuid,
      }),
    );

    const reservationsByCountry: Map<string, string[]> = (data?.users || []).reduce(
      (groups: Map<string, string[]>, item: any) => {
        const countryIso = item?.country?.value;
        const didId = item?.did_number?.value;

        if (countryIso && didId) {
          groups.set(countryIso, [...(groups.get(countryIso) || []), didId]);
        }

        return groups;
      },
      new Map<string, string[]>(),
    );

    try {
      await Promise.all(
        Array.from(reservationsByCountry.entries()).map(([countryIso, availableDidIds]) =>
          reserveNumbers({
            available_did_id: availableDidIds,
            country_iso: countryIso,
          }),
        ),
      );
      mutate({ users: payload });
    } catch (error: any) {
      handleAlert({
        text: error?.response?.data?.data?.message || 'Unable to reserve the selected number.',
        type: 'error',
      });
    }
  };
  return (
    <div className="w-full overflow-x-hidden overflow-y-auto">
      <div className="flex flex-col gap-1.5  text-900/80 ">
        <div className="font-semibold truncate text-md flex items-center justify-between">
          Assign Number to {showName ? `${showName}` : ''}
          <div
            onClick={() => handleClose(false)}
            className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
          >
            <CloseIcon className="w-3 h-3" />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 ">
        {fields?.map((field: any, index: number) => {
          return (
            <AssignItem
              key={field?.id || field?.uuid || index}
              {...{
                field,
                index,
                countryOptions,
                formInstance,
              }}
            />
          );
        })}

        <div className="flex justify-end gap-2">
          <Button type="button" variant={'transparent'} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            className="min-w-[138px]"
            variant={'outline'}
            type="submit"
            disabled={isPending || reserveLoading}
          >
            {isPending || reserveLoading ? <Loader variant="blue" /> : 'Assign Number'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MultipleAssignNumber;

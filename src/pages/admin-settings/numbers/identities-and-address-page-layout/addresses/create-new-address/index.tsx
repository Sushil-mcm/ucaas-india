import { XIcon } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, getObjectLength, handleAlert } from '@/lib/utils';
import {
  deleteUploadedFile,
  getAddressesList,
  getIdentityList,
  getIdentityProofType,
  getIdentityRequirements,
} from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderClosedIcon, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray } from 'react-hook-form';
import countryList from '@/lib/countries.json';
import Loader from '@/components/custom/loader';

const CreateNewAddress = ({
  rowData,
  formInstance,
  className,
}: {
  rowData?: any;
  formInstance?: any;
  className?: string;
}) => {
  const { isEdit = false, formData = {} } = rowData || {};
  const queryClient = useQueryClient();
  const [fileNames, setFileNames] = useState<{ [key: number]: string }>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    control,
    watch,
    register,
    reset,
    setValue,
    trigger,
    formState: { errors },
  } = formInstance;
  const { append, remove, fields } = useFieldArray({
    control: control,
    name: 'addressProofs',
  });
  const [
    watchProofs,
    // watchRequirementsType,
    watchRequirementCountry,
    watchNumberType,
    watchIdentity,
  ] = watch([
    'addressProofs',
    // 'requirements_type',
    'requirements_country',
    'number_type',
    'identity_id',
  ]);

  const { data: identityRequirements = {}, isLoading: isCountryLoading } = useQuery({
    queryKey: ['getIdentityRequirements'],
    queryFn: () => getIdentityRequirements(),
    select: (data) => data?.data?.data?.result?.rows || {},
  });
  const { CountryData, groupTypeData, data: requirementData } = identityRequirements || {};

  const { data: getIdentities = [] } = useQuery({
    queryKey: ['getIdentityList'],
    queryFn: () => getIdentityList(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const { data: didProofTypeList = [] } = useQuery({
    queryKey: ['getIdentityProofType'],
    queryFn: () =>
      getIdentityProofType({
        type: 'address',
      }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const { data: addressData = [] } = useQuery({
    queryKey: ['getSingleAddressList', isEdit],
    queryFn: () =>
      getAddressesList({
        search_filters: [{ uuid: formData?.uuid }],
      }),
    select: (data) => data?.data?.data?.result?.rows?.[0] || {},
    enabled: isEdit,
  });

  const { mutateAsync: deleteDocumentAsync, isPending: isdeleteFileLoading } = useMutation({
    mutationKey: ['deleteUploadedFile'],
    mutationFn: deleteUploadedFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getSingleAddressList'] });
      // queryClient.invalidateQueries({ queryKey: ['getAddressesList'] });
      setDeletingId(null);
    },
    onError: () => setDeletingId(null),
  });

  useEffect(() => {
    if (getIdentities?.length && getObjectLength(formData) && !isEdit) {
      const getIdentity = getIdentities?.find(
        (item: { identity_id: string }) => item?.identity_id == formData?.identity_id,
      );
      const obj = {
        label: `${getIdentity?.identity?.firstname} ${getIdentity?.identity?.lastname}`,
        value: getIdentity?.identity_id,
      };
      setValue('identity_id', obj);
    }
  }, [getIdentities, formData]);

  useEffect(() => {
    if (isEdit && addressData && getObjectLength(addressData)) {
      const { address: addressObj = {}, address_proof = [] } = addressData || {};
      const {
        country = '',
        city = '',
        zipcode = '',
        address = '',
        state = '',
        description = '',
        requirements_type = {},
        requirements_country = {},
        number_type = {},
      } = addressObj || {};
      const getCountry = countryList?.find((item) => item?.isoCode == country);
      const { identity = {}, identity_id = '' } =
        getIdentities?.find((item: any) => item?.identity_id == addressData?.identity_id) || {};
      const proofs = address_proof?.map(({ filename, proof_type_id, uuid }: any) => ({
        file: filename,
        proof_type_id: {
          label: didProofTypeList?.find(({ id }: any) => id === proof_type_id)?.name,
          value: proof_type_id,
        },
        uuid,
      }));
      reset({
        identity_id: {
          label: `${identity?.firstname} ${identity?.lastname}`,
          value: identity_id,
        },
        country: { label: getCountry?.name, value: getCountry?.isoCode },
        city,
        zipcode,
        address,
        address_state: state,
        addressDescription: description,
        addressProofs: proofs,
        requirements_type: {
          label: requirements_type?.label,
          value: requirements_type?.value,
        },
        requirements_country,
        number_type,
      });
    }
  }, [isEdit, addressData]);

  const onFileChange = (event: any, index: number) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const MAX_SIZE = 5 * 1024 * 1024;

    if (file?.size > MAX_SIZE) {
      handleAlert({ text: 'File size should not exceed 5MB', type: 'error' });
      event.target.value = '';
      return;
    }
    setValue(`addressProofs[${index}].file`, file, {
      shouldValidate: true,
    });
    setFileNames((prev) => ({ ...prev, [index]: file?.name }));
  };

  const handleDeleteFiles = async (fileId: string) => {
    setDeletingId(fileId);
    const payload = { proof_id: fileId, type: 'address' };
    await deleteDocumentAsync(payload);
  };

  return (
    <div
      className={cn('flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto pr-1', className)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex w-full flex-col gap-6 xl:flex-row">
          <div className="w-full flex flex-col gap-4">
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <div className="w-full">
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      {...field}
                      label="Country"
                      placeholder="Select Country"
                      value={field.value}
                      isDisabled={watchIdentity}
                      handleChange={field.onChange}
                      options={
                        countryList?.map((country: any) => ({
                          label: country?.name || '',
                          value: country?.isoCode || '',
                        })) || []
                      }
                      error={errors?.country?.message}
                    />
                  )}
                />
              </div>
              <div className="w-full">
                <Controller
                  name="identity_id"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      {...field}
                      label="Identity"
                      isDisabled={watchIdentity}
                      value={field.value}
                      handleChange={(val) => field.onChange(val)}
                      options={
                        (getIdentities &&
                          getIdentities?.length > 0 &&
                          getIdentities?.map(({ identity_id, identity }: any) => ({
                            label: `${identity?.firstname} ${identity?.lastname}`,
                            value: identity_id,
                          }))) ||
                        []
                      }
                      error={errors?.identity_id?.message}
                    />
                  )}
                />
              </div>
            </div>
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <div className="w-full">
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="City"
                      placeholder="Enter city"
                      error={errors?.city?.message}
                    />
                  )}
                />
              </div>
              <div className="w-full">
                <Controller
                  name="zipcode"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Postal Code"
                      placeholder="Enter postal code"
                      error={errors?.zipcode?.message}
                    />
                  )}
                />
              </div>
            </div>
            <div className="w-full flex gap-4">
              <div className="w-full">
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Address"
                      placeholder="Enter address"
                      error={errors?.address?.message}
                    />
                  )}
                />
              </div>
            </div>
            <div className="w-full flex gap-4">
              <div className="w-full">
                <Controller
                  // changed the name cause there is multiple state
                  name="address_state"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value}
                      label="State/Province/Region"
                      placeholder="Enter"
                      error={errors?.address_state?.message}
                    />
                  )}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <Label className="text-sm leading-none font-medium">Description</Label>
              <Controller
                name="addressDescription"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className="w-full h-full leading-7 p-2 rounded-xl text-sm overflow-y-auto placeholder:text-gray-700 focus:ring-0 focus-visible:shadow-none focus-visible:outline-0 text-gray-900 shadow-none resize-none border border-gray-200"
                    rows={3}
                    placeholder="Type Here..."
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-md font-semibold">Proofs</div>
              <div className="flex flex-col gap-2 w-full max-h-60 overflow-auto">
                {fields?.map((res: any, index: number) => {
                  const isStringFile = typeof res?.file === 'string';
                  if (isStringFile) {
                    return (
                      <div key={res?.id} className="flex justify-between items-center">
                        <div className="font-light">
                          {
                            didProofTypeList?.find(
                              ({ id }: any) => id === res?.proof_type_id?.value,
                            )?.name
                          }
                        </div>
                        <Button
                          type="button"
                          disabled={isdeleteFileLoading && deletingId === res?.id}
                          className="bg-red-50 text-red-500 hover:bg-red-500 shadow-none border border-red-500 min-w-28 rounded-full"
                          onClick={() => handleDeleteFiles(res?.uuid)}
                        >
                          {isdeleteFileLoading && deletingId === res?.id ? (
                            <Loader variant="white" />
                          ) : (
                            <Trash2 />
                          )}
                          Delete
                        </Button>
                      </div>
                    );
                  }
                  return (
                    <div
                      className="flex w-full flex-col justify-between gap-4 md:flex-row md:items-end"
                      key={res.id}
                    >
                      <div className="w-full">
                        <Controller
                          name={`addressProofs[${index}].proof_type_id`}
                          control={control}
                          render={({ field }) => {
                            const selectedProofIds = watchProofs?.map(
                              (item: { proof_type_id: { value: string } }) =>
                                item?.proof_type_id?.value,
                            );
                            const filteredOptions =
                              didProofTypeList?.length > 0
                                ? didProofTypeList
                                    .filter(
                                      ({ id }: { id: string }) => !selectedProofIds?.includes(id),
                                    )
                                    .map(({ id, name }: { id: string; name: string }) => ({
                                      label: name,
                                      value: id,
                                    }))
                                : [];
                            return (
                              <CustomSelect
                                {...field}
                                value={field.value}
                                handleChange={(val) => field.onChange(val)}
                                placeholder="Select Document"
                                options={filteredOptions}
                                error={errors?.addressProofs?.[index]?.proof_type_id?.message}
                              />
                            );
                          }}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Label
                          className={`flex content-center cursor-pointer items-center border min-w-36 rounded-lg h-10 px-4 py-2 gap-2 ${errors?.addressProofs?.[index]?.file?.message ? 'text-red-500 border-red-500 hover:text-red-500' : 'text-primary border-primary hover:bg-primary hover:text-white'}`}
                        >
                          <input
                            type="file"
                            accept=".pdf, .jpg, .png"
                            id={`file-${index}`}
                            {...register(`addressProofs[${index}].file`)}
                            hidden
                            onChange={(e) => onFileChange(e, index)}
                          />
                          <FolderClosedIcon className="w-4.5" />
                          <p className="truncate max-w-[120px]">
                            {fileNames[index] || 'Select Files'}
                          </p>
                        </Label>
                        <Button
                          className="hover:bg-red-500 bg-transparent hover:text-white text-red-500"
                          variant={'destructive'}
                          onClick={() => {
                            remove(index);
                            setFileNames((prev) => {
                              const updatedFileNames = { ...prev };
                              delete updatedFileNames[index];
                              return updatedFileNames;
                            });
                          }}
                        >
                          <XIcon />
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-1">
                {/* <div className="text-xs text-grey-400 w-full">
                  Select and upload multiple files by holding the control or command key
                </div>
                <div className="text-xs text-grey-400 w-full">Max number of files per type: 5</div> */}
                <div className="text-xs text-grey-400 w-full">Max total upload size: 20MB</div>
                <div className="text-xs text-grey-400 w-full">Accepted formats: pdf, jpg, png</div>
              </div>
              <div className="w-full flex mb-4">
                {didProofTypeList?.length !== fields?.length && (
                  <Button
                    className="max-w-[140px]"
                    type="button"
                    variant={'outline'}
                    onClick={() => {
                      if (fields?.length >= didProofTypeList?.length) return;
                      append({ proof_type_id: null, file: null });
                      const newIndex = fields.length;
                      trigger(`addressProofs.${newIndex}`);
                    }}
                    disabled={fields?.length >= didProofTypeList?.length}
                  >
                    Add New
                  </Button>
                )}
              </div>
            </div>
            {errors?.addressProofs?.message && (
              <div className="flex items-start text-sm text-red-500">
                {errors?.addressProofs?.message}
              </div>
            )}
          </div>
          <div className="hidden h-full w-full max-w-[1px] bg-contrast xl:block"></div>
          <div className="flex w-full flex-col gap-4">
            <div className="text-md font-semibold">Requirements</div>
            <div className="flex flex-col gap-2">
              <div className="text-sm text-grey-400 w-full">
                Select the requirement type and country to see detailed information about service
                activation
              </div>
            </div>
            <div className="w-full">
              <Controller
                name="requirements_type"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    {...field}
                    label="Type"
                    value={field.value}
                    placeholder="Select Type"
                    handleChange={(val) => {
                      field.onChange(val);
                      setValue('requirements_country', '');
                      setValue('number_type', '');
                    }}
                    options={[
                      {
                        label: 'Registration',
                        value: 'registration',
                      },
                    ]}
                  />
                )}
              />
            </div>
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <div className="w-full">
                <Controller
                  name="requirements_country"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      {...field}
                      label="Country"
                      isLoading={isCountryLoading}
                      isDisabled={watchIdentity}
                      value={field.value || ''}
                      handleChange={(val) => {
                        field.onChange(val);
                        setValue('number_type', '');
                      }}
                      options={
                        (CountryData &&
                          CountryData?.length > 0 &&
                          CountryData?.map(
                            ({ iso, id, name }: { name: string; iso: string; id: string }) => ({
                              label: name,
                              value: id,
                              isoCode: iso,
                            }),
                          )) ||
                        []
                      }
                      placeholder="Select Country"
                    />
                  )}
                />
              </div>
              <div className="flex flex-col w-full gap-1.5">
                <Label>Number Type</Label>
                <div className="flex items-center w-full gap-2">
                  <div className="w-full">
                    <Controller
                      name="number_type"
                      control={control}
                      render={({ field }) => (
                        <CustomSelect
                          {...field}
                          value={field.value}
                          handleChange={field.onChange}
                          options={
                            (groupTypeData &&
                              groupTypeData?.map(({ name, id }: { name: string; id: string }) => ({
                                label: name,
                                value: id,
                              }))) ||
                            []
                          }
                          placeholder="Select Type"
                          //   disableOptions={
                          //     requirementData &&
                          //     requirementData?.length > 0 &&
                          //     requirementData
                          //       ?.filter(
                          //         ({ country_id }: { country_id: string }) =>
                          //           country_id === watchRequirementCountry,
                          //       )
                          //       ?.map(({ group_type_id }: { group_type_id: string }) => group_type_id)
                          //   }
                          isDisabled={!watchRequirementCountry || watchIdentity}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
            {watchNumberType ? (
              <div className="flex flex-col gap-2 border border-contrast p-4 rounded-md">
                <div
                  className="text-sm text-grey-600 w-full"
                  style={{ whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{
                    __html:
                      requirementData?.find(
                        ({
                          group_type_id,
                          country_id,
                        }: {
                          group_type_id: string;
                          country_id: string;
                        }) =>
                          group_type_id === watchNumberType?.value &&
                          country_id === watchRequirementCountry?.value,
                      )?.restriction_message || '',
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNewAddress;

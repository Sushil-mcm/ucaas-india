import CustomSelect from '@/components/custom/custom-select';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  deleteUploadedFile,
  getIdentityList,
  getIdentityProofType,
  getIdentityRequirements,
  getIdentitySupportingDocumentTemplate,
} from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderClosedIcon, Trash2, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import countryList from '@/lib/countries.json';
import {
  capitalizeFirstLetter,
  cn,
  downloadFileFromURL,
  getObjectLength,
  handleAlert,
} from '@/lib/utils';
import { extractFileNameFromUrl, monthsArray, typeArray } from '../constants';
import Loader from '@/components/custom/loader';

const CreateIdentity = ({ formInstance, className, rowData }: any) => {
  const { isEdit = false, formData = {} } = rowData || {};
  const queryClient = useQueryClient();
  const [fileNames, setFileNames] = useState<{ [key: number]: string }>({});
  const [supportingDocuemntFileNames, setSupportingDocumentFileNames] = useState<{
    [key: number]: string;
  }>({});
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
    name: 'proofs',
  });
  const {
    append: appendSupportingDoc,
    remove: removeSupportingDoc,
    fields: supportingDocuments,
  } = useFieldArray({
    control: control,
    name: 'supporting_documents',
  });

  const [
    watchType,
    watchProofs,
    watchRequirementCountry,
    watchNumberType,
    watchSupportingDoc,
    watchMainNumberType,
    watchLocation,
  ] = watch([
    'type',
    'proofs',
    'requirements_country',
    'number_type',
    'supporting_documents',
    'numberType',
    'location',
  ]);
  const { data: identityData = [], isFetching: isIdentityProofLoading } = useQuery({
    queryKey: ['getSingleIdentityList', isEdit, formData?.uuid ?? null],
    queryFn: () =>
      getIdentityList({
        search_filters: [{ uuid: formData?.uuid }],
      }),
    select: (data) => data?.data?.data?.result?.rows?.[0] || {},
    enabled: isEdit,
  });
  console.log('🚀 ~ CreateIdentity ~ identityData:', identityData);
  console.log('🚀 ~ CreateIdentity ~ isIdentityProofLoading:', isIdentityProofLoading);

  const { data: identityRequirements = {} } = useQuery({
    queryKey: ['getIdentityRequirements'],
    queryFn: () => getIdentityRequirements(),
    select: (data) => data?.data?.data?.result?.rows || {},
  });
  const { CountryData, groupTypeData, data: requirementData } = identityRequirements || {};

  const { data: didSupportingDocList = [] } = useQuery({
    queryKey: ['getIdentitySupportingDocumentTemplate'],
    queryFn: () => getIdentitySupportingDocumentTemplate(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const { data: didProofTypeList = [] } = useQuery({
    queryKey: ['getIdentityProofType', watchType],
    queryFn: () => getIdentityProofType({ type: watchType?.value }),
    select: (data) => data?.data?.data?.result?.rows || [],
    enabled: !!watchType,
  });

  const { mutateAsync: deleteDocumentAsync } = useMutation({
    mutationKey: ['deleteUploadedFile'],
    mutationFn: deleteUploadedFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getSingleIdentityList'] });
      setDeletingId(null);
    },
    onError: () => setDeletingId(null),
  });

  useEffect(() => {
    const {
      identity = {},
      identity_proof = [],
      identity_supporting_document = [],
    } = identityData || {};
    if (identityData && getObjectLength(identityData)) {
      const {
        type = '',
        company_name = '',
        requirements_type,
        requirements_country,
        company_registration_number = '',
        vat_number = '',
        website = '',
        firstname = '',
        lastname = '',
        email = '',
        prefix = '',
        phone = '',
        tax_id = '',
        id_number = '',
        country = '',
        birth_place = '',
        birth_date = '',
        number_type = {},
        description = '',
      } = identity || {};
      const birthDate = birth_date?.split('-') || [];
      const getMonth = monthsArray?.find((item) => item?.value == birthDate?.[1]);
      const getCountry = countryList?.find((item) => item?.isoCode == country);
      const getPlaceOfBirth = countryList?.find((item) => item?.isoCode == birth_place);
      const proofs = identity_proof?.map(({ filename, proof_type_id, uuid }: any) => ({
        file: filename,
        proof_type_id: {
          label: didProofTypeList?.find(({ id }: any) => id === proof_type_id)?.name,
          value: proof_type_id,
        },
        uuid,
      }));
      const supporting_documents = identity_supporting_document?.map(
        ({ filename, proof_type_id, uuid }: any) => {
          return {
            file: filename,
            supporting_document_template_id: {
              label: didSupportingDocList?.find(({ id }: any) => id === proof_type_id)?.attributes
                ?.name,
              value: proof_type_id,
            },
            uuid,
          };
        },
      );
      reset({
        company_name,
        company_registration_number,
        vat_number,
        website,
        type: { label: capitalizeFirstLetter(type), value: type },
        firstname,
        lastname,
        requirements_type: {
          label: capitalizeFirstLetter(requirements_type),
          value: requirements_type,
        },
        requirements_country,
        number_type,
        email,
        phone: `${prefix}${phone}`,
        tax_id,
        id_number,
        country: { label: getCountry?.name, value: getCountry?.isoCode },
        birth_place: { label: getPlaceOfBirth?.name, value: getPlaceOfBirth?.isoCode },
        day: birthDate?.[2],
        month: getMonth,
        year: birthDate?.[0],
        description,
        proofs,
        supporting_documents,
      });
    }
  }, [isEdit, identityData, groupTypeData]);

  useEffect(() => {
    if (CountryData && !isEdit) {
      const getCountry = CountryData?.find(
        (item: { iso: string }) => item?.iso === watchLocation?.value,
      );
      const obj = {
        label: getCountry?.name,
        value: getCountry?.id,
        isoCode: getCountry?.iso,
      };
      setValue('requirements_country', obj);
      setValue('number_type', watchMainNumberType);
    }
  }, [watchLocation, watchMainNumberType, CountryData, isEdit]);

  const onFileChange = (event: any, index: number) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file?.size > MAX_SIZE) {
      handleAlert({ text: 'File size should not exceed 5MB', type: 'error' });
      event.target.value = '';
      return;
    }
    setValue(`proofs[${index}].file`, file, {
      shouldValidate: true,
    });
    setFileNames((prev) => ({ ...prev, [index]: file?.name }));
  };

  const onSupportingDocumentFileChange = (event: any, index: number) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file?.size > MAX_SIZE) {
      handleAlert({ text: 'File size should not exceed 5MB', type: 'error' });
      event.target.value = '';
      return;
    }
    setValue(`supporting_documents[${index}].file`, file, {
      shouldValidate: true,
    });
    setSupportingDocumentFileNames((prev) => ({ ...prev, [index]: file?.name }));
  };

  const handleDeleteFiles = async (
    fileId: string,
    type: 'identity' | 'supporting_document' | 'address',
  ) => {
    setDeletingId(fileId);
    const payload = { proof_id: fileId, type };
    await deleteDocumentAsync(payload);
  };

  return (
    <div
      className={cn('flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto pr-1', className)}
    >
      <div className="flex w-full flex-col gap-4 xl:flex-row">
        <div className="flex w-full h-full flex-col gap-4">
          <div className="w-full flex flex-col gap-4">
            <div className="flex w-full gap-1 relative">
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    {...field}
                    label={'Type'}
                    placeholder={'Select type'}
                    value={field.value}
                    handleChange={(value) => field.onChange(value)}
                    error={errors?.type?.message}
                    options={typeArray}
                  />
                )}
              />
            </div>
            {watchType?.value === 'business' && (
              <>
                <div className="flex w-full gap-1 relative">
                  <Controller
                    name="company_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label="Company Name"
                        error={errors?.company_name?.message}
                        placeholder={'Enter company name'}
                      />
                    )}
                  />
                </div>
                <div className="flex w-full flex-col gap-4 md:flex-row">
                  <div className="flex w-full gap-1 relative">
                    <Controller
                      name="company_registration_number"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          label="Company Registration Number"
                          error={errors?.company_registration_number?.message}
                          placeholder={'Enter registration number '}
                        />
                      )}
                    />
                  </div>
                  <div className="flex w-full gap-1 relative">
                    <Controller
                      name="vat_number"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          label="VAT/TAX Number"
                          error={errors?.vat_number?.message}
                          placeholder={'Enter VAT/TAX number'}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="flex w-full gap-1 relative">
                  <Controller
                    name="website"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label="Company Website"
                        error={errors?.website?.message}
                        placeholder={'Enter company website'}
                      />
                    )}
                  />
                </div>
              </>
            )}
            {watchType?.value === 'business' && (
              <h3 className="text-shadow-gray-900 flex items-center gap-1.5 font-medium">
                Representative's Details
              </h3>
            )}
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <div className="flex w-full gap-1 relative">
                <Controller
                  name="firstname"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="First Name"
                      error={errors?.firstname?.message}
                      placeholder={'Enter first name'}
                    />
                  )}
                />
              </div>
              <div className="flex w-full gap-1 relative">
                <Controller
                  name="lastname"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Last Name"
                      error={errors?.lastname?.message}
                      placeholder={'Enter last name'}
                    />
                  )}
                />
              </div>
            </div>
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <div className="flex w-full gap-1 relative">
                <div className="flex gap-1.5 flex-col w-full">
                  <div className="flex items-center justify-between">
                    <Label>Phone</Label>
                    {errors?.phone?.message && <ErrorTooltip text={errors?.phone?.message} />}
                  </div>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput
                        {...field}
                        country={'us'}
                        containerClass={errors?.phone?.message ? 'phone-error' : ''}
                      />
                    )}
                  />
                </div>
              </div>
              <div className="flex w-full gap-1 relative">
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Contact Email"
                      error={errors?.email?.message}
                      placeholder={'Enter contact email'}
                    />
                  )}
                />
              </div>
            </div>
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <div className="flex w-full gap-1 relative">
                <Controller
                  name="tax_id"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Personal TAX ID"
                      error={errors?.tax_id?.message}
                      placeholder={'Enter tax ID'}
                    />
                  )}
                />
              </div>
              <div className="flex w-full gap-1 relative">
                <Controller
                  name="id_number"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="ID Number"
                      error={errors?.id_number?.message}
                      placeholder={'Enter ID number'}
                    />
                  )}
                />
              </div>
            </div>
            <div className="flex w-full gap-1 relative">
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    {...field}
                    label={'Country of Residence'}
                    value={field.value}
                    handleChange={field.onChange}
                    options={countryList?.map((country: any) => ({
                      label: country?.name || '',
                      value: country?.isoCode || '',
                    }))}
                    placeholder={'Select country'}
                    error={errors?.country?.message}
                  />
                )}
              />
            </div>
            <div className="flex w-full gap-4 flex-wrap xl:flex-nowrap">
              <div className="flex w-full gap-1">
                <Controller
                  name="birth_place"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      {...field}
                      label={'Place of birth'}
                      value={field.value}
                      handleChange={field.onChange}
                      options={countryList?.map((country: any) => ({
                        label: country?.name || '',
                        value: country?.isoCode || '',
                      }))}
                      placeholder={'Select place of birth'}
                      error={errors?.birth_place?.message}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center justify-between">
                  <Label>Birth date</Label>
                  <div className="flex items-start">
                    {(errors?.day?.message || errors?.month?.message || errors?.year?.message) && (
                      <ErrorTooltip
                        text={
                          errors?.day?.message || errors?.month?.message || errors?.year?.message
                        }
                      />
                    )}
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <div className="w-full max-w-12">
                    <Controller
                      name="day"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          placeholder="dd"
                          value={field.value}
                          className={`min-w-12 ${
                            errors?.day?.message
                              ? 'border-red-500 focus:ring-0 focus:border-red-500 hover:border-red-500'
                              : ''
                          }`}
                          maxLength={2}
                        />
                      )}
                    />
                  </div>
                  <div className="w-full">
                    <Controller
                      name="month"
                      control={control}
                      render={({ field }) => (
                        <CustomSelect
                          {...field}
                          options={monthsArray}
                          value={field.value}
                          handleChange={field.onChange}
                          className={errors?.month?.message ? 'react-select-error' : ''}
                          placeholder="Select Month"
                        />
                      )}
                    />
                  </div>
                  <div className="w-full max-w-20">
                    <Controller
                      name="year"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          placeholder="yyyy"
                          value={field.value}
                          maxLength={4}
                          className={`min-w-14 ${
                            errors?.year?.message
                              ? 'border-red-500 focus:ring-0 focus:border-red-500 hover:border-red-500'
                              : ''
                          }`}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <Label className="">Description</Label>
                <div className="flex items-start">
                  {errors?.description?.message && (
                    <ErrorTooltip text={errors?.description?.message} />
                  )}
                </div>
              </div>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className={`w-full h-full leading-7 p-2 rounded-xl text-sm overflow-y-auto placeholder:text-gray-700 border focus:outline-none text-gray-700 bg-white shadow-sm resize-none ${
                      errors?.description?.message
                        ? 'border-red-500 focus:border-red-500 focus:ring-0'
                        : 'border-gray-300 focus:shadow-secondary/5 focus:ring-white shadow-secondary/5 focus:border-primary hover:border-primary'
                    }`}
                    rows={3}
                    placeholder="Type Here..."
                  />
                )}
              />
            </div>
          </div>
          <div className="w-full flex flex-col gap-3">
            <h3 className="text-shadow-gray-900 flex items-center gap-1.5 font-medium">Proofs</h3>
            <div className="flex flex-col gap-2 w-full max-h-60 overflow-auto">
              {fields?.map((res: any, index: number) => {
                const isStringFile = typeof res?.file === 'string';
                if (isStringFile) {
                  return (
                    <div key={res?.id} className="flex justify-between items-center">
                      <div className="font-light">
                        {
                          didProofTypeList?.find(
                            ({ id }: { id: string }) => id === res?.proof_type_id?.value,
                          )?.name
                        }
                      </div>
                      <Button
                        type="button"
                        disabled={deletingId === res?.uuid}
                        className="bg-red-50 text-red-500 hover:bg-red-500 shadow-none border border-red-500 min-w-28 rounded-full"
                        onClick={() => handleDeleteFiles(res?.uuid, 'identity')}
                      >
                        {deletingId === res?.uuid ? <Loader variant="white" /> : <Trash2 />}
                        Delete
                      </Button>
                    </div>
                  );
                }
                return (
                  <div className="flex gap-4 w-full justify-between items-end" key={res.id}>
                    <div className="w-full">
                      <Controller
                        name={`proofs.${index}.proof_type_id`}
                        control={control}
                        render={({ field }) => {
                          const selectedProofIds =
                            (watchProofs || [])?.map(
                              (item: { proof_type_id: { value: string } }) =>
                                item?.proof_type_id?.value,
                            ) ?? [];

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
                              className="bg-white"
                              value={field.value}
                              handleChange={(val) => field.onChange(val)}
                              options={filteredOptions}
                              placeholder="Select Document"
                              error={errors?.proofs?.[index]?.proof_type_id?.message}
                            />
                          );
                        }}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Label
                        className={`flex content-center cursor-pointer items-center border min-w-36 rounded-lg h-10 px-4 py-2 gap-2 ${
                          errors?.proofs?.[index]?.file?.message
                            ? 'text-red-500 border-red-500 hover:text-red-500'
                            : 'text-primary border-primary hover:bg-primary hover:text-white'
                        }`}
                        htmlFor={`file-${index}`}
                      >
                        <input
                          type="file"
                          accept=".pdf, .jpg, .png"
                          id={`file-${index}`}
                          {...register(`proofs.${index}.file`)}
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
                        variant="destructive"
                        onClick={() => {
                          remove(index);
                          setFileNames((prev) => {
                            const updated = { ...prev };
                            delete updated[index];
                            return updated;
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
            {fields?.length > 0 && (
              <div className="w-full flex flex-col gap-2">
                <p className="text-gray-500 text-xs">Max upload file size: 20MB</p>
                <p className="text-gray-500 text-xs">Accepted formats: pdf, jpg, png</p>
              </div>
            )}
            <div className="w-full flex">
              <Button
                className="max-w-[140px]"
                type="button"
                variant={'outline'}
                onClick={() => {
                  if (fields?.length >= didProofTypeList?.length) return;
                  const newIndex = fields.length;
                  append({ file: null, proof_type_id: null });
                  trigger(`proofs.${newIndex}`);
                }}
                disabled={fields?.length >= didProofTypeList?.length}
              >
                Add New
              </Button>
            </div>
          </div>
          {errors?.proofs?.message && (
            <div className="flex items-start text-sm text-red-500">{errors?.proofs?.message}</div>
          )}
          <div className="flex flex-col gap-2">
            <div className="text-md font-semibold">Supporting Documents</div>
            <div className="flex flex-col gap-2 w-full max-h-60 overflow-auto">
              {supportingDocuments?.map((res: any, index: number) => {
                const isStringFile = typeof res?.file === 'string';
                if (isStringFile) {
                  return (
                    <div key={res?.id} className="flex justify-between items-center">
                      <div className="font-light">
                        {
                          didSupportingDocList?.filter(
                            ({ id }: { id: string }) =>
                              id == res?.supporting_document_template_id?.value,
                          )?.[0]?.attributes?.name
                        }
                      </div>
                      <Button
                        disabled={deletingId === res?.uuid}
                        className="bg-red-50 text-red-500 hover:bg-red-500 shadow-none border border-red-500 min-w-28 rounded-full"
                        onClick={() => handleDeleteFiles(res?.uuid, 'supporting_document')}
                      >
                        {deletingId === res?.uuid ? <Loader variant="blue" /> : <Trash2 />}
                        Delete
                      </Button>
                    </div>
                  );
                }
                return (
                  <div className="flex gap-4 w-full justify-between items-end" key={res.id}>
                    <div className="w-full">
                      <Controller
                        name={`supporting_documents[${index}].supporting_document_template_id`}
                        control={control}
                        render={({ field }) => {
                          const selectedSupportingDocIds =
                            watchSupportingDoc?.map(
                              (item: { supporting_document_template_id: { value: string } }) =>
                                item?.supporting_document_template_id?.value,
                            ) ?? [];
                          const filteredOptions =
                            didSupportingDocList?.length > 0
                              ? didSupportingDocList
                                  .filter(
                                    ({ id }: { id: string }) =>
                                      !selectedSupportingDocIds?.includes(id),
                                  )
                                  .map(
                                    ({
                                      id,
                                      attributes: { name },
                                    }: {
                                      id: string;
                                      attributes: { name: string };
                                    }) => ({
                                      label: name,
                                      value: id,
                                    }),
                                  )
                              : [];
                          const selectedDoc = didSupportingDocList?.find(
                            (doc: { id: string }) => doc?.id === field?.value?.value,
                          );
                          return (
                            <>
                              <CustomSelect
                                {...field}
                                className="bg-white"
                                value={field.value as string}
                                handleChange={(val) => field.onChange(val)}
                                options={filteredOptions}
                                placeholder="Select Document"
                                error={
                                  errors?.supporting_documents?.[index]
                                    ?.supporting_document_template_id?.message
                                }
                              />
                              {selectedDoc && (
                                <div className="flex justify-between items-center text-sm text-gray-700">
                                  <div className="flex gap-1 items-center">
                                    {extractFileNameFromUrl(selectedDoc?.attributes?.url)}
                                  </div>
                                  <br />
                                  <Button
                                    variant="link"
                                    type="button"
                                    onClick={() =>
                                      downloadFileFromURL(selectedDoc?.attributes?.url)
                                    }
                                    className="cursor-pointer"
                                  >
                                    Download
                                  </Button>
                                </div>
                              )}
                            </>
                          );
                        }}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Label
                        className={`flex content-center cursor-pointer items-center border min-w-36 rounded-lg h-10 px-4 py-2 gap-2 ${errors?.supporting_documents?.[index]?.file?.message ? 'text-red-500 border-red-500 hover:text-red-500' : 'text-primary border-primary hover:bg-primary hover:text-white'}`}
                        htmlFor={`supportingFile-${index}`}
                      >
                        <input
                          type="file"
                          accept=".pdf, .jpg, .png"
                          id={`supportingFile-${index}`}
                          {...register(`supporting_documents[${index}].file`)}
                          hidden
                          onChange={(e) => onSupportingDocumentFileChange(e, index)}
                        />
                        <FolderClosedIcon className="w-4.5" />
                        <p className="truncate max-w-[120px]">
                          {supportingDocuemntFileNames[index] || 'Select Files'}
                        </p>
                      </Label>
                      <Button
                        className="hover:bg-red-500 bg-transparent hover:text-white text-red-500"
                        variant={'destructive'}
                        onClick={() => {
                          removeSupportingDoc(index);
                          setSupportingDocumentFileNames((prev) => {
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
            {supportingDocuments?.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="text-xs text-grey-400 w-full">Max upload file size: 20MB</div>
                <div className="text-xs text-grey-400 w-full">Accepted formats: pdf, jpg, png</div>
              </div>
            )}
            <div className="w-full flex">
              <Button
                className="max-w-[140px]"
                type="button"
                variant={'outline'}
                onClick={() => {
                  if (supportingDocuments?.length >= didSupportingDocList?.length) return;
                  appendSupportingDoc({ file: null, supporting_document_template_id: null });
                  const newIndex = supportingDocuments.length;
                  trigger(`supporting_documents.${newIndex}`);
                }}
                disabled={supportingDocuments?.length >= didSupportingDocList?.length}
              >
                Add New
              </Button>
            </div>
          </div>
          {errors?.supporting_documents?.message && (
            <div className="flex items-start text-sm text-red-500">
              {errors?.supporting_documents?.message}
            </div>
          )}
        </div>
        <div className="flex w-full gap-4 border-t border-gray-200 pt-4 xl:border-t-0 xl:border-l xl:pl-4 xl:pt-0">
          <div className="flex w-full flex-col gap-3">
            <h3 className="text-shadow-gray-900 flex items-center gap-1.5 font-medium">
              Requirements
            </h3>
            <div className="w-full flex flex-col gap-1.5">
              <p className="text-gray-500 text-sm">
                Select the requirement type and country to see detailed information about service
                activation
              </p>
            </div>
            <div className="flex w-full">
              <Controller
                name="requirements_type"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    {...field}
                    placeholder={'Select country'}
                    value={field.value}
                    handleChange={(value) => field.onChange(value)}
                    options={[
                      {
                        label: 'Registration',
                        value: 'registration',
                      },
                    ]}
                    error={errors?.requirements_type?.message}
                  />
                )}
              />
            </div>
            <div className="flex items-end w-full gap-4">
              <Controller
                name="requirements_country"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    {...field}
                    label={'Country'}
                    placeholder={'Select country'}
                    value={field.value}
                    isDisabled={true}
                    handleChange={(value) => {
                      field.onChange(value);
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
                    error={errors?.requirements_country?.message}
                  />
                )}
              />
              <Controller
                name="number_type"
                control={control}
                render={({ field }) => {
                  const disabledOptionValues =
                    requirementData
                      ?.filter((item: any) => item?.country_id === watchRequirementCountry?.value)
                      ?.map((item: any) => item?.group_type_id) || [];

                  const mappedOptions =
                    groupTypeData?.map(({ name, id }: { name: string; id: string }) => ({
                      label: name,
                      value: id,
                      isDisabled: !disabledOptionValues?.includes(id),
                    })) || [];

                  return (
                    <CustomSelect
                      {...field}
                      value={field.value}
                      handleChange={(value) => field.onChange(value)}
                      label="Number Type"
                      placeholder="Select number type"
                      options={mappedOptions}
                      error={errors?.number_type?.message}
                      isDisabled={true}
                    />
                  );
                }}
              />
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

export default CreateIdentity;

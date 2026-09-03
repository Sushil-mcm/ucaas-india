import Stepper from '@/components/custom/stepper';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import StepOne from './step-one';
import { yupResolver } from '@hookform/resolvers/yup';
import StepTwo from './step-two';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createAddress,
  createIdentity,
  // didAssign,
  getDIDBillingDetails,
  reserveDid,
  reserveDidQuantity,
  reserveFaxDidNumber,
  uploadAddressProof,
  uploadIdentityProof,
  uploadIdentitySupportingDocuments,
} from '@/services/api';
import PaymentModal from './modal/payment-modal';
import CreateIdentity from './create-identity';
import { parsePhoneNumber } from 'libphonenumber-js/max';
import { GETSCHEMA, initialState, packageName } from '../constants';
import CreateNewAddress from '../../identities-and-address-page-layout/addresses/create-new-address';
import Loader from '@/components/custom/loader';
import { toast } from 'react-toastify';

const AddNumber = ({ handleClose }: any) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [status, setStatus] = useState(1);
  const schemaContext = useRef(null);
  const [modalState, setModalState] = useState(false);
  const [amount, setAmount] = useState(0);
  const [rowData, setRowData] = useState<any>(null);
  const [features, setFeatures] = useState<any>([]);
  const [isFaxNumber, setIsFaxNumber] = useState(false);
  const [faxReservationId, setFaxReservationId] = useState('');
  const [IDs, setIDs] = useState({
    identity_id: '',
    address_id: '',
  });

  // Keep a ref that always reflects the latest currentStep so the resolver
  // can access the right schema without capturing a stale closure value.
  const currentStepRef = useRef(currentStep);
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  const formInstance = useForm<any>({
    defaultValues: initialState,
    // Stable resolver wrapper — reads currentStepRef so the correct schema is
    // used even after step navigation (useForm only reads resolver once at mount).
    resolver: (values, ctx, opts) =>
      yupResolver(GETSCHEMA[currentStepRef.current as 1 | 2 | 3])(values, ctx, opts),
    context: { schemaContext },
    mode: 'onChange',
  });

  const {
    trigger,
    getValues,
    handleSubmit,
    control,
    setFocus,
    formState: { isValid },
  } = formInstance;

  const formValues = useWatch({ control });

  // Update schemaContext in an effect rather than directly in the render body
  // to avoid React Strict Mode / concurrent-mode side-effect warnings and
  // ensure the ref holds the committed value when validators run.
  useEffect(() => {
    schemaContext.current = formValues;
  }, [formValues]);

  const proofs = useWatch({ name: 'proofs', control }) || [];
  const [watchVirtualNumbers, watchLocation, watchGroupId, watchQuantity, numberType, location] =
    useWatch({
      control,
      name: ['virtualNumbers', 'location', 'groupId', 'quantity', 'numberType', 'location'],
    });

  const { data: billingDetails } = useQuery({
    queryKey: ['getDIDBillingDetails', numberType?.label, location?.value],
    queryFn: () =>
      getDIDBillingDetails({
        packages_type: packageName[numberType?.label as keyof typeof packageName],
        country_iso: location?.value,
      }),
    select: (data) => data?.data?.data?.result?.rows,
    enabled: currentStep === 2 && !!numberType?.label && !!location?.value,
  });

  const { mutateAsync: mutateUploadProofs, isPending: isUploadProofPending } = useMutation({
    mutationKey: ['uploadIdentityProof'],
    mutationFn: uploadIdentityProof,
  });

  const { mutateAsync: mutateUploadSupportingDocs, isPending: isUploadSupportingDocuments } =
    useMutation({
      mutationKey: ['uploadIdentitySupportingDocuments'],
      mutationFn: uploadIdentitySupportingDocuments,
    });

  const { mutate: mutateCreateIdentity, isPending: isCreateIdentityPending } = useMutation({
    mutationKey: ['createIdentity'],
    mutationFn: createIdentity,
    onSuccess: async ({ data }) => {
      // const identityId = isEdit ? rowData?.id : data?.data?.result?.rows?.identity_id
      const identityId = data?.data?.result?.rows?.identity_id;
      setRowData({ isEdit: false, formData: { identity_id: identityId } });
      const files = getValues('proofs') || [];
      const supportingDocs = getValues('supporting_documents') || [];

      const hasProofChanges = files?.some((item: any) => item?.file);
      const hasSupportingDocChanges = supportingDocs?.some((item: any) => item?.file);
      const uploadTasks: Promise<any>[] = [];
      if (hasProofChanges) {
        const formData = new FormData();
        proofs?.forEach((item: any) => {
          if (item?.file) {
            formData.append('identity_proof', item?.file);
            formData.append('proof_type_id[]', item?.proof_type_id?.value);
          }
        });
        formData.append('identity_id', identityId);
        formData.append('type', 'identity');
        uploadTasks.push(mutateUploadProofs(formData));
      }
      if (hasSupportingDocChanges) {
        const formData = new FormData();
        supportingDocs?.forEach((item: any) => {
          if (item?.file) {
            formData.append('identity_supporting_document', item?.file);
            formData.append(
              'supporting_document_template_id[]',
              item.supporting_document_template_id?.value,
            );
          }
        });
        formData.append('identity_id', identityId);
        formData.append('type', 'supporting_document');
        uploadTasks.push(mutateUploadSupportingDocs(formData));
      }
      try {
        if (uploadTasks.length > 0) {
          await Promise.all(uploadTasks);
        }
        setCurrentStep((prev) => prev + 1);
        // toaster.success(data?.data?.[0]?.msg || 'Success.');
        // navigate('/identity');
      } catch (err) {
        // toaster.error('One or more uploads failed.');
      }
    },
  });

  const { mutate: mutateUpload } = useMutation({
    mutationKey: ['uploadAddressProof'],
    mutationFn: uploadAddressProof,
    onSuccess: () => {
      setCurrentStep((prev) => prev + 1);
    },
  });

  const { mutate: mutateCreateAddress, isPending: isCreateAddressPending } = useMutation({
    mutationKey: ['createAddress'],
    mutationFn: createAddress,
    onSuccess: ({ data }) => {
      const { identity_id = '', address_id = '' } = data?.data?.result?.rows ?? {};
      setIDs({
        identity_id,
        address_id,
      });
      setRowData((prev: any) => ({
        isEdit: false,
        formData: {
          ...(prev?.formData || {}),
          address_id: address_id,
        },
      }));
      const files = getValues('addressProofs') || [];
      const isChangedInFiles = files?.some((item: any) => item?.file);
      if (isChangedInFiles) {
        const formData = new FormData();
        files?.forEach((item: any) => {
          if (item?.file) {
            formData.append('identity_address_proof', item?.file);
            formData.append('proof_type_id[]', item?.proof_type_id?.value);
          }
        });
        formData.append('type', 'address');
        formData.append('address_id', address_id);
        formData.append('identity_id', identity_id);
        mutateUpload(formData);
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    },
  });

  const { mutate: mutateReserveDid, isPending } = useMutation({
    mutationKey: ['reserveDid'],
    mutationFn: reserveDid,
    onSuccess: () => {
      setCurrentStep((p) => p + 1);
    },
  });

  const { mutate: mutateReserveDidQuantity, isPending: quantityPending } = useMutation({
    mutationKey: ['reserveDidQuantity'],
    mutationFn: reserveDidQuantity,
    onSuccess: () => {
      setCurrentStep((p) => p + 1);
    },
  });

  const { mutate: mutateReserveFaxDid, isPending: faxReservationPending } = useMutation({
    mutationKey: ['reserveFaxDidNumber'],
    mutationFn: reserveFaxDidNumber,
    onSuccess: (response: any) => {
      const result =
        response?.data?.data?.result ?? response?.data?.result ?? response?.result ?? {};
      setFaxReservationId(result?.reservation_id || result?.reservation?.id || result?.id || '');
      setCurrentStep((p) => p + 1);
    },
  });

  const needsRegistration = watchGroupId?.needs_registration;

  const isLoading = [
    isPending,
    quantityPending,
    isCreateIdentityPending,
    isUploadProofPending,
    isUploadSupportingDocuments,
    isCreateAddressPending,
    faxReservationPending,
  ].some((v) => v);

  const steps = useMemo(
    () =>
      needsRegistration
        ? [
            {
              number: 1,
              title: 'Select Number(s)',
              handleChange: (step: any) => {
                if (currentStep > step?.number || isValid) {
                  setCurrentStep(step?.number);
                }
              },
            },
            {
              number: 2,
              title: 'Create Identity',
              handleChange: (step: any) => {
                if (currentStep > step?.number || isValid) {
                  setCurrentStep(step?.number);
                }
              },
            },
            {
              number: 3,
              title: 'Create Address',
              handleChange: (step: any) => {
                if (currentStep > step?.number || isValid) {
                  setCurrentStep(step?.number);
                }
              },
            },
            {
              number: 4,
              title: 'Checkout',
              handleChange: (step: any) => {
                trigger().then((isValidStep) => {
                  if (currentStep > step?.number || isValidStep) {
                    setCurrentStep(step?.number);
                  }
                });
              },
            },
          ]
        : [
            {
              number: 1,
              title: 'Select Number(s)',
              handleChange: (step: any) => {
                if (currentStep > step?.number || isValid) {
                  setCurrentStep(step?.number);
                }
              },
            },
            {
              number: 2,
              title: 'Checkout',
              handleChange: (step: any) => {
                trigger().then((isValidStep) => {
                  if (currentStep > step?.number || isValidStep) {
                    setCurrentStep(step?.number);
                  }
                });
              },
            },
          ],
    [currentStep, isValid, needsRegistration, trigger],
  );

  const stepLookUp: any = useMemo(
    () =>
      needsRegistration
        ? {
            1: (
              <StepOne
                formInstance={formInstance}
                status={status}
                setStatus={setStatus}
                setFeatures={setFeatures}
                isFaxNumber={isFaxNumber}
                setIsFaxNumber={setIsFaxNumber}
              />
            ),
            2: <CreateIdentity rowData={rowData} formInstance={formInstance} />,
            3: <CreateNewAddress rowData={rowData} formInstance={formInstance} />,
            4: (
              // StepTwo reads formValues itself via useWatch — not passed as a prop
              // to prevent this memo from re-running on every keystroke.
              <StepTwo
                formInstance={formInstance}
                handleClose={handleClose}
                setAmount={setAmount}
                billingDetails={billingDetails}
                isFaxNumber={isFaxNumber}
                faxReservationId={faxReservationId}
              />
            ),
          }
        : {
            1: (
              <StepOne
                formInstance={formInstance}
                status={status}
                setStatus={setStatus}
                setFeatures={setFeatures}
                isFaxNumber={isFaxNumber}
                setIsFaxNumber={setIsFaxNumber}
              />
            ),
            2: (
              <StepTwo
                formInstance={formInstance}
                handleClose={handleClose}
                setAmount={setAmount}
                billingDetails={billingDetails}
                isFaxNumber={isFaxNumber}
                faxReservationId={faxReservationId}
              />
            ),
          },
    // formValues intentionally omitted — StepOne/StepTwo subscribe internally
    // via useWatch to avoid remounting the step content on every keystroke.
    [
      billingDetails,
      formInstance,
      handleClose,
      faxReservationId,
      isFaxNumber,
      needsRegistration,
      rowData,
      status,
    ],
  );

  const onSubmit = async (values: any) => {
    if (isLoading) return;
    const isQuantity = watchVirtualNumbers?.length === 0;
    if (currentStep == 1) {
      if (isFaxNumber) {
        setFaxReservationId('');
        mutateReserveFaxDid({
          did_number: watchVirtualNumbers?.[0]?.name,
        });
      } else if (isQuantity) {
        mutateReserveDidQuantity({
          sku_id: watchGroupId?.sku_id,
          quantity: watchQuantity?.value,
          did_id: watchGroupId?.value,
        });
      } else {
        mutateReserveDid({
          available_did_id: watchVirtualNumbers?.map((v: any) => v?.value),
          country_iso: watchLocation?.value,
        });
      }
    } else if (currentStep === 2 && needsRegistration) {
      const {
        type,
        company_name,
        company_registration_number,
        vat_number,
        website,
        firstname,
        lastname,
        email,
        phone,
        tax_id,
        id_number,
        country,
        birth_place,
        day,
        month,
        year,
        description,
        requirements_type,
        requirements_country,
        number_type,
      } = values || {};
      const parsedNumber = parsePhoneNumber(`+${phone}` as string);
      const paddedDay = String(day).padStart(2, '0');
      const isBirthDateValid =
        year && month && paddedDay && ![year, month, paddedDay].includes('--');
      const payload = {
        type: type?.value,
        company_name,
        company_registration_number,
        vat_number,
        website,
        firstname,
        lastname,
        email,
        prefix: `+${parsedNumber?.countryCallingCode}`,
        phone: parsedNumber?.nationalNumber,
        tax_id,
        id_number,
        country: country?.value,
        birth_place: birth_place?.value,
        birth_date: isBirthDateValid ? `${year}-${month?.value}-${paddedDay}` : '',
        description,
        requirements_type: requirements_type?.value,
        requirements_country,
        number_type,
      };
      mutateCreateIdentity(payload);
    } else if (currentStep === 3 && needsRegistration) {
      const {
        identity_id,
        country,
        city,
        zipcode,
        address,
        address_state,
        addressProofs,
        addressDescription,
        requirements_type,
        requirements_country,
        number_type,
      } = values || {};

      const payload = {
        identity_id: identity_id?.value,
        country: country?.value,
        city,
        zipcode,
        address,
        state: address_state,
        proofs: addressProofs,
        description: addressDescription,
        requirements_type: requirements_type?.value,
        requirements_country,
        number_type,
      };
      mutateCreateAddress(payload);
    }
  };

  const getNestedErrorMessage = (error: any): string => {
    if (!error) return '';
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    if (typeof error !== 'object') return '';

    const values = Object.values(error);
    for (const item of values) {
      const message = getNestedErrorMessage(item);
      if (message) return message;
    }

    return '';
  };

  const getFriendlyErrorMessage = (field: string | undefined, message: string): string => {
    const fieldLabels: Record<string, string> = {
      identity_id: 'Identity',
      country: 'Country',
      address_state: 'State',
      requirements_type: 'Requirements type',
      requirements_country: 'Requirements country',
      number_type: 'Number type',
      city: 'City',
      zipcode: 'Zip code',
      address: 'Address',
      description: 'Description',
    };

    const toTitleCase = (value: string) =>
      value
        .replace(/_/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());

    const getFieldLabel = () => {
      if (field && fieldLabels[field]) return fieldLabels[field];
      if (field) return toTitleCase(field);
      return 'This field';
    };
    const withFullStop = (value: string) => (/[.!?]$/.test(value) ? value : `${value}.`);

    const normalizedMessage = (message || '').trim();
    if (!normalizedMessage) return '';

    const nullMatch = normalizedMessage.match(/^(.+?)\s+cannot be null$/i);
    if (nullMatch?.[1]) {
      return withFullStop(`${toTitleCase(nullMatch[1])} is required`);
    }

    const isRequiredError =
      /cannot be null/i.test(normalizedMessage) ||
      /required field/i.test(normalizedMessage) ||
      /^required$/i.test(normalizedMessage);

    if (isRequiredError) return withFullStop(`${getFieldLabel()} is required`);
    return withFullStop(normalizedMessage);
  };

  const onInvalid = (errors: any) => {
    const firstErrorField = Object.keys(errors || {})[0];
    const firstErrorMessage = getNestedErrorMessage(errors?.[firstErrorField]);
    const friendlyErrorMessage = getFriendlyErrorMessage(firstErrorField, firstErrorMessage);

    toast.error(friendlyErrorMessage || 'Please fix the highlighted fields before continuing.');

    if (firstErrorField) {
      setFocus(firstErrorField as any);
    }
  };

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col justify-between gap-3 pt-2 sm:pt-3">
        <Stepper
          steps={steps}
          currentStep={currentStep}
          mobileHorizontal
          customClass="bg-transparent px-0 py-1 sm:py-2"
        />
        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="flex h-full min-h-0 w-full flex-col justify-between gap-3"
        >
          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 sm:pr-1">
            {stepLookUp?.[currentStep]}
          </div>
          <div className="flex flex-nowrap items-center justify-between gap-2 border-t border-gray-200 pt-3 sm:justify-end sm:pt-4">
            <Button
              onClick={() => {
                if (currentStep === 1) {
                  handleClose();
                } else {
                  setCurrentStep((prev) => prev - 1);
                }
              }}
              variant="transparent"
              type="button"
              className="min-w-0 flex-1 px-3 sm:flex-none"
            >
              {currentStep === 1 ? 'Close' : 'Back'}
            </Button>
            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
              {currentStep !== steps?.length && (
                <Button
                  variant="outline"
                  type="submit"
                  disabled={isLoading}
                  className="min-w-0 flex-1 px-3 sm:flex-none"
                >
                  {isLoading && <Loader variant="blue" />}Next
                </Button>
              )}
              {currentStep === steps?.length && (
                <Button
                  variant="outline"
                  className="min-w-0 flex-1 px-3 sm:min-w-32 sm:flex-none"
                  onClick={() => setModalState(true)}
                >
                  Pay
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
      {modalState && (
        <PaymentModal
          data={formValues}
          handleClose={handleClose}
          setModalState={setModalState}
          modalState={modalState}
          amount={amount}
          billingDetails={billingDetails}
          IDs={IDs}
          features={features}
          isFaxNumber={isFaxNumber}
          faxReservationId={faxReservationId}
        />
      )}
    </>
  );
};

export default AddNumber;

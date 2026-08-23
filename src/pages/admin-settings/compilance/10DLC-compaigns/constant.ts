import * as yup from 'yup';

export const CAMPAINGN_INITIALS = {
  brand_type: null,
  usecase: '',
  subUsecases: [],
  referenceId: '',
  resellerId: null,
  description: '',
  messageFlow: '',
  sample1: '',
  mnoIds: [],
  amount: 20,
  autoRenewal: true,
  cnp: null,
  payment_terms: false,
};

export const useCaseSchema = yup.object({
  brand_type: yup
    .object({
      value: yup.string().required(),
      label: yup.string().required(),
    })
    .nullable()
    .required('Select Brand'),
  usecase: yup.string().required('Select Use Case'),
});

export const TermsPreviewSchema = yup.object({
  mnoIds: yup.array().min(1, `At least one is required`),
});

export const campaignDetailSchema = yup.object({
  referenceId: yup.string().required('Reference ID is required'),
  description: yup
    .string()
    .required('Description is required')
    .min(40, 'Description must be at least 40 characters')
    .max(4096, 'Description cannot exceed 4096 characters'),
  messageFlow: yup
    .string()
    .required('Message workflow is required')
    .min(40, 'Message flow must be at least 40 characters')
    .max(4096, 'Message flow cannot exceed 4096 characters'),
  sample1: yup
    .string()
    .required('Sample message is required')
    .min(20, 'Sample must be at least 20 characters')
    .max(1024, 'Sample cannot exceed 1024 characters'),
  cnp: yup
    .object({
      value: yup.string().required(),
      label: yup.string().required(),
    })
    .nullable()
    .required('Connectivity Partner is required'),
  resellerId: yup
    .object({
      value: yup.string().required(),
      label: yup.string().required(),
    })
    .nullable()
    .required('Reseller is required'),
});
export const paymentSchema = yup.object({
  payment_terms: yup
    .boolean()
    .oneOf([true], 'You must agree to payment terms')
    .required('You must agree to payment terms'),
});

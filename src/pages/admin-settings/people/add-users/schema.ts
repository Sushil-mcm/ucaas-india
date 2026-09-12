import {
  requiredEmail,
  requiredExtension,
  requiredString,
} from '@/schema/common';
import * as yup from 'yup';

export const schemaValidationForAddUser = yup.object().shape({
  users: yup
    .array()
    .of(
      yup.object().shape({
        /* One letter is a name. "Li", "Ng", "Xu", "Bo" and "Oz" are people, and
           a three-character minimum turned them away at the door. */
        first_name: requiredString('First name', 1, 50),
        last_name: requiredString('Last name', 1, 50),
        email: requiredEmail(),
        role: yup
          .object({
            label: requiredString('Role'),
            value: requiredString('Role'),
          })
          .required('Role is required'),
        extension: requiredExtension(),
        /* Optional. The platform gives a person their work number; demanding a
           personal one before anybody can be invited only made admins invent
           them. Checked for shape only when something was actually typed. */
        phone: yup
          .string()
          .transform((value) => String(value ?? '').trim())
          .test(
            'phone-length',
            'Invalid Number Format',
            (value) => !value || (value.length >= 9 && value.length <= 15),
          ),
      }),
    )
    .min(1, 'Add at least one person'),
  site: yup
    .object({
      label: requiredString('Location'),
      value: requiredString('Location'),
    })
    .required('Location is required'),
});

export const passwordValidationSchema = yup.object().shape({
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .matches(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .matches(/^(?=.*\d)/, 'Password must contain at least one number')
    .matches(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character')
    .matches(/^\S*$/, 'Password must not contain spaces'),
  confirm_password: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

export const schemaValidationForAddIndividualPassword = yup.object().shape({
  users: yup
    .array()
    .of(
      yup.object().shape({
        password: yup
          .string()
          .required('Password is required')
          .min(8, 'Password must be at least 8 characters long')
          .matches(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
          .matches(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
          .matches(/^(?=.*\d)/, 'Password must contain at least one number')
          .matches(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character')
          .matches(/^\S*$/, 'Password must not contain spaces'),
        confirm_password: yup
          .string()
          .required('Confirm password is required')
          .oneOf([yup.ref('password')], 'Passwords must match'),
      }),
    )
    .min(1, 'Add at least one person'),
});

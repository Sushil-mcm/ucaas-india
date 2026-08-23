import * as yup from 'yup';

export const changePasswordSchema = yup.object({
  old_password: yup.string().required('Old password is required'),
  // .min(8, 'Password must be at least 8 characters long')
  // .matches(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  // .matches(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  // .matches(/^(?=.*\d)/, 'Password must contain at least one number')
  // .matches(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character')
  // .matches(/^\S*$/, 'Password must not contain spaces'),

  new_password: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .matches(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .matches(/^(?=.*\d)/, 'Password must contain at least one number')
    .matches(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character')
    .matches(/^\S*$/, 'Password must not contain spaces')
    .notOneOf([yup.ref('old_password')], 'New password must not match with old password'),

  confirm_password: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('new_password')], 'Confirm password must match with new password'),
});

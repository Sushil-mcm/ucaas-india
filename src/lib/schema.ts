import * as yup from 'yup';

export const requiredStringFn = (fieldName: string) => {
  return yup.string().required(`${fieldName} is required`);
};
export const optionalString = (fieldName: string, min: number, max: number) => {
  return yup
    .string()
    .transform((value) => (value === "" ? undefined : value))
    .optional()
    .min(min, `${fieldName} must be at least ${min} characters`)
    .max(max, `${fieldName} must not exceed ${max} characters`);
};
export const requiredString = (fieldName: string, min = 2, max = 50) => {
  return yup
    .string()
    .required(`${fieldName} is required`)
    .matches(/^\S.*\S$|^\S$/, 'Spaces not allowed')
    .matches(/^(?!^[^A-Za-z]*$).*$/, `${fieldName} must contain at least one letter`)
    .min(min, `${fieldName} must be at least ${min} characters`)
    .max(max, `${fieldName} must not exceed ${max} characters`);
};

export const requiredAllString = (fieldName: string) => {
  return yup
    .string()
    .required(`${fieldName} is required`)
    .matches(/^\S.*\S$|^\S$/, 'Spaces not allowed');
};

export const requiredStateOrCity = (fieldName: string) => {
  return yup
    .string()
    .required(`${fieldName} is required`)
    .matches(/^[A-Za-z\s]+$/, `${fieldName} should only contain letters`);
};

export const requiredExtension = () => {
  return yup
    .string()
    .required('Extension is required')
    .matches(/^\d{4}$/, 'Extension must upto 4 digits');
};

export const requiredEmail = () => {
  return yup
    .string()
    .required('Email is required')
    .test('no-spaces', 'Email should not contain spaces', (value) => !/\s/.test(value))
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email format')
    .max(50, 'Email must not exceed 50 characters');
};

export const requiredUSANumber = (fieldName: string) => {
  return yup
    .string()
    .required(`${fieldName} is required`)
    .matches(/^\(?([0-9]{3})\)?[-.●]?([0-9]{3})[-.●]?([0-9]{4})$/, 'Invalid phone number format');
};

export const requiredNumber = (fieldName: string) => {
  return yup
    .number()
    .required(`${fieldName} is required`)
    .typeError(`${fieldName} must be a number`);
};

export const requiredPostalCode = () => {
  return yup
    .string()
    .required('Postal Code is required')
    .matches(/^\S.*\S$|^\S$/, 'Spaces not allowed')
    .min(5, 'Postal Code must be atleast 5 digits')
    .max(9, 'Postal Code must not exceed 9 digits');
};

export const requiredDescription = (
  fieldName: string,
  max?: number
) => {
  let schema = yup
    .string()
    .required(`${fieldName} is required`)
    .trim(`${fieldName} cannot start or end with spaces`);

  if (typeof max === "number") {
    schema = schema.max(
      max,
      `${fieldName} must not exceed ${max} characters`
    );
  }

  return schema;
};


export const requiredMembers = (fieldName: string) => {
  return yup
    .array()
    .of(
      yup.object().shape({
        label: yup.string().required(`${fieldName} is required`),
      }),
    )
    .required(`${fieldName} is required`)
    .min(2, `At least two ${fieldName.toLowerCase()} must be selected`);
};

export const selectFieldRequired = (fieldName: string) =>
  yup
    .object({
      value: yup.string().required(`${fieldName} is required`),
    })
    .nonNullable(`${fieldName} is required`)
    .typeError(`${fieldName} is required`);

export const requiredURL = (fieldName: string) => {
  return yup
    .string()
    .required(`${fieldName} is required`)
    .matches(/^\S+$/, 'Spaces are not allowed')
    .matches(
      /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/,
      `Invalid ${fieldName} format`
    )
};
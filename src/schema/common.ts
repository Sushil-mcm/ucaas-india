import * as yup from 'yup'
import {
  isReservedExtension,
  reservedExtensionMessage,
} from '@/constants/reserved-extensions';

export const requiredString = (fieldName: string, min = 2, max = 50) => {
  return yup
    .string()
    .required(`${fieldName} is required`)
    .matches(/^\S.*\S$|^\S$/, "Spaces not allowed")
    .matches(
      /^(?!^[^A-Za-z]*$).*$/,
      `${fieldName} must contain at least one letter`
    )
    .min(min, `${fieldName} must be at least ${min} characters`)
    .max(max, `${fieldName} must not exceed ${max} characters`);
};

export const requiredExtension = () => {
  return yup
    .string()
    .required("Extension is required")
    .matches(/^\d{4}$/, "Extension must be 4 digits")
    /* An extension that matches an emergency or public service number can
       shadow it on an internal dial. See constants/reserved-extensions.ts. */
    .test(
      "not-reserved",
      ({ value }) => reservedExtensionMessage(value),
      (value) => !isReservedExtension(value)
    );
};

export const requiredEmail = () => {
  return yup
    .string()
    .required("Email is required")
    .test(
      "no-spaces",
      "Email should not contain spaces",
      (value) => !/\s/.test(value)
    )
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid email format"
    )
    .max(50, "Email must not exceed 50 characters");
};

export const requiredAllString = (fieldName: string) => {
  return yup
    .string()
    .required(`${fieldName} is required`)
    .matches(/^\S.*\S$|^\S$/, "Spaces not allowed");
};
import * as yup from 'yup';
import { sanitizePlainTextInput } from '@/lib/utils';

export const ROLE_NAME_MAX_LENGTH = 100;
export const ROLE_DESCRIPTION_MAX_LENGTH = 300;

export const UPSERT_ROLE_SCHEMA = yup.object().shape({
  name: yup
    .string()
    .transform((_, originalValue) => sanitizePlainTextInput(originalValue, ROLE_NAME_MAX_LENGTH))
    .required('Name is required')
    .max(ROLE_NAME_MAX_LENGTH, `Name must be ${ROLE_NAME_MAX_LENGTH} characters or less`)
    .matches(
      /^[A-Za-z0-9][A-Za-z0-9 ._-]*$/,
      'Only letters, numbers, spaces, hyphens, underscores, and periods are allowed',
    ),
  description: yup
    .string()
    .transform((_, originalValue) =>
      sanitizePlainTextInput(originalValue, ROLE_DESCRIPTION_MAX_LENGTH),
    )
    .required('Description is required')
    .max(
      ROLE_DESCRIPTION_MAX_LENGTH,
      `Description must be ${ROLE_DESCRIPTION_MAX_LENGTH} characters or less`,
    )
    .matches(
      /^[A-Za-z0-9][A-Za-z0-9\s.,()_\-#&/]*$/,
      'Only letters, numbers, spaces, and basic punctuation are allowed',
    ),
});

import * as yup from 'yup';
import { sanitizePlainTextInput } from '@/lib/utils';
import {
  ROLE_DESCRIPTION_PATTERN,
  ROLE_DESCRIPTION_RULE,
  ROLE_NAME_PATTERN,
  ROLE_NAME_RULE,
} from './name-rules';

export const ROLE_NAME_MAX_LENGTH = 100;
export const ROLE_DESCRIPTION_MAX_LENGTH = 300;

export const UPSERT_ROLE_SCHEMA = yup.object().shape({
  name: yup
    .string()
    .transform((_, originalValue) => sanitizePlainTextInput(originalValue, ROLE_NAME_MAX_LENGTH))
    .required('Name is required')
    .max(ROLE_NAME_MAX_LENGTH, `Name must be ${ROLE_NAME_MAX_LENGTH} characters or less`)
    .matches(ROLE_NAME_PATTERN, ROLE_NAME_RULE),
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
    .matches(ROLE_DESCRIPTION_PATTERN, ROLE_DESCRIPTION_RULE),
});

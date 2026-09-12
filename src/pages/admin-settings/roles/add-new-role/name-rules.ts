/* The two spelling rules for a role, on their own so a test can read them
   without pulling in the form schema (whose imports reach for browser globals).
   schema.ts applies them; nothing else should copy them. */

export const ROLE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._-]*$/;
export const ROLE_NAME_RULE =
  'Only letters, numbers, spaces, hyphens, underscores, and periods are allowed';

export const ROLE_DESCRIPTION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s.,()_\-#&/]*$/;
export const ROLE_DESCRIPTION_RULE = 'Only letters, numbers, spaces, and basic punctuation are allowed';

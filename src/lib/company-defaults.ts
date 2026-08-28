/* The company level of the settings cascade.
 *
 * A phone system needs three levels: what the whole company gets, what a named
 * preset gets, and what one person has. This platform shipped the bottom two —
 * `user_template` holds named presets, and each user carries their own settings —
 * but nothing held "the rule for everyone". Admin > Phone System > Preferences was
 * built for that job and, with nowhere to save to, was wired to the signed-in
 * admin's own record instead, which meant an admin setting a company rule was
 * quietly editing their own phone.
 *
 * Rather than add a table, the top level is stored as a reserved user template.
 * That table already holds exactly the right shape — a settings JSON and a
 * greetings JSON, with the same `override` flags the cascade needs — and the
 * upsert/list endpoints already exist, so the company level works against the
 * running backend with no migration and no deploy.
 *
 * The reserved name is how it is found. It is deliberately one that reads
 * correctly if it ever shows up in the ordinary template list, because it will.
 */

import { getTemplateList, upsertTemplate } from '@/services/api';

export const COMPANY_DEFAULT_TEMPLATE_NAME = 'Company Default';

export interface CompanyDefaultTemplate {
  uuid?: string;
  name: string;
  settings: any;
  greetings: any;
  updated_at?: string;
}

/* Templates arrive with `settings` and `greetings` as either parsed objects or
   JSON strings depending on the endpoint, so both are handled at the boundary
   and everything downstream can assume an object. */
const parseMaybeJson = (value: any): any => {
  if (!value) return {};
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const normalise = (row: any): CompanyDefaultTemplate => ({
  uuid: row?.uuid,
  name: row?.name,
  settings: parseMaybeJson(row?.settings),
  greetings: parseMaybeJson(row?.greetings),
  updated_at: row?.updated_at,
});

/* The list endpoint filters by name, but it matches loosely — a tenant with a
   template called "Company Default (old)" would come back too. The exact match
   is re-applied here so the wrong record can never be treated as the company
   rule and silently overwritten on save. */
export const fetchCompanyDefaults = async (): Promise<CompanyDefaultTemplate | null> => {
  const response = await getTemplateList({
    page: 1,
    limit: 200,
    filters: [],
    search: COMPANY_DEFAULT_TEMPLATE_NAME,
  });

  const rows: any[] = response?.data?.data?.result?.rows || [];
  const exact = rows.find((row) => row?.name === COMPANY_DEFAULT_TEMPLATE_NAME);

  return exact ? normalise(exact) : null;
};

/* Saving keeps the uuid when one exists so the same record is updated rather
   than a second "Company Default" being created alongside it — two records
   under the same reserved name would make which one is the rule a coin toss. */
export const saveCompanyDefaults = ({
  uuid,
  settings,
  greetings,
}: {
  uuid?: string;
  settings: any;
  greetings: any;
}) =>
  upsertTemplate({
    ...(uuid ? { uuid, userID: uuid } : {}),
    name: COMPANY_DEFAULT_TEMPLATE_NAME,
    settings,
    greetings,
  });

export const COMPANY_DEFAULTS_QUERY_KEY = ['company-default-template'];

/* Typed client for the versioned office-policy API.
 *
 * Office rules are deliberately separate from the location record. An address
 * edit must not be able to overwrite a phone rule, and two administrators
 * editing different rules must not fight over one large settings blob. Each
 * section therefore carries its own optimistic-lock version.
 */

import { apiClient, type CustomAxiosRequestConfig } from '@/services/api/axios';
import { parseMaybeJson, unwrapResult } from '@/lib/company-settings-api';
import { v4 as uuidV4 } from 'uuid';

export const OFFICE_POLICY_SECTIONS = [
  'voicemail_pin',
  'recording',
  'transcription',
  'ai_call_monitoring',
  'display_number',
  'operational_hours',
] as const;

export type OfficePolicySection = (typeof OFFICE_POLICY_SECTIONS)[number];

export interface OfficePolicyRow {
  uuid: string;
  company_uuid: string;
  site_uuid: string;
  section: OfficePolicySection;
  settings: any;
  version: number;
  updated_by?: string | null;
  updated_by_name?: string | null;
  updated_at?: string | null;
}

export type OfficePolicyRows = Partial<Record<OfficePolicySection, OfficePolicyRow>>;
export type CompanyOfficePolicyRows = Record<string, OfficePolicyRows>;

const quietPost = (url: string, data: any = {}) =>
  apiClient({ method: 'POST', url, data, hideToastOnError: true } as CustomAxiosRequestConfig);

const asRow = (value: any): OfficePolicyRow | null => {
  if (!value || typeof value !== 'object' || !value.section) return null;
  return {
    ...value,
    settings: parseMaybeJson(value.settings),
    version: Number(value.version || 0),
  } as OfficePolicyRow;
};

export const listOfficePolicies = async (siteUuid: string): Promise<OfficePolicyRows> => {
  const response = await quietPost(`/api/site/policy/list/${encodeURIComponent(siteUuid)}`);
  const result = unwrapResult(response);
  const sections = result?.sections && typeof result.sections === 'object' ? result.sections : {};
  const rows: OfficePolicyRows = {};

  OFFICE_POLICY_SECTIONS.forEach((section) => {
    const row = asRow(sections[section]);
    if (row) rows[section] = row;
  });

  return rows;
};

export const listCompanyOfficePolicies = async (): Promise<CompanyOfficePolicyRows> => {
  const response = await quietPost('/api/site/policy/company');
  const result = unwrapResult(response);
  const sites = result?.sites && typeof result.sites === 'object' ? result.sites : {};
  const output: CompanyOfficePolicyRows = {};

  Object.entries(sites).forEach(([siteUuid, sections]) => {
    const rows: OfficePolicyRows = {};
    OFFICE_POLICY_SECTIONS.forEach((section) => {
      const row = asRow((sections as any)?.[section]);
      if (row) rows[section] = row;
    });
    output[siteUuid] = rows;
  });

  return output;
};

export interface SaveOfficePolicyInput {
  siteUuid: string;
  section: OfficePolicySection;
  settings: any;
  version: number;
}

export const saveOfficePolicy = async ({
  siteUuid,
  section,
  settings,
  version,
}: SaveOfficePolicyInput): Promise<OfficePolicyRow> => {
  const response = await quietPost(`/api/site/policy/save/${encodeURIComponent(siteUuid)}`, {
    section,
    settings,
    version,
  });
  const result = unwrapResult(response);
  const row = asRow(result?.row);
  if (!row) throw new Error('The saved office policy could not be read back.');
  return row;
};

export interface BulkOfficePolicyChange {
  site_uuid: string;
  section: OfficePolicySection;
  settings: any;
  version: number;
}

export interface BulkOfficePolicyResult {
  site_uuid: string;
  section: OfficePolicySection;
  ok: boolean;
  changed?: boolean;
  row?: OfficePolicyRow;
  event_id?: string | null;
  replayed?: boolean;
  proposed_settings?: any;
  status?: number;
  message?: string;
  conflict?: boolean;
  current?: OfficePolicyRow | null;
}

export interface BulkOfficePolicyCommandResult {
  correlation_id: string;
  results: BulkOfficePolicyResult[];
  preview_only?: boolean;
}

const parseBulkResult = (response: any): BulkOfficePolicyCommandResult => {
  const result = unwrapResult(response);
  return {
    correlation_id: `${result?.correlation_id || ''}`,
    results: Array.isArray(result?.results)
      ? result.results.map((item: any) => ({
          ...item,
          row: item?.row ? asRow(item.row) : undefined,
          current: item?.current ? asRow(item.current) : undefined,
        }))
      : [],
  };
};

export const previewOfficePolicies = async (
  changes: BulkOfficePolicyChange[],
  correlationId: string = uuidV4(),
): Promise<BulkOfficePolicyCommandResult> => {
  const response = await apiClient({
    method: 'POST',
    url: '/api/site/policy/bulk/preview',
    data: { changes },
    headers: { 'x-correlation-id': correlationId },
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
  return parseBulkResult(response);
};

/* Preview first so a stale/invalid target cannot produce a half-applied bulk
   command. The same correlation UUID makes a retry idempotent if the response
   is lost after some or all writes committed. */
export const bulkSaveOfficePolicies = async (
  changes: BulkOfficePolicyChange[],
): Promise<BulkOfficePolicyCommandResult> => {
  const correlationId = uuidV4();
  const preview = await previewOfficePolicies(changes, correlationId);
  if (preview.results.some((item) => !item.ok)) {
    return { ...preview, preview_only: true };
  }
  const response = await apiClient({
    method: 'POST',
    url: '/api/site/policy/bulk',
    data: { changes },
    headers: { 'x-correlation-id': correlationId },
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
  return parseBulkResult(response);
};

export const isOfficePolicyConflict = (error: any): boolean =>
  Number(error?.response?.status ?? error?.status) === 409;

export const describeOfficePolicyError = (error: any): string => {
  const body = error?.response?.data;
  const message =
    body?.message || body?.error?.message || body?.data?.message || error?.message;
  return typeof message === 'string' && message.trim()
    ? message
    : 'The office rules could not be saved. Nothing else was changed.';
};

/* Stable JSON for deciding which independently-versioned sections actually
   changed. Object key order from a form must not create an audit event. */
export const canonicalOfficePolicyJson = (value: any): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalOfficePolicyJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalOfficePolicyJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
};

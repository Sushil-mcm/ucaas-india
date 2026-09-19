import { apiClient } from '@/services/api/axios';
import { unwrapResult } from '@/lib/company-settings-api';
import type { AuditLogRow } from '@/lib/change-log';

export interface CentralAuditPage {
  rows: AuditLogRow[];
  next_cursor: string | null;
}

export const getCentralAuditHistory = async (cursor?: string): Promise<CentralAuditPage> => {
  const response = await apiClient.get('/api/audit/timeline', { params: { limit: 200, ...(cursor ? { cursor } : {}) } });
  const result = unwrapResult(response) as CentralAuditPage;
  if (!result || !Array.isArray(result.rows)) throw new Error('Central history returned an invalid response.');
  return result;
};

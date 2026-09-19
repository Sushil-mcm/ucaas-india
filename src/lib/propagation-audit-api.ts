import { apiClient, type CustomAxiosRequestConfig } from '@/services/api/axios';
import { unwrapResult } from '@/lib/company-settings-api';

export type PropagationSystemKey = 'pbx' | 'video' | 'campaign' | 'ai' | 'billing';
export type PropagationState =
  | 'delivered'
  | 'pending'
  | 'failed'
  | 'not_connected'
  | 'not_required';

export interface PropagationTarget {
  system: PropagationSystemKey;
  label: string;
  required: boolean;
  deferred?: boolean;
  state: PropagationState;
  attempts: number;
  delivered_at?: string | null;
  response_code?: number | null;
  last_error?: string | null;
  updated_at?: string | null;
}

export interface PropagationEvent {
  event_id: string;
  event_type: string;
  label: string;
  subject: string;
  aggregate_version: number;
  correlation_id: string;
  changed_fields: string[];
  actor?: string | null;
  occurred_at?: string | null;
  status: 'delivered' | 'pending' | 'failed' | 'coverage_gap';
  targets: PropagationTarget[];
}

export interface PropagationDashboard {
  generated_at: string;
  summary: {
    total: number;
    delivered: number;
    pending: number;
    failed: number;
    coverage_gaps: number;
  };
  systems: Array<{
    key: PropagationSystemKey;
    label: string;
    deferred?: boolean;
    connected_event_types: string[];
    delivered: number;
    pending: number;
    failed: number;
    coverage_gaps: number;
  }>;
  coverage: Array<{
    event_type: string;
    label: string;
    expected: PropagationSystemKey[];
    connected: PropagationSystemKey[];
    missing: PropagationSystemKey[];
    deferred?: PropagationSystemKey[];
  }>;
  projection_verification?: {
    generated_at?: string;
    sampled_users?: number;
    total_users?: number;
    unverified_users?: number;
    state?: string;
    systems: Array<{
      system: 'video' | 'campaign';
      state: 'matched' | 'drift' | 'source_changed' | 'unavailable' | 'no_users';
      checked_at?: string;
      checked_users?: number;
      checked_references?: number;
      mismatched_profiles?: number;
      mismatched_references?: number;
      reason?: string;
    }>;
  };
  events: PropagationEvent[];
}

export const getPropagationDashboard = async (limit = 150): Promise<PropagationDashboard> => {
  const response = await apiClient({
    method: 'POST',
    url: '/api/site/policy/propagation',
    data: { limit },
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
  return unwrapResult(response) as PropagationDashboard;
};

const csv = (value: unknown): string => {
  const original = String(value ?? '');
  const text = /^[\s]*[=+@-]/.test(original) ? `'${original}` : original;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const propagationToCsv = (events: PropagationEvent[]): string => {
  const systems: PropagationSystemKey[] = ['pbx', 'video', 'campaign', 'ai', 'billing'];
  const rows = [
    ['When', 'Change', 'Subject', 'Fields', 'Status', ...systems.map((key) => key.toUpperCase()), 'Correlation ID', 'Event ID'],
    ...events.map((event) => [
      event.occurred_at || '',
      event.label,
      event.subject,
      event.changed_fields.join('; '),
      event.status,
      ...systems.map((key) => {
        const target = event.targets.find((item) => item.system === key);
        return target?.deferred ? 'deferred' : target?.state === 'delivered' ? 'acknowledged' : target?.state || 'not_required';
      }),
      event.correlation_id,
      event.event_id,
    ]),
  ];
  return rows.map((row) => row.map(csv).join(',')).join('\n');
};

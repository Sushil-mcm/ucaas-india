export type ConnectedCrmOption = {
  label: string;
  value: string;
};

const CRM_LABELS: Record<string, string> = {
  HUBSPOT: 'HubSpot',
  MONDAY: 'Monday',
};

const formatCrmTypeLabel = (type: string) =>
  CRM_LABELS[type] ||
  type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const normalizeCrmValue = (value: unknown) => {
  const raw = String(value || '').trim();
  const upper = raw.toUpperCase();

  if (!upper) return '';
  if (upper.includes('HUBSPOT')) return 'HUBSPOT';
  if (upper.includes('MONDAY')) return 'MONDAY';

  return upper;
};

export const getConnectedCrmOptions = (response: any): ConnectedCrmOption[] => {
  const rows = response?.data?.data?.result || response?.data?.result || response?.result || [];
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((item: any) => item?.is_connected === true)
    .map((item: any) => {
      const value = normalizeCrmValue(item?.type);
      return value ? { label: formatCrmTypeLabel(value), value } : null;
    })
    .filter(Boolean) as ConnectedCrmOption[];
};

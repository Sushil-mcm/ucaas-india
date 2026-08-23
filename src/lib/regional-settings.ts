type RegionalOption = {
  label?: string;
  value?: string;
  [key: string]: unknown;
};

type RegionalSettings = {
  country?: RegionalOption | string;
  country_code?: RegionalOption | string;
  timezone?: RegionalOption | string;
  override?: boolean;
  time_format?: string;
  [key: string]: unknown;
};

const normalizeRegionalOption = (option: RegionalOption | string | undefined): RegionalOption => {
  if (typeof option === 'string') {
    const value = option.trim();
    return { label: value, value };
  }

  if (!option || typeof option !== 'object') return { label: '', value: '' };

  const value = String(option.value || '').trim();
  const label = String(option.label || value).trim();
  return { ...option, label, value };
};

export const normalizeRegionalSettings = (regional?: RegionalSettings | null) => ({
  ...(regional || {}),
  override: regional?.override ?? false,
  time_format: regional?.time_format || '12',
  country: normalizeRegionalOption(regional?.country),
  country_code: normalizeRegionalOption(regional?.country_code),
  timezone: normalizeRegionalOption(regional?.timezone),
});

export const hasCompleteRegionalSettings = (regional?: RegionalSettings | null) => {
  const normalizedRegional = normalizeRegionalSettings(regional);
  return Boolean(normalizedRegional.country.value && normalizedRegional.timezone.value);
};

export const withRegionalSettingsFallback = (
  operationalHours: Record<string, any> | null | undefined,
  fallbackRegional?: RegionalSettings | null,
) => {
  const clonedOperationalHours = operationalHours
    ? JSON.parse(JSON.stringify(operationalHours))
    : {};
  const currentRegional = normalizeRegionalSettings(clonedOperationalHours.regional);
  const resolvedRegional = hasCompleteRegionalSettings(currentRegional)
    ? currentRegional
    : hasCompleteRegionalSettings(fallbackRegional)
      ? normalizeRegionalSettings(fallbackRegional)
      : currentRegional;

  return {
    ...clonedOperationalHours,
    regional: resolvedRegional,
  };
};

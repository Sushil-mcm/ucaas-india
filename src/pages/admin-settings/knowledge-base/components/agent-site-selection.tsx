import { normalizeRegionalSettings } from '@/lib/regional-settings';

type AgentSiteSelectionProps = {
  sites: any[];
  selectedSiteId: string;
  onChange: (siteId: string) => void;
  error?: string;
  disabled?: boolean;
  isLoading?: boolean;
};

const readSiteValue = (value: unknown): string => {
  if (value && typeof value === 'object') {
    const option = value as { value?: unknown; label?: unknown };
    return String(option.value || option.label || '').trim();
  }

  return String(value || '').trim();
};

export const getAgentSiteId = (site: any): string =>
  String(site?.uuid || site?.id || site?.site_uuid || site?.site_id || '').trim();

export const getAgentSiteTimezone = (site: any): string =>
  readSiteValue(site?.timezone || site?.time_zone || site?.timeZone);

export const getPreferredAgentSiteId = (sites: any[]): string => {
  const defaultSite = sites.find(
    (site) => site?.is_default === '1' || site?.is_default === 1 || site?.is_default === true,
  );
  return getAgentSiteId(defaultSite || sites[0]);
};

export const getAgentSiteRegionalSettings = (site: any, currentRegional?: any) => {
  const timezone = getAgentSiteTimezone(site);
  const country = readSiteValue(site?.country);
  const countryCode = readSiteValue(
    site?.country_code || site?.countryCode || site?.iso_code || site?.isoCode,
  );

  return normalizeRegionalSettings({
    ...(currentRegional || {}),
    country: country
      ? { label: country, value: country }
      : currentRegional?.country || { label: '', value: '' },
    country_code: countryCode
      ? { label: countryCode, value: countryCode }
      : currentRegional?.country_code || { label: '', value: '' },
    timezone: { label: timezone, value: timezone },
  });
};

export default function AgentSiteSelection({
  sites,
  selectedSiteId,
  onChange,
  error,
  disabled = false,
  isLoading = false,
}: AgentSiteSelectionProps) {
  return (
    <div
      className="scroll-mt-24 rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-5 shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)]"
      data-validation-key="siteLocation"
    >
      <h3 className="text-sm font-semibold text-[#2E2D35]">Location</h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Select the site this agent belongs to. Its timezone will be used for schedules and
        reporting.
      </p>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-700">Site location *</span>
        <select
          value={selectedSiteId}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || isLoading || sites.length === 0}
          aria-invalid={Boolean(error)}
          className={`h-10 w-full rounded-md border bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-[#FBE2C8]/45 disabled:text-slate-500 ${
            error ? 'border-red-400' : 'border-[rgba(225,200,165,0.9)]'
          }`}
        >
          <option value="" disabled>
            {isLoading ? 'Loading sites...' : sites.length ? 'Select a site' : 'No sites available'}
          </option>
          {sites.map((site) => {
            const siteId = getAgentSiteId(site);
            const isDefault =
              site?.is_default === '1' || site?.is_default === 1 || site?.is_default === true;
            return (
              <option key={siteId} value={siteId}>
                {site?.name || 'Unnamed site'}
                {isDefault ? ' (Main Site)' : ''}
              </option>
            );
          })}
        </select>
      </label>

      {error ? <p className="mt-2 text-xs font-medium text-red-500">{error}</p> : null}
    </div>
  );
}

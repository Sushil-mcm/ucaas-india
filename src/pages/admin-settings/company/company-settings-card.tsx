/* Company-wide phone rules, surfaced where an admin looks for them.
 *
 * These settings exist and work — they are stored as a reserved template and
 * edited at Admin > Phone System > Preferences. But an admin opening
 * "Company & Locations" reasonably expects company settings to be there, finds a
 * company name and a list of locations, and concludes the product has none.
 * Established business phone systems put organisation-wide policy on the company screen.
 *
 * This shows the current values and hands off to the existing editor rather than
 * duplicating it: two editors writing the same record is how settings start
 * disagreeing with each other.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Mic, ShieldCheck, Voicemail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  type CompanyDefaultTemplate,
} from '@/lib/company-defaults';
import { COMPANY_RULES_PATH } from './company-sections';

interface Row {
  icon: React.ReactNode;
  label: string;
  value: string;
  /* True when a person may change this on their own phone. */
  staffMayChange: boolean;
}

const readPath = (source: any, path: string): any =>
  path.split('.').reduce((value, key) => (value == null ? value : value[key]), source);

/* `transcription` and `ai_call_monitoring` were plain booleans before they grew an
   override flag, so both shapes are still in the data. */
const toggleState = (value: any): boolean =>
  typeof value === 'object' && value !== null ? !!value.enabled : !!value;

const CompanySettingsCard = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<CompanyDefaultTemplate | null>({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    staleTime: 5 * 60 * 1000,
  });

  const rows = useMemo<Row[]>(() => {
    const settings = data?.settings || {};
    const hours = settings?.operational_hours || {};

    return [
      {
        icon: <Clock className="h-4 w-4" />,
        label: 'Business hours',
        value:
          hours?.type === '24_hours'
            ? 'Open 24 hours'
            : hours?.type === 'weekly'
              ? 'Set per weekday'
              : 'Not set',
        staffMayChange: readPath(settings, 'operational_hours.override') === true,
      },
      /* The voicemail row was pulled when the only editor for it was commented
         out: the card read an initial-state default and presented it as the
         company's choice, badge and all. There is a real editor now, at
         /admin-settings/company/voicemail, so the row is back — and it shows what
         was actually saved rather than a default.

         A PIN that has never been set reads as "Not set", so the card cannot
         claim a decision nobody made. */
      {
        icon: <Voicemail className="h-4 w-4" />,
        label: 'Voicemail',
        value: (() => {
          const pin = readPath(settings, 'voicemail_pin.value');
          const hasPin = typeof pin === 'string' ? pin.trim() !== '' : pin != null;
          const toText = readPath(settings, 'voicemail_pin.voicemail_to_text') === 'YES';
          if (!hasPin && !toText) return 'Not set';
          return [hasPin ? 'PIN set' : 'No PIN', toText ? 'read as text' : null]
            .filter(Boolean)
            .join(' · ');
        })(),
        staffMayChange: readPath(settings, 'voicemail_pin.override') === true,
      },
      {
        icon: <Mic className="h-4 w-4" />,
        label: 'Call recording',
        value: toggleState(settings?.recording?.automatic) ? 'Records every call' : 'Off',
        staffMayChange: readPath(settings, 'recording.override') === true,
      },
      {
        icon: <ShieldCheck className="h-4 w-4" />,
        label: 'Transcription',
        value: toggleState(settings?.transcription) ? 'On' : 'Off',
        staffMayChange: readPath(settings, 'transcription.override') === true,
      },
    ];
  }, [data]);

  const hasDefaults = Boolean(data?.uuid);

  return (
    <div className="rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-[#2E2D35]">Company phone rules</p>
          <p className="mt-0.5 text-xs text-[#9A948F]">
            The settings everyone at your company starts with, and which of them a person may change
            on their own phone.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate(COMPANY_RULES_PATH)}>
          {hasDefaults ? 'Edit rules' : 'Set them up'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-[#9A948F]">Loading…</p>
      ) : !hasDefaults ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-[#2E2D35]">No company rules set yet</p>
          <p className="mt-0.5 text-xs text-[#2E2D35]">
            Without them, each person is set up individually and nothing is applied consistently.
          </p>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-3 rounded-lg border border-[#EEE7DD] p-3"
            >
              <div className="flex min-w-0 items-start gap-2">
                <span className="mt-0.5 text-primary">{row.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#9A948F]">{row.label}</p>
                  <p className="text-sm font-medium text-[#2E2D35]">{row.value}</p>
                </div>
              </div>
              {/* Whether staff may override is the half admins forget, so it is
                  shown next to each rule rather than only inside the editor. */}
              <span
                className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold ${
                  row.staffMayChange
                    ? 'bg-[#FBE2C8]/40 text-[#9A948F]'
                    : 'bg-ucass-primary-200 text-primary'
                }`}
              >
                {row.staffMayChange ? 'Staff can change' : 'Locked'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanySettingsCard;

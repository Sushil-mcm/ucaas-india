/* "How calls reach you" — the panel the Profile page's own subtitle promised.
 *
 * The page had grown into a name, a job title and a photo, which told somebody
 * what colleagues see but nothing about the thing they actually came to check:
 * which number rings them, and what happens when they miss it. Dialpad and
 * Genesys both put that on the personal page rather than leaving it to be
 * assembled from three admin screens.
 *
 * Everything here is read from the person's own record. Nothing is assumed: a
 * field that is not set says so, because "—" against Direct number is the answer
 * to "why do outside callers never reach me".
 */

import { useMemo } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Hash, PhoneIncoming, Voicemail } from 'lucide-react';
import { evaluateUser } from '@/lib/call-standard';

interface HowCallsReachYouProps {
  userInfo?: any;
  settings?: any;
  greetings?: any;
}

const Fact = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  hint: string;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-3">
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    </div>
    <p className="mt-1 text-sm font-semibold text-gray-900">{value?.trim() ? value : '—'}</p>
    <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
  </div>
);

const HowCallsReachYou = ({ userInfo, settings, greetings }: HowCallsReachYouProps) => {
  /* evaluateUser reads the saved call rules rather than what a dropdown would
     display, which is the distinction that matters: the My Phone screen shows
     "Send to Voicemail" by default even when nothing was ever saved. */
  const coverage = useMemo(
    () => evaluateUser({ ...(userInfo || {}), call_forwarding: userInfo?.call_forwarding }),
    [userInfo],
  );

  const site = userInfo?.site_detail || {};
  const timezone = settings?.operational_hours?.regional?.timezone?.value || site?.timezone || '';
  const voicemailGreeting = greetings?.voicemail?.label || greetings?.voicemail?.value?.label || '';

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
      <p className="text-sm font-semibold text-gray-900">How calls reach you</p>
      <p className="mt-0.5 text-xs text-gray-600">
        Where a call comes in, and what happens if you do not pick it up.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Fact
          icon={<Hash className="h-4 w-4" />}
          label="Extension"
          value={userInfo?.extension}
          hint="Colleagues dial this from inside the company."
        />
        <Fact
          icon={<PhoneIncoming className="h-4 w-4" />}
          label="Direct number"
          value={userInfo?.phone}
          hint={
            userInfo?.phone
              ? 'Outside callers reach you on this number.'
              : 'No direct number, so outside callers cannot dial you straight.'
          }
        />
        <Fact
          icon={<Building2 className="h-4 w-4" />}
          label="Location"
          value={site?.name}
          hint={timezone ? `Your hours run on ${timezone}.` : 'No timezone set for your location.'}
        />
      </div>

      {/* The consequence of missing a call is the part people are actually
          unsure about, so it gets its own row rather than a fourth tile. */}
      <div
        className={`mt-2 flex items-start gap-2 rounded-lg border p-3 ${
          coverage.state === 'gap'
            ? 'border-amber-200 bg-amber-50'
            : 'border-green-200 bg-green-50'
        }`}
      >
        {coverage.state === 'gap' ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900">If you do not answer</p>
          <p className="text-xs text-gray-700">{coverage.detail}</p>
          {coverage.state !== 'gap' && voicemailGreeting && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-600">
              <Voicemail className="h-3.5 w-3.5" />
              Callers hear: {voicemailGreeting}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Change this under <span className="font-medium">My Account → My Phone</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HowCallsReachYou;

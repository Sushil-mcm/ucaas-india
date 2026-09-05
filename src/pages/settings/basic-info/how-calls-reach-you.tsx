/* "How calls reach you" — the panel the Profile page's own subtitle promised.
 *
 * The page had grown into a name, a job title and a photo, which told somebody
 * what colleagues see but nothing about the thing they actually came to check:
 * which number rings them, and what happens when they miss it. Mature calling
 * platforms put that on the personal page rather than leaving it to be
 * assembled from three admin screens.
 *
 * Everything here is read from the person's own record. Nothing is assumed: a
 * field that is not set says so, because "—" against Direct number is the answer
 * to "why do outside callers never reach me".
 *
 * A note on levels, because getting this wrong is silent. `getUserDetails`
 * returns `{ user_info, call_forwarding, settings, greetings, ... }`. Only the
 * name, extension, phone and location live under `user_info`; the call rules,
 * the regional settings and the greetings are its siblings at the root. Reading
 * `user_info.call_forwarding` yields `undefined`, which does not throw — it just
 * makes every judgement below come out as "nothing is set".
 */

import { useMemo } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Hash, PhoneIncoming, Voicemail } from 'lucide-react';
import { evaluateUser } from '@/lib/call-standard';

interface HowCallsReachYouProps {
  /** The `user_info` object: extension, phone, site_detail. */
  userInfo?: any;
  /** `call_forwarding` from the response root — a sibling of `user_info`, not a field on it. */
  callForwarding?: unknown;
  /** `settings` from the response root. Arrives as an object or as a JSON string. */
  settings?: unknown;
  /** `greetings` from the response root. Arrives as an object or as a JSON string. */
  greetings?: unknown;
}

/* The API returns these blocks either parsed or as JSON text, so every screen
   that reads them normalises first — see the same helper on the setup guide
   beside this one, and the inline parses on My Phone and General Settings. */
const asObject = (value: unknown): any => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value) || '{}');
  } catch {
    return {};
  }
};

/* One fact per row rather than a tile in a three-across grid: this panel
   now sits in a 360px column beside the form, where three tiles would be
   three cramped boxes. A row gives the value room and keeps the hint on
   one line. Colours come from the design tokens rather than the hex
   literals this was written with, so it follows the theme. */
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
  <div className="mcm-coverage-fact">
    <span className="mcm-coverage-fact-icon" aria-hidden="true">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="mcm-coverage-fact-k">{label}</p>
      <p className="mcm-coverage-fact-v">{value?.trim() ? value : '—'}</p>
      <p className="mcm-coverage-fact-hint">{hint}</p>
    </div>
  </div>
);

const HowCallsReachYou = ({
  userInfo,
  callForwarding,
  settings,
  greetings,
}: HowCallsReachYouProps) => {
  /* evaluateUser reads the saved call rules rather than what a dropdown would
     display, which is the distinction that matters: the My Phone screen shows
     "Send to Voicemail" by default even when nothing was ever saved. It takes
     the record with `call_forwarding` at the top level, which is the shape the
     admin coverage screen passes it. */
  const coverage = useMemo(
    () => evaluateUser({ call_forwarding: callForwarding }),
    [callForwarding],
  );

  const site = userInfo?.site_detail || {};
  const settingsData = asObject(settings);
  const greetingsData = asObject(greetings);

  const timezone =
    settingsData?.operational_hours?.regional?.timezone?.value || site?.timezone || '';

  /* A greeting that is stored but switched off is not what callers hear, so it
     is not claimed here — the checklist below applies the same test. */
  const voicemail = greetingsData?.voicemail;
  const greetingSet = Boolean(voicemail?.value) && voicemail?.enabled !== false;
  const voicemailGreeting = greetingSet ? String(voicemail?.label || '').trim() : '';

  const covered = coverage.state === 'covered';

  return (
    <section className="mcm-coverage">
      <div className="mcm-coverage-h">
        <h2 className="mcm-coverage-t">How calls reach you</h2>
        <p className="mcm-coverage-d">
          Where a call comes in, and what happens if you do not pick it up.
        </p>
      </div>

      {/* The answer people came for goes first, not after three reference
          facts. The heading covers every answer this can give, including
          the one where forwarding means the phone never rings at all. */}
      <div className={`mcm-coverage-verdict ${covered ? 'is-ok' : 'is-warn'}`}>
        {covered ? (
          <CheckCircle2 className="mcm-coverage-verdict-icon" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mcm-coverage-verdict-icon" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="mcm-coverage-verdict-t">When someone calls you</p>
          <p className="mcm-coverage-verdict-d">{coverage.detail}</p>
          {covered && voicemailGreeting && (
            <p className="mcm-coverage-verdict-note">
              <Voicemail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Callers hear: {voicemailGreeting}
            </p>
          )}
          <p className="mcm-coverage-verdict-note">
            Change this under <strong>My Account → My Phone</strong>.
          </p>
        </div>
      </div>

      <div className="mcm-coverage-facts">
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
    </section>
  );
};

export default HowCallsReachYou;

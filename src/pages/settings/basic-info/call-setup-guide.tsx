import { Link } from 'react-router-dom';
import { useGetAssignedDIDNumbers } from '@/hooks/common';
import { Ic, McmIconSprite } from '@/components/mcm/icons';

/**
 * "How your calls reach you" — the setup this profile is actually for.
 *
 * On its own this screen is a name, a photo and an extension, with nothing
 * saying what any of it does. The questions people arrive with are which number
 * rings them, what happens when they miss a call, and what a caller hears — and
 * every one of those is answered somewhere else in Admin.
 *
 * So rather than explaining the settings in the abstract, this reads the
 * person's own configuration and tells them where they stand, with a link to
 * the screen that changes each one. A checklist that reports real state is
 * worth more than help text, because it can say "this one is not set up" — and
 * that is the failure people cannot otherwise see. A number that drops calls
 * looks identical to one that works until somebody rings it.
 */

type Step = {
  title: string;
  /** What is true right now, in the person's own configuration. */
  status: string;
  ok: boolean;
  /** Why this step exists at all, for someone meeting it the first time. */
  explain: string;
  action?: { label: string; to: string };
};

const asObject = (value: unknown): any => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value) || '{}');
  } catch {
    return {};
  }
};

const CallSetupGuide = ({ userInfo }: { userInfo: any }) => {
  const info = userInfo?.user_info || {};
  const extension = String(info?.extension || '').trim();
  const fullName = `${info?.first_name || ''} ${info?.last_name || ''}`.trim();

  const { data: assignedNumbers = [] } = useGetAssignedDIDNumbers(info?.uuid || userInfo?.uuid);

  const rules = asObject(userInfo?.call_forwarding);
  const greetings = asObject(userInfo?.greetings);

  const failureAction = rules?.incoming_calls?.failure_action;
  const fallbackSet = Boolean(failureAction?.type) && failureAction?.enabled !== false;
  const fallbackIsVoicemail = String(failureAction?.type || '') === 'VOICEMAIL';

  const voicemailGreeting = greetings?.voicemail;
  const greetingSet = Boolean(voicemailGreeting?.value) && voicemailGreeting?.enabled !== false;

  const numbers = (assignedNumbers as any[]) || [];

  const steps: Step[] = [
    {
      title: 'Your extension',
      status: extension ? `Colleagues reach you on ${extension}` : 'No extension assigned yet',
      ok: Boolean(extension),
      explain:
        'Your internal number. Anyone inside the company can dial it directly, and outside numbers are pointed at it.',
      action: extension ? undefined : { label: 'Ask an admin', to: '/admin-settings/people' },
    },
    {
      title: 'Numbers that ring you',
      status: numbers.length
        ? numbers
            .slice(0, 3)
            .map((row: any) => row?.did_number)
            .filter(Boolean)
            .join(', ') + (numbers.length > 3 ? ` and ${numbers.length - 3} more` : '')
        : 'No outside number points here yet',
      ok: numbers.length > 0,
      explain:
        'The public numbers people outside the company dial to reach you. Without one, only colleagues can call you.',
      action: { label: 'Numbers', to: '/admin-settings/numbers/in-use' },
    },
    {
      title: 'When you do not answer',
      status: fallbackSet
        ? fallbackIsVoicemail
          ? 'Callers are sent to your voicemail'
          : `Callers fall back to ${String(failureAction?.type || '').toLowerCase()}`
        : 'Nothing is set, so callers are hung up on',
      ok: fallbackSet,
      explain:
        'Covers a rejected call, a call you miss, and a call that arrives while you are offline. With nothing set here the switch simply ends the call, and the caller hears silence.',
      action: { label: 'Set it on My Phone', to: '/admin-settings/account/phone' },
    },
    {
      title: 'What callers hear',
      status: greetingSet
        ? `Your greeting: ${voicemailGreeting?.label || 'set'}`
        : 'No greeting, so callers get a bare tone',
      ok: greetingSet,
      explain: fullName
        ? `A greeting that names you — "You have reached the voicemail of ${fullName}" — tells callers they reached the right person before they start talking.`
        : 'A greeting that names you tells callers they reached the right person before they start talking.',
      action: { label: 'Greetings', to: '/admin-settings/account/greetings' },
    },
  ];

  const outstanding = steps.filter((step) => !step.ok).length;

  return (
    <section className="mcm-setupguide">
      <McmIconSprite />
      <header>
        <div>
          <h2>How your calls reach you</h2>
          <p>
            {outstanding
              ? `${outstanding} of these ${outstanding === 1 ? 'is' : 'are'} not set up yet. Until they are, some callers will not get through.`
              : 'Everything is set up — calls reach you, and the ones you miss reach your voicemail.'}
          </p>
        </div>
        <span className={`mcm-setupguide-pill${outstanding ? ' warn' : ''}`}>
          {outstanding ? `${outstanding} to finish` : 'All set'}
        </span>
      </header>

      <ol>
        {steps.map((step) => (
          <li key={step.title} className={step.ok ? 'ok' : 'todo'}>
            <span className="mcm-setupguide-mark" aria-hidden>
              <Ic n={step.ok ? 'check' : 'alert'} size={13} />
            </span>
            <div className="mcm-setupguide-body">
              <h3>{step.title}</h3>
              <p className="mcm-setupguide-status">{step.status}</p>
              {/* A step that is already set up says so in one line. The
                  paragraph explaining why the step exists, and the link to go
                  and change it, are what somebody needs when something is NOT
                  set up — carrying them on the finished steps too made the
                  panel taller than the screen and buried the two rows that
                  actually wanted attention among four that did not. The
                  checklist is now as long as the work left in it. */}
              {!step.ok && <p className="mcm-setupguide-explain">{step.explain}</p>}
            </div>
            {!step.ok && step.action ? (
              <Link className="mcm-setupguide-action" to={step.action.to}>
                {step.action.label}
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
};

export default CallSetupGuide;

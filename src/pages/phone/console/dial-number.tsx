import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { useDialpad } from '@/hooks/use-dialpad';
import { useDialpadCallerIdOptions } from '@/hooks/use-dialpad-caller-id-options';
import { isExtensionDialTarget } from '@/lib/extension-utility';
import type { DialpadMakeCallOptions } from '@/context/dialpad-context';
import { Ic } from './icons';

/**
 * Click-to-call.
 *
 * One place that decides whether a dial is allowed and how it is reported, so
 * every number in the console behaves the same wherever it appears — call list,
 * contact panel, call record header.
 */
export const useConsoleDialer = () => {
  const dialpad = useDialpad();
  const { defaultCallerIdOption } = useDialpadCallerIdOptions();

  const dial = useCallback(
    (raw: unknown, options?: DialpadMakeCallOptions) => {
      const target = String(raw ?? '').trim();
      if (!target) return false;

      if (!dialpad.isRegistered) {
        toast.error('Your phone is not registered yet — check the station status on the dialer.');
        return false;
      }

      // Already talking to this number on a live leg: don't start a duplicate.
      const existing = Object.values(dialpad.sessions || {}).find(
        (s) =>
          !['ended', 'failed'].includes(String(s.status || '').toLowerCase()) &&
          String(s.remoteNumber || '').replace(/\s/g, '') === target.replace(/\s/g, ''),
      );
      if (existing) {
        dialpad.switchActiveSession(existing.id);
        toast.info('You are already on a call with that number.');
        return false;
      }

      /* The switch reads X-CallerId to decide what the person being called
         sees, and falls back to its own default number when the header is
         absent. Callers that already set it — call-log redial, campaigns —
         keep control; everything else inherits the console's caller ID rather
         than silently presenting whatever the switch picks. */
      const alreadySetsCallerId = (options?.extraHeaders ?? []).some((header) =>
        String(header || '')
          .trim()
          .toLowerCase()
          .startsWith('x-callerid:'),
      );

      const callOptions: DialpadMakeCallOptions = alreadySetsCallerId
        ? (options ?? {})
        : {
            ...(options ?? {}),
            extraHeaders: [
              ...(options?.extraHeaders ?? []),
              `X-CallerId: ${
                isExtensionDialTarget(target) || defaultCallerIdOption?.id === 'no-caller-id'
                  ? ''
                  : defaultCallerIdOption?.number || ''
              }`,
            ],
          };

      const started = dialpad.makeCall(target, callOptions);
      if (!started) toast.error(`Could not start a call to ${target}.`);
      return started;
    },
    [dialpad, defaultCallerIdOption],
  );

  return { dial, isRegistered: dialpad.isRegistered };
};

/**
 * A phone number rendered as a dial action. Stops propagation so it can sit
 * inside a row that has its own click behaviour.
 */
export const DialNumber = ({
  number,
  className = '',
  title,
  children,
}: {
  number?: string | null;
  className?: string;
  title?: string;
  children?: React.ReactNode;
}) => {
  const { dial } = useConsoleDialer();
  const value = String(number ?? '').trim();
  if (!value) return <span className={className}>—</span>;

  return (
    <button
      type="button"
      className={`dialnum ${className}`}
      title={title || `Call ${value}`}
      aria-label={`Call ${value}`}
      onClick={(e) => {
        e.stopPropagation();
        dial(value);
      }}
    >
      <span className="dialnum-text">{children ?? value}</span>
      <Ic n="phone" size={11} className="dialnum-ic" />
    </button>
  );
};

/* Two cards for Security & Privacy: "Two-step sign-in" and "Trusted devices".
 *
 * Two-step sign-in on this platform is a code emailed at sign-in. Since 13 Sep
 * 2026 it is OPT-IN per company: off unless an administrator turns on Require
 * MFA under Company > Security, with an exception list of people who are not
 * asked. The server decides `two_step.enforced` with the very helpers sign-in
 * uses (AuthController.mfaTwoStepForUser) and sends a one-line reason for the
 * case it found, so the card shows Active or Off and repeats that sentence -
 * the screen and the login path can never disagree about the rule. An older
 * server that does not know the rule reports enforced, the direction sign-in
 * fails in.
 *
 * A trusted device is one that passed a code recently. Trust lives in the
 * server's OTP rows, not in the session list, which is why these rows are not
 * the same as the "signed in as you" sessions further down the page. Today
 * no state lets trust skip the code (off: nobody is asked; on: the server
 * refuses the 30-day skip), and the wording says so. Revoke deletes the trust
 * and, for any device other than this one, ends the session.
 *
 * Three honest states while loading: "Checking..." until the server answers,
 * then the list, "No trusted devices", or - on a server without the endpoint -
 * a Coming soon note. Zero rows are never shown as a fact before the answer
 * arrives. */

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LucideMonitor, LucideShieldCheck, LucideSmartphone, LogOut, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import Loader from '@/components/custom/loader';
import { useUser } from '@/hooks/use-user';
import { getDeviceId, handleAlert } from '@/lib/utils';
import { NotAppliedFlag, LiveFlag } from '@/pages/settings/not-applied-note';
import '@/components/mcm/mcm-page.css';

import {
  TRUSTED_DEVICES_QUERY_KEY,
  describeListError,
  listTrustedDevices,
  revokeAllTrustedDevices,
  revokeTrustedDevice,
} from './trusted-devices-api';
import {
  countOtherDevices,
  describeRevoke,
  describeTrust,
  describeTrustedDevicesIntro,
  formatWhen,
  isThisDevice,
  sortDevices,
  twoStepLabel,
  type TrustedDeviceRow,
  type TwoStepStatus,
} from './trusted-devices-logic';

const Card = ({
  title,
  badge,
  intro,
  aside,
  wide,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  intro: React.ReactNode;
  aside?: React.ReactNode;
  /* Takes the whole row of the two-column grid. A card that grows with its
     contents leaves its neighbour's column empty for the rest of its height;
     spanning both columns is what stops that gap appearing. */
  wide?: boolean;
  children?: React.ReactNode;
}) => (
  <div
    className={`flex flex-col gap-3 bg-white p-4 rounded-lg border border-gray-200${
      wide ? ' mcm-seccard-wide' : ''
    }`}
  >
    <div className="flex sm:flex-row flex-col sm:items-center justify-between gap-4">
      <div className="flex flex-col gap-1 sm:w-2/3 w-full">
        <p className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {title}
          {badge}
        </p>
        <p className="text-gray-500 text-xs">{intro}</p>
      </div>
      {aside}
    </div>
    {children}
  </div>
);

const DeviceRow = ({
  row,
  thisDevice,
  twoStep,
  onRevoke,
  busy,
}: {
  row: TrustedDeviceRow;
  thisDevice: boolean;
  twoStep: TwoStepStatus | null;
  onRevoke: (row: TrustedDeviceRow) => void;
  busy: boolean;
}) => {
  const isPhone = row.device_type === 'A' || row.device_type === 'I';
  return (
    /* `mcm-solid-card`: rounded plus `bg-white` is what the console's glass
       rule matches, and it was painting each device row cream. The card
       around them keeps the tint; only the rows opt out. */
    <div className="mcm-solid-card border p-3 flex sm:flex-row flex-col gap-2 rounded-lg sm:justify-between bg-white">
      <div className="flex items-start gap-3 w-full">
        <span className="w-8 min-w-8 h-8 rounded-sm bg-ucass-primary-200 text-primary p-1.5 flex items-center justify-center">
          {isPhone ? <LucideSmartphone className="w-4 h-4" /> : <LucideMonitor className="w-4 h-4" />}
        </span>
        <div className="flex flex-col gap-0.5 w-full">
          <p className="text-gray-900 font-medium text-sm flex items-center gap-2 flex-wrap">
            {row.label}
            {thisDevice ? (
              <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                <LucideShieldCheck className="w-3.5 h-3.5" /> This device
              </span>
            ) : null}
            {row.trusted ? (
              <span className="mcm-setcard-badge is-on">Trusted</span>
            ) : (
              <span className="mcm-setcard-badge is-off">Not trusted</span>
            )}
            {row.signed_in ? null : <span className="mcm-setcard-badge is-off">Signed out</span>}
          </p>
          <p className="text-gray-600 text-xs">{describeTrust(row, new Date(), twoStep)}</p>
          {/* Four stacked lines became one. The worst of them printed the raw
              user-agent - "Mozilla/5.0 (Windows NT 10.0; Win64; x64)
              AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0
              Safari/537.36" - wrapped across two lines, under a title that
              already says "Chrome on Windows". Nobody reads that string; the
              one person who ever needs it, needs it exactly once. It is behind
              the mark at the end of the line, and everything else now sits on a
              single row of facts. */}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            {row.ip_address ? <span>IP {row.ip_address}</span> : null}
            {row.last_seen ? <span>Last seen {formatWhen(row.last_seen)}</span> : null}
            {row.trusted && row.trusted_until ? (
              <span>Trusted until {formatWhen(row.trusted_until)}</span>
            ) : null}
            {row.user_agent || row.first_seen ? (
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  aria-label="Device details"
                  className="flex cursor-pointer items-center text-gray-400 transition-colors hover:text-gray-600"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
                  </svg>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="mcm-infotip">
                  {row.first_seen ? <span className="block">First seen {formatWhen(row.first_seen)}</span> : null}
                  {row.user_agent ? (
                    <span className="mt-1 block break-all font-mono text-[11px] leading-snug">
                      {row.user_agent}
                    </span>
                  ) : null}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex items-center">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => onRevoke(row)}
          className="flex items-center justify-center whitespace-nowrap"
          title={describeRevoke(thisDevice, twoStep)}
        >
          Revoke
        </Button>
      </div>
    </div>
  );
};

const TrustedDevices = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const ctx = useMemo(
    () => ({
      localDeviceId: getDeviceId(),
      sessionUuid: user?.device_token ? String(user.device_token) : null,
    }),
    [user?.device_token],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: TRUSTED_DEVICES_QUERY_KEY,
    queryFn: listTrustedDevices,
    retry: false,
  });

  const rows = useMemo(
    () => (data?.kind === 'ok' ? sortDevices(data.list.devices, ctx) : []),
    [data, ctx],
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: TRUSTED_DEVICES_QUERY_KEY });
    /* The sessions list further down the page shares the rows this touches. */
    queryClient.invalidateQueries({ queryKey: ['deviceSecurityList'] });
  };

  const { mutate: revokeOne, isPending: revoking } = useMutation({
    mutationFn: (row: TrustedDeviceRow) => revokeTrustedDevice(row.id),
    onMutate: (row) => setPendingId(row.id),
    onSuccess: (res) => {
      handleAlert({ text: res?.data?.data?.message || 'Device revoked.', type: 'success' });
    },
    onSettled: () => {
      setPendingId(null);
      refresh();
    },
  });

  const { mutate: revokeAll, isPending: revokingAll } = useMutation({
    mutationFn: revokeAllTrustedDevices,
    onSuccess: (res) => {
      handleAlert({ text: res?.data?.data?.message || 'Other devices signed out.', type: 'success' });
    },
    onSettled: refresh,
  });

  const others = countOtherDevices(rows, ctx);
  const twoStep = data?.kind === 'ok' ? data.list.two_step : null;
  const absent = data?.kind === 'absent';

  const twoStepBadge = isLoading ? null : absent ? (
    <NotAppliedFlag>Coming soon</NotAppliedFlag>
  ) : twoStepLabel(twoStep) === 'Active' ? (
    <LiveFlag>Active</LiveFlag>
  ) : (
    <span className="mcm-setcard-badge is-off">Off</span>
  );

  return (
    <>
      <Card
        title="Two-step sign-in"
        badge={twoStepBadge}
        intro={
          isLoading
            ? 'Checking…'
            : absent
              ? 'This server does not report the rule yet. Sign-in still asks for a code emailed to you.'
              : isError
                ? describeListError(error)
                : twoStep?.reason ||
                  'Every sign-in needs your password and a code emailed to you, unless the device is trusted.'
        }
      />

      <Card
        title="Trusted devices"
        wide
        /* One line, by the same status as the card above: with two-step off
           (or this person excused) trust makes no difference, and with it on
           the server still asks every device - so the old "skip the emailed
           code" sentence was never true in any state. */
        intro={
          isLoading ? 'Checking…'
          : absent || isError ? 'Devices that passed a code recently. Revoke signs any other device out.'
          : describeTrustedDevicesIntro(twoStep)
        }
        aside={
          <Button
            variant="destructiveOutline"
            className="whitespace-nowrap"
            disabled={isLoading || absent || isError || revokingAll || others === 0}
            onClick={() => revokeAll()}
            title={others === 0 ? 'No other devices to sign out.' : `Signs out ${others} other device(s).`}
          >
            <LogOut className="w-4 h-4" />
            {revokingAll ? 'Signing out…' : 'Sign out of all other devices'}
          </Button>
        }
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-xs py-2">
            <Loader variant="blue" size="sm" /> Checking…
          </div>
        ) : absent ? (
          <p className="mcm-notsaved" role="status">
            <strong>Coming soon</strong>
            <span>
              This server cannot list trusted devices yet. Until it can, use the sessions list below to
              sign a device out.
            </span>
          </p>
        ) : isError ? (
          <div className="flex items-center justify-between gap-3 text-xs text-red-700">
            <span>{describeListError(error)}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-xs py-1">No trusted devices.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <DeviceRow
                key={row.id}
                row={row}
                thisDevice={isThisDevice(row, ctx)}
                twoStep={twoStep}
                onRevoke={revokeOne}
                busy={revoking && pendingId === row.id}
              />
            ))}
          </div>
        )}
      </Card>
    </>
  );
};

export default TrustedDevices;

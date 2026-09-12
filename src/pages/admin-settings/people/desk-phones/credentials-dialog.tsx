/* What to type into a phone: the registration details for one handset.
   Shown on demand, never in the list, because the password is a secret.

   Laid out to fit on a screen. The values and the instructions that use them
   sit side by side rather than stacked, because reading one while typing the
   other is the whole job; below `lg` they stack, as a narrow window must.
   The dialog is capped at the window height with its own scrolling middle, so
   the title stays readable and the action stays reachable however long a
   phone's field list runs (a Cisco SPA900 lists eleven fields).

   `.mcm-dialog` on the panel: a dialog renders in a portal outside
   `.mcm-page`, so without it the design system's buttons never reach here. */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { handleAlert } from '@/lib/utils';
import { setupGuideFor, type DialogRow, type ManualField, type SetupGuide } from '@/lib/desk-phone-setup-guides';
import {
  deskPhoneCredentials,
  describeError,
  DESK_PHONES_QUERY_KEY,
  myDeskPhoneCredentials,
  rotateDeskPhoneSecret,
  type DeskPhone,
} from './desk-phones-api';

const Row = ({ label, value, secret }: { label: string; value: string | null | undefined; secret?: boolean }) => {
  const [shown, setShown] = useState(!secret);
  const text = value ?? '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      handleAlert({ text: `${label} copied.`, type: 'success' });
    } catch {
      handleAlert({ text: 'Could not copy. Select the text and copy it by hand.', type: 'error' });
    }
  };
  return (
    /* Label above the value, not beside it: a SIP realm or a provisioning URL
       is far too long to share a line with its own label in half a dialog,
       and a value the reader cannot see is a value they cannot check. */
    <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 text-sm last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] leading-tight text-gray-500">{label}</span>
        <code className="block truncate font-mono text-xs leading-snug text-gray-900">
          {text ? (shown ? text : '•'.repeat(Math.min(text.length, 20))) : '—'}
        </code>
      </span>
      <span className="flex shrink-0 gap-1">
        {secret && text ? (
          <button type="button" className="btn ghost sm" onClick={() => setShown((s) => !s)}>
            {shown ? 'Hide' : 'Show'}
          </button>
        ) : null}
        {text ? (
          <button type="button" className="btn ghost sm" onClick={copy}>
            Copy
          </button>
        ) : null}
      </span>
    </div>
  );
};

/* The instructions half of a section: the phone's own page path, its field
   names, and what to press. Sits beside the values it refers to. */
const Steps = ({
  half,
  describe,
}: {
  half: NonNullable<SetupGuide['auto']> | SetupGuide['manual'];
  describe: (from: ManualField['from']) => string;
}) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
    <div className="font-medium text-gray-900">
      On the phone&rsquo;s web page open {half.where.join(' › ')}
    </div>
    <table className="mt-1.5 w-full">
      <tbody>
        {half.fields.map((f) => (
          <tr key={f.phone}>
            <td className="py-0.5 pr-3 align-top text-gray-600">{f.phone}</td>
            <td className="py-0.5 align-top font-medium">{describe(f.from)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="mt-1.5">{half.apply}</div>
    {half.note ? <div className="mt-1 text-gray-500">{half.note}</div> : null}
  </div>
);

const Heading = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{children}</div>
);

/* `own`: the signed-in person looking at their own phone (My Phone). Uses the
   own-rows endpoint and hides the admin-only "new password" action. */
const CredentialsDialog = ({ device, onClose, own = false }: { device: DeskPhone | null; onClose: () => void; own?: boolean }) => {
  const queryClient = useQueryClient();
  const uuid = device?.uuid ?? '';
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [own ? 'me' : 'admin', 'desk-phones', 'credentials', uuid],
    queryFn: () => (own ? myDeskPhoneCredentials(uuid) : deskPhoneCredentials(uuid)),
    enabled: Boolean(uuid),
    retry: false,
    gcTime: 0,
  });
  const { mutate: rotate, isPending: rotating } = useMutation({
    mutationFn: () => rotateDeskPhoneSecret(uuid),
    onSuccess: () => {
      handleAlert({ text: 'New SIP password issued. Update the phone with the new details.', type: 'success' });
      refetch();
      queryClient.invalidateQueries({ queryKey: DESK_PHONES_QUERY_KEY });
    },
  });

  const reg = data?.registration;
  const prov = data?.provisioning;
  const guide = setupGuideFor(device?.vendor, device?.model);

  /* A family that cannot do the company's transport (the Linksys-era Cisco
     phones speak UDP only) is shown the UDP port instead. */
  const manualTransport = guide.manual.transport === 'udp' ? 'UDP' : String(reg?.transport ?? 'tcp').toUpperCase();
  const manualPort = guide.manual.transport === 'udp' ? reg?.fallback_port ?? 5060 : reg?.port ?? 5060;

  /* The word for a dialog row when a phone field is described. */
  const describe = (from: ManualField['from']): string => {
    if (typeof from === 'object') return from.literal;
    const words: Record<DialogRow, string> = {
      username: 'the Username',
      password: 'the Password',
      server: 'the Server',
      port: 'the Port',
      transport: 'the Transport',
      outbound_proxy: 'the Outbound proxy (before the colon)',
      outbound_port: 'the Outbound proxy port (after the colon)',
      display_name: reg?.display_name ? `the person's name, ${reg.display_name}` : "the person's name",
      prov_url: 'the Provisioning URL',
      prov_url_no_scheme: 'the Provisioning URL without "https://"',
      prov_login: 'the Login',
      prov_secret: 'the Secret',
    };
    return words[from];
  };

  return (
    <Dialog open={Boolean(device)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="mcm-dialog flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[54rem]">
        <DialogHeader className="shrink-0 gap-1 border-b border-gray-200 p-4 pr-10">
          <DialogTitle className="text-base">
            {device?.label || device?.model} · {device?.mac_display}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Everything the phone needs to register, and nothing else. Page and field names below are
            those of a <b className="font-semibold text-gray-700">{guide.family}</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isLoading ? <p className="text-sm text-gray-500">Loading…</p> : null}
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {describeError(error, 'Could not load the details.')}
            </div>
          ) : null}

          {reg ? (
            <div className="flex flex-col gap-4">
              {!reg.username ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  This phone has no extension to register as yet. Give it a person, or a room
                  extension, first.
                </div>
              ) : null}

              {/* ---- automatic setup ---- */}
              <section>
                <Heading>Automatic setup{prov?.url && guide.auto ? ' (recommended)' : ''}</Heading>
                {!prov?.url ? (
                  <p className="text-xs text-gray-500">
                    Not switched on for this company yet. Use the manual details below.
                  </p>
                ) : !guide.auto ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {guide.autoBlocked}
                  </div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200">
                      <Row label="Provisioning URL" value={prov.url} />
                      <Row label="Login" value={prov.username} />
                      <Row label="Secret" value={prov.password} secret />
                      {String(device?.vendor) === 'poly-obi' ? (
                        <Row
                          label="OBi ConfigURL"
                          value={`https://${prov.username}:${prov.password}@${String(prov.url).replace(/^https?:\/\//, '')}obi$MAC.xml`}
                          secret
                        />
                      ) : null}
                      {String(device?.vendor) === 'cisco' ? (
                        <Row
                          label="Profile Rule"
                          value={`[--uid ${prov.username} --pwd ${prov.password}] ${prov.url}${/^SPA/i.test(String(device?.model)) ? 'spa$MA.cfg' : '$MA.cfg'}`}
                          secret
                        />
                      ) : null}
                      <p className="px-3 py-2 text-xs text-gray-500">
                        The phone fills in its own account and checks back every hour. Do not also
                        type the account in by hand.
                      </p>
                    </div>
                    <Steps half={guide.auto} describe={describe} />
                  </div>
                )}
              </section>

              {/* ---- manual setup ---- */}
              <section>
                <Heading>
                  {guide.auto ? "Or type it into the phone's account page" : "Type it into the phone's account page"}
                </Heading>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-gray-200">
                    <Row label="Username" value={reg.username} />
                    <Row label="Password" value={reg.password} secret />
                    <Row label="Server" value={reg.realm} />
                    <Row label="Port" value={String(manualPort)} />
                    <Row label="Transport" value={manualTransport} />
                    <Row label="Outbound proxy" value={`${reg.outbound_proxy}:${manualPort}`} />
                    <p className="px-3 py-2 text-xs text-gray-500">
                      The Username is this phone&rsquo;s own login; the part before &ldquo;_p&rdquo;
                      is the extension it rings for. The Outbound proxy is required: the Server name
                      is your company&rsquo;s SIP realm and is not in public DNS. Only this Password
                      registers; the provisioning Secret and the portal login do not.
                    </p>
                  </div>
                  <Steps half={guide.manual} describe={describe} />
                </div>
              </section>
            </div>
          ) : null}
        </div>

        {reg && !own ? (
          <div className="flex shrink-0 justify-end border-t border-gray-200 p-3">
            <button type="button" className="btn ghost sm" disabled={rotating} onClick={() => rotate()}>
              {rotating ? 'Issuing…' : 'Issue a new password'}
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default CredentialsDialog;

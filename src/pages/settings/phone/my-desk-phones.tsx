/* The signed-in person's own desk phones, on My Phone.
 *
 * The reference products give each person a "your devices" list where the
 * desk phone an admin added for them shows up, with its details. This is that
 * list. Since 9 Sep 2026 it can also ADD one: the company-level "people may
 * set up their own desk phone" switch (Company > Desk phones) is answered by
 * the server on the same call that lists the phones, and "Add a desk phone"
 * appears only when it says yes. The server refuses the add on its own when
 * the switch is off, so the button is a convenience, not the gate. */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import CredentialsDialog from '@/pages/admin-settings/people/desk-phones/credentials-dialog';
import {
  describeError,
  deskPhoneCatalogue,
  MY_DESK_PHONES_QUERY_KEY,
  type DeskPhone,
} from '@/pages/admin-settings/people/desk-phones/desk-phones-api';
import {
  addMyDeskPhone,
  listMyDeskPhonesWithRule,
  MY_DESK_PHONES_RULE_QUERY_KEY,
} from '@/pages/admin-settings/company/desk-phones-self-api';
import { handleAlert } from '@/lib/utils';

const VENDOR_NAME: Record<string, string> = { yealink: 'Yealink', poly: 'Poly', 'poly-obi': 'Poly OBi', cisco: 'Cisco', grandstream: 'Grandstream' };

const STATE_LABEL: Record<string, string> = {
  unassigned: 'Not set up',
  ready: 'Ready to register',
  registered: 'Registered',
  offline: 'Offline',
};

/* Twelve hex digits, with or without separators, is what every phone prints
   on its label; anything else is refused here before the server sees it. */
const MAC_PATTERN = /^([0-9a-f]{2}[:-]?){5}[0-9a-f]{2}$/i;

const VENDOR_LABEL: Record<string, string> = VENDOR_NAME;

/* The add form. Small on purpose: MAC, make and model are all a phone needs
   to be given its settings; the label is optional. Everything else - the
   owner, the SIP login, the passwords - the server decides from the session. */
const AddMyPhone = ({ onDone }: { onDone: () => void }) => {
  const queryClient = useQueryClient();
  const [mac, setMac] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [label, setLabel] = useState('');
  const [problem, setProblem] = useState('');

  const catalogue = useQuery({ queryKey: ['desk-phone-catalogue'], queryFn: deskPhoneCatalogue, staleTime: 10 * 60 * 1000 });
  const vendors = catalogue.data?.vendors ?? [];
  const models = vendor ? (catalogue.data?.models as Record<string, string[]> | undefined)?.[vendor] ?? [] : [];

  useEffect(() => {
    if (!vendor && vendors.length) setVendor(vendors[0]);
  }, [vendor, vendors]);
  useEffect(() => {
    if (models.length && !models.includes(model)) setModel(models[0]);
  }, [models, model]);

  const { mutate, isPending } = useMutation({
    mutationFn: addMyDeskPhone,
    onSuccess: (device) => {
      handleAlert({ text: `${device?.label || device?.model || 'Your phone'} added. Plug it in and it will pick up its settings.`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: MY_DESK_PHONES_RULE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DESK_PHONES_QUERY_KEY });
      onDone();
    },
    onError: (error: any) => {
      const firstProblem = error?.response?.data?.data?.problems?.[0]?.message;
      setProblem(typeof firstProblem === 'string' ? firstProblem : describeError(error, 'Could not add the phone.'));
    },
  });

  const submit = () => {
    const cleanMac = mac.trim();
    if (!MAC_PATTERN.test(cleanMac)) {
      setProblem('Enter the 12-character MAC address printed on the phone, for example 00:15:65:AB:CD:EF.');
      return;
    }
    if (!vendor || !model) {
      setProblem('Choose the make and model.');
      return;
    }
    setProblem('');
    mutate({ mac_address: cleanMac, vendor, model, label: label.trim() || undefined });
  };

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-sm font-semibold text-gray-900">Add a desk phone</p>
      <p className="text-xs text-gray-500">
        It will be yours and ring with your calls. The MAC address is on the label on the back of the phone.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-gray-700">
          MAC address
          <input
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            value={mac}
            placeholder="00:15:65:AB:CD:EF"
            onChange={(event) => setMac(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-700">
          Name (optional)
          <input
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            value={label}
            placeholder="My desk"
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-700">
          Make
          <select
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            value={vendor}
            onChange={(event) => setVendor(event.target.value)}
          >
            {vendors.map((v) => (
              <option key={v} value={v}>
                {VENDOR_LABEL[v] ?? v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-700">
          Model
          <select
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>
      {problem ? (
        <p className="mt-2 text-xs font-semibold text-red-600" role="alert">
          {problem}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn" disabled={isPending || catalogue.isLoading} onClick={submit}>
          {isPending ? 'Adding…' : 'Add phone'}
        </button>
        <button type="button" className="btn ghost" disabled={isPending} onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const MyDeskPhones = ({ isAdmin }: { isAdmin: boolean }) => {
  const [details, setDetails] = useState<DeskPhone | null>(null);
  const [adding, setAdding] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: MY_DESK_PHONES_RULE_QUERY_KEY,
    queryFn: listMyDeskPhonesWithRule,
    retry: false,
    staleTime: 60 * 1000,
  });

  if (data?.kind === 'absent') return null;
  const phones = data?.kind === 'ok' ? data.value.phones : [];
  const canAdd = data?.kind === 'ok' && data.value.selfSetupAllowed;

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Your desk phones</p>
          <p className="text-xs text-gray-500">
            Handsets set up for you. They ring with your calls alongside the app.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {canAdd && !adding ? (
            <button type="button" className="btn" onClick={() => setAdding(true)}>
              Add a desk phone
            </button>
          ) : null}
          {isAdmin ? (
            <Link to="/admin-settings/desk-phones" className="btn ghost">
              Manage desk phones
            </Link>
          ) : null}
        </div>
      </div>
      <div className="px-4 py-3 text-sm">
        {isLoading ? <p className="text-gray-500">Loading…</p> : null}
        {error ? (
          <p className="text-red-700" role="alert">
            {describeError(error, 'Could not load your desk phones.')}
          </p>
        ) : null}
        {!isLoading && !error && !phones.length && !adding ? (
          <p className="text-gray-500">
            No desk phone yet.{' '}
            {canAdd
              ? 'Add one above and it will pick up its settings when it is plugged in.'
              : isAdmin
                ? 'Add one under Company › Desk phones.'
                : 'Ask an administrator to add one for you.'}
          </p>
        ) : null}
        {adding ? <AddMyPhone onDone={() => setAdding(false)} /> : null}
        {phones.length ? (
          <ul className="flex flex-col divide-y divide-gray-100">
            {phones.map((phone) => (
              <li key={phone.uuid} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <div className="font-medium text-gray-900">{phone.label || phone.model}</div>
                  <div className="text-xs text-gray-500">
                    {VENDOR_NAME[phone.vendor] ?? phone.vendor} {phone.model} · {phone.mac_display} ·{' '}
                    {STATE_LABEL[phone.state] ?? phone.state}
                  </div>
                </div>
                <button type="button" className="btn ghost" onClick={() => setDetails(phone)}>
                  Details
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <CredentialsDialog device={details} onClose={() => setDetails(null)} own />
    </section>
  );
};

export default MyDeskPhones;

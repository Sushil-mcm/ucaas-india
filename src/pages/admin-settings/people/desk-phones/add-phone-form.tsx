/* Add one desk phone.
 *
 * Two kinds, the split the reference products draw: a USER phone belongs to
 * one person and rings with their calls; a ROOM phone stands in a shared
 * space (reception, a meeting room), belongs to nobody, and registers as its
 * own extension. The kind decides which fields show. */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { setupGuideFor } from '@/lib/desk-phone-setup-guides';
import { vendorFromMac } from '@/lib/mac-vendors';
import ModelPicker from './model-picker';
import { siteList } from '@/services/api';
import {
  addDeskPhone,
  deskPhoneCatalogue,
  describeError,
  DESK_PHONES_QUERY_KEY,
  problemsOf,
  type DeskPhoneKind,
  type Vendor,
} from './desk-phones-api';

const VENDOR_LABEL: Record<Vendor, string> = {
  yealink: 'Yealink',
  poly: 'Poly (VVX, Edge E, Trio, CCX)',
  'poly-obi': 'Poly OBi Edition (VVX 250/350/450 OBi)',
  cisco: 'Cisco (SPA and MPP)',
  grandstream: 'Grandstream',
};

/* Fallback when the catalogue call has not answered, or has failed. It is the
   same list the API serves (VENDOR_MODELS), so a phone can still be added when
   the call does not come back - an admin holding an SPA942 should not be told
   it does not exist because one request failed. Keep the two in step. */
const DEFAULT_MODELS: Record<Vendor, string[]> = {
  yealink: [
    'T31P', 'T31G', 'T33G', 'T34W', 'T42U', 'T43U', 'T44U', 'T44W', 'T46U', 'T48U',
    'T53', 'T53W', 'T54W', 'T57W', 'T58W', 'T73U', 'T73W', 'T74U', 'T74W', 'T77U',
    'T87W', 'T88W', 'CP925', 'CP965', 'W70B', 'W80B', 'W90B',
  ],
  poly: [
    'VVX150', 'VVX250', 'VVX350', 'VVX450', 'VVX501', 'VVX601',
    'EDGEE100', 'EDGEE220', 'EDGEE300', 'EDGEE320', 'EDGEE350', 'EDGEE400',
    'EDGEE450', 'EDGEE500', 'EDGEE550', 'TRIO8300', 'TRIO8500', 'TRIO8800', 'TRIOC60',
    'CCX400', 'CCX500', 'CCX600',
  ],
  'poly-obi': ['VVX250', 'VVX350', 'VVX450', 'OBI2182', 'OBI1062', 'OBI1032', 'OBI1022', 'OBI300', 'OBI302'],
  cisco: [
    'SPA901', 'SPA921', 'SPA922', 'SPA941', 'SPA942', 'SPA962',
    'SPA301', 'SPA303', 'SPA501G', 'SPA502G', 'SPA504G', 'SPA508G', 'SPA509G', 'SPA512G', 'SPA514G',
    'SPA525G', 'SPA525G2', 'SPA112', 'SPA122',
    'CP6821', 'CP6841', 'CP6851', 'CP6861', 'CP7811', 'CP7821', 'CP7841', 'CP7861',
    'CP8811', 'CP8841', 'CP8845', 'CP8851', 'CP8861', 'CP8865',
  ],
  grandstream: [
    'GRP2601', 'GRP2602', 'GRP2603', 'GRP2604', 'GRP2612', 'GRP2613', 'GRP2614', 'GRP2615', 'GRP2616',
    'GRP2624', 'GRP2634', 'GRP2636', 'GRP2650', 'GRP2670',
    'GXP1610', 'GXP1615', 'GXP1620', 'GXP1625', 'GXP1628', 'GXP1630',
    'GXP2130', 'GXP2135', 'GXP2140', 'GXP2160', 'GXP2170',
  ],
};


const MODEL_PLACEHOLDER: Record<Vendor, string> = { yealink: 'T46U', poly: 'VVX450', 'poly-obi': 'VVX450', cisco: 'SPA504G or CP7841', grandstream: 'GRP2613' };

export const personLabel = (u: any) =>
  `${[u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() || u?.email || 'Person'}${
    u?.extension ? ` · ext ${u.extension}` : ''
  }`;

/* The company's locations, for the room phone's "where it stands". */
export const useSiteOptions = () => {
  const { data } = useQuery({
    queryKey: ['siteList'],
    queryFn: () => siteList({ page: 1, limit: 1000 }),
    select: (response: any) => (response?.data?.data?.result?.rows || []) as any[],
    staleTime: 5 * 60 * 1000,
  });
  return useMemo(
    () =>
      (data || [])
        .filter((s: any) => s?.uuid)
        .map((s: any) => ({ uuid: String(s.uuid), name: String(s.name || s.site_name || 'Location') }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
    [data],
  );
};

const selectClass = 'min-h-10 rounded-lg border border-gray-200 px-3';

/* A MAC address is exactly twelve hex characters and nothing else, so the
   field is shaped to hold one rather than left open and refused afterwards:
   anything that is not a hex digit is dropped, the twelfth is the last one it
   takes, and the colons are put in as it is typed. The pairs are joined
   WITHOUT a trailing colon, so a backspace deletes a character rather than a
   separator the field would immediately put back. Paste is covered too - a
   MAC copied with dashes, dots, spaces or none of them comes out the same
   way, which is how the server reads it (normaliseMac). */
const MAC_DIGITS = 12;
const macDigits = (text: string) => {
  /* "0x805EC0A1B2C3" is a whole MAC with a prefix, which the server strips
     (normaliseMac). Dropping only the "x" would leave a leading 0 and shift
     every pair along - a different address that still looks valid, which is
     worse than being refused. The prefix is only removed when exactly twelve
     hex characters follow it, so typing an x after a 0 does not wipe the 0. */
  const text_ = text.trim();
  const body = /^0[xX][0-9A-Fa-f]{12}$/.test(text_) ? text_.slice(2) : text_;
  return body.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, MAC_DIGITS);
};
const formatMac = (text: string) => (macDigits(text).match(/.{1,2}/g) ?? []).join(':');

const AddPhoneForm = ({ onDone, initialKind = 'user' }: { onDone: () => void; initialKind?: DeskPhoneKind }) => {
  const queryClient = useQueryClient();
  const { users } = useUsersDirectory();
  const sites = useSiteOptions();
  const { data: catalogue } = useQuery({
    queryKey: ['admin', 'desk-phones', 'catalogue'],
    queryFn: deskPhoneCatalogue,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const [kind, setKind] = useState<DeskPhoneKind>(initialKind);
  const [vendor, setVendor] = useState<Vendor>('yealink');
  const [model, setModel] = useState('');
  const [mac, setMac] = useState('');
  const [serial, setSerial] = useState('');
  const [owner, setOwner] = useState('');
  const [label, setLabel] = useState('');
  const [roomExtension, setRoomExtension] = useState('');
  const [siteUuid, setSiteUuid] = useState('');
  const [vendorFromLabel, setVendorFromLabel] = useState(false);
  const [vendorByHand, setVendorByHand] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const models = useMemo(() => catalogue?.models?.[vendor] ?? DEFAULT_MODELS[vendor], [catalogue, vendor]);
  useEffect(() => {
    setModel('');
  }, [vendor]);

  /* Who made this phone, read off the front of its MAC address (see
     mac-vendors.ts). The vendor fills itself in so the MAC can be typed
     first, which is the order somebody with the phone in their hand works in:
     the code is on the label in front of them, the brand is a question they
     should not have to answer twice. */
  const maker = useMemo(() => vendorFromMac(mac), [mac]);
  const macTyped = macDigits(mac).length;
  /* The same handsets are sold in two firmware editions that share their MAC
     prefixes, so a Poly address can never be a reason to move somebody off
     the OBi Edition they deliberately picked. */
  const macAgrees = !maker || maker.kind !== 'supported' || maker.vendor === vendor
    || (maker.vendor === 'poly' && vendor === 'poly-obi');

  useEffect(() => {
    if (macAgrees || maker?.kind !== 'supported') return;
    /* Two things the address must never overrule: a vendor the person chose
       themselves, and a model they have already picked. Some phones are sold
       re-badged, and the OBi Edition is a deliberate choice a Poly address
       cannot see; a form that argued back would be unusable. In both cases
       the mismatch is offered below instead, and they decide. */
    if (vendorByHand || model) return;
    setVendor(maker.vendor);
    setVendorFromLabel(true);
  }, [maker, macAgrees, model, vendorByHand]);

  /* Whether the chosen model can fetch its own settings. Said here, at the
     moment of choosing, rather than discovered later on the Credentials
     screen: a handset that has to be typed in by hand is a different job to
     plan for, and the Linksys-era Cisco phones are still sold second hand. */
  const setup = useMemo(() => (model.trim() ? setupGuideFor(vendor, model) : null), [vendor, model]);

  const people = useMemo(
    () =>
      [...(users || [])]
        .filter((u: any) => u?.uuid && u?.extension)
        .sort((a: any, b: any) => personLabel(a).localeCompare(personLabel(b))),
    [users],
  );

  const { mutate, isPending } = useMutation({
    mutationFn: addDeskPhone,
    onSuccess: (device) => {
      handleAlert({ text: `${device?.mac_display || 'Phone'} added.`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: DESK_PHONES_QUERY_KEY });
      onDone();
    },
    onError: (error: any) => {
      const problems = problemsOf(error);
      if (problems.length) {
        setFieldErrors(Object.fromEntries(problems.map((p) => [p.field, p.message])));
        setFormError('');
      } else {
        setFieldErrors({});
        setFormError(describeError(error, 'Could not add this phone.'));
      }
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');
    if (kind === 'user' && !owner) {
      setFieldErrors({ owner: 'Choose who this phone belongs to, or make it a room phone.' });
      return;
    }
    const ownerUser = people.find((u: any) => u.uuid === owner);
    mutate({
      mac_address: mac,
      vendor,
      model: model.trim(),
      serial_number: serial.trim() || undefined,
      owner: kind === 'user' && ownerUser?.extension ? String(ownerUser.extension) : undefined,
      label: label.trim() || undefined,
      room_extension: kind === 'room' ? roomExtension.trim() || undefined : undefined,
      site_uuid: kind === 'room' ? siteUuid || undefined : undefined,
    });
  };

  /* The drawer this sits in hides its own overflow above `md`, so a form
     taller than the window used to be cut off with no way to reach the rest -
     on a short screen the Add button itself was below the fold. The form
     therefore takes the height it is given and scrolls its own middle, which
     also keeps the buttons in view while a long form is filled in. */
  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">What kind of phone</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Kind of phone">
          <button
            type="button"
            role="radio"
            aria-checked={kind === 'user'}
            className={`rounded-lg border px-3 py-2 text-left ${kind === 'user' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
            onClick={() => setKind('user')}
          >
            <div className="font-medium">User phone</div>
            <div className="text-xs text-gray-500">On one person's desk. Rings with their calls.</div>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={kind === 'room'}
            className={`rounded-lg border px-3 py-2 text-left ${kind === 'room' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
            onClick={() => setKind('room')}
          >
            <div className="font-medium">Room phone</div>
            <div className="text-xs text-gray-500">Reception, a meeting room. Has its own extension.</div>
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        The MAC address is the 12-character code on the label under the phone. Each phone gets its
        own password, separate from anyone's login.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Vendor</span>
          <select
            className={selectClass}
            value={vendor}
            onChange={(e) => {
              setVendor(e.target.value as Vendor);
              setVendorByHand(true);
              setVendorFromLabel(false);
            }}
          >
            {(catalogue?.vendors ?? (['yealink', 'poly', 'poly-obi', 'cisco', 'grandstream'] as Vendor[])).map((v) => (
              <option key={v} value={v}>
                {VENDOR_LABEL[v as Vendor] ?? v}
              </option>
            ))}
          </select>
        </label>

        {/* Searchable, not a plain list: a vendor has thirty-odd models that
            differ by one character, and somebody holding the phone wants to
            type the code off its label rather than scroll for it. The picker
            keeps the product-line grouping and takes a model the catalogue has
            not caught up with. */}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Model</span>
          <ModelPicker
            vendor={vendor}
            models={models}
            value={model}
            onChange={setModel}
            placeholder={MODEL_PLACEHOLDER[vendor] ?? 'T46U'}
            invalid={Boolean(fieldErrors.model)}
          />
          {fieldErrors.model ? (
            <span className="text-xs text-red-600">{fieldErrors.model}</span>
          ) : setup ? (
            <span className="text-xs text-gray-500">
              {setup.auto
                ? 'This model can fetch its own settings once it is added.'
                : 'This model has to be set up by hand from its Credentials screen.'}
            </span>
          ) : (
            <span className="text-xs text-gray-500">
              The model is printed on the phone and on the label under it.
            </span>
          )}
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <Input
          label="MAC address"
          placeholder="80:5E:C0:A1:B2:C3"
          value={mac}
          onChange={(e) => {
            setMac(formatMac(e.target.value));
            setVendorFromLabel(false);
          }}
          maxLength={MAC_DIGITS + MAC_DIGITS / 2 - 1}
          inputMode="text"
          error={fieldErrors.mac_address}
          autoComplete="off"
          spellCheck={false}
          required
        />
        {macTyped && macTyped < MAC_DIGITS ? (
          <span className="text-xs text-gray-500">
            {macTyped} of {MAC_DIGITS} characters.
          </span>
        ) : null}
        {maker?.kind === 'other' ? (
          <span className="text-xs text-amber-700">
            This address belongs to {maker.name}, which is not one of the vendors here. The phone
            can be added, but it will not be able to fetch its settings from us.
          </span>
        ) : !macAgrees && maker?.kind === 'supported' ? (
          <span className="text-xs text-amber-700">
            This address belongs to {maker.name}, not {VENDOR_LABEL[vendor]}.{' '}
            <button
              type="button"
              className="underline"
              onClick={() => {
                setVendor(maker.vendor);
                setVendorByHand(true);
                setVendorFromLabel(true);
              }}
            >
              Use {maker.name}
            </button>
            , which clears the model.
          </span>
        ) : vendorFromLabel && maker?.kind === 'supported' ? (
          <span className="text-xs text-gray-500">Vendor read from this address: {maker.name}.</span>
        ) : null}
      </div>

      <Input
        label={vendor === 'grandstream' ? 'Serial number' : 'Serial number (optional)'}
        placeholder={vendor === 'grandstream' ? 'Required for Grandstream: on the label next to the MAC' : 'Printed next to the MAC on the label'}
        value={serial}
        onChange={(e) => setSerial(e.target.value)}
        error={fieldErrors.serial_number}
        autoComplete="off"
        required={vendor === 'grandstream'}
      />

      {kind === 'user' ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Belongs to</span>
          <select className={selectClass} value={owner} onChange={(e) => setOwner(e.target.value)} required>
            <option value="">Choose a person…</option>
            {people.map((u: any) => (
              <option key={u.uuid} value={u.uuid}>
                {personLabel(u)}
              </option>
            ))}
          </select>
          {fieldErrors.owner ? <span className="text-xs text-red-600">{fieldErrors.owner}</span> : null}
          <span className="text-xs text-gray-500">
            The phone registers as that person's extension and rings with their calls.
          </span>
        </label>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Room extension"
            placeholder="2001"
            value={roomExtension}
            onChange={(e) => setRoomExtension(e.target.value.replace(/\D/g, '').slice(0, 6))}
            error={fieldErrors.room_extension}
            inputMode="numeric"
            autoComplete="off"
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Location</span>
            <select className={selectClass} value={siteUuid} onChange={(e) => setSiteUuid(e.target.value)}>
              <option value="">Not set</option>
              {sites.map((s: any) => (
                <option key={s.uuid} value={s.uuid}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <span className="text-xs text-gray-500 sm:col-span-2">
            3 to 6 digits, not used by any person. Leave it blank to give the phone an extension
            later.
          </span>
        </div>
      )}

      <Input
        label={kind === 'room' ? 'Name' : 'Label (optional)'}
        placeholder={kind === 'room' ? 'Reception, Meeting room 2' : 'Alice desk'}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        required={kind === 'room'}
      />

      {formError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {formError}
        </div>
      ) : null}

      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 px-4 py-3">
        <button type="button" className="btn" onClick={onDone} disabled={isPending}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={isPending}>
          {isPending ? 'Adding…' : kind === 'room' ? 'Add room phone' : 'Add user phone'}
        </button>
      </div>
    </form>
  );
};

export default AddPhoneForm;

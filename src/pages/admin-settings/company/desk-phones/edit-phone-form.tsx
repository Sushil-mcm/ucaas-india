/* Change what can change about a phone after it is added: its name, who it
   belongs to (or, for a room phone, its extension and location). The MAC and
   vendor are the handset itself and are not editable; remove and re-add. */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { personLabel, useSiteOptions } from './add-phone-form';
import {
  describeError,
  DESK_PHONES_QUERY_KEY,
  updateDeskPhone,
  type DeskPhone,
  type DeskPhoneKind,
} from './desk-phones-api';

const VENDOR_NAME: Record<string, string> = { yealink: 'Yealink', poly: 'Poly', 'poly-obi': 'Poly OBi', cisco: 'Cisco', grandstream: 'Grandstream' };

const selectClass = 'min-h-10 rounded-lg border border-gray-200 px-3';

const EditPhoneForm = ({ phone, onDone }: { phone: DeskPhone; onDone: () => void }) => {
  const queryClient = useQueryClient();
  const { users } = useUsersDirectory();
  const sites = useSiteOptions();

  const [kind, setKind] = useState<DeskPhoneKind>(phone.kind);
  const [label, setLabel] = useState(phone.label ?? '');
  const [owner, setOwner] = useState(phone.owner?.uuid ?? '');
  const [roomExtension, setRoomExtension] = useState(phone.kind === 'room' ? phone.extension ?? phone.sip_username ?? '' : '');
  const [siteUuid, setSiteUuid] = useState(phone.site_uuid ?? '');
  const [serial, setSerial] = useState(phone.serial_number ?? '');
  const [formError, setFormError] = useState('');

  const people = useMemo(
    () =>
      [...(users || [])]
        .filter((u: any) => u?.uuid && u?.extension)
        .sort((a: any, b: any) => personLabel(a).localeCompare(personLabel(b))),
    [users],
  );

  const { mutate, isPending } = useMutation({
    mutationFn: updateDeskPhone,
    onSuccess: () => {
      handleAlert({ text: 'Desk phone updated.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: DESK_PHONES_QUERY_KEY });
      onDone();
    },
    onError: (error: any) => setFormError(describeError(error, 'Could not save these changes.')),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (kind === 'user' && !owner) {
      setFormError('Choose who this phone belongs to, or make it a room phone.');
      return;
    }
    const ownerUser = people.find((u: any) => u.uuid === owner);
    /* Owner first, then the room extension: the server refuses a room
       extension on a phone that still has an owner, so the order in one
       request matters and the service applies owner before extension. */
    mutate({
      uuid: phone.uuid,
      label: label.trim(),
      serial_number: serial.trim(),
      owner: kind === 'user' ? String(ownerUser?.extension ?? '') : '',
      room_extension: kind === 'room' ? roomExtension.trim() : '',
      site_uuid: kind === 'room' ? siteUuid : (ownerUser?.site_uuid ?? phone.site_uuid ?? ''),
    });
  };

  /* Takes the height the drawer gives it and scrolls its own middle: the
     drawer hides overflow above `md`, so a form longer than the window was
     cut off with Save out of reach. Same shape as the add form. */
  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
        <div className="font-medium">
          {VENDOR_NAME[phone.vendor] ?? phone.vendor} {phone.model}
        </div>
        <div className="font-mono text-xs text-gray-600">{phone.mac_display}</div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">What kind of phone</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Kind of phone">
          <button
            type="button"
            role="radio"
            aria-checked={kind === 'user'}
            className={`rounded-lg border px-3 py-2 text-left ${kind === 'user' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
            onClick={() => setKind('user')}
          >
            <div className="font-medium">User phone</div>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={kind === 'room'}
            className={`rounded-lg border px-3 py-2 text-left ${kind === 'room' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
            onClick={() => setKind('room')}
          >
            <div className="font-medium">Room phone</div>
          </button>
        </div>
      </div>

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
        </label>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Room extension"
            placeholder="2001"
            value={roomExtension}
            onChange={(e) => setRoomExtension(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
        </div>
      )}

      <Input
        label={kind === 'room' ? 'Name' : 'Label'}
        placeholder={kind === 'room' ? 'Reception' : 'Alice desk'}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        required={kind === 'room'}
      />

      <Input
        label="Serial number (optional)"
        value={serial}
        onChange={(e) => setSerial(e.target.value)}
        autoComplete="off"
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
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

export default EditPhoneForm;

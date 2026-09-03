import { FC, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import { sipTrunkUpsert } from '@/services/api';

/**
 * The carrier's SIP details.
 *
 * Deliberately short. A carrier hands over a host, a username and a password,
 * and sometimes a port and an outbound proxy; everything else a switch needs is
 * either derivable or a decision this product should be making itself rather
 * than asking an admin to guess at.
 *
 * The password is write-only. An existing trunk comes back from the API without
 * it, so the field starts blank and an empty box on save means "leave the stored
 * password alone" rather than "set the password to nothing" — the second reading
 * would silently break a working trunk the first time somebody edited its name.
 */

interface TrunkFormProps {
  trunk?: any;
  open: boolean;
  onClose: () => void;
}

const TrunkForm: FC<TrunkFormProps> = ({ trunk, open, onClose }) => {
  const queryClient = useQueryClient();
  const isEdit = Boolean(trunk?.uuid);

  const [form, setForm] = useState({
    name: trunk?.name || '',
    host: trunk?.host || '',
    port: trunk?.port ? String(trunk.port) : '5060',
    username: trunk?.username || '',
    password: '',
    proxy: trunk?.proxy || '',
    register: trunk?.register !== false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  const { mutate, isPending } = useMutation({
    mutationFn: sipTrunkUpsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-trunk-list'] });
      handleAlert({ text: isEdit ? 'Trunk saved.' : 'Trunk added.', type: 'success' });
      onClose();
    },
  });

  const submit = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Give the trunk a name you will recognise';
    if (!form.host.trim()) next.host = 'The carrier gave you a host or IP address';
    if (form.port && !/^\d{1,5}$/.test(form.port.trim())) next.port = 'Port must be a number';
    if (form.register && !form.username.trim())
      next.username = 'A registering trunk needs the username your carrier issued';
    if (form.register && !isEdit && !form.password)
      next.password = 'A registering trunk needs its password';

    setErrors(next);
    if (Object.keys(next).length) return;

    mutate({
      ...(trunk?.uuid ? { uuid: trunk.uuid } : {}),
      name: form.name.trim(),
      host: form.host.trim(),
      port: Number(form.port || 5060),
      username: form.username.trim(),
      /* Omitted, not blanked, when left empty on an edit. */
      ...(form.password ? { password: form.password } : {}),
      proxy: form.proxy.trim(),
      register: form.register,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-w-lg p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{isEdit ? 'Edit trunk' : 'Add a SIP trunk'}</h2>
            <p className="text-sm text-gray-600">
              These are the details your Indian carrier issued for this account. They must match
              exactly, including the port.
            </p>
          </div>

          <Input
            label="Name"
            placeholder="Airtel primary"
            value={form.name}
            onChange={(e: any) => set({ name: e.target.value })}
            error={errors.name}
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Host"
                placeholder="sip.carrier.in"
                value={form.host}
                onChange={(e: any) => set({ host: e.target.value })}
                error={errors.host}
              />
            </div>
            <div className="w-28">
              <Input
                label="Port"
                placeholder="5060"
                value={form.port}
                onChange={(e: any) => set({ port: e.target.value })}
                error={errors.port}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.register}
              onChange={(e) => set({ register: e.target.checked })}
            />
            Register with the carrier
            <span className="text-xs text-gray-500">
              (turn off for an IP-authenticated trunk)
            </span>
          </label>

          <Input
            label="Username"
            placeholder="Issued by your carrier"
            value={form.username}
            onChange={(e: any) => set({ username: e.target.value })}
            error={errors.username}
          />

          <Input
            label={isEdit ? 'Password (leave blank to keep the current one)' : 'Password'}
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e: any) => set({ password: e.target.value })}
            error={errors.password}
          />

          <Input
            label="Outbound proxy (optional)"
            placeholder="Only if your carrier gave you one"
            value={form.proxy}
            onChange={(e: any) => set({ proxy: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save trunk' : 'Add trunk'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrunkForm;

/* Company › Desk phone settings
 * -----------------------------------------------------------------------------
 * The company-wide side of desk phones: the settings that apply to every
 * handset, kept apart from the list of handsets itself (Company › Desk phones).
 * The reference products keep exactly this split: one company-level page with
 * the handset admin password and the "may people set up their own phone"
 * switch, and a separate list of the phones.
 *
 * Stored like the rest of the company level: in the reserved "Company Default"
 * record, namespaced under `settings.desk_phones`, the rest of the blob merged
 * back untouched on save.
 *
 * WHO READS `settings.desk_phones.*` (checked on the live API, 9 Sep 2026):
 *
 *   admin_password    default-api services/ProvisioningService.js
 *                     (adminPasswordFor) reads it on every provisioning fetch
 *                     and lib/provisioningTemplates.js prints it into the
 *                     Yealink, Poly, Cisco and Grandstream files. Proven by
 *                     running the live templates with a password set.
 *   allow_self_setup  default-api controllers/SipDeviceController.js:
 *                     `mine` reports it and `mineAdd` (POST /api/desk-phones/
 *                     mine/add) refuses with 403 while it is off. My Phone
 *                     offers "Add a desk phone" only when the server says yes.
 *
 * Keep each card's status and note in step with what the server does.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { SectionHeading } from './section-heading';
import { SectionActions } from './section-actions';
import { handleAlert } from '@/lib/utils';
import { parseMaybeJson } from '@/lib/company-settings-api';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  saveCompanyDefaults,
} from '@/lib/company-defaults';

const DESK_PHONES_KEY = 'desk_phones';
const SCHEMA_VERSION = 1;

interface DeskPhoneSettings {
  admin_password: string;
  allow_self_setup: boolean;
}

const DEFAULTS: DeskPhoneSettings = { admin_password: '', allow_self_setup: false };

/* Eight digits: every handset keypad can type it, and it is long enough that
   nobody guesses it from the model's factory default. Generated once, then
   kept; the reference products do not let it be changed by hand either. */
const newAdminPassword = (): string => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => String(b % 10)).join('');
};

const toObject = (raw: unknown): Record<string, any> => {
  const value = parseMaybeJson(raw);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

const CompanyDeskPhones = () => {
  const queryClient = useQueryClient();
  const { data: companyDefaultTemplate, isLoading, isError } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
  });

  const savedSettings = useMemo(() => toObject(companyDefaultTemplate?.settings), [companyDefaultTemplate]);
  const saved: DeskPhoneSettings = useMemo(() => {
    const raw = toObject(savedSettings[DESK_PHONES_KEY]);
    return {
      admin_password: typeof raw.admin_password === 'string' ? raw.admin_password : '',
      allow_self_setup: Boolean(raw.allow_self_setup),
    };
  }, [savedSettings]);

  const [form, setForm] = useState<DeskPhoneSettings>(DEFAULTS);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setForm(saved);
  }, [saved]);

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: saveCompanyDefaults,
    onSuccess: (response: any) => {
      handleAlert({ text: response?.data?.message || 'Desk phone settings saved', type: 'success' });
      queryClient.invalidateQueries({ queryKey: COMPANY_DEFAULTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['userTemplateList'] });
    },
  });

  const dirty = form.admin_password !== saved.admin_password || form.allow_self_setup !== saved.allow_self_setup;

  const handleSave = () => {
    save({
      uuid: companyDefaultTemplate?.uuid,
      settings: { ...savedSettings, [DESK_PHONES_KEY]: { ...form, version: SCHEMA_VERSION } },
      greetings: toObject(companyDefaultTemplate?.greetings),
      only: [DESK_PHONES_KEY],
    });
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(form.admin_password);
      handleAlert({ text: 'Handset admin password copied.', type: 'success' });
    } catch {
      handleAlert({ text: 'Could not copy. Show it and copy by hand.', type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="w-full">
        <SectionHeading
          icon={<Phone className="h-[18px] w-[18px]" />}
          title="Desk phone settings"
          description="Rules for every handset in the company. The phones themselves are listed under Desk phones."
          actions={
            <Link to="/admin-settings/desk-phones" className="btn">
              Open the phone list
            </Link>
          }
        />
      </div>

      {isError ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center">
          <p className="text-sm font-semibold text-gray-900">We could not load the saved desk phone settings</p>
          <p className="text-xs text-gray-500">Reload before you save, or you may overwrite settings you cannot see.</p>
        </div>
      ) : null}

      <SettingCard
        title="Handset admin password"
        description="The password for the admin login on every phone's own web page and menu. One for the whole company, applied to each handset when it is set up."
        status="active"
        note="Active. Every phone that fetches its settings from us is given this password for its admin login, at its next check-in (within an hour) or when it is set up. Remove it and each phone goes back to its factory admin password at the next check-in."
      >
        <SettingRow label="Password" description="Eight digits so it can be typed on a handset keypad.">
          {form.admin_password ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm">
                {shown ? form.admin_password : '••••••••'}
              </code>
              <button type="button" className="btn ghost" onClick={() => setShown((s) => !s)}>
                {shown ? 'Hide' : 'Show'}
              </button>
              <button type="button" className="btn ghost" onClick={copyPassword}>
                Copy
              </button>
              {/* Without this, a generated password could never be taken back: the
                  only control was Generate, and it disappeared once a password
                  existed. Clearing it and saving returns every handset to its
                  factory admin password at its next provisioning fetch. */}
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setShown(false);
                  setForm((f) => ({ ...f, admin_password: '' }));
                }}
              >
                Remove password
              </button>
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setForm((f) => ({ ...f, admin_password: newAdminPassword() }))}>
              Generate a password
            </button>
          )}
        </SettingRow>
      </SettingCard>

      <SettingCard
        title="Self setup"
        description="Whether people may add a desk phone for themselves from My Phone, instead of waiting for an administrator."
        status="active"
        note="Active. When this is on, My Phone shows an Add a desk phone button and the server accepts a phone the person adds for themselves; the phone is always theirs and never a shared room phone. When it is off, the server refuses the add and only an administrator can add phones."
      >
        <SettingRow
          label="People may set up their own desk phone"
          control={
            <Switch
              checked={form.allow_self_setup}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, allow_self_setup: Boolean(checked) }))}
              aria-label="People may set up their own desk phone"
            />
          }
        />
      </SettingCard>

      <SectionActions>
        <Button variant="primary" type="button" disabled={isSaving || !dirty} onClick={handleSave}>
          {isSaving ? 'Saving…' : 'Save desk phone settings'}
        </Button>
      </SectionActions>
    </div>
  );
};

export default CompanyDeskPhones;

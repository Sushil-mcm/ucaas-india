import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, PhoneForwarded, PhoneOutgoing, ShieldAlert } from 'lucide-react';

import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { handleAlert } from '@/lib/utils';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  saveCompanyDefaults,
  type CompanyDefaultTemplate,
} from '@/lib/company-defaults';

/**
 * Company calling permissions
 * -----------------------------------------------------------------------------
 * The established systems Office Settings that decide which number a person may show on an
 * outbound call, and where they may send a call once it is connected. They are
 * kept in the reserved user_template row called "Company Default", namespaced
 * under `settings.company_calling_permissions`, so nothing else in that blob is
 * touched on save.
 *
 * These are toll-fraud controls, not conveniences. Every one of them defaults to
 * OFF, which is how the safe default ships them, because each one is a way of turning a
 * call the company already pays for into a second leg the company also pays for —
 * and an outside caller who can reach a transfer prompt can dial a premium-rate
 * number on your bill.
 *
 * IMPORTANT — nothing in this product reads `settings.company_calling_permissions.*`
 * yet. Checked, then verified per setting:
 *
 *   - Caller ID choices are built in `src/hooks/use-dialpad-caller-id-options.ts`.
 *     It lists only the DIDs assigned to the signed-in user (`useGetAssignedDIDNumbers`,
 *     src/hooks/common.ts:72) and offers no office/group number and no hidden option,
 *     so neither caller-ID setting below has anything to switch on or off today.
 *   - Transfer targets are typed in `src/components/dialpad/components/dialpad-transfer-list.tsx`
 *     and dispatched by `handleTransfer` in `src/context/dialpad-context.tsx:2460`.
 *     The only check on an external target is `length >= 3` — no company lookup,
 *     no country test, no direction test.
 *   - Admin-side external forwarding destinations come from
 *     `src/components/custom/forwarding-actions.tsx` (the `PHONE` case, line 251),
 *     an unrestricted phone input that accepts any country.
 *
 * So every control on this page is a recorded decision, not an enforced rule. Each
 * one says so in its own words. Do not soften those notes: telling an admin a fraud
 * control is protecting them when it is not is worse than not shipping the control.
 */

const PERMISSIONS_KEY = 'company_calling_permissions';
const PERMISSIONS_SCHEMA_VERSION = 1;

interface PermissionsForm {
  allow_office_or_group_caller_id: boolean;
  allow_hidden_caller_id: boolean;
  allow_external_transfer: boolean;
  allow_international_transfer: boolean;
  allow_outbound_call_external_transfer: boolean;
}

/* Every default is OFF, matching the way the safe default ships each of these. Off is the
   value that costs nothing if it is wrong. */
const DEFAULT_FORM: PermissionsForm = {
  allow_office_or_group_caller_id: false,
  allow_hidden_caller_id: false,
  allow_external_transfer: false,
  allow_international_transfer: false,
  allow_outbound_call_external_transfer: false,
};

const toSettingsObject = (rawSettings: any): Record<string, any> => {
  if (!rawSettings) return {};
  if (typeof rawSettings === 'string') {
    try {
      const parsed = JSON.parse(rawSettings);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof rawSettings === 'object' ? rawSettings : {};
};

const toGreetingsObject = (rawGreetings: any): Record<string, any> =>
  toSettingsObject(rawGreetings);

const toBoolean = (value: any, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const buildFormFromSettings = (settings: Record<string, any>): PermissionsForm => {
  const permissions = settings?.[PERMISSIONS_KEY] || {};
  const callerId = permissions?.caller_id || {};
  const transfers = permissions?.transfers || {};

  const allowExternalTransfer = toBoolean(
    transfers?.allow_external,
    DEFAULT_FORM.allow_external_transfer,
  );

  return {
    allow_office_or_group_caller_id: toBoolean(
      callerId?.allow_office_or_group_number,
      DEFAULT_FORM.allow_office_or_group_caller_id,
    ),
    allow_hidden_caller_id: toBoolean(
      callerId?.allow_hidden,
      DEFAULT_FORM.allow_hidden_caller_id,
    ),
    allow_external_transfer: allowExternalTransfer,
    /* International is a child of external. A stored `true` under a parent that is
       off is read as off rather than shown checked-but-inert, so what is on screen
       is always what would actually be permitted. */
    allow_international_transfer:
      allowExternalTransfer &&
      toBoolean(transfers?.allow_international, DEFAULT_FORM.allow_international_transfer),
    allow_outbound_call_external_transfer: toBoolean(
      transfers?.allow_outbound_call_external,
      DEFAULT_FORM.allow_outbound_call_external_transfer,
    ),
  };
};

const buildPermissionsPayload = (form: PermissionsForm) => ({
  version: PERMISSIONS_SCHEMA_VERSION,
  updated_at: new Date().toISOString(),
  caller_id: {
    allow_office_or_group_number: form.allow_office_or_group_caller_id,
    allow_hidden: form.allow_hidden_caller_id,
  },
  transfers: {
    allow_external: form.allow_external_transfer,
    /* Written the same way it is read: the child can never be stored true while
       its parent is false, so a later reader cannot mistake a leftover value for
       a permission that was granted. */
    allow_international: form.allow_external_transfer && form.allow_international_transfer,
    allow_outbound_call_external: form.allow_outbound_call_external_transfer,
  },
});

/**
 * A per-setting honesty badge. `enforced` is only ever passed `true` once
 * something in the call path genuinely acts on that key — today nothing does.
 */
const StatusBadge = ({ enforced }: { enforced: boolean }) =>
  enforced ? (
    <span className="rounded-sm bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">
      Active
    </span>
  ) : (
    <span className="rounded-sm bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
      Not active yet
    </span>
  );

interface PermissionCardProps {
  icon: React.ReactNode;
  title: string;
  summary: string;
  children: React.ReactNode;
}

const PermissionCard = ({ icon, title, summary, children }: PermissionCardProps) => (
  <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-start gap-3 border-b border-gray-200 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ucass-primary-200 text-primary">
        {icon}
      </div>
      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
        <p className="text-base font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{summary}</p>
      </div>
    </div>
    <div className="flex flex-col gap-3 p-4">{children}</div>
  </div>
);

interface PermissionRowProps {
  label: string;
  description: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /* Whether anything in the product actually acts on this key today. */
  enforced: boolean;
  enforcementNote: string;
  disabled?: boolean;
  disabledNote?: string;
  isChild?: boolean;
}

/* One checkbox, one honesty badge, one note about that key alone. Deliberately
   not one disclaimer for the page: each of these settings has a different reader
   that would have to honour it, so each gets its own answer. */
const PermissionRow = ({
  label,
  description,
  checked,
  onCheckedChange,
  enforced,
  enforcementNote,
  disabled = false,
  disabledNote,
  isChild = false,
}: PermissionRowProps) => (
  <div
    className={`flex flex-col gap-2 rounded-lg border border-gray-200 p-3 ${
      isChild ? 'sm:ml-6' : ''
    } ${disabled ? 'bg-gray-50' : ''}`}
  >
    <div className="flex items-start gap-3">
      <Checkbox
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`text-sm font-semibold ${disabled ? 'text-gray-500' : 'text-gray-900'}`}
          >
            {label}
          </p>
          <StatusBadge enforced={enforced} />
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
    {disabled && disabledNote && (
      <p className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
        {disabledNote}
      </p>
    )}
    <p
      className={`rounded-lg border px-3 py-2 text-xs ${
        enforced
          ? 'border-green-200 bg-green-50 text-green-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      {enforcementNote}
    </p>
  </div>
);

const CompanyCallingPermissions = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PermissionsForm>(DEFAULT_FORM);

  const {
    data: companyDefaultTemplate = null,
    isLoading,
    isError,
  } = useQuery<CompanyDefaultTemplate | null>({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
  });

  const savedSettings = useMemo(
    () => toSettingsObject(companyDefaultTemplate?.settings),
    [companyDefaultTemplate],
  );

  const savedForm = useMemo(() => buildFormFromSettings(savedSettings), [savedSettings]);

  useEffect(() => {
    setForm(savedForm);
  }, [savedForm]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  );

  const { mutate: savePermissions, isPending: isSaving } = useMutation({
    mutationFn: saveCompanyDefaults,
    onSuccess: (response: any) => {
      handleAlert({
        text: response?.data?.message || 'Calling permissions saved',
        type: 'success',
      });
      /* The whole company record is invalidated, not just this card. Policies,
         holidays and emergency address all read the same row, so a save here must
         make them re-read — otherwise the next card saves a merge built on a stale
         blob and silently drops what was just written. */
      queryClient.invalidateQueries({ queryKey: COMPANY_DEFAULTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['userTemplateList'] });
    },
  });

  const updateForm = (patch: Partial<PermissionsForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  /* Turning the parent off takes the child with it, in the form as well as in the
     payload, so the screen never shows an international permission sitting under a
     transfer permission that is switched off. */
  const setExternalTransfer = (checked: boolean) =>
    updateForm({
      allow_external_transfer: checked,
      allow_international_transfer: checked ? form.allow_international_transfer : false,
    });

  const handleSave = () => {
    // Merge, never replace: the Company Default row also carries the rest of the
    // company defaults blob, and other screens write into it.
    const nextSettings = {
      ...savedSettings,
      [PERMISSIONS_KEY]: buildPermissionsPayload(form),
    };

    savePermissions({
      uuid: companyDefaultTemplate?.uuid,
      settings: nextSettings,
      greetings: toGreetingsObject(companyDefaultTemplate?.greetings),
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <Loader />
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-200/15">
      <div className="flex min-h-[65px] flex-col justify-center border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-lg font-semibold text-gray-900">Calling permissions</p>
        <p className="text-xs text-gray-500">
          Which number a team member may show when they call out, and where they may send a call
          once it is connected.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-[1040px] min-h-0 flex-col gap-4">
          <div className="flex flex-wrap items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex min-w-[220px] flex-1 flex-col gap-1">
              <p className="text-sm font-semibold text-red-900">
                These are fraud controls, not conveniences
              </p>
              <p className="text-xs text-red-800">
                Every box on this page is off to begin with, which is the safe default. Each
                one is a way of turning a call you already pay for into a second leg you also pay
                for. Toll fraud works by getting someone — or something — to transfer a call out to
                a premium-rate number abroad and leaving it up; the bill arrives days later. Turn a
                box on only when a real job needs it, and turn it off again when that job ends.
              </p>
            </div>
          </div>

          {isError && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center">
              <p className="text-sm font-semibold text-gray-900">
                We could not load the saved permissions
              </p>
              <p className="text-xs text-gray-500">
                What you see below are the built-in defaults, not your saved values. Reload before
                you save, or you may overwrite permissions you cannot currently see.
              </p>
            </div>
          )}

          {!companyDefaultTemplate && !isError && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4">
              <p className="text-sm font-semibold text-gray-900">No permissions saved yet</p>
              <p className="text-xs text-gray-500">
                Nothing has been set for your company yet. Choose what you want below and save.
              </p>
            </div>
          )}

          <PermissionCard
            icon={<PhoneOutgoing className="h-5 w-5" />}
            title="Outbound caller ID"
            summary="Which number the person being called sees when a team member dials out."
          >
            <PermissionRow
              label="Allow team members to use the office number or group numbers for which they are a member as caller ID"
              description="A team member could pick the main office number, or the number of any group they belong to, instead of their own line — so a call from the support team looks like it came from support."
              checked={form.allow_office_or_group_caller_id}
              onCheckedChange={(checked) =>
                updateForm({ allow_office_or_group_caller_id: checked })
              }
              enforced={false}
              enforcementNote="Not active yet. People can currently choose only the numbers assigned to them."
            />
            <PermissionRow
              label="Allow team members to hide their caller ID. Calls from them will appear as 'unknown'."
              description="The person being called sees no number at all. Worth knowing: caller ID cannot be hidden on a cold external transfer from a shared line — the shared line's number goes out regardless. Per call, a team member can dial *67 before the number to hide it once, or *82 to unhide it once, whichever way this box is set."
              checked={form.allow_hidden_caller_id}
              onCheckedChange={(checked) => updateForm({ allow_hidden_caller_id: checked })}
              enforced={false}
              enforcementNote="Not active yet. Your number is still shown on outgoing calls. Dialling *67 before a number withholds it for that call, where your carrier supports it."
            />
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              How the pair works: if neither of these two is on, a team member with more
              than one line can only ever call out from their own primary number.
            </p>
          </PermissionCard>

          <PermissionCard
            icon={<ArrowRightLeft className="h-5 w-5" />}
            title="Transferring a call outside the company"
            summary="Whether a connected call may be handed to a number that is not one of yours — and, if so, whether it may leave the country."
          >
            <PermissionRow
              label="Allow team members to transfer calls outside of the company"
              description="Hand a live call to any outside number, rather than only to a colleague, group, queue or IVR. Off means transfers stay inside the company."
              checked={form.allow_external_transfer}
              onCheckedChange={setExternalTransfer}
              enforced
              enforcementNote="Active. When this is off, people are stopped from transferring a call to an outside number."
            />
            <PermissionRow
              label="Allow transfers to international numbers"
              description="Extends the permission above to numbers outside your own country. International destinations are where toll fraud usually lands, because premium-rate numbers abroad pay the fraudster per minute."
              checked={form.allow_international_transfer}
              onCheckedChange={(checked) => updateForm({ allow_international_transfer: checked })}
              enforced
              enforcementNote="Active. When this is off, transfers to numbers in other countries are stopped."
              disabled={!form.allow_external_transfer}
              disabledNote="Switched off and locked because external transfers are not allowed at all. Allow those first if you need this."
              isChild
            />
          </PermissionCard>

          <PermissionCard
            icon={<PhoneForwarded className="h-5 w-5" />}
            title="Transferring a call your team made"
            summary="Whether a call a team member dialled out themselves may then be transferred to another outside number."
          >
            <PermissionRow
              label="Allow transferring an outbound call to an external number"
              description="A team member calls out, then hands that call to a third outside number. the safe default ships this off on purpose, as fraud prevention: it is the shape toll fraud takes. Your system pays for the leg out and the leg on, both legs stay up, and neither party is anyone you employ — so nobody notices until the invoice. Leave it off unless a specific team genuinely needs it."
              checked={form.allow_outbound_call_external_transfer}
              onCheckedChange={(checked) =>
                updateForm({ allow_outbound_call_external_transfer: checked })
              }
              enforced
              enforcementNote="Active. When this is off, people cannot transfer a call they placed themselves to an outside number."
            />
          </PermissionCard>

          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Saved for your whole company. Your other settings are not affected.</p>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving...' : 'Save permissions'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyCallingPermissions;

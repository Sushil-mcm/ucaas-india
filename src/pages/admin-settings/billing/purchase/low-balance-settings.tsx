import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { autoPurchasePlan, updateLowBalanceSettings } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useGetSavedCards } from '@/hooks/common';
import { invalidateUserDetails } from '@/hooks/use-user-details';
import { money } from './balance-bar';

/**
 * The two safety nets that keep calls connecting when credit runs low, in one
 * panel instead of two cards.
 *
 * They were separate boxes, each with a switch that DISABLED the other, so an
 * account could have a warning or an automatic top-up but never both. That is
 * backwards: the pair is a ladder. The alert fires first, higher up, so a person
 * can decide; the recharge sits underneath as the backstop for when nobody is
 * looking. Verified on the live API before removing the exclusion - the two
 * settings are written by independent endpoints, neither reads the other and
 * neither refuses, so the restriction was only ever in the browser.
 */

type Draft = {
  alertEnabled: boolean;
  alertAt: string;
  emailAlert: boolean;
  emailChoice: 'account' | 'custom';
  customEmail: string;
  rechargeEnabled: boolean;
  rechargeAt: string;
  rechargeAmount: string;
};

const num = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Why this configuration cannot be saved yet, or '' when it can.
 *
 * Both rules exist because the settings can be arranged into a shape that reads
 * fine and behaves badly, and only the person who set it up would ever find out.
 */
export const settingsProblem = (d: Draft): string => {
  if (!d.alertEnabled && !d.rechargeEnabled) return '';
  if (d.alertEnabled && d.rechargeEnabled && num(d.rechargeAt) > num(d.alertAt)) {
    return 'Recharge below the alert amount, so a warning reaches you before we charge.';
  }
  if (d.rechargeEnabled && num(d.rechargeAmount) < num(d.rechargeAt) * 2) {
    /* Top up by less than twice the trigger and the new balance lands straight
       back under it, so the next call charges the card again. A "safety net"
       that bills repeatedly is the failure people notice on their statement. */
    return `Charge at least ${money(num(d.rechargeAt) * 2)}, so one top-up doesn’t immediately trigger another.`;
  }
  if (
    d.alertEnabled &&
    d.emailAlert &&
    d.emailChoice === 'custom' &&
    !EMAIL_RE.test(d.customEmail.trim())
  ) {
    /* An alert with no usable address is a stored number, not a warning. */
    return 'Enter a valid email address for the alert.';
  }
  return '';
};

/** The whole configuration restated in one sentence. */
export const settingsSummary = (d: Draft): string => {
  if (d.alertEnabled && d.rechargeEnabled) {
    return `Alert at ${money(num(d.alertAt))}, then charge ${money(num(d.rechargeAmount))} automatically at ${money(num(d.rechargeAt))}.`;
  }
  if (d.alertEnabled) return `Alert at ${money(num(d.alertAt))} — top-ups stay manual.`;
  if (d.rechargeEnabled) {
    return `Charge ${money(num(d.rechargeAmount))} automatically at ${money(num(d.rechargeAt))} — no warning first.`;
  }
  return 'Everything off — no warnings, and no automatic top-ups.';
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
    <span className="text-[13px] text-gray-700">{label}</span>
    <span className="flex items-center gap-1.5">{children}</span>
  </div>
);

const MoneyInput = ({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) => (
  <>
    <span className="text-sm text-gray-500">$</span>
    <input
      inputMode="decimal"
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
      className="h-8 w-24 rounded-lg border border-gray-300 px-2 text-sm outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
    />
  </>
);

const LowBalanceSettings = () => {
  const { user } = useUser();
  const userInfo = (user as any)?.user_info || {};
  const queryClient = useQueryClient();
  const { data: cards = [] } = useGetSavedCards() as any;

  /* The card a recharge is actually charged to, not a fixed string. Somebody
     deciding whether to switch this on needs to know which card pays. */
  const defaultCard = useMemo(() => {
    const rows: any[] = Array.isArray(cards) ? cards : [];
    return rows.find((c) => c?.is_default) || rows[0] || null;
  }, [cards]);

  const accountEmail = String(userInfo?.email || (user as any)?.email || '').trim();

  const fromAccount = useMemo<Draft>(() => {
    const low = userInfo?.low_balance_settings || userInfo?.low_balance_setting || {};
    const auto = userInfo?.auto_recharge_setting || {};
    const savedEmail = String(low?.alert_email || '').trim();
    return {
      alertEnabled: Boolean(low?.enabled),
      alertAt: String(low?.on_amount ?? '25.00'),
      emailAlert: low?.email_alert === undefined ? true : Boolean(low?.email_alert),
      emailChoice: savedEmail && savedEmail !== accountEmail ? 'custom' : 'account',
      customEmail: savedEmail && savedEmail !== accountEmail ? savedEmail : '',
      rechargeEnabled: Boolean(auto?.enabled),
      rechargeAt: String(auto?.threshold_amount ?? '15.00'),
      rechargeAmount: String(auto?.refill_amount ?? '50.00'),
    };
  }, [userInfo, accountEmail]);

  const [saved, setSaved] = useState<Draft>(fromAccount);
  const [draft, setDraft] = useState<Draft>(fromAccount);

  useEffect(() => {
    setSaved(fromAccount);
    setDraft(fromAccount);
  }, [fromAccount]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const masterOn = draft.alertEnabled || draft.rechargeEnabled;
  const problem = settingsProblem(draft);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const { mutateAsync: saveAlert } = useMutation({ mutationFn: updateLowBalanceSettings });
  const { mutateAsync: saveRecharge } = useMutation({ mutationFn: autoPurchasePlan });
  const [isSaving, setIsSaving] = useState(false);

  const onSave = async () => {
    if (problem) return;
    setIsSaving(true);
    try {
      /* The recipient travels with the threshold.
         This endpoint's validator used to be `.unknown(false)`, which is an
         active refusal rather than the usual silence: one extra key rejected the
         whole request, so sending the address would have stopped the ALERT
         AMOUNT saving too. It was relaxed to `.unknown(true)` on 10 Sep 2026
         (backend-patches/default-api/patch_low_balance_validator_unknown.py), and
         the controller behind it already stores the body wholesale into a JSON
         column - so no column, no migration, just permission to arrive. */
      await saveAlert({
        enabled: draft.alertEnabled,
        on_amount: num(draft.alertAt).toFixed(2),
        email_alert: draft.emailAlert,
        alert_email:
          draft.emailAlert && draft.emailChoice === 'custom'
            ? draft.customEmail.trim()
            : accountEmail,
      });
      await saveRecharge({
        enabled: draft.rechargeEnabled,
        threshold_amount: num(draft.rechargeAt),
        refill_amount: num(draft.rechargeAmount),
      });
      setSaved(draft);
      invalidateUserDetails(queryClient);
      handleAlert({ text: 'Low balance settings saved', type: 'success' });
    } catch (error: any) {
      handleAlert({
        text: error?.response?.data?.message || 'Could not save low balance settings',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h5 className="font-semibold text-gray-900">Low balance settings</h5>
          <p className="text-sm text-gray-600">Keep calls connected when credits run low.</p>
        </div>
        <Switch
          checked={masterOn}
          onCheckedChange={(on: boolean) =>
            /* Off turns both off. On restores the cheaper net - a warning costs
               nothing, so it is the safe thing to switch back on for somebody
               who has just told us they want *a* safety net. */
            on ? set({ alertEnabled: true }) : set({ alertEnabled: false, rechargeEnabled: false })
          }
        />
      </div>

      {/* Off dims in place rather than disappearing: a panel that vanishes takes
          the explanation of what was given up with it. */}
      <div className={masterOn ? 'mt-4' : 'mt-4 opacity-50'}>
        {!masterOn ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            With both off you won’t be warned before your balance runs out, and calls will stop
            connecting at {money(0)}.
          </p>
        ) : null}

        <section className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-semibold text-gray-900">Alert</p>
              <p className="text-[12.5px] text-gray-500">Early warning, so you can top up</p>
            </div>
            <Switch
              checked={draft.alertEnabled}
              onCheckedChange={(on: boolean) => set({ alertEnabled: on })}
            />
          </div>
          {draft.alertEnabled ? (
            <div className="mt-2 pl-1">
              <Row label="Alert me when my balance drops below">
                <MoneyInput value={draft.alertAt} onChange={(v) => set({ alertAt: v })} />
              </Row>
              {/* Where the warning goes is part of the setting. An alert with no
                  usable address is a stored number, not a warning - so the
                  recipient is chosen here and validated before Save will run. */}
              <label className="mt-1 flex items-center gap-2">
                <Checkbox
                  checked={draft.emailAlert}
                  onCheckedChange={(on) => set({ emailAlert: on === true })}
                />
                <span className="text-[13px] text-gray-700">Email alert</span>
              </label>

              {draft.emailAlert ? (
                <div className="mt-1 rounded-lg bg-gray-50 px-3 py-2">
                  <p className="mb-1 text-[12.5px] text-gray-600">Send the alert to</p>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="alert-email-choice"
                      checked={draft.emailChoice === 'account'}
                      onChange={() => set({ emailChoice: 'account' })}
                    />
                    <span className="text-[13px] text-gray-700">
                      Account email{' '}
                      <span className="text-gray-500">{accountEmail || '(none on file)'}</span>
                    </span>
                  </label>
                  <label className="mt-1 flex flex-wrap items-center gap-2">
                    <input
                      type="radio"
                      name="alert-email-choice"
                      checked={draft.emailChoice === 'custom'}
                      onChange={() => set({ emailChoice: 'custom' })}
                    />
                    <span className="text-[13px] text-gray-700">Custom email</span>
                    <input
                      type="email"
                      value={draft.customEmail}
                      placeholder="billing@company.com"
                      onChange={(e) => set({ customEmail: e.target.value, emailChoice: 'custom' })}
                      className="h-8 w-56 rounded-lg border border-gray-300 px-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-semibold text-gray-900">Recharge automatically</p>
              <p className="text-[12.5px] text-gray-500">
                Safety net, charged to your default card
              </p>
            </div>
            <Switch
              checked={draft.rechargeEnabled}
              onCheckedChange={(on: boolean) => set({ rechargeEnabled: on })}
            />
          </div>
          {draft.rechargeEnabled ? (
            <div className="mt-2 pl-1">
              <Row label="Recharge when my balance drops below">
                <MoneyInput value={draft.rechargeAt} onChange={(v) => set({ rechargeAt: v })} />
              </Row>
              <Row label="Charge this amount">
                <MoneyInput
                  value={draft.rechargeAmount}
                  onChange={(v) => set({ rechargeAmount: v })}
                />
              </Row>
              <Row label="To card">
                <span className="text-[13px] font-medium text-gray-800">
                  {defaultCard
                    ? `${String(defaultCard.brand || defaultCard.card_brand || 'Card').toUpperCase()} •••• ${defaultCard.last4 || defaultCard.last_4 || '••••'}`
                    : 'No saved card yet'}
                </span>
              </Row>
              <p className="mt-1 text-[12.5px] text-amber-700">
                ⚠ We always email you if a charge fails.
              </p>
            </div>
          ) : null}
        </section>

        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-[13px] text-gray-700">
          ✓ {settingsSummary(draft)}
        </p>

        {problem ? <p className="mt-2 text-[12.5px] text-red-600">{problem}</p> : null}
      </div>

      {isDirty ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <span className="text-[13px] text-gray-600">You have unsaved changes.</span>
          <span className="flex gap-2">
            <Button variant="secondary" onClick={() => setDraft(saved)} disabled={isSaving}>
              Discard
            </Button>
            <Button variant="primary" onClick={onSave} disabled={Boolean(problem) || isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default LowBalanceSettings;

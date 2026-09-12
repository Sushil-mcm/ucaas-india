import { useUser } from '@/hooks/use-user';
import { formatMoney, knownNumber } from '@/lib/billing-money';

/**
 * The number every other control on this screen acts on.
 *
 * The page let somebody set a low-balance alert and an automatic recharge
 * without ever showing the balance those two settings watch. So there was no
 * way to tell whether either had already tripped - you could set an alert at
 * $25 while sitting on $9 and the screen would look exactly the same.
 */

/* Money for this screen. Deliberately a thin pass through the tested billing
   formatter rather than a second implementation: that module exists so every
   figure in billing rounds and prints the same way, and a private `money()`
   here would be the first step back to figures that disagree with each other.
   It keeps the module's rule that a value nobody knows is NOT zero - an unknown
   balance must never print as "$0.00", which reads as a fact about the account. */
export const money = (value: unknown): string | null => formatMoney(value);

type Settings = {
  alertEnabled: boolean;
  alertAt: number;
  rechargeEnabled: boolean;
  rechargeAt: number;
  rechargeAmount: number;
};

type Tone = 'info' | 'warn';

/**
 * What happens next, and at what balance.
 *
 * States the CONSEQUENCE rather than the setting. "Low balance alert: on" tells
 * somebody what they already did; "Below your $25.00 alert - top up to avoid
 * dropped calls" tells them what it means for them right now.
 *
 * Amber is spent on the one state that needs the person to do something: under
 * the alert with nothing automatic behind it. Under the recharge level is not
 * amber - a charge is already on its way, so the news is reassuring, not urgent.
 * Colour that appears when nothing is wrong stops meaning anything.
 */
export const balanceStatus = (
  balance: number | null,
  s: Settings,
): { tone: Tone; text: string } => {
  if (balance === null) {
    return { tone: 'info', text: 'Your balance is not available right now.' };
  }
  if (s.rechargeEnabled && balance < s.rechargeAt) {
    return {
      tone: 'info',
      text: `Below ${money(s.rechargeAt)} — auto recharge adds ${money(s.rechargeAmount)} shortly.`,
    };
  }
  if (s.alertEnabled && balance < s.alertAt) {
    return s.rechargeEnabled
      ? {
          tone: 'info',
          text: `Below your ${money(s.alertAt)} alert — auto recharge is standing by.`,
        }
      : {
          tone: 'warn',
          text: `Below your ${money(s.alertAt)} alert — top up to avoid dropped calls.`,
        };
  }
  if (s.alertEnabled) return { tone: 'info', text: `Above your ${money(s.alertAt)} alert level.` };
  if (s.rechargeEnabled) {
    return {
      tone: 'info',
      text: `Auto recharge adds ${money(s.rechargeAmount)} below ${money(s.rechargeAt)}.`,
    };
  }
  return { tone: 'info', text: 'No alert or auto recharge is set.' };
};

const BalanceBar = ({ settings }: { settings: Settings }) => {
  const { user } = useUser();
  const balance = knownNumber((user as any)?.company_info?.amount);
  const shown = money(balance);
  const status = balanceStatus(balance, settings);

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
          Current balance
        </p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">
          {/* Never "$0.00" for a balance nobody could read - see `money` above. */}
          {shown ?? <span className="text-base font-medium text-gray-500">Not available yet</span>}
        </p>
      </div>
      <span
        className={
          status.tone === 'warn'
            ? 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[13px] font-medium text-amber-800'
            : 'rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[13px] font-medium text-blue-800'
        }
      >
        {status.text}
      </span>
    </div>
  );
};

export default BalanceBar;

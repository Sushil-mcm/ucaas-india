import { TOP_UP_AMOUNT } from '../constants';

/* The range the card processor and the plan both accept. Exported so the Pay
   button, the validation message and any caller all quote the same two numbers
   instead of three copies drifting apart. */
export const TOP_UP_MIN = 3;
export const TOP_UP_MAX = 1000;

type AmountSectionProps = {
  selectedAmount: number | null;
  setSelectedAmount: (value: number | null) => void;
  customAmount: string;
  setCustomAmount: (value: string) => void;
};

/** '' when the typed amount is fine (or empty); the reason when it is not. */
export const customAmountError = (raw: string): string => {
  if (!raw) return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return 'Enter a whole dollar amount.';
  if (n < TOP_UP_MIN) return `The smallest top-up is $${TOP_UP_MIN}.`;
  if (n > TOP_UP_MAX) return `The largest top-up is $${TOP_UP_MAX}.`;
  return '';
};

const AmountSection = ({
  selectedAmount,
  setSelectedAmount,
  customAmount,
  setCustomAmount,
}: AmountSectionProps) => {
  const error = customAmountError(customAmount);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-2">
        {TOP_UP_AMOUNT?.map((res, index) => (
          <div
            key={index}
            className={`border border-gray-200 rounded-xl p-2 text-center cursor-pointer  ${
              selectedAmount === res ? 'bg-primary text-white' : 'bg-white text-gray-900'
            }`}
            /* Picking a preset clears the typed box. The two cannot both be
               chosen: a screen showing $50 highlighted AND 137 typed cannot say
               what the Pay button is about to charge, and the person reading it
               has no way to find out except by paying. */
            onClick={() => {
              setSelectedAmount(res);
              setCustomAmount('');
            }}
          >
            <span
              className={`font-semibold text-sm ${selectedAmount === res ? 'text-white' : 'text-primary'}`}
            >
              ${res}
            </span>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="custom-top-up" className="mb-1 block text-[13px] font-medium text-gray-700">
          Or enter an amount
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-500">$</span>
          <input
            id="custom-top-up"
            /* Whole dollars only, enforced by stripping non-digits as the person
               types rather than rejecting afterwards. A decimal point can never
               land in the box, so nobody types "12.50", presses Pay and is told
               off for it - the key simply does nothing, which is the same way a
               phone-number field refuses letters. */
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 75"
            value={customAmount}
            onChange={(event) => {
              const digitsOnly = event.target.value.replace(/\D/g, '');
              setCustomAmount(digitsOnly);
              if (digitsOnly) setSelectedAmount(null);
            }}
            className={`h-9 w-40 rounded-lg border px-3 text-sm outline-none ${
              error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-primary'
            }`}
          />
          <span className="text-xs text-gray-500">
            ${TOP_UP_MIN}–${TOP_UP_MAX}, whole dollars
          </span>
        </div>
        {error ? <p className="mt-1 text-[12.5px] text-red-600">{error}</p> : null}
      </div>
    </div>
  );
};

export default AmountSection;

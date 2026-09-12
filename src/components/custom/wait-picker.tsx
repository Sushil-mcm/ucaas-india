import CustomSelect from '@/components/custom/custom-select';
import { Input } from '@/components/ui/input';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { DEFAULT_RETRY_PERIOD_TYPE, RETRY_PERIOD_TYPE } from '@/pages/auto-dialer/campaign/add-edit-campaign/consts';
import { useState } from 'react';

/* One control for "how long to wait": a list of sensible waits to pick from
   (1 minute … 7 days), a "use the default" entry, and "Custom…" for anyone
   who really wants 37 minutes. Stored exactly as before - {period, unit} with
   unit min | hr | day - so nothing downstream changes. */

export type WaitValue = { period: number | ''; unit: string };

const PRESETS: WaitValue[] = [
  ...[1, 2, 5, 10, 15, 30, 45].map((period) => ({ period, unit: RETRY_PERIOD_TYPE.MIN })),
  ...[1, 2, 4, 8, 12].map((period) => ({ period, unit: RETRY_PERIOD_TYPE.HOUR })),
  ...[1, 2, 3, 7].map((period) => ({ period, unit: RETRY_PERIOD_TYPE.DAY })),
];

const UNIT_WORD: Record<string, [string, string]> = {
  [RETRY_PERIOD_TYPE.MIN]: ['minute', 'minutes'],
  [RETRY_PERIOD_TYPE.HOUR]: ['hour', 'hours'],
  [RETRY_PERIOD_TYPE.DAY]: ['day', 'days'],
};

export const describeWait = (value: WaitValue | null | undefined): string => {
  if (!value || value.period === '' || Number(value.period) <= 0) return '';
  const n = Number(value.period);
  const words = UNIT_WORD[value.unit] || UNIT_WORD[RETRY_PERIOD_TYPE.MIN];
  return `${n} ${n === 1 ? words[0] : words[1]}`;
};

const keyOf = (value: WaitValue) => `${Number(value.period)}-${value.unit || RETRY_PERIOD_TYPE.MIN}`;
const BLANK = 'blank';
const CUSTOM = 'custom';

const isSet = (value: WaitValue | null | undefined): value is WaitValue =>
  Boolean(value && value.period !== '' && Number(value.period) > 0);

type WaitPickerProps = {
  label: string;
  value?: WaitValue | null;
  /* null = blank (use the default). */
  onChange: (next: WaitValue | null) => void;
  disabled?: boolean;
  /* What the blank entry says, e.g. "Use the default retry period". */
  blankLabel?: string;
};

const WaitPicker = ({ label, value, onChange, disabled, blankLabel = 'Use the default' }: WaitPickerProps) => {
  const set = isSet(value);
  const preset = set ? PRESETS.find((p) => keyOf(p) === keyOf(value)) : undefined;
  /* Custom stays open once chosen, even while the amount is still blank. */
  const [customOpen, setCustomOpen] = useState<boolean>(set && !preset);
  const custom = customOpen || (set && !preset);

  const options = [
    { label: blankLabel, value: BLANK },
    ...PRESETS.map((p) => ({ label: describeWait(p), value: keyOf(p) })),
    { label: 'Custom…', value: CUSTOM },
  ];
  const selected = custom
    ? options[options.length - 1]
    : set && preset
      ? options.find((o) => o.value === keyOf(preset))
      : options[0];

  const pick = (option: ISELECTVALUE | null) => {
    const chosen = String(option?.value ?? BLANK);
    if (chosen === CUSTOM) {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    if (chosen === BLANK) {
      onChange(null);
      return;
    }
    const found = PRESETS.find((p) => keyOf(p) === chosen);
    onChange(found ? { ...found } : null);
  };

  const unit = (value?.unit as string) || RETRY_PERIOD_TYPE.MIN;

  return (
    <div className="flex w-full items-end gap-2">
      <div className={custom ? 'w-1/2 min-w-0' : 'w-full min-w-0'}>
        <CustomSelect
          label={label}
          isDisabled={disabled}
          placeholder={blankLabel}
          options={options}
          value={selected}
          handleChange={pick}
          menuPlacement="auto"
        />
      </div>
      {custom ? (
        <>
          <Input
            label="Amount"
            type="number"
            min={1}
            disabled={disabled}
            value={value?.period ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              onChange(raw === '' ? null : { period: Math.max(1, Number(raw)), unit });
            }}
          />
          <CustomSelect
            label="Unit"
            isDisabled={disabled}
            placeholder="Unit"
            options={DEFAULT_RETRY_PERIOD_TYPE}
            value={DEFAULT_RETRY_PERIOD_TYPE.find((o) => o.value === unit) || DEFAULT_RETRY_PERIOD_TYPE[0]}
            handleChange={(e: ISELECTVALUE | null) =>
              onChange(isSet(value) ? { period: value.period, unit: String(e?.value || RETRY_PERIOD_TYPE.MIN) } : null)
            }
            menuPlacement="auto"
          />
        </>
      ) : null}
    </div>
  );
};

export default WaitPicker;

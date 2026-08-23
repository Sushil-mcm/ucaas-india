import { Delete } from 'lucide-react';
import Flag from '@/components/flag';
import { AsYouType, parsePhoneNumber } from 'libphonenumber-js/max';

const isFeatureCode = (value: string) => value.startsWith('*') || value.startsWith('#');

const getDisplayNumber = (value: string) => {
  const trimmedValue = value.trim();
  const typedDigits = value.replace(/\D/g, '');

  // Keep short entries and feature codes untouched (usually extension/internal dialing).
  if (!trimmedValue || typedDigits.length <= 4 || isFeatureCode(trimmedValue)) {
    return value;
  }

  const hasExplicitCountryCode = trimmedValue.startsWith('+');
  const normalizedPhone = `+${typedDigits}`;
  const candidates = hasExplicitCountryCode
    ? [normalizedPhone]
    : [normalizedPhone, `+1${typedDigits}`];

  for (const candidate of candidates) {
    try {
      const parsed = parsePhoneNumber(candidate);
      if (parsed?.country) return parsed.formatInternational();
    } catch {
      // no-op
    }
  }

  for (const candidate of candidates) {
    try {
      const asYouTypeValue = new AsYouType().input(candidate);
      if (asYouTypeValue) return asYouTypeValue;
    } catch {
      // no-op
    }
  }

  return value;
};

type DialpadNumberDisplayProps = {
  typedNumber: string;
  onTypedNumberChange: (value: string) => void;
  onBackspace: () => void;
  onEnterPress?: () => void;
  disabled?: boolean;
};

const DialpadNumberDisplay = ({
  typedNumber,
  onTypedNumberChange,
  onBackspace,
  onEnterPress,
  disabled = false,
}: DialpadNumberDisplayProps) => {
  const typedDigits = typedNumber.replace(/\D/g, '');
  const shouldShowFlag = typedDigits.length > 4;
  const displayNumber = getDisplayNumber(typedNumber);

  const flagPhoneNumber = (() => {
    if (!shouldShowFlag) return '';
    const trimmedValue = typedNumber.trim();
    if (!trimmedValue || isFeatureCode(trimmedValue)) return '';

    const hasExplicitCountryCode = trimmedValue.startsWith('+');
    const normalizedPhone = `+${typedDigits}`;
    const usFallbackPhone = `+1${typedDigits}`;
    const candidates = hasExplicitCountryCode
      ? [normalizedPhone]
      : [normalizedPhone, usFallbackPhone];

    for (const candidate of candidates) {
      try {
        const parsed = parsePhoneNumber(candidate);
        if (parsed?.country) return parsed.number;
      } catch {
        // no-op
      }
    }
    return '';
  })();

  return (
    <div className="mb-2 max-[380px]:mb-1.5 sm:mb-2 md:mb-2 xl:mb-2.5 xl:mt-2 px-0.5">
      <div className="flex items-center gap-1.5 rounded-2xl bg-transparent px-0.5 py-0.5  max-[380px]:gap-1 max-[380px]:px-0 max-[380px]:py-0 sm:gap-2 sm:px-1 xl:py-1">
        {shouldShowFlag ? (
          <Flag
            phoneNumber={flagPhoneNumber}
            className="h-4 w-6 shrink-0 overflow-hidden rounded-sm max-[380px]:h-3.5 max-[380px]:w-5 sm:h-7 sm:w-7 md:h-5 md:w-7 lg:h-7 lg:w-8 xxl:h-7 xxl:w-10"
          />
        ) : null}
        <input
          value={displayNumber}
          onChange={(event) => onTypedNumberChange(event.target.value)}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            onEnterPress?.();
          }}
          inputMode="tel"
          placeholder="(555) 000-0000"
          className={`w-full min-w-0 bg-transparent text-center text-[16px] font-light tracking-tight outline-none placeholder:text-[#c2ccdc] max-[380px]:text-[15px] sm:text-[17px] md:text-[21px] xl:text-[24px] xxl:text-[32px] ${
            disabled ? 'cursor-not-allowed text-[#9aa8bc]' : 'text-[#2f4768]'
          }`}
        />
        <button
          type="button"
          onClick={onBackspace}
          disabled={!typedNumber || disabled}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition max-[380px]:h-5 max-[380px]:w-5 sm:h-7 sm:w-7 md:h-7.5 md:w-7.5 xl:h-9 xl:w-9 ${
            typedNumber && !disabled
              ? 'bg-[#e9eef7] text-[#3c4f6d] hover:bg-ucass-active-bg'
              : 'bg-[#eef2f8] text-[#b9c4d7]'
          }`}
          aria-label="Remove last digit"
        >
          <Delete className="h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3 sm:h-4 sm:w-4" />
        </button>
      </div>
    </div>
  );
};

export default DialpadNumberDisplay;

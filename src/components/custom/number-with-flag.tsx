import { formatPhoneNumber, toE164 } from '@/lib/utils';
import { memo, useMemo } from 'react';
import PhoneInput from 'react-phone-input-2';
import CountryFlag, { flagCodeFor } from './country-flag';

export const filterPhoneNumber = (number: any) => (number.startsWith('+') ? number : `+${number}`);


/**
 * Is this a real phone number, or an internal extension?
 *
 * An extension is not a number to format: prefixing `1000` with a plus turns it
 * into "+1 000" -- a United States number, with a US flag beside it. Eight
 * digits is below every mobile length this product dials and above every
 * extension it issues.
 */
export const isDiallableNumber = (number: unknown) =>
  String(number ?? '').replace(/\D/g, '').length >= 8;

/**
 * A stored number as people read it: `917666718264` becomes `+91 76667 18264`.
 *
 * The call log stores numbers with no leading plus, and `parsePhoneNumber`
 * needs the plus to know the country -- without it it throws, and an uncaught
 * throw takes the whole screen down. Anything that is not diallable comes back
 * untouched rather than mangled into a foreign number.
 */
export const formatDialNumber = (number: unknown): string => {
  if (!number) return '';
  if (!isDiallableNumber(number)) return String(number);
  /* The raw value, NOT `filterPhoneNumber`'s "+" form. Sticking a plus on bare
     digits states a country nobody told us: `7666718264` read as "+7 666718264"
     (Russia) when it is this deployment's own `+91 76667 18264`.
     `formatPhoneNumber` works that out properly and never throws. */
  try {
    return formatPhoneNumber(String(number)) || String(number);
  } catch {
    return String(number);
  }
};

const NumberWithFlag = ({ number = null, isFlag = true, className = '' }: any) => {
  const isExternal = useMemo(() => isDiallableNumber(number), [number]);
  const formattedNumber = useMemo(() => formatDialNumber(number), [number]);

  if (!number) return '---';

  /* Anything that is not a real number -- an extension, or a stub the switch
     left in a caller-id column -- is printed exactly as it is stored.

     It used to fall through to the disabled `PhoneInput` below, whose country
     is hardcoded to 'us', so a stored "000" was drawn as a United States field
     reading "+1 (000)" with a US flag beside it. That is an invented number
     presented as a fact. There is nothing to look up here, so show the value
     and let it speak for itself. */
  if (!isExternal) {
    return <span className={className}>{String(number)}</span>;
  }

  return isFlag ? (
    <span className={`inline-flex items-center gap-1   ${className}`}>
      {/* Inline SVG, not react-country-flag: its emoji mode has no glyph on
          Windows (the flag came out as the letters "IN") and its `svg` mode
          fetches from jsdelivr, which is blocked on this network. */}
      <CountryFlag
        code={flagCodeFor(toE164(number) || filterPhoneNumber(String(number)))}
        className="w-4 flex-shrink-0"
      />
      {formattedNumber}
    </span>
  ) : (
    <PhoneInput
      country={'us'}
      value={filterPhoneNumber(number)}
      onChange={() => {}}
      disableDropdown={true}
      disabled={true}
      enableAreaCodes={true}
    />
  );
};

export default memo(NumberWithFlag);

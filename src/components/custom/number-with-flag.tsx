import { formatPhoneNumber } from '@/lib/utils';
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
  const withPlus = filterPhoneNumber(String(number));
  try {
    return formatPhoneNumber(withPlus) || withPlus;
  } catch {
    return String(number);
  }
};

const NumberWithFlag = ({ number = null, isFlag = true, className = '' }: any) => {
  const isExternal = useMemo(() => isDiallableNumber(number), [number]);
  const formattedNumber = useMemo(() => formatDialNumber(number), [number]);

  if (!number) return '---';
  return isFlag && isExternal ? (
    <span className={`inline-flex items-center gap-1   ${className}`}>
      {/* Inline SVG, not react-country-flag: its emoji mode has no glyph on
          Windows (the flag came out as the letters "IN") and its `svg` mode
          fetches from jsdelivr, which is blocked on this network. */}
      <CountryFlag
        code={flagCodeFor(filterPhoneNumber(String(number)))}
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

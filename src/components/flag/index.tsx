import { parsePhoneNumber } from 'libphonenumber-js/max';
import { memo, useMemo } from 'react';
import ReactCountryFlag from 'react-country-flag';

/**
 * DIDs are stored inconsistently — some with a leading "+", some without, some
 * with spaces or brackets. `Flag` only parses strict E.164, so passing a stored
 * number straight through silently rendered nothing for about half of them.
 * Normalise to +<digits> at every call site.
 */
export const toFlagNumber = (value: unknown): string => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
};

const Flag = ({
  phoneNumber = '',
  className = '',
}: {
  phoneNumber: string | undefined;
  className?: string;
  width?: number | undefined;
  height?: number | undefined;
}) => {
  const countryCode = useMemo(() => {
    try {
      if (phoneNumber && phoneNumber.startsWith('+')) {
        return parsePhoneNumber(phoneNumber)?.country || '';
      }
    } catch {
      return '';
    }

    return '';
  }, [phoneNumber]);

  if (!countryCode) return null;

  return (
    <span className={className}>
      <ReactCountryFlag
        countryCode={countryCode}
        style={{
          fontSize: '1rem',
          lineHeight: '1rem',
        }}
      />
    </span>
  );
};

export default memo(Flag);

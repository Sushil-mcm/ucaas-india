import { parsePhoneNumber } from 'libphonenumber-js/max';
import { memo, useMemo } from 'react';
import ReactCountryFlag from 'react-country-flag';
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

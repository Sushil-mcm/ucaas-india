import { formatPhoneNumber } from '@/lib/utils';
import { memo, useMemo } from 'react';
import PhoneInput from 'react-phone-input-2';
import Flag from '../flag';

export const filterPhoneNumber = (number: any) => (number.startsWith('+') ? number : `+${number}`);

const NumberWithFlag = ({ number = null, isFlag = true, className = '' }: any) => {
  const formattedNumber = useMemo(() => {
    if (!number) return '';
    return formatPhoneNumber(number) || '';
  }, [number]);

  if (!number) return '---';
  return isFlag ? (
    <span className={`inline-flex items-center gap-1   ${className}`}>
      <Flag phoneNumber={formattedNumber} className="flex-shrink-0 w-5" />
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

import { MAX_DIAL_LENGTH } from './constants';

export const isDialpadInput = (value: string) => /^[0-9*#+]$/.test(value);

export const formatDialedNumber = (value: string) => {
  if (!value) return '(555) 000-0000';
  if (/[^0-9]/.test(value)) return value;

  const digits = value.slice(0, MAX_DIAL_LENGTH);

  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)} ${digits.slice(10)}`;
};

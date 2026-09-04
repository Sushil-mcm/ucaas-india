/**
 * Puts a space between the dial code and the rest of the number, so
 * "+912233445566" reads as "+91 2233445566".
 *
 * Only +91 is split. Dial codes are one to three digits and nothing in the
 * string says where this one ends, so a generic `+\d{1,3}` rule would guess --
 * and guessing wrong turns "+9122..." into "+9 122...", which is worse than
 * leaving it alone. Every number this console sends from or to is Indian; if
 * that stops being true, this needs a real dial-code table rather than a
 * looser regex.
 */
export const formatDialSpaced = (value?: string | null): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const compact = raw.replace(/\s+/g, '');
  if (!/^\+91\d{2,}$/.test(compact)) return raw;

  return `+91 ${compact.slice(3)}`;
};

export default formatDialSpaced;

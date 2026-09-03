import { useEffect, useMemo, useRef, useState } from 'react';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { useContactSuggestions } from '@/hooks/use-contact-suggestions';
import Flag from '@/components/flag';
import { checkPhoneNumberCountry, toE164 } from '@/lib/utils';

/**
 * The "To:" field for the Inbox composers.
 *
 * Replaces `react-phone-input-2`, which strips every non-digit on each
 * keystroke — so the field could not hold a name, and searching contacts by
 * name was impossible while it owned the input. This is a plain text input:
 * letters search the saved contacts, digits are parsed against the sending
 * DID's country, and a leading `+` carries its own country code.
 */

type Props = {
  /** The form's current recipient. */
  value: string;
  onChange: (value: string) => void;
  /** The sending DID — supplies the default country for bare national digits. */
  fromNumber?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
};

const RecipientField = ({
  value,
  onChange,
  fromNumber = '',
  placeholder = 'Type a name or number',
  id,
  disabled,
}: Props) => {
  /* What is on screen is exactly what was typed. The form value is derived
     from it, never written back into it — mirroring the value back rewrote the
     text mid-word the moment the digits parsed valid, which moved the caret. */
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const touched = useRef(false);

  const defaultCountry = useMemo(() => {
    const { countryCode } = checkPhoneNumberCountry(toE164(fromNumber));
    return (countryCode || 'IN') as CountryCode;
  }, [fromNumber]);

  /* Hydrate only while the field is untouched — deep links (?number=…) and a
     contact's "message" action land here with a value already set. */
  useEffect(() => {
    if (touched.current) return;
    if (value) setText(toE164(value));
  }, [value]);

  const hasLetters = /[a-z]/i.test(text);
  const { matches, nameForNumber } = useContactSuggestions(text);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || /[a-z]/i.test(trimmed)) {
      // Not dialable yet — the form must not think it has a recipient.
      onChange('');
      return;
    }
    const parsed = trimmed.startsWith('+')
      ? parsePhoneNumberFromString(trimmed)
      : parsePhoneNumberFromString(trimmed, defaultCountry);
    onChange(parsed?.isValid() ? parsed.number : toE164(trimmed));
  };

  const pick = (number: string) => {
    touched.current = true;
    const normalized = toE164(number);
    setText(normalized);
    commit(normalized);
    setFocused(false);
  };

  /* The country of whatever is typed, resolved the same way `commit` does so
     the flag and the value the form holds can never disagree. */
  const flagNumber = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed || /[a-z]/i.test(trimmed)) return '';
    const parsed = trimmed.startsWith('+')
      ? parsePhoneNumberFromString(trimmed)
      : parsePhoneNumberFromString(trimmed, defaultCountry);
    return parsed?.isValid() ? parsed.number : toE164(trimmed);
  }, [text, defaultCountry]);

  const resolvedName = !hasLetters && text.trim() ? nameForNumber(text) : '';
  const showSuggestions = focused && text.trim().length > 0 && matches.length > 0;
  const showNoMatch = focused && hasLetters && text.trim().length > 0 && matches.length === 0;

  return (
    <div className="relative flex w-full items-center gap-2">
      {flagNumber ? <Flag phoneNumber={flagNumber} className="flex-shrink-0" /> : null}
      <input
        id={id}
        type="text"
        autoComplete="off"
        disabled={disabled}
        className="mcm-rowfield"
        placeholder={placeholder}
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Late enough for a suggestion's mousedown to land first.
          window.setTimeout(() => setFocused(false), 120);
        }}
        onChange={(e) => {
          touched.current = true;
          const raw = e.target.value;
          setText(raw);
          commit(raw);
        }}
      />

      {resolvedName ? <span className="mcm-rowfield-hint">{resolvedName}</span> : null}

      {showSuggestions ? (
        <div className="mcm-recipient-pop">
          {matches.map((contact) => (
            <button
              key={contact.id}
              type="button"
              className="mcm-recipient-row"
              disabled={!contact.number}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(contact.number)}
            >
              <span className="mcm-recipient-name">{contact.name || contact.number}</span>
              <span className="mcm-recipient-num">{contact.number || 'No number saved'}</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Silence under a typed name reads as "still searching". */}
      {showNoMatch ? (
        <div className="mcm-recipient-pop">
          <div className="mcm-recipient-empty">No saved contact matches “{text.trim()}”.</div>
        </div>
      ) : null}
    </div>
  );
};

export default RecipientField;

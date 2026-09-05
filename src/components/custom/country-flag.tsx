/**
 * Country flags drawn inline, not fetched.
 *
 * react-country-flag has two modes and both failed here. Its emoji mode needs
 * a regional-indicator glyph, which Windows does not ship — the flag came out
 * as the bare letters "IN". Its `svg` mode fetches an image from
 * cdn.jsdelivr.net, which is reachable from the server but blocked on the
 * network this console is used from, so the chip showed a broken-image icon
 * instead.
 *
 * These are inline SVG, so they render from the bundle with no request at all.
 * Only the two countries that actually reach this component are drawn — the
 * Indian numbers and Twilio's US one; anything else returns null so the caller
 * can fall back to its own icon rather than show a wrong flag.
 */

const FLAGS: Record<string, React.ReactNode> = {
  /* 3:2, the Indian flag's official ratio. The chakra is a ring with eight
     spokes rather than the true twenty-four: at 20px the real count collapses
     into a solid disc, and eight still reads as a wheel. */
  IN: (
    <>
      <rect width="30" height="6.667" y="0" fill="#FF9933" />
      <rect width="30" height="6.667" y="6.667" fill="#FFFFFF" />
      <rect width="30" height="6.666" y="13.333" fill="#138808" />
      <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.7" />
      <g stroke="#000080" strokeWidth="0.45">
        <line x1="15" y1="7.4" x2="15" y2="12.6" />
        <line x1="12.4" y1="10" x2="17.6" y2="10" />
        <line x1="13.16" y1="8.16" x2="16.84" y2="11.84" />
        <line x1="16.84" y1="8.16" x2="13.16" y2="11.84" />
      </g>
    </>
  ),
  US: (
    <>
      <rect width="30" height="20" fill="#FFFFFF" />
      <g fill="#B22234">
        <rect width="30" height="1.54" y="0" />
        <rect width="30" height="1.54" y="3.08" />
        <rect width="30" height="1.54" y="6.15" />
        <rect width="30" height="1.54" y="9.23" />
        <rect width="30" height="1.54" y="12.31" />
        <rect width="30" height="1.54" y="15.38" />
        <rect width="30" height="1.54" y="18.46" />
      </g>
      <rect width="12" height="10.77" fill="#3C3B6E" />
    </>
  ),
};

/** True when there is a flag to draw, so a caller can pick its fallback first. */
export const hasFlag = (code?: string) => Boolean(FLAGS[String(code || '').toUpperCase()]);

/**
 * The flag to draw for a caller ID, decided from the number before the label.
 *
 * `did_country` is missing on some assigned DIDs and `toCallerIdOptions`
 * defaults those to 'US', so trusting it alone drew the wrong flag — or, when
 * it held something that is not an ISO code, no flag and no fallback either.
 * A dialling code is unambiguous: +91 is India, +1 is the US. The label is only
 * consulted when the number says nothing.
 */
export const flagCodeFor = (number?: string, country?: string) => {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return 'IN';
  if (digits.length === 11 && digits.startsWith('1')) return 'US';
  return hasFlag(country) ? String(country).toUpperCase() : '';
};

/**
 * @param code ISO 3166-1 alpha-2, case-insensitive. Unknown codes render
 *             nothing, which is the signal to draw a fallback instead.
 */
const CountryFlag = ({
  code,
  className = '',
  title,
}: {
  code?: string;
  className?: string;
  title?: string;
}) => {
  const flag = FLAGS[String(code || '').toUpperCase()];
  if (!flag) return null;

  return (
    <svg
      viewBox="0 0 30 20"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      /* A hairline edge, so a flag whose top or bottom band is white does not
         bleed into a white chip. */
      style={{ borderRadius: 2, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.18)' }}
    >
      {title ? <title>{title}</title> : null}
      {flag}
    </svg>
  );
};

export default CountryFlag;

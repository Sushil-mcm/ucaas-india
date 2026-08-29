/* The one list of company settings sections.
 *
 * The router builds its child routes from this, and the sub-navigation builds
 * its links from it, so a section cannot exist in one and be missing from the
 * other. Adding a section means adding one row here and one route.
 *
 * `path` is relative to /admin-settings/company — the layout links there and
 * the router mounts the sections there, so the two cannot drift apart.
 */

export interface CompanySection {
  path: string;
  label: string;
}

export const COMPANY_SECTIONS: CompanySection[] = [
  { path: 'phone-rules', label: 'Phone rules' },
  { path: 'greetings', label: 'Greetings' },
  { path: 'voicemail', label: 'Ringing & voicemail' },
  { path: 'emergency-address', label: 'Emergency address' },
  { path: 'holidays', label: 'Holidays' },
  { path: 'calling', label: 'Calling' },
  { path: 'messaging', label: 'Messaging' },
  { path: 'policies', label: 'Policies' },
  { path: 'profile-fields', label: 'Profile fields' },
  { path: 'security', label: 'Security' },
];

/* Where /admin-settings/company/rules-era links and the bare /company path
   should land. Kept as a constant so the redirects and the router agree. */
export const COMPANY_DEFAULT_SECTION = 'phone-rules';

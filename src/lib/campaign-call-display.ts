/* Whose name the in-call card shows on a campaign call.
 *
 * A campaign hands the agent a LEAD - a row from the uploaded list with its
 * own name. When the call connects, the dialer also looks the number up in the
 * company's contacts and, if it finds one, shows THAT name. On the 9 Sep test
 * the lead card said "Loopback Test IVR" and the in-call card said "Plumber
 * Test" for the same call: two names for one person, on screen at once.
 *
 * The rule: on a campaign call the lead's name comes first - it is the record
 * the agent was offered and the one the script and the disposition refer to.
 * The contact's saved name is shown underneath when it is different, so the
 * agent still learns the number is known to the company. Off a campaign,
 * nothing changes: the saved contact name is the only name there is.
 *
 * Pure, so the rule is tested without a SIP session.
 */

const clean = (value: unknown): string => String(value || '').trim();

const sameName = (a: string, b: string): boolean =>
  a.replace(/\s+/g, ' ').toLowerCase() === b.replace(/\s+/g, ' ').toLowerCase();

export type CallDisplayNameInput = {
  /** True when the session belongs to a campaign, however it was dialled. */
  isCampaignCall: boolean;
  /** The lead's name, as the campaign offered it (X-ContactName, live data). */
  leadName?: string | null;
  /** The name of the contact the number was matched to, if any. */
  savedContactName?: string | null;
  /** What to show when neither is known. */
  fallback?: string;
};

export type CallDisplayName = {
  /** The line in bold. */
  primary: string;
  /** The saved contact's name when it differs from the primary line, else ''. */
  secondary: string;
};

export const callDisplayName = ({
  isCampaignCall,
  leadName,
  savedContactName,
  fallback = 'Unknown Contact',
}: CallDisplayNameInput): CallDisplayName => {
  const lead = clean(leadName);
  const saved = clean(savedContactName);

  if (isCampaignCall && lead) {
    return { primary: lead, secondary: saved && !sameName(saved, lead) ? saved : '' };
  }
  return { primary: saved || lead || fallback, secondary: '' };
};

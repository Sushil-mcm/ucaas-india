/**
 * The body for saving your own Basic Info.
 *
 * `/api/user/update` replaces the whole user record. It has no partial mode: a
 * field the request does not carry comes back cleared, which is why every other
 * caller of this endpoint — the availability control, the greeting assignment
 * helper and the admin user form — writes the full record rather than the two
 * or three values it happens to be editing.
 *
 * So this screen does the same. The three fields the form owns come from the
 * form; everything else is read off the record the screen was hydrated from and
 * written straight back untouched. That is the safe shape of a full-record
 * write: the server's own data with only the edited slots changed, never a
 * payload assembled from assumptions about what the record holds.
 *
 * Anything that cannot be resolved is left out instead of being sent empty. A
 * blank value here reads as "clear this", not as "we did not know it".
 */

/** A stored value that may arrive as an object or as encoded text. */
const asObject = (value: unknown): any => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value) || '{}');
  } catch {
    return {};
  }
};

const hasKeys = (value: any) => Object.keys(value || {}).length > 0;

export type ProfileUpdateInput = {
  /** The record behind the screen: the result of the user-details query. */
  userInfoData: any;
  /** The values this form actually edits. */
  basic: {
    first_name?: string;
    last_name?: string;
    job_title?: string;
    site_uuid?: string;
  };
  /** Set only by a fresh upload in this session; empty on a plain name change. */
  uploadedProfile?: string;
  /** True when the person clicked the remove button on their picture. */
  isImageRemoved?: boolean;
};

export const buildProfileUpdatePayload = ({
  userInfoData,
  basic,
  uploadedProfile,
  isImageRemoved,
}: ProfileUpdateInput): Record<string, any> => {
  const stored = userInfoData?.user_info || {};

  /* A photo only reaches the form when it was uploaded in this session, so on a
     plain name change the stored one is read back off the record. An empty
     value is still sent when the picture was genuinely removed, because there
     it means what it says. */
  const profile = uploadedProfile || (isImageRemoved ? '' : stored?.profile || '');

  /* Held on the record itself rather than under `user_info` — read from both so
     a shape difference cannot silently turn into a cleared field. */
  const forwarding = asObject(userInfoData?.call_forwarding ?? stored?.call_forwarding);
  const greetings = asObject(userInfoData?.greetings ?? stored?.greetings);
  const settings = asObject(userInfoData?.settings ?? stored?.settings);

  const roleId = stored?.custom_role_uuid || stored?.role_uuid;
  const roleField = stored?.custom_role_uuid ? 'custom_role_uuid' : 'role_uuid';

  /* The location select is editable on this screen, so a chosen site wins;
     falling back to the stored one means a form that never touched the
     field (or hasn't finished loading it) still writes back what was
     already there instead of blanking it. */
  const siteUuid = basic?.site_uuid || stored?.site_uuid || '';

  return {
    first_name: basic?.first_name,
    last_name: basic?.last_name,
    job_title: basic?.job_title,
    profile,
    ...(stored?.caller_id ? { caller_id: stored.caller_id } : {}),
    ...(siteUuid ? { site_uuid: siteUuid } : {}),
    ...(roleId ? { [roleField]: roleId } : {}),
    ...(hasKeys(forwarding) ? { call_forwarding: forwarding } : {}),
    ...(hasKeys(greetings) ? { greetings } : {}),
    ...(hasKeys(settings) ? { settings } : {}),
    uuid: userInfoData?.uuid,
  };
};

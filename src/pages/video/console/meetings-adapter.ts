import moment from 'moment';
import {
  toneFor,
  type MeetingState,
  type NetQuality,
  type ParticipantRole,
  type VideoMeeting,
  type VideoParticipant,
} from './demo-data';

/**
 * Maps the platform's meeting rows onto the console's own model.
 *
 * The list endpoints (`meetingList`, see `@/services/api`) return the fields
 * the old `/video` pages already render — name, startUtc / startTimeLocal,
 * endTimeLocal, members, hostName, meetingId, status, mode. Everything the
 * console shows beyond that (who is muted, who has their hand up, per-leg
 * network quality) only exists once you are inside a conference, so it is NOT
 * invented here: those fields get neutral defaults and the live stage fills
 * them from the conference when it is wired up.
 */

/** Same lenient parsing the meetings pages use, so we agree on what a date is. */
const parseTime = (value: unknown) => {
  if (!value) return null;
  const parsed = moment(
    String(value),
    [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm:ss'],
    true,
  );
  const m = parsed.isValid() ? parsed : moment(String(value));
  return m.isValid() ? m : null;
};

const memberName = (member: any): string => {
  const full = String(
    member?.name || `${member?.first_name || ''} ${member?.last_name || ''}`,
  ).trim();
  return full || String(member?.email || '').trim() || 'Guest';
};

const memberType = (member: any) =>
  String(member?.type || '')
    .trim()
    .toUpperCase();

const roleOf = (member: any, hostName: string): ParticipantRole => {
  const type = memberType(member);
  if (type === 'ADMIN') return 'host';
  if (memberName(member) === hostName) return 'host';
  if (type === 'MODERATOR' || type === 'CO_HOST') return 'cohost';
  return 'attendee';
};

/** A guest, or anyone whose email is off the company domain. */
const isExternalMember = (member: any) => {
  if (memberType(member) === 'GUEST') return true;
  const domain = String(member?.email || '').split('@')[1] || '';
  return Boolean(domain) && !/mycountrymobile\.com$/i.test(domain);
};

export const membersToParticipants = (
  raw: any,
  selfName: string,
  selfId?: string,
): VideoParticipant[] => {
  const hostName = String(raw?.hostName || '').trim();
  const members: any[] = Array.isArray(raw?.members) ? raw.members : [];

  const mapped = members.map((member, i): VideoParticipant => {
    const name = memberName(member);
    const id = String(member?.userId || member?.user_uuid || member?.email || `m-${i}`);
    return {
      id,
      name,
      title: String(member?.designation || member?.email || '').trim(),
      tone: toneFor(name),
      role: roleOf(member, hostName),
      // Presence state does not exist outside a live conference. Defaulting to
      // "unmuted, camera on, no hand" would put a claim on screen the API
      // never made, so these stay neutral until the conference reports them.
      muted: false,
      camOff: false,
      hand: false,
      sharing: false,
      speaking: false,
      net: 'good' as NetQuality,
      external: isExternalMember(member),
      self: Boolean(selfId && id === selfId) || name === selfName,
      waiting: false,
    };
  });

  // "You" belongs first — it is the tile and the row people look for.
  if (!mapped.some((p) => p.self)) {
    mapped.unshift({
      id: selfId || 'self',
      name: selfName,
      title: 'You',
      tone: toneFor(selfName),
      role: hostName === selfName ? 'host' : 'attendee',
      muted: false,
      camOff: false,
      hand: false,
      sharing: false,
      speaking: false,
      net: 'good',
      external: false,
      self: true,
      waiting: false,
    });
    return mapped;
  }

  return [...mapped.filter((p) => p.self), ...mapped.filter((p) => !p.self)];
};

/** Which of the console's three books a row belongs in. */
export const stateOf = (raw: any): MeetingState => {
  const status = String(raw?.status || '').toUpperCase();
  if (status === 'COMPLETED' || status === 'ENDED') return 'past';

  const start = parseTime(raw?.startUtc || raw?.startTimeLocal);
  const end = parseTime(raw?.endUtc || raw?.endTimeLocal);
  const now = moment();

  if (start && end && now.isBetween(start, end, null, '[]')) return 'live';
  if (status === 'ONGOING' || status === 'STARTED') return 'live';
  if (start && start.isBefore(now)) return 'past';
  return 'upcoming';
};

export const toVideoMeeting = (
  raw: any,
  selfName: string,
  selfId?: string,
): VideoMeeting | null => {
  if (!raw || typeof raw !== 'object') return null;

  const start = parseTime(raw?.startUtc || raw?.startTimeLocal);
  const end = parseTime(raw?.endUtc || raw?.endTimeLocal);
  const startsInMins = start ? Math.round(start.diff(moment(), 'minutes', true)) : 0;
  const durationMins = start && end ? Math.max(1, Math.round(end.diff(start, 'minutes'))) : 30;

  const participants = membersToParticipants(raw, selfName, selfId);
  const roomId = String(raw?.meetingId || raw?.meeting_id || '').trim();

  const agenda = String(raw?.agenda || raw?.description || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    id: String(raw?.uuid || raw?.id || roomId || raw?.name),
    title: String(raw?.name || '').trim() || 'Meeting',
    host: String(raw?.hostName || '').trim() || selfName,
    startsInMins,
    durationMins,
    state: stateOf(raw),
    recurring: Boolean(raw?.isRecurring || raw?.recurring),
    recorded: Boolean(raw?.recording),
    // The recap service does not exist yet, so no real row can claim one.
    hasRecap: false,
    pmi: Boolean(raw?.isPersonalRoom || raw?.personalRoom),
    external: participants.some((p) => p.external),
    agenda,
    // Presented in 3-3-4 groups, matching how the invite prints it.
    roomId: roomId.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3') || '—',
    passcode: String(raw?.password || raw?.passcode || '').trim(),
    participants,
    isDemo: false,
  };
};

/** Rows out of a `meetingList` response, whatever page shape came back. */
export const rowsOf = (response: any): any[] => {
  const result = response?.data?.data?.result;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result)) return result;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

export type MeetingInvitePayload = {
  _id?: string;
  messageId?: string;
  chatId: string;
  senderId?: string;
  createdAt?: string;
  [key: string]: unknown;
};

function normalizeMeetingChatId(chatId: unknown): string {
  return String(chatId || '')
    .trim()
    .replace(/^(dev_|qa_|prod_|live_)/, '');
}

function findMeetingPayload(data: unknown, eventName?: string): Record<string, unknown> | null {
  let rawData = data;

  if (Array.isArray(rawData)) {
    rawData =
      (eventName && rawData[0] === eventName ? rawData[1] : undefined) ||
      rawData.find(
        (item) => item && typeof item === 'object' && !Array.isArray(item) && 'chatId' in item,
      );
  }

  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return null;

  const payload = rawData as Record<string, any>;
  const candidates = [
    payload?._doc,
    payload?.data?.data?.result,
    payload?.data?.data,
    payload?.data?.result,
    payload?.data,
    payload,
  ];

  return (
    candidates.find(
      (candidate) =>
        candidate &&
        typeof candidate === 'object' &&
        !Array.isArray(candidate) &&
        String(candidate?.chatId || '').trim(),
    ) || null
  );
}

export function normalizeMeetingInvitePayload(
  data: unknown,
  eventName?: string,
): MeetingInvitePayload | null {
  const payload = findMeetingPayload(data, eventName);
  const chatId = String(payload?.chatId || '').trim();

  if (!payload || !chatId) return null;

  return {
    ...payload,
    chatId,
  } as MeetingInvitePayload;
}

export function getMeetingEventChatId(data: unknown, eventName?: string): string {
  return String(findMeetingPayload(data, eventName)?.chatId || '').trim();
}

export function areMeetingChatIdsEqual(firstChatId: unknown, secondChatId: unknown): boolean {
  const first = normalizeMeetingChatId(firstChatId);
  const second = normalizeMeetingChatId(secondChatId);
  return Boolean(first && second && first === second);
}

export function getMeetingInviteIdentity(invite: any): string {
  const messageId = String(invite?.messageId || '').trim();
  if (messageId) return `message:${messageId}`;

  const recordId = String(invite?._id || '').trim();
  if (recordId) return `record:${recordId}`;

  const chatId = normalizeMeetingChatId(invite?.chatId);
  if (!chatId) return '';

  return [
    'meeting',
    chatId,
    String(invite?.senderId || '').trim(),
    String(invite?.createdAt || '').trim(),
  ].join(':');
}

export function enqueueMeetingInvite(
  previousInvites: unknown,
  incomingInvite: MeetingInvitePayload,
): MeetingInvitePayload[] {
  const invites = Array.isArray(previousInvites) ? previousInvites : [];
  const incomingIdentity = getMeetingInviteIdentity(incomingInvite);
  const existingIndex = invites.findIndex((invite) => {
    const existingIdentity = getMeetingInviteIdentity(invite);
    return (
      (incomingIdentity && existingIdentity === incomingIdentity) ||
      areMeetingChatIdsEqual(invite?.chatId, incomingInvite.chatId)
    );
  });

  if (existingIndex < 0) return [...invites, incomingInvite];

  const existingInvite = invites[existingIndex];
  if (getMeetingInviteIdentity(existingInvite) === incomingIdentity) return invites;

  const nextInvites = [...invites];
  nextInvites[existingIndex] = incomingInvite;
  return nextInvites;
}

export function removeMeetingInvite(
  previousInvites: unknown,
  inviteIdentity: string,
): MeetingInvitePayload[] {
  const invites = Array.isArray(previousInvites) ? previousInvites : [];
  if (!inviteIdentity) return invites;
  return invites.filter((invite) => getMeetingInviteIdentity(invite) !== inviteIdentity);
}

export function removeMeetingInvitesForChat(
  previousInvites: unknown,
  chatId: string,
): MeetingInvitePayload[] {
  const invites = Array.isArray(previousInvites) ? previousInvites : [];
  if (!chatId) return invites;
  return invites.filter((invite) => !areMeetingChatIdsEqual(invite?.chatId, chatId));
}

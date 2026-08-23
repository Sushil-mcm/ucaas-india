const ACTIVE_MONITORING_STATUSES = [
  'answered',
  'connecting',
  'ringing',
  'bridged',
  'on_hold',
  'waiting',
] as const;

export const getMonitoringLiveCalls = (liveCalls?: any[], eventLiveCallsData?: any[]) => {
  if (Array.isArray(liveCalls) && liveCalls.length > 0) return liveCalls;
  return Array.isArray(eventLiveCallsData) ? eventLiveCallsData : [];
};

export const isActiveMonitoringCall = (call: any) =>
  ACTIVE_MONITORING_STATUSES.includes(String(call?.status || '') as any) ||
  call?.call_type === 'conference';

const normalizeMonitoringValue = (value: unknown) =>
  String(value ?? '')
    .replace(/\s+/g, '')
    .trim()
    .replace(/^sip:/i, '')
    .split('@')[0]
    .replace(/_(web|hw)$/i, '');

const isSameMonitoringValue = (left: unknown, right: unknown) => {
  const normalizedLeft = normalizeMonitoringValue(left);
  const normalizedRight = normalizeMonitoringValue(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
};

export const getMonitoringMemberValue = (member: any) =>
  member?.extension ??
  member?.value ??
  member?.number ??
  member?.agent_extension ??
  member?.user_extension ??
  member?.user_detail?.extension ??
  member?.user?.extension ??
  null;

const getMonitoringMemberValues = (member: any) => [
  member?.extension,
  member?.number,
  member?.agent_extension,
  member?.user_extension,
  member?.user_detail?.extension,
  member?.user_detail?.value,
  member?.user_detail?.number,
  member?.user?.extension,
  member?.user?.value,
  member?.user?.number,
  member?.value,
];

const getMonitoringConferenceMembers = (call: any) => {
  if (Array.isArray(call?.conference_members)) return call.conference_members;
  if (Array.isArray(call?.conferenceData?.conference_members)) {
    return call.conferenceData.conference_members;
  }
  return [];
};

const getMonitoringCallMemberValues = (call: any) => [
  call?.agent_extension,
  call?.called_number,
  call?.member_extension,
  call?.user_extension,
  call?.agent?.extension,
  call?.member?.extension,
  call?.member?.number,
  call?.user?.extension,
  call?.from?.extension,
  call?.from?.number,
  call?.from?.agent_extension,
  call?.from?.user_extension,
  call?.to?.extension,
  call?.to?.number,
  call?.to?.agent_extension,
  call?.to?.user_extension,
];

export const isMonitoringCallForMember = (call: any, memberValue: unknown) => {
  const isDirectMember = getMonitoringCallMemberValues(call).some((value) =>
    isSameMonitoringValue(value, memberValue),
  );
  if (isDirectMember) return true;

  return getMonitoringConferenceMembers(call).some((member: any) =>
    getMonitoringMemberValues(member).some((value) => isSameMonitoringValue(value, memberValue)),
  );
};

export const findMonitoringCallForMember = (calls: any[] = [], member: any) => {
  const memberValues =
    member && typeof member === 'object' ? getMonitoringMemberValues(member) : [member];
  return calls.find((call) =>
    memberValues.some((memberValue) => isMonitoringCallForMember(call, memberValue)),
  );
};

export const isMonitoringCallForForwardValue = (call: any, forwardValue: unknown) =>
  [
    call?.forward_value,
    call?.forward_uuid,
    call?.forward_id,
    call?.queue_uuid,
    call?.queue_id,
    call?.campaign_uuid,
    call?.campaign_id,
    call?.department_uuid,
    call?.department_id,
  ].some((value) => isSameMonitoringValue(value, forwardValue));

const parseMonitoringTimestampMs = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  if (/^\d+(\.\d+)?$/.test(rawValue)) {
    const parsedNumeric = Number(rawValue);
    if (!Number.isFinite(parsedNumeric)) return null;
    return parsedNumeric < 1_000_000_000_000 ? parsedNumeric * 1000 : parsedNumeric;
  }

  const parsedDateMs = Date.parse(rawValue);
  return Number.isFinite(parsedDateMs) ? parsedDateMs : null;
};

const getFirstMonitoringTimestampMs = (...values: unknown[]): number | null => {
  for (const value of values) {
    const timestamp = parseMonitoringTimestampMs(value);
    if (timestamp !== null) return timestamp;
  }

  return null;
};

const getConferenceMemberJoinedTimestamp = (member: any): number | null =>
  getFirstMonitoringTimestampMs(
    member?.joined,
    member?.joined_at,
    member?.joinedAt,
    member?.start_time,
    member?.started_at,
    member?.answered_time,
    member?.answered_at,
    member?.bridged_at,
  );

const findMonitoringConferenceMember = (call: any, member: any) => {
  const memberValues =
    member && typeof member === 'object' ? getMonitoringMemberValues(member) : [member];
  const validMemberValues = memberValues.filter((value) => normalizeMonitoringValue(value));
  if (!validMemberValues.length) return null;

  return (
    getMonitoringConferenceMembers(call).find((conferenceMember: any) =>
      getMonitoringMemberValues(conferenceMember).some((conferenceMemberValue) =>
        validMemberValues.some((memberValue) =>
          isSameMonitoringValue(conferenceMemberValue, memberValue),
        ),
      ),
    ) || null
  );
};

export const getMonitoringCallTimestamp = (call: any, member?: any) => {
  const conferenceMember = member ? findMonitoringConferenceMember(call, member) : null;
  const conferenceMemberTimestamp = conferenceMember
    ? getConferenceMemberJoinedTimestamp(conferenceMember)
    : null;
  if (conferenceMemberTimestamp !== null) return conferenceMemberTimestamp;

  return getFirstMonitoringTimestampMs(
    call?.answered_time,
    call?.answered_at,
    call?.bridged_at,
    call?.start_time,
    call?.started_at,
  );
};

export const getMonitoringCallDid = (call: any) => call?.did_number || '---';

export const getMonitoringContactValue = (call: any) => {
  if (!call) return '---';
  if (call?.direction === 'outbound') {
    return call?.contact_name || call?.called_number || '---';
  }
  return call?.contact_name || call?.caller_number || '---';
};

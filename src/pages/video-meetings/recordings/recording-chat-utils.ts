const getMemberUserInfo = (member: any) => member?.user_info || member?.userInfo || {};

const getMemberUuid = (member: any) => {
  const userInfo = getMemberUserInfo(member);
  return String(
    member?.uuid ||
      member?.user_uuid ||
      member?.userId ||
      member?.user_id ||
      member?.id ||
      userInfo?.uuid ||
      '',
  ).trim();
};

const getMemberName = (member: any) => {
  const userInfo = getMemberUserInfo(member);
  const firstName = member?.first_name || member?.firstName || userInfo?.first_name || '';
  const lastName = member?.last_name || member?.lastName || userInfo?.last_name || '';

  return (
    member?.name ||
    `${firstName || ''} ${lastName || ''}`.trim() ||
    member?.email ||
    userInfo?.email ||
    'Unknown User'
  );
};

const flattenRecordingMembers = (record: any): any[] => {
  const rawMembers = record?.meeting?.members;
  if (!Array.isArray(rawMembers)) return [];

  return rawMembers.flatMap((memberGroup: any) => {
    if (Array.isArray(memberGroup)) return memberGroup;
    if (Array.isArray(memberGroup?.user_detail)) return memberGroup.user_detail;
    return [memberGroup];
  });
};

export const buildRecordingChatUsers = (record: any, currentUser: any) => {
  const usersById = new Map<string, any>();

  const addMember = (member: any) => {
    const uuid = getMemberUuid(member);
    if (!uuid) return;

    const userInfo = getMemberUserInfo(member);
    usersById.set(uuid, {
      ...member,
      uuid,
      user_uuid: member?.user_uuid || member?.userId || uuid,
      name: getMemberName(member),
      first_name: member?.first_name || member?.firstName || userInfo?.first_name || '',
      last_name: member?.last_name || member?.lastName || userInfo?.last_name || '',
      email: member?.email || userInfo?.email || '',
      profile: member?.profile || userInfo?.profile || '',
      extension: member?.extension || userInfo?.extension || '',
      type: member?.type,
    });
  };

  flattenRecordingMembers(record).forEach(addMember);

  const currentUserInfo = currentUser?.user_info || currentUser || {};
  const currentMember = {
    ...currentUserInfo,
    uuid: currentUser?.uuid || currentUserInfo?.uuid,
    user_uuid: currentUser?.uuid || currentUserInfo?.uuid,
    name:
      `${currentUserInfo?.first_name || ''} ${currentUserInfo?.last_name || ''}`.trim() ||
      currentUserInfo?.name,
  };
  const currentMemberUuid = getMemberUuid(currentMember);
  if (currentMemberUuid && !usersById.has(currentMemberUuid)) {
    addMember(currentMember);
  }

  return Array.from(usersById.values());
};

export const normalizeExtension = (value: unknown): string => {
  return String(value ?? '').trim();
};

export const normalizeDialTargetUserPart = (value: unknown): string => {
  const normalizedValue = String(value ?? '').replace(/\s+/g, '').trim();
  if (!normalizedValue) return '';

  const withoutSipPrefix = normalizedValue.toLowerCase().startsWith('sip:')
    ? normalizedValue.slice(4)
    : normalizedValue;
  const userPart = (withoutSipPrefix.split('@')[0] || '').replace(/_web$/i, '');

  return userPart.trim();
};

export const isExtensionDialTarget = (value: unknown, maxLength = 4): boolean => {
  const userPart = normalizeDialTargetUserPart(value);
  if (!userPart) return false;
  if (userPart.startsWith('*') || userPart.startsWith('#')) return false;
  if (!/^\+?\d+$/.test(userPart)) return false;

  const digitsOnlyValue = userPart.replace(/\D/g, '');
  return Boolean(digitsOnlyValue) && digitsOnlyValue.length <= maxLength;
};

export const getUserExtension = (user: any): string => {
  return normalizeExtension(
    user?.extension ??
      user?.user_info?.extension ??
      user?.user_detail?.extension ??
      user?.value,
  );
};

export const getUserDisplayName = (user: any): string => {
  const directName = String(user?.name || user?.fullName || '').trim();
  if (directName) return directName;

  const firstName = String(
    user?.first_name ?? user?.firstName ?? user?.user_info?.first_name ?? user?.user_detail?.first_name ?? '',
  ).trim();
  const lastName = String(
    user?.last_name ?? user?.lastName ?? user?.user_info?.last_name ?? user?.user_detail?.last_name ?? '',
  ).trim();
  const fullName = `${firstName}${lastName ? ` ${lastName}` : ''}`.trim();
  if (fullName) return fullName;

  const email = String(user?.email ?? user?.user_info?.email ?? user?.user_detail?.email ?? '').trim();
  if (email) return email;

  return 'Unknown User';
};

export const findUserByExtension = <T = any>(users: T[] = [], extension: string): T | null => {
  const normalizedTarget = normalizeExtension(extension);
  if (!normalizedTarget || !Array.isArray(users) || users.length === 0) return null;

  const matchedUser = users.find((user: any) => getUserExtension(user) === normalizedTarget);
  return matchedUser ?? null;
};

export const getUserNameByExtension = <T = any>(
  users: T[] = [],
  extension: string,
  fallbackName = 'Unknown User',
): string => {
  const user = findUserByExtension(users, extension);
  if (!user) return fallbackName;
  return getUserDisplayName(user);
};

export const createExtensionNameMap = (users: any[] = []): Record<string, string> => {
  return users.reduce(
    (acc, user) => {
      const extension = getUserExtension(user);
      if (!extension) return acc;
      acc[extension] = getUserDisplayName(user);
      return acc;
    },
    {} as Record<string, string>,
  );
};

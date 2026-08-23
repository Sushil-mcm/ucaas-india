const OMNI_ACCESS_KEY_BY_TYPE = {
  whatsapp: 'WHATSAPP',
  facebook: 'FACEBOOK',
  messenger: 'FACEBOOK',
  instagram: 'INSTAGRAM',
  telegram: 'TELEGRAM',
  viber: 'VIBER',
} as const;

export const normalizeOmniType = (type?: string) => String(type || '').toLowerCase();

export const canUseOmniChannel = (omniFeature: any, channelType?: string) => {
  const normalizedType = normalizeOmniType(channelType);
  const accessKey = OMNI_ACCESS_KEY_BY_TYPE[normalizedType as keyof typeof OMNI_ACCESS_KEY_BY_TYPE];

  if (!accessKey) return false;
  if (!omniFeature?.IS_SHOW || !omniFeature?.action?.view) return false;

  return Boolean(omniFeature?.access?.[accessKey]);
};

export const getAllowedOmniChannels = (omniFeature: any, channels: any[] = []) => {
  return (channels || []).filter((channel: any) => canUseOmniChannel(omniFeature, channel?.type));
};

import { useMemo } from 'react';
import { getEnv } from '@/lib/utils';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media';

interface UseMediaBlobOptions {
  serverFileName?: string | null;
  company_uuid?: string | null;
  type?: string;
  enabled?: boolean;
}

export const useMediaBlob = ({
  serverFileName,
  company_uuid,
  type = 'chat',
  enabled = true,
}: UseMediaBlobOptions) => {
  const mediaUrl = useMemo(() => {
    if (!company_uuid || !serverFileName) return '';
    return `${getEnv().VITE_API_BASE_URL}/api/media/${company_uuid}/${type}/${encodeURIComponent(serverFileName)}`;
  }, [serverFileName, company_uuid, type]);

  return useAuthenticatedMediaUrl(
    mediaUrl,
    Boolean(enabled && mediaUrl && serverFileName && company_uuid),
  );
};

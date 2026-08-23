import { useState } from 'react';
import { DownloadIcon, Loader2 } from 'lucide-react';
import { getEnv, SESSION_NAME } from '@/lib/utils';
import CustomTooltip from '@/components/custom/custom-tooltip';

interface DownloadButtonProps {
  file_name: string;
  company_uuid: string;
  fileName: string;
  type?: 'chat' | 'video_recording';
  className?: string;
  size?: string;
  recordingView?: boolean;
}

const DownloadButton = ({
  file_name = '',
  company_uuid = '',
  fileName = 'file',
  type = 'chat',
  className = '',
  size = 'size-4',
  recordingView = false,
}: DownloadButtonProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadFileInBrowser = async (url: string) => {
    if (!url || isDownloading) return;
    setIsDownloading(true);
    try {
      const accessToken = localStorage.getItem(SESSION_NAME) || '';
      const response = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(link.href);
      link.remove();
    } catch (error) {
      console.error('Failed to download file:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const mediaUrl = `${getEnv().VITE_API_BASE_URL}/api/media/${company_uuid}/${type}/${encodeURIComponent(file_name || '')}`;
  if (recordingView) {
    return (
      <CustomTooltip text="Download" side="top">
        <button
          type="button"
          className="inline-flex cursor-pointer h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f1f5f9]"
          onClick={() => {
            if (!isDownloading) {
              downloadFileInBrowser(mediaUrl);
            }
          }}
          title="Download"
          disabled={!file_name || !company_uuid}
        >
          {isDownloading ? (
            <Loader2 className={`animate-spin ${className} ${size}`} />
          ) : (
            <DownloadIcon className={`${className} ${size}`} />
          )}
        </button>
      </CustomTooltip>
    );
  }
  return (
    <button
      type="button"
      className="cursor-pointer"
      onClick={() => {
        if (!isDownloading) {
          downloadFileInBrowser(mediaUrl);
        }
      }}
      title="Download"
      disabled={!file_name || !company_uuid}
    >
      {isDownloading ? (
        <Loader2 className={`animate-spin ${className} ${size}`} />
      ) : (
        <DownloadIcon className={`${className} ${size}`} />
      )}
    </button>
  );
};

export default DownloadButton;

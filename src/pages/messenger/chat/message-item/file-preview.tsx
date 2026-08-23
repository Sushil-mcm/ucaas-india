import { useMemo, useState } from 'react';
import { File, ImageIcon, VideoIcon } from 'lucide-react';
import { FILE_TYPES, getExtension, getFileType } from '../utils';
import { useMediaBlob } from './use-media-blob';
import LightBoxPreview from './lightbox-preview';

interface FilePreviewProps {
  filename: string;
  company_uuid?: string;
  type?: string;
  size?: number;
  showText?: boolean;
  onPreview?: () => void;
  disableOpen?: boolean;
}

const extensionToIcon: Record<string, { icon?: string; label: string }> = {
  [FILE_TYPES.DOCUMENT]: { label: 'Document' },
  [FILE_TYPES.SPREADSHEET]: { label: 'Spreadsheet' },
  [FILE_TYPES.PRESENTATION]: { label: 'Presentation' },
  [FILE_TYPES.PDF]: { label: 'PDF' },
  [FILE_TYPES.TEXT]: { label: 'Text' },
  [FILE_TYPES.JSON]: { label: 'JSON' },
  [FILE_TYPES.MARKDOWN]: { label: 'Markdown' },
  [FILE_TYPES.CODE]: { label: 'Code' },
  [FILE_TYPES.IMAGE]: { label: 'Image' },
  [FILE_TYPES.VIDEO]: { label: 'Video' },
  [FILE_TYPES.AUDIO]: { label: 'Audio' },
  [FILE_TYPES.ARCHIVE]: { label: 'Archive' },
  [FILE_TYPES.FILE]: { label: 'File' },
};

const getDocumentIcon = (filename: string) => {
  const ext = getExtension(filename);
  if (!ext) return null;
  return (
    <div className="w-full h-full rounded bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] uppercase">
      {ext.slice(0, 3)}
    </div>
  );
};

const FilePreview = ({
  filename,
  company_uuid,
  type = 'chat',
  size = 24,
  showText = false,
  onPreview,
  disableOpen = false,
}: FilePreviewProps) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const { data: mediaUrlServer } = useMediaBlob({
    serverFileName: filename,
    company_uuid,
    type,
    enabled: Boolean(filename && company_uuid),
  });

  const fileType = getFileType(filename);
  const mapping = useMemo(
    () => extensionToIcon[fileType] || extensionToIcon[FILE_TYPES.FILE],
    [fileType],
  );

  const handleClick = () => {
    if (disableOpen) return;

    if (onPreview) {
      onPreview();
      return;
    }

    if (mapping?.label === 'Image' || mapping?.label === 'Video') {
      setIsLightboxOpen(true);
      return;
    }

    if (mediaUrlServer) {
      window.open(mediaUrlServer, '_blank', 'noopener,noreferrer');
    }
  };

  const docIcon = getDocumentIcon(filename);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          style={{
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: mapping?.label === 'Image' ? 'transparent' : undefined,
          }}
          className={
            disableOpen ? 'overflow-hidden cursor-default' : 'cursor-pointer overflow-hidden'
          }
          onClick={handleClick}
        >
          {mapping?.label === 'Image' ? (
            mediaUrlServer ? (
              <img
                src={mediaUrlServer}
                className="object-cover w-full h-full block"
                width={size}
                height={size}
                alt={filename}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full rounded bg-gray-100 text-gray-500 flex items-center justify-center">
                <ImageIcon size={Math.max(14, size - 8)} />
              </div>
            )
          ) : docIcon ? (
            <div className="w-full h-full p-0">{docIcon}</div>
          ) : mapping?.label === 'Video' ? (
            <VideoIcon size={size} className="text-gray-500" />
          ) : (
            <File size={size} />
          )}
        </button>
        {showText ? <span className="ml-2 truncate max-w-[150px]">{filename}</span> : null}
      </div>

      {isLightboxOpen && mediaUrlServer ? (
        <LightBoxPreview
          open={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          mediaUrl={mediaUrlServer}
          alt={filename}
          type={mapping?.label === 'Video' ? 'video' : 'image'}
        />
      ) : null}
    </>
  );
};

export default FilePreview;

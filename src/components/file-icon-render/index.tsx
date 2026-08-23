import { PDFIcon } from '@/assets/icons';
import {
  File,
  FileArchive,
  FileIcon,
  FileImage,
  FileMusic,
  FileText,
  FileVideo,
} from 'lucide-react';

const FileIconRender = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case 'csv':
    case 'xls':
    case 'xlsx':
    case 'ms-excel':
    case 'msexcel':
      return (
        <>
          <File className="h-7 w-7 text-green-400" />
        </>
      );

    case 'pdf':
      return (
        <>
          <PDFIcon className="text-grey-400 h-7 w-7" />
        </>
      );

    case 'msword':
    case 'ms-word':
    case 'docx':
    case 'doc':
    case 'rtf':
      return (
        <>
          <File className="h-7 w-7 text-ucass-active-bg" />
        </>
      );

    case 'txt':
      return (
        <>
          <FileText className="h-7 w-7 text-grey-600" />
        </>
      );

    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
      return (
        <>
          <FileImage className="h-7 w-7 text-ucass-active" />
        </>
      );

    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
    case 'ogg':
      return (
        <>
          <FileMusic className="h-7 w-7 text-red-500" />
        </>
      );

    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
    case 'flv':
    case 'webm':
      return (
        <>
          <FileVideo className="h-7 w-7 text-purple-500" />
        </>
      );

    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
      return (
        <>
          <FileArchive className="h-7 w-7 text-yellow-500" />
        </>
      );

    default:
      return (
        <>
          <FileIcon />
        </>
      );
  }
};
export default FileIconRender;

export const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'];

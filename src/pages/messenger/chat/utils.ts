export const FILE_TYPES = {
  IMAGE: 'Image',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  DOCUMENT: 'Document',
  SPREADSHEET: 'Spreadsheet',
  PRESENTATION: 'Presentation',
  PDF: 'PDF',
  TEXT: 'Text',
  JSON: 'JSON',
  MARKDOWN: 'Markdown',
  CODE: 'Code',
  ARCHIVE: 'Archive',
  FILE: 'File',
} as const;

export type FileType = (typeof FILE_TYPES)[keyof typeof FILE_TYPES];

const EXTENSION_MAP: Record<string, FileType> = {
  doc: FILE_TYPES.DOCUMENT,
  docx: FILE_TYPES.DOCUMENT,
  xls: FILE_TYPES.SPREADSHEET,
  xlsx: FILE_TYPES.SPREADSHEET,
  csv: FILE_TYPES.SPREADSHEET,
  ppt: FILE_TYPES.PRESENTATION,
  pptx: FILE_TYPES.PRESENTATION,
  pdf: FILE_TYPES.PDF,
  txt: FILE_TYPES.TEXT,
  json: FILE_TYPES.JSON,
  md: FILE_TYPES.MARKDOWN,
  js: FILE_TYPES.CODE,
  jsx: FILE_TYPES.CODE,
  ts: FILE_TYPES.CODE,
  tsx: FILE_TYPES.CODE,
  html: FILE_TYPES.CODE,
  css: FILE_TYPES.CODE,
  jpg: FILE_TYPES.IMAGE,
  jpeg: FILE_TYPES.IMAGE,
  png: FILE_TYPES.IMAGE,
  gif: FILE_TYPES.IMAGE,
  svg: FILE_TYPES.IMAGE,
  webp: FILE_TYPES.IMAGE,
  bmp: FILE_TYPES.IMAGE,
  heic: FILE_TYPES.IMAGE,
  heif: FILE_TYPES.IMAGE,
  mp4: FILE_TYPES.VIDEO,
  mov: FILE_TYPES.VIDEO,
  avi: FILE_TYPES.VIDEO,
  webm: FILE_TYPES.VIDEO,
  mkv: FILE_TYPES.VIDEO,
  mp3: FILE_TYPES.AUDIO,
  wav: FILE_TYPES.AUDIO,
  ogg: FILE_TYPES.AUDIO,
  m4a: FILE_TYPES.AUDIO,
  aac: FILE_TYPES.AUDIO,
  zip: FILE_TYPES.ARCHIVE,
  rar: FILE_TYPES.ARCHIVE,
  tar: FILE_TYPES.ARCHIVE,
  gz: FILE_TYPES.ARCHIVE,
};

export const getExtension = (name: string): string => {
  const parts = name?.split('.');
  if (parts && parts.length > 1) {
    return parts.pop()?.toLowerCase() || '';
  }
  return '';
};

export const getFileType = (filename: string): FileType => {
  const ext = getExtension(filename);
  return EXTENSION_MAP[ext] || FILE_TYPES.FILE;
};

export const isImageFile = (filename: string): boolean => {
  return getFileType(filename) === FILE_TYPES.IMAGE;
};

export const isVideoFile = (filename: string): boolean => {
  return getFileType(filename) === FILE_TYPES.VIDEO;
};

export const isAudioFile = (filename: string): boolean => {
  return getFileType(filename) === FILE_TYPES.AUDIO;
};

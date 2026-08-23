// export const getGridClasses = (count: number) => {
//   const gridMap: Record<number, string> = {
//     0: 'grid-rows-1 grid-cols-1 w-[90%] part-1 place-items-center',
//     1: 'grid-rows-1 grid-cols-2 w-[90%] place-items-center',
//     2: 'grid-rows-2 grid-cols-2 max-w-[90%] part-3',
//     3: 'grid-rows-2 grid-cols-2 max-w-[90%]',
//     4: 'grid-rows-2 grid-cols-3 max-w-[90%] part-5',
//     5: 'grid-rows-2 grid-cols-3 max-w-[90%] part-6',
//     6: 'grid-rows-3 grid-cols-3 max-w-[90%] part-7',
//     7: 'grid-rows-3 grid-cols-3 max-w-[90%] part-8',
//     8: 'grid-rows-3 grid-cols-3 max-w-[90%]',
//     9: 'grid-rows-3 grid-cols-4 max-w-[90%] video-full',
//     10: 'grid-rows-3 grid-cols-4 max-w-[90%] video-full',
//     11: 'grid-rows-3 grid-cols-4 max-w-[90%] video-full',
//     12: 'grid-rows-4 grid-cols-4 max-w-[90%] video-full',
//     13: 'grid-rows-4 grid-cols-4 max-w-[90%] video-full',
//     14: 'grid-rows-4 grid-cols-4 max-w-[90%] video-full',
//     15: 'grid-rows-4 grid-cols-4 max-w-[90%] video-full',
//     16: 'grid-rows-4 grid-cols-5 max-w-[90%] video-full',
//     17: 'grid-rows-4 grid-cols-5 max-w-[90%] video-full',
//     18: 'grid-rows-4 grid-cols-5 max-w-[90%] video-full',
//     19: 'grid-rows-4 grid-cols-5 max-w-[90%] video-full',
//     20: 'grid-rows-4 grid-cols-6 max-w-[90%] video-full',
//     21: 'grid-rows-4 grid-cols-6 max-w-[90%] video-full',
//     22: 'grid-rows-4 grid-cols-6 max-w-[90%] video-full',
//     23: 'grid-rows-4 grid-cols-6 max-w-[90%] video-full',
//   };

//   if (count >= 24) return 'grid-rows-5 grid-cols-6 max-w-[90%]';
//   return gridMap[count];
// };
export const getGridClasses = (count: number) => {
  const totalCount = count + 1;
  const gridMap: Record<number, string> = {
    1: 'grid-cols-1 grid-rows-1 w-full h-full place-items-center',
    2: 'grid-cols-2 grid-rows-1 w-full h-full place-items-center',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full h-full place-items-center',
    4: 'grid-cols-2 grid-rows-2 w-full h-full place-items-center',
    5: 'grid-cols-2 sm:grid-cols-3 w-full h-full place-items-center',
    6: 'grid-cols-3 grid-rows-2 w-full h-full place-items-center',
    7: 'grid-cols-3 grid-rows-3 w-full h-full place-items-center',
    8: 'grid-cols-4 grid-rows-2 w-full h-full place-items-center',
    9: 'grid-cols-3 grid-rows-3 w-full h-full place-items-center',
  };

  if (totalCount > 9) {
    const cols = Math.ceil(Math.sqrt(totalCount));
    const rows = Math.ceil(totalCount / cols);
    return `grid-cols-${cols} grid-rows-${rows} w-full h-full`;
  }

  return gridMap[totalCount] || 'grid-cols-2 grid-rows-2 w-full h-full';
};

export const COUNTRY_CODES = {
  en: ['en', 'en-US'],
  af: ['af', 'af-ZA'],
  ar: ['ar', 'ar-SA'],
  bg: ['bg', 'bg-BG'],
  ca: ['ca', 'ca-ES'],
  cs: ['cs', 'cs-CZ'],
  da: ['da', 'da-DK'],
  de: ['de', 'de-DE'],
  el: ['el', 'el-GR'],
  et: ['et', 'et-EE'],
  enGB: ['en', 'en-GB'],
  es: ['es', 'es-ES'],
  esUS: ['es', 'es-US'],
  eu: ['eu', 'eu-ES'],
  fi: ['fi', 'fi-FI'],
  fr: ['fr', 'fr-FR'],
  frCA: ['fr', 'fr-CA'],
  he: ['he', 'he-IL'],
  hi: ['hi', 'hi-IN'],
  hr: ['hr', 'hr-HR'],
  hu: ['hu', 'hu-HU'],
  id: ['id', 'id-ID'],
  it: ['it', 'it-IT'],
  ja: ['ja', 'ja-JP'],
  ko: ['ko', 'ko-KR'],
  lt: ['lt', 'lt-LT'],
  ms: ['ms', 'ms-MY'],
  nl: ['nl', 'nl-NL'],
  pa: ['pa', 'pa-IN'],
  fa: ['fa', 'fa-IR'],
  pl: ['pl', 'pl-PL'],
  pt: ['pt', 'pt-PT'],
  ptBR: ['pt', 'pt-BR'],
  ru: ['ru', 'ru-RU'],
  ro: ['ro', 'ro-RO'],
  sk: ['sk', 'sk-SK'],
  sl: ['sl', 'sl-SI'],
  sr: ['sr', 'sr-RS'],
  sv: ['sv', 'sv-SE'],
  tl: ['tl ', 'tl-PH'],
  ta: ['ta', 'ta-IN'],
  te: ['te', 'te-IN'],
  th: ['th', 'th-TH'],
  tr: ['tr', 'tr-TR'],
  uk: ['uk', 'uk-UA'],
  vi: ['vi', 'vi-VN'],
  zhCN: ['zh', 'zh-CN'],
  zhTW: ['zh-TW', 'zh-TW'],
};

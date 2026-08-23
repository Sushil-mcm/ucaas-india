/**
 * Icon sprite for the MCM Unified Video console.
 *
 * Same shape as the phone console's sprite (`./phone/console/icons.tsx`) —
 * a single hidden <svg><defs> of <g> groups, referenced by <use>. Ids are
 * prefixed `mcmv-` so the two sprites can be mounted on the same page
 * without colliding.
 */
export type VideoIconName =
  | 'video'
  | 'videooff'
  | 'mic'
  | 'micoff'
  | 'share'
  | 'shareoff'
  | 'hand'
  | 'chat'
  | 'users'
  | 'rec'
  | 'hangup'
  | 'spark'
  | 'send'
  | 'plus'
  | 'gallery'
  | 'speaker'
  | 'sidebar'
  | 'together'
  | 'pin'
  | 'spotlight'
  | 'cc'
  | 'globe'
  | 'board'
  | 'poll'
  | 'qa'
  | 'breakout'
  | 'more'
  | 'lock'
  | 'shield'
  | 'clock'
  | 'cal'
  | 'search'
  | 'chev'
  | 'x'
  | 'check'
  | 'copy'
  | 'link'
  | 'phone'
  | 'blur'
  | 'frame'
  | 'wand'
  | 'sliders'
  | 'wifi'
  | 'expand'
  | 'shrink'
  | 'smile'
  | 'star'
  | 'dl'
  | 'alert'
  | 'note'
  | 'filter'
  | 'eye'
  | 'play'
  | 'pause'
  | 'bolt'
  | 'brain'
  | 'list'
  | 'timer'
  | 'key'
  | 'user'
  | 'usercheck'
  | 'volume'
  | 'trash'
  | 'edit'
  | 'grid'
  | 'arrow'
  | 'trend'
  | 'stop';

export const VideoIconSprite = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
    <defs dangerouslySetInnerHTML={{ __html: SPRITE }} />
  </svg>
);

export const Ic = ({
  n,
  size,
  fill = false,
  className = '',
}: {
  n: VideoIconName;
  size?: number;
  fill?: boolean;
  className?: string;
}) => (
  <svg
    className={`ic${fill ? ' fill' : ''}${className ? ` ${className}` : ''}`}
    viewBox="0 0 24 24"
    style={size ? { width: size, height: size } : undefined}
    aria-hidden="true"
  >
    <use href={`#mcmv-${n}`} />
  </svg>
);

const SPRITE = `<g id="mcmv-video"><path d="M23 7.5 16.5 12 23 16.5zM3 5.5h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/></g>
<g id="mcmv-videooff"><path d="m2 2 20 20M16 10.5 23 7.5v9l-3.5-2.4M14.6 5.5H3a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4"/></g>
<g id="mcmv-mic"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></g>
<g id="mcmv-micoff"><path d="m2 2 20 20M9 9v3a3 3 0 0 0 5.1 2.1M15 10.5V5a3 3 0 0 0-5.9-.8M19 10v2a7 7 0 0 1-1.1 3.8M12 19v3M5 10v2a7 7 0 0 0 10 6.3"/></g>
<g id="mcmv-share"><path d="M3 4.5h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1zM8 20.5h8M12 16.5v4M12 13V7M9 10l3-3 3 3"/></g>
<g id="mcmv-shareoff"><path d="m2 2 20 20M8 20.5h8M12 16.5v4M21.9 15.4a1 1 0 0 0 .1-.4v-9.5a1 1 0 0 0-1-1H7.5M3.2 4.7A1 1 0 0 0 2 5.5v10a1 1 0 0 0 1 1h14"/></g>
<g id="mcmv-hand"><path d="M8 11V4.8a1.8 1.8 0 0 1 3.6 0V11M11.6 10.4V3.6a1.8 1.8 0 0 1 3.6 0V11M15.2 11V6a1.8 1.8 0 0 1 3.6 0v8a7 7 0 0 1-7 7h-1a6 6 0 0 1-4.5-2L4 16.3a1.8 1.8 0 0 1 2.5-2.5L8 15V11a1.8 1.8 0 0 0-3.6 0"/></g>
<g id="mcmv-chat"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 4 12a8.4 8.4 0 0 1 8.5-8.5A8.4 8.4 0 0 1 21 11.5z"/></g>
<g id="mcmv-users"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></g>
<g id="mcmv-rec"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/></g>
<g id="mcmv-stop"><rect x="5" y="5" width="14" height="14" rx="2.5"/></g>
<g id="mcmv-hangup"><path d="M2.5 11.2a13 13 0 0 1 19 0 1.6 1.6 0 0 1 .1 2.1l-1.5 1.8a1.6 1.6 0 0 1-2 .4l-2.4-1.3a1.6 1.6 0 0 1-.8-1.6l.2-1.4a9.3 9.3 0 0 0-6.2 0l.2 1.4a1.6 1.6 0 0 1-.8 1.6l-2.4 1.3a1.6 1.6 0 0 1-2-.4l-1.5-1.8a1.6 1.6 0 0 1 .1-2.1z"/></g>
<g id="mcmv-spark"><path d="M12 1.8 15.3 8.7 22.2 12 15.3 15.3 12 22.2 8.7 15.3 1.8 12 8.7 8.7z"/></g>
<g id="mcmv-send"><path d="M21.5 12 3 3.5 6.5 12 3 20.5zM6.5 12H21"/></g>
<g id="mcmv-plus"><path d="M12 5v14M5 12h14"/></g>
<g id="mcmv-gallery"><rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/></g>
<g id="mcmv-speaker"><rect x="3" y="4" width="18" height="11" rx="2"/><rect x="3" y="17" width="5" height="3.5" rx="1"/><rect x="9.5" y="17" width="5" height="3.5" rx="1"/><rect x="16" y="17" width="5" height="3.5" rx="1"/></g>
<g id="mcmv-sidebar"><rect x="3" y="4" width="13" height="16" rx="2"/><rect x="18" y="4" width="3" height="4.8" rx="1"/><rect x="18" y="9.6" width="3" height="4.8" rx="1"/><rect x="18" y="15.2" width="3" height="4.8" rx="1"/></g>
<g id="mcmv-together"><path d="M3 19a5 5 0 0 1 5-4h8a5 5 0 0 1 5 4M6 19v2M18 19v2"/><circle cx="8.5" cy="8" r="2.8"/><circle cx="15.5" cy="8" r="2.8"/></g>
<g id="mcmv-pin"><path d="M12 17v5M8 3h8l-1 6 3 3v2H6v-2l3-3z"/></g>
<g id="mcmv-spotlight"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></g>
<g id="mcmv-cc"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M10 10.2a2.6 2.6 0 1 0 0 3.6M17.5 10.2a2.6 2.6 0 1 0 0 3.6"/></g>
<g id="mcmv-globe"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/></g>
<g id="mcmv-board"><rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M12 16.5V21M8 21h8M7 12l2.5-3 2.5 2.5L15 7.5"/></g>
<g id="mcmv-poll"><path d="M6 20V10M12 20V4M18 20v-6M3 20h18"/></g>
<g id="mcmv-qa"><circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.3-2.6 4M12 17.3v.1"/></g>
<g id="mcmv-breakout"><rect x="2.5" y="3.5" width="8" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="8" height="7" rx="1.8"/><rect x="2.5" y="13.5" width="8" height="7" rx="1.8"/><path d="M17.5 13.5v7M14 17h7"/></g>
<g id="mcmv-more"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></g>
<g id="mcmv-lock"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></g>
<g id="mcmv-shield"><path d="M12 2.5 4 6v6c0 5 3.4 8.6 8 9.5 4.6-.9 8-4.5 8-9.5V6z"/><path d="m9 12 2 2 4-4"/></g>
<g id="mcmv-clock"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.3 2"/></g>
<g id="mcmv-timer"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4M9.5 2h5M18.5 6.5 20 5"/></g>
<g id="mcmv-cal"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></g>
<g id="mcmv-search"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></g>
<g id="mcmv-chev"><path d="m9 5 7 7-7 7"/></g>
<g id="mcmv-x"><path d="M5 5l14 14M19 5 5 19"/></g>
<g id="mcmv-check"><path d="m4 12.5 5.5 5.5L20 6.5"/></g>
<g id="mcmv-copy"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></g>
<g id="mcmv-link"><path d="M10 13.5a4 4 0 0 0 5.7.4l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7M14 10.5a4 4 0 0 0-5.7-.4l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7"/></g>
<g id="mcmv-phone"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></g>
<g id="mcmv-blur"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M7 5.6v12.8M17 5.6v12.8M3.6 8.5h16.8M3.6 15.5h16.8"/></g>
<g id="mcmv-frame"><path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3"/><circle cx="12" cy="12" r="3"/></g>
<g id="mcmv-wand"><path d="m14 4 6 6L8 22l-6-6zM16.5 1.5 17 3.5 19 4l-2 .5-.5 2-.5-2L14 4l2-.5zM21 8.5l.4 1.6 1.6.4-1.6.4-.4 1.6-.4-1.6-1.6-.4 1.6-.4z"/></g>
<g id="mcmv-sliders"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></g>
<g id="mcmv-wifi"><path d="M2 8.5a15 15 0 0 1 20 0M5 12.3a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.1"/></g>
<g id="mcmv-expand"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></g>
<g id="mcmv-shrink"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></g>
<g id="mcmv-smile"><circle cx="12" cy="12" r="9"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0M9 9.5v.1M15 9.5v.1"/></g>
<g id="mcmv-star"><path d="m12 3 2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z"/></g>
<g id="mcmv-dl"><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></g>
<g id="mcmv-alert"><path d="M12 3 2.5 20h19zM12 10v4M12 17.2v.1"/></g>
<g id="mcmv-note"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"/></g>
<g id="mcmv-filter"><path d="M3 4h18l-7 8v7l-4 2v-9z"/></g>
<g id="mcmv-eye"><path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></g>
<g id="mcmv-play"><path d="M6 3.5 20 12 6 20.5z"/></g>
<g id="mcmv-pause"><path d="M7 4h3v16H7zM14 4h3v16h-3z"/></g>
<g id="mcmv-bolt"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></g>
<g id="mcmv-brain"><path d="M9.5 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5.3A3 3 0 0 0 5.6 16 3 3 0 0 0 9 20.5a2.5 2.5 0 0 0 3-2.4V5.5A2.5 2.5 0 0 0 9.5 3zM14.5 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5.3A3 3 0 0 1 18.4 16 3 3 0 0 1 15 20.5a2.5 2.5 0 0 1-3-2.4"/></g>
<g id="mcmv-list"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.1M3.5 12h.1M3.5 18h.1"/></g>
<g id="mcmv-key"><circle cx="7.5" cy="15.5" r="4"/><path d="m10.5 12.5 8-8M16 7l2.5 2.5M14 9l2.5 2.5"/></g>
<g id="mcmv-user"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></g>
<g id="mcmv-usercheck"><circle cx="9.5" cy="8" r="4"/><path d="M2 21a7.5 7.5 0 0 1 13-5M16.5 18.5l2 2 4-4.5"/></g>
<g id="mcmv-volume"><path d="M3 10v4a1 1 0 0 0 1 1h2.5L11 19V5L6.5 9H4a1 1 0 0 0-1 1zM15.5 9.5a3.5 3.5 0 0 1 0 5M18.5 6.5a7.5 7.5 0 0 1 0 11"/></g>
<g id="mcmv-trash"><path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5 7.5 21h9l1-14.5M10 10.5v6.5M14 10.5v6.5"/></g>
<g id="mcmv-edit"><path d="M4 20h4L20 8l-4-4L4 16zM14.5 5.5l4 4"/></g>
<g id="mcmv-grid"><circle cx="6" cy="6" r="1.4"/><circle cx="12" cy="6" r="1.4"/><circle cx="18" cy="6" r="1.4"/><circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/><circle cx="6" cy="18" r="1.4"/><circle cx="12" cy="18" r="1.4"/><circle cx="18" cy="18" r="1.4"/></g>
<g id="mcmv-arrow"><path d="M4 12h15M13 6l6 6-6 6"/></g>
<g id="mcmv-trend"><path d="M3 17l6-6 4 4 8-8M21 7h-5M21 7v5"/></g>`;

import {
  ChatLine,
  Instagram,
  LetterLine,
  Messanger,
  TelegramIcon,
  Unread,
  WhatsappIcon,
} from '@/assets/icons';

export const ChatChannels = [
  // {
  //   label: 'All Channels',
  //   value: 'all_channels',
  //   icon: () => <></>,
  // },

  {
    label: 'Chat',
    value: 'chat',
    icon: () => <ChatLine className="w-6 h-6 text-gray-900" />,
  },
  // {
  //   label: 'Whatsapp',
  //   value: 'whatsapp',
  //   icon: () => <WhatsappIcon className="w-8 h-8" />,
  // },
  // {
  //   label: 'Instagram',
  //   value: 'instagram',
  //   icon: () => <Instagram className="w-8 h-8" />,
  // },
  // {
  //   label: 'Facebook',
  //   value: 'facebook',
  //   icon: () => <Messanger className="w-8 h-8" />,
  // },
];

export const CHANNELS_ICON = {
  facebook: <Messanger className="w-8 h-8" />,
  messenger: <Messanger className="w-8 h-8" />,
  instagram: <Instagram className="w-8 h-8" />,
  whatsapp: <WhatsappIcon className="w-8 h-8" />,
  telegram: <TelegramIcon className="w-8 h-8" />,
  chat: <ChatLine className="w-6 h-6 text-gray-900" />,
  all_channels: <></>,
};

export const MessageStatuses = [
  {
    id: 1,
    label: 'All',
    value: 'all',
    icon: <LetterLine />,
  },
  {
    id: 2,
    label: 'Unread',
    value: 'unread',
    icon: <Unread />,
  },
];
export const callRatesSearch = [
  {
    label: 'Phone',
    value: 'DIALPREFIX',
  },
  {
    label: 'Country',
    value: 'COUNTRY',
  },
];
export const linkify = (text: string) => {
  if (!text?.trim()) return [text || ''];

  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('www.') ? `https://${part}` : part;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ucass-active underline"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export const AI_SETTINGS_TYPES = {
  FACEBOOK: 'FACEBOOK',
  WHATSAPP: 'WHATSAPP',
  INSTAGRAM: 'INSTAGRAM',
  TELEGRAM: 'TELEGRAM',
  CHAT_ASSISTANT: 'CHAT_ASSISTANT',
};
export const initialValue = {
  name: '',
  meeting_date: '',
  reminder: false,
  reminder_mode: [],
  start_time: '',
  pin: '',
  need_password: 'No',
  allowHost: 'N',
  hr: '',
  mins: '',
  inviteOthers: [],
  timezone: null,
  country_code: null,
  members: [],
};

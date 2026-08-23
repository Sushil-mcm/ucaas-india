import moment from 'moment';
import { getEnv } from '@/lib/utils';

const URL_REGEX = /\bhttps?:\/\/[^\s<>"']+/gi;

export const extractMessageText = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractMessageText(item))
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  if (typeof value === 'object') {
    if (typeof value?.text === 'string') return value.text.trim();
    if (typeof value?.message === 'string') return value.message.trim();
    if (typeof value?.value === 'string') return value.value.trim();
    if (Array.isArray(value?.children)) return extractMessageText(value.children);
    if (Array.isArray(value?.content)) return extractMessageText(value.content);
  }

  return '';
};

export const normalizeMessageNodes = (message: any): any[] => {
  try {
    if (Array.isArray(message)) return message;
    if (typeof message === 'string') {
      const trimmed = message.trim();
      if (!trimmed) return [];
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    return [];
  }
  return [];
};

export const getMessagePreviewText = (value: any): string => {
  if (value === null || value === undefined) return '';

  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value.messageType === 'poll' && value.poll?.question) {
      return value.poll.question;
    }
    if (value.messageType === 'event' && value.event?.name) {
      return value.event.name;
    }
    if (value.messageType === 'task' && value.task?.name) {
      return value.task.name;
    }
    if ('message' in value) {
      return getMessagePreviewText(value.message);
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        if (parsed.messageType === 'poll' && parsed.poll?.question) {
          return parsed.poll.question;
        }
        if (parsed.messageType === 'event' && parsed.event?.name) {
          return parsed.event.name;
        }
        if (parsed.messageType === 'task' && parsed.task?.name) {
          return parsed.task.name;
        }
        if ('message' in parsed) {
          return getMessagePreviewText(parsed.message);
        }
      }
      const fromParsed = extractMessageText(parsed);
      return fromParsed || trimmed;
    } catch {
      return trimmed;
    }
  }

  return extractMessageText(value);
};

export const extractLinksFromMessage = (messageNodes: any): string[] => {
  const links: string[] = [];

  const extractFromNodes = (nodes: any) => {
    if (!Array.isArray(nodes)) return;
    nodes.forEach((node: any) => {
      if (node?.type === 'link' && typeof node?.url === 'string' && node.url.trim()) {
        links.push(node.url.trim());
      }
      if (Array.isArray(node?.children)) {
        extractFromNodes(node.children);
      }
    });
  };

  const nodes = normalizeMessageNodes(messageNodes);
  extractFromNodes(nodes);

  const plainText = getMessagePreviewText(messageNodes);
  const regexLinks = plainText.match(URL_REGEX) || [];

  return Array.from(new Set([...links, ...regexLinks]));
};

export const getAttachmentUrl = (companyUuid = '', serverFileName = '') => {
  if (!companyUuid || !serverFileName) return '';
  return `${getEnv().VITE_API_BASE_URL}/api/v2/${companyUuid}/chat/${encodeURIComponent(serverFileName)}`;
};

export const getNameToShow = (chat: any, user: any) => {
  if (!chat) return '';
  const actorUuid = user?.uuid || user?.guest_info?.uuid || '';
  const isGroupChat = Boolean(chat?.isGroupChat);
  const isOwnChat = chat?.chatId === actorUuid;
  if (isGroupChat) return chat?.name || 'Group';
  if (isOwnChat)
    return (
      `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.guest_info?.name || 'You'
    );
  const otherUser = Array.isArray(chat?.users)
    ? chat.users.find((u: any) => u?.uuid !== actorUuid)
    : null;
  return (
    otherUser?.name ||
    `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim() ||
    'Unknown'
  );
};

export const toSlateNodes = (text: string) => [
  {
    type: 'paragraph',
    children: [{ text: text || '' }],
  },
];

export const hasVisibleSlateContent = (nodes: any): boolean => {
  try {
    if (!Array.isArray(nodes) || nodes.length === 0) return false;

    const walk = (node: any): boolean => {
      if (!node || typeof node !== 'object') return false;
      if (typeof node?.text === 'string' && node.text.trim().length > 0) return true;
      if (node?.type === 'mention' || node?.type === 'link') return true;
      if (Array.isArray(node?.children)) return node.children.some((child: any) => walk(child));
      return false;
    };

    return nodes.some((node: any) => walk(node));
  } catch {
    return false;
  }
};

export const getReceiverIds = (currentChat: any, user: any, fallbackReceiverIds?: any) => {
  const actorUuid = user?.uuid || user?.guest_info?.uuid || '';
  if (!currentChat || !actorUuid) return [];

  if (currentChat?.chatId === actorUuid) return [actorUuid];

  // Always derive from currentChat.users — the stored msgObj.receiverId
  // may only contain the sender's own UUID, which would result in an empty list.
  const chatUsers = Array.isArray(currentChat?.users) ? currentChat.users : [];
  const derivedIds = chatUsers
    .map((u: any) => u?.uuid)
    .filter((id: string) => id && id !== actorUuid);
  // Only use fallbackReceiverIds if it contains at least one ID that is NOT the sender
  if (!derivedIds?.length && Array.isArray(fallbackReceiverIds)) {
    const validFallback = fallbackReceiverIds.filter((id: string) => id && id !== actorUuid);
    if (validFallback.length > 0) return validFallback;
  }

  return derivedIds;
};

export const getSeenTimeString = (timestamp?: string) => {
  if (!timestamp) return '';
  const m = moment(timestamp);
  if (!m.isValid()) return '';
  if (m.isSame(moment(), 'day')) return m.format('hh:mm A');
  return m.format('MMM DD, hh:mm A');
};

export const getFlagEmoji = (countryCode: string) => {
  const normalized = `${countryCode || ''}`.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '';
  return normalized.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
};

const COUNTRY_ALIAS_TO_CODE: Record<string, string> = {
  INDIA: 'IN',
  BHARAT: 'IN',
  IND: 'IN',
  UNITEDSTATES: 'US',
  USA: 'US',
  US: 'US',
  UNITEDKINGDOM: 'GB',
  UK: 'GB',
  GREATBRITAIN: 'GB',
  UAE: 'AE',
};

const extractCountryCodeFromReaction = (value: string) => {
  const trimmed = `${value || ''}`.trim();
  if (!trimmed) return '';

  const explicitFlag = trimmed.match(/^:?flag[_-]([a-z]{2}):?$/i);
  if (explicitFlag?.[1]) return explicitFlag[1].toUpperCase();

  const shortAlias = trimmed.match(/^:([a-z]{2}):$/i);
  if (shortAlias?.[1]) return shortAlias[1].toUpperCase();

  if (/^[a-z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();

  const normalizedCountryName = trimmed
    .replace(/^:/, '')
    .replace(/:$/, '')
    .replace(/^flag[_-]?/i, '')
    .replace(/[^a-z]/gi, '')
    .toUpperCase();
  if (normalizedCountryName && COUNTRY_ALIAS_TO_CODE[normalizedCountryName]) {
    return COUNTRY_ALIAS_TO_CODE[normalizedCountryName];
  }

  return '';
};

export const getRenderableReactionEmoji = (emojiValue: string) => {
  const raw = `${emojiValue || ''}`.trim();
  if (!raw) return '';

  const countryCode = extractCountryCodeFromReaction(raw);
  if (countryCode) {
    const flagEmoji = getFlagEmoji(countryCode);
    if (flagEmoji) return flagEmoji;
  }

  return raw;
};

// Global cache for emoji reactions to handle quick sequential clicks without overwrites
export const pendingReactionsCache: Record<string, Record<string, string[]>> = {};

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/hooks/use-user';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { cn, formatFileSize, MEDIA_URL } from '@/lib/utils';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  ExternalLink,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  MessageCircleMoreIcon,
  Pencil,
  PhoneCall,
  PhoneMissed,
  Search,
  Table,
  UserPlus,
  UsersRound,
  Video,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { useDialpad } from '@/hooks/use-dialpad';
import { useJitsi } from '@/hooks/use-jitsi';
import MeetInitiateModal from '@/components/audio-video-call/components/meet-initiate-modal';
import DownloadButton from '@/pages/messenger/chat/message-item/download-button';
import LightBoxPreview from '@/pages/messenger/chat/message-item/lightbox-preview';
import { useMediaBlob } from '@/pages/messenger/chat/message-item/use-media-blob';
import { FILE_TYPES, getFileType, isImageFile, isVideoFile } from '@/pages/messenger/chat/utils';
import moment from 'moment';
import { extractLinksFromMessage } from '@/pages/messenger/chat/message-item/helpers';
import { toast } from 'react-toastify';

type InfoTab = 'members' | 'media' | 'files' | 'links' | 'calls';
type MediaViewMode = 'grid' | 'list' | 'table';

type InfoAttachment = {
  id: string;
  fileName: string;
  serverFileName: string;
  company_uuid: string;
  fileSize: number;
  fileSizeLabel: string;
  createdAt: string;
  senderName: string;
  fileType: string;
  isImage: boolean;
  isVideo: boolean;
};

type LinkItem = {
  url: string;
  msgCreatedAt: string;
  senderName: string;
  domain: string;
};

type CallItem = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  durationLabel: string;
  createdAt: string;
  searchText: string;
};

const TEAM_PERMISSION_FIELDS = [
  'send_message',
  'file_sharing',
  'download_files',
  'make_audio_video_calls',
  'screen_share',
  'edit_message',
  'delete_message',
  'add_remove_participants',
  'edit_channel_name',
];

const getDefaultTeamPermissions = () =>
  TEAM_PERMISSION_FIELDS.reduce((acc: Record<string, any>, key) => {
    acc[key] = { key: 'everyone', value: [] };
    return acc;
  }, {});

const trimSizeLabel = (value: string) =>
  value.replace(/\.00(?=\s)/g, '').replace(/(\.\d)0(?=\s)/g, '$1');

const getFileExtension = (fileName = '') => {
  const ext = fileName.split('.').pop();
  return ext ? ext.toLowerCase() : '';
};

const getSizeMeta = (rawSize: any) => {
  const numericSize = Number(rawSize || 0);

  if (typeof rawSize === 'string' && rawSize.trim() && Number.isNaN(numericSize)) {
    return {
      fileSize: 0,
      fileSizeLabel: rawSize,
    };
  }

  return {
    fileSize: Number.isFinite(numericSize) ? numericSize : 0,
    fileSizeLabel: trimSizeLabel(formatFileSize(Number.isFinite(numericSize) ? numericSize : 0)),
  };
};

const getMemberDisplayName = (member: any, fallback = 'Unknown') =>
  `${member?.first_name || ''} ${member?.last_name || ''}`.trim() ||
  member?.name ||
  member?.label ||
  fallback;

const getMessageSenderName = (message: any) =>
  message?.senderName ||
  message?.sender?.name ||
  getMemberDisplayName(message?.sender, '') ||
  message?.createdByName ||
  'Sender';

const getDomainFromUrl = (url: string) => {
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const formatCompactDate = (date: string) => {
  if (!date || !moment(date).isValid()) return '';
  return moment(date).format('MMM D');
};

const formatCallDayTime = (date: string) => {
  if (!date || !moment(date).isValid()) return '';
  const callDate = moment(date);
  const day = callDate.isSame(moment(), 'day')
    ? 'Today'
    : callDate.isSame(moment().subtract(1, 'day'), 'day')
      ? 'Yesterday'
      : callDate.format('MMM D');

  return `${day} - ${callDate.format('h:mm A')}`;
};

const formatDurationShort = (seconds: number) => {
  if (!seconds || seconds < 1) return '';
  const duration = moment.duration(seconds, 'seconds');
  const minutes = Math.floor(duration.asMinutes());
  const remainingSeconds = duration.seconds();

  if (minutes > 0 && remainingSeconds > 0) return `${minutes}m ${remainingSeconds}s`;
  if (minutes > 0) return `${minutes}m`;
  return `${remainingSeconds}s`;
};

const groupByMonth = <T extends { createdAt?: string; msgCreatedAt?: string }>(items: T[]) => {
  const groups = new Map<string, T[]>();

  items.forEach((item) => {
    const date = item.createdAt || item.msgCreatedAt || '';
    const key =
      date && moment(date).isValid() ? moment(date).format('MMM YYYY').toUpperCase() : 'NO DATE';
    const current = groups.get(key) || [];
    groups.set(key, [...current, item]);
  });

  return Array.from(groups.entries()).map(([label, groupItems]) => ({
    label,
    items: groupItems,
  }));
};

const sortByRecent = <T extends { createdAt?: string; msgCreatedAt?: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    const aTime = moment(a.createdAt || a.msgCreatedAt || 0).valueOf();
    const bTime = moment(b.createdAt || b.msgCreatedAt || 0).valueOf();
    return bTime - aTime;
  });

const buildAttachmentList = (
  messageRows: any[],
  selectedChat: any,
  fallbackCompanyUuid: string,
) => {
  const list: InfoAttachment[] = [];

  messageRows?.forEach((message: any, messageIndex: number) => {
    const companyUuid = message?.company_uuid || selectedChat?.company_uuid || fallbackCompanyUuid;
    const attachments = Array.isArray(message?.attachments) ? message.attachments : [];

    attachments.forEach((attachment: any, attachmentIndex: number) => {
      const serverFileName =
        attachment?.filename ||
        attachment?.serverFileName ||
        attachment?.file_name ||
        attachment?.key ||
        '';
      const fileName =
        attachment?.name ||
        attachment?.fileName ||
        attachment?.originalname ||
        serverFileName ||
        'Attachment';

      if (!serverFileName) return;

      const sizeMeta = getSizeMeta(
        attachment?.size ?? attachment?.fileSize ?? attachment?.file_size,
      );
      const fileType = getFileType(fileName || serverFileName);
      const createdAt = attachment?.createdAt || message?.createdAt || message?.updatedAt || '';

      list.push({
        id: `${serverFileName}-${message?.messageId || message?._id || messageIndex}-${attachmentIndex}`,
        fileName,
        serverFileName,
        company_uuid: attachment?.company_uuid || companyUuid || '',
        fileSize: sizeMeta.fileSize,
        fileSizeLabel: sizeMeta.fileSizeLabel,
        createdAt,
        senderName: attachment?.senderName || getMessageSenderName(message),
        fileType,
        isImage: isImageFile(fileName || serverFileName),
        isVideo: isVideoFile(fileName || serverFileName),
      });
    });
  });

  return sortByRecent(list);
};

const buildCallList = (messages: any[], selectedChat: any) => {
  const calls: CallItem[] = [];
  const isGroupChat = Boolean(selectedChat?.isGroupChat);
  const chatMembers = Array.isArray(selectedChat?.users) ? selectedChat.users : [];

  messages?.forEach((message: any, index: number) => {
    const alertContent = message?.alertContent || {};
    const messageType = String(message?.messageType || '').toLowerCase();
    const isMeetMessage = messageType === 'meet';
    const isCallAlert = alertContent?.mode === 'call';
    if (!isCallAlert && !isMeetMessage) return;

    const meetMetadata = message?.meetMetadata || message?.meetingMetadata || {};
    const status = isMeetMessage
      ? 'started'
      : String(alertContent?.callStatus || 'ended').toLowerCase();
    const callType = String(
      alertContent?.callType || message?.callType || meetMetadata?.callType || '',
    ).toLowerCase();
    const createdAt =
      alertContent?.createdAt || meetMetadata?.startedAt || message?.createdAt || '';
    const updatedAt = alertContent?.updatedAt || meetMetadata?.endedAt || message?.updatedAt || '';
    const hasVideo = callType === 'video';
    const durationSeconds =
      Number(alertContent?.duration || alertContent?.callDuration || 0) ||
      (createdAt && updatedAt && moment(updatedAt).isValid() && moment(createdAt).isValid()
        ? Math.max(0, moment(updatedAt).diff(moment(createdAt), 'seconds'))
        : 0);
    const durationLabel =
      !isMeetMessage && status === 'ended' ? formatDurationShort(durationSeconds) : '';
    const groupPrefix = isGroupChat ? 'Group ' : '';
    const callKind = hasVideo ? 'video call' : callType === 'audio' ? 'audio call' : 'call';
    const senderId =
      message?.senderId || meetMetadata?.startedBy || message?.createdBy || message?.sender?.uuid;
    const sender = chatMembers.find(
      (member: any) => String(member?.uuid || '') === String(senderId || ''),
    );
    const senderName =
      message?.senderName ||
      message?.sender?.name ||
      getMemberDisplayName(message?.sender, '') ||
      meetMetadata?.startedByName ||
      getMemberDisplayName(sender, '') ||
      message?.createdByName ||
      'Someone';
    const callDescription = `${isGroupChat ? 'group ' : ''}${callKind}`;
    const callArticle = callDescription.startsWith('audio') ? 'an' : 'a';

    const title = isMeetMessage
      ? `${senderName} started ${callArticle} ${callDescription}`
      : status === 'missed'
        ? `Missed ${groupPrefix.toLowerCase()}call`.replace('  ', ' ')
        : status === 'reject'
          ? `${groupPrefix}call rejected`
          : `${groupPrefix}${callKind}`;
    const subtitleParts = [formatCallDayTime(createdAt)];

    if (status === 'missed') {
      subtitleParts.push('No answer');
    } else if (status === 'reject') {
      subtitleParts.push('Rejected');
    } else if (!isMeetMessage && senderName !== 'Someone') {
      subtitleParts.push(`${senderName} started`);
    }

    const subtitle = subtitleParts.filter(Boolean).join(' - ');

    calls.push({
      id: message?.messageId || message?._id || `call-${index}`,
      title,
      subtitle,
      status,
      durationLabel,
      createdAt,
      searchText: `${title} ${subtitle} ${durationLabel} ${callType} ${status}`.toLowerCase(),
    });
  });

  return sortByRecent(calls);
};

const getSocketAck = (response: any) => {
  if (Array.isArray(response)) {
    return response.find((item) => item && typeof item === 'object') || response[0];
  }

  return response;
};

const isSocketAckFailure = (response: any) => {
  const ack = getSocketAck(response);
  if (!ack || typeof ack !== 'object') return false;

  const status = Number(ack?.status ?? ack?.statusCode);

  return (
    ack?.success === false ||
    ack?.error ||
    ack?.data?.error ||
    (Number.isFinite(status) && status >= 400)
  );
};

const getSocketAckErrorMessage = (response: any, fallback: string) => {
  const ack = getSocketAck(response);

  return (
    ack?.error?.message ||
    ack?.data?.error?.message ||
    ack?.message ||
    ack?.data?.message ||
    fallback
  );
};

const waitForSocketAck = (
  emitWithCallback: (callback: (response: any) => void) => void,
  timeoutMs = 15000,
) =>
  new Promise<any>((resolve) => {
    let resolved = false;
    const timeout = window.setTimeout(() => {
      if (resolved) return;
      resolved = true;
      resolve({
        success: false,
        error: { message: 'Request timed out. Please try again.' },
      });
    }, timeoutMs);

    emitWithCallback((response: any) => {
      if (resolved) return;
      resolved = true;
      window.clearTimeout(timeout);
      resolve(response);
    });
  });

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read image'));
    reader.readAsDataURL(file);
  });

const MAX_TEAM_AVATAR_BYTES = 2 * 1024 * 1024;
const getDataUrlByteSize = (dataUrl: string) => new Blob([dataUrl]).size;

const resizeImageFileToDataUrl = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file');
  }

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to load image'));
      img.src = sourceUrl;
    });

    if (!image.width || !image.height) {
      throw new Error('Unable to read this image');
    }

    const originalDataUrl = file.size <= 350 * 1024 ? await readFileAsDataUrl(file) : '';
    if (originalDataUrl && getDataUrlByteSize(originalDataUrl) < MAX_TEAM_AVATAR_BYTES) {
      return originalDataUrl;
    }

    const sourceMaxDimension = Math.max(image.width, image.height);
    let targetMaxDimension = Math.min(640, sourceMaxDimension);
    let quality = 0.86;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const scale = Math.min(1, targetMaxDimension / sourceMaxDimension);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to compress this image');

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

      if (getDataUrlByteSize(compressedDataUrl) < MAX_TEAM_AVATAR_BYTES) {
        return compressedDataUrl;
      }

      if (quality > 0.5) {
        quality -= 0.12;
      } else {
        targetMaxDimension = Math.max(160, Math.round(targetMaxDimension * 0.75));
        quality = 0.74;
      }
    }

    throw new Error('Unable to compress this image below 2 MB');
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
};

const DescriptionModal = ({
  selectedChat,
  setActiveState,
  messageList,
}: {
  selectedChat: any;
  setActiveState: any;
  messageList: any[];
}) => {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { user } = useUser();
  const { user_info } = user;
  const companyUuid = user?.company_info?.uuid || user?.company_uuid || '';
  const {
    createNewChat,
    usersOnlineStatus,
    createPrivateChatId,
    getAttachmentsByChatId,
    handleUpdateChannel,
    handleAddChannelImage,
    handleRemoveChannelImage,
  } = useSocketEvents();
  const { getUserProfileByUuid } = useUsersDirectory();
  const { makeCall: makeSipCall } = useDialpad();
  const { cleanupLocalMediaTracks } = useJitsi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<InfoTab>('media');
  const [searchQuery, setSearchQuery] = useState('');
  const [serverAttachments, setServerAttachments] = useState<any[]>([]);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [avatarDraft, setAvatarDraft] = useState('');
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [showMeetModal, setShowMeetModal] = useState(false);
  const [meetModalType, setMeetModalType] = useState<'audio' | 'video'>('audio');

  const isStandaloneChatRoute =
    window.location.pathname.includes('/messenger') ||
    window.location.pathname.includes('/agent-chat');

  const otherUserData = selectedChat?.users?.find((item: any) => item?.uuid !== user?.uuid);
  const name = selectedChat?.isGroupChat
    ? selectedChat?.name
    : getMemberDisplayName(otherUserData, otherUserData?.name || 'User');
  const hasAdminList = Array.isArray(selectedChat?.admins) && selectedChat.admins.length > 0;
  const isTeamAdmin =
    (Array.isArray(selectedChat?.admins) && selectedChat.admins.includes(user?.uuid)) ||
    (Array.isArray(selectedChat?.subAdmins) && selectedChat.subAdmins.includes(user?.uuid));
  const canEditTeam = Boolean(selectedChat?.isGroupChat && (isTeamAdmin || !hasAdminList));

  useEffect(() => {
    setTeamNameDraft(selectedChat?.name || '');
    setDescriptionDraft(selectedChat?.description || '');
    setAvatarDraft(selectedChat?.avatar || '');
    setIsEditingInfo(false);
  }, [selectedChat?.avatar, selectedChat?.chatId, selectedChat?.description, selectedChat?.name]);

  const visibleMembers = useMemo(() => {
    const rawMembers = Array.isArray(selectedChat?.users) ? selectedChat.users : [];
    const filteredMembers = rawMembers.filter(
      (member: any) => !selectedChat?.isHidden?.includes(member?.uuid),
    );

    if (selectedChat?.groupType === 'MEETING') {
      return filteredMembers.filter(
        (member: any) => !member?.isGuest || member?.callStatus === 'joined',
      );
    }

    return filteredMembers;
  }, [selectedChat]);

  const onlineCount = useMemo(
    () =>
      visibleMembers.filter(
        (member: any) =>
          usersOnlineStatus?.find((statusUser: any) => statusUser?.userId == member?.extension)
            ?.online,
      ).length,
    [usersOnlineStatus, visibleMembers],
  );

  const localAttachmentMessages = useMemo(
    () =>
      messageList
        ?.filter((item) => item?.chatId === selectedChat?.chatId)?.[0]
        ?.messages?.filter(
          (item: any) => item?.attachments?.length > 0 && item?.isDeleted === false,
        ) || [],
    [messageList, selectedChat?.chatId],
  );

  const allCurrentChatMessages = useMemo(
    () =>
      messageList
        ?.filter((item) => item?.chatId === selectedChat?.chatId)?.[0]
        ?.messages?.filter((item: any) => item?.isDeleted !== true) || [],
    [messageList, selectedChat?.chatId],
  );

  const linksList = useMemo(() => {
    const list: LinkItem[] = [];

    allCurrentChatMessages?.forEach((msg: any) => {
      const links = extractLinksFromMessage(msg?.message);
      links.forEach((url: string) => {
        list.push({
          url,
          msgCreatedAt: msg?.createdAt,
          senderName: msg?.senderName || 'Sender',
          domain: getDomainFromUrl(url),
        });
      });
    });

    return sortByRecent(list);
  }, [allCurrentChatMessages]);

  const callsList = useMemo(
    () => buildCallList(allCurrentChatMessages, selectedChat),
    [allCurrentChatMessages, selectedChat],
  );

  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  useEffect(() => {
    if (selectedChat?.chatId) {
      getAttachmentsByChatId({ chatId: selectedChat.chatId, userID: user?.uuid }, (res: any) => {
        let data = res;
        if (res?.data?.result?.rows) {
          data = res?.data?.result?.rows;
        }
        setServerAttachments(Array.isArray(data) ? data : []);
      });
    } else {
      setServerAttachments([]);
    }
  }, [selectedChat?.chatId, user?.uuid, getAttachmentsByChatId]);

  const allAttachmentsMessages = useMemo(
    () =>
      serverAttachments?.filter(
        (msg: any) => msg?.attachments?.length > 0 && msg?.isDeleted !== true,
      ) || [],
    [serverAttachments],
  );

  const attachmentsList = useMemo(() => {
    const sourceMessages =
      allAttachmentsMessages.length > 0 ? allAttachmentsMessages : localAttachmentMessages;
    return buildAttachmentList(sourceMessages, selectedChat, companyUuid);
  }, [allAttachmentsMessages, companyUuid, localAttachmentMessages, selectedChat]);

  const mediaAttachments = attachmentsList;

  const fileAttachments = useMemo(
    () => attachmentsList.filter((attachment) => !attachment.isImage && !attachment.isVideo),
    [attachmentsList],
  );

  const extension = user?.user_info?.extension;
  const isMeOnCall = usersOnlineStatus?.find(
    (statusUser: any) => statusUser?.userId == extension,
  )?.onCall;
  const otherUserOnlineStatus = usersOnlineStatus?.find(
    (statusUser: any) => `${statusUser?.userId}` === `${otherUserData?.extension}`,
  );

  const onDirectChat = (member: any) => {
    if (!member?.uuid) return;
    const chatId = createPrivateChatId([user_info?.uuid, member?.uuid]);
    createNewChat(member);
    if (!isStandaloneChatRoute) {
      navigate(`/messenger?chatId=${chatId}`);
    } else {
      setSearchParams({ chatId });
    }
  };

  const handleCall = (member: any) => {
    if (!member?.extension || !member?.uuid) return;
    if (isMeOnCall) return;

    const memberOnCall = usersOnlineStatus?.find(
      (u: any) => u?.userId == member?.extension,
    )?.onCall;
    if (memberOnCall) return;

    makeSipCall(String(member?.extension));
  };

  const handleStartInfoCall = (callType: 'audio' | 'video') => {
    if (!selectedChat?.chatId) return;

    if (isMeOnCall) {
      toast.info('You are currently on another call');
      return;
    }

    if (!selectedChat?.isGroupChat && otherUserData) {
      if (otherUserOnlineStatus?.onCall) {
        toast.info('User is currently on another call');
        return;
      }

      if (!otherUserOnlineStatus?.online) {
        toast.info('User is unavailable');
        return;
      }
    }

    setMeetModalType(callType);
    setShowMeetModal(true);
  };

  const startEditingTeamInfo = () => {
    if (!canEditTeam) return;
    setIsEditingInfo(true);
  };

  const handleCancelTeamInfoEdit = () => {
    setTeamNameDraft(selectedChat?.name || '');
    setDescriptionDraft(selectedChat?.description || '');
    setAvatarDraft(selectedChat?.avatar || '');
    setIsEditingInfo(false);
  };

  const handleTeamAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    if (file.size >= MAX_TEAM_AVATAR_BYTES) {
      toast.error('Team image must be smaller than 2 MB');
      return;
    }

    try {
      const avatarDataUrl = await resizeImageFileToDataUrl(file);
      if (getDataUrlByteSize(avatarDataUrl) >= MAX_TEAM_AVATAR_BYTES) {
        toast.error('Compressed team image must be smaller than 2 MB');
        return;
      }
      setAvatarDraft(avatarDataUrl);
      setIsEditingInfo(true);
    } catch (error: any) {
      console.error('Failed to prepare team image:', error);
      toast.error(error?.message || 'Unable to prepare this image');
    }
  };

  const handleSaveTeamInfo = async () => {
    if (!selectedChat?.chatId || !canEditTeam || isSavingInfo) return;

    const trimmedName = teamNameDraft.trim();
    const trimmedDescription = descriptionDraft.trim();
    const previousAvatar = String(selectedChat?.avatar || '').trim();
    const nextAvatar = String(avatarDraft || '').trim();
    const avatarChanged = previousAvatar !== nextAvatar;
    const previousName = String(selectedChat?.name || '').trim();
    const previousDescription = String(selectedChat?.description || '').trim();
    const nameChanged = trimmedName !== previousName;
    const descriptionChanged = trimmedDescription !== previousDescription;
    const hasInfoChanges = nameChanged || descriptionChanged;

    if (!trimmedName) {
      toast.error('Team name is required');
      return;
    }

    if (trimmedName.length > 50) {
      toast.error('Team name must not exceed 50 characters');
      return;
    }

    if (trimmedDescription.length > 255) {
      toast.error('Description must not exceed 255 characters');
      return;
    }

    if (!hasInfoChanges && !avatarChanged) {
      setIsEditingInfo(false);
      return;
    }

    const updatePayload: any = {
      chatId: selectedChat.chatId,
      name: trimmedName,
      description: trimmedDescription,
      permissions: selectedChat?.permissions || getDefaultTeamPermissions(),
      privacy_settings: selectedChat?.privacy_settings || 'public',
    };

    setIsSavingInfo(true);

    try {
      if (hasInfoChanges) {
        const updateResponse = await waitForSocketAck((callback) => {
          handleUpdateChannel(updatePayload, callback);
        });

        if (isSocketAckFailure(updateResponse)) {
          throw new Error(getSocketAckErrorMessage(updateResponse, 'Failed to update team info'));
        }
      }

      if (avatarChanged) {
        const imageResponse = await waitForSocketAck((callback) => {
          if (!selectedChat?.chatId) {
            callback({
              success: false,
              error: { message: 'Chat not found' },
            });
            return;
          }

          if (nextAvatar) {
            handleAddChannelImage(selectedChat.chatId, nextAvatar, callback);
          } else if (previousAvatar) {
            handleRemoveChannelImage(selectedChat.chatId, callback);
          } else {
            callback({ success: true });
          }
        });

        if (isSocketAckFailure(imageResponse)) {
          throw new Error(getSocketAckErrorMessage(imageResponse, 'Failed to update team image'));
        }
      }

      toast.success('Team info updated successfully');
      setIsEditingInfo(false);
    } catch (error: any) {
      console.error('Failed to update team info:', error);
      toast.error(error?.message || 'Failed to update team info');
    } finally {
      setIsSavingInfo(false);
    }
  };

  const avatarImage = selectedChat?.isGroupChat
    ? isEditingInfo
      ? avatarDraft
      : selectedChat?.avatar
    : otherUserData?.profile || getUserProfileByUuid(otherUserData?.uuid) || '';
  const teamDisplayName = selectedChat?.isGroupChat && isEditingInfo ? teamNameDraft : name;
  const descriptionDisplay =
    selectedChat?.isGroupChat && isEditingInfo ? descriptionDraft : selectedChat?.description || '';
  const subtitle = selectedChat?.isGroupChat
    ? `Group - ${visibleMembers.length} ${visibleMembers.length === 1 ? 'member' : 'members'}`
    : [otherUserData?.email, otherUserData?.extension ? `Ext: ${otherUserData.extension}` : '']
        .filter(Boolean)
        .join(' - ');

  return (
    <>
      {showMeetModal ? (
        <MeetInitiateModal
          currentChat={selectedChat}
          callType={meetModalType}
          isInitiator
          skipJoinOptions
          onClose={() => {
            cleanupLocalMediaTracks();
            setShowMeetModal(false);
          }}
        />
      ) : null}
      <div className="h-full w-full overflow-y-auto bg-white">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as InfoTab)}
          className="min-h-full w-full gap-0"
        >
          <div className="shrink-0 border-b border-gray-200 bg-white">
            <div className="relative flex flex-col items-center px-4 pb-4 pt-5 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.jpeg,.jpg,.png,.webp"
                className="hidden"
                onChange={handleTeamAvatarChange}
              />
              <button
                type="button"
                className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                onClick={() => setActiveState(null)}
                aria-label="Back to messages"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="relative">
                <CustomAvatar
                  name={teamDisplayName || 'Team'}
                  size="96"
                  showPresence={!selectedChat?.isGroupChat}
                  extension={!selectedChat?.isGroupChat ? otherUserData?.extension : ''}
                  image={avatarImage}
                  textClass="text-2xl"
                />
                {selectedChat?.isGroupChat && canEditTeam ? (
                  <button
                    type="button"
                    className="absolute bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white text-slate-400 shadow-sm hover:bg-slate-50 hover:text-primary"
                    onClick={() => {
                      startEditingTeamInfo();
                      fileInputRef.current?.click();
                    }}
                    aria-label="Edit team photo"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {isEditingInfo && canEditTeam ? (
                <div className="mt-3 w-full max-w-md">
                  <input
                    value={teamNameDraft}
                    onChange={(event) => setTeamNameDraft(event.target.value)}
                    maxLength={50}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    placeholder="Team name"
                  />
                </div>
              ) : (
                <div className="mt-3 flex max-w-full items-center justify-center gap-2">
                  <h2 className="truncate text-lg font-semibold text-slate-900">
                    {teamDisplayName || 'Team'}
                  </h2>
                  {canEditTeam ? (
                    <button
                      type="button"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-primary"
                      onClick={startEditingTeamInfo}
                      aria-label="Edit team info"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              )}

              {subtitle ? (
                <p className="mt-1 text-xs font-semibold text-emerald-500">{subtitle}</p>
              ) : null}

              {isEditingInfo && canEditTeam ? (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleSaveTeamInfo}
                    disabled={isSavingInfo}
                  >
                    {isSavingInfo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Save
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    onClick={handleCancelTeamInfoEdit}
                    disabled={isSavingInfo}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-center gap-5 sm:gap-7">
                <HeaderActionButton
                  label="Call"
                  icon={<PhoneCall className="h-5 w-5" />}
                  iconClassName="bg-emerald-100 text-emerald-500"
                  onClick={() => handleStartInfoCall('audio')}
                />
                <HeaderActionButton
                  label="Video"
                  icon={<Video className="h-5 w-5" />}
                  iconClassName="bg-blue-100 text-blue-500"
                  onClick={() => handleStartInfoCall('video')}
                />
                {selectedChat?.isGroupChat || selectedChat?.groupType === 'CHANNEL' ? (
                  <HeaderActionButton
                    label="Add"
                    icon={<UserPlus className="h-5 w-5" />}
                    iconClassName="bg-slate-100 text-blue-500"
                    onClick={() => setActiveState('members')}
                  />
                ) : null}
              </div>
            </div>

            <div className="px-3 pb-4">
              <div className="relative rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Description
                </div>
                {isEditingInfo && canEditTeam ? (
                  <textarea
                    value={descriptionDraft}
                    onChange={(event) => setDescriptionDraft(event.target.value)}
                    maxLength={255}
                    rows={3}
                    className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    placeholder="Add a team description"
                  />
                ) : (
                  <p className="pr-7 text-xs font-medium leading-5 text-slate-700">
                    {descriptionDisplay || 'No description added.'}
                  </p>
                )}
                {canEditTeam && !isEditingInfo ? (
                  <button
                    type="button"
                    className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-primary"
                    onClick={startEditingTeamInfo}
                    aria-label="Edit description"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <TabsList className="flex h-12 w-full rounded-none border-t border-slate-100 bg-white p-0">
              {selectedChat?.isGroupChat ? (
                <InfoTabTrigger value="members">Members</InfoTabTrigger>
              ) : null}
              <InfoTabTrigger value="media">Media</InfoTabTrigger>
              <InfoTabTrigger value="files">Files</InfoTabTrigger>
              <InfoTabTrigger value="links">Links</InfoTabTrigger>
              <InfoTabTrigger value="calls">Calls</InfoTabTrigger>
            </TabsList>
          </div>

          {selectedChat?.isGroupChat ? (
            <TabsContent value="members" className="m-0 w-full">
              <MembersTab
                members={visibleMembers}
                onlineCount={onlineCount}
                currentUserUuid={user?.uuid}
                selectedChat={selectedChat}
                usersOnlineStatus={usersOnlineStatus}
                getUserProfileByUuid={getUserProfileByUuid}
                isMeOnCall={Boolean(isMeOnCall)}
                onCall={handleCall}
                onDirectChat={onDirectChat}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </TabsContent>
          ) : null}

          <TabsContent value="media" className="m-0 w-full">
            <MediaTab
              items={mediaAttachments}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          <TabsContent value="files" className="m-0 w-full">
            <FilesTab
              items={fileAttachments}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          <TabsContent value="links" className="m-0 w-full">
            <LinksTab
              linksList={linksList}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          <TabsContent value="calls" className="m-0 w-full">
            <CallsTab
              callsList={callsList}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default DescriptionModal;

const HeaderActionButton = ({
  label,
  icon,
  iconClassName,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  iconClassName: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    className="flex min-w-12 flex-col items-center gap-2 text-xs font-medium text-slate-600"
    onClick={onClick}
  >
    <span
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-105',
        iconClassName,
      )}
    >
      {icon}
    </span>
    <span>{label}</span>
  </button>
);

const InfoTabTrigger = ({ value, children }: { value: InfoTab; children: ReactNode }) => (
  <TabsTrigger
    value={value}
    className="h-full flex-1 rounded-none border-0 px-2 text-xs font-semibold text-slate-500 shadow-none transition-colors data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-none"
  >
    {children}
  </TabsTrigger>
);

const SearchBar = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-primary/50 focus:bg-white"
    />
  </div>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="mx-3 mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-12 text-center">
    <p className="text-sm font-medium text-slate-500">{label}</p>
  </div>
);

const MediaTab = ({
  items,
  searchQuery,
  setSearchQuery,
}: {
  items: InfoAttachment[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) => {
  const [viewMode, setViewMode] = useState<MediaViewMode>('grid');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      `${item.fileName} ${item.fileType} ${item.fileSizeLabel} ${formatCompactDate(item.createdAt)}`
        .toLowerCase()
        .includes(query),
    );
  }, [items, searchQuery]);

  const groups = useMemo(() => groupByMonth(filteredItems), [filteredItems]);
  const lightboxSlides = useMemo(
    () =>
      filteredItems.map((item) => ({
        type: item.isImage ? 'image' : 'video',
        src: `${MEDIA_URL}/${item.company_uuid}/chat/${item.serverFileName}`,
        alt: item.fileName,
        id: item.id,
        serverFileName: item.serverFileName,
        company_uuid: item.company_uuid,
      })),
    [filteredItems],
  );

  const handlePreview = (serverFileName: string) => {
    const index = lightboxSlides.findIndex(
      (slide: any) => slide?.serverFileName === serverFileName,
    );
    if (index === -1) return;
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="bg-white">
      <div className="shrink-0 px-3 py-3">
        <SearchBar
          placeholder="Search media by name, type, size or date"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>
      <div className="pb-4">
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <p className="text-xs font-semibold text-slate-500">Sort: recent</p>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState label="No media found" />
        ) : viewMode === 'grid' ? (
          <MediaGrid groups={groups} onPreview={handlePreview} />
        ) : viewMode === 'list' ? (
          <MediaList groups={groups} onPreview={handlePreview} />
        ) : (
          <MediaTable groups={groups} onPreview={handlePreview} />
        )}
      </div>

      {lightboxOpen ? (
        <LightBoxPreview
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          slides={lightboxSlides}
          index={lightboxIndex}
        />
      ) : null}
    </div>
  );
};

const ViewToggle = ({
  value,
  onChange,
}: {
  value: MediaViewMode;
  onChange: (value: MediaViewMode) => void;
}) => {
  const options: { value: MediaViewMode; icon: ReactNode; label: string }[] = [
    { value: 'grid', icon: <LayoutGrid className="h-4 w-4" />, label: 'Grid view' },
    { value: 'list', icon: <List className="h-4 w-4" />, label: 'List view' },
    { value: 'table', icon: <Table className="h-4 w-4" />, label: 'Table view' },
  ];

  return (
    <div className="flex items-center gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          aria-label={option.label}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-50 hover:text-primary',
            value === option.value && 'bg-blue-50 text-primary ring-1 ring-blue-100',
          )}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
};

const MediaGrid = ({
  groups,
  onPreview,
}: {
  groups: { label: string; items: InfoAttachment[] }[];
  onPreview: (serverFileName: string) => void;
}) => (
  <div className="pb-4">
    {groups.map((group) => (
      <div key={group.label} className="mb-4">
        <MonthLabel>{group.label}</MonthLabel>
        <div className="grid grid-cols-2 gap-1 px-3 sm:grid-cols-3">
          {group.items.map((item) => (
            <MediaThumb
              key={item.id}
              item={item}
              className="aspect-[1.62] w-full rounded-md"
              onPreview={onPreview}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

const MediaList = ({
  groups,
  onPreview,
}: {
  groups: { label: string; items: InfoAttachment[] }[];
  onPreview: (serverFileName: string) => void;
}) => (
  <div className="pb-4">
    {groups.map((group) => (
      <div key={group.label} className="mb-4">
        <MonthLabel>{group.label}</MonthLabel>
        <div className="flex flex-col">
          {group.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
              onClick={() => onPreview(item.serverFileName)}
            >
              <MediaThumb item={item} className="h-11 w-11 rounded-md" onPreview={onPreview} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700">{item.fileName}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
                  {item.fileType} - {item.fileSizeLabel} - {formatCompactDate(item.createdAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const MediaTable = ({
  groups,
  onPreview,
}: {
  groups: { label: string; items: InfoAttachment[] }[];
  onPreview: (serverFileName: string) => void;
}) => (
  <div className="overflow-x-auto pb-4">
    <table className="w-full min-w-[620px] border-collapse text-left">
      <thead>
        <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-400">
          <th className="px-3 py-2">Name</th>
          <th className="px-3 py-2">Type</th>
          <th className="px-3 py-2">Size</th>
          <th className="px-3 py-2">Date</th>
        </tr>
      </thead>
      <tbody>
        {groups.flatMap((group) =>
          group.items.map((item) => (
            <tr
              key={item.id}
              className="cursor-pointer border-b border-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-50"
              onClick={() => onPreview(item.serverFileName)}
            >
              <td className="px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <MediaThumb item={item} className="h-5 w-5 rounded" onPreview={onPreview} />
                  <span className="truncate">{item.fileName}</span>
                </div>
              </td>
              <td className="px-3 py-2">{item.fileType}</td>
              <td className="px-3 py-2">{item.fileSizeLabel}</td>
              <td className="px-3 py-2">{formatCompactDate(item.createdAt)}</td>
            </tr>
          )),
        )}
      </tbody>
    </table>
  </div>
);

const getMediaFallbackIcon = (item: InfoAttachment) => {
  if (item.isVideo) return <FileVideo className="h-5 w-5" />;
  if (item.isImage) return <FileImage className="h-5 w-5" />;
  if (item.fileType === FILE_TYPES.ARCHIVE) return <FileArchive className="h-5 w-5" />;
  if (item.fileType === FILE_TYPES.SPREADSHEET) return <FileSpreadsheet className="h-5 w-5" />;
  if (item.fileType === FILE_TYPES.AUDIO) return <FileAudio className="h-5 w-5" />;
  if (item.fileType === FILE_TYPES.PDF || item.fileType === FILE_TYPES.DOCUMENT) {
    return <FileText className="h-5 w-5" />;
  }
  return <File className="h-5 w-5" />;
};

const MediaThumb = ({
  item,
  className,
  onPreview,
}: {
  item: InfoAttachment;
  className: string;
  onPreview: (serverFileName: string) => void;
}) => {
  const { data: mediaUrl, isLoading } = useMediaBlob({
    serverFileName: item.serverFileName,
    company_uuid: item.company_uuid,
    type: 'chat',
    enabled: Boolean(item.serverFileName && item.company_uuid && (item.isImage || item.isVideo)),
  });

  return (
    <button
      type="button"
      className={cn('relative shrink-0 overflow-hidden bg-[#17233d]', className)}
      onClick={(event) => {
        event.stopPropagation();
        onPreview(item.serverFileName);
      }}
      aria-label={`Preview ${item.fileName}`}
    >
      {isLoading ? (
        <span className="flex h-full w-full items-center justify-center text-white/80">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      ) : item.isImage && mediaUrl ? (
        <img
          src={mediaUrl}
          alt={item.fileName}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : item.isVideo && mediaUrl ? (
        <video
          src={mediaUrl}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-white/75">
          {getMediaFallbackIcon(item)}
        </span>
      )}

      {item.isVideo ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white">
            <Video className="h-4 w-4" />
          </span>
        </span>
      ) : null}
    </button>
  );
};

const FilesTab = ({
  items,
  searchQuery,
  setSearchQuery,
}: {
  items: InfoAttachment[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) => {
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      `${item.fileName} ${item.fileType} ${item.senderName} ${item.fileSizeLabel} ${formatCompactDate(item.createdAt)}`
        .toLowerCase()
        .includes(query),
    );
  }, [items, searchQuery]);

  const groups = useMemo(() => groupByMonth(filteredItems), [filteredItems]);

  return (
    <div className="bg-white">
      <div className="shrink-0 px-3 py-3">
        <SearchBar
          placeholder="Search files by name, type, sender or date"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>
      <div className="pb-4">
        {filteredItems.length === 0 ? (
          <EmptyState label="No files found" />
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-4">
              <MonthLabel>{group.label}</MonthLabel>
              <div className="flex flex-col">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex min-h-14 items-center gap-3 border-b border-slate-100 px-3 py-2"
                  >
                    <FileIconBadge item={item} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-700">
                        {item.fileName}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
                        {item.fileType} - {item.fileSizeLabel} - {item.senderName} -{' '}
                        {formatCompactDate(item.createdAt)}
                      </p>
                    </div>
                    <DownloadButton
                      fileName={item.fileName}
                      file_name={item.serverFileName}
                      company_uuid={item.company_uuid}
                      type="chat"
                      className="text-slate-300 hover:text-primary"
                      size="h-4 w-4"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const LinksTab = ({
  linksList,
  searchQuery,
  setSearchQuery,
}: {
  linksList: LinkItem[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) => {
  const filteredLinks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return linksList;

    return linksList.filter((item) =>
      `${item.url} ${item.domain} ${item.senderName} ${formatCompactDate(item.msgCreatedAt)}`
        .toLowerCase()
        .includes(query),
    );
  }, [linksList, searchQuery]);

  const groups = useMemo(() => groupByMonth(filteredLinks), [filteredLinks]);

  return (
    <div className="bg-white">
      <div className="shrink-0 px-3 py-3">
        <SearchBar
          placeholder="Search links by URL or domain"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>
      <div className="pb-4">
        {filteredLinks.length === 0 ? (
          <EmptyState label="No links found" />
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-4">
              <MonthLabel>{group.label}</MonthLabel>
              <div className="flex flex-col">
                {group.items.map((item, index) => {
                  const href = /^https?:\/\//i.test(item.url) ? item.url : `https://${item.url}`;

                  return (
                    <a
                      key={`${item.url}-${index}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-14 items-center gap-3 border-b border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                        <Link2 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-blue-500">
                          {item.url}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-medium text-slate-400">
                          {item.domain}
                        </span>
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-slate-300" />
                    </a>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const CallsTab = ({
  callsList,
  searchQuery,
  setSearchQuery,
}: {
  callsList: CallItem[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) => {
  const filteredCalls = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return callsList;
    return callsList.filter((item) => item.searchText.includes(query));
  }, [callsList, searchQuery]);

  return (
    <div className="bg-white">
      <div className="shrink-0 px-3 py-3">
        <SearchBar
          placeholder="Search calls by type, status or date"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>
      <div className="pb-4">
        {filteredCalls.length === 0 ? (
          <EmptyState label="No calls found" />
        ) : (
          filteredCalls.map((item) => {
            const isMissed = item.status === 'missed';

            return (
              <div
                key={item.id}
                className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50"
              >
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white',
                    isMissed ? 'bg-red-500' : 'bg-teal-500',
                  )}
                >
                  {isMissed ? (
                    <PhoneMissed className="h-5 w-5" />
                  ) : (
                    <UsersRound className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-sm font-semibold',
                      isMissed ? 'text-red-500' : 'text-slate-700',
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
                    {item.subtitle}
                  </p>
                </div>
                {item.durationLabel ? (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                    {item.durationLabel}
                  </span>
                ) : null}
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const MembersTab = ({
  members,
  onlineCount,
  currentUserUuid,
  selectedChat,
  usersOnlineStatus,
  getUserProfileByUuid,
  isMeOnCall,
  onCall,
  onDirectChat,
  searchQuery,
  setSearchQuery,
}: {
  members: any[];
  onlineCount: number;
  currentUserUuid: string;
  selectedChat: any;
  usersOnlineStatus: any[];
  getUserProfileByUuid: (uuid: string) => string;
  isMeOnCall: boolean;
  onCall: (member: any) => void;
  onDirectChat: (member: any) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) => {
  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) =>
      `${getMemberDisplayName(member)} ${member?.email || ''} ${member?.extension || ''}`
        .toLowerCase()
        .includes(query),
    );
  }, [members, searchQuery]);

  return (
    <div className="bg-white">
      <div className="shrink-0 px-3 py-3">
        <SearchBar
          placeholder="Search members by name, email or ext..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>
      <div className="flex items-center justify-between px-3 pb-2 text-xs font-semibold">
        <span className="text-slate-400">
          {members.length} {members.length === 1 ? 'participant' : 'participants'}
        </span>
        <span className="text-emerald-500">{onlineCount} online</span>
      </div>
      <div className="pb-4">
        {filteredMembers.length === 0 ? (
          <EmptyState label="No members found" />
        ) : (
          filteredMembers.map((member) => {
            const isMe = member?.uuid === currentUserUuid;
            const displayName = isMe ? 'You' : getMemberDisplayName(member);
            const isOnline = Boolean(
              usersOnlineStatus?.find((statusUser: any) => statusUser?.userId == member?.extension)
                ?.online,
            );
            const isMemberOnCall = Boolean(
              usersOnlineStatus?.find((statusUser: any) => statusUser?.userId == member?.extension)
                ?.onCall,
            );
            const isCreatorAdmin = selectedChat?.admins?.[0] === member?.uuid;
            const isAdmin =
              selectedChat?.admins?.includes(member?.uuid) ||
              selectedChat?.subAdmins?.includes(member?.uuid);
            const canCall =
              !isMe && member?.extension && !isMeOnCall && !isMemberOnCall && isOnline;

            return (
              <div
                key={member?.uuid}
                className="flex min-h-14 items-center gap-3 px-3 py-2 transition-colors hover:bg-slate-50"
              >
                <div className="relative shrink-0">
                  <CustomAvatar
                    name={displayName}
                    size="36"
                    image={
                      member?.profile || member?.avatar || getUserProfileByUuid(member?.uuid) || ''
                    }
                    showPresence={false}
                  />
                  <span
                    className={cn(
                      'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white',
                      isOnline ? 'bg-emerald-500' : 'bg-slate-300',
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">{displayName}</p>
                  {member?.email ? (
                    <p className="truncate text-xs font-medium text-slate-400">{member.email}</p>
                  ) : null}
                  {member?.extension ? (
                    <div className="mt-0.5 flex items-center gap-2 text-xs font-medium text-slate-400">
                      <span>Ext: {member.extension}</span>
                      {!isMe ? (
                        <button
                          type="button"
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full',
                            canCall
                              ? 'bg-emerald-50 text-emerald-500'
                              : 'bg-slate-100 text-slate-300',
                          )}
                          disabled={!canCall}
                          onClick={() => onCall(member)}
                          title={canCall ? 'Call member' : 'Member unavailable'}
                        >
                          <PhoneCall className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {isAdmin ? (
                  <span
                    className={cn(
                      'shrink-0 rounded px-2 py-1 text-[10px] font-bold uppercase',
                      isCreatorAdmin
                        ? 'bg-blue-50 text-blue-500 ring-1 ring-blue-100'
                        : 'bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100',
                    )}
                  >
                    {isCreatorAdmin ? 'Creator Admin' : 'Admin'}
                  </span>
                ) : null}

                {!isMe ? (
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-blue-500 transition-colors hover:bg-blue-50"
                    onClick={() => onDirectChat(member)}
                    title="Direct message"
                  >
                    <MessageCircleMoreIcon className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const MonthLabel = ({ children }: { children: ReactNode }) => (
  <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
    {children}
  </div>
);

const FileIconBadge = ({ item }: { item: InfoAttachment }) => {
  const extension = getFileExtension(item.fileName || item.serverFileName);
  const fileType = item.fileType;

  const iconMeta = (() => {
    if (fileType === FILE_TYPES.PDF) {
      return {
        icon: <FileText className="h-5 w-5" />,
        className: 'bg-purple-50 text-purple-500',
      };
    }
    if (fileType === FILE_TYPES.SPREADSHEET) {
      return {
        icon: <FileSpreadsheet className="h-5 w-5" />,
        className: 'bg-emerald-50 text-emerald-500',
      };
    }
    if (fileType === FILE_TYPES.PRESENTATION) {
      return {
        icon: <FileText className="h-5 w-5" />,
        className: 'bg-sky-50 text-sky-500',
      };
    }
    if (fileType === FILE_TYPES.ARCHIVE) {
      return {
        icon: <FileArchive className="h-5 w-5" />,
        className: 'bg-amber-50 text-amber-500',
      };
    }
    if (fileType === FILE_TYPES.AUDIO) {
      return {
        icon: <FileAudio className="h-5 w-5" />,
        className: 'bg-rose-50 text-rose-500',
      };
    }
    return {
      icon: extension ? (
        <span className="text-[10px] font-bold uppercase">{extension.slice(0, 3)}</span>
      ) : (
        <File className="h-5 w-5" />
      ),
      className: 'bg-blue-50 text-blue-500',
    };
  })();

  return (
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
        iconMeta.className,
      )}
    >
      {iconMeta.icon}
    </span>
  );
};

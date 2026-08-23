import { chatEvents } from '@/context/socket-events';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserLine, UsersGroupLine } from '@/assets/icons';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2, Search } from 'lucide-react';
import { v4 as uuidV4 } from 'uuid';

type ForwardTarget = {
  chatId: string;
  name: string;
  isGroupChat: boolean;
  users: any[];
  isHidden?: string[];
  isAvailableUser?: boolean;
  otherUserUuid?: string;
  otherUserEmail?: string;
  otherUserExtension?: string;
};

const TargetList = ({
  list,
  selectedChatIds,
  toggleSelection,
}: {
  list: ForwardTarget[];
  selectedChatIds: string[];
  toggleSelection: (id: string) => void;
}) => {
  return (
    <div className="h-full overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/40">
      {!list.length ? (
        <div className="flex h-full items-center justify-center px-3 text-sm text-gray-500">
          No chats found
        </div>
      ) : (
        list.map((item) => {
          const isSelected = selectedChatIds.includes(item.chatId);
          return (
            <button
              key={item.chatId}
              type="button"
              onClick={() => toggleSelection(item.chatId)}
              className={cn(
                'flex w-full items-center justify-between border-b border-gray-200 bg-white px-3 py-2.5 text-left last:border-b-0',
                isSelected ? 'bg-primary/10' : 'hover:bg-gray-50',
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    isSelected ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-600',
                  )}
                >
                  {item.isGroupChat ? (
                    <UsersGroupLine className="h-4 w-4" />
                  ) : (
                    <UserLine className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.isGroupChat ? 'Team Chat' : 'Direct Chat'}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isSelected}
                readOnly
                className="h-4 w-4 cursor-pointer"
              />
            </button>
          );
        })
      )}
    </div>
  );
};

const ForwardMessageModal = ({ handleClose, showForwardModal }: any) => {
  const { user } = useUser();
  const { users: directoryUsers = [] } = useUsersDirectory();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    allChats = [],
    socketEventsManager,
    handleSendMessage,
    handleOpenChatInWindow,
    createPrivateChatId,
  } = useSocketEvents();

  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const selectedChatType = (searchParams.get('chatType') || 'chat').toLowerCase();
  const currentChatId = searchParams.get('chatId');

  const messagesToForward = useMemo(
    () =>
      Array.isArray(showForwardModal)
        ? showForwardModal
        : showForwardModal
          ? [showForwardModal]
          : [],
    [showForwardModal],
  );

  const forwardTargets = useMemo(() => {
    const chats = Array.isArray(allChats) ? allChats : [];
    const currentUserId = user?.uuid;
    const currentUserName = `${user?.first_name || user?.user_info?.first_name || ''} ${
      user?.last_name || user?.user_info?.last_name || ''
    }`.trim();

    const existingDirectChatUserUuids = new Set<string>();

    const mappedChats = chats
      .filter((chat: any) => chat?.chatId)
      .filter((chat: any) => chat?.chatId !== currentChatId)
      .filter((chat: any) => !chat?.isDeleted)
      .filter((chat: any) => !chat?.isHidden?.includes(currentUserId))
      .filter((chat: any) => chat?.groupType !== 'AI' && chat?.groupType !== 'MEETING')
      .filter((chat: any) => {
        const chatType = String(
          chat?.type || chat?.chatType || chat?.metaData?.type || '',
        ).toLowerCase();
        if (selectedChatType === 'chat') return !chatType || chatType === 'chat';
        return chatType === selectedChatType;
      })
      .map((chat: any) => {
        const isGroupChat = !!chat?.isGroupChat;
        const otherUser = Array.isArray(chat?.users)
          ? chat.users.find((chatUser: any) => chatUser?.uuid !== currentUserId)
          : null;

        if (!isGroupChat && otherUser?.uuid) {
          existingDirectChatUserUuids.add(otherUser.uuid);
        }

        const chatName = isGroupChat
          ? chat?.name || 'Team'
          : chat?.chatId === currentUserId
            ? currentUserName || 'You'
            : otherUser?.name ||
              `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim() ||
              'Unknown User';

        return {
          chatId: chat?.chatId,
          name: chatName,
          isGroupChat,
          users: Array.isArray(chat?.users) ? chat.users : [],
          isHidden: chat?.isHidden || [],
        } as ForwardTarget;
      });

    const availableUsers = directoryUsers
      .filter((u: any) => u.uuid !== currentUserId && !existingDirectChatUserUuids.has(u.uuid))
      .map((u: any) => {
        const generatedChatId = createPrivateChatId([currentUserId, u.uuid]);
        const otherUserName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
        return {
          chatId: generatedChatId,
          name: otherUserName,
          isGroupChat: false,
          isAvailableUser: true,
          otherUserUuid: u.uuid,
          otherUserEmail: u.email,
          otherUserExtension: u.extension,
          users: [
            { uuid: currentUserId, first_name: user?.first_name, last_name: user?.last_name },
            { uuid: u.uuid, first_name: u.first_name, last_name: u.last_name },
          ],
          isHidden: [],
        } as ForwardTarget;
      });

    return [...mappedChats, ...availableUsers].sort((a, b) => a.name.localeCompare(b.name));
  }, [
    allChats,
    currentChatId,
    user?.uuid,
    user?.first_name,
    user?.last_name,
    user?.user_info?.first_name,
    user?.user_info?.last_name,
    selectedChatType,
    directoryUsers,
    createPrivateChatId,
  ]);

  const usersList = useMemo(
    () => forwardTargets.filter((chat) => !chat.isGroupChat),
    [forwardTargets],
  );
  const teamsList = useMemo(
    () => forwardTargets.filter((chat) => chat.isGroupChat),
    [forwardTargets],
  );

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return usersList;
    return usersList.filter((item) => item.name.toLowerCase().includes(query));
  }, [searchQuery, usersList]);

  const filteredTeams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return teamsList;
    return teamsList.filter((item) => item.name.toLowerCase().includes(query));
  }, [searchQuery, teamsList]);

  const selectedTargets = useMemo(
    () => forwardTargets.filter((target) => selectedChatIds.includes(target.chatId)),
    [forwardTargets, selectedChatIds],
  );

  const toggleSelection = (chatId: string) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId],
    );
  };

  const ensureVisibleIfHidden = async (target: ForwardTarget) => {
    if (!target?.chatId || !socketEventsManager || !user?.uuid) return;
    if (!target?.isHidden?.includes(user?.uuid)) return;

    await new Promise<void>((resolve) => {
      socketEventsManager.emit(
        chatEvents.REVERT_CHAT,
        {
          chatId: target.chatId,
          senderId: user.uuid,
        },
        () => resolve(),
      );
    });
  };

  const getReceiverIds = (target: ForwardTarget) => {
    if (!target?.chatId || !user?.uuid) return [];
    if (target?.isGroupChat) {
      return (Array.isArray(target?.users) ? target.users : [])
        .map((chatUser: any) => chatUser?.uuid)
        .filter((id: string) => !!id && id !== user.uuid);
    }
    const otherUser = (Array.isArray(target?.users) ? target.users : []).find(
      (chatUser: any) => chatUser?.uuid !== user.uuid,
    );
    return otherUser?.uuid ? [otherUser.uuid] : [];
  };

  const forwardSingleMessage = async (target: ForwardTarget, messageItem: any) => {
    const attachments = messageItem?.attachments || messageItem?.groupAttachments || [];
    const messageText = messageItem?.message || messageItem?.metaData?.isReplied?.message || '';
    const receiverIds = getReceiverIds(target);

    if (!receiverIds.length || !target?.chatId || !user?.uuid) return;

    const messagePayload: any = {
      chatId: target.chatId,
      message: messageText,
      attachments: attachments || [],
      senderId: user.uuid,
      receiverId: receiverIds,
      messageId: uuidV4(),
      isForwarded: true,
      createdAt: new Date().toISOString(),
    };

    if (messageItem?.messageType) {
      messagePayload.messageType = messageItem.messageType;

      if (messageItem.messageType === 'poll' && messageItem.poll) {
        messagePayload.poll = {
          ...messageItem.poll,
          options:
            messageItem.poll.options?.map((opt: any) => ({
              ...opt,
              votes: [],
            })) || [],
        };
      } else if (messageItem.messageType === 'event' && messageItem.event) {
        messagePayload.event = {
          ...messageItem.event,
        };
      } else if (messageItem.messageType === 'task' && messageItem.task) {
        messagePayload.task = {
          ...messageItem.task,
        };
      }
    }

    await new Promise<void>((resolve) => {
      handleSendMessage(messagePayload, () => resolve());
    });
  };

  const handleForward = async () => {
    if (!selectedTargets.length) {
      toast.error('Please select at least one chat');
      return;
    }

    if (!messagesToForward.length) {
      toast.error('No messages to forward');
      return;
    }

    try {
      setIsForwarding(true);

      await Promise.all(
        selectedTargets.map(async (target) => {
          if (target.isAvailableUser && socketEventsManager) {
            await new Promise<void>((resolve) => {
              socketEventsManager.emit(
                chatEvents.CREATE_NEW_CHAT,
                {
                  chatId: target.chatId,
                  company_uuid: user?.company_info?.uuid,
                  users: [
                    {
                      uuid: user?.uuid,
                      name: `${user?.first_name || user?.user_info?.first_name || ''} ${user?.last_name || user?.user_info?.last_name || ''}`.trim(),
                      email: user?.email || user?.user_info?.email,
                      extension: user?.extension || user?.user_info?.extension,
                    },
                    {
                      uuid: target.otherUserUuid,
                      name: target.name,
                      email: target.otherUserEmail,
                      extension: target.otherUserExtension,
                    },
                  ],
                  allUsers: [
                    {
                      uuid: user?.uuid,
                      name: `${user?.first_name || user?.user_info?.first_name || ''} ${user?.last_name || user?.user_info?.last_name || ''}`.trim(),
                      email: user?.email || user?.user_info?.email,
                      extension: user?.extension || user?.user_info?.extension,
                    },
                    {
                      uuid: target.otherUserUuid,
                      name: target.name,
                      email: target.otherUserEmail,
                      extension: target.otherUserExtension,
                    },
                  ],
                },
                () => resolve(),
              );
            });
          } else {
            await ensureVisibleIfHidden(target);
          }

          for (const messageItem of messagesToForward) {
            await forwardSingleMessage(target, messageItem);
          }
        }),
      );

      if (selectedTargets.length === 1) {
        const selectedTarget = selectedTargets[0];
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('chatId', selectedTarget.chatId);
          return next;
        });
        handleOpenChatInWindow(selectedTarget.chatId, false, false);
      }

      toast.success('Message forwarded successfully');
      handleClose();
    } catch (error) {
      console.error('Forward message failed:', error);
      toast.error('Failed to forward message');
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-lg overflow-hidden border border-gray-200 bg-white p-0">
        <div className="flex h-[80vh] min-h-[420px] max-h-[80vh] flex-col sm:h-[520px] sm:max-h-[520px]">
          <DialogHeader className="border-b gap-1 border-gray-200 px-4 pt-3 pb-2">
            <DialogTitle className="text-base mb-0">
              {Array.isArray(showForwardModal) ? 'Forward Messages' : 'Forward Message'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Select chats to forward message to
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
            <Input
              Icon={<Search className="h-4 w-4 text-gray-500" />}
              IconPosition="left-0 pl-3 inset-y-0"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users or teams..."
            />

            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'users' | 'teams')}
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList className="h-auto w-full justify-start gap-6 rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="users"
                  className="h-auto flex-none rounded-none border-0 border-b-2 border-transparent px-0 pb-2 pt-0 text-base font-medium text-gray-700 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <span className="truncate">Users</span>
                  <span className="text-xs font-medium text-gray-500">({usersList.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="teams"
                  className="h-auto flex-none rounded-none border-0 border-b-2 border-transparent px-0 pb-2 pt-0 text-base font-medium text-gray-700 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <span className="truncate">Teams</span>
                  <span className="text-xs font-medium text-gray-500">({teamsList.length})</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="users" className="mt-2 min-h-0 flex-1">
                <TargetList
                  list={filteredUsers}
                  selectedChatIds={selectedChatIds}
                  toggleSelection={toggleSelection}
                />
              </TabsContent>
              <TabsContent value="teams" className="mt-2 min-h-0 flex-1">
                <TargetList
                  list={filteredTeams}
                  selectedChatIds={selectedChatIds}
                  toggleSelection={toggleSelection}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <div className="text-xs text-gray-600">Selected: {selectedChatIds.length}</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="transparent"
                disabled={isForwarding}
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="min-w-[120px] bg-primary text-white hover:bg-primary/90"
                disabled={isForwarding || selectedChatIds.length === 0}
                onClick={handleForward}
              >
                {isForwarding ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Forwarding...
                  </span>
                ) : (
                  'Forward'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardMessageModal;

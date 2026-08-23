import { NoticeLine } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { Button } from '@/components/ui/button';
import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { useUser } from '@/hooks/use-user';
import moment from 'moment';
import { Label } from '@/components/ui/label';
import { ExtensionListView } from '@/pages/admin-settings/users/extension/update-forwarding/call-rules/add-coworker';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { generateUniqueId } from '@/lib/utils';
import { chatEvents } from '@/context/socket-events';
// import { toast } from 'react-toastify';
import { createPrivateChatId } from '@/context/socket-events-context';
import useDebounce from '@/hooks/use-debounce';
import { useMessengerUsers } from '../../hooks/use-messenger-users';

const validationSchema = yup.object().shape({
  message: yup.string().required('Message is required'),
  member: yup
    .object({
      uuid: yup.string(),
    })
    .nullable()
    .test('required', 'Recipient is required', (val) => !!val?.uuid),
  attachments: yup.array(),
});

const CreateDirectChat = ({
  handleClose = () => null,
  onChatSelect,
}: {
  handleClose: any;
  onChatSelect?: (chat: any) => void;
}) => {
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const { socketEventsManager, allChats } = useSocketEvents();
  const { user } = useUser();

  const {
    setValue,
    watch,
    reset,
    formState: { errors },
    handleSubmit,
  } = useForm({
    mode: 'all',
    defaultValues: {
      member: null,
      message: '',
      attachments: [],
    },
    resolver: yupResolver(validationSchema),
  });

  const debouncedUserSearch = useDebounce(userSearch, 300);
  const {
    users: userListing,
    fetchNextPage,
    hasNextPage = false,
    isFetchingNextPage,
    isLoading: isLoadingUsers,
  } = useMessengerUsers({
    search: debouncedUserSearch,
  });

  const [member] = watch(['member']);
  const memberErrorMessage =
    (errors?.member as any)?.message || (errors?.member as any)?.uuid?.message || '';
  const messageErrorMessage = (errors?.message as any)?.message || '';

  async function handleSendMessage(values: any) {
    const trimmedMessage = values?.message?.trim();
    if (!trimmedMessage) return;
    setIsSendingMessage(true);
    const selectedUser = values?.member;

    try {
      const chatId = createPrivateChatId([user.uuid, selectedUser?.uuid]);

      // Check if this chat already exists in allChats
      const chatExists = Array.isArray(allChats)
        ? allChats.find((chat: any) => chat?.chatId === chatId)
        : null;

      if (!chatExists) {
        // Chat doesn't exist yet — create it first via socket
        socketEventsManager?.emit(
          chatEvents.CREATE_NEW_CHAT,
          {
            chatId,
            company_uuid: user?.company_info?.uuid,
            users: [
              {
                uuid: user?.uuid,
                name: `${user?.first_name || user?.user_info?.first_name || ''} ${user?.last_name || user?.user_info?.last_name || ''}`.trim(),
                email: user?.email || user?.user_info?.email,
                extension: user?.extension || user?.user_info?.extension,
              },
              {
                uuid: selectedUser?.uuid,
                name: `${selectedUser?.first_name || ''} ${selectedUser?.last_name || ''}`.trim(),
                email: selectedUser?.email,
                extension: selectedUser?.extension || selectedUser?.value,
              },
            ],
          },
          (response: any) => {
            console.info('Server ack: handleSendMessage', response);
            if (trimmedMessage && response?.status === 200) {
              const defaultEditorValue = [
                {
                  type: 'paragraph',
                  children: [{ text: trimmedMessage }],
                },
              ] as any;
              // ✅ send message only after chat is created
              socketEventsManager?.emit(chatEvents.SEND_MESSAGE, {
                chatId,
                message: defaultEditorValue,
                attachments: [],
                senderId: user?.uuid,
                messageId: generateUniqueId(),
                receiverId: [selectedUser?.uuid],
                createdAt: moment().format('YYYY-MM-DD[T]HH:mm:ss.SSSZZ'),
              });
              // toast.success('Chat created successfully!');
              if (onChatSelect) {
                onChatSelect({ chatId });
              }
              reset();
              handleClose();
            }
          },
        );
      } else {
        console.info('Server ack: handleSendMessage', chatExists);
        if (trimmedMessage && chatExists) {
          const defaultEditorValue = [
            {
              type: 'paragraph',
              children: [{ text: trimmedMessage }],
            },
          ] as any;
          // ✅ send message only after chat is created
          socketEventsManager?.emit(chatEvents.SEND_MESSAGE, {
            chatId,
            message: defaultEditorValue,
            attachments: [],
            senderId: user?.uuid,
            messageId: generateUniqueId(),
            receiverId: [selectedUser?.uuid],
            createdAt: moment().format('YYYY-MM-DD[T]HH:mm:ss.SSSZZ'),
          });

          if (onChatSelect) {
            onChatSelect({ chatId });
          }
          reset();
          handleClose();
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSendingMessage(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1.5 text-gray-900">
        <div className="font-semibold truncate text-md flex items-center justify-between min-h-11">
          New Message
        </div>
      </div>

      <div className="w-full flex flex-col gap-2 justify-between h-full">
        <div className="flex flex-col h-[calc(100vh_-_10rem)] overflow-auto gap-4 pt-2">
          <CustomSelect
            label={'Recipient'}
            options={userListing
              ?.filter((item: any) => item?.uuid !== user?.uuid)
              ?.map((u: any) => ({
                ...u,
                label: `${u?.first_name} ${u?.last_name}`,
                value: u?.extension,
                uuid: u?.uuid,
              }))}
            value={member}
            handleChange={(e) => setValue('member', e, { shouldValidate: true })}
            placeholder="Search by name..."
            error={memberErrorMessage}
            FormatOptionLabel={ExtensionListView}
            isLoading={isLoadingUsers || isFetchingNextPage}
            onInputChange={setUserSearch}
            onMenuScrollToBottom={() => {
              if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
            }}
          />

          <div className="flex flex-col gap-2.5 w-full">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <Label>{'Message'}</Label>
                <div className="flex justify-end">
                  {messageErrorMessage && (
                    <CustomTooltip text={messageErrorMessage}>
                      <span className="inline-flex items-center cursor-pointer">
                        <NoticeLine className="w-3.5 h-3.5 text-red-500" />
                      </span>
                    </CustomTooltip>
                  )}
                </div>
              </div>
              <div
                className={`flex items-center w-full rounded-xl ${messageErrorMessage ? 'border border-red-500' : 'border border-gray-300'}`}
              >
                <div className="flex min-h-[126px] justify-between w-full p-3 flex-col gap-2">
                  <textarea
                    rows={4}
                    className="border-none outline-0 text-sm resize-none placeholder:text-gray-700"
                    placeholder="Write a message..."
                    value={watch('message')}
                    onChange={(e) =>
                      setValue('message', e.target.value, {
                        shouldValidate: true,
                        shouldTouch: true,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        setValue('message', `${watch('message')}\n`, {
                          shouldValidate: true,
                          shouldTouch: true,
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-gray-900 text-sm">
                Conversation with one or more specific people is great for informal chat. For
                projects, team, or topic-based discussion, consider&nbsp;
                <span className="text-primary cursor-pointer">sending message to team.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant={'transparent'} type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant={'outline'}
            type="button"
            onClick={handleSubmit(handleSendMessage)}
            disabled={isSendingMessage}
          >
            Send Message
          </Button>
        </div>
      </div>
    </>
  );
};

export default CreateDirectChat;

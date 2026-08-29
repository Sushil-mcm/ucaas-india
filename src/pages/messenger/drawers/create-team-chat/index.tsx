// import { CloseIcon, EmojiICon, FileIcon } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import * as yup from 'yup';
import { useUser } from '@/hooks/use-user';
import { generateUniqueId } from '@/lib/utils';
import moment from 'moment';
import { Label } from '@/components/ui/label';
import { ExtensionListView } from '@/pages/admin-settings/people/update-forwarding/call-rules/add-coworker';
import ErrorTooltip from '@/components/custom/error-tooltip';
import Loader from '@/components/custom/loader';
import CustomAvatar from '@/components/custom/custom-avatar';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { chatEvents } from '@/context/socket-events';
import { toast } from 'react-toastify';
import { v4 as uuidV4 } from 'uuid';
import useDebounce from '@/hooks/use-debounce';
import { useMessengerUsers } from '../../hooks/use-messenger-users';

// ─── PERMISSION FIELDS (mirrored from connect-web) ────────────────────────────
const PERMISSION_FIELDS = [
  { send_message: 'Send Message' },
  { file_sharing: 'File Sharing' },
  { download_files: 'Download Files' },
  { make_audio_video_calls: 'Make Audio/Video Calls' },
  { screen_share: 'Screen Share' },
  { edit_message: 'Edit Message' },
  { delete_message: 'Delete Message' },
  { add_remove_participants: 'Add/Remove Participants' },
  { edit_channel_name: 'Edit Channel' },
];

const getDefaultPermissions = () =>
  PERMISSION_FIELDS.reduce(
    (acc: any, field: any) => {
      const key = Object.keys(field)[0];
      acc[key] = { key: 'everyone', value: [] };
      return acc;
    },
    {} as Record<string, any>,
  );

const validationSchema: yup.ObjectSchema<any> = yup.object({
  channelName: yup
    .string()
    .trim()
    .required('Team name is required')
    .max(50, 'Team name must not exceed 50 characters'),
  members: yup
    .array()
    .of(yup.object({ uuid: yup.string() }).required())
    .when('$isEdit', {
      is: true,
      then: (schema) => schema.optional().nullable(),
      otherwise: (schema) =>
        schema.min(1, 'Select at least one member').required('Select at least one member'),
    }),
  description: yup
    .string()
    .trim()
    .default('')
    .defined()
    .max(255, 'Description must not exceed 255 characters'),
  message: yup.string().trim().default('').defined(),
  channelImg: yup.string().optional(),
  privacy_settings: yup
    .mixed<'public' | 'private' | 'anyone_can_join'>()
    .oneOf(['public', 'private', 'anyone_can_join'])
    .required()
    .default('public'),
  permissions: yup.object(),
  attachments: yup.array(),
});

const CreateTeamChat = ({
  handleClose = () => null,
  currentChat,
  onChatSelect,
}: {
  handleClose: any;
  currentChat?: any;
  onChatSelect?: (chatId: any) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const emojiPickerRef = useRef(null);
  // const [emojiOpen, setEmojiOpen] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const isCreatingTeamRef = useRef(false);
  const { user } = useUser();
  const {
    socketEventsManager,
    handleUpdateChannel,
    handleAddChannelImage,
    handleRemoveChannelImage,
  } = useSocketEvents();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
    clearErrors,
    setError,
  } = useForm<any>({
    resolver: yupResolver(validationSchema),
    context: { isEdit: !!currentChat },
    defaultValues: {
      channelImg: currentChat?.avatar || '',
      channelName: currentChat?.name || '',
      members: currentChat?.users || [],
      description: currentChat?.description || '',
      message: '',
      privacy_settings: currentChat?.privacy_settings || 'public',
      permissions: getDefaultPermissions(),
      attachments: [],
    },
  });
  console.log(isSubmitting, 'isSubmitting');

  const members = watch('members') || [];
  const teamNameValue = watch('channelName') || '';
  const descriptionValue = watch('description') || '';
  const teamNameErrorMessage = (errors?.channelName?.message as string) || '';
  const membersErrorMessage = (errors?.members?.message as string) || '';

  const nameToShow = currentChat?.name || '';

  // ─── Load member list ────────────────────────────────────────────|
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

  const formattedMembers = useMemo(
    () =>
      userListing
        ?.filter((item: any) => item?.uuid !== user?.uuid)
        ?.map((item: any) => ({
          ...item,
          label: `${item?.first_name || ''} ${item?.last_name || ''}`.trim(),
          value: item?.extension,
          uuid: item?.uuid,
        })) || [],
    [userListing, user?.uuid],
  );

  // ─── Pre-fill for edit ───────────────────────────────────────────
  useEffect(() => {
    isCreatingTeamRef.current = false;
    if (!currentChat) {
      reset({ permissions: getDefaultPermissions(), privacy_settings: 'public', members: [] });
      return;
    }
    const selected = (currentChat?.users || [])
      .filter((item: any) => !currentChat?.admins?.includes(item.uuid))
      .map((item: any) => ({
        ...item,
        label: item?.name?.trim() || `${item?.first_name || ''} ${item?.last_name || ''}`.trim(),
        value: item?.extension,
        uuid: item?.uuid,
      }));
    setValue('members', selected);
    setValue('channelName', currentChat?.name || '');
    setValue('description', currentChat?.description || '');
    setValue('channelImg', currentChat?.avatar || '');
    setValue('privacy_settings', currentChat?.privacy_settings || 'public');
  }, [currentChat, setValue, reset]);

  // ─── API mutations (removed in favor of socket) ──────────────────────────────

  // ─── Submit ──────────────────────────────────────────────────────
  const onSubmit: SubmitHandler<any> = async (values) => {
    if (isCreatingTeamRef.current) return;
    isCreatingTeamRef.current = true;

    try {
      let hasError = false;
      Object.keys(values?.permissions || {}).forEach((key) => {
        const perm = values.permissions[key];
        if (perm?.key === 'custom' && (!perm.value || perm.value.length === 0)) {
          setError(`permissions.${key}.value`, {
            type: 'manual',
            message: 'Please select at least one member',
          });
          hasError = true;
        } else {
          clearErrors(`permissions.${key}.value`);
        }
      });
      if (hasError) {
        isCreatingTeamRef.current = false;
        return;
      }
      console.log('CreateTeamChat onSubmit:', { values, currentChat });

      const chatId = currentChat?.chatId || uuidV4();
      const payload: any = {
        chatId,
        name: values?.channelName,
        description: values?.description || '',
        avatar: values?.channelImg || '',
        isGroupChat: true,
        groupType: 'CHANNEL',
        company_uuid: user?.company_info?.uuid,
        admins: currentChat?.admins || [user?.uuid],
        subAdmins: currentChat?.subAdmins || [],
        ...(currentChat
          ? {
              // mode: 'chat-updated',
              users: currentChat?.users || [],
              permissions: values?.permissions,
              privacy_settings: values?.privacy_settings,
            }
          : {
              users: values?.members?.map((m: any) => ({
                uuid: m?.uuid,
                name: `${m?.first_name || ''} ${m?.last_name || ''}`.trim(),
                email: m?.email,
                extension: m?.extension || m?.value,
              })),
              message: values?.message || '',
              permissions: values?.permissions,
              privacy_settings: values?.privacy_settings,
            }),
      };

      if (currentChat) {
        console.log('Calling handleUpdateChannel with:', payload);
        handleUpdateChannel(payload);

        const previousAvatar = String(currentChat?.avatar || '').trim();
        const nextAvatar = String(values?.channelImg || '').trim();
        const avatarChanged = previousAvatar !== nextAvatar;

        if (avatarChanged && currentChat?.chatId) {
          if (nextAvatar) {
            handleAddChannelImage(currentChat.chatId, nextAvatar);
          } else if (previousAvatar) {
            handleRemoveChannelImage(currentChat.chatId);
          }
        }

        toast.success('Team updated successfully!');
        reset();
        handleClose();
      } else {
        // Create the group/team via socket (same pattern as createNewChat in socket-events-context)
        setIsSendingMessage(true);
        const memberUsers = (values?.members || []).map((m: any) => ({
          uuid: m?.uuid,
          name: m?.label || `${m?.first_name || ''} ${m?.last_name || ''}`.trim(),
          email: m?.email,
          extension: m?.extension || m?.value,
        }));

        const allUsers = [
          {
            uuid: user?.uuid,
            name: `${user?.first_name || user?.user_info?.first_name || ''} ${user?.last_name || user?.user_info?.last_name || ''}`.trim(),
            email: user?.email || user?.user_info?.email,
            extension: user?.extension || user?.user_info?.extension,
          },
          ...memberUsers,
        ];

        await new Promise<void>((resolve) => {
          if (!socketEventsManager) {
            resolve();
            return;
          }
          const timer = setTimeout(() => {
            resolve();
          }, 10000);

          socketEventsManager.emit(
            chatEvents.CREATE_NEW_CHAT,
            {
              chatId,
              company_uuid: user?.company_info?.uuid,
              admins: [user?.uuid],
              isGroupChat: true,
              groupType: 'CHANNEL',
              name: values?.channelName,
              description: values?.description || '',
              avatar: values?.channelImg || '',
              users: allUsers,
            },
            (response: any) => {
              clearTimeout(timer);
              if (values?.message?.trim() && response?.status === 200) {
                const defaultEditorValue = [
                  { type: 'paragraph', children: [{ text: values.message.trim() }] },
                ] as any;
                // ✅ send message only after chat is created
                socketEventsManager?.emit(chatEvents.SEND_MESSAGE, {
                  chatId,
                  message: defaultEditorValue,
                  attachments: [],
                  senderId: user?.uuid,
                  messageId: generateUniqueId(),
                  receiverId: (values?.members || []).map((m: any) => m?.uuid),
                  createdAt: moment().format('YYYY-MM-DD[T]HH:mm:ss.SSSZZ'),
                });
              }
              if (onChatSelect) {
                onChatSelect({ chatId, isGroupChat: true, users: allUsers });
              }
              // toast.success('Chat created successfully!');
              reset();
              handleClose();
              resolve();
            },
          );
        });
      }
    } catch (error) {
      console.error('Error submitting CreateTeamChat form:', error);
    } finally {
      setIsSendingMessage(false);
      isCreatingTeamRef.current = false;
    }
  };

  // ─── Image helpers ────────────────────────────────────────────────
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setValue('channelImg', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // const channelPermissionOption = [
  //   { key: 'Only Admins', value: 'only-admin' },
  //   { key: 'Everyone', value: 'everyone' },
  //   { key: 'Custom', value: 'custom' },
  // ];

  // useClickOutside({ current: [emojiPickerRef.current] }, () => setEmojiOpen(false));

  // console logging errors if any
  useEffect(() => {
    if (errors && Object.keys(errors).length > 0) {
      console.log('CreateTeamChat Form Errors:', errors);
    }
  }, [errors]);

  return (
    <>
      <div className="flex flex-col gap-1.5 text-gray-900">
        <div className="font-semibold truncate text-md flex items-center justify-between min-h-11">
          <div className="flex items-center gap-2">
            {currentChat ? 'Edit Team' : 'Create New Team'}
          </div>
          {/* <div
            onClick={() => handleClose(false)}
            className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
          >
            <XIcon className="w-4 h-4" />
          </div> */}
        </div>
      </div>

      <div className="w-full flex flex-col gap-2 justify-between h-full">
        <form className="flex flex-col gap-3 w-full h-full" onSubmit={handleSubmit(onSubmit)}>
          <div className="w-full flex flex-col gap-1 overflow-auto max-h-[calc(100vh-140px)] min-h-[calc(100vh-140px)] ">
            {/* ── Avatar ─────────────────────────────────────── */}
            <Controller
              name="channelImg"
              control={control}
              render={({ field }) => (
                <>
                  <div className="flex items-center justify-center w-full bg-gray-100 p-2 relative min-h-[72px] rounded-t-xl">
                    <div
                      className="flex items-center justify-center w-28 h-28 rounded-full overflow-hidden cursor-pointer absolute -bottom-15 bg-white shadow-md border-2 border-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {field?.value ? (
                        <img
                          src={field.value}
                          alt="channel"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <CustomAvatar name={nameToShow || 'Team'} size="130" />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center pt-12 gap-2 mt-3">
                    {field.value ? (
                      <>
                        <Button
                          type="button"
                          variant={'link'}
                          className="flex items-center gap-1 p-0 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Update Photo
                        </Button>
                        <Button
                          type="button"
                          variant={'link'}
                          className="flex items-center gap-1 text-red-500 p-0 text-xs"
                          onClick={() => {
                            setValue('channelImg', '');
                          }}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant={'link'}
                        className="flex items-center gap-1 p-0 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload Photo
                      </Button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*,.jpeg"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={onFileChange}
                  />
                </>
              )}
            />

            <div className="flex flex-col px-2 gap-4 pt-2">
              {/* ── Team Name ───────────────────────────────────── */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Team name</label>
                  <div className="flex items-center gap-2">
                    {teamNameErrorMessage && <ErrorTooltip text={teamNameErrorMessage} />}
                    <span className="text-xs text-[#7a8aa1]">{teamNameValue.length}/50</span>
                  </div>
                </div>
                <Controller
                  name="channelName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      maxLength={50}
                      className={`text-sm ${teamNameErrorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      placeholder="Team name"
                    />
                  )}
                />
              </div>

              {/* ── Members ─────────────────────────────────────── */}
              {/* {!currentChat && ( */}
              <div className="flex flex-col gap-2">
                <CustomSelect
                  label={'Members'}
                  isMulti
                  options={formattedMembers}
                  value={members}
                  handleChange={(val: any) => setValue('members', val, { shouldValidate: true })}
                  placeholder="Search by name..."
                  error={membersErrorMessage}
                  inputClass="team_chat"
                  FormatOptionLabel={ExtensionListView}
                  isLoading={isLoadingUsers || isFetchingNextPage}
                  onInputChange={setUserSearch}
                  onMenuScrollToBottom={() => {
                    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
                  }}
                />
              </div>
              {/* )} */}

              {/* ── Description ─────────────────────────────────── */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Description (optional)</label>
                  <div className="flex items-center gap-2">
                    {errors?.description?.message && (
                      <ErrorTooltip text={errors.description.message as string} />
                    )}
                    <span className="text-xs text-[#7a8aa1]">{descriptionValue.length}/255</span>
                  </div>
                </div>
                <div
                  className={`flex items-center w-full rounded-xl ${
                    errors?.description?.message
                      ? 'border border-red-500'
                      : 'border border-gray-300'
                  }`}
                >
                  <div className="flex min-h-[126px] justify-between w-full p-3 flex-col gap-2">
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          rows={4}
                          className="border-none outline-0 text-sm resize-none"
                          placeholder="Description"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.shiftKey) {
                              e.preventDefault();
                              field.onChange(`${field.value}\n`);
                            }
                          }}
                          maxLength={255}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Privacy Settings ───────────────────────────────── */}
            {/* <div className="pt-2">
              <div className="p-2 flex items-center pb-2 mb-2 flex-shrink-0">
                <div className="text-sm font-medium flex items-center gap-2">
                  <div className="min-w-8 min-h-8 flex justify-center items-center bg-green-50 text-green-600 rounded-md">
                    <LockIcon width={16} height={16} />
                  </div>
                  Privacy Settings
                </div>
              </div>
              <div className="w-full flex flex-col gap-3 px-2">
                <div className="w-full flex flex-col gap-2 rounded-md py-3 px-1 bg-gray-100 min-h-14">
                  <div className="flex flex-col gap-3 w-full px-2">
                    <label className="text-xs">Who can access this team?</label>
                    <Controller
                      name="privacy_settings"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center bg-white rounded-full w-full p-1 gap-1">
                          {[
                            { label: 'Public', value: 'public' },
                            { label: 'Private', value: 'private' },
                            { label: 'Anyone Can Join', value: 'anyone_can_join' },
                          ].map((opt) => (
                            <div
                              key={opt.value}
                              className={`flex items-center justify-center text-gray-500 gap-1 text-xs whitespace-nowrap rounded-full ${
                                field.value === opt.value
                                  ? 'bg-primary text-white'
                                  : ''
                              } min-h-8 w-full px-3 cursor-pointer`}
                              onClick={() => field.onChange(opt.value)}
                            >
                              {field.value === opt.value && (
                                <CheckCircleIcon width={16} height={16} />
                              )}
                              {opt.label}
                            </div>
                          ))}
                        </div>
                      )}
                    />
                    {errors.privacy_settings?.message && (
                      <span className="text-xs text-red-500">{errors.privacy_settings.message as string}</span>
                    )}
                  </div>
                </div>
              </div>
            </div> */}

            {/* ── Channel Permissions ─────────────────────────────── */}
            {/* <div className="pt-3">
              <div className="p-2 flex items-center pb-2 mb-2 flex-shrink-0">
                <div className="text-sm font-medium flex items-center gap-2">
                  <div className="min-w-8 min-h-8 flex justify-center items-center bg-red-50 text-red-600 rounded-md">
                    <LockIcon width={16} height={16} />
                  </div>
                  Team Permissions
                </div>
              </div>
              <div className="w-full flex flex-col gap-3 px-2">
                {PERMISSION_FIELDS.map((permissionObj: any) => {
                  const key = Object.keys(permissionObj)[0];
                  const label = permissionObj[key];
                  return (
                    <div
                      key={key}
                      className="w-full flex flex-col gap-2 rounded-md py-3 px-1 bg-gray-100 min-h-14"
                    >
                      <div className="flex flex-col gap-3 w-full px-2">
                        <label className="text-xs">{label}</label>
                        <div className="flex gap-3 w-full">
                          <Controller
                            name={`permissions.${key}.key`}
                            control={control}
                            render={({ field }) => (
                              <div className="flex items-center bg-white rounded-full w-full p-1 gap-1">
                                {channelPermissionOption.map((option) => {
                                  const isSelected = field.value === option.value;
                                  return (
                                    <div
                                      key={option.value}
                                      className={`flex items-center justify-center text-gray-500 gap-1 text-xs whitespace-nowrap rounded-full ${
                                        isSelected ? 'bg-primary text-white' : ''
                                      } min-h-8 w-full px-3 cursor-pointer`}
                                      onClick={() => {
                                        field.onChange(option.value);
                                        if (option.value !== 'custom') {
                                          setValue(`permissions.${key}.value`, []);
                                        }
                                      }}
                                    >
                                      {isSelected && <CheckCircleIcon width={16} height={16} />}
                                      {option.key}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          />
                        </div>
                        {watch(`permissions.${key}.key`) === 'custom' && (
                          <div className="w-full px-2 pt-1">
                            <CustomSelect
                              isMulti
                              options={formattedMembers}
                              value={(watch(`permissions.${key}.value`) || [])
                                .map((uuid: string) => formattedMembers.find((m: any) => m?.uuid === uuid))
                                .filter(Boolean)}
                              handleChange={(selectedOptions: any) => {
                                setValue(
                                  `permissions.${key}.value`,
                                  (selectedOptions || []).map((opt: any) => opt?.uuid),
                                );
                              }}
                              placeholder="Select custom members..."
                              FormatOptionLabel={ExtensionListView}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div> */}

            {/* ── Message ─────────────────────────────────────────── */}
            {!currentChat && (
              <div className="flex flex-col gap-1.5 w-full px-2 mt-2">
                <div className="flex items-center justify-between">
                  <Label>{'Message'}</Label>
                  <div className="flex items-start">
                    {errors?.message?.message && (
                      <ErrorTooltip text={errors.message.message as string} />
                    )}
                  </div>
                </div>

                <div
                  className={`flex items-center w-full rounded-xl ${
                    errors?.message?.message ? 'border border-red-500' : 'border border-gray-300'
                  }`}
                >
                  <div className="flex min-h-[126px] justify-between w-full p-3 flex-col gap-2">
                    <Controller
                      name="message"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          rows={4}
                          className="border-none outline-0 text-sm resize-none"
                          placeholder="Type a message to send with the team invite..."
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.shiftKey) {
                              e.preventDefault();
                              field.onChange(`${field.value}\n`);
                            }
                          }}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer Buttons ──────────────────────────────────── */}
          <div className="mt-3 px-2">
            <Button
              type="submit"
              variant={'primary'}
              className="w-full"
              disabled={isSubmitting || isSendingMessage}
            >
              {currentChat ? (
                isSubmitting ? (
                  <Loader />
                ) : (
                  'Update Team'
                )
              ) : isSubmitting || isSendingMessage ? (
                <Loader />
              ) : (
                'Create Team'
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateTeamChat;

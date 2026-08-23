import { useSocketEvents } from '@/hooks/use-socket-events';
import CreateFolderModal from './create-folder-modal';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Folder, Pin, PlusIcon, Trash2 } from 'lucide-react';
import moment from 'moment';
import { useUser } from '@/hooks/use-user';
import AlertConfirm from '@/components/custom/alert-confirm';
import {
  formatBytes,
  getObjectLength,
  handleAlert,
  handleDownloadFile,
  MEDIA_URL,
} from '@/lib/utils';
import AddFileModal from './add-file-modal';
import FileIconRender from '@/components/file-icon-render';
import { useSearchParamManager } from '@/hooks/use-search-params';
import { useSearchParams } from 'react-router-dom';
import { useCompanyFeatures } from '@/hooks/rbac';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { TrashBin } from '@/assets/icons';

const FolderList = ({
  selectedChat,
  setActiveState,
}: {
  selectedChat: any;
  setActiveState: any;
}) => {
  const { user } = useUser();
  const {
    folderList,
    getFoldersByChatId,
    handleDeleteFolder,
    handleUpdateFolder,
    handlePinFolder,
    handlePinFolderAttachment,
  } = useSocketEvents();

  const { features } = useCompanyFeatures();
  const chatAccess = features?.plan_features?.chat?.action || {};

  const [deleteAlertModal, setDeleteAlertModal] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const folderGridRef = useRef<HTMLDivElement>(null);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [folderModal, setFolderModal] = useState<any>(null);
  const [addFileModal, setAddFileModal] = useState<any>(null);

  const [, setSearchParams] = useSearchParams();
  const { getParam } = useSearchParamManager();
  const channel: any = getParam('channel');
  const type: any = getParam('type');
  const chatId: any = getParam('chatId');
  const folderId: any = getParam('folderId');
  const currentChatFolders =
    folderList?.filter((item) => item?.chatId === selectedChat?.chatId)?.[0]?.folders || [];
  const isFolderPinned = (folder: any) => {
    const pinnedValue = folder?.isPinned;
    if (typeof pinnedValue === 'string') {
      return pinnedValue.trim().length > 0;
    }
    return Boolean(pinnedValue || folder?.pin === true || folder?.pin === 'pin');
  };
  const sortedFolders = [...currentChatFolders].sort((a: any, b: any) => {
    const aPinned = isFolderPinned(a) ? 1 : 0;
    const bPinned = isFolderPinned(b) ? 1 : 0;

    if (aPinned !== bPinned) return bPinned - aPinned;

    const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });
  const pinnedFolderCount =
    currentChatFolders?.filter((folder: any) => isFolderPinned(folder))?.length || 0;
  const isFilePinned = (file: any) => {
    const pinnedValue = file?.isPinned;
    if (typeof pinnedValue === 'string') {
      return pinnedValue.trim().length > 0;
    }
    return Boolean(pinnedValue);
  };

  const getChatMemberName = (memberId: string) => {
    if (!memberId) return 'Unknown';
    const member = selectedChat?.users?.find((u: any) => u?.uuid === memberId);
    if (!member) return memberId;
    return (
      `${member?.first_name || ''} ${member?.last_name || ''}`.trim() || member?.name || memberId
    );
  };

  const getPinnedByLabel = (pinnedValue: any) => {
    if (typeof pinnedValue !== 'string') return 'Unknown';
    const normalized = pinnedValue.trim();
    if (!normalized || normalized === 'pin' || normalized === 'true') return 'Unknown';
    return getChatMemberName(normalized);
  };

  const getFolderCreatorLabel = (folder: any) => getChatMemberName(folder?.creatorId || '');

  const getFolderFiles = (folder: any) => {
    const rawFolderAttachments = Array.isArray(folder?.attachments) ? folder.attachments : [];
    return rawFolderAttachments
      .flatMap((item: any) => {
        if (!item || item?.isDeleted) return [];
        if (Array.isArray(item?.attachments)) {
          return item.attachments.filter((file: any) => file && !file?.isDeleted);
        }
        return [item];
      })
      .filter(Boolean);
  };

  const pinnedFileCount = getFolderFiles(selectedFolder).filter((file: any) =>
    isFilePinned(file),
  ).length;

  // Helper function to check if a message is deleted in the message list
  const handleRemoveFile = (item: any, file: any) => {
    const receiverIds = Array.isArray(selectedChat?.users)
      ? selectedChat?.users?.map((user: any) => user?.uuid)
      : [];
    handleUpdateFolder({
      folderId: selectedFolder?._id,
      messageId: item?.messageId || file?.messageId || item?._id || '',
      operationType: 'delete',
      senderId: user?.uuid,
      receiverId: receiverIds,
      attachmentId: file?.attachmentId || file?._id || '',
      filename: file?.filename || file?.serverFileName || file?.name || '',
    });
  };

  const handleFolderPinToggle = (folder: any) => {
    const currentlyPinned = isFolderPinned(folder);
    if (!currentlyPinned && pinnedFolderCount >= 5) {
      handleAlert({ text: 'Maximum 5 folders can be pinned.', type: 'error' });
      return;
    }

    const receiverIds = selectedChat?.isGroupChat
      ? selectedChat?.users?.map((item: any) => item?.uuid)?.filter((id: any) => id !== user?.uuid)
      : selectedChat?.users
          ?.filter((item: any) => item?.uuid !== user?.uuid)
          ?.map((item: any) => item?.uuid);

    handlePinFolder({
      folderId: folder?._id,
      senderId: user?.uuid,
      receiverId: receiverIds || [],
      type: currentlyPinned ? 'unpin' : 'pin',
    });
  };

  const getFileIdentifier = (file: any) =>
    file?.filename || file?.serverFileName || file?.name || '';

  const handleFilePinToggle = (file: any) => {
    const currentlyPinned = isFilePinned(file);
    if (!currentlyPinned && pinnedFileCount >= 5) {
      handleAlert({ text: 'Maximum 5 files can be pinned.', type: 'error' });
      return;
    }

    const filename = getFileIdentifier(file);
    if (!filename) {
      handleAlert({ text: 'Unable to pin this file', type: 'error' });
      return;
    }

    const receiverIds = selectedChat?.isGroupChat
      ? selectedChat?.users?.map((item: any) => item?.uuid)?.filter((id: any) => id !== user?.uuid)
      : selectedChat?.users
          ?.filter((item: any) => item?.uuid !== user?.uuid)
          ?.map((item: any) => item?.uuid);

    const nextPinned = currentlyPinned ? '' : user?.uuid || 'pin';
    setSelectedFolder((prev: any) => {
      if (!prev || !Array.isArray(prev?.attachments)) return prev;
      const updatedAttachments = prev.attachments.map((item: any) => {
        if (Array.isArray(item?.attachments)) {
          const nextFiles = item.attachments.map((innerFile: any) => {
            const innerId = getFileIdentifier(innerFile);
            if (innerId !== filename) return innerFile;
            return { ...innerFile, isPinned: nextPinned };
          });
          return { ...item, attachments: nextFiles };
        }
        const itemId = getFileIdentifier(item);
        if (itemId !== filename) return item;
        return { ...item, isPinned: nextPinned };
      });
      return { ...prev, attachments: updatedAttachments };
    });

    handlePinFolderAttachment(
      {
        folderId: selectedFolder?._id,
        filename,
        senderId: user?.uuid,
        receiverId: receiverIds || [],
        type: currentlyPinned ? 'unpin' : 'pin',
      },
      (response: any) => {
        const failed = response?.success === false || response?.status === false;
        if (!failed) return;
        // Rollback optimistic pin state on explicit failure.
        setSelectedFolder((prev: any) => {
          if (!prev || !Array.isArray(prev?.attachments)) return prev;
          const rollbackAttachments = prev.attachments.map((item: any) => {
            if (Array.isArray(item?.attachments)) {
              const nextFiles = item.attachments.map((innerFile: any) => {
                const innerId = getFileIdentifier(innerFile);
                if (innerId !== filename) return innerFile;
                return { ...innerFile, isPinned: currentlyPinned ? user?.uuid || 'pin' : '' };
              });
              return { ...item, attachments: nextFiles };
            }
            const itemId = getFileIdentifier(item);
            if (itemId !== filename) return item;
            return { ...item, isPinned: currentlyPinned ? user?.uuid || 'pin' : '' };
          });
          return { ...prev, attachments: rollbackAttachments };
        });
      },
    );
  };

  function handleDownload(filename: string) {
    const url = `${MEDIA_URL}/${user?.company_info?.uuid}/chat/${filename}`;
    handleDownloadFile({ fileUrl: url });
  }

  useEffect(() => {
    if (selectedChat?.chatId && user?.uuid) {
      if (!folderList?.map((v: any) => v?.chatId).includes(selectedChat?.chatId)) {
        getFoldersByChatId({ chatId: selectedChat?.chatId, senderId: user?.uuid });
      }
    }
  }, [selectedChat?.chatId, user?.uuid]);

  useEffect(() => {
    if (currentChatFolders?.length > 0) {
      setSelectedFolder((prev: any) => {
        return currentChatFolders?.filter((item: any) => item?._id === prev?._id)?.[0] || {};
      });
    }
  }, [currentChatFolders]);

  useEffect(() => {
    if (currentChatFolders?.length > 0 && folderId) {
      setSelectedFolder(currentChatFolders?.find((item: any) => item?._id === folderId) || {});
    }
  }, [currentChatFolders, folderId]);

  // useEffect(() => {
  //   const handleFolderCreated = () => {
  //     shouldScrollToBottomRef.current = true;
  //   };
  //   window.addEventListener('folderCreated', handleFolderCreated as EventListener);
  //   return () => window.removeEventListener('folderCreated', handleFolderCreated as EventListener);
  // }, []);

  // useEffect(() => {
  //   if (shouldScrollToBottomRef.current) {
  //     setTimeout(() => {
  //       if (folderGridRef.current) {
  //         const parent = folderGridRef.current.closest('.overflow-y-auto.flex-1');
  //         if (parent) {
  //           parent.scrollTop = parent.scrollHeight;
  //         } else {
  //           folderGridRef.current.scrollTop = folderGridRef.current.scrollHeight;
  //         }
  //       }
  //     }, 100);
  //     shouldScrollToBottomRef.current = false;
  //   }
  // }, [currentChatFolders?.length]);

  return (
    <div className="w-full flex flex-col h-full bg-[var(--color-bg-gray-50)] overflow-hidden">
      <div className="w-full shrink-0 px-4 bg-white flex items-center justify-between border-b min-h-[56px] lg:min-h-[65px] border-b-gray-200">
        <div
          className="cursor-pointer"
          onClick={() => {
            setSearchParams({
              channel,
              type,
              chatId,
            });
            if (getObjectLength(selectedFolder)) {
              setSelectedFolder({});
            } else {
              setActiveState('message');
            }
          }}
        >
          <div className="flex gap-2 items-center">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm lg:text-base font-semibold text-gray-900">
              {getObjectLength(selectedFolder) ? selectedFolder?.folderName : 'Folders'}
            </h3>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          {chatAccess?.create_folder && (
            <CustomTooltip
              text={getObjectLength(selectedFolder) ? 'Add File' : 'Add Folder'}
              side="left"
            >
              <div
                className="cursor-pointer flex items-center justify-center rounded-full w-9 h-9 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                onClick={() => {
                  if (getObjectLength(selectedFolder)) {
                    setAddFileModal(selectedFolder);
                  } else {
                    setFolderModal(selectedChat);
                  }
                }}
              >
                <PlusIcon className="w-5 h-5" />
              </div>
            </CustomTooltip>
          )}

          {/* {getObjectLength(selectedFolder) && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Icon name="MenuDots" className="w-5 h-5 rotate-90 cursor-pointer" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Remove</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )} */}
        </div>
      </div>

      {getObjectLength(selectedFolder) ? (
        <div className="flex-1 w-full bg-white lg:bg-[var(--color-bg-gray-50)] p-4 flex flex-col min-h-0 overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2 pb-2">
            {(() => {
              const rawFolderAttachments = Array.isArray(selectedFolder?.attachments)
                ? selectedFolder.attachments
                : [];

              // Backend may return either:
              // 1) grouped rows: [{ messageId, attachments: [...] }]
              // 2) flat files:   [{ name, filename, type, size, ... }]
              const groupedAttachments = rawFolderAttachments
                .map((item: any, index: number) => {
                  if (Array.isArray(item?.attachments)) {
                    const messageIdentifier = item?.messageId || item?._id || '';
                    return {
                      key: messageIdentifier || `grouped-${index}`,
                      messageId: messageIdentifier,
                      updatedAt: item?.updatedAt || item?.createdAt || '',
                      files: item.attachments,
                    };
                  }

                  // Flat-file shape
                  return {
                    key:
                      item?._id ||
                      item?.filename ||
                      item?.serverFileName ||
                      item?.name ||
                      `file-${index}`,
                    messageId: item?.messageId || item?.parentMessageId || '',
                    updatedAt: item?.updatedAt || item?.createdAt || '',
                    files: [item],
                  };
                })
                .filter((entry: any) => Array.isArray(entry?.files) && entry.files.length > 0);

              const displayFiles = groupedAttachments
                .flatMap((entry: any) =>
                  (entry?.files || []).map((file: any, fileIndex: number) => ({
                    entry,
                    file,
                    fileIndex,
                  })),
                )
                .sort((a: any, b: any) => {
                  const aPinned = isFilePinned(a?.file) ? 1 : 0;
                  const bPinned = isFilePinned(b?.file) ? 1 : 0;
                  if (aPinned !== bPinned) return bPinned - aPinned;

                  const aTime = new Date(
                    a?.file?.updatedAt || a?.file?.createdAt || a?.entry?.updatedAt || 0,
                  ).getTime();
                  const bTime = new Date(
                    b?.file?.updatedAt || b?.file?.createdAt || b?.entry?.updatedAt || 0,
                  ).getTime();
                  return bTime - aTime;
                });

              return groupedAttachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                  {displayFiles?.map((row: any) => {
                    const entry = row?.entry;
                    const file = row?.file;
                    const fileIndex = row?.fileIndex ?? 0;
                    const extension = file?.name ? file.name.split('.').pop() : '';
                    return (
                      <div
                        key={`${entry?.key}-${file?.filename || file?.serverFileName || file?.name || fileIndex}`}
                        className="group border border-gray-200 p-3.5 flex items-start gap-3 rounded-xl cursor-pointer hover:border-ucass-active-bg hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-all bg-white"
                      >
                        <div className="flex flex-row items-start gap-2.5 flex-1 min-w-0">
                          <div className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 shrink-0">
                            <FileIconRender type={extension} />
                          </div>

                          <div className="flex flex-col justify-between text-sm flex-1 min-w-0">
                            <div className="flex flex-col">
                              <p className="font-semibold text-gray-900 truncate max-w-[200px]">
                                {file?.name || ''}
                              </p>
                              <p className="text-gray-800 truncate">
                                {file?.size ? formatBytes(file.size) : ''}
                              </p>
                              <div className="min-h-[16px] mt-0.5">
                                {isFilePinned(file) && (
                                  <p className="text-[11px] text-ucass-active truncate">
                                    Pinned by {getPinnedByLabel(file?.isPinned)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0 items-center pt-0.5">
                          <CustomTooltip
                            text={isFilePinned(file) ? 'Unpin File' : 'Pin File'}
                            side="top"
                          >
                            <div
                              onClick={() => handleFilePinToggle(file)}
                              className={`cursor-pointer flex items-center justify-center rounded-full w-7 h-7 border transition-colors ${
                                isFilePinned(file)
                                  ? 'bg-ucass-active-bg border-ucass-active-bg text-ucass-active hover:bg-ucass-primary-200 hover:text-primary'
                                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                              }`}
                            >
                              <Pin className="w-4 h-4" />
                            </div>
                          </CustomTooltip>
                          <div
                            onClick={() => handleRemoveFile(entry, file)}
                            className="cursor-pointer flex items-center justify-center rounded-full w-7 h-7 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </div>

                          <div
                            onClick={() => handleDownload(file?.filename)}
                            className="cursor-pointer flex items-center justify-center rounded-full w-7 h-7 bg-ucass-active-bg text-ucass-active hover:bg-primary hover:text-white"
                          >
                            <Download className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 w-full bg-[var(--color-bg-gray-50)] p-3 flex items-center justify-center min-h-0 overflow-hidden h-full">
                  <div className="flex flex-col justify-center items-center gap-2 py-5 h-full w-full mx-auto">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <FileIconRender type="unknown" />
                    </div>
                    <p className="text-base font-semibold text-gray-900">No files</p>
                    <p className="text-sm text-center text-gray-500 max-w-xs">
                      No files uploaded to this folder yet.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : sortedFolders?.length > 0 ? (
        <div className="flex-1 w-full bg-white lg:bg-[var(--color-bg-gray-50)] p-4 flex flex-col min-h-0 overflow-hidden">
          <div ref={folderGridRef} className="flex-1 overflow-y-auto pr-2 pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
              {sortedFolders?.map((v: any) => {
                const { folderName } = v || {};
                return (
                  <div
                    className="group border border-gray-200 p-3.5 flex gap-3 rounded-xl cursor-pointer hover:border-ucass-active-bg hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] justify-between items-start bg-white transition-all"
                    onClick={() => {
                      setSelectedFolder(v);
                      setTimeout(() => {
                        if (scrollRef.current) {
                          scrollRef.current.scrollTop = 0;
                          if (scrollRef.current.parentElement) {
                            scrollRef.current.parentElement.scrollTop = 0;
                          }
                        }
                      }, 100);
                    }}
                  >
                    <div className="flex-col flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 text-gray-700 w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                          <Folder className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {folderName || ''}
                          </h3>
                          <span className="text-[11px] text-gray-500 truncate mt-0.5">
                            Created by {getFolderCreatorLabel(v)} |{' '}
                            {moment(v?.createdAt).format('DD MMM YYYY')}
                          </span>
                          <div className="min-h-[16px] mt-0.5">
                            {isFolderPinned(v) && (
                              <span className="text-[11px] text-ucass-active truncate">
                                Pinned by {getPinnedByLabel(v?.isPinned)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 pt-0.5">
                      <CustomTooltip
                        text={isFolderPinned(v) ? 'Unpin Folder' : 'Pin Folder'}
                        side="top"
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFolderPinToggle(v);
                          }}
                          className={`cursor-pointer w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                            isFolderPinned(v)
                              ? 'bg-ucass-active-bg border-ucass-active-bg text-ucass-active hover:bg-ucass-primary-200 hover:text-primary'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </div>
                      </CustomTooltip>

                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteAlertModal(v);
                        }}
                        className="cursor-pointer w-7 h-7 rounded-full border border-red-200 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <TrashBin className="w-4 h-4" />
                      </div>
                    </div>

                    {/* <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteAlertModal(v);
                  }}
                  className="cursor-pointer flex items-center justify-center rounded-full w-7 h-7 bg-red-100   text-red-500 hover:bg-red-500 hover:text-white"
                >
                </div> */}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full bg-[var(--color-bg-gray-50)] p-3 flex items-center justify-center min-h-0 overflow-hidden">
          <div className="flex flex-col justify-center items-center gap-2 py-5 h-full w-full mx-auto">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <Folder className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-900">No folders yet</p>
            <p className="text-sm text-center text-gray-500 max-w-xs">
              Organize your team's files by creating a folder.
            </p>
          </div>
        </div>
      )}
      <CreateFolderModal {...{ open: folderModal, setOpen: setFolderModal }} />
      <AlertConfirm
        {...{
          onConfirm: () => {
            handleDeleteFolder({
              folderId: deleteAlertModal?._id,
              senderId: user?.uuid,
              receiverId: deleteAlertModal?.receiverId,
              chatId: selectedChat?.chatId,
            });
            setDeleteAlertModal(null);
          },
          open: deleteAlertModal,
          setOpen: setDeleteAlertModal,
          descriptionTextComp: (
            <div className=" text-md">Are you sure, you want to delete this folder?</div>
          ),
        }}
      />
      <AddFileModal
        {...{ open: addFileModal, setOpen: setAddFileModal, selectedChat, selectedFolder }}
      />
    </div>
  );
};

export default FolderList;

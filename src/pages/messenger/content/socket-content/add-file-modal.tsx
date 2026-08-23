import { CloseIcon } from '@/assets/icons';
import FileIconRender from '@/components/file-icon-render';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { useEffect, useState } from 'react';

import { formatBytes } from '@/lib/utils';
import { Plus } from 'lucide-react';

const AddFileModal = ({ open, setOpen, selectedChat, selectedFolder }: any) => {
  const { user } = useUser();
  const { handleUpdateFolder, getAttachmentsByChatId } = useSocketEvents();
  const [serverAttachments, setServerAttachments] = useState<any[]>([]);
  console.log(selectedChat?.chatId, 'selectedFolder', serverAttachments);

  useEffect(() => {
    if (open && selectedChat?.chatId) {
      getAttachmentsByChatId({ chatId: selectedChat.chatId, userID: user?.uuid }, (res: any) => {
        let data = res;
        console.log(res, 'resresres');

        if (res?.data?.result?.rows) {
          data = res?.data?.result?.rows;
        }
        setServerAttachments(Array.isArray(data) ? data : []);
      });
    } else {
      setServerAttachments([]);
    }
  }, [open, selectedChat?.chatId, user?.uuid, getAttachmentsByChatId]);

  const addFile = (item: any, file: any) => {
    const receiverIds = Array.isArray(selectedChat?.users)
      ? selectedChat?.users?.map((chatUser: any) => chatUser?.uuid)
      : [];
    console.log(item, 'checking...');

    handleUpdateFolder({
      folderId: selectedFolder?._id || open?._id,
      messageId: item?.messageId,
      operationType: 'insert',
      senderId: user?.uuid,
      receiverId: receiverIds,
      attachmentId: file?.attachmentId || file?._id || '',
      filename: file?.filename,
    });
    setOpen(false);
  };

  const allMessagesWithAttachments =
    serverAttachments?.filter((msg: any) => msg?.attachments?.length > 0 && !msg?.isDeleted) || [];

  const getAttachmentKey = (file: any) =>
    String(
      file?.filename ||
        file?.serverFileName ||
        file?.fileName ||
        file?.name ||
        file?.attachmentId ||
        file?._id ||
        '',
    ).trim();

  const existingAttachmentKeys = new Set(
    (selectedFolder?.attachments || [])
      .filter((item: any) => !item?.isDeleted)
      .flatMap((item: any) => {
        // Support both shapes:
        // 1) grouped: { messageId, attachments: [...] }
        // 2) flat:    { name, filename, ... }
        if (Array.isArray(item?.attachments)) return item.attachments;
        return [item];
      })
      .map((file: any) => getAttachmentKey(file))
      .filter(Boolean),
  );

  const currentChatMessages = allMessagesWithAttachments
    .map((msg: any) => ({
      ...msg,
      attachments: (Array.isArray(msg?.attachments) ? msg.attachments : []).filter(
        (file: any) => !existingAttachmentKeys.has(getAttachmentKey(file)),
      ),
    }))
    .filter((msg: any) => msg.attachments.length > 0);

  console.log(
    currentChatMessages,
    'allMessagesWithAttachments',
    allMessagesWithAttachments,
    'existingAttachmentKeys',
    existingAttachmentKeys,
  );

  return (
    <Dialog open={Boolean(open)} onOpenChange={setOpen}>
      <DialogContent
        className="w-1/4 p-3"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1.5  text-900/80 ">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Add File
            <div
              onClick={() => setOpen(false)}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 max-h-[calc(100vh_-_10.5rem)] min-h-[200px] overflow-auto">
          {currentChatMessages?.length ? (
            currentChatMessages?.map((item: any) => (
              <div key={item?._id || item?.messageId}>
                {item?.attachments?.length > 0 ? (
                  item?.attachments?.map((file: any, fileIndex: number) => (
                    <div
                      key={`${item?._id || item?.messageId}-${file?.filename || file?.name || fileIndex}`}
                      className="flex justify-between border border-gray-200 w-full p-2 gap-2 rounded-lg cursor-pointer"
                    >
                      <div className="flex flex-row justify-between items-center w-[calc(100%-52px)]">
                        <div className="w-8 h-8 flex items-center">
                          <FileIconRender
                            type={(file?.name || file?.fileName || file?.filename || '')
                              .split('.')
                              .pop()}
                          />
                        </div>
                        <div className="flex flex-col justify-between text-sm w-[calc(100%_-_3rem)]">
                          <p className="font-semibold text-gray-900 truncate ">
                            {file?.name || file?.fileName || file?.filename}
                          </p>
                          <p className="text-gray-800 truncate">{formatBytes(file?.size)}</p>
                        </div>
                      </div>
                      <div
                        className="cursor-pointer flex items-center justify-center rounded-full w-10 min-w-10 h-10 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                        onClick={() => addFile(item, file)}
                      >
                        <Plus className="w-5 h-5" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-base text-center text-gray-900">No files found</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-base text-center text-gray-900 my-auto">No files found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddFileModal;

import { useMemo, useState } from 'react';
import { recordingList } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import ShareRecordingModal from './modal/share-recording-modal';
import { Info, X } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import CustomTooltip from '@/components/custom/custom-tooltip';
import RecordingListingTable from './components/recording-listing-table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { getEnv } from '@/lib/utils';
import Chat from '@/pages/messenger/chat';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { chatEvents } from '@/context/socket-events';
import { buildRecordingChatUsers } from './recording-chat-utils';
import { AuthenticatedVideo } from '@/components/custom/authenticated-media';

const AllRecording = () => {
  const { user } = useUser();
  const { user_info, company_info } = user || {};
  const meetingActorUuid = user?.uuid || user?.guest_info?.uuid || '';
  const socketDomain = user?.sip_credentials?.domain || '';
  const { allChats, messageList, socketEventsManager, handleGetMessageByChatId } =
    useSocketEvents();

  const [selectedData, setSelectedData] = useState<any>(null);
  const [activeChatRecord, setActiveChatRecord] = useState<any>(null);
  const [visibleItems, setVisibleItems] = useState<number | null>(null);
  const [modalState, setModalState] = useState({
    shareRecordingModal: false,
    playRecordingModal: false,
    recordingChatModal: false,
  });

  const { data: recordingListData, isPending: isPendingRecordingList } = useQuery({
    queryKey: ['recordingList'],
    queryFn: () => recordingList({ recordingType: 'USER' }),
    select: (data) => data?.data?.data?.result,
  });

  const playbackUrl = selectedData?.fileUrl || '';
  const playbackTitle =
    selectedData?.meeting?.name ||
    selectedData?.meetName ||
    selectedData?.name ||
    'Meeting recording';
  const recordingChatId = useMemo(
    () => String(activeChatRecord?.meetingId || '').trim(),
    [activeChatRecord?.meetingId],
  );
  const recordingChatName =
    activeChatRecord?.meeting?.name || activeChatRecord?.meetName || 'Meeting Chat';
  const recordingChatDescription = `Meeting ID: ${recordingChatId || '--'}`;
  const recordingChatUsers = useMemo(
    () => buildRecordingChatUsers(activeChatRecord, user),
    [activeChatRecord, user],
  );

  const canShareRecording = (record: any) => {
    const doIHaveAccess = record?.meeting?.members?.some(
      (member: any) => member?.userId === user_info?.uuid && member?.type === 'ADMIN',
    );
    return doIHaveAccess;
  };
  const canOpenChat = (record: any) => {
    const doIHaveAccess = record?.meeting?.members?.some(
      (member: any) => member?.userId === user_info?.uuid,
    );
    return doIHaveAccess;
  };

  const handleOpenRecordingChat = (record: any) => {
    const chatId = String(record?.meetingId || '').trim();
    if (!chatId) return;

    setActiveChatRecord(record);
    setModalState((prev) => ({ ...prev, recordingChatModal: true }));

    const hasChatInList = Array.isArray(allChats)
      ? allChats.some((chatItem: any) => String(chatItem?.chatId || '').trim() === chatId)
      : false;
    const messageListForChat = Array.isArray(messageList)
      ? messageList.find((chatItem: any) => String(chatItem?.chatId || '').trim() === chatId)
      : null;
    const isMessageListEmptyForChat =
      !Array.isArray(messageListForChat?.messages) || messageListForChat.messages.length === 0;

    if (!hasChatInList && isMessageListEmptyForChat) {
      if (socketEventsManager && meetingActorUuid) {
        const chatPayload: any = { uuid: meetingActorUuid };
        if (socketDomain) chatPayload.domain = socketDomain;
        socketEventsManager.emit(chatEvents.GET_CHATS, chatPayload);
      }
      if (typeof handleGetMessageByChatId === 'function' && meetingActorUuid) {
        handleGetMessageByChatId({
          chatId,
          userId: meetingActorUuid,
        });
      }
    }
  };

  const totalItems = visibleItems ?? recordingListData?.totalItems;
  return (
    <>
      <section className="flex h-full min-h-0 w-full flex-1 flex-col gap-3 overflow-auto bg-transparent p-3 sm:p-4">
        <div className="mx-auto max-w-250 w-full flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3.5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:justify-between">
            <div className="flex min-w-0 flex-col gap-[3px]" style={{ flex: '1 1 320px' }}>
              <div className="flex items-center gap-1.5">
                <h4 className="text-[23px] font-extrabold leading-[1.1] tracking-[-0.035em] text-gray-900">
                  My Recordings
                </h4>
                <CustomTooltip
                  text="Manage recordings, archives, and meeting transcripts."
                  side="bottom"
                  className="max-w-[240px] rounded-xl bg-gray-900 px-3.5 py-2.5 text-[13px] leading-snug shadow-lg"
                  arrowClassName="fill-gray-900"
                >
                  <Info className="h-4 w-4 shrink-0 cursor-help text-gray-400" />
                </CustomTooltip>
              </div>
            </div>
            <div className="ml-auto inline-flex h-10 w-fit items-center rounded-full border border-white/70 bg-white/45 backdrop-blur-md px-4 text-[13px] text-muted-foreground shadow-[0_2px_10px_rgba(154,52,18,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] sm:px-5">
              <span className="mr-1.5 text-[13px] font-bold" style={{ color: '#B5642F' }}>
                {totalItems}
              </span>
              items found
            </div>
          </div>

          <RecordingListingTable
            records={recordingListData?.rows}
            isLoading={isPendingRecordingList}
            canShare={canShareRecording}
            canOpenChat={canOpenChat}
            onShare={(record) => {
              setModalState((prev) => ({ ...prev, shareRecordingModal: true }));
              setSelectedData(record);
            }}
            onPlay={(record) => {
              const mediaUrl = `${getEnv().VITE_API_BASE_URL}/api/media/${company_info?.uuid}/video_recording/${encodeURIComponent(record?.name || '')}`;
              setSelectedData({ ...record, fileUrl: mediaUrl });
              setModalState((prev) => ({ ...prev, playRecordingModal: true }));
            }}
            onFilteredCountChange={setVisibleItems}
            emptyTitle="No recordings available!"
            emptyDescription="Recorded meetings will appear here once available."
            onChat={handleOpenRecordingChat}
          />
        </div>
      </section>

      {modalState?.shareRecordingModal && (
        <ShareRecordingModal
          modalState={modalState?.shareRecordingModal}
          setModalState={(value) => {
            setModalState((prev) => ({ ...prev, shareRecordingModal: value }));
            setSelectedData(null);
          }}
          selectedData={selectedData}
        />
      )}

      <Dialog
        open={modalState?.playRecordingModal}
        onOpenChange={(value) => {
          setModalState((prev) => ({ ...prev, playRecordingModal: value }));
          if (!value) setSelectedData(null);
        }}
      >
        <DialogContent
          className="w-[96vw] max-w-[1040px] overflow-hidden border border-border p-0"
          showCloseButton
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <h5 className="truncate pr-8 text-sm font-semibold text-foreground sm:text-base">
              {playbackTitle}
            </h5>
          </div>

          <div className="flex w-full items-center justify-center bg-black px-3 py-3 sm:px-5 sm:py-5">
            <div className="w-full max-h-[72vh] overflow-hidden rounded-lg bg-black">
              {playbackUrl ? (
                <AuthenticatedVideo
                  controls
                  autoPlay
                  preload="metadata"
                  src={playbackUrl}
                  className="aspect-video h-full max-h-[72vh] w-full bg-black object-contain"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-white/75">
                  Recording file is not available for playback.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalState?.recordingChatModal}
        onOpenChange={(value) => {
          setModalState((prev) => ({ ...prev, recordingChatModal: value }));
          if (!value) setActiveChatRecord(null);
        }}
      >
        <DialogContent
          className="w-[96vw] max-w-[1100px] h-[88vh] overflow-hidden border border-border p-0"
          showCloseButton={false}
        >
          <button
            type="button"
            className="absolute top-3.5 right-3.5 z-20 cursor-pointer flex items-center justify-center rounded-full w-9 h-9 bg-gray-100 text-gray-900/80 hover:bg-ucass-active hover:text-white transition-colors duration-200"
            onClick={() => {
              setModalState((prev) => ({ ...prev, recordingChatModal: false }));
              setActiveChatRecord(null);
            }}
            aria-label="Close chat modal"
          >
            <X className="w-4 h-4" />
          </button>
          {recordingChatId ? (
            <div className="h-full min-h-0">
              <Chat
                chatId={recordingChatId}
                fromMeetChat={false}
                isAgentChat={false}
                allowFallbackChat={true}
                fallbackChat={{
                  name: recordingChatName,
                  description: recordingChatDescription,
                  users: recordingChatUsers,
                }}
                disableMessageHoverActions={true}
                disableRouteMaxHeight={true}
                hideFooter={true}
                disableCallActions={true}
                hiddenHeaderActions={['notes', 'folders', 'description']}
                disableInitialMessageFetch={true}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center px-6 text-sm text-gray-600">
              Meeting chat is not available.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AllRecording;

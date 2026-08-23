import Participants from './Participants';
import Chat from '@/pages/messenger/chat';
import { useJitsi } from '@/hooks/use-jitsi';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useMemo } from 'react';

const normalizeParticipantId = (value: any) =>
  String(value || '')
    .trim()
    .split('/')
    .pop()
    ?.toLowerCase() || '';

const getChatUserParticipantIds = (chatUser: any) =>
  [
    chatUser?.jid,
    chatUser?.user_jid,
    chatUser?.meeting_jid,
    chatUser?.jitsi_jid,
    chatUser?.jitsiJid,
  ]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map(normalizeParticipantId)
    .filter(Boolean);

const ParticipantChat = ({
  // handleClose = () => null,
  defaultTab = 'participant',
}: {
  handleClose: any;
  defaultTab: 'participant' | 'chat';
}) => {
  const params = new URLSearchParams(window.location.search);
  const chatId = params.get('meetCode');
  const { participantsListing = [], roomCode } = useJitsi();
  const { allChats = [] } = useSocketEvents();
  const meetingChatId = chatId || roomCode;
  const joinedMentionUsers = useMemo(() => {
    const joinedParticipantIds = new Set(
      (Array.isArray(participantsListing) ? participantsListing : [])
        .map((participant: any) => normalizeParticipantId(participant?._id))
        .filter(Boolean),
    );
    const meetingUsers =
      (Array.isArray(allChats) ? allChats : []).find((chat: any) => chat?.chatId === meetingChatId)
        ?.users || [];

    return (Array.isArray(meetingUsers) ? meetingUsers : []).filter((chatUser: any) =>
      getChatUserParticipantIds(chatUser).some((participantId) =>
        joinedParticipantIds.has(participantId),
      ),
    );
  }, [allChats, meetingChatId, participantsListing]);
  console.log(chatId, 'chatId????');

  // const [activeTab, setActiveTab] = useState<string>(defaultTab);
  // const { participantsIds } = useJitsi();
  // const numberOfParticipants = participantsIds?.size + 1;

  // useEffect(() => {
  //   if (defaultTab) setActiveTab(defaultTab);
  // }, [defaultTab]);

  return (
    <div className="bg-white rounded-xl absolute right-8 bottom-20 m-auto flex h-[min(34rem,calc(100dvh-7.5rem))] min-h-[22rem] max-h-[calc(100dvh-7.5rem)] flex-col w-[400px] overflow-hidden shadow-lg border border-gray-200">
      <div className="flex min-h-0 flex-1">
        <div className="flex h-full min-h-0 w-full flex-col">
          <div className="flex min-h-0 flex-1 items-start w-full p-2">
            {defaultTab === 'participant' ? (
              <Participants />
            ) : (
              <Chat
                chatId={meetingChatId || ''}
                fromMeetChat={true}
                mentionUsers={joinedMentionUsers}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantChat;

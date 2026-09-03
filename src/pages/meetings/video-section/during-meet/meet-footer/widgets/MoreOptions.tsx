import { useJitsi } from '@/hooks/use-jitsi';
import { handleAlert } from '@/lib/utils';
import { Brush, Check, Copy, ImageIcon, LucideUserPlus, Subtitles, View } from 'lucide-react';
import { Button } from '@/components/ui/button';

const subtitleLanguageOptions: Array<{ label: string; value: 'en' | 'hi' | 'es' }> = [
  { label: 'English', value: 'en' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Spanish', value: 'es' },
];

const MoreOptions = ({
  setViewType,
  viewType,
  setShowVirtualModal,
  setWidgetType,
  apiMeetingData,
  meetState,
}: {
  setViewType: any;
  viewType: string;
  setShowVirtualModal: any;
  setWidgetType: any;
  apiMeetingData: any;
  meetState: any;
}) => {
  const {
    isHost,
    localVideoTrack,
    isLocalVideoMuted,
    handlePresentatingView,
    currentActiveScreenShareId,
    handleWhiteBoard,
    whiteBoardState,
    userID,
    userName,
    isUserSubtitlesOn,
    subtitleLanguage,
    enableSubtitles,
    disableSubtitles,
    isScreenShareEnabled,
    participantsListing,
  } = useJitsi();

  const isWhiteboardActive = Boolean(whiteBoardState?.isWhiteBoardopen);
  const videoFeatures = apiMeetingData?.videoFeatures || {};
  const videoAccess = videoFeatures?.access || {};
  const canInviteParticipants = Boolean(isHost && videoAccess?.TEAM_INVITE);
  const canUseTranscription = Boolean(videoAccess?.TRANSCRIPTION);
  const canUseWhiteboard = Boolean(videoFeatures?.IS_SHOW);
  const whiteboardStarterName = whiteBoardState?.startedByName || 'Another participant';
  const normalizeParticipantId = (value: string = '') => value?.split('/')?.pop() || '';
  const isWhiteboardOwner =
    normalizeParticipantId(whiteBoardState?.startedBy || '') ===
    normalizeParticipantId(userID || '');
  const meetingLink = `${window.location.origin}/video-meet?meetCode=${meetState?.meetUniqueKey || ''}`;

  const actionClass =
    'w-full rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] hover:bg-[#FBE2C8]/45 transition-colors px-3 py-2.5 flex items-center justify-between text-left cursor-pointer';
  const labelClass = 'text-sm font-medium text-[#2E2D35]';
  const descClass = 'text-xs text-[#9A948F]';
  const isPresentationModeSelected =
    viewType === 'presentation' || viewType === 'whiteboard' || Boolean(currentActiveScreenShareId);

  const copyText = (text: string, successText: string) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        handleAlert({ text: successText, type: 'success' });
        setWidgetType('');
      })
      .catch(() => {
        handleAlert({ text: 'Failed to copy', type: 'error' });
        setWidgetType('');
      });
  };

  const isAnyoneSharingScreen = isScreenShareEnabled || !!currentActiveScreenShareId;
  const screenSharingParticipant = participantsListing?.find(
    (p: any) => p?._id === currentActiveScreenShareId,
  );
  const screenSharingName = isScreenShareEnabled
    ? 'You are'
    : `${screenSharingParticipant?._displayName || 'Another participant'} is`;

  const isWhiteboardDisabled =
    (isWhiteboardActive && !isWhiteboardOwner) || (!isWhiteboardActive && isAnyoneSharingScreen);

  return (
    <div className="absolute bottom-20 right-0 w-[340px] rounded-2xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] shadow-xl z-[1000] overflow-visible">
      <div className="px-4 py-3 border-b border-gray-100">
        <h6 className="text-sm font-semibold text-[#2E2D35]">More Actions</h6>
        <p className="text-xs text-[#9A948F] mt-0.5">Meeting tools and view controls</p>
      </div>

      <div className="p-3 pt-2 max-h-[430px] overflow-y-auto">
        <div className="space-y-2">
          {canInviteParticipants ? (
            <div className="w-full rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                    <LucideUserPlus className="w-4 h-4 text-sky-700" />
                  </span>
                  <div>
                    <p className={labelClass}>Invite participants</p>
                    <p className={descClass}>Add more users to this meeting</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg border border-[#EEE7DD] hover:bg-[#FBE2C8]/45 flex items-center justify-center cursor-pointer"
                  onClick={() => copyText(meetingLink, 'Meeting link copied')}
                  title="Copy meeting link"
                >
                  <Copy className="w-4 h-4 text-[#2E2D35]" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setWidgetType((prev: string) =>
                      prev === 'invite_members_direct' ? '' : 'invite_members_direct',
                    )
                  }
                >
                  Invite Members
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setWidgetType((prev: string) =>
                      prev === 'invite_others_direct' ? '' : 'invite_others_direct',
                    )
                  }
                >
                  Invite Others
                </Button>
              </div>
            </div>
          ) : null}

          {canUseTranscription ? (
            <div className="w-full rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Subtitles className="w-4 h-4 text-indigo-700" />
                </span>
                <div>
                  <p className={labelClass}>Transcription language</p>
                  <p className={descClass}>
                    {isUserSubtitlesOn
                      ? `On • ${subtitleLanguage?.toUpperCase() || 'EN'}`
                      : 'Off • Select any language to start'}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {subtitleLanguageOptions.map((language) => {
                  const isActive = subtitleLanguage === language.value && isUserSubtitlesOn;
                  return (
                    <button
                      key={language.value}
                      type="button"
                      className={`px-2.5 py-1.5 rounded-md border text-xs inline-flex items-center gap-1 ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-[#2E2D35] hover:bg-[#FBE2C8]/45'
                      } cursor-pointer`}
                      onClick={() => {
                        enableSubtitles(language.value);
                        setWidgetType('');
                      }}
                    >
                      {language.label}
                      {isActive ? <Check className="w-3.5 h-3.5" /> : null}
                    </button>
                  );
                })}
                {isUserSubtitlesOn ? (
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-600 text-xs hover:bg-red-100 cursor-pointer"
                    onClick={() => {
                      disableSubtitles();
                      setWidgetType('');
                    }}
                  >
                    Turn Off
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {canUseWhiteboard ? (
            <button
              type="button"
              className={`${actionClass} ${isWhiteboardDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={isWhiteboardDisabled}
              style={{
                cursor: isWhiteboardDisabled ? 'not-allowed' : 'pointer',
              }}
              onClick={() => {
                if (isWhiteboardDisabled) return;
                handleWhiteBoard({
                  isWhiteBoardopen: !isWhiteboardActive,
                  startedBy: userID,
                  startedByName: userName,
                });
                setViewType((prev: any) => (prev === 'whiteboard' ? 'grid' : 'whiteboard'));
                setWidgetType('');
              }}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Brush className="w-4 h-4 text-emerald-700" />
                </span>
                <div>
                  <p className={labelClass}>
                    {isWhiteboardActive
                      ? isWhiteboardOwner
                        ? 'Stop whiteboard'
                        : 'Whiteboard active'
                      : 'Start whiteboard'}
                  </p>
                  <p className={descClass}>
                    {isWhiteboardActive
                      ? isWhiteboardOwner
                        ? 'Switch off shared whiteboard'
                        : `${whiteboardStarterName} is sharing whiteboard`
                      : isAnyoneSharingScreen
                        ? `${screenSharingName} sharing screen`
                        : 'Open collaborative whiteboard'}
                  </p>
                </div>
              </div>
            </button>
          ) : null}

          <button
            type="button"
            className={actionClass}
            onClick={() => {
              handlePresentatingView();
              setViewType(isPresentationModeSelected ? 'grid' : 'presentation');
              setWidgetType('');
            }}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <View className="w-4 h-4 text-amber-700" />
              </span>
              <div>
                <p className={labelClass}>
                  {isPresentationModeSelected ? 'Exit presentation mode' : 'Presentation mode'}
                </p>
                <p className={descClass}>Focus on one tile or shared content</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            className={actionClass}
            onClick={() => {
              if (!localVideoTrack?.stream || isLocalVideoMuted) {
                handleAlert({ type: 'error', text: 'Please turn on your camera' });
                setWidgetType('');
                return;
              }
              setShowVirtualModal(true);
              setWidgetType('');
            }}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-fuchsia-100 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-fuchsia-700" />
              </span>
              <div>
                <p className={labelClass}>Background & effects</p>
                <p className={descClass}>Customize blur and virtual backgrounds</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="absolute polygon w-5 h-5 bg-[rgba(251,249,246,0.88)] bottom-[-10px] right-4" />
    </div>
  );
};

export default MoreOptions;

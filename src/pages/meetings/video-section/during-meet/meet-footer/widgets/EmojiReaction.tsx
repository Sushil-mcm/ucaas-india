import { useJitsi } from '@/hooks/use-jitsi';

const availableEmojis = ['👍', '😊', '😮', '🤙', '😃'];

const EmojiReaction = ({ apiMeetingData }: { apiMeetingData?: any }) => {
  const { sendEmojiReaction, sendHandRaisedEvent, isHandRaised } = useJitsi();

  const handleEmojiClick = (emoji: any) => {
    sendEmojiReaction(emoji);
  };

  return (
    <div className="relative">
      <div className="bg-white rounded-xl absolute left-[-30px] bottom-21 pt-4 pb-5 flex flex-col w-[325px] shadow-lg border border-gray-200">
        <div className="flex px-4 xxl:max-h-fit xl:max-h-fit lg:max-h-[480px] md:max-h-[365px] sm:max-h-[365px] xs:max-h-[365px] overflow-y-auto">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-col gap-4 w-full items-center justify-center">
              {apiMeetingData?.videoFeatures?.access?.RAISE_HAND && (
                <div
                  className="flex items-center justify-center bg-gray-100 w-1/2 rounded-full gap-1 px-3 py-1 min-h-8 cursor-pointer"
                  onClick={() => sendHandRaisedEvent()}
                >
                  ✋
                  <small className="text-gray-900">
                    {isHandRaised ? 'Unraise Hand' : 'Raise Hand'}
                  </small>
                </div>
              )}
              <div className="flex gap-2 items-center">
                {availableEmojis?.map((emoji, index) => (
                  <span
                    key={index}
                    onClick={() => handleEmojiClick(emoji)}
                    className="flex items-center justify-center bg-gray-100 w-full rounded-xl gap-1 px-3 py-2 min-h-8 cursor-pointer"
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute polygon w-5 h-5 bg-white bottom-[-10px] left-4"></div>
      </div>
    </div>
  );
};

export default EmojiReaction;

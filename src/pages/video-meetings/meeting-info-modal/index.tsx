import { FC, useState } from 'react';
import { formatMeetingDate, formatTime, getAbbreviationByTimeZone, handleAlert } from '@/lib/utils';
import { Icon } from '@/assets/icons/icon';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import { useUser } from '@/hooks/use-user';

interface MeetingInfoProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  meetingInfoData: any;
}
const MAX_VISIBLE = 12;

const MeetingInfo: FC<MeetingInfoProps> = ({ modalState, setModalState, meetingInfoData }: any) => {
  const { user } = useUser();
  const { user_info } = user || {};
  const [revealPassword, setRevealPassword] = useState(false);
  const meetingID = meetingInfoData?.meetingId;
  const password = meetingInfoData?.password || '';
  const { day, month, year } = formatMeetingDate(meetingInfoData?.startUtc, true);
  const timeZoneAbbreviation = getAbbreviationByTimeZone(meetingInfoData?.timezone);
  const isHost = meetingInfoData?.createdById === user_info?.uuid;
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      handleAlert({ text: 'Copied successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };
  console.log('password', password);
  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent className="w-full max-w-[550px] p-5" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80 ">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Meeting Info
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <DialogDescription>
          <div className="flex flex-col gap-6 mt-4">
            <div className="flex sm:items-center sm:flex-row flex-col">
              <p className="font-semibold w-36">Title :</p>
              <p className="sm:w-[calc(100%_-_9rem)]">{meetingInfoData?.name || ''}</p>
            </div>

            <div className="flex sm:items-center sm:flex-row flex-col">
              <p className="font-semibold w-36">Date/Time :</p>
              <p className="sm:w-[calc(100%_-_9rem)]">
                {month} {day}
                {year ? `, ${year}` : ''} {formatTime(meetingInfoData?.startUtc)}{' '}
                {timeZoneAbbreviation}
              </p>
            </div>

            <div className="flex sm:items-center sm:flex-row flex-col">
              <p className="font-semibold w-36">Meeting URL :</p>
              <div className="sm:w-[calc(100%_-_9rem)] flex items-start justify-between gap-4">
                <p className="break-all max-w-[350px]">{`${window.location.origin}/video-meet?meetCode=${meetingID}`}</p>
                <span
                  className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 min-w-8 max-h-8 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                  onClick={() =>
                    copyToClipboard(`${window.location.origin}/video-meet?meetCode=${meetingID}`)
                  }
                >
                  <Icon name="CopyLine" className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="flex sm:items-center sm:flex-row flex-col">
              <p className="font-semibold w-36">Meeting ID :</p>
              <div className="sm:w-[calc(100%_-_9rem)] flex items-start justify-between gap-4">
                <p className="break-all">{meetingID || ''}</p>
                <span
                  onClick={() => copyToClipboard(meetingID)}
                  className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 min-w-8 max-h-8 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                >
                  <Icon name="CopyLine" className="w-4 h-4" />
                </span>
              </div>
            </div>
            {isHost && password && (
              <div className="flex sm:items-center sm:flex-row flex-col">
                <p className="font-semibold w-36">Meeting Password :</p>
                <div className="sm:w-[calc(100%_-_9rem)] flex items-start justify-between gap-4">
                  <p className="tracking-wider">
                    {revealPassword
                      ? password?.slice(0, MAX_VISIBLE)
                      : '•'.repeat(Math.min(password?.length || MAX_VISIBLE, MAX_VISIBLE))}
                  </p>
                  <span
                    onClick={() => setRevealPassword(!revealPassword)}
                    className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 min-w-8 max-h-8 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                  >
                    <Icon name={revealPassword ? 'EyeLineOff' : 'EyeLine'} className="w-4 h-4" />
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingInfo;

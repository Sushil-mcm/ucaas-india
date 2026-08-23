import { Button } from '@/components/ui/button';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { getAbbreviationByTimeZone, getTodayInTimeZone } from '@/lib/utils';

function MeetError({ startUtcTime, modalState, setModalState }: any) {
  const navigate = useNavigate();
  const [showtime, SetShowTime] = useState<any>(null);
  const timeZoneAbbreviation = getAbbreviationByTimeZone(startUtcTime?.timeZone);
  const errorMessage = startUtcTime?.message;
  const isExpiredMeeting =
    errorMessage === 'Meeting link has been expired as the meeting is already ended' ||
    errorMessage === 'Meeting does not exist.';

  useEffect(() => {
    if (startUtcTime?.time && startUtcTime?.timeZone && !isExpiredMeeting) {
      const intervalId = setInterval(() => {
        const currentInTZ = getTodayInTimeZone(startUtcTime.timeZone);
        if (!currentInTZ) return;

        // Standardize currentInTZ string to remove commas and double spaces
        const cleanedCurrent = currentInTZ.replace(/,/g, '').replace(/\s+/g, ' ').trim();
        const currentDate = moment(cleanedCurrent, 'YYYY-MM-DD HH:mm:ss');
        const startDate = moment(startUtcTime.time);

        const timeDiff = startDate.diff(currentDate);
        console.log(timeDiff, 'timeDiff');

        if (timeDiff <= 0) {
          window.location.reload();
        }
        const totalSeconds = Math.floor(timeDiff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        SetShowTime(
          `Time Left: ${hours || 0} hours, ${minutes || 0} minutes, ${seconds || 0} seconds`,
        );
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [startUtcTime]);

  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent
        className="w-2/7 p-3"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="w-full flex sm:flex-row xs:flex-col  overflow-hidden">
          <div className="w-full  flex flex-col items-center justify-center gap-2">
            {!isExpiredMeeting ? (
              <>
                <h5 className="font-semibold text-primary">
                  Meeting starts at&nbsp;
                  {moment(startUtcTime?.time).format('hh:mm A DD/MM/YYYY ')}
                  &nbsp;{timeZoneAbbreviation}
                </h5>
                <p className="text-center">
                  Get ready to join the meeting when the clock
                  <br />
                  strikes the schedule time.
                </p>

                <p className="text-red-600 py-2">{showtime}</p>
              </>
            ) : (
              <div className="flex gap-5">
                <h5 className="text-grey-700 font-medium text-center break-words w-full">
                  {errorMessage}
                </h5>
              </div>
            )}
            <Button variant={'outline'} type="button" onClick={() => navigate('/video')}>
              Go Back to Home
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MeetError;

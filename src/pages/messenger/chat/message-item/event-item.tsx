import React, { useState } from 'react';
import { Calendar, Video, Globe, Clock } from 'lucide-react';
import { canEditMeeting, cn, formatTime } from '@/lib/utils';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import CreateEvent from '../create-event-modal';
import SideDrawer from '@/components/custom/side-drawer';
import { useUser } from '@/hooks/use-user';
import { useCompanyFeatures } from '@/hooks/rbac';

interface EventItemProps {
  event: {
    meetingId: string;
    name: string;
    duration: string | number;
    startTime: string;
    timezone: string;
    startTimeLocal: string;
    createdById?: string;
    mode?: string;
    status: string;
  };
  isMine: boolean;
  currentChat: any;
  msgObj: any;
}

const EventItem: React.FC<EventItemProps> = ({ event, isMine, currentChat, msgObj }) => {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const { user } = useUser();
  const { features } = useCompanyFeatures();
  const videAccess = features?.plan_features?.video?.action || {};

  if (!event) return null;

  const { name, startTime, timezone } = event;

  const formattedDate = moment(startTime).format('ddd, MMM D, YYYY');
  const formattedTime = formatTime(startTime);
  const isMeetingOwner = (event?.createdById || msgObj?.senderId) === user?.uuid;
  const canShowEditMeetingButton =
    canEditMeeting(event?.startTimeLocal || event?.startTime) &&
    isMeetingOwner &&
    event?.mode !== 'CHAT' &&
    videAccess?.edit;

  const durationInMinutes = Number(event?.duration || 0) || 30;
  const isPastMeeting = moment(startTime).add(durationInMinutes, 'minutes').isBefore(moment());

  const handleEdit = () => {
    setIsEventModalOpen(true);
  };

  const handleJoin = () => {
    if (event?.meetingId) {
      window.open(`/video-meet?meetCode=${event.meetingId}`);
    }
  };

  return (
    <div
      className={cn(
        'max-w-[300px] rounded-2xl overflow-hidden border shadow-sm transition-all hover:shadow-md',
        isMine ? 'bg-white border-ucass-active-bg' : 'bg-white border-gray-100',
      )}
    >
      {/* Header with Icon */}
      <div
        className={cn(
          'px-4 py-3 flex items-center gap-3',
          isMine ? 'bg-ucass-active-bg/50' : 'bg-gray-50/50',
        )}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            isMine
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-gray-200 text-gray-600',
          )}
        >
          <Video className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-[15px] font-bold text-gray-900 truncate uppercase tracking-tight">
            Meeting
          </h4>
          <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
            Video Call
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-gray-800 leading-tight">
            {name || 'Untitled Meeting'}
          </h3>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Globe className="w-3 h-3" />
            <span className="text-[11px] font-medium">{timezone || 'No Timezone'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Date</p>
              <p className="text-[12px] font-semibold text-gray-700 truncate">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 group bg-white">
            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Time</p>
              <p className="text-[12px] font-semibold text-gray-700 truncate">{formattedTime}</p>
            </div>
          </div>
        </div>

        {/* <div className="pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-ucass-active-bg rounded-lg border border-ucass-active-bg">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Duration:</span>
            <span className="text-[12px] font-bold text-gray-700">{duration} Min</span>
          </div>
        </div> */}
      </div>

      {/* Footer/Action */}
      {(event?.meetingId || canShowEditMeetingButton) && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-2">
          {event?.meetingId && (
            <Button
              disabled={isPastMeeting || event?.status === 'COMPLETED'}
              onClick={handleJoin}
              className={cn(
                'w-full h-10 font-bold rounded-xl transition-all',
                isPastMeeting
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 active:scale-[0.98]',
              )}
            >
              {isPastMeeting || event?.status === 'COMPLETED' ? 'Meeting Ended' : 'Join Meeting'}
            </Button>
          )}
          {canShowEditMeetingButton && (
            <Button
              onClick={handleEdit}
              variant="outline"
              className="w-full h-10 border border-primary text-primary hover:text-primary hover:bg-primary/10 font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              Edit Meeting
            </Button>
          )}
        </div>
      )}

      {isEventModalOpen && (
        <SideDrawer
          isOpen={isEventModalOpen}
          title="Update Event"
          handleClose={() => setIsEventModalOpen(false)}
          content={
            <CreateEvent
              setDrawerState={setIsEventModalOpen}
              currentChat={currentChat}
              msgObj={msgObj}
              initialData={msgObj?.event}
            />
          }
          isHeader={true}
          width="45%"
        />
      )}
    </div>
  );
};

export default EventItem;

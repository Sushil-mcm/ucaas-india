import { Icon } from '@/assets/icons/icon';
import { createMeeting } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import moment from 'moment';
import { useState } from 'react';
import JoinMeetingModal from './join-meeting-modal';
import ScheduleMeeting from '../schedule-meeting';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCompanyFeatures } from '@/hooks/rbac';
import ActivityPageHead from '@/components/custom/activity-page-head';

/**
 * The head every Meetings screen sits under.
 *
 * Was a full-width frosted hero card -- gradient icon tile, brown eyebrow,
 * 28px brown title, description printed underneath -- which is a different
 * object from the head Phone, Chat, Agent Chat and Inbox carry. It is the
 * same `ActivityPageHead` now: white bar, black 23px/800 title, the
 * description behind the info button, and the three controls it always had
 * moved into the head's own action slot.
 *
 * Rendered once by `video-meetings/index.tsx` above the outlet rather than
 * by each screen, so it stays full-bleed against the rail and does not
 * reset its modal state when you move between Upcoming, Ongoing, Past and
 * Invited.
 */
const MeetingHeader = ({ showActions = true }: { showActions?: boolean }) => {
  const [drawerState, setDrawerState] = useState<any>(false);
  const [modalState, setModalState] = useState(false);
  const { features } = useCompanyFeatures();
  const videAccess = features?.plan_features?.video?.action || {};
  const { mutate: mutateInstantMeeting, isPending: isPendingInstantMeeting } = useMutation({
    mutationFn: createMeeting,
    onSuccess: (data) => {
      const meetingData = data?.data?.data?.result;
      const meetingId = meetingData?.meetingId;
      window.open(`/video-meet?meetCode=${meetingId}`);
    },
  });

  const InstantMeeting = async () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const normalizedTz = tz === 'Asia/Calcutta' ? 'Asia/Kolkata' : tz;
    const now = new Date();
    const payload = {
      name: '',
      startTime: moment(now).format('YYYY-MM-DD HH:mm:ss'),
      allowHost: 'Y',
      timezone: normalizedTz,
      meetingType: 'INSTANT',
      mode: 'VIDEO',
      duration: 0,
    };
    mutateInstantMeeting(payload);
  };

  return (
    <>
      <ActivityPageHead
        title="Meetings"
        description="Connect securely with your team and clients. Start, schedule, or join high-quality video conferences instantly."
        actions={
          showActions ? (
            <>
              <button
                type="button"
                className="mcm-acthead-btn"
                onClick={() => setModalState(true)}
              >
                <Icon name="PlusIcon" />
                Join
              </button>
              {videAccess?.create && (
                <>
                  <button
                    type="button"
                    className="mcm-acthead-btn"
                    onClick={() => setDrawerState(true)}
                  >
                    <Icon name="CalendarIcon" />
                    Schedule
                  </button>
                  <button
                    type="button"
                    className="mcm-acthead-btn primary"
                    disabled={isPendingInstantMeeting}
                    onClick={() => {
                      if (isPendingInstantMeeting) return;
                      InstantMeeting();
                    }}
                  >
                    <Icon name="VideocameraAdd" />
                    {isPendingInstantMeeting ? 'Please wait' : 'Start meeting'}
                  </button>
                </>
              )}
            </>
          ) : null
        }
      />
      {modalState && <JoinMeetingModal modalState={modalState} setModalState={setModalState} />}
      <Dialog open={drawerState} onOpenChange={setDrawerState}>
        <DialogContent className="flex w-[96vw] flex-col gap-0 rounded-2xl p-0 sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <div className="px-6 pt-6 pb-1">
            <h5 className="text-xl font-extrabold" style={{ color: '#2E2D35' }}>
              Schedule New Meeting
            </h5>
            <p className="mt-1 text-xs text-[#9A948F]">
              Set up a video call with your team or clients
            </p>
          </div>
          <div className="px-6 pt-3 pb-6">
            <ScheduleMeeting setDrawerState={setDrawerState} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MeetingHeader;

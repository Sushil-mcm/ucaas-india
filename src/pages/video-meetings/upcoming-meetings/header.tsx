import { Icon } from '@/assets/icons/icon';
import { createMeeting } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import moment from 'moment';
import { useState } from 'react';
import JoinMeetingModal from './join-meeting-modal';
import ScheduleMeeting from '../schedule-meeting';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCompanyFeatures } from '@/hooks/rbac';
import { Video as VideoIcon, CalendarDays } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const HERO_COPY: Record<string, { line1: string; line2: string }> = {
  '/video': { line1: 'Every meeting,', line2: 'one click away' },
  '/video/ongoing-meetings': { line1: "You're live,", line2: 'make it count' },
  '/video/invited-meetings': { line1: "You're invited,", line2: "don't miss it" },
  '/video/past-meetings': { line1: 'Every conversation,', line2: 'archived here' },
};

const MeetingHeader = ({ formInstance, showActions = true }: any) => {
  const [drawerState, setDrawerState] = useState<any>(false);
  const [modalState, setModalState] = useState(false);
  const { pathname } = useLocation();
  const heroCopy = HERO_COPY[pathname] || HERO_COPY['/video'];
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
    <div className="mx-auto max-w-[1400px] flex w-full flex-col gap-6 sm:pt-3">
      <div
        className="relative w-full overflow-hidden rounded-[24px] border border-[#f5e6d3] px-6 py-8 sm:px-10 sm:py-10"
        style={{ background: 'linear-gradient(120deg, #fffaf3 0%, #fff1e0 55%, #fde3c2 100%)' }}
      >
        {/* Big faint watermark icons, purely decorative background texture. */}
        <VideoIcon
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 hidden h-[220px] w-[220px] text-[#f2994a]/10 lg:block"
          strokeWidth={1}
        />
        <CalendarDays
          aria-hidden
          className="pointer-events-none absolute -right-2 bottom-[-40px] hidden h-[150px] w-[150px] text-[#c96f1f]/10 lg:block"
          strokeWidth={1}
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-[28px] sm:text-[34px] leading-[1.15] font-extrabold text-[#2E2D35]">
            {heroCopy.line1}
            <br />
            <span className="text-[#c96f1f]">{heroCopy.line2}</span>
          </h2>

          {showActions && (
            <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0">
              {videAccess?.create && (
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 h-11 px-5 cursor-pointer rounded-xl text-white shadow-[0_6px_18px_rgba(242,153,74,0.35)] transition-transform hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #f2994a, #c96f1f)' }}
                  onClick={() => {
                    if (isPendingInstantMeeting) return;
                    InstantMeeting();
                  }}
                >
                  <Icon name="VideocameraAdd" className="w-4 h-4 shrink-0" />
                  <span className="font-semibold text-sm whitespace-nowrap">
                    {isPendingInstantMeeting ? 'Please Wait' : 'Start Meeting'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalState(true)}
                className="flex items-center justify-center gap-2 h-11 px-4 cursor-pointer rounded-xl border border-[#EEE7DD] bg-white text-[#2E2D35] transition-colors hover:border-[#f2994a]/50"
              >
                <Icon name="PlusIcon" className="w-4 h-4 shrink-0" />
                <span className="font-medium text-sm whitespace-nowrap">Join Meeting</span>
              </button>
              {videAccess?.create && (
                <button
                  type="button"
                  onClick={() => setDrawerState(true)}
                  className="flex items-center justify-center gap-2 h-11 px-4 cursor-pointer rounded-xl border border-[#EEE7DD] bg-white text-[#2E2D35] transition-colors hover:border-[#f2994a]/50"
                >
                  <Icon name="CalendarIcon" className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-sm whitespace-nowrap">Schedule</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {modalState && (
        <JoinMeetingModal
          modalState={modalState}
          setModalState={setModalState}
          formInstance={formInstance}
        />
      )}
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
    </div>
  );
};

export default MeetingHeader;

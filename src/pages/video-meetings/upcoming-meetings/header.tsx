import { Icon } from '@/assets/icons/icon';
import { createMeeting } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import moment from 'moment';
import { useState } from 'react';
import JoinMeetingModal from './join-meeting-modal';
import ScheduleMeeting from '../schedule-meeting';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCompanyFeatures } from '@/hooks/rbac';
import { User, Video as VideoIcon, CalendarDays } from 'lucide-react';

const MeetingHeader = ({ formInstance, showActions = true }: any) => {
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
    <div className="mx-auto max-w-250 flex w-full flex-col gap-6 sm:pt-3">
      <div
        className="relative w-full overflow-hidden rounded-[24px] border border-[#f5e6d3] px-6 py-8 sm:px-10 sm:py-10"
        style={{ background: 'linear-gradient(120deg, #fffaf3 0%, #fff1e0 55%, #fde3c2 100%)' }}
      >
        {/* Decorative dot scatter — a handful of static dots rather than a
            repeating pattern, so it reads as accent, not texture. */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-[210px] top-8 hidden h-2 w-2 rounded-full bg-[#f2994a]/30 lg:block"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-[130px] top-20 hidden h-1.5 w-1.5 rounded-full bg-[#c96f1f]/25 lg:block"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-[260px] bottom-10 hidden h-1.5 w-1.5 rounded-full bg-[#f2994a]/25 lg:block"
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 lg:max-w-[520px]">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#c96f1f] shadow-sm">
              <Icon name="VideocameraAdd" className="w-3.5 h-3.5" />
              Video Meetings
            </span>
            <h2 className="text-[28px] sm:text-[34px] leading-[1.15] font-extrabold text-[#2E2D35]">
              Every meeting,
              <br />
              <span className="text-[#c96f1f]">one click away</span>
            </h2>

            {showActions && (
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
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

          {/* Decorative icon cluster: a large camera tile anchored by two
              smaller floating badges, all off the shared icon set rather
              than bespoke illustration art. */}
          <div
            aria-hidden
            className="relative hidden h-[150px] w-[190px] shrink-0 lg:block"
          >
            <div className="absolute right-3 top-1/2 flex h-24 w-24 -translate-y-1/2 items-center justify-center rounded-[26px] bg-white shadow-[0_16px_32px_rgba(201,111,31,0.18)]">
              <VideoIcon className="h-10 w-10 text-[#f2994a]" strokeWidth={1.75} />
            </div>
            <div className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_6px_16px_rgba(201,111,31,0.15)]">
              <User className="h-5 w-5 text-[#c96f1f]" strokeWidth={1.75} />
            </div>
            <div className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_6px_16px_rgba(201,111,31,0.15)]">
              <CalendarDays className="h-5 w-5 text-[#c96f1f]" strokeWidth={1.75} />
            </div>
          </div>
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

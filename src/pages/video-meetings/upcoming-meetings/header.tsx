import { Icon } from '@/assets/icons/icon';
import { createMeeting } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import moment from 'moment';
import { useState } from 'react';
import JoinMeetingModal from './join-meeting-modal';
import ScheduleMeeting from '../schedule-meeting';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCompanyFeatures } from '@/hooks/rbac';

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
      <div className="relative w-full overflow-hidden rounded-[24px] border border-[#f0e0cc] shadow-[0_10px_30px_rgba(201,111,31,0.1)]">
        <div className="flex flex-col lg:flex-row">
          <div
            className="relative overflow-hidden flex items-center gap-4 px-6 py-7 sm:px-8 sm:py-8 lg:w-[380px] lg:shrink-0"
            style={{ background: 'linear-gradient(135deg, #f2994a, #c2620f)' }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 bottom-0 h-52 w-52 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
            <div
              aria-hidden
              className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25"
            >
              <Icon name="VideocameraAdd" className="w-6 h-6" />
            </div>
            <div className="relative z-10 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
                Video Conferencing
              </span>
              <div className="text-2xl sm:text-[26px] leading-tight font-extrabold text-white">
                Video Meetings
              </div>
              <div className="text-[13px] leading-relaxed text-white/85">
                Connect securely with your team and clients, instantly.
              </div>
            </div>
          </div>

          {showActions && (
            <div className="flex flex-1 flex-col justify-center gap-3 bg-white px-6 py-6 sm:flex-row sm:items-center sm:gap-2.5 sm:px-8">
              {videAccess?.create && (
                <div
                  className="flex items-center justify-center gap-2 min-h-11 px-5 w-full sm:w-auto cursor-pointer rounded-xl text-white shadow-[0_6px_18px_rgba(242,153,74,0.35)] transition-transform hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #f2994a, #c96f1f)' }}
                  onClick={() => {
                    if (isPendingInstantMeeting) return;
                    InstantMeeting();
                  }}
                >
                  <Icon name="VideocameraAdd" className="w-4 h-4 shrink-0" />
                  <h6 className="font-semibold text-center text-sm whitespace-nowrap">
                    {isPendingInstantMeeting ? 'Please Wait' : 'Start Meeting'}
                  </h6>
                </div>
              )}

              <div className="flex items-center gap-1 rounded-xl border border-[#EEE7DD] bg-[#FBE2C8]/20 p-1 w-full sm:w-auto">
                <div
                  onClick={() => setModalState(true)}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-9 px-4 cursor-pointer rounded-lg text-[#2E2D35] transition-colors hover:bg-white"
                >
                  <Icon name="PlusIcon" className="w-4 h-4 shrink-0" />
                  <h6 className="font-medium text-center text-sm whitespace-nowrap">Join</h6>
                </div>
                {videAccess?.create && (
                  <>
                    <span className="h-5 w-px bg-[#EEE7DD]" aria-hidden />
                    <div
                      className="flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-9 px-4 cursor-pointer rounded-lg text-[#2E2D35] transition-colors hover:bg-white"
                      onClick={() => setDrawerState(true)}
                    >
                      <Icon name="CalendarIcon" className="w-4 h-4 shrink-0" />
                      <h6 className="font-medium text-center text-sm whitespace-nowrap">Schedule</h6>
                    </div>
                  </>
                )}
              </div>
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

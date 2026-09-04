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
      <div
        className="relative w-full flex flex-col gap-7 overflow-hidden rounded-[28px] border border-white/60 bg-white/45 backdrop-blur-2xl
      sm:p-9 p-5
      shadow-[0_14px_40px_rgba(154,52,18,0.08),inset_0_1px_0_rgba(255,255,255,0.85)]
      "
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-[110px]"
          style={{ background: 'rgba(231,139,80,0.16)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-14 -bottom-20 h-48 w-48 rounded-full blur-[95px]"
          style={{ background: 'rgba(217,101,46,0.1)' }}
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              aria-hidden
              className="hidden sm:flex mt-5 h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_6px_18px_rgba(231,139,80,0.35)]"
              style={{ background: 'linear-gradient(135deg, #E78B50, #D9652E)' }}
            >
              <Icon name="VideocameraAdd" className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[420px]">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: '#B5642F' }}
              >
                Video Conferencing
              </span>
              <div
                className="w-full text-2xl sm:text-[28px] leading-tight font-extrabold"
                style={{ color: '#8A3F1C' }}
              >
                Video Meetings
              </div>
              <div className="w-full text-[13px] text-gray-600 font-normal sm:leading-6">
                Connect securely with your team and clients. Start, schedule, or join high-quality
                video conferences instantly.
              </div>
            </div>
          </div>

          {showActions && (
            <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center lg:w-auto">
              {videAccess?.create && (
                <div
                  className="flex items-center justify-center gap-2 min-h-11 px-5 w-full sm:w-auto cursor-pointer rounded-xl text-white shadow-[0_6px_18px_rgba(231,139,80,0.4)] transition-transform hover:-translate-y-0.5 "
                  style={{ background: 'linear-gradient(135deg, #E78B50, #D9652E)' }}
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

              <div className="flex items-center gap-1 rounded-xl border border-white/80 bg-white/60 backdrop-blur-md p-1 shadow-[0_2px_10px_rgba(120,60,20,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] w-full sm:w-auto">
                <div
                  onClick={() => setModalState(true)}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-9 px-4 cursor-pointer rounded-lg text-gray-800 transition-colors hover:bg-white/90"
                >
                  <Icon name="PlusIcon" className="w-4 h-4 shrink-0" />
                  <h6 className="font-medium text-center text-sm whitespace-nowrap">Join</h6>
                </div>
                {videAccess?.create && (
                  <>
                    <span className="h-5 w-px bg-gray-900/10" aria-hidden />
                    <div
                      className="flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-9 px-4 cursor-pointer rounded-lg text-gray-800 transition-colors hover:bg-white/90"
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

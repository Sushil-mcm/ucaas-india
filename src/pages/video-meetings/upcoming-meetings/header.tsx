import { Icon } from '@/assets/icons/icon';
import { createMeeting } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import moment from 'moment';
import { useState } from 'react';
import JoinMeetingModal from './join-meeting-modal';
import ScheduleMeeting from '../schedule-meeting';
import SideDrawer from '@/components/custom/side-drawer';
import { useCompanyFeatures } from '@/hooks/rbac';

const MeetingHeader = ({ formInstance }: any) => {
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
        className="w-full flex flex-col gap-6 rounded-2xl  bg-white  lg:flex-row lg:items-center lg:justify-between
      bg-[linear-gradient(to_right,_#e5e9f2_0%,_#ffffff_35%,_#ffffff_65%,_#e5e9f2_100%)] rounded-2xl sm:p-8 p-3 shadow-xs
      "
      >
        <div className="flex flex-col gap-2 w-full max-w-[400px]">
          <div className="w-full text-lg sm:text-2xl font-bold">Video Meetings</div>
          <div className="w-full text-[13px] font-light sm:leading-6">
            Connect securely with your team and clients. Start, schedule, or join high-quality video
            conferences instantly.
          </div>
        </div>
        <div className="flex w-full lg:flex-nowrap items-start justify-end gap-2 sm:flex-row ">
          {videAccess?.create && (
            <div
              className="flex items-center gap-2 min-h-10 px-3 xs:w-full sm:w-auto justify-center cursor-pointer rounded-lg bg-ucass-active text-white shadow-sm "
              onClick={() => {
                if (isPendingInstantMeeting) return;
                InstantMeeting();
              }}
            >
              <div className="flex  cursor-pointer items-center justify-center  ">
                <Icon name="VideocameraAdd" className="w-4 h-4" />
              </div>
              <h6 className=" font-medium text-center text-sm ">
                {isPendingInstantMeeting ? 'Please Wait' : 'Start Meeting'}
              </h6>
            </div>
          )}
          <div
            onClick={() => setModalState(true)}
            className="bg-white/90 flex items-center gap-2 min-h-10 px-5  sm:w-auto justify-center cursor-pointer rounded-lg text-gray-900 border shadow-sm"
          >
            <div className="flex  cursor-pointer items-center justify-center">
              <Icon name="PlusIcon" className="w-4 h-4" />
            </div>
            <h6 className="text-gray-900 font-medium text-center text-sm sm:flex hidden">Join</h6>
          </div>
          {videAccess?.create && (
            <div
              className="bg-white/90 flex items-center gap-2 min-h-10 px-4  sm:w-auto justify-center cursor-pointer rounded-lg text-gray-900 border shadow-sm "
              onClick={() => setDrawerState(true)}
            >
              <a href="javascript:void(0)" className="flex  items-center justify-center  ">
                <Icon name="CalendarIcon" className="w-4 h-4" />
              </a>
              <h6 className="text-gray-900 font-medium text-center text-sm sm:flex hidden">
                Schedule{' '}
              </h6>
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
      {drawerState && (
        <SideDrawer
          isOpen={drawerState}
          title="Schedule New Meeting"
          handleClose={() => setDrawerState(false)}
          content={<ScheduleMeeting setDrawerState={setDrawerState} />}
          isHeader={true}
          width="650px"
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
        />
      )}
    </div>
  );
};

export default MeetingHeader;

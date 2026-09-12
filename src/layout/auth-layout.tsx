import MeetInitiateModal from '@/components/audio-video-call/components/meet-initiate-modal';
import Header from '@/components/custom/header';
import UpgradePlanWidget from '@/components/custom/plan-widget';
import Sidebar from '@/components/custom/sidebar';
import { useAreaNav } from '@/components/custom/use-area-nav';
// import Dialer from '@/components/dialer';
import AgentRunningCampignOuter from '@/components/running-campaign-outer';
import DialpadGlobalOverlay from '@/components/dialpad/dialpad-global-overlay';
import { useAvCall } from '@/hooks/use-av-call';
import { useCampaign } from '@/hooks/use-campaign';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { CAMPAIGN_STATUS_CONST } from '@/pages/auto-dialer/campaign/const';
import MeetRinging from '@/pages/messenger/chat/meet-ringing';
import { GlobalCallbackReminder } from '@/components/custom/callback-reminder/global-callback-reminder';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
// import PowerDialerCampaign from '@/components/power-dialer-campaign';
import { useEffect, useMemo, useState } from 'react';
import AlertConfirm from '@/components/custom/alert-confirm';
import { handleAlert } from '@/lib/utils';
import { HoursNotice, hoursStopNotice } from '@/lib/campaign-window';

import { useIdleTimeout } from '@/hooks/use-idle-timeout';

const AuthLayout = () => {
  /* Signs an unattended console out after the idle time the company set. Placed
     here because this layout sits inside both the call and video providers, so
     the hook can tell when somebody is actually on a call and hold off — being
     dropped mid-call would be far worse than the timeout it enforces. Does
     nothing at all unless a company has switched it on. */
  useIdleTimeout();

  // Same source the rail uses, so the gutter and the rail agree.
  const { hasRail } = useAreaNav();
  // const [isDialerOpen, setIsDialerOpen] = useState(false);
  // const [isDialerDrawerOpen, setIsDialerDrawerOpen] = useState(false);

  const {
    setIsStartCampaign,
    setTimer,
    setContacts,
    setActiveCallSessionData,
    setSelectedContact,
    selectedCampaign,
    setSelectedCampaign,
    setIsCampaignCall,
    isStartCampaign,
  } = useCampaign();

  // const  = location?.pathname?.startsWith('/contact-activity')
  const {
    socketEventsManager,
    callingInProgress,
    allChats,
    meetInitiateModalData,
    setMeetInitiateModalData,
  } = useSocketEvents();
  const { isRoomJoined, cleanupLocalMediaTracks } = useAvCall();
  const isInConference = isRoomJoined;

  const meetModalCurrentChat = useMemo(() => {
    if (!meetInitiateModalData?.chatId) return null;

    const matchedChat = Array.isArray(allChats)
      ? allChats.find((chat: any) => chat?.chatId === meetInitiateModalData.chatId)
      : null;

    if (matchedChat) {
      return {
        ...matchedChat,
        meetMetadata: {
          ...(matchedChat?.meetMetadata || {}),
          startedBy: matchedChat?.meetMetadata?.startedBy || meetInitiateModalData?.senderId || '',
        },
      };
    }

    return {
      chatId: meetInitiateModalData.chatId,
      users: [],
      meetMetadata: {
        startedBy: meetInitiateModalData?.senderId || '',
      },
    };
  }, [allChats, meetInitiateModalData]);
  /* The popup when a campaign is stopped by its calling hours - by the dialer
     engine (campaign-state-update, pausedBy HOURS) or because this browser
     refused a preview call outside them.
     It used to appear for EVERYONE signed in, on every page. campaign-state-update
     is broadcast to the whole company, so an agent working a different campaign -
     or no campaign at all - got a modal thrown over their screen about somebody
     else's. A modal is an interruption and has to be earned.
     It is now shown to the people it is actually about: whoever has joined that
     campaign, and whoever just acted on it in this browser (the local event
     below, which the campaign list raises for the person who pressed Start). */
  const { joinedCampaignId } = useDialpad();
  const [hoursNotice, setHoursNotice] = useState<HoursNotice | null>(null);
  useEffect(() => {
    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail && typeof detail === 'object') setHoursNotice(hoursStopNotice(detail));
    };
    window.addEventListener('mcm:campaign-hours-closed', onLocal);
    return () => window.removeEventListener('mcm:campaign-hours-closed', onLocal);
  }, []);

  useEffect(() => {
    if (!socketEventsManager) return;
    const handler = (data: any) => {
      if (data && data?._id) {
        const isMine =
          String(joinedCampaignId || '').trim() === String(data?._id || '').trim() &&
          Boolean(String(joinedCampaignId || '').trim());
        if (
          isMine &&
          data?.campaignStatus === CAMPAIGN_STATUS_CONST.PAUSE &&
          String(data?.pausedBy || '').toUpperCase() === 'HOURS'
        ) {
          setHoursNotice(hoursStopNotice(data));
        } else if (
          isMine &&
          data?.campaignStatus === CAMPAIGN_STATUS_CONST.PROCESSING &&
          String(data?.resumedBy || '').toUpperCase() === 'HOURS'
        ) {
          handleAlert({
            type: 'success',
            text: `${data?.name || 'Campaign'} is running again: its calling hours have opened.`,
          });
        }
        if (
          data?._id === selectedCampaign?.value &&
          data?.campaignStatus === CAMPAIGN_STATUS_CONST.PAUSE
        ) {
          setIsStartCampaign(false);
          setContacts([]);
          setTimer(0);
          setSelectedCampaign(null);
          setActiveCallSessionData(null);
          setSelectedContact(null);
          setIsCampaignCall(false);
          // if (activeCallKey) _terminate(activeCallKey);
        }
      }
    };
    socketEventsManager.on('campaign-state-update', handler);

    return () => {
      socketEventsManager.off('campaign-state-update', handler);
    };
  }, [socketEventsManager, selectedCampaign?.value, joinedCampaignId]);

  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          console.log(`Notification permission: ${permission}`);
        });
      } else {
        console.log(`Notification permission already set to: ${Notification.permission}`);
      }
    } else {
      console.log('This browser does not support notifications.');
    }
  }, []);

  return (
    <div className="flex h-full w-full">
      <Sidebar />
      {/* The rail's gutter goes when the rail does, so Home is not left with an
          empty column beside it. */}
      <div className={`h-full w-full p-0 ${hasRail ? 'md:pl-20' : ''}`}>
        <Header />
        <div className="flex h-full min-h-0 w-full pt-16">
          <SuspenseOutlet />
        </div>
      </div>
      {/* <Dialer {...{ isDialerDrawerOpen, setIsDialerDrawerOpen, isDialerOpen, setIsDialerOpen }} /> */}
      {hoursNotice ? (
        <AlertConfirm
          open
          setOpen={() => setHoursNotice(null)}
          headerText={hoursNotice.title}
          descriptionTextComp={<p className="text-sm text-gray-700">{hoursNotice.text}</p>}
          singleButton
          singleButtonText="OK"
          singleButtonHandler={() => setHoursNotice(null)}
          onConfirm={() => setHoursNotice(null)}
        />
      ) : null}
      <DialpadGlobalOverlay />
      {/* <PowerDialerCampaign /> */}
      <UpgradePlanWidget />
      <GlobalCallbackReminder />
      {isStartCampaign && <AgentRunningCampignOuter />}
      {callingInProgress && !isInConference ? <MeetRinging /> : null}
      {meetInitiateModalData && meetModalCurrentChat ? (
        <MeetInitiateModal
          currentChat={meetModalCurrentChat}
          callType={meetInitiateModalData?.callType || 'video'}
          isInitiator={false}
          skipJoinOptions
          skipPreJoinMediaCheck={Boolean(meetInitiateModalData?.skipPreJoinMediaCheck)}
          onClose={() => {
            cleanupLocalMediaTracks();
            setMeetInitiateModalData(null);
          }}
        />
      ) : null}
      {/* {
        isStartCampaign && selectedCampaign?.dialMethod === DIALER_TYPE.PREVIEW && (
          <CampaignContactsRightBar />
        )
      } */}
    </div>
  );
};

export default AuthLayout;

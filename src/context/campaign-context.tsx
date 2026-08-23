import { createContext, useRef, useState, type ReactNode } from 'react';
export interface CampaignContextType {
  activeTab: any;
  setActiveTab: any;
  setSkipState: any;
  isStartCampaign: any;
  setIsStartCampaign: any;
  skipState: any;
  activeItem: any;
  setActiveItem: any;
  timer: any;
  setTimer: any;
  dispositionTimer: any;
  setDispositionTimer: any;
  contacts: any;
  setContacts: any;
  callWrapupState: any;
  setCallWrapupState: any;
  isCustomSchedule: any;
  setIsCustomSchedule: any;
  activeCallSessionData: any;
  setActiveCallSessionData: any;
  selectedContact: any;
  setSelectedContact: any;
  isShowAlert: any;
  setIsShowAlert: any;
  selectedCampaign: any;
  setSelectedCampaign: any;
  isTranscriptOn: any;
  setIsTranscriptOn: any;
  isTranscriptOnOnce: any;
  setIsTranscriptOnOnce: any;
  isContactLoading: any;
  setIsContactLoading: any;
  isCampaignCall: any;
  setIsCampaignCall: any;
  timerRef: any;
  isMountedRef: any;
  dispositionTimerRef: any;
  campaignList: any;
  setCampaignList: any;
  isRunHandleCampaignEvents: any;
  setIsRunHandleCampaignEvents: any;
  isStopCampaign: any;
  setIsStopCampaign: any;
  waitingState: any;
  setWaitingState: any;
  isWaitingMoreCampaignCall: any;
  setIsWaitingMoreCampaignCall: any;
  leadValidationAlert: any;
  setLeadValidationAlert: any;
}

export const CampaignContext = createContext<CampaignContextType>({
  activeTab: null,
  setActiveTab: null,
  setSkipState: null,
  skipState: null,
  isStartCampaign: null,
  setIsStartCampaign: null,
  activeItem: null,
  setActiveItem: null,
  timer: null,
  setTimer: null,
  dispositionTimer: null,
  setDispositionTimer: null,
  contacts: null,
  setContacts: null,
  callWrapupState: null,
  setCallWrapupState: null,
  isCustomSchedule: null,
  setIsCustomSchedule: null,
  activeCallSessionData: null,
  setActiveCallSessionData: null,
  selectedContact: null,
  setSelectedContact: null,
  isShowAlert: null,
  setIsShowAlert: null,
  selectedCampaign: null,
  setSelectedCampaign: null,
  isTranscriptOn: null,
  setIsTranscriptOn: null,
  isTranscriptOnOnce: null,
  setIsTranscriptOnOnce: null,
  isContactLoading: null,
  setIsContactLoading: null,
  isCampaignCall: null,
  setIsCampaignCall: null,
  timerRef: null,
  dispositionTimerRef: null,
  isMountedRef: null,
  campaignList: null,
  setCampaignList: null,
  isRunHandleCampaignEvents: null,
  setIsRunHandleCampaignEvents: null,
  isStopCampaign: null,
  setIsStopCampaign: null,
  waitingState: null,
  setWaitingState: null,
  isWaitingMoreCampaignCall: null,
  setIsWaitingMoreCampaignCall: null,
  leadValidationAlert: null,
  setLeadValidationAlert: null,
});

export const CampaignProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState<string>('');
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isStartCampaign, setIsStartCampaign] = useState<boolean>(false);
  const [isCampaignCall, setIsCampaignCall] = useState<boolean>(false);
  const [activeItem, setActiveItem] = useState('');
  const [timer, setTimer] = useState<number>(0);
  const [dispositionTimer, setDispositionTimer] = useState<number>(0);
  const [contacts, setContacts] = useState<any[]>([]);
  const [callWrapupState, setCallWrapupState] = useState<any>({
    note: null,
    disposition: null,
    rescheduleTime: null,
  });
  const [isCustomSchedule, setIsCustomSchedule] = useState<boolean>(false);
  const [activeCallSessionData, setActiveCallSessionData] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isShowAlert, setIsShowAlert] = useState<any>({
    isShow: false,
    index: 0,
  });
  const [isTranscriptOn, setIsTranscriptOn] = useState<boolean>(false);
  const [isTranscriptOnOnce, setIsTranscriptOnOnce] = useState<boolean>(false);
  const [isContactLoading, setIsContactLoading] = useState<boolean>(false);
  const timerRef = useRef<any>(null);
  const dispositionTimerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const [campaignList, setCampaignList] = useState<any[]>([]);
  const [isRunHandleCampaignEvents, setIsRunHandleCampaignEvents] = useState<boolean>(false);
  const [isStopCampaign, setIsStopCampaign] = useState<boolean>(false);
  const [skipState, setSkipState] = useState<{
    skippedCount: number;
    totalCount: number;
    skippedRetries: number;
  }>({
    skippedCount: 0,
    totalCount: 0,
    skippedRetries: 0,
  });
  const [waitingState, setWaitingState] = useState<boolean>(false);
  const [isWaitingMoreCampaignCall, setIsWaitingMoreCampaignCall] = useState<boolean>(false);
  const [leadValidationAlert, setLeadValidationAlert] = useState<any>({
    open: false,
    message: '',
    countdown: 3,
    requestKey: 0,
    shouldRefresh: false,
  });

  return (
    <CampaignContext.Provider
      value={{
        activeTab,
        setActiveTab,
        setSkipState,
        skipState,
        isStartCampaign,
        setIsStartCampaign,
        activeItem,
        setActiveItem,
        timer,
        setTimer,
        dispositionTimer,
        setDispositionTimer,
        contacts,
        setContacts,
        callWrapupState,
        setCallWrapupState,
        isCustomSchedule,
        setIsCustomSchedule,
        activeCallSessionData,
        setActiveCallSessionData,
        selectedContact,
        setSelectedContact,
        isShowAlert,
        setIsShowAlert,
        selectedCampaign,
        setSelectedCampaign,
        isTranscriptOn,
        setIsTranscriptOn,
        isTranscriptOnOnce,
        setIsTranscriptOnOnce,
        isContactLoading,
        setIsContactLoading,
        isCampaignCall,
        setIsCampaignCall,
        timerRef,
        dispositionTimerRef,
        isMountedRef,
        campaignList,
        setCampaignList,
        isRunHandleCampaignEvents,
        setIsRunHandleCampaignEvents,
        isStopCampaign,
        setIsStopCampaign,
        waitingState,
        setWaitingState,
        isWaitingMoreCampaignCall,
        setIsWaitingMoreCampaignCall,
        leadValidationAlert,
        setLeadValidationAlert,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
};

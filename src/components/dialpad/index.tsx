import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_DIAL_LENGTH } from './constants';
import type { CallerIdOption } from './types';
import { isDialpadInput } from './utils';
import { cn } from '@/lib/utils';
import { useDialpad } from '@/hooks/use-dialpad';
import { useDialpadCallerIdOptions } from '@/hooks/use-dialpad-caller-id-options';
import { AppWindow as AppWindowIcon, Minus, Tablet, X } from 'lucide-react';
import DialpadGuideModal from './components/dialpad-guide-modal';
import DialpadMaxiSidePanel, { type DialpadMaxiTab } from './components/dialpad-maxi-side-panel';
import DialpadMicroFrame from './components/dialpad-micro-frame';
import DialpadMiniFrame from './components/dialpad-mini-frame';
import DialpadTranscriptManager from './components/dialpad-transcript-manager';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { isExtensionDialTarget } from '@/lib/extension-utility';
import { getDialpadSessionDisplayInfo, getHeaderFirstValue } from './session-display';

type DialpadScreenState = 'idle' | 'ringing' | 'connected' | 'ended';
type DialpadRenderMode = 'route' | 'overlay';
const PREDICTIVE_AUTO_ANSWER_DELAY_MS = 3000;

type DialpadProps = {
  mode?: DialpadRenderMode;
  overlayMaxiTabOverride?: DialpadMaxiTab | null;
  onOverlayMaxiTabOverrideChange?: (tab: DialpadMaxiTab | null) => void;
};

const parseBooleanFlag = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  const normalizedValue = String(value ?? '')
    .trim()
    .toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalizedValue)) return true;
  if (['false', '0', 'no', 'off'].includes(normalizedValue)) return false;
  return null;
};

const Dialpad = ({
  mode = 'route',
  overlayMaxiTabOverride = null,
  onOverlayMaxiTabOverrideChange,
}: DialpadProps) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const isPhoneRoute = location.pathname.startsWith('/phone');
  const buttonCursorClass =
    '[&_button:not(:disabled)]:cursor-pointer [&_button:disabled]:cursor-not-allowed';
  const {
    modalSize,
    setModalSize,
    isDialpadOpen,
    closeDialpad,
    // setCampaignContactCards,
    makeCall,
    campaignContactCards,
    activeCampaign,
    joinedCampaignId,
    sessions,
    activeSessionId,
    setActiveSessionId,
    answerCall,
    holdCall,
    unholdCall,
    muteCall,
    unmuteCall,
    endCall,
    toggleSpeakerCall,
    switchActiveSession,
    clearSession,
    sendDtmf,
    isRegistered,
    uaStatus,
  } = useDialpad();
  const { callerIdOptions, defaultCallerIdOption, updateCallerIdSelection } =
    useDialpadCallerIdOptions();
  const [typedNumber, setTypedNumber] = useState('');
  const [selectedCallerId, setSelectedCallerId] = useState<CallerIdOption>(defaultCallerIdOption);
  const [isCallerIdOpen, setIsCallerIdOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [dialpadScreen, setDialpadScreen] = useState<DialpadScreenState>('idle');
  const [localMaxiTabOverride, setLocalMaxiTabOverride] = useState<DialpadMaxiTab | null>(null);
  const [, setActiveMaxiTab] = useState<DialpadMaxiTab>('call-history');
  const [routeModalSizeOverride, setRouteModalSizeOverride] = useState<'mini' | 'maxi' | null>(
    null,
  );
  const frameViewportClass =
    mode === 'overlay'
      ? 'max-h-[calc(100dvh-2rem)] w-full'
      : 'max-h-[calc(100dvh-7rem)] sm:max-h-[calc(100dvh-6.5rem)]';
  const contentViewportClass = mode === 'overlay' ? '' : frameViewportClass;

  const maxiTabOverride =
    mode === 'overlay' ? overlayMaxiTabOverride || null : localMaxiTabOverride;

  const canCall =
    typedNumber.replace(/\D/g, '').length >= 3 &&
    isRegistered &&
    selectedCallerId?.id !== 'no-caller-id';
  const isCampaignInProgress = useMemo(() => {
    const activeCampaignId = String(activeCampaign?._id || '').trim();
    const joinedCampaignValue = String(joinedCampaignId || '').trim();
    return Boolean(activeCampaignId || joinedCampaignValue || campaignContactCards !== null);
  }, [activeCampaign?._id, campaignContactCards, joinedCampaignId]);
  const isManualDialDisabled = dialpadScreen === 'idle' && isCampaignInProgress;
  const activeSessionFromId = activeSessionId ? sessions?.[activeSessionId] : null;
  const allSessions = useMemo(
    () => Object.values(sessions).sort((left, right) => right.startedAt - left.startedAt),
    [sessions],
  );
  const activeSession = activeSessionFromId || allSessions[0] || null;
  const activeSessionStatus = String(activeSession?.status || '').toLowerCase();
  const isActiveSessionConnected = ['accepted', 'confirmed', 'connected'].includes(
    activeSessionStatus,
  );
  const activeSessionDialTarget = String(
    activeSession?.remoteNumber || activeSession?.extension || '',
  ).trim();
  const isActiveSessionExtensionCall =
    isActiveSessionConnected && isExtensionDialTarget(activeSessionDialTarget);
  const isActiveSessionConferenceCall =
    isActiveSessionConnected && Boolean(activeSession?.conferenceData);
  const isActiveSessionMonitoringCall =
    getDialpadSessionDisplayInfo(activeSession).isMonitoringCall;
  const isMaxiRestrictedForActiveSession =
    isActiveSessionExtensionCall || isActiveSessionConferenceCall || isActiveSessionMonitoringCall;
  const isMiniOnlyForActiveSession = isActiveSessionMonitoringCall;
  const shouldUseMaxiInRouteMode =
    !isMaxiRestrictedForActiveSession &&
    (dialpadScreen === 'connected' || dialpadScreen === 'ringing');
  const routeResolvedModalSize =
    routeModalSizeOverride || (shouldUseMaxiInRouteMode ? 'maxi' : 'mini');
  const baseResolvedModalSize = mode === 'overlay' ? modalSize : routeResolvedModalSize;
  const resolvedModalSize = isMiniOnlyForActiveSession
    ? 'mini'
    : isMaxiRestrictedForActiveSession && baseResolvedModalSize === 'maxi'
      ? 'mini'
      : baseResolvedModalSize;
  const isMaxiMode = resolvedModalSize === 'maxi';
  const isHold = Boolean(activeSession?.isOnHold);
  const isMuted = Boolean(activeSession?.isMuted);
  const isSpeakerOn = activeSession?.isSpeakerOn ?? true;
  const hasAnySession = allSessions.length > 0;
  const routeModeSizeSwitcher =
    hasAnySession && !isMaxiRestrictedForActiveSession && !isMiniOnlyForActiveSession ? (
      <div className="inline-flex items-center gap-1 rounded-xl border border-[#e3eaf8] bg-[linear-gradient(180deg,#fdfefe_0%,#f6f9ff_100%)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <button
          type="button"
          onClick={() => setRouteModalSizeOverride('maxi')}
          aria-label="Switch to maxi view"
          title="Maxi"
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#36557f] transition',
            resolvedModalSize === 'maxi'
              ? 'bg-primary text-white shadow-[0_4px_10px_rgba(33,96,217,0.28)]'
              : 'hover:bg-[#e7efff]',
          )}
        >
          <AppWindowIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setRouteModalSizeOverride('mini')}
          aria-label="Switch to mini view"
          title="Mini"
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#36557f] transition',
            resolvedModalSize === 'mini'
              ? 'bg-primary text-white shadow-[0_4px_10px_rgba(33,96,217,0.28)]'
              : 'hover:bg-[#e7efff]',
          )}
        >
          <Tablet className="h-3.5 w-3.5" />
        </button>
      </div>
    ) : null;
  const previousSessionCountRef = useRef(allSessions.length);
  const hasInitializedRouteSessionStatusesRef = useRef(false);
  const previousRouteSessionStatusesRef = useRef<Record<string, string>>({});
  const liveSessions = useMemo(
    () => allSessions.filter((session) => !['ended', 'failed'].includes(session.status)),
    [allSessions],
  );
  const ringingSession = useMemo(() => {
    const ringingStatuses = new Set(['incoming', 'connecting', 'ringing']);

    if (
      activeSession &&
      activeSession.direction === 'incoming' &&
      ringingStatuses.has(activeSession.status)
    ) {
      return activeSession;
    }

    return (
      liveSessions.find(
        (session) => session.direction === 'incoming' && ringingStatuses.has(session.status),
      ) || null
    );
  }, [activeSession, liveSessions]);
  const microDisplaySession = useMemo(
    () => (dialpadScreen === 'ringing' ? ringingSession || activeSession : activeSession),
    [activeSession, dialpadScreen, ringingSession],
  );

  const appendDialValue = useCallback(
    (value: string) => {
      if (!isDialpadInput(value)) return;
      if (dialpadScreen === 'idle' && isManualDialDisabled) return;

      if (dialpadScreen === 'connected' && activeSessionId) {
        sendDtmf(activeSessionId, value);
      }

      setTypedNumber((prev) => {
        if (prev.length >= MAX_DIAL_LENGTH) return prev;
        return `${prev}${value}`;
      });
    },
    [activeSessionId, dialpadScreen, isManualDialDisabled, sendDtmf],
  );

  const removeLastDialValue = useCallback(() => {
    if (isManualDialDisabled && dialpadScreen === 'idle') return;
    setTypedNumber((prev) => prev.slice(0, -1));
  }, [dialpadScreen, isManualDialDisabled]);

  const handleTypedNumberChange = useCallback(
    (value: string) => {
      if (isManualDialDisabled && dialpadScreen === 'idle') return;
      const sanitized = value.replace(/[^0-9*#+]/g, '').slice(0, MAX_DIAL_LENGTH);
      setTypedNumber(sanitized);
    },
    [dialpadScreen, isManualDialDisabled],
  );

  const handleSelectCallerId = useCallback(
    (option: CallerIdOption) => {
      setSelectedCallerId(option);
      setIsCallerIdOpen(false);
      void updateCallerIdSelection(option);
    },
    [updateCallerIdSelection],
  );

  const handleOpenMaxiTab = useCallback(
    (tab: DialpadMaxiTab) => {
      if (isMaxiRestrictedForActiveSession) return;

      if (mode === 'overlay') {
        onOverlayMaxiTabOverrideChange?.(tab);
      } else {
        setLocalMaxiTabOverride(tab);
      }

      if (mode === 'overlay') {
        setModalSize('maxi');
      } else {
        setRouteModalSizeOverride('maxi');
      }
    },
    [isMaxiRestrictedForActiveSession, mode, onOverlayMaxiTabOverrideChange, setModalSize],
  );

  const handleOpenContactInfoTab = useCallback(() => {
    handleOpenMaxiTab('contact-info');
  }, [handleOpenMaxiTab]);

  const handleMaxiTabOverrideApplied = useCallback(() => {
    if (mode === 'overlay') {
      onOverlayMaxiTabOverrideChange?.(null);
      return;
    }

    setLocalMaxiTabOverride(null);
  }, [mode, onOverlayMaxiTabOverrideChange]);

  const handleMaxiTabChange = useCallback((tab: DialpadMaxiTab) => {
    setActiveMaxiTab(tab);
  }, []);

  useEffect(() => {
    setSelectedCallerId((prevSelected) => {
      const isExistingOption = callerIdOptions.some((option) => option.id === prevSelected.id);
      if (isExistingOption) return prevSelected;
      return defaultCallerIdOption;
    });
  }, [callerIdOptions, defaultCallerIdOption]);

  useEffect(() => {
    if (mode === 'overlay' && !isDialpadOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditableTarget =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if (isEditableTarget || dialpadScreen !== 'idle' || isManualDialDisabled) return;

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        removeLastDialValue();
        return;
      }

      if (isDialpadInput(event.key)) {
        event.preventDefault();
        appendDialValue(event.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    appendDialValue,
    dialpadScreen,
    isDialpadOpen,
    isManualDialDisabled,
    mode,
    removeLastDialValue,
  ]);

  const handleCall = useCallback(() => {
    if (isManualDialDisabled && dialpadScreen === 'idle') return;
    if (!typedNumber) return;
    if (!isRegistered) return;
    if (selectedCallerId?.id === 'no-caller-id') return;
    /* Manual dials were the one path that sent no X-CallerId. Every other
       route — call-log redial, campaigns, callbacks, notifications — sets it,
       and the switch falls back to its own default number when it is absent.
       So typing a number and pressing Call presented whatever the switch chose,
       ignoring the caller ID shown right above the keypad.

       Internal extensions get an empty value, matching the callback path: a
       DID as the caller ID on an extension-to-extension call is meaningless. */
    const manualCallerId = isExtensionDialTarget(typedNumber)
      ? ''
      : selectedCallerId?.id !== 'no-caller-id'
        ? selectedCallerId?.number || ''
        : '';

    const didStartCall = makeCall(typedNumber, {
      extraHeaders: [`X-CallerId: ${manualCallerId}`],
    });
    if (!didStartCall) return;
    setDialpadScreen('connected');
  }, [
    dialpadScreen,
    isManualDialDisabled,
    isRegistered,
    makeCall,
    selectedCallerId?.id,
    typedNumber,
  ]);

  const handleHoldToggle = useCallback(() => {
    if (!activeSessionId || !activeSession) return;
    if (isHold) {
      unholdCall(activeSessionId);
      return;
    }
    holdCall(activeSessionId);
  }, [activeSession, activeSessionId, holdCall, isHold, unholdCall]);

  const handleMuteToggle = useCallback(() => {
    if (!activeSessionId || !activeSession) return;
    if (isMuted) {
      unmuteCall(activeSessionId);
      return;
    }
    muteCall(activeSessionId);
  }, [activeSession, activeSessionId, isMuted, muteCall, unmuteCall]);

  const handleHangup = useCallback(() => {
    if (activeSessionId) {
      endCall(activeSessionId);
    }
    setDialpadScreen('idle');
  }, [activeSessionId, endCall]);

  const handleSpeakerToggle = useCallback(() => {
    if (!activeSessionId || !activeSession) return;
    toggleSpeakerCall(activeSessionId);
  }, [activeSession, activeSessionId, toggleSpeakerCall]);

  const handleSwitchSession = useCallback(
    (sessionId: string) => {
      if (!sessionId) return;
      const selectedSession = sessions[sessionId];
      if (!selectedSession) return;

      setActiveSessionId(sessionId);

      if (['ended', 'failed'].includes(selectedSession.status)) {
        setDialpadScreen('ended');
        return;
      }

      if (sessionId !== activeSessionId) {
        switchActiveSession(sessionId);
      }
    },
    [activeSessionId, sessions, setActiveSessionId, switchActiveSession],
  );

  const handleAcceptIncomingCall = useCallback(
    (sessionId: string) => {
      if (!sessionId) return;
      answerCall(sessionId);
      setDialpadScreen('connected');
    },
    [answerCall],
  );

  const autoAnsweredSessionIdRef = useRef<string | null>(null);
  const autoAnswerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sessionId = ringingSession?.id;
    const autoAnsweringSetting =
      ringingSession?.campaignMetaData?.response?.dialerSetting?.auto_answering ??
      ringingSession?.campaignMetaData?.response?.auto_answering;
    const autoAnswerFromHeader = parseBooleanFlag(
      getHeaderFirstValue(ringingSession?.headers, 'x-autoanswer'),
    );
    const autoAnswerFromCampaign = parseBooleanFlag(
      autoAnsweringSetting?.enabled ?? autoAnsweringSetting?.enable,
    );
    const isAutoAnswerEnabled = autoAnswerFromHeader ?? autoAnswerFromCampaign ?? false;

    if (autoAnswerTimeoutRef.current) {
      clearTimeout(autoAnswerTimeoutRef.current);
      autoAnswerTimeoutRef.current = null;
    }

    if (!sessionId || !isAutoAnswerEnabled) return;
    if (autoAnsweredSessionIdRef.current === sessionId) return;

    autoAnswerTimeoutRef.current = setTimeout(() => {
      autoAnswerTimeoutRef.current = null;
      if (autoAnsweredSessionIdRef.current === sessionId) return;

      autoAnsweredSessionIdRef.current = sessionId;
      handleAcceptIncomingCall(sessionId);
    }, PREDICTIVE_AUTO_ANSWER_DELAY_MS);

    return () => {
      if (autoAnswerTimeoutRef.current) {
        clearTimeout(autoAnswerTimeoutRef.current);
        autoAnswerTimeoutRef.current = null;
      }
    };
  }, [handleAcceptIncomingCall, ringingSession]);

  const handleRejectIncomingCall = useCallback(
    (sessionId: string) => {
      if (!sessionId) return;
      endCall(sessionId);
    },
    [endCall],
  );

  const handleCallAgain = useCallback(() => {
    if (!isRegistered) return;

    const callbackTarget =
      activeSession?.remoteNumber && activeSession?.remoteNumber !== '-'
        ? activeSession?.remoteNumber
        : activeSession?.extension;

    if (selectedCallerId?.id === 'no-caller-id' && !callbackTarget) return;

    if (!callbackTarget) return;

    if (activeSession?.id) {
      clearSession(activeSession.id);
    }

    const selectedUserCallerId = String(selectedCallerId?.number || '').trim();
    const callerIdFromSessionDidHeader = getHeaderFirstValue(activeSession?.headers, 'x-did');
    const callbackCallerId = selectedUserCallerId || callerIdFromSessionDidHeader || '';

    const didStartCall = makeCall(callbackTarget, {
      forceRefreshContactInfo: true,
      extraHeaders: [
        `X-ContactName: `,
        `X-CallerId: ${callbackTarget?.length <= 4 ? '' : callbackCallerId}`,
      ],
    });
    if (!didStartCall) return;
    setDialpadScreen('connected');
  }, [
    activeSession?.extension,
    activeSession?.id,
    activeSession?.remoteNumber,
    clearSession,
    isRegistered,
    makeCall,
    selectedCallerId?.id,
  ]);

  const handleAddNotes = useCallback(() => {
    handleOpenMaxiTab('notes');
  }, [handleOpenMaxiTab]);

  const handleCloseDialpadFromHeader = useCallback(() => {
    // setCampaignContactCards(null);
    closeDialpad();
  }, [closeDialpad]);

  const handleCloseEndedSession = useCallback(() => {
    const isLastSession = allSessions.length <= 1;

    if (activeSession?.id) {
      clearSession(activeSession.id);
    }

    if (resolvedModalSize === 'micro' && (!activeSession?.id || isLastSession)) {
      closeDialpad();
    }
  }, [activeSession?.id, allSessions.length, clearSession, closeDialpad, resolvedModalSize]);

  useEffect(() => {
    if (!activeSession) {
      setDialpadScreen('idle');
      return;
    }

    const endedStatuses = new Set(['ended', 'failed']);
    if (endedStatuses.has(activeSession.status)) {
      setDialpadScreen('ended');
      return;
    }

    if (ringingSession) {
      setDialpadScreen('ringing');
      return;
    }

    setDialpadScreen('connected');
  }, [activeSession, ringingSession]);

  useEffect(() => {
    const previousSessionCount = previousSessionCountRef.current;
    const currentSessionCount = allSessions.length;

    if (previousSessionCount > 0 && currentSessionCount === 0) {
      setDialpadScreen('idle');
      if (!isCampaignInProgress) {
        closeDialpad();
      }
    }

    previousSessionCountRef.current = currentSessionCount;
  }, [allSessions.length, closeDialpad, isCampaignInProgress]);

  useEffect(() => {
    if (mode !== 'route' || !isPhoneRoute) return;

    const endedStatuses = new Set(['ended', 'failed']);
    const currentSessionStatuses = allSessions.reduce<Record<string, string>>((acc, session) => {
      acc[session.id] = session.status;
      return acc;
    }, {});

    if (!hasInitializedRouteSessionStatusesRef.current) {
      previousRouteSessionStatusesRef.current = currentSessionStatuses;
      hasInitializedRouteSessionStatusesRef.current = true;
      return;
    }

    const shouldRefetchCallList = allSessions.some((session) => {
      if (!endedStatuses.has(session.status)) return false;
      const previousStatus = previousRouteSessionStatusesRef.current[session.id];
      return previousStatus ? !endedStatuses.has(previousStatus) : true;
    });

    previousRouteSessionStatusesRef.current = currentSessionStatuses;

    if (!shouldRefetchCallList) return;

    void queryClient.invalidateQueries({ queryKey: ['callListing'] }).catch((error) => {
      console.error('Failed to refetch call list on /phone route session end/fail:', error);
    });
  }, [allSessions, isPhoneRoute, mode, queryClient]);

  useEffect(() => {
    if (mode !== 'route') return;
    if (hasAnySession) return;
    if (!routeModalSizeOverride) return;
    setRouteModalSizeOverride(null);
  }, [hasAnySession, mode, routeModalSizeOverride]);

  useEffect(() => {
    if (mode !== 'overlay') return;
    if (hasAnySession) return;
    if (modalSize !== 'micro') return;
    setModalSize('mini');
  }, [hasAnySession, modalSize, mode, setModalSize]);

  useEffect(() => {
    if (mode !== 'overlay') return;
    if (isMiniOnlyForActiveSession) {
      if (modalSize !== 'mini') {
        setModalSize('mini');
      }
      return;
    }
    if (!isMaxiRestrictedForActiveSession) return;
    if (modalSize !== 'maxi') return;
    setModalSize('mini');
  }, [isMaxiRestrictedForActiveSession, isMiniOnlyForActiveSession, modalSize, mode, setModalSize]);

  return (
    <>
      <DialpadTranscriptManager />
      {mode === 'overlay' ? (
        <div
          className={cn(
            'flex h-full min-h-0 w-full flex-col',
            frameViewportClass,
            buttonCursorClass,
          )}
        >
          <div
            className={cn(
              'dialpad-overlay-drag-handle flex cursor-grab touch-none select-none items-center justify-between bg-white px-1.5 py-1 active:cursor-grabbing',
            )}
          >
            {hasAnySession && !isMiniOnlyForActiveSession ? (
              <div className="inline-flex items-center gap-1 rounded-xl bg-[#f5f8ff] p-1">
                {!isMaxiRestrictedForActiveSession ? (
                  <button
                    type="button"
                    onClick={() => setModalSize('maxi')}
                    aria-label="Switch to maxi view"
                    title="Maxi"
                    className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#36557f] transition',
                      resolvedModalSize === 'maxi'
                        ? 'bg-primary text-white shadow-[0_4px_10px_rgba(33,96,217,0.28)]'
                        : 'hover:bg-[#e7efff]',
                    )}
                  >
                    <AppWindowIcon className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setModalSize('mini')}
                  aria-label="Switch to mini view"
                  title="Mini"
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#36557f] transition',
                    resolvedModalSize === 'mini'
                      ? 'bg-primary text-white shadow-[0_4px_10px_rgba(33,96,217,0.28)]'
                      : 'hover:bg-[#e7efff]',
                  )}
                >
                  <Tablet className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setModalSize('micro')}
                  aria-label="Switch to micro view"
                  title="Micro"
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#36557f] transition',
                    resolvedModalSize === 'micro'
                      ? 'bg-primary text-white shadow-[0_4px_10px_rgba(33,96,217,0.28)]'
                      : 'hover:bg-[#e7efff]',
                  )}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleCloseDialpadFromHeader}
              aria-label="Close dialpad"
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#2f4d75] transition hover:bg-[#edf3ff] hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className={cn(
              resolvedModalSize === 'micro'
                ? 'flex w-full items-start justify-center px-1 pb-1'
                : 'min-h-0 flex-1',
            )}
          >
            {resolvedModalSize === 'micro' ? (
              <DialpadMicroFrame
                session={microDisplaySession}
                dialpadScreen={dialpadScreen}
                isHold={isHold}
                isMuted={isMuted}
                onHoldToggle={handleHoldToggle}
                onMuteToggle={handleMuteToggle}
                onExpandToMaxi={() => {
                  if (!isMaxiRestrictedForActiveSession) {
                    setModalSize('maxi');
                  }
                }}
                onAcceptRinging={() =>
                  ringingSession && handleAcceptIncomingCall(ringingSession.id)
                }
                onRejectRinging={() =>
                  ringingSession && handleRejectIncomingCall(ringingSession.id)
                }
                onCallAgain={handleCallAgain}
                onCloseEndedSession={handleCloseEndedSession}
                onEndCall={handleHangup}
                showExpandButton={false}
                className="origin-top"
              />
            ) : (
              <div
                className={cn(
                  'relative h-full min-h-0 w-full items-start ',
                  contentViewportClass,
                  isMaxiMode
                    ? 'grid grid-cols-1 md:grid-cols-[minmax(0,35%)_minmax(0,65%)] xxl:grid-cols-[minmax(0,30%)_minmax(0,70%)] gap-1'
                    : 'mx-auto flex w-full max-w-[min(100vw-1rem,360px)] justify-center max-[380px]:max-w-[min(100vw-0.5rem,320px)] sm:max-w-[min(100vw-2rem,400px)] md:max-w-[min(100%,300px)] lg:max-w-[min(100%,300px)] xl:max-w-[min(100%,430px)]',
                )}
              >
                <div
                  className={cn(isMaxiMode ? 'h-full min-h-0 min-w-0' : 'h-full min-h-0 w-full ')}
                >
                  <DialpadMiniFrame
                    dialpadScreen={dialpadScreen}
                    campaignContactCards={campaignContactCards}
                    allSessions={allSessions}
                    activeSessionId={activeSessionId}
                    activeSession={activeSession}
                    ringingSession={ringingSession}
                    typedNumber={typedNumber}
                    canCall={canCall}
                    isManualDialDisabled={isManualDialDisabled}
                    isSipRegistered={isRegistered}
                    sipStatus={uaStatus}
                    callerIdOptions={callerIdOptions}
                    selectedCallerId={selectedCallerId}
                    isCallerIdOpen={isCallerIdOpen}
                    isHold={isHold}
                    isMuted={isMuted}
                    isSpeakerOn={isSpeakerOn}
                    onSwitchSession={handleSwitchSession}
                    onToggleCallerId={() => setIsCallerIdOpen((prev) => !prev)}
                    onSelectCallerId={handleSelectCallerId}
                    onOpenGuide={() => setIsGuideOpen(true)}
                    onContactLinkClick={handleOpenContactInfoTab}
                    onTypedNumberChange={handleTypedNumberChange}
                    onBackspace={removeLastDialValue}
                    onPressKey={appendDialValue}
                    onCall={handleCall}
                    onAcceptRinging={() =>
                      ringingSession && handleAcceptIncomingCall(ringingSession.id)
                    }
                    onRejectRinging={() =>
                      ringingSession && handleRejectIncomingCall(ringingSession.id)
                    }
                    onAddNotes={handleAddNotes}
                    onCallAgain={handleCallAgain}
                    onCloseEndedSession={handleCloseEndedSession}
                    onHoldToggle={handleHoldToggle}
                    onMuteToggle={handleMuteToggle}
                    onSpeakerToggle={handleSpeakerToggle}
                    onEndCall={handleHangup}
                    onOpenMaxiTab={handleOpenMaxiTab}
                    className={
                      isMaxiMode
                        ? 'h-full w-full max-w-none px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3'
                        : 'h-full'
                    }
                    contentClassName="h-full min-h-0"
                  />
                </div>

                {isMaxiMode ? (
                  <div className="h-full min-h-0 min-w-0">
                    <DialpadMaxiSidePanel
                      sessions={allSessions}
                      activeSessionId={activeSessionId}
                      typedNumber={typedNumber}
                      activeTabOverride={maxiTabOverride}
                      onActiveTabOverrideApplied={handleMaxiTabOverrideApplied}
                      onActiveTabChange={handleMaxiTabChange}
                      className="h-full w-full max-w-none"
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'flex h-full min-h-0 w-full flex-col',
            frameViewportClass,
            buttonCursorClass,
          )}
        >
          <div className="min-h-0 flex-1">
            <div
              className={cn(
                'relative h-full min-h-0 w-full items-start ',
                contentViewportClass,
                isMaxiMode
                  ? 'grid grid-cols-1 md:grid-cols-[minmax(0,35%)_minmax(0,65%)] xxl:grid-cols-[minmax(0,30%)_minmax(0,70%)] gap-1'
                  : 'mx-auto flex w-full max-w-[min(100vw-1rem,360px)] justify-center max-[380px]:max-w-[min(100vw-0.5rem,320px)] sm:max-w-[min(100vw-2rem,400px)] md:max-w-[min(100%,300px)] lg:max-w-[min(100%,300px)] xl:max-w-[min(100%,430px)]',
              )}
            >
              <div className={cn(isMaxiMode ? 'h-full min-h-0 min-w-0' : 'h-full min-h-0 w-full')}>
                <DialpadMiniFrame
                  dialpadScreen={dialpadScreen}
                  campaignContactCards={campaignContactCards}
                  allSessions={allSessions}
                  activeSessionId={activeSessionId}
                  activeSession={activeSession}
                  ringingSession={ringingSession}
                  typedNumber={typedNumber}
                  canCall={canCall}
                  isManualDialDisabled={isManualDialDisabled}
                  isSipRegistered={isRegistered}
                  sipStatus={uaStatus}
                  callerIdOptions={callerIdOptions}
                  selectedCallerId={selectedCallerId}
                  isCallerIdOpen={isCallerIdOpen}
                  isHold={isHold}
                  isMuted={isMuted}
                  isSpeakerOn={isSpeakerOn}
                  onSwitchSession={handleSwitchSession}
                  onToggleCallerId={() => setIsCallerIdOpen((prev) => !prev)}
                  onSelectCallerId={handleSelectCallerId}
                  onOpenGuide={() => setIsGuideOpen(true)}
                  onContactLinkClick={handleOpenContactInfoTab}
                  onTypedNumberChange={handleTypedNumberChange}
                  onBackspace={removeLastDialValue}
                  onPressKey={appendDialValue}
                  onCall={handleCall}
                  onAcceptRinging={() =>
                    ringingSession && handleAcceptIncomingCall(ringingSession.id)
                  }
                  onRejectRinging={() =>
                    ringingSession && handleRejectIncomingCall(ringingSession.id)
                  }
                  onAddNotes={handleAddNotes}
                  onCallAgain={handleCallAgain}
                  onCloseEndedSession={handleCloseEndedSession}
                  onHoldToggle={handleHoldToggle}
                  onMuteToggle={handleMuteToggle}
                  onSpeakerToggle={handleSpeakerToggle}
                  onEndCall={handleHangup}
                  onOpenMaxiTab={handleOpenMaxiTab}
                  topAccessory={routeModeSizeSwitcher}
                  className={
                    isMaxiMode
                      ? 'h-full w-full max-w-none px-3 pb-3 pt-3 sm:px-4 lg:px-2 xxl:px-4 sm:pb-4 lg:pt-3'
                      : 'h-full'
                  }
                  contentClassName="h-full min-h-0"
                />
              </div>

              {isMaxiMode ? (
                <div className="h-full min-h-0 min-w-0">
                  <DialpadMaxiSidePanel
                    sessions={allSessions}
                    activeSessionId={activeSessionId}
                    typedNumber={typedNumber}
                    activeTabOverride={maxiTabOverride}
                    onActiveTabOverrideApplied={handleMaxiTabOverrideApplied}
                    onActiveTabChange={handleMaxiTabChange}
                    className="h-full w-full max-w-none"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <DialpadGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </>
  );
};

export default Dialpad;

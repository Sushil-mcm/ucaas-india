import type { DialpadSession } from '@/context/dialpad-context';
import { cn } from '@/lib/utils';
import { AlertCircle, Headphones } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DialpadMaxiTab } from './dialpad-maxi-side-panel';
import { KEYPAD_KEYS } from '../constants';
import type { CallerIdOption } from '../types';
import DialpadCallButton from './dialpad-call-button';
import DialpadAiConversationOverview from './dialpad-ai-conversation-overview';
import DialpadCallerId from './dialpad-caller-id';
import DialpadConnectedScreen from './dialpad-connected-screen';
import DialpadCampaignOverview from './dialpad-campaign-overview';
import DialpadContactLink from './dialpad-contact-link';
import DialpadEndedScreen from './dialpad-ended-screen';
import DialpadKeypad from './dialpad-keypad';
import DialpadNumberDisplay from './dialpad-number-display';
import DialpadRingingScreen from './dialpad-ringing-screen';
import DialpadSessionSwitcher from './dialpad-session-switcher';
import { getMonitoringCallLabel } from '../session-display';

type DialpadScreenState = 'idle' | 'ringing' | 'connected' | 'ended';

type DialpadMiniFrameProps = {
  dialpadScreen: DialpadScreenState;
  campaignContactCards:
    | {
        campaignDetail?: {
          campaignName?: string;
          campaignType?: string;
        };
        requestStatus?: string;
        leadStatus?: string;
      }[]
    | null;
  allSessions: DialpadSession[];
  activeSessionId: string | null;
  activeSession: DialpadSession | null;
  ringingSession: DialpadSession | null;
  typedNumber: string;
  canCall: boolean;
  isManualDialDisabled?: boolean;
  isSipRegistered: boolean;
  sipStatus: string;
  /* Widened for shared group numbers, which carry a source and group name.
     Plain options still satisfy it, so existing callers are unaffected. */
  callerIdOptions: Array<CallerIdOption & { source?: string; groupName?: string }>;
  selectedCallerId: CallerIdOption;
  isCallerIdOpen: boolean;
  isHold: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  onSwitchSession: (sessionId: string) => void;
  onToggleCallerId: () => void;
  onSelectCallerId: (option: CallerIdOption) => void;
  onOpenGuide: () => void;
  onContactLinkClick: () => void;
  onTypedNumberChange: (value: string) => void;
  onBackspace: () => void;
  onPressKey: (value: string) => void;
  onCall: () => void;
  onAcceptRinging: () => void;
  onRejectRinging: () => void;
  onAddNotes: () => void;
  onCallAgain: () => void;
  onCloseEndedSession: () => void;
  onHoldToggle: () => void;
  onMuteToggle: () => void;
  onSpeakerToggle: () => void;
  onEndCall: () => void;
  onOpenMaxiTab: (tab: DialpadMaxiTab) => void;
  /* Only the full-page campaign dialer sets this. Everything else keeps the
     floating dialer exactly as it is. */
  fullPage?: boolean;
  topAccessory?: ReactNode;
  className?: string;
  contentClassName?: string;
};

const DialpadMiniFrame = ({
  dialpadScreen,
  campaignContactCards,
  allSessions,
  activeSessionId,
  activeSession,
  ringingSession,
  typedNumber,
  canCall,
  isManualDialDisabled = false,
  isSipRegistered,
  sipStatus,
  callerIdOptions,
  selectedCallerId,
  isCallerIdOpen,
  isHold,
  isMuted,
  isSpeakerOn,
  onSwitchSession,
  onToggleCallerId,
  onSelectCallerId,
  onOpenGuide,
  onContactLinkClick,
  onTypedNumberChange,
  onBackspace,
  onPressKey,
  onCall,
  onAcceptRinging,
  onRejectRinging,
  onAddNotes,
  onCallAgain,
  onCloseEndedSession,
  onHoldToggle,
  onMuteToggle,
  onSpeakerToggle,
  onEndCall,
  onOpenMaxiTab,
  fullPage = false,
  topAccessory,
  className,
  contentClassName,
}: DialpadMiniFrameProps) => {
  const isCallConnected = ['accepted', 'confirmed'].includes(
    String(activeSession?.status || '').toLowerCase(),
  );
  const contactDialTarget = String(
    activeSession?.remoteNumber || activeSession?.extension || '',
  ).trim();
  const contactDialTargetDigitsCount = contactDialTarget.replace(/\D/g, '').length;
  const hasSessionContactId = Boolean(String(activeSession?.contactInfo?._id || '').trim());
  const sessionContactInfo = activeSession?.contactInfo;
  const firstName =
    sessionContactInfo?.first_name ||
    sessionContactInfo?.firstName ||
    sessionContactInfo?.name?.first;
  const lastName =
    sessionContactInfo?.last_name || sessionContactInfo?.lastName || sessionContactInfo?.name?.last;
  const mergedName = `${firstName || ''} ${lastName || ''}`.trim();
  const directName =
    typeof sessionContactInfo?.name === 'string' ? sessionContactInfo.name.trim() : '';
  const monitoringCallLabel = getMonitoringCallLabel(contactDialTarget);
  const isConferenceSession = Boolean(activeSession?.conferenceData);
  const resolvedContactName = isConferenceSession
    ? 'Conference Call'
    : monitoringCallLabel || mergedName || directName || 'Unknown Contact';
  const isUnknownContact = resolvedContactName === 'Unknown Contact';
  const shouldShowDialpadContactLink =
    isCallConnected && contactDialTargetDigitsCount > 4 && !hasSessionContactId && isUnknownContact;
  const idleCanCall = canCall && !isManualDialDisabled;
  /* Full-page campaign dialer, sitting idle, with manual dialling switched
     off — the one case where the keypad cannot do anything at all. */
  const isCampaignStandby = fullPage && isManualDialDisabled;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[30px] border border-white/80 bg-white  sm:rounded-[32px]',
        'xs:p-2 xl:p-4',
        className,
      )}
    >
      {topAccessory ? <div className="mb-2 flex items-center">{topAccessory}</div> : null}

      {allSessions.length > 1 ? (
        <DialpadSessionSwitcher
          sessions={allSessions}
          activeSessionId={activeSessionId ?? allSessions[0]?.id ?? null}
          onSwitchSession={onSwitchSession}
        />
      ) : null}

      <div
        className={cn(
          ' flex min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y w-full',
          contentClassName,
        )}
      >
        {dialpadScreen === 'idle' ? (
          <div className="flex h-full min-h-0 w-full flex-col">
            {/* <DialpadBalance /> */}

            <DialpadCallerId
              options={callerIdOptions}
              selectedOption={selectedCallerId}
              isOpen={isCallerIdOpen}
              onToggle={onToggleCallerId}
              onSelect={onSelectCallerId}
              onOpenGuide={onOpenGuide}
            />

            {!isSipRegistered ? (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-[#ffd8b4] bg-[#fff8ef] px-2.5 py-2 text-[11px] font-medium text-[#9a4f00] sm:text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                SIP not registered ({sipStatus}). Please wait before calling.
              </div>
            ) : null}

            {/* A campaign agent never dials: the campaign hands them each
                contact, and every key here is already inert
                (isManualDialDisabled). On the full page that left a keypad
                filling half the column that could not be pressed — furniture
                that reads as broken. Say what is actually happening instead.
                The floating dialer keeps its keypad, and so does the full page
                the moment manual dialling is allowed again. */}
            {isCampaignStandby ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-ucass-active-bg bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ucass-active-bg text-[#1f4f8f]">
                  <Headphones className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-[13px] font-semibold text-[#183960]">Standing by</p>
                  <p className="text-[11.5px] leading-relaxed text-[#5d7394]">
                    The campaign brings you each contact, so there is nothing to dial by
                    hand. The next one appears here as soon as it is ready.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <DialpadNumberDisplay
                  typedNumber={typedNumber}
                  onTypedNumberChange={onTypedNumberChange}
                  onBackspace={onBackspace}
                  onEnterPress={idleCanCall ? onCall : undefined}
                  disabled={isManualDialDisabled}
                />

                <div className="lg:my-auto space-y-3 sm:space-y-4 xs:min-h-[300px] xs:mt-18">
                  <DialpadKeypad
                    keys={KEYPAD_KEYS}
                    onPressKey={onPressKey}
                    wide={fullPage}
                    disabled={isManualDialDisabled}
                  />
                  <DialpadCallButton canCall={idleCanCall} onCall={onCall} />
                </div>
              </>
            )}
          </div>
        ) : dialpadScreen === 'ringing' ? (
          <DialpadRingingScreen
            session={ringingSession}
            onAccept={onAcceptRinging}
            onReject={onRejectRinging}
          />
        ) : dialpadScreen === 'ended' ? (
          <DialpadEndedScreen
            session={activeSession}
            onAddNotes={onAddNotes}
            onCallAgain={onCallAgain}
            onClose={onCloseEndedSession}
          />
        ) : (
          <div className="flex h-full min-h-0 w-full flex-col">
            {shouldShowDialpadContactLink ? (
              <DialpadContactLink onClick={onContactLinkClick} />
            ) : null}
            <DialpadConnectedScreen
              session={activeSession}
              onHoldToggle={onHoldToggle}
              onMuteToggle={onMuteToggle}
              onSpeakerToggle={onSpeakerToggle}
              onEndCall={onEndCall}
              isHold={isHold}
              isMuted={isMuted}
              isSpeakerOn={isSpeakerOn}
              onOpenMaxiTab={onOpenMaxiTab}
            />
          </div>
        )}
      </div>
      {/* Both of these sit below the scrolling area rather than inside it, so
          they must not be squeezed by it either — without shrink-0 a long lead
          card is compressed instead of the call area giving up its room. */}
      <div className="shrink-0">
        <DialpadCampaignOverview
          campaignContactCards={campaignContactCards}
          dialpadScreen={dialpadScreen}
          fullPage={fullPage}
        />
        <DialpadAiConversationOverview
          session={activeSession}
          dialpadScreen={dialpadScreen}
          fullPage={fullPage}
        />
      </div>
    </div>
  );
};

export default DialpadMiniFrame;

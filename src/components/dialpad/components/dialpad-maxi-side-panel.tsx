import type { DialpadSession } from '@/context/dialpad-context';
import { cn } from '@/lib/utils';
import { isExtensionDialTarget } from '@/lib/extension-utility';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useDialpad } from '@/hooks/use-dialpad';
import { useUser } from '@/hooks/use-user';
import DialpadCampaignSkipPanel from './dialpad-campaign-skip-panel';
import { ContactRound, FileText, History, ListChecks, NotebookPen, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import DialpadMaxiScriptSidebar from './dialpad-maxi-script-sidebar';
import DialpadMaxiTabAiAssist from './dialpad-maxi-tab-ai-assist';
import DialpadMaxiTabCallHistory from './dialpad-maxi-tab-call-history';
import DialpadMaxiTabContactInfo from './dialpad-maxi-tab-contact-info';
import DialpadMaxiTabDispositions from './dialpad-maxi-tab-dispositions';
import DialpadMaxiTabNotes from './dialpad-maxi-tab-notes';
import DialpadMaxiTabTranscript from './dialpad-maxi-tab-transcript';

type DialpadMaxiSidePanelProps = {
  sessions: DialpadSession[];
  activeSessionId: string | null;
  typedNumber: string;
  activeTabOverride?: DialpadMaxiTab | null;
  onActiveTabOverrideApplied?: () => void;
  onActiveTabChange?: (tab: DialpadMaxiTab) => void;
  /* The full-page campaign dialer borrows the console's flat look: no floating
     card, a tab strip rather than a pill bar. Everywhere else keeps the box. */
  fullPage?: boolean;
  className?: string;
};

export type DialpadMaxiTab =
  'call-history' | 'transcript' | 'notes' | 'ai-assist' | 'contact-info' | 'dispositions';

type DialpadTabButtonProps = {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  compact?: boolean;
  underline?: boolean;
};

type DialpadTabConfig = {
  key: DialpadMaxiTab;
  title: string;
  icon: ReactNode;
  component: ReactNode;
  access: boolean;
};

const getHeaderFirstValueFromSessionHeaders = (
  headers: DialpadSession['headers'] | undefined,
  headerName: string,
): string => {
  if (!headers) return '';
  const normalizedHeaderName = headerName.trim().toLowerCase();
  const matchingHeaderEntry = Object.entries(headers).find(
    ([name]) => name.trim().toLowerCase() === normalizedHeaderName,
  );
  if (!matchingHeaderEntry) return '';
  const [, values] = matchingHeaderEntry;
  if (!Array.isArray(values) || values.length === 0) return '';
  return String(values[0] || '').trim();
};

const DialpadTabButton = ({
  icon,
  label,
  isActive,
  onClick,
  compact = false,
  underline = false,
}: DialpadTabButtonProps) => {
  /* The console's tab strip: plain text on white with the active one
     underlined. A row of filled pills inside a filled bar reads as five
     buttons competing for a press; an underline says "you are here" and
     leaves the panel below as the thing being looked at. */
  if (underline) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-3 text-[12.5px] font-bold transition ${
          isActive
            ? 'border-primary text-primary'
            : 'border-transparent text-[#5f7392] hover:text-[#17385e]'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-row lg:whitespace-nowrap w-full max-w-full items-center justify-center rounded-xl font-semibold transition ${
        compact
          ? 'gap-1 px-1.5 py-1 text-[10px] sm:gap-1 sm:px-2 sm:py-1.5 sm:text-[11px] md:gap-1.5 md:px-2.5 md:text-xs'
          : 'gap-1 px-2 py-1.5 text-[11px] max-[380px]:px-1.5 max-[380px]:text-[10px] sm:gap-1.5 sm:px-2.5 sm:py-2 sm:text-xs md:gap-2 md:px-3 md:text-sm'
      } ${
        isActive
          ? 'bg-[#f3f7ff] text-primary'
          : 'bg-transparent text-[#5f7392] hover:bg-[#f3f7ff] hover:primary'
      }`}
    >
      {icon}
      {label}
    </button>
  );
};

const DialpadMaxiSidePanel = ({
  sessions,
  activeSessionId,
  typedNumber,
  activeTabOverride = null,
  onActiveTabOverrideApplied,
  onActiveTabChange,
  fullPage = false,
  className,
}: DialpadMaxiSidePanelProps) => {
  const { features } = useCompanyFeatures();
  /* The agent reading the script, and the company they are reading it for. */
  const { user } = useUser();
  /* Read so the tab order can put the lead first on a campaign, and so the
     Contact Info tab has something to show in preview - where the agent is
     looking at a lead but no call has started yet. */
  const { activeCampaign, campaignContactCards, campaignSkipRequest } = useDialpad();
  const [activeTab, setActiveTab] = useState<DialpadMaxiTab>('call-history');
  const dispositionAutoFocusKeyRef = useRef<string | null>(null);

  const sortedSessions = useMemo(
    () => [...sessions].sort((left, right) => right.startedAt - left.startedAt),
    [sessions],
  );

  const activeSession = useMemo(
    () =>
      sortedSessions.find((session) => session.id === activeSessionId) || sortedSessions[0] || null,
    [activeSessionId, sortedSessions],
  );
  console.log('🚀 ~ DialpadMaxiSidePanel ~ activeSession:', activeSession);
  const sessionDialTarget = String(
    activeSession?.remoteNumber || activeSession?.extension || '',
  ).trim();
  const isExtensionCallSession = isExtensionDialTarget(sessionDialTarget);
  const isEndedOrFailedSession = ['ended', 'failed'].includes(
    String(activeSession?.status || '').toLowerCase(),
  );
  const isRejectedCause = String(activeSession?.cause || '')
    .toLowerCase()
    .includes('rejected');
  const liveForwardType = String(activeSession?.liveCallData?.forward_type || '')
    .trim()
    .toUpperCase();
  const liveCampaignType = String(activeSession?.liveCallData?.campaign_type || '')
    .trim()
    .toUpperCase();
  const queueIdFromSession = String(activeSession?.queueMetaData?.id || '').trim();
  const campaignIdFromSession = String(activeSession?.campaignMetaData?.id || '').trim();
  const forwardTypeFromHeader = getHeaderFirstValueFromSessionHeaders(
    activeSession?.headers,
    'x-forwardtype',
  )
    .trim()
    .toUpperCase();
  const shouldForceCampaignFromHeader =
    Boolean(queueIdFromSession && campaignIdFromSession) && forwardTypeFromHeader === 'CAMPAIGN';
  const isCampaignCallSession = shouldForceCampaignFromHeader
    ? true
    : Boolean(campaignIdFromSession || liveForwardType === 'CAMPAIGN' || liveCampaignType);
  const isOutgoingNoAnswerCampaignSession = Boolean(
    isCampaignCallSession &&
    String(activeSession?.direction || '').toLowerCase() === 'outgoing' &&
    !activeSession?.hasAnswered &&
    isEndedOrFailedSession,
  );
  const hasDispositionMetadata = Boolean(
    activeSession?.queueMetaData || activeSession?.campaignMetaData,
  );
  const campaignScriptId = String(
    activeSession?.campaignMetaData?.response?.script ||
      activeSession?.campaignMetaData?.script ||
      '',
  ).trim();
  const queueScriptId = String(activeSession?.queueMetaData?.response?.script || '').trim();
  const fallbackScriptId = String(
    activeSession?.liveCallData?.scriptId || activeSession?.liveCallData?.script || '',
  ).trim();
  const scriptId = shouldForceCampaignFromHeader
    ? campaignScriptId || queueScriptId || fallbackScriptId
    : queueScriptId || campaignScriptId || fallbackScriptId;
  const hasScript = Boolean(scriptId);

  /* What this call can fill a script's placeholders with. The lead's name and
     number on a campaign call, the caller's number on a queue call, and the
     agent and company either way. */
  const scriptCallValues = useMemo(() => {
    const card: any = Array.isArray(campaignContactCards) ? campaignContactCards[0] : null;
    const campaign: any = activeSession?.campaignMetaData?.response || activeSession?.campaignMetaData;
    const queue: any = activeSession?.queueMetaData?.response || activeSession?.queueMetaData;
    return {
      customerName: card?.contactName || (activeSession as any)?.remoteName || '',
      customerNumber: card?.contactNumber || activeSession?.remoteNumber || '',
      customerEmail: card?.contactEmail || '',
      agentName: [user?.user_info?.first_name, user?.user_info?.last_name].filter(Boolean).join(' '),
      agentExtension: user?.user_info?.extension || '',
      agentEmail: user?.user_info?.email || '',
      companyName: user?.company_info?.company_name || user?.company_info?.name || '',
      campaignName: campaign?.name || card?.campaignDetail?.campaignName || activeCampaign?.name || '',
      queueName: queue?.name || '',
    };
  }, [activeSession, campaignContactCards, activeCampaign, user]);
  const advanceCallManagementAccess =
    features?.plan_features?.advance_call_management?.access || {};
  const canAccessTranscription = Boolean(advanceCallManagementAccess.TRANSCRIPTION);
  // const canAccessAiAssist = false;
  const canAccessAiAssist = Boolean(features?.plan_features?.ai?.IS_SHOW);

  const tabConfigs = useMemo<DialpadTabConfig[]>(
    () => [
      {
        key: 'call-history',
        title: 'Call History',
        icon: <History className="h-4 w-4" />,
        component: <DialpadMaxiTabCallHistory activeSession={activeSession} />,
        access: true,
      },
      {
        key: 'transcript',
        title: 'Transcript',
        icon: <FileText className="h-4 w-4" />,
        component: <DialpadMaxiTabTranscript activeSession={activeSession} />,
        access: !activeSession?.conferenceData && canAccessTranscription && !isExtensionCallSession,
      },
      {
        key: 'notes',
        title: 'Notes',
        icon: <NotebookPen className="h-4 w-4" />,
        component: <DialpadMaxiTabNotes activeSession={activeSession} />,
        access: !isExtensionCallSession,
      },
      {
        key: 'ai-assist',
        title: 'AI Assist',
        icon: <Sparkles className="h-4 w-4" />,
        component: <DialpadMaxiTabAiAssist activeSession={activeSession} />,
        access: canAccessAiAssist,
      },
      {
        key: 'contact-info',
        title: 'Contact Info',
        icon: <ContactRound className="h-4 w-4" />,
        component: (
          <DialpadMaxiTabContactInfo activeSession={activeSession} typedNumber={typedNumber} />
        ),
        access: true,
      },
      {
        key: 'dispositions',
        title: 'Dispositions',
        icon: <ListChecks className="h-4 w-4" />,
        component: <DialpadMaxiTabDispositions activeSession={activeSession} />,
        access:
          hasDispositionMetadata &&
          isEndedOrFailedSession &&
          !isRejectedCause &&
          !isOutgoingNoAnswerCampaignSession,
      },
    ],
    [
      activeSession,
      activeSessionId,
      canAccessAiAssist,
      canAccessTranscription,
      hasDispositionMetadata,
      isExtensionCallSession,
      isOutgoingNoAnswerCampaignSession,
      isEndedOrFailedSession,
      isRejectedCause,
      sortedSessions,
      typedNumber,
    ],
  );

  /**
   * On a campaign, the lead comes first.
   *
   * Contact Info sat last, behind Call History, Transcript, Notes and AI
   * Assist. On an ordinary call that is the right order - you know who you
   * rang. On a campaign it is backwards: the whole job in preview is to read
   * who you are about to call BEFORE you press Call, and the agent had to hunt
   * to the end of the row to find it, on a screen that gives them a countdown
   * to decide in.
   *
   * Only reordered for a campaign. Everywhere else the order is untouched, so
   * nobody's muscle memory on the normal dialpad is disturbed.
   */
  const isCampaignContext = Boolean(
    activeCampaign || activeSession?.campaignMetaData || campaignContactCards?.length,
  );

  const accessibleTabs = useMemo(() => {
    const allowed = tabConfigs.filter((tabConfig) => tabConfig.access);
    if (!isCampaignContext) return allowed;
    const contactInfo = allowed.filter((tabConfig) => tabConfig.key === 'contact-info');
    if (!contactInfo.length) return allowed;
    return [...contactInfo, ...allowed.filter((tabConfig) => tabConfig.key !== 'contact-info')];
  }, [tabConfigs, isCampaignContext]);

  /* Being first in the row is not the same as being open. The panel starts on
     Call History, so on a campaign the agent still landed on an empty history
     with the lead one click away. Opening the lead is done once per campaign,
     keyed on which campaign it is, so switching to Notes or the script is not
     undone on the next render - and leaving and rejoining primes it again. */
  const campaignTabPrimedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isCampaignContext) {
      campaignTabPrimedRef.current = null;
      return;
    }
    const key = String(activeCampaign?._id || 'campaign');
    if (campaignTabPrimedRef.current === key) return;
    if (!accessibleTabs.some((tabConfig) => tabConfig.key === 'contact-info')) return;
    campaignTabPrimedRef.current = key;
    setActiveTab('contact-info');
  }, [isCampaignContext, activeCampaign?._id, accessibleTabs]);

  const shouldAutoFocusDispositions =
    hasDispositionMetadata &&
    isEndedOrFailedSession &&
    !isRejectedCause &&
    !isOutgoingNoAnswerCampaignSession;
  const dispositionAutoFocusKey = useMemo(() => {
    if (!shouldAutoFocusDispositions || !activeSession?.id) return null;
    return `${activeSession.id}:${activeSession.endedAt || activeSession.startedAt || ''}`;
  }, [
    activeSession?.endedAt,
    activeSession?.id,
    activeSession?.startedAt,
    shouldAutoFocusDispositions,
    isOutgoingNoAnswerCampaignSession,
    isRejectedCause,
  ]);

  useEffect(() => {
    if (!dispositionAutoFocusKey) return;
    if (dispositionAutoFocusKeyRef.current === dispositionAutoFocusKey) return;
    if (!shouldAutoFocusDispositions) return;
    if (!accessibleTabs.some((tabConfig) => tabConfig.key === 'dispositions')) return;

    dispositionAutoFocusKeyRef.current = dispositionAutoFocusKey;
    setActiveTab('dispositions');
  }, [accessibleTabs, dispositionAutoFocusKey, shouldAutoFocusDispositions]);

  useEffect(() => {
    if (!activeTabOverride) return;
    if (!accessibleTabs.some((tabConfig) => tabConfig.key === activeTabOverride)) return;

    setActiveTab(activeTabOverride);
    onActiveTabOverrideApplied?.();
  }, [accessibleTabs, activeTabOverride, onActiveTabOverrideApplied]);

  useEffect(() => {
    if (accessibleTabs.some((tabConfig) => tabConfig.key === activeTab)) return;
    setActiveTab(accessibleTabs[0]?.key || 'call-history');
  }, [accessibleTabs, activeTab]);

  useEffect(() => {
    onActiveTabChange?.(activeTab);
  }, [activeTab, onActiveTabChange]);

  const activeTabConfig = useMemo(
    () =>
      accessibleTabs.find((tabConfig) => tabConfig.key === activeTab) || accessibleTabs[0] || null,
    [accessibleTabs, activeTab],
  );

  /* A skip in progress takes the whole panel. It is a question the agent has to
     answer before the lead moves, so leaving the tabs reachable underneath would
     invite them to wander off mid-answer and lose what they had typed. */
  if (campaignSkipRequest) {
    return (
      <div
        className={cn(
          'flex h-full min-h-0 w-full flex-col bg-white',
          fullPage
            ? 'rounded-2xl border border-ucass-active-bg'
            : 'rounded-[32px] border border-white/80',
          className,
        )}
      >
        <DialpadCampaignSkipPanel request={campaignSkipRequest} />
      </div>
    );
  }

  return (
    <div
      /* `overflowX: auto` on the root put a scrollbar down the side of the
         whole panel - visible beside the tab strip on a full-page layout that
         has nothing to scroll. The narrow floating panel still needs it. */
      style={fullPage ? undefined : { overflowX: 'auto' }}
      className={cn(
        'flex h-full min-h-0 w-full flex-col bg-white',
        fullPage
          ? 'rounded-2xl border border-ucass-active-bg px-4 pb-4 pt-0'
          : 'rounded-[32px] border border-white/80 px-3 pb-3 pt-2.5 max-[380px]:px-2.5 max-[380px]:pb-2.5 max-[380px]:pt-2 sm:px-4 sm:pb-4 sm:pt-3 md:px-2 md:pb-3 md:pt-3 xxl:p-4',
        className,
      )}
    >
      <div className="min-h-0 flex flex-1 gap-2">
        {hasScript ? (
          <div className="min-h-0 w-[44%] min-w-[220px] max-w-[320px]">
            <DialpadMaxiScriptSidebar
              scriptId={scriptId}
              sessionId={activeSession?.id}
              call={scriptCallValues}
              disposition={activeSession?.dispositionName || null}
            />
          </div>
        ) : null}

        <div className="min-h-0 flex flex-1 flex-col">
          <div
            className={cn(
              'flex items-center',
              fullPage
                ? 'no-scrollbar mb-3 gap-1 overflow-x-auto border-b border-ucass-active-bg'
                : cn(
                    'mb-2.5 rounded-2xl border border-ucass-active-bg bg-ucass-active-bg p-1 max-[380px]:mb-2 sm:mb-3',
                    hasScript
                      ? 'gap-1 max-[380px]:gap-0.5 sm:gap-1'
                      : 'gap-1.5 max-[380px]:gap-1 sm:gap-1',
                  ),
            )}
          >
            {accessibleTabs.map((tabConfig) => (
              <DialpadTabButton
                key={tabConfig.key}
                icon={tabConfig.icon}
                label={tabConfig.title}
                isActive={activeTab === tabConfig.key}
                onClick={() => setActiveTab(tabConfig.key)}
                compact={hasScript}
                underline={fullPage}
              />
            ))}
          </div>

          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col',
              fullPage ? 'no-scrollbar overflow-y-auto' : 'pr-1',
            )}
          >
            {activeTabConfig?.component}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialpadMaxiSidePanel;

import { SearchLine } from '@/assets/icons';
import { isServerDialed } from '@/lib/campaign-dial-mode';
import {
  CAMPAIGN_RING_STORAGE_KEY,
  clearCampaignRingContact,
  describeCampaignJoin,
  readCampaignRingContact,
  readCampaignRingRecord,
  writeCampaignRingContact,
} from '@/lib/campaign-join-state';
import {
  CAMPAIGN_TABS_STORAGE_KEY,
  autoJoinDecision,
  checkHeldRingRecord,
  clearCampaignLeftMarks,
  dropRingTab,
  electRingOwner,
  forgetCampaignLeft,
  hasCampaignLeft,
  isCampaignMember,
  makeTabId,
  pickAutoJoinCampaign,
  publishRingTab,
  readRingTabs,
  rememberCampaignLeft,
  shouldDropHeldRing,
  splitAssignedCampaigns,
  withoutCampaignIds,
} from '@/lib/campaign-auto-join';
import { describeCampaignActivity } from '@/lib/campaign-live-activity';
import { emitWithAck } from '@/lib/socket-ack';
import { Icon } from '@/assets/icons/icon';
import Loader from '@/components/custom/loader';
import type { DialpadSession } from '@/context/dialpad-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useDebounce from '@/hooks/use-debounce';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useDialpad } from '@/hooks/use-dialpad';
import { useAgentDuty } from '@/hooks/use-agent-duty';
import DialpadWorkList from '@/components/dialpad/components/dialpad-work-list';
import CampaignLeaveDialog from './campaign-leave-dialog';
import { decideRingClaim } from '@/lib/ring-claim';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';
import { CAMPAIGN_STATUS_CONST, CAMPAIGN_TYPE_NAME } from '@/pages/auto-dialer/campaign/const';
import CallQueueCard from '@/pages/dashboard/call-dashboard/Call-queue-content/call-queue-card';
import NotFound from '@/assets/images/not-found-img.svg';
import {
  campaignAnalytics,
  /* Aliased: `campaignList` is already the name of this screen's running list. */
  campaignList as fetchCompanyCampaigns,
  getCallQueueInvolvements,
  getRunningCampaigns,
  makeCallQueueAvailable,
} from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Info, Loader2, Mic, RefreshCcw, X } from 'lucide-react';
import './workspace-polish.css';

type TabKey = 'running-campaign' | 'assigned-queues';

const getCampaignPayload = (response: any) =>
  Array.isArray(response)
    ? response?.[0]?.response || response?.[0]
    : response?.response || response;

const getCampaignStatus = (response: any) => {
  const payload = getCampaignPayload(response);
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.rows)
      ? payload.rows
      : payload
        ? [payload]
        : [];

  return String(
    payload?.campaignStatus ||
      items.find((item: any) => item?.campaignStatus)?.campaignStatus ||
      response?.campaignStatus ||
      '',
  )
    .trim()
    .toUpperCase();
};

const getCampaignRows = (response: any) => {
  const payload = getCampaignPayload(response);
  return Array.isArray(payload?.rows) ? payload.rows : [];
};

const getRandomCallerId = (campaign: any) => {
  if (!Array.isArray(campaign?.callerId) || campaign.callerId.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * campaign.callerId.length);
  return campaign.callerId[randomIndex];
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

const getSessionCampaignId = (session: DialpadSession | null | undefined): string => {
  if (!session) return '';

  const liveForwardType = String(session?.liveCallData?.forward_type || '')
    .trim()
    .toUpperCase();
  const headerCampaignId = getHeaderFirstValueFromSessionHeaders(
    session?.headers,
    'x-campaignuuid',
  );
  const liveCampaignId = String(
    session?.liveCallData?.campaign_uuid ||
      (liveForwardType === 'CAMPAIGN' ? session?.liveCallData?.forward_value : '') ||
      '',
  ).trim();

  return String(session?.campaignMetaData?.id || liveCampaignId || headerCampaignId || '').trim();
};

const MyCampaignListStandalone = () => {
  const { socketEventsManager } = useSocketEvents();
  const {
    setCampaignContactCards,
    openDialpad,
    joinedCampaignId,
    activeCampaign,
    setJoinedCampaignId,
    setActiveCampaign,
    startCampaignClearingTimer,
    sessions,
    isRegistered,
    sipContact,
  } = useDialpad();
  const { user } = useUser();
  const queryClient = useQueryClient();
  /* Duty, not presence: the header's chip and this screen read the same row,
     so "on duty" can never mean two things. The query is the one the header
     already runs - react-query shares it by key, so this adds no polling. */
  const { mine: myDuty, setDuty } = useAgentDuty();

  const userDetailsPayload = useMemo(
    () => ({
      first_name: String(user?.user_info?.first_name || user?.first_name || '').trim(),
      last_name: String(user?.user_info?.last_name || user?.last_name || '').trim(),
      email: String(user?.user_info?.email || user?.email || '').trim(),
      extension: String(user?.user_info?.extension || '').trim(),
      user_uuid: String(user?.uuid || '').trim(),
      company_uuid: String(user?.company_info?.uuid || user?.company_uuid || '').trim(),
      domain: String(user?.sip_credentials?.domain || user?.user_info?.domain || '').trim(),
      role: String(user?.role || user?.user_info?.role || '').trim(),
      caller_id: String(user?.user_info?.caller_id || user?.caller_id || '').trim(),
    }),
    [user],
  );

  const [activeTab, setActiveTab] = useState<TabKey>('running-campaign');
  const [queueSearch, setQueueSearch] = useState('');
  const [campaignActionPendingId, setCampaignActionPendingId] = useState<string | null>(null);
  const [refreshingCampaignIds, setRefreshingCampaignIds] = useState<Record<string, boolean>>({});
  const [campaignAnalyticsMap, setCampaignAnalyticsMap] = useState<Record<string, any>>({});
  const [micPermissionDialogOpen, setMicPermissionDialogOpen] = useState(false);
  const [pendingCampaign, setPendingCampaign] = useState<any>(null);
  const [micPermissionState, setMicPermissionState] = useState<
    'prompt' | 'granted' | 'denied' | 'unsupported'
  >('prompt');
  const [micPermissionMessage, setMicPermissionMessage] = useState('');
  /* The campaign the SERVER's roster puts this person on, which is not the
     same question as "did this tab press Join". */
  const [rosterCampaignId, setRosterCampaignId] = useState<string | null>(null);
  /* Bumped whenever the browser's record of which tab holds the ring changes -
     here, or in another tab (the `storage` event fires in the OTHER tabs). It
     is what makes a second window stop offering Join the moment the first one
     takes the ring. */
  const [ringRecordVersion, setRingRecordVersion] = useState(0);
  /* This window's name in the election below. One per tab, for as long as the
     tab lives; it is never sent anywhere. */
  const tabIdRef = useRef<string>('');
  if (!tabIdRef.current) tabIdRef.current = makeTabId();
  /* Bumped when any tab checks in or leaves, so the election is re-run. */
  const [tabsVersion, setTabsVersion] = useState(0);
  /* Whether the browser has already been given the microphone. An auto-join
     cannot ask for it - there is no gesture to ask on - and ringing an agent
     whose microphone is blocked is worse than not ringing them. */
  const [microphoneGranted, setMicrophoneGranted] = useState(false);
  /* The campaign this tab joined by itself, so the card can say so quietly. */
  const [autoJoinedCampaignId, setAutoJoinedCampaignId] = useState<string | null>(null);
  /* One auto-join per campaign per session: the join endpoint is idempotent
     (a plain $set of status, state and ring_contact), but there is no reason
     to re-assert it on every render, and dialpad-context already re-sends the
     contact when the softphone re-registers. */
  const autoJoinAttemptedRef = useRef<Set<string>>(new Set());
  const [showNotRunning, setShowNotRunning] = useState(false);
  /* Leave asks why before it acts: a break, away from the desk, the end of the
     shift, or simply moving to another campaign. See campaign-leave-dialog. */
  const [leaveRequest, setLeaveRequest] = useState<any>(null);
  /* The engine's board, so a joined agent can see what the campaign is doing
     without opening the dialer. Pushed on the socket that is already open; no
     new request and no polling. */
  const [liveStats, setLiveStats] = useState<any>(null);

  const debouncedQueueSearch = useDebounce(queueSearch, 1000);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CAMPAIGN_TABS_STORAGE_KEY) {
        setTabsVersion((version) => version + 1);
        return;
      }
      if (event.key && event.key !== CAMPAIGN_RING_STORAGE_KEY) return;
      setRingRecordVersion((version) => version + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!socketEventsManager) return;
    const onStats = (payload: any) => {
      if (!payload || typeof payload !== 'object') return;
      setLiveStats({ ...payload, receivedAt: Date.now() });
    };
    socketEventsManager.on('campaign-live-stats', onStats);
    return () => {
      socketEventsManager.off('campaign-live-stats', onStats);
    };
  }, [socketEventsManager]);

  /* ── which window owns the ring ──────────────────────────────────────────
     Joining names a tab: the agent's row keeps one `ring_contact` and the
     queue script rings that one contact. Auto-joining from every open tab
     would therefore hand the ring to whichever tab happened to run last and
     leave the agent staring at a window that never rings - the 12 Sep fault.
     So each tab says it is alive here, and every tab elects the same winner
     from the same record: the one on screen, the more recently active of two
     equals, the lower id in a dead heat. Only the winner auto-joins. */
  const heartbeatRef = useRef<() => void>(() => {});
  useEffect(() => {
    const tabId = tabIdRef.current;
    const beat = () => {
      publishRingTab(tabId, document.visibilityState === 'visible', Date.now());
      setTabsVersion((version) => version + 1);
    };
    heartbeatRef.current = beat;
    beat();
    const leave = () => dropRingTab(tabId);
    document.addEventListener('visibilitychange', beat);
    window.addEventListener('focus', beat);
    window.addEventListener('blur', beat);
    window.addEventListener('pagehide', leave);
    return () => {
      document.removeEventListener('visibilitychange', beat);
      window.removeEventListener('focus', beat);
      window.removeEventListener('blur', beat);
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, []);

  /* Re-judges the board's age and the in-flight timers; nothing is fetched.
     The tab heartbeat rides the same tick rather than adding a timer. */
  const [boardClock, setBoardClock] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setBoardClock((clock) => clock + 1);
      heartbeatRef.current();
    }, 5000);
    return () => clearInterval(id);
  }, []);

  /* What this BROWSER last pointed a ring at, whichever tab did it. A tab
     that never pressed Join has no other way to know another one is already
     joined, and without it this tab would offer a bare Join and take the call
     away from the window the agent is watching. */
  const browserRing = useMemo(() => {
    void ringRecordVersion;
    return readCampaignRingRecord();
  }, [ringRecordVersion]);

  const ownsRing = useMemo(() => {
    /* tabsVersion and boardClock are read so the election is re-run when a
       tab checks in, goes away, or simply goes stale. */
    void tabsVersion;
    void boardClock;
    return electRingOwner(readRingTabs()) === tabIdRef.current;
  }, [tabsVersion, boardClock]);

  const {
    data: campaignList = [],
    isLoading: isCampaignListLoading,
    /* A failed read is not an empty list, and must never be treated as proof
       that a campaign has gone away. */
    isSuccess: isCampaignListLoaded,
  } = useQuery({
    queryKey: ['getRunningCampaignsList'],
    queryFn: () => getRunningCampaigns(),
    select: (data) => data?.data?.data?.result?.rows || [],
    /* Read again on a timer. Without this the list was fetched once on mount,
       so a campaign paused or finished by a supervisor went on showing
       "Processing" on the agent's screen until they reloaded the page - and a
       campaign started while they were looking never appeared at all. The
       agent's view of a campaign has to be the campaign's actual state, not
       its state when the tab was opened. A campaign that stops running also
       drops out of this list, which is what releases the agent from it. */
    refetchInterval: 20 * 1000,
    refetchOnWindowFocus: true,
  });

  /* The campaigns this person is assigned to that are NOT running.
     `member-based` above answers one question - which running campaigns am I
     on - and the workspace showed only that, so the owner assigned himself to
     a campaign that had not been started and saw an empty screen. He read it
     as a bug, and he was right to: the screen was hiding work he had been
     given. The company list is the only route that carries the other states,
     so it is read once and filtered here to the campaigns whose member list
     names this person. Completed ones are dropped; nothing can be done with
     them. */
  const { data: companyCampaigns = { rows: [], total: 0 } } = useQuery({
    queryKey: ['assignedCampaignsNotRunning'],
    queryFn: () =>
      fetchCompanyCampaigns({
        page: 1,
        limit: 200,
        filters: [],
        sort: { key: 'createdAt', desc: true },
      }),
    select: (data: any) => ({
      rows: data?.data?.data?.result?.rows || [],
      total: Number(data?.data?.data?.result?.total) || 0,
    }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  /* The ids this person can work right now, straight from the member-scoped
     list. Used twice: to keep a campaign out of the "not running" section
     when the running list already has it, and to judge the ring record this
     browser is holding. */
  const workableCampaignIds = useMemo(
    () =>
      (campaignList as any[])
        .map((row: any) => String(row?._id || '').trim())
        .filter(Boolean),
    [campaignList],
  );

  const assignedNotRunning = useMemo(() => {
    const mine = (companyCampaigns.rows || []).filter((row: any) =>
      isCampaignMember(row, userDetailsPayload.user_uuid),
    );
    /* The two lists are read at two moments and disagree the instant a
       campaign is started: the owner saw "1234sk · Processing" on a card and
       "1234sk · Not started" below it at the same time. The running list is
       the authority for anything it names. */
    return splitAssignedCampaigns(withoutCampaignIds(mine, workableCampaignIds)).notRunning;
  }, [companyCampaigns, userDetailsPayload.user_uuid, workableCampaignIds]);

  /* Said plainly rather than silently truncated: the company list is read one
     page deep, so a very large company could have assigned campaigns this
     screen has not seen. */
  const assignedListIsPartial =
    (companyCampaigns.total || 0) > (companyCampaigns.rows?.length || 0);

  const {
    data: callQueueData = [],
    isError: isQueueError,
    isLoading: isQueueLoading,
    refetch: refetchCallQueue,
  } = useQuery({
    queryKey: ['getCallQueueInvolvements', debouncedQueueSearch],
    queryFn: () =>
      getCallQueueInvolvements({
        search: debouncedQueueSearch,
      }),
    select: (res) => res?.data?.data?.result ?? [],
    enabled: activeTab === 'assigned-queues',
  });

  // const { mutateAsync: mutateCampaignJoinUpsert } = useMutation({
  //   mutationFn: upsertCampaignJoin,
  // });

  /* Who the SERVER thinks is joined, asked once when the workspace loads.
     "Joined" was browser state only, so a reload - or a second tab - offered
     Join Campaign again on a campaign the agent was already on the roster of,
     and the dialer went on ringing them for it. campaign-event-logs returns
     the company's whole roster for any eventType it does not recognise, so
     this reads without writing anything. */
  const rosterRestoredRef = useRef(false);
  useEffect(() => {
    if (rosterRestoredRef.current) return;
    if (!socketEventsManager || isCampaignListLoading || !campaignList.length) return;
    if (!userDetailsPayload.user_uuid || !userDetailsPayload.company_uuid) return;
    if (joinedCampaignId) {
      rosterRestoredRef.current = true;
      return;
    }
    rosterRestoredRef.current = true;

    emitWithAck(
      (onAck) =>
        socketEventsManager.emit(
          'campaign-event-logs',
          { campaignDetail: {}, eventType: 'ROSTER', userDetail: userDetailsPayload },
          onAck,
        ),
      {
        retries: 0,
        what: 'check which campaign you are on',
        /* Silent on failure: this only restores a convenience, and a toast on
           every slow load would be noise. The agent can still press Join. */
        onTimeout: () => {},
        onAck: (res: any) => {
          const rosterRows: any[] = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0] : res) : [];
          const mine = rosterRows.find(
            (row: any) =>
              Array.isArray(row?.userDetail) &&
              row.userDetail.some(
                (member: any) =>
                  String(member?.user_uuid || '') === userDetailsPayload.user_uuid,
              ),
          );
          const rosterCampaignId = String(mine?.campaignDetail?.campaignId || '').trim();
          if (!rosterCampaignId) return;
          /* Only a campaign this agent can actually work right now: the list
             already holds only PROCESSING campaigns they are a member of. */
          const campaign = campaignList.find(
            (row: any) => String(row?._id || '').trim() === rosterCampaignId,
          );
          if (!campaign) return;
          /* Kept whether or not this tab is the one being rung: the card needs
             to know "joined" and "rung here" separately, because they came
             apart every time a second window pressed Join. */
          setRosterCampaignId(rosterCampaignId);
          setJoinedCampaignId(rosterCampaignId);
          setActiveCampaign({ ...campaign, selectedCallerId: getRandomCallerId(campaign) });
        },
      },
    );
  }, [
    campaignList,
    isCampaignListLoading,
    joinedCampaignId,
    setActiveCampaign,
    setJoinedCampaignId,
    socketEventsManager,
    userDetailsPayload,
  ]);

  useEffect(() => {
    if (!joinedCampaignId || isCampaignListLoading) return;

    const isJoinedCampaignAvailable = campaignList.some(
      (campaign: any) => String(campaign?._id || '').trim() === joinedCampaignId,
    );
    if (!isJoinedCampaignAvailable) {
      setJoinedCampaignId(null);
      setRosterCampaignId(null);
      setActiveCampaign(null);
      clearCampaignRingContact();
      setRingRecordVersion((version) => version + 1);
    }
  }, [
    campaignList,
    isCampaignListLoading,
    joinedCampaignId,
    setActiveCampaign,
    setJoinedCampaignId,
  ]);

  useEffect(() => {
    if (activeCampaign !== null) return;
    setJoinedCampaignId(null);
    setActiveCampaign(null);
  }, [activeCampaign, setActiveCampaign, setJoinedCampaignId]);

  /* ── the ring record has to earn the right to block a join ───────────────
     On 13 Sep the owner made a fresh campaign, was a member of it, and the
     workspace answered "You are working another campaign. Leave it first to
     join this one." The browser was holding a ring record for campaign
     6aa68597…, which had since been DELETED - and nothing had ever checked
     that record against the server, so it refused every campaign he tried
     until his storage was cleared by hand. A held campaign now has to still
     be one he is assigned to AND still running; anything else is rubbish and
     goes, quietly, with the join allowed through. */
  useEffect(() => {
    const verdict = checkHeldRingRecord({
      record: browserRing,
      workableCampaignIds,
      /* Judged only against a list that actually arrived: a failed or
         still-running read must never look like "the campaign is gone". */
      listIsKnown: isCampaignListLoaded && !isCampaignListLoading,
    });
    if (!shouldDropHeldRing(verdict)) return;
    console.log(
      `[campaign] dropping the held ring record for ${browserRing.campaignId}: ${
        verdict === 'expired' ? 'it is older than a shift' : 'that campaign is no longer yours to work'
      }`,
    );
    clearCampaignRingContact();
    if (joinedCampaignId && joinedCampaignId === browserRing.campaignId) {
      setJoinedCampaignId(null);
      setRosterCampaignId(null);
      setActiveCampaign(null);
    }
    setRingRecordVersion((version) => version + 1);
  }, [
    browserRing,
    isCampaignListLoaded,
    isCampaignListLoading,
    joinedCampaignId,
    setActiveCampaign,
    setJoinedCampaignId,
    workableCampaignIds,
  ]);

  /* When the running list changes - a campaign started, finished or was
     paused - the company-wide read behind the "not running" section is out of
     date by definition. Re-read it once, rather than leaving a paused
     campaign invisible in both lists until the page is reloaded. */
  const runningIdsKey = workableCampaignIds.join(',');
  const lastRunningIdsKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isCampaignListLoaded || isCampaignListLoading) return;
    if (lastRunningIdsKeyRef.current === runningIdsKey) return;
    const isFirstSight = lastRunningIdsKeyRef.current === null;
    lastRunningIdsKeyRef.current = runningIdsKey;
    /* The first load already fetched both lists. */
    if (isFirstSight) return;
    queryClient.invalidateQueries({ queryKey: ['assignedCampaignsNotRunning'] });
  }, [isCampaignListLoaded, isCampaignListLoading, queryClient, runningIdsKey]);

  const toNumber = (value: any) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getCampaignMemberAnalytics = (campaign: any) => campaignAnalyticsMap[campaign?._id] || {};

  const getPercentage = (rawPercentage: any, value: number, total: number) => {
    const parsed = Number(rawPercentage);
    if (Number.isFinite(parsed)) return Number(parsed.toFixed(2));
    if (!total) return 0;
    return Number(((value / total) * 100).toFixed(2));
  };

  const getStatusBadgeConfig = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PROCESSING: {
        label: 'Processing',
        className: 'bg-orange-50 border border-orange-200 text-orange-500',
      },
      COMPLETED: {
        label: 'Completed',
        className: 'bg-emerald-50 border border-emerald-200 text-emerald-600',
      },
      PAUSE: {
        label: 'Pause',
        className: 'bg-rose-50 border border-rose-200 text-rose-600',
      },
      NEW: {
        label: 'New',
        className: 'bg-sky-50 border border-sky-200 text-sky-600',
      },
    };

    return (
      statusMap[status] || {
        label: String(status || 'Unknown')
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase()),
        className: 'bg-slate-50 border border-slate-200 text-slate-600',
      }
    );
  };

  const { mutateAsync: mutateCampaignAnalytics } = useMutation({
    mutationFn: campaignAnalytics,
  });

  const refreshCampaignAnalytics = async (campaignId?: string) => {
    if (!campaignId || refreshingCampaignIds[campaignId]) return;
    setRefreshingCampaignIds((prev) => ({ ...prev, [campaignId]: true }));
    try {
      const response: any = await mutateCampaignAnalytics({ campaignId });
      const analytics = response?.data?.data?.result;
      if (!analytics) return;
      setCampaignAnalyticsMap((prev) => ({ ...prev, [campaignId]: analytics }));
    } catch (error) {
      console.error('Failed to fetch campaign analytics:', error);
    } finally {
      setRefreshingCampaignIds((prev) => {
        const next = { ...prev };
        delete next[campaignId];
        return next;
      });
    }
  };

  useEffect(() => {
    if (activeTab !== 'running-campaign') return;
    if (isCampaignListLoading || !campaignList?.length) return;

    setCampaignAnalyticsMap((prev) => {
      const allowedIds = new Set(
        campaignList.map((campaign: any) => campaign?._id).filter(Boolean),
      );
      return Object.fromEntries(
        Object.entries(prev).filter(([campaignId]) => allowedIds.has(campaignId)),
      );
    });

    campaignList.forEach((campaign: any) => {
      if (campaign?._id) {
        refreshCampaignAnalytics(campaign._id);
      }
    });
  }, [activeTab, campaignList, isCampaignListLoading]);

  const getMicrophonePermissionState = useCallback(async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      return 'unsupported' as const;
    }

    if (!navigator.permissions?.query) return 'prompt' as const;

    try {
      const result = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });

      if (result.state === 'granted') return 'granted' as const;
      if (result.state === 'denied') return 'denied' as const;
      return 'prompt' as const;
    } catch {
      return 'prompt' as const;
    }
  }, []);

  const ensureMicrophonePermission = useCallback(async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMicPermissionState('unsupported');
      setMicPermissionMessage('Microphone access is not supported in this browser.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermissionState('granted');
      setMicPermissionMessage('');
      return true;
    } catch (error: any) {
      const errorName = String(error?.name || '').toLowerCase();
      const isDenied = errorName === 'notallowederror' || errorName === 'permissiondeniederror';

      setMicPermissionState(isDenied ? 'denied' : 'prompt');
      setMicPermissionMessage(
        isDenied
          ? 'Microphone access is blocked. Please enable microphone permission from the browser site settings near the address bar, then try again.'
          : 'Unable to access your microphone. Please check microphone permission and try again.',
      );
      return false;
    }
  }, []);

  /* Undo a join that never took. The browser marks the agent joined before
     anything is confirmed, which is what keeps the card responsive; when the
     confirmation never comes, this is what puts it back rather than leaving a
     workspace waiting on a dialer that has never heard of them. */
  const rollBackJoin = useCallback(
    (message: string) => {
      setJoinedCampaignId(null);
      setRosterCampaignId(null);
      setActiveCampaign(null);
      setCampaignContactCards(null);
      /* The ring was never moved, so the browser must not claim it was. */
      clearCampaignRingContact();
      setRingRecordVersion((version) => version + 1);
      handleAlert({ text: message, type: 'error' });
    },
    [setActiveCampaign, setCampaignContactCards, setJoinedCampaignId],
  );

  /* Remember that THIS tab's contact is the one the campaign now rings, so a
     second window can say "you are joined in another tab" instead of offering
     a Join that quietly steals the call. */
  const recordRingHere = useCallback(
    (campaignId: string) => {
      writeCampaignRingContact(campaignId, sipContact);
      setRingRecordVersion((version) => version + 1);
    },
    [sipContact],
  );

  const launchCampaign = async (campaign: any) => {
    const { _id } = campaign || {};

    if (!_id) return;
    if (campaignActionPendingId) return;
    if (joinedCampaignId && joinedCampaignId !== _id) return;

    if (!userDetailsPayload.user_uuid || !userDetailsPayload.company_uuid) {
      handleAlert({
        text: 'Unable to join campaign. User details are missing.',
        type: 'error',
      });
      return;
    }

    setCampaignActionPendingId(_id);
    setActiveCampaign({
      ...campaign,
      selectedCallerId: getRandomCallerId(campaign),
    });
    setJoinedCampaignId(_id);
    setRosterCampaignId(_id);
    socketEventsManager?.emit('campaign-event-logs', {
      campaignDetail: {
        campaignName: campaign?.name,
        campaignId: _id,
        companyId: campaign?.companyId,
      },
      eventType: 'INSERT',
      userDetail: {
        first_name: userDetailsPayload.first_name,
        last_name: userDetailsPayload.last_name,
        email: userDetailsPayload.email,
        extension: userDetailsPayload.extension,
        user_uuid: userDetailsPayload.user_uuid,
        company_uuid: userDetailsPayload.company_uuid,
        domain: userDetailsPayload.domain,
        role: userDetailsPayload.role,
        caller_id: campaign?.callerId,
      },
    });

    /* Predictive and (once the server dials it) progressive: the agent goes
       available in the campaign's queue and waits for the dialer to ring them.
       Preview: the agent pulls records and dials from their own phone. */
    const isPredictiveCampaign = isServerDialed(campaign?.dialMethod);

    if (isPredictiveCampaign) {
      try {
        const availabilityResponse = await makeCallQueueAvailable({
          campaign_uuid: _id,
          status: 'Available',
          state: 'Waiting',
          /* This tab's SIP identity: the queue rings this tab, not every tab of the login. */
          sip_contact: sipContact,
        });
        console.log('makeCallQueueAvailable response:', availabilityResponse);
        recordRingHere(_id);
        openDialpad('maxi');
      } catch (error: any) {
        /* This write is what makes the agent callable. It used to be swallowed
           to the console and the dialer opened anyway, so a failed join sat on
           "Waiting for call - connecting you to the next campaign contact"
           forever while the dialer had never heard of the agent. */
        console.error('makeCallQueueAvailable failed for predictive campaign:', error);
        rollBackJoin(
          `Could not join ${campaign?.name || 'the campaign'}: ${
            error?.response?.data?.error?.message || error?.message || 'the server refused'
          }. Try again.`,
        );
      } finally {
        setCampaignActionPendingId(null);
      }
    } else {
      if (!socketEventsManager) {
        setCampaignActionPendingId(null);
        return;
      }

      emitWithAck(
        (onAck) =>
          socketEventsManager.emit(
            'campaign-preview-contact-list',
            {
              body: {
                campaignId: _id,
                user_uuid: userDetailsPayload.user_uuid,
                company_uuid: userDetailsPayload.company_uuid,
                userDetail: userDetailsPayload,
              },
            },
            onAck,
          ),
        {
          what: `join ${campaign?.name || 'the campaign'}`,
          /* The campaign service never reports a failure on this socket - an
             answer arrives or nothing does - so the timeout has to be ours.
             Without it "Joining..." sat on the card for the rest of the shift. */
          onTimeout: (message) => {
            setCampaignActionPendingId(null);
            rollBackJoin(message);
          },
          onAck: (res: any) => {
          const campaignStatus = getCampaignStatus(res);
          if (['COMPLETED', 'COMPLETE', 'PAUSE'].includes(campaignStatus)) {
            socketEventsManager.emit('campaign-event-logs', {
              campaignDetail: {
                campaignName: campaign?.name,
                campaignId: _id,
                companyId: campaign?.companyId,
              },
              eventType: 'DELETE',
              userDetail: {
                first_name: userDetailsPayload.first_name,
                last_name: userDetailsPayload.last_name,
                email: userDetailsPayload.email,
                extension: userDetailsPayload.extension,
                user_uuid: userDetailsPayload.user_uuid,
                company_uuid: userDetailsPayload.company_uuid,
                domain: userDetailsPayload.domain,
                role: userDetailsPayload.role,
                caller_id: campaign?.callerId,
              },
            });
            setActiveCampaign(null);
            setJoinedCampaignId(null);
            setCampaignContactCards(null);
            setCampaignActionPendingId(null);
            handleAlert({
              text:
                campaignStatus === 'PAUSE'
                  ? 'Campaign has been paused.'
                  : 'Campaign has been completed. No more contacts are available.',
              type: campaignStatus === 'PAUSE' ? 'info' : 'success',
            });
            return;
          }

            setActiveCampaign((prev: any) => ({ ...prev, manualStatus: campaignStatus }));
            const rows = getCampaignRows(res);
            setCampaignContactCards(rows);
            /* A preview campaign hands records to this tab, so this tab is the
               one working it; the other windows must say so. */
            recordRingHere(_id);
            openDialpad('maxi');
            setCampaignActionPendingId(null);
          },
        },
      );
    }
  };

  const handleMicPermissionConfirm = useCallback(async () => {
    if (!pendingCampaign) return;

    setMicPermissionMessage('');
    const currentPermissionState = await getMicrophonePermissionState();
    setMicPermissionState(currentPermissionState);

    if (currentPermissionState === 'denied') {
      setMicPermissionMessage(
        'Microphone access is blocked. Please click the site settings icon near the address bar, allow microphone access for this site, then click the button again.',
      );
      return;
    }

    const hasPermission = await ensureMicrophonePermission();
    if (!hasPermission) return;

    setMicPermissionDialogOpen(false);
    await launchCampaign(pendingCampaign);
    setPendingCampaign(null);
  }, [ensureMicrophonePermission, getMicrophonePermissionState, launchCampaign, pendingCampaign]);

  /**
   * Move the ring to this tab, deliberately.
   *
   * Joining is per browser tab: the join writes this tab's SIP contact onto
   * the agent's row and the queue script rings that contact only. So a second
   * tab pressing "Join" does not add itself, it takes the call away from the
   * first tab, which then waits for a call that rings somewhere else - the
   * condition behind the 12 Sep dropped-customer blocker. The card therefore
   * never offers a bare Join to somebody who is already joined; it offers
   * this, and says what it does.
   */
  const handleRingThisTab = async (campaign: any) => {
    const { _id } = campaign || {};
    if (!_id || campaignActionPendingId) return;
    if (!isRegistered || !sipContact) {
      handleAlert({
        text: 'This window is not registered for calls yet. Wait for the phone to connect, then try again.',
        type: 'warning',
      });
      return;
    }

    setCampaignActionPendingId(_id);
    forgetCampaignLeft(_id);
    setAutoJoinedCampaignId(null);
    try {
      if (isServerDialed(campaign?.dialMethod)) {
        await makeCallQueueAvailable({
          campaign_uuid: _id,
          status: 'Available',
          state: 'Waiting',
          sip_contact: sipContact,
        });
      }
      recordRingHere(_id);
      setJoinedCampaignId(_id);
      setRosterCampaignId(_id);
      setActiveCampaign((prev: any) =>
        String(prev?._id || '') === String(_id)
          ? prev
          : { ...campaign, selectedCallerId: getRandomCallerId(campaign) },
      );
      handleAlert({ text: 'Campaign calls now ring this window.', type: 'success' });
      openDialpad('maxi');
    } catch (error: any) {
      handleAlert({
        text: `Could not move the ring to this window: ${
          error?.response?.data?.error?.message || error?.message || 'the server refused'
        }.`,
        type: 'error',
      });
    } finally {
      setCampaignActionPendingId(null);
    }
  };

  /* The window the agent is looking at takes the ring by itself - the same
     move as "Ring this tab instead", made when this window has been the
     elected owner for a moment and the ring points elsewhere. Quiet: no
     toast, no dialer thrown open. Rule in lib/ring-claim.ts. */
  const ownedSinceRef = useRef<number>(0);
  const claimingRef = useRef(false);
  useEffect(() => {
    if (!ownsRing) {
      ownedSinceRef.current = 0;
      return;
    }
    if (!ownedSinceRef.current) ownedSinceRef.current = Date.now();
    const hasLiveCall = Object.values(sessions || {}).some((sessionItem: any) => {
      const status = String(sessionItem?.status || '').toLowerCase();
      return Boolean(status) && !['ended', 'failed'].includes(status);
    });
    const decision = decideRingClaim({
      ownsRing,
      ownedForMs: Date.now() - ownedSinceRef.current,
      ringRecord: browserRing,
      sipContact: String(sipContact || ''),
      isRegistered: Boolean(isRegistered),
      hasLiveCall,
    });
    if (!decision.claim || claimingRef.current || campaignActionPendingId) return;
    const campaign = (campaignList as any[]).find((row: any) => String(row?._id || '') === decision.campaignId);
    claimingRef.current = true;
    (async () => {
      try {
        if (!campaign || isServerDialed(campaign?.dialMethod)) {
          await makeCallQueueAvailable({
            campaign_uuid: decision.campaignId,
            status: 'Available',
            state: 'Waiting',
            sip_contact: sipContact,
          });
        }
        recordRingHere(decision.campaignId);
        if (String(joinedCampaignId || '') !== decision.campaignId) {
          setJoinedCampaignId(decision.campaignId);
          setRosterCampaignId(decision.campaignId);
          if (campaign) setActiveCampaign({ ...campaign, selectedCallerId: getRandomCallerId(campaign) });
        }
        console.log(`[campaign] this window took the ring for ${decision.campaignId} (${sipContact})`);
      } catch (error) {
        console.error('[campaign] could not move the ring to this window', error);
      } finally {
        claimingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownsRing, tabsVersion, browserRing.campaignId, browserRing.contact, sipContact, isRegistered, sessions, campaignActionPendingId]);

  const handleJoinCampaign = async (campaign: any, options: { replacing?: boolean } = {}) => {
    if (joinedCampaignId === campaign?._id || campaignActionPendingId) return;
    /* A switch has already left the other campaign; the state that says so has
       not re-rendered yet, so this guard would refuse the join that the agent
       explicitly asked for. */
    if (!options.replacing && joinedCampaignId && joinedCampaignId !== campaign?._id) return;

    /* Pressing Join withdraws an earlier Leave, and the campaign is theirs by
       hand from here on - the card stops saying it joined them. */
    forgetCampaignLeft(campaign?._id);
    autoJoinAttemptedRef.current.delete(String(campaign?._id || ''));
    setAutoJoinedCampaignId(null);

    if (!isRegistered) {
      handleAlert({
        text: 'You are not registered to start the campaign',
        type: 'warning',
      });
      return;
    }

    if (campaign?.campaignStatus !== CAMPAIGN_STATUS_CONST.PROCESSING) return;

    const currentPermissionState = await getMicrophonePermissionState();
    setMicPermissionState(currentPermissionState);

    if (currentPermissionState === 'granted') {
      await launchCampaign(campaign);
      return;
    }

    setPendingCampaign(campaign);
    setMicPermissionDialogOpen(true);
  };

  useEffect(() => {
    if (!micPermissionDialogOpen) {
      setMicPermissionMessage('');
      return;
    }

    void getMicrophonePermissionState().then((state) => {
      setMicPermissionState(state);
      if (state === 'denied') {
        setMicPermissionMessage(
          'Microphone access is currently blocked for this site. Enable it from the browser site settings near the address bar.',
        );
      } else if (state === 'unsupported') {
        setMicPermissionMessage('Microphone access is not supported in this browser.');
      } else {
        setMicPermissionMessage('');
      }
    });
  }, [getMicrophonePermissionState, micPermissionDialogOpen]);

  const handleLeaveCampaign = async (campaign: any) => {
    const { _id } = campaign || {};
    /* Leave must work from whichever window the card says "Joined" in. The
       card reads the join from this window, the browser's ring record and
       the server's roster; the guard here read only this window, so a
       campaign joined from another window showed a Leave button that did
       nothing (owner, 14 Sep: "it won't let any agent leave"). */
    const joinedSomewhere =
      Boolean(_id) &&
      [joinedCampaignId, rosterCampaignId, browserRing.campaignId].some(
        (value) => String(value || '').trim() === String(_id).trim(),
      );
    if (!_id || !joinedSomewhere) return;
    if (campaignActionPendingId) return;

    const hasActiveCallForThisCampaign = Object.values(sessions || {}).some((sessionItem) => {
      const sessionCampaignId = getSessionCampaignId(sessionItem);
      return Boolean(sessionCampaignId && sessionCampaignId === _id);
    });

    if (hasActiveCallForThisCampaign) {
      handleAlert({
        text: 'There is an active call going on. Disposition the call first.',
        type: 'error',
      });
      return;
    }

    setCampaignActionPendingId(_id);
    /* Leaving is a decision, and it has to survive the next render: without
       this the screen would join the agent straight back, which is the worst
       possible answer to somebody pressing Leave. It is forgotten when they
       press Join, or when they go off duty and come back. */
    rememberCampaignLeft(_id);
    setAutoJoinedCampaignId((current) => (current === _id ? null : current));
    autoJoinAttemptedRef.current.add(_id);
    socketEventsManager?.emit('campaign-event-logs', {
      campaignDetail: {
        campaignName: campaign?.name,
        campaignId: _id,
        companyId: campaign?.companyId,
      },
      eventType: 'DELETE',
      userDetail: {
        first_name: userDetailsPayload.first_name,
        last_name: userDetailsPayload.last_name,
        email: userDetailsPayload.email,
        extension: userDetailsPayload.extension,
        user_uuid: userDetailsPayload.user_uuid,
        company_uuid: userDetailsPayload.company_uuid,
        domain: userDetailsPayload.domain,
        role: userDetailsPayload.role,
        caller_id: campaign?.callerId,
      },
    });
    const isPredictiveCampaign = isServerDialed(campaign?.dialMethod);

    /* Leaving a campaign is not a break: the leave event below is what the
       engine reads, and the person's duty on every queue stays as it is.
       (isPredictiveCampaign is still read above for the other branches.) */
    void isPredictiveCampaign;
    try {
      /* nothing to write before the leave event */
    } finally {
      startCampaignClearingTimer();
      setJoinedCampaignId(null);
      setRosterCampaignId(null);
      setActiveCampaign(null);
      setCampaignContactCards(null);
      setCampaignActionPendingId(null);
      clearCampaignRingContact();
      setRingRecordVersion((version) => version + 1);
    }
  };

  /**
   * Move the ring from whatever campaign holds this person onto this one.
   *
   * Before this, a card for a campaign the agent was not on rendered NO button
   * at all - just the sentence "You are working another campaign. Leave it
   * first to join this one." The owner hit it on three cards at once while off
   * duty and working none of them, because a single claim on a fourth campaign
   * silences every other card. Leaving and joining are the same two calls the
   * agent would have made by hand; doing them in one press is the whole fix.
   */
  const handleSwitchCampaign = async (campaign: any) => {
    if (!campaign?._id || campaignActionPendingId) return;

    const heldId = String(joinedCampaignId || browserRing.campaignId || '').trim();
    const held = campaignList.find((row: any) => String(row?._id || '').trim() === heldId);

    if (held) {
      await handleLeaveCampaign(held);
    } else if (heldId) {
      /* The campaign holding the ring is not one this agent can see any more -
         a deleted or finished one. There is nothing to leave on the server, so
         drop the local claim rather than refusing the switch. */
      setJoinedCampaignId(null);
      setRosterCampaignId(null);
      setActiveCampaign(null);
      clearCampaignRingContact();
      setRingRecordVersion((version) => version + 1);
    }

    await handleJoinCampaign(campaign, { replacing: true });
  };

  /* ── joining by itself ───────────────────────────────────────────────────
     Membership plus being on duty is what makes an agent available; there is
     no separate join step to wait for. The owner put it plainly: "we assigned
     the agent, so as soon as the campaign is signed he should automatically
     join if he is signed in; if he doesn't sign in that is a loss for
     business." The rules live in lib/campaign-auto-join.ts so they can be
     read and tested without a browser. */

  /* The microphone cannot be asked for without a gesture, so an auto-join
     only happens when it has already been granted; otherwise the card keeps
     its Join button, which can ask. */
  useEffect(() => {
    let cancelled = false;
    void getMicrophonePermissionState().then((state) => {
      if (!cancelled) setMicrophoneGranted(state === 'granted');
    });
    return () => {
      cancelled = true;
    };
  }, [getMicrophonePermissionState, micPermissionState, myDuty?.duty]);

  /* Quieter than launchCampaign: no microphone dialog (there is no gesture to
     hang one on), no dialer thrown open over whatever the agent is doing, and
     no red alert if the write fails - the agent did not ask for this, so a
     failure puts the card back and says so in the console only. */
  const runAutoJoin = useCallback(
    async (campaign: any) => {
      const campaignId = String(campaign?._id || '').trim();
      if (!campaignId) return;
      autoJoinAttemptedRef.current.add(campaignId);
      setCampaignActionPendingId(campaignId);
      setActiveCampaign({ ...campaign, selectedCallerId: getRandomCallerId(campaign) });
      setJoinedCampaignId(campaignId);
      setRosterCampaignId(campaignId);
      try {
        try {
          await makeCallQueueAvailable({
            campaign_uuid: campaignId,
            status: 'Available',
            state: 'Waiting',
            /* This tab's SIP identity: the elected window, and only it. */
            sip_contact: sipContact,
          });
        } catch (error) {
          /* A preview campaign may have no queue at all - the engine counts
             its members from their sessions instead - so "Queue not found"
             is not a failed join there. A server-dialled campaign cannot
             ring somebody who is not Available on its queue, so for it the
             write has to succeed. */
          if (isServerDialed(campaign?.dialMethod)) throw error;
          console.warn('[campaign] preview join: queue status not written', error);
        }
        recordRingHere(campaignId);
        setAutoJoinedCampaignId(campaignId);
        /* Told after the write, not before: the roster is what the supervisor
           board reads, and it must not show an agent the dialer cannot ring. */
        socketEventsManager?.emit('campaign-event-logs', {
          campaignDetail: {
            campaignName: campaign?.name,
            campaignId,
            companyId: campaign?.companyId,
          },
          eventType: 'INSERT',
          userDetail: { ...userDetailsPayload, caller_id: campaign?.callerId },
        });
      } catch (error) {
        console.error('[campaign] could not join automatically', error);
        setJoinedCampaignId(null);
        setRosterCampaignId(null);
        setActiveCampaign(null);
        setAutoJoinedCampaignId(null);
        clearCampaignRingContact();
        setRingRecordVersion((version) => version + 1);
      } finally {
        setCampaignActionPendingId(null);
      }
    },
    [
      recordRingHere,
      setActiveCampaign,
      setJoinedCampaignId,
      sipContact,
      socketEventsManager,
      userDetailsPayload,
    ],
  );

  useEffect(() => {
    if (!ownsRing) return;
    if (isCampaignListLoading || campaignActionPendingId) return;
    /* A call, or the wrap-up panel that outlives it, both leave a session on
       the dialpad; neither is a moment to promise the picker a free agent. */
    const isBusy = Object.keys(sessions || {}).length > 0;
    const picked = pickAutoJoinCampaign(campaignList as any[], (campaign: any) =>
      autoJoinDecision({
        campaign,
        userUuid: userDetailsPayload.user_uuid,
        isServerDialled: isServerDialed(campaign?.dialMethod),
        duty: (myDuty?.duty as any) || '',
        /* Any tab of this browser being joined counts: the ring is one
           value, and a tab that became visible must not steal it from the
           tab that is actually working the campaign. Moving it is a
           deliberate act ("Ring this tab instead"), never an automatic one. */
        joinedCampaignId: joinedCampaignId || browserRing.campaignId,
        isBusy,
        isRegistered,
        hasSipContact: Boolean(sipContact),
        microphoneGranted,
        leftByHand: hasCampaignLeft(campaign?._id),
        ownsRing,
      }),
    );
    if (!picked) return;
    const campaignId = String((picked.campaign as any)?._id || '');
    if (!campaignId || autoJoinAttemptedRef.current.has(campaignId)) return;
    void runAutoJoin(picked.campaign);
  }, [
    browserRing.campaignId,
    campaignActionPendingId,
    campaignList,
    isCampaignListLoading,
    isRegistered,
    joinedCampaignId,
    microphoneGranted,
    myDuty?.duty,
    ownsRing,
    runAutoJoin,
    sessions,
    sipContact,
    userDetailsPayload.user_uuid,
  ]);

  /* Going off duty leaves; coming back on duty re-joins - including a
     campaign the agent had deliberately left, because ending a shift is how
     a person says "start again tomorrow". Only what this screen joined by
     itself is dropped: a campaign the agent chose to join is theirs, and duty
     already stops the picker offering calls either way. */
  const previousDutyRef = useRef<string | null>(null);
  useEffect(() => {
    const duty = String(myDuty?.duty || '');
    if (!duty || previousDutyRef.current === duty) return;
    const previous = previousDutyRef.current;
    previousDutyRef.current = duty;
    /* First sight of the row is not a change: a reload must not wipe a Leave
       the agent made a minute ago. */
    if (previous === null) return;

    if (duty === 'on_duty') {
      clearCampaignLeftMarks();
      autoJoinAttemptedRef.current.clear();
      setRingRecordVersion((version) => version + 1);
      return;
    }

    if (!autoJoinedCampaignId || joinedCampaignId !== autoJoinedCampaignId) return;
    if (Object.keys(sessions || {}).length) return;
    const campaign =
      (campaignList as any[]).find(
        (row: any) => String(row?._id || '') === autoJoinedCampaignId,
      ) || activeCampaign;
    if (!campaign) return;
    setAutoJoinedCampaignId(null);
    void handleLeaveCampaign(campaign);
    /* handleLeaveCampaign and the campaign list are re-created on every
       render, so they are deliberately not dependencies: this effect is about
       one thing changing, the duty. */
  }, [myDuty?.duty]);

  return (
    <>
      <section className="mcm-workspace w-full bg-[#F7F9FC] flex flex-col overflow-x-auto overflow-y-hidden h-full">
        <div className="mcm-ws-head flex items-center justify-between p-4 border-b border-gray-200/90 min-h-[68px] bg-white">
          <div className="flex flex-col">
            <p className="mcm-ws-title text-gray-900 font-semibold text-lg leading-tight">Campaign Workspace</p>
            <p className="mcm-ws-sub text-xs text-gray-500">
              The campaigns you are assigned to, and your queues. You are joined to a
              running campaign automatically while you are on duty.
            </p>
          </div>
        </div>

        <div className="mcm-ws-body p-3 w-full h-full gap-2 flex flex-col">
          {/* What the agent is meant to look at while waiting. Every call that
              is waiting for them right now, with who it is, which queue or
              campaign, and how long it has been waiting - and, on the rows this
              browser can act on, the button that takes it. */}
          <DialpadWorkList framed className="mcm-ws-waiting" />
          <div className="mcm-ws-panel bg-white w-full rounded-2xl border border-gray-200/90 flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="mcm-ws-tabbar border-b border-gray-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 w-full">
              <div className="sm:px-3 sm:pt-3 sm:pb-2 flex-col sm:flex items-center justify-between gap-3 w-full ">
                <div className="mcm-ws-seg inline-flex items-center sm:rounded-xl bg-gray-100 p-1 gap-1 w-full">
                  <button
                    type="button"
                    onClick={() => setActiveTab('running-campaign')}
                    className={`mcm-ws-seg-btn relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                      activeTab === 'running-campaign'
                        ? 'is-active bg-white text-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon name="Grid2" className="w-4 h-4" />
                    <span>Running Campaign</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('assigned-queues')}
                    className={`mcm-ws-seg-btn relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                      activeTab === 'assigned-queues'
                        ? 'is-active bg-white text-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon name="CallQueue" className="w-4 h-4" />
                    <span>Assigned Queues</span>
                  </button>
                </div>

                <div />
              </div>
            </div>

            <div className="mcm-ws-content flex-1 p-3 overflow-hidden">
              {activeTab === 'running-campaign' ? (
                <div className="mcm-ws-scroll w-full h-full overflow-y-auto">
                  {isCampaignListLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader variant="blue" />
                    </div>
                  ) : (
                    <>
                    {campaignList?.length ? (
                    <div className="mcm-ws-grid w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {campaignList.map((campaign: any) => {
                        const isRefreshingAnalytics = !!refreshingCampaignIds[campaign?._id];
                        const isActionPending = campaignActionPendingId === campaign?._id;
                        const hasActionPending = Boolean(campaignActionPendingId);
                        /* ringRecordVersion is read so the card re-renders when
                           another tab takes the ring; its value is not used. */
                        void ringRecordVersion;
                        const join = describeCampaignJoin({
                          campaignId: campaign?._id,
                          joinedCampaignId,
                          rosterCampaignId: rosterCampaignId || browserRing.campaignId,
                          lastJoinedContact: readCampaignRingContact(campaign?._id),
                          myContact: sipContact,
                          isPending: isActionPending,
                          otherCampaignName: campaignList.find(
                            (row: any) =>
                              String(row?._id || '').trim() ===
                              String(joinedCampaignId || browserRing.campaignId || '').trim(),
                          )?.name,
                        });
                        const isJoined = join.isJoined;
                        const hasJoinedAnotherCampaign = join.state === 'joined_other_campaign';
                        /* What the campaign is doing this second, for the
                           campaign this person is actually on. boardClock is
                           read only to re-judge the board's age. */
                        void boardClock;
                        const activity = isJoined
                          ? describeCampaignActivity({
                              live: liveStats,
                              campaignId: campaign?._id,
                              myExtension: userDetailsPayload.extension,
                            })
                          : null;
                        const hasAnalytics = Boolean(campaignAnalyticsMap[campaign?._id]);
                        const analytics = getCampaignMemberAnalytics(campaign);
                        const assignedLeads = toNumber(analytics?.assignedLeads ?? 0);
                        const connected = toNumber(
                          analytics?.answeredLeads ?? analytics?.connected ?? 0,
                        );
                        const notAnswered = toNumber(
                          analytics?.totalCallNotAnswered ??
                            analytics?.notAnswered ??
                            analytics?.noAnswer ??
                            0,
                        );
                        const pending = toNumber(analytics?.pendingLeads ?? 0);
                        const pendingPercentage = getPercentage(
                          analytics?.pendingPercentage,
                          pending,
                          assignedLeads,
                        );
                        const connectedPercentage = getPercentage(
                          analytics?.answeredPercentage,
                          connected,
                          assignedLeads,
                        );
                        const notAnsweredPercentage = getPercentage(
                          analytics?.notAnsweredPercentage,
                          notAnswered,
                          assignedLeads,
                        );
                        const statusBadge = getStatusBadgeConfig(campaign?.campaignStatus);
                        return (
                          <div
                            key={campaign?._id}
                            className={`mcm-ws-card ${isJoined ? 'is-joined' : ''} flex flex-col justify-between min-h-32 group rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-300`}
                          >
                            {/* One column, always. The old row put up to three
                                buttons beside the name with shrink-0, and the
                                cards are only ~480px wide at two and three
                                columns: the name was squeezed under the
                                badges until it could not be read and the
                                "joined in another tab" sentence came out one
                                word per line. The name and the message get
                                the full width of the card; the actions wrap
                                underneath. */}
                            <div className="flex flex-col gap-2">
                              <div className="min-w-0">
                                <div className="mcm-ws-card-top mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <p className="mcm-ws-card-name min-w-0 max-w-full truncate text-base font-semibold text-slate-900">
                                    {campaign?.name || 'Untitled Campaign'}
                                  </p>
                                  <div
                                    className={`mcm-ws-status mcm-ws-status--${String(campaign?.campaignStatus || 'unknown').toLowerCase()} shrink-0 px-3 py-1 w-fit whitespace-nowrap text-center rounded-md text-xs font-medium ${statusBadge.className}`}
                                  >
                                    {statusBadge.label}
                                  </div>
                                  {isJoined && (
                                    <span
                                      className={`mcm-ws-chip shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                        join.ringsHere
                                          ? 'is-here bg-ucass-active-bg text-ucass-active border-ucass-active-bg'
                                          : 'is-elsewhere bg-amber-50 text-amber-700 border-amber-200'
                                      }`}
                                    >
                                      {join.ringsHere ? 'Joined' : 'Joined elsewhere'}
                                    </span>
                                  )}
                                </div>

                                <p className="mcm-ws-card-meta text-xs text-slate-500">
                                  {CAMPAIGN_TYPE_NAME[campaign?.dialMethod] ||
                                    campaign?.dialMethod ||
                                    'Preview'}
                                </p>

                                {/* Joining is per tab and the button never used
                                    to say so, so the same person joined from
                                    three windows and only the last one was
                                    rung. Say which window holds the call. */}
                                {join.note ? (
                                  <p className="mcm-ws-note mt-1 text-[11px] font-medium text-amber-700 break-words">
                                    {join.note}
                                  </p>
                                ) : null}

                                {/* Said once, quietly, with Leave beside it.
                                    An agent who is put on a campaign without
                                    touching anything is owed an explanation,
                                    but not a dialog and not a toast for every
                                    campaign at the start of a shift. */}
                                {autoJoinedCampaignId === campaign?._id && join.ringsHere ? (
                                  <p className="mcm-ws-auto mt-1 text-[11px] font-medium text-emerald-700 break-words">
                                    Joined automatically — you are on duty
                                  </p>
                                ) : null}

                                {/* What the campaign is doing right now, the
                                    same states the supervisor's dial log
                                    shows. Without it a joined agent saw only
                                    "waiting" while calls were being placed. */}
                                {activity && activity.headline ? (
                                  <p
                                    className={`mcm-ws-activity mcm-ws-activity--${activity.tone} mt-1 flex items-center gap-1.5 text-[11px] font-semibold ${
                                      activity.tone === 'live'
                                        ? 'text-emerald-700'
                                        : activity.tone === 'warn'
                                          ? 'text-amber-700'
                                          : 'text-slate-500'
                                    }`}
                                  >
                                    {activity.tone === 'idle' ? null : (
                                      <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current" />
                                    )}
                                    <span className="truncate">{activity.headline}</span>
                                  </p>
                                ) : null}
                                {activity && activity.detail ? (
                                  <p className="mcm-ws-activity-detail text-[11px] leading-snug text-slate-500">
                                    {activity.detail}
                                  </p>
                                ) : null}
                              </div>

                              {isJoined ? (
                                <div className="mcm-ws-actions flex flex-wrap items-center gap-2">
                                  {/* Leaving is not the only thing you might
                                      want to do to a campaign you are in. An
                                      agent who closed the dialer had no way
                                      back to it from here - the only button on
                                      a joined campaign was the one that quits
                                      it. */}
                                  {join.action === 'ring_here' ? (
                                    <button
                                      onClick={() => handleRingThisTab(campaign)}
                                      disabled={hasActionPending}
                                      className="mcm-ws-btn mcm-ws-btn--warn cursor-pointer whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isActionPending ? 'Moving the ring...' : 'Ring this tab instead'}
                                    </button>
                                  ) : null}
                                  <button
                                    onClick={() => {
                                      /* Opening the dialer has to say WHICH campaign.
                                         This button only opened the window, so the
                                         dialer came up with no campaign in hand: it
                                         showed a manual keypad instead of the contact
                                         card and never asked the server for a lead.
                                         "Joined" on this card can come from the roster
                                         while this tab's own campaign state is empty -
                                         after a reload, or a second window - so the
                                         session is restored here from the card's own
                                         campaign, exactly as joining does. */
                                      const id = String(campaign?._id || '').trim();
                                      if (id) setJoinedCampaignId(id);
                                      setActiveCampaign({
                                        ...campaign,
                                        selectedCallerId: getRandomCallerId(campaign),
                                      });
                                      openDialpad('maxi');
                                    }}
                                    className="mcm-ws-btn mcm-ws-btn--open cursor-pointer whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                                  >
                                    Open dialer
                                  </button>
                                  <button
                                    onClick={() => setLeaveRequest(campaign)}
                                    disabled={hasActionPending}
                                    className="mcm-ws-btn mcm-ws-btn--leave whitespace-nowrap px-3 py-2 rounded-lg border text-sm font-semibold cursor-pointer bg-rose-50 text-rose-700 border-rose-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {isActionPending ? 'Leaving...' : 'Leave'}
                                  </button>
                                </div>
                              ) : hasJoinedAnotherCampaign ? (
                                <button
                                  onClick={() => handleSwitchCampaign(campaign)}
                                  disabled={hasActionPending}
                                  className="mcm-ws-btn mcm-ws-btn--warn w-fit whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isActionPending ? 'Switching...' : join.buttonLabel}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleJoinCampaign(campaign)}
                                  disabled={hasActionPending || join.action !== 'join'}
                                  className="mcm-ws-btn mcm-ws-btn--join w-fit whitespace-nowrap px-4 py-2 rounded-lg border text-sm font-semibold cursor-pointer bg-emerald-600 text-white border-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {join.buttonLabel}
                                </button>
                              )}
                            </div>

                            <div className="mcm-ws-progress mt-3 flex flex-col gap-1">
                              <div className="mcm-ws-progress-row flex items-center min-w-[160px] w-full gap-2">
                                {!hasAnalytics ? (
                                  <div className="flex-1 min-w-[120px]">
                                    <div className="mcm-ws-bar-skel w-full bg-stone-200 rounded-xs h-4 animate-pulse" />
                                  </div>
                                ) : (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <div className="flex-1 min-w-[120px] cursor-pointer">
                                        <div className="mcm-ws-bar w-full bg-stone-300/50 rounded-xs h-3 relative overflow-hidden flex">
                                          {pendingPercentage > 0 && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div
                                                  className="mcm-ws-bar-pending h-full bg-slate-400 transition-all duration-300"
                                                  style={{ width: `${pendingPercentage}%` }}
                                                />
                                              </TooltipTrigger>
                                              <TooltipContent side="top">
                                                Pending: {pendingPercentage}%
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                          {connectedPercentage > 0 && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div
                                                  className="mcm-ws-bar-connected h-full bg-green-400 transition-all duration-300"
                                                  style={{ width: `${connectedPercentage}%` }}
                                                />
                                              </TooltipTrigger>
                                              <TooltipContent side="top">
                                                Connected: {connectedPercentage}%
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                          {notAnsweredPercentage > 0 && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div
                                                  className="mcm-ws-bar-noanswer h-full bg-orange-300 transition-all duration-300"
                                                  style={{ width: `${notAnsweredPercentage}%` }}
                                                />
                                              </TooltipTrigger>
                                              <TooltipContent side="top">
                                                No Answer: {notAnsweredPercentage}%
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="mcm-ws-pop w-80 p-3">
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <div className="mcm-ws-pop-title text-sm text-gray-900 font-semibold capitalize">
                                            Dialed In Total
                                          </div>
                                          <div className="mcm-ws-pop-count min-w-5 min-h-5 px-1.5 py-0.5 text-xs font-medium border border-300/50 bg-stone-100 hover:bg-stone-50 text-slate-500 rounded-sm">
                                            {assignedLeads || 0}
                                          </div>
                                        </div>
                                        <div className="border-t border-stone-300/50 flex flex-col gap-2 pt-2">
                                          <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1 justify-between">
                                              <span className="text-xs text-slate-500">
                                                Pending
                                              </span>
                                              <div className="flex items-center gap-2 min-w-10">
                                                <span className="text-xs text-slate-500 whitespace-nowrap font-medium text-start">
                                                  {pendingPercentage}%
                                                </span>
                                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                                  |
                                                </span>
                                                <span className="text-xs text-slate-500 whitespace-nowrap font-medium text-start">
                                                  {pending} of {assignedLeads}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex gap-2">
                                              <div className="flex-1 min-w-[100px]">
                                                <div className="w-full bg-slate-100 rounded-xs h-4 relative overflow-hidden">
                                                  <div
                                                    className="h-full bg-slate-400 rounded-xs transition-all duration-300 flex items-center justify-center"
                                                    style={{ width: `${pendingPercentage}%` }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1 justify-between">
                                              <span className="text-xs text-slate-500">
                                                Answered
                                              </span>
                                              <div className="flex items-center gap-2 min-w-10">
                                                <span className="text-xs text-slate-500 whitespace-nowrap font-medium text-start">
                                                  {connectedPercentage}%
                                                </span>
                                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                                  |
                                                </span>
                                                <span className="text-xs text-slate-500 whitespace-nowrap font-medium text-start">
                                                  {connected} of {assignedLeads}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex gap-2">
                                              <div className="flex-1 min-w-[100px]">
                                                <div className="w-full bg-green-100 rounded-xs h-4 relative overflow-hidden">
                                                  <div
                                                    className="h-full bg-green-400 rounded-xs transition-all duration-300 flex items-center justify-center"
                                                    style={{ width: `${connectedPercentage}%` }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1 justify-between">
                                              <span className="text-xs text-slate-500">
                                                No Answer
                                              </span>
                                              <div className="flex items-center gap-2 min-w-10">
                                                <span className="text-xs text-slate-500 whitespace-nowrap font-medium text-start">
                                                  {notAnsweredPercentage}%
                                                </span>
                                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                                  |
                                                </span>
                                                <span className="text-xs text-slate-500 whitespace-nowrap font-medium text-start">
                                                  {notAnswered} of {assignedLeads}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex gap-2">
                                              <div className="flex-1 min-w-[100px]">
                                                <div className="w-full bg-orange-100 rounded-xs h-4 relative overflow-hidden">
                                                  <div
                                                    className="h-full bg-orange-300 rounded-xs transition-all duration-300 flex items-center justify-center"
                                                    style={{ width: `${notAnsweredPercentage}%` }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                                <button
                                  type="button"
                                  className="mcm-ws-refresh w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-primary hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={!campaign?._id || isRefreshingAnalytics}
                                  onClick={() => {
                                    if (!campaign?._id || isRefreshingAnalytics) return;
                                    refreshCampaignAnalytics(campaign._id);
                                  }}
                                  title="Refresh analytics"
                                >
                                  {isRefreshingAnalytics ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCcw className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : assignedNotRunning.length ? (
                    /* Not "no campaigns found": this person has campaigns,
                       none of them are running, and saying so is the whole
                       point of the section below. */
                    <div className="mcm-ws-quiet w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-center">
                      <p className="mcm-ws-quiet-title text-sm font-semibold text-slate-700">
                        Nothing is running for you right now
                      </p>
                      <p className="mcm-ws-quiet-sub mt-1 text-xs text-slate-500">
                        The campaigns you are assigned to are listed below, with the state each
                        one is in.
                      </p>
                    </div>
                  ) : (
                    <div className="mcm-ws-empty w-full h-full flex justify-center flex-col gap-2 items-center py-10 text-gray-500">
                      <img src={NotFound} alt="BusyImage" className="min-w-36 max-w-36" />
                      <p className="mcm-ws-empty-title text-gray-900 text-sm whitespace-normal text-center">
                        No campaigns found
                      </p>
                    </div>
                  )}

                  {/* Assigned, but not something the agent can work yet.
                      These were hidden entirely - the list asked the server
                      only for PROCESSING campaigns - so an owner who assigned
                      himself to a campaign he had not started saw an empty
                      workspace and reported it as a bug. They are shown
                      plainly, with no Join button to mislead anybody, and
                      collapsed when there are enough of them to bury the
                      running ones. */}
                  {assignedNotRunning.length ? (
                    <div className="mcm-ws-assigned mt-4 rounded-xl border border-slate-200 bg-slate-50/60">
                      <button
                        type="button"
                        onClick={() => setShowNotRunning((open) => !open)}
                        className="mcm-ws-assigned-toggle flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left"
                      >
                        <span className="mcm-ws-assigned-title text-sm font-semibold text-slate-700">
                          Assigned, not running ({assignedNotRunning.length})
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                            showNotRunning || assignedNotRunning.length <= 4 ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {showNotRunning || assignedNotRunning.length <= 4 ? (
                        <ul className="mcm-ws-assigned-list border-t border-slate-200 divide-y divide-slate-200">
                          {assignedNotRunning.map((row) => {
                            const assigned: any = row.campaign;
                            return (
                              <li
                                key={assigned?._id}
                                className="mcm-ws-assigned-row flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                              >
                                <div className="min-w-0">
                                  <p className="mcm-ws-assigned-name truncate text-sm font-medium text-slate-800">
                                    {assigned?.name || 'Untitled Campaign'}
                                  </p>
                                  <p className="mcm-ws-assigned-meta text-[11px] text-slate-500">
                                    {CAMPAIGN_TYPE_NAME[assigned?.dialMethod] ||
                                      assigned?.dialMethod ||
                                      'Preview'}
                                  </p>
                                </div>
                                <span
                                  className={`mcm-ws-state whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-medium ${
                                    row.state === 'paused'
                                      ? 'is-paused border-rose-200 bg-rose-50 text-rose-600'
                                      : 'is-waiting border-sky-200 bg-sky-50 text-sky-600'
                                  }`}
                                >
                                  {row.label}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}

                      {assignedListIsPartial ? (
                        <p className="mcm-ws-assigned-note border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500">
                          This company has more campaigns than one page holds, so an older
                          assignment may not be listed here.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                    </>
                  )}
                </div>
              ) : (
                <div className="mcm-ws-queues w-full h-full flex flex-col gap-3 relative">
                  <div className="mcm-ws-search relative w-full">
                    <Input
                      placeholder="Search assigned queue"
                      className="pl-10 w-full bg-slate-50 border-slate-200 focus-visible:bg-white"
                      IconPosition="left-0 pl-2 inset-y-0"
                      value={queueSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.startsWith(' ')) return;
                        setQueueSearch(value);
                      }}
                      Icon={<SearchLine className="text-gray-700" />}
                    />
                    {isQueueLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader variant="blue" size="sm" />
                      </div>
                    )}
                  </div>

                  <div className="w-full flex-1 overflow-y-auto pr-1">
                    {isQueueError ? (
                      <div className="mcm-ws-error w-full flex justify-center items-center py-10 text-gray-500">
                        Failed to load call queue data.
                      </div>
                    ) : isQueueLoading ? null : callQueueData?.length ? (
                      <div className="mcm-ws-queue-grid w-full grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                        {callQueueData?.map((queue: any, index: number) => (
                          <div key={queue?.uuid || index} className="mcm-ws-queue">
                            <CallQueueCard queue={queue} refetch={refetchCallQueue} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mcm-ws-empty w-full h-full flex justify-center flex-col gap-2 items-center py-10 text-gray-500">
                        <img src={NotFound} alt="BusyImage" className="min-w-36 max-w-36" />
                        <p className="mcm-ws-empty-title flex items-center justify-center text-gray-900">
                          No call queue found.
                        </p>
                        <p className="mcm-ws-empty-sub text-sm text-gray-700">
                          Call queues assigned to you will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Dialog
        open={micPermissionDialogOpen}
        onOpenChange={(open) => {
          setMicPermissionDialogOpen(open);
          if (!open) setPendingCampaign(null);
        }}
      >
        <DialogContent
          className="mcm-ws-mic w-[calc(100vw-2rem)] max-w-[520px] gap-0 rounded-xl border border-gray-200 bg-white p-0 shadow-2xl"
          showCloseButton={false}
        >
          <div className="w-full px-5 py-4 sm:px-7 sm:py-6">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">
                Microphone Permission Required
              </h3>
              <button
                type="button"
                aria-label="Close microphone permission dialog"
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                onClick={() => {
                  setMicPermissionDialogOpen(false);
                  setPendingCampaign(null);
                }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 py-5">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ucass-active-bg text-primary">
                  <Mic className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold leading-6 text-gray-800 sm:text-base">
                  Campaign calling needs microphone access before it can start.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <Info className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold leading-6 text-gray-800 sm:text-base">
                  {micPermissionState === 'denied'
                    ? 'Microphone permission is blocked in browser site settings. Please allow microphone for this site, then continue.'
                    : 'Click Allow Microphone and accept the browser permission prompt to continue.'}
                </p>
              </div>

              {micPermissionMessage ? (
                <div className="flex items-start gap-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold leading-6 text-red-700">
                    {micPermissionMessage}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMicPermissionDialogOpen(false);
                  setPendingCampaign(null);
                }}
                className="h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleMicPermissionConfirm()}
                className="h-12 rounded-xl"
              >
                {micPermissionState === 'denied' ? 'I Enabled Microphone' : 'Allow Microphone'}
                <Mic className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <CampaignLeaveDialog
        campaignName={String(leaveRequest?.name || '')}
        open={Boolean(leaveRequest)}
        onCancel={() => setLeaveRequest(null)}
        onConfirm={async (change) => {
          const campaign = leaveRequest;
          setLeaveRequest(null);
          if (!campaign) return;
          await handleLeaveCampaign(campaign);
          /* The duty change follows the leave, never precedes it: a break
             written first would take the person off every queue while the
             campaign still held them. */
          if (change) setDuty(change as any);
        }}
      />
    </>
  );
};

export default MyCampaignListStandalone;

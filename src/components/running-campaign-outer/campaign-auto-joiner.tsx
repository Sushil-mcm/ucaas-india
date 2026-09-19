import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { isServerDialed } from '@/lib/campaign-dial-mode';
import {
  CAMPAIGN_TABS_STORAGE_KEY,
  autoJoinDecision,
  dropRingTab,
  electRingOwner,
  hasCampaignLeft,
  makeTabId,
  pickAutoJoinCampaign,
  publishRingTab,
  readRingTabs,
} from '@/lib/campaign-auto-join';
import {
  CAMPAIGN_RING_STORAGE_KEY,
  clearCampaignRingContact,
  readCampaignRingRecord,
  writeCampaignRingContact,
} from '@/lib/campaign-join-state';
import { useAgentDuty } from '@/hooks/use-agent-duty';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';
import { decideRingClaim } from '@/lib/ring-claim';
import { getRunningCampaigns, makeCallQueueAvailable } from '@/services/api';

/* The campaigns workspace (`/my-campaigns`) joins an assigned agent to a
   running campaign by itself - but only while that page is open. An agent
   who signed in and went to the phone book, the inbox, or a report was never
   joined, and the dialer had an idle seat it had been told about and could
   not use. The owner's rule (14 Sep): "as long as the agent was picked for
   the campaign they should be ready to accept calls."

   So the same decision runs here, on every signed-in page, with nothing on
   screen. It steps aside on `/my-campaigns` itself, where the page still
   owns the join and the wording on its cards; and it does not publish a tab
   heartbeat while stepped aside, so the page's tab id is the only one this
   window puts up for the ring election.

   Everything else is the page's behaviour, kept identical on purpose:
   one elected tab per browser joins (`electRingOwner`); the gates in
   `autoJoinDecision` (member, running, on duty, off the phone, registered,
   microphone already allowed); one attempt per campaign per session; the
   roster told after the queue write, never before; and a failure puts
   nothing on screen but a console line - the agent did not ask for this.
   A preview campaign is joined without pulling records: those are fetched
   when the agent opens the dialer and asks for the next contact. */

const PAGE_OWNS_JOIN = '/my-campaigns';

const getRandomCallerId = (campaign: any) => {
  if (!Array.isArray(campaign?.callerId) || campaign.callerId.length === 0) return null;
  return campaign.callerId[Math.floor(Math.random() * campaign.callerId.length)];
};

const microphonePermissionState = async (): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return 'unsupported';
  if (!navigator.permissions?.query) return 'prompt';
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    if (result.state === 'granted') return 'granted';
    if (result.state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'prompt';
  }
};

const CampaignAutoJoiner = () => {
  const location = useLocation();
  const enabled = !String(location?.pathname || '').startsWith(PAGE_OWNS_JOIN);

  const { socketEventsManager } = useSocketEvents();
  const { joinedCampaignId, setJoinedCampaignId, setActiveCampaign, sessions, isRegistered, sipContact } =
    useDialpad();
  const { user } = useUser();
  const { mine: myDuty } = useAgentDuty();

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

  /* The same query, by the same key, as the workspace: react-query shares
     it, so this adds no request while the page is open and one 20-second
     poll when it is not. */
  const { data: campaignList = [], isLoading: isCampaignListLoading } = useQuery({
    queryKey: ['getRunningCampaignsList'],
    queryFn: () => getRunningCampaigns(),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    refetchInterval: 20 * 1000,
    refetchOnWindowFocus: true,
    enabled: enabled && Boolean(userDetailsPayload.user_uuid),
  });

  /* Tab election, as on the page - but only while this component is the
     one joining for this window. */
  const tabIdRef = useRef<string>('');
  if (!tabIdRef.current) tabIdRef.current = makeTabId();
  const [tabsVersion, setTabsVersion] = useState(0);
  const [ringRecordVersion, setRingRecordVersion] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const tabId = tabIdRef.current;
    const beat = () => {
      publishRingTab(tabId, document.visibilityState === 'visible', Date.now());
      setTabsVersion((version) => version + 1);
    };
    const leave = () => dropRingTab(tabId);
    const onStorage = (event: StorageEvent) => {
      if (event.key === CAMPAIGN_TABS_STORAGE_KEY) setTabsVersion((version) => version + 1);
      else if (!event.key || event.key === CAMPAIGN_RING_STORAGE_KEY)
        setRingRecordVersion((version) => version + 1);
    };
    beat();
    const id = setInterval(beat, 5000);
    document.addEventListener('visibilitychange', beat);
    window.addEventListener('focus', beat);
    window.addEventListener('blur', beat);
    window.addEventListener('pagehide', leave);
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', beat);
      window.removeEventListener('focus', beat);
      window.removeEventListener('blur', beat);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('storage', onStorage);
      leave();
    };
  }, [enabled]);

  const browserRing = useMemo(() => {
    void ringRecordVersion;
    return readCampaignRingRecord();
  }, [ringRecordVersion]);
  const ownsRing = useMemo(() => {
    void tabsVersion;
    return enabled && electRingOwner(readRingTabs()) === tabIdRef.current;
  }, [enabled, tabsVersion]);

  /* The microphone cannot be asked for without a gesture, so a join happens
     only when it has already been granted; re-checked when duty changes,
     which is the moment an agent is most likely to have just pressed a Join
     somewhere and allowed it. */
  const [microphoneGranted, setMicrophoneGranted] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void microphonePermissionState().then((state) => {
      if (!cancelled) setMicrophoneGranted(state === 'granted');
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, myDuty?.duty, tabsVersion]);

  const attemptedRef = useRef<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const runAutoJoin = useCallback(
    async (campaign: any) => {
      const campaignId = String(campaign?._id || '').trim();
      if (!campaignId) return;
      attemptedRef.current.add(campaignId);
      setPending(true);
      setActiveCampaign({ ...campaign, selectedCallerId: getRandomCallerId(campaign) });
      setJoinedCampaignId(campaignId);
      const serverDialled = isServerDialed(campaign?.dialMethod);
      try {
        try {
          await makeCallQueueAvailable({
            campaign_uuid: campaignId,
            status: 'Available',
            state: 'Waiting',
            sip_contact: sipContact,
          });
        } catch (error) {
          /* A preview campaign may have no queue - the engine counts its
             members from their sessions - so a refused write is not a failed
             join there. A server-dialled campaign cannot ring somebody who is
             not Available on its queue, so for it the write has to succeed. */
          if (serverDialled) throw error;
          console.warn('[campaign] preview join: queue status not written', error);
        }
        writeCampaignRingContact(campaignId, sipContact);
        setRingRecordVersion((version) => version + 1);
        socketEventsManager?.emit('campaign-event-logs', {
          campaignDetail: { campaignName: campaign?.name, campaignId, companyId: campaign?.companyId },
          eventType: 'INSERT',
          userDetail: { ...userDetailsPayload, caller_id: campaign?.callerId },
        });
        handleAlert({
          type: 'success',
          text: serverDialled
            ? `You are on ${campaign?.name || 'the campaign'} - calls will ring here.`
            : `You are on ${campaign?.name || 'the campaign'} - open the dialer to take the next contact.`,
        });
      } catch (error) {
        console.error('[campaign] could not join automatically', error);
        setJoinedCampaignId(null);
        setActiveCampaign(null);
        clearCampaignRingContact();
        setRingRecordVersion((version) => version + 1);
      } finally {
        setPending(false);
      }
    },
    [setActiveCampaign, setJoinedCampaignId, sipContact, socketEventsManager, userDetailsPayload],
  );

  /* Back on duty after a break or a sign-out: the join is sent again for the
     campaign this tab already works, because the break removed this person
     from the campaign's roster (the DELETE the dialer sends) and nothing put
     them back - so the server said "you are not on duty for this campaign"
     to somebody whose chip said On duty (14 Sep). The server now also
     honours membership, but the roster is what the supervisor board reads. */
  const previousDutyRef = useRef<string>('');
  useEffect(() => {
    const duty = String(myDuty?.duty || '');
    const previous = previousDutyRef.current;
    previousDutyRef.current = duty;
    if (!enabled || !ownsRing || duty !== 'on_duty' || previous === 'on_duty' || !previous) return;
    const joined = String(joinedCampaignId || '').trim();
    if (!joined) return;
    const campaign = (campaignList as any[]).find((row: any) => String(row?._id || '') === joined);
    if (!campaign) return;
    attemptedRef.current.delete(joined);
    void runAutoJoin(campaign);
    // Only the duty transition matters here; the rest is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myDuty?.duty, enabled, ownsRing]);

  /* The window the agent is looking at takes the ring. Until 14 Sep the
     election only decided which window may join; moving a ring that already
     pointed at another window was a button, and a call was auto-answered in
     a window the owner was not looking at. Now the elected window, once it
     has held the election for a moment, points the campaign at itself. The
     rule is in lib/ring-claim.ts; this is the timing and the write. */
  const ownedSinceRef = useRef<number>(0);
  const claimingRef = useRef(false);
  useEffect(() => {
    if (!enabled || !ownsRing) {
      ownedSinceRef.current = 0;
      return;
    }
    if (!ownedSinceRef.current) ownedSinceRef.current = Date.now();
    const hasLiveCall = Object.values(sessions || {}).some((session: any) => {
      const status = String(session?.status || '').toLowerCase();
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
    if (!decision.claim || claimingRef.current) return;
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
        writeCampaignRingContact(decision.campaignId, sipContact);
        setRingRecordVersion((version) => version + 1);
        if (String(joinedCampaignId || '') !== decision.campaignId) {
          setJoinedCampaignId(decision.campaignId);
          if (campaign) setActiveCampaign({ ...campaign, selectedCallerId: getRandomCallerId(campaign) });
        }
        console.log(`[campaign] this window took the ring for ${decision.campaignId} (${sipContact})`);
      } catch (error) {
        console.error('[campaign] could not move the ring to this window', error);
      } finally {
        claimingRef.current = false;
      }
    })();
    /* tabsVersion ticks every 5 s with the heartbeat, which is what re-runs
       this once the settle time has passed. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ownsRing, tabsVersion, browserRing.campaignId, browserRing.contact, sipContact, isRegistered, sessions]);

  useEffect(() => {
    if (!enabled || !ownsRing || isCampaignListLoading || pending) return;
    const isBusy = Object.keys(sessions || {}).length > 0;
    const picked = pickAutoJoinCampaign(campaignList as any[], (campaign: any) =>
      autoJoinDecision({
        campaign,
        userUuid: userDetailsPayload.user_uuid,
        isServerDialled: isServerDialed(campaign?.dialMethod),
        duty: (myDuty?.duty as any) || '',
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
    if (!campaignId || attemptedRef.current.has(campaignId)) return;
    void runAutoJoin(picked.campaign);
  }, [
    browserRing.campaignId,
    campaignList,
    enabled,
    isCampaignListLoading,
    isRegistered,
    joinedCampaignId,
    microphoneGranted,
    myDuty?.duty,
    ownsRing,
    pending,
    runAutoJoin,
    sessions,
    sipContact,
    userDetailsPayload.user_uuid,
  ]);

  return null;
};

export default CampaignAutoJoiner;

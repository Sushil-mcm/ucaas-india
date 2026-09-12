import { campaignWindow } from '@/lib/campaign-window';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';

import TableManager from '@/components/custom/table-manager';
import SideDrawer from '@/components/custom/side-drawer';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { Ic, McmIconSprite } from '@/components/mcm/icons';
import { capitalizeFirstLetter, convertDateFormateApis, handleAlert } from '@/lib/utils';
import {
  allNumbersList,
  campaignAnalytics,
  campaignList,
  deleteCampaign,
  getCampaignActivtyLogs,
  getCampaignDetail,
  playPauseCampaign,
} from '@/services/api';
import { findDidRow, numberRoutedToCampaign, restoreNumberRouting } from './inbound-routing';
import { useCompanyFeatures } from '@/hooks/rbac';
import useDebounce from '@/hooks/use-debounce';
import { SocketEvents } from '@/context/socket-events-context';
import { HEALTH_LABEL } from '@/lib/campaign-dial-mode';
import type { IAutoDialer } from '../power-predictive/campaign-list';

import AddEditCampaign from './add-edit-campaign';
import AgentDetailsModal from './modal/agent-details-modal';
import { DIALER_TYPE } from './add-edit-campaign/consts';
import type { CampaignAnalytics } from './campaign-ui';
import {
  DIAL_METHOD_LABEL,
  OutcomeBar,
  OutcomeLegend,
  StatusPill,
  fmt,
  num,
  pct,
  readOutcomes,
} from './campaign-ui';
import '@/components/mcm/mcm-page.css';
import './campaign.css';

/**
 * MCM Unified Console — Campaigns.
 *
 * Ported from the design artifact's outbound module. The artifact's argument
 * is that a campaign row is an object you operate, not a record you read: the
 * four contact outcomes sit on every row rather than behind a popover, and the
 * transport controls are on the row itself.
 *
 * Every figure comes from `campaignAnalytics`, which is what the platform
 * actually measures today. The artifact also showed pacing — abandon rate
 * against a compliance cap, idle and effective-idle agents, outbound line
 * allocation, adjusted calls per agent. None of those exist in any current
 * endpoint, so they are not drawn here; the panel footer says so rather than
 * showing a plausible number nobody computed.
 */

/**
 * The outcome counts for one campaign, asked of the server rather than read
 * from the cached snapshot.
 *
 * `campaign_analytics` is a document the API rewrites only when something asks
 * it to, so a campaign nobody has refreshed carries whatever was true last
 * time — which is why rows showed a solid "no answer" bar and 0 answered while
 * their own contacts had been reached. The call-statistics endpoint counts the
 * leads themselves at the moment of asking.
 *
 * One query per campaign, shared by the outcome bar and the Answered count
 * through the same cache key.
 */
const useCampaignOutcomeStates = (campaignId: string) =>
  useQuery({
    queryKey: ['campaignOutcomeStates', campaignId],
    queryFn: () =>
      getCampaignActivtyLogs({
        page: 1,
        limit: 1,
        filters: [{ key: 'campaign_uuid', value: campaignId }],
      }),
    select: (response: any) => response?.data?.data?.result?.states || null,
    enabled: Boolean(campaignId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

/**
 * The server's own state names, in the shape the outcome bar reads.
 *
 * `DialedButNotAnswered` is every lead with an outcome that is not ANSWERED,
 * so no-answer, busy, failed and machine all land in the amber segment — the
 * same grouping the cached analytics used.
 */
const analyticsFromStates = (states: any): CampaignAnalytics | null => {
  if (!states) return null;
  const assigned = num(states.totalCall);
  const dialed = num(states.DialedCall);
  const answered = num(states.connected);
  const dnc = num(states.dnc);
  return {
    assignedLeads: assigned,
    dialedLeads: dialed,
    answeredLeads: answered,
    totalCallNotAnswered: num(states.DialedButNotAnswered),
    totalDnc: dnc,
    /* "Still to call" is the server's own count of leads that are scheduled,
       in progress or booked for a callback and not DNC - the same test that
       keeps a campaign running - so "N left" here agrees with the agent's card
       and the monitor. A lead reached once and due to be tried again counts as
       left; the remainder of the three outcomes would have said 0. Rows from a
       server that does not send the figure fall back to that remainder. */
    ...(states.PendingCall == null ? {} : { pendingLeads: num(states.PendingCall) }),
  };
};

/** The outcome bar on a row, drawn from the live counts once they arrive. */
const OutcomeCell = ({ campaign }: { campaign: any }) => {
  const { data: states } = useCampaignOutcomeStates(String(campaign?._id || ''));
  return <OutcomeBar analytics={analyticsFromStates(states) || campaign?.campaignAnalytics} />;
};

/**
 * How many of this campaign's leads were actually answered.
 *
 * The column used to read `campaignAnalytics.answeredLeads` and show it as a
 * percentage. Two things were wrong with that. `campaign_analytics` is a
 * SNAPSHOT the API rewrites when somebody asks it to — a campaign nobody has
 * refreshed carries whatever was true the last time, which is why rows sat at
 * 0% while their bar said 100% dialled. And a percentage answers a question
 * about rate when the question being asked is "how many people did we reach".
 *
 * So this asks the call-statistics endpoint instead, which counts the leads
 * themselves — `systemDisposition === "ANSWERED"` — at the moment of asking.
 * The cached figure is shown until that lands, so the cell is never blank.
 */
const AnsweredCount = ({
  campaign,
  onOpen,
}: {
  campaign: any;
  onOpen: (campaign: any) => void;
}) => {
  const campaignId = String(campaign?._id || '');
  const cached = num(campaign?.campaignAnalytics?.answeredLeads);
  const { data: states } = useCampaignOutcomeStates(campaignId);
  const answered = states ? num(states.connected) : cached;

  if (!answered) {
    return (
      <span className="num" style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink-4)' }}>
        0
      </span>
    );
  }

  return (
    <CustomTooltip text="Leads that answered — open them" side="top">
      <button
        type="button"
        className="lnk num"
        style={{ fontWeight: 800, fontSize: 13 }}
        onClick={(event) => {
          event.stopPropagation();
          onOpen(campaign);
        }}
      >
        {fmt(answered)}
      </button>
    </CustomTooltip>
  );
};

export interface ModalState {
  open: boolean;
  data: any[];
  type: string | null;
}

const STATUS_FILTERS: Array<[string, string]> = [
  ['ALL', 'All'],
  ['PROCESSING', 'Running'],
  ['PAUSE', 'Paused'],
  ['NEW', 'Not started'],
  ['COMPLETED', 'Completed'],
];

const MODE_FILTERS: Array<[string, string]> = [
  ['ALL', 'All modes'],
  [DIALER_TYPE.PREVIEW, 'Preview'],
  [DIALER_TYPE.NORMAL, 'Progressive'],
  [DIALER_TYPE.PREDICTIVE, 'Predictive'],
  [DIALER_TYPE.INBOUND, 'Inbound'],
];

/**
 * `embedded` is set when Performance -> Campaigns renders this list beneath its
 * own stat cards. In that case the page title and the KPI strip would be a
 * second header and a second set of totals on the same screen, so both are
 * dropped and the frame stops claiming full height.
 */
const Campaign = ({
  embedded = false,
  globalSearch,
}: {
  embedded?: boolean;
  /* Performance ▸ Campaigns' centralized toolbar search (index.tsx →
     campaign-activity-tab.tsx). The page's own "Search campaigns" input
     below stays exactly as it was — this only feeds the table when that
     local box is empty, so typing locally still wins without either input
     needing to know about the other. */
  globalSearch?: string;
}) => {
  const navigate = useNavigate();
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const campaignAccess = features?.plan_features?.campaign?.action;

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const effectiveSearch = search || globalSearch || '';
  const debouncedSearch = useDebounce(effectiveSearch, 1000);

  const [modalState, setModalState] = useState<ModalState>({ open: false, type: null, data: [] });
  const [drawerState, setDrawerState] = useState<{ isModalOpen: boolean; selectedCampaign: any }>({
    isModalOpen: false,
    selectedCampaign: null,
  });
  const [refreshingCampaignIds, setRefreshingCampaignIds] = useState<Record<string, boolean>>({});
  const { socketEventsManager } = useContext(SocketEvents);
  /* The dialer service pushes a board per running campaign every few seconds
     on "campaign-live-stats". Kept here by campaign id so each row can show
     what it is doing right now; a board older than 30 s is treated as gone. */
  const [liveBoards, setLiveBoards] = useState<Record<string, { board: any; at: number }>>({});
  useEffect(() => {
    if (!socketEventsManager) return;
    const onLive = (payload: any) => {
      const id = String(payload?.campaignId || '');
      if (!id) return;
      setLiveBoards((prev) => ({ ...prev, [id]: { board: payload, at: Date.now() } }));
    };
    const onState = () => {
      queryClient.invalidateQueries({ queryKey: ['getCampaignListForPreview'] });
      queryClient.invalidateQueries({ queryKey: ['campaignListForKpis'] });
    };
    const onAnalytics = (payload: any) => {
      const id = String(payload?.campaignId || '');
      if (!id) return;
      mutateCampaignAnalytics({ campaignId: id });
      /* The row's bar and Answered count are counted live, not read from the
         snapshot that mutation rewrites; they need asking again too. */
      queryClient.invalidateQueries({ queryKey: ['campaignOutcomeStates', id] });
    };
    socketEventsManager.on('campaign-live-stats', onLive);
    socketEventsManager.on('campaign-state-update', onState);
    socketEventsManager.on('campaign-analytics-updated', onAnalytics);
    return () => {
      socketEventsManager.off('campaign-live-stats', onLive);
      socketEventsManager.off('campaign-state-update', onState);
      socketEventsManager.off('campaign-analytics-updated', onAnalytics);
    };
  }, [socketEventsManager]);
  const liveBoardFor = (id: string) => {
    const entry = liveBoards[String(id)];
    return entry && Date.now() - entry.at < 30000 ? entry.board : null;
  };
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<IAutoDialer | null>(null);

  /* ── aggregates for the KPI strip ────────────────────────────────────
     The table is paginated, so totals cannot come from the visible page.
     This pulls the campaign set once and counts it, the same way the
     inventory pages pull their full list for a summary. */
  const { data: allCampaigns = [], isLoading: isLoadingKpis } = useQuery({
    queryKey: ['campaignListForKpis'],
    enabled: !embedded,
    queryFn: () =>
      campaignList({ page: 1, limit: 500, filters: [], sort: { key: 'createdAt', desc: true } }),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    refetchOnWindowFocus: false,
  });

  const kpis = useMemo(() => {
    const rows: any[] = Array.isArray(allCampaigns) ? allCampaigns : [];
    const byStatus = (status: string) =>
      rows.filter((r) => String(r?.campaignStatus).toUpperCase() === status).length;

    const totals = rows.reduce(
      (acc, row) => {
        const o = readOutcomes(row?.campaignAnalytics);
        acc.assigned += o.assigned;
        acc.answered += o.answered;
        acc.noAnswer += o.noAnswer;
        acc.dnc += o.dnc;
        acc.pending += o.pending;
        acc.dialed += o.dialed;
        return acc;
      },
      { assigned: 0, answered: 0, noAnswer: 0, dnc: 0, pending: 0, dialed: 0 },
    );

    return {
      total: rows.length,
      running: byStatus('PROCESSING'),
      paused: byStatus('PAUSE'),
      scheduled: byStatus('NEW'),
      completed: byStatus('COMPLETED'),
      ...totals,
    };
  }, [allCampaigns]);

  /* ── mutations ────────────────────────────────────────────────────── */
  const invalidateCampaigns = () => {
    queryClient.invalidateQueries(['getCampaignList']);
    queryClient.invalidateQueries({ queryKey: ['getCampaignListForPreview'] });
    queryClient.invalidateQueries({ queryKey: ['campaignListForKpis'] });
  };

  const { mutate: mutateStatus } = useMutation({
    mutationFn: (payload: any) => playPauseCampaign(payload),
    onSuccess: (data: any, variables: any) => {
      if (data?.status !== 200) return;
      invalidateCampaigns();
      if (variables?.campaignStatus === 'RESCHEDULED') {
        handleAlert({ text: 'Campaign has been rescheduled successfully', type: 'success' });
        return;
      }
      /* Start and pause leave you on the list.
         Starting used to navigate to the live board, which is a different job:
         this button decides whether the campaign is running - whether its
         agents can pick it up and it begins dialling - and being thrown onto
         another page every time made pausing and restarting a few campaigns in
         a row unusable. The eye button is how you open the board.
         Said out loud instead, because a row changing its own status chip is
         easy to miss. */
      if (variables?.campaignStatus === 'PROCESSING') {
        /* Starting a campaign outside its calling hours used to say "Campaign
           started. Agents can now join and start dialling" and then, a beat
           later, pop up "has stopped: calling hours ended". Both were on screen
           at once and the first one was simply untrue - the engine pauses it
           again immediately, so no agent can dial anything.
           The window is decided from the campaign's own hours and timezone, the
           same judgement the engine makes, so the two agree. Closed: raise the
           hours notice this browser already knows how to show, and say nothing
           about starting. */
        const startedCampaign = (Array.isArray(allCampaigns) ? allCampaigns : []).find(
          (row: any) => String(row?._id || '') === String(variables?.campaignId || ''),
        );
        const window = startedCampaign ? campaignWindow(startedCampaign) : null;
        if (window && !window.open) {
          globalThis.dispatchEvent?.(
            new CustomEvent('mcm:campaign-hours-closed', { detail: startedCampaign }),
          );
        } else {
          handleAlert({
            text: 'Campaign started. Agents assigned to it can now join and start dialling.',
            type: 'success',
          });
        }
      } else if (variables?.campaignStatus === 'PAUSE') {
        handleAlert({ text: 'Campaign paused. No new calls will be placed.', type: 'success' });
      }
    },
  });

  const { mutate: mutateDeleteCampaign, isPending: isPendingDeleteCampaign } = useMutation({
    /* A deleted campaign must not keep a company number pointed at a queue
       that no longer exists: put the number's old rule back first. */
    mutationFn: async (id: string) => {
      try {
        const detail = (await getCampaignDetail({ campaignId: id }))?.data?.data?.result;
        const number = detail?.settings?.inbound?.did_number || (detail?.callerId || [])[0];
        if (number && detail?.queue_uuid) {
          const rows =
            (await allNumbersList({ page: 1, limit: 1000 }))?.data?.data?.result?.rows || [];
          const didRow = findDidRow(rows, number);
          if (didRow && numberRoutedToCampaign(didRow, detail)) {
            await restoreNumberRouting(
              didRow,
              detail?.settings?.inbound?.previous_business_hours || null,
            );
          }
        }
      } catch (error: any) {
        handleAlert({
          text: `The number's routing could not be put back: ${error?.message || 'unknown error'}`,
          type: 'warning',
        });
      }
      return deleteCampaign(id);
    },
    onSuccess: (data: any) => {
      if (!data?.data?.success) return;
      handleAlert({
        text: data?.data?.message || 'Campaign Deleted Successfully!',
        type: 'success',
      });
      setShowDeleteConfirmation(null);
      invalidateCampaigns();
    },
  });

  const { mutate: mutateCampaignAnalytics } = useMutation({
    mutationFn: campaignAnalytics,
    onSuccess: (response: any, variables: any) => {
      const analytics = response?.data?.data?.result;
      const campaignId = variables?.campaignId;
      if (!analytics || !campaignId) return;

      queryClient.setQueriesData({ queryKey: ['getCampaignListForPreview'] }, (oldData: any) => {
        const existing = oldData?.data?.data?.result;
        if (!existing) return oldData;
        const rows = Array.isArray(existing?.rows) ? existing.rows : [];
        return {
          ...oldData,
          data: {
            ...oldData.data,
            data: {
              ...oldData.data.data,
              result: {
                ...existing,
                rows: rows.map((c: any) =>
                  c?._id === campaignId ? { ...c, campaignAnalytics: analytics } : c,
                ),
              },
            },
          },
        };
      });
    },
    onSettled: (_data, _error, variables: any) => {
      const campaignId = variables?.campaignId;
      if (campaignId) setRefreshingCampaignIds((prev) => ({ ...prev, [campaignId]: false }));
    },
  });

  /* ── row actions ──────────────────────────────────────────────────── */
  const onPlayPause = (data: any) =>
    mutateStatus({
      campaignId: data?._id,
      campaignStatus: data?.campaignStatus === 'PROCESSING' ? 'PAUSE' : 'PROCESSING',
    });

  const onReSchedule = (data: any) =>
    mutateStatus({ campaignId: data?._id, campaignStatus: 'RESCHEDULED' });

  const handleNavigateToCallLogs = (type: string, data: any) =>
    navigate('/campaign/all-campaigns/compaign-call-logs', { state: { type, data } });

  /* The id also goes in the URL. Router state alone does not survive a reload
     or a pasted link, and the board would then have no campaign to show. */
  const openMonitor = (data: any) =>
    navigate(
      `/campaign/all-campaigns/compaign-record?campaignId=${encodeURIComponent(String(data?._id || ''))}`,
      { state: { campaignDetails: data, campaignId: data?._id } },
    );

  /* ── columns ──────────────────────────────────────────────────────── */
  const columns: any = [
    {
      header: 'Status',
      accessorKey: 'campaignStatus',
      cell: ({ row }: any) => {
        const board = liveBoardFor(row?.original?._id);
        const health = board?.health?.state ? HEALTH_LABEL[board.health.state] : null;
        if (!board || !health)
          return (
            <StatusPill
              status={row?.original?.campaignStatus}
              dialMethod={row?.original?.dialMethod}
            />
          );
        const tone =
          health.tone === 'good'
            ? 'pos'
            : health.tone === 'crit'
              ? 'neg'
              : health.tone === 'warn'
                ? 'warn'
                : 'neu';
        return (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}
          >
            <span
              className={`tag ${tone}`}
              /* The server's own sentence when it has one; otherwise the long
                 form of the label, which the chip itself no longer has room
                 for. Never an empty tooltip. */
              title={
                board?.health?.reason ||
                (board?.health?.state === 'agent_driven'
                  ? 'Agents dial from their own records; the system does not dial for them.'
                  : health.label)
              }
            >
              {health.tone === 'good' ? <span className="dot green" /> : null}
              {health.label}
            </span>
            <span className="src num">
              {num(board?.calls?.linesInUse)} call{num(board?.calls?.linesInUse) === 1 ? '' : 's'}{' '}
              up · {num(board?.agents?.idle)} idle of {num(board?.agents?.total)}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Campaign',
      accessorKey: 'name',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        const mode = DIAL_METHOD_LABEL[data?.dialMethod];
        return (
          <div style={{ minWidth: 0 }}>
            <div className="cname" title={capitalizeFirstLetter(data?.name)}>
              {capitalizeFirstLetter(data?.name)}
            </div>
            <div className="cmeta">
              {mode ? <span className="tag neu">{mode}</span> : null}
              {data?.createdAt ? (
                <>
                  <span className="sl">•</span>
                  <span>created {convertDateFormateApis(data.createdAt, 'DD MMM YYYY')}</span>
                </>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Window',
      accessorKey: 'startDate',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        if (!data?.startDate && !data?.endDate) {
          return <span style={{ color: 'var(--ink-4)' }}>—</span>;
        }
        return (
          <div className="num" style={{ fontWeight: 700 }}>
            {convertDateFormateApis(data?.startDate, 'DD MMM')} –{' '}
            {convertDateFormateApis(data?.endDate, 'DD MMM')}
          </div>
        );
      },
    },
    {
      header: 'Leads',
      accessorKey: 'totalCount',
      cell: ({ row }: any) => {
        const count = num(row?.original?.campaignAnalytics?.assignedLeads);
        if (!count) return <span style={{ color: 'var(--ink-4)' }}>—</span>;
        return (
          <button
            type="button"
            className="lnk num"
            style={{ fontWeight: 800 }}
            onClick={(event) => {
              event.stopPropagation();
              handleNavigateToCallLogs('ALL', row?.original);
            }}
          >
            {fmt(count)}
          </button>
        );
      },
    },
    {
      header: 'Contact outcomes',
      accessorKey: 'campaignAnalytics',
      enableSorting: false,
      cell: ({ row }: any) => {
        const data = row?.original || {};
        const campaignId = data?._id;
        const isRefreshing = !!refreshingCampaignIds[campaignId];
        return (
          <div className="outcomecell">
            <div style={{ flex: 1, minWidth: 100 }}>
              <OutcomeCell campaign={data} />
            </div>
            {/* Sits with the bar it refreshes, at the same weight as the row's
                other icon buttons. It was a lone full-strength circle floating
                between two columns, which read as a control belonging to
                neither. */}
            <CustomTooltip text="Refresh these figures" side="top">
              <button
                type="button"
                className="mini ic refreshbtn"
                disabled={isRefreshing || !campaignId}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!campaignId || isRefreshing) return;
                  setRefreshingCampaignIds((prev) => ({ ...prev, [campaignId]: true }));
                  mutateCampaignAnalytics({ campaignId });
                  /* The bar and the Answered count read the live counts, not
                     the snapshot this mutation rewrites, so they have to be
                     asked again as well. */
                  queryClient.invalidateQueries({
                    queryKey: ['campaignOutcomeStates', campaignId],
                  });
                }}
              >
                <Ic n="refresh" size={12} className={isRefreshing ? 'pulsing' : ''} />
              </button>
            </CustomTooltip>
          </div>
        );
      },
    },
    {
      header: 'Answered',
      accessorKey: 'answeredLeads',
      enableSorting: false,
      cell: ({ row }: any) => (
        <AnsweredCount
          campaign={row?.original}
          onOpen={(campaign) => handleNavigateToCallLogs('ANSWERED', campaign)}
        />
      ),
    },
    {
      header: 'Agents',
      accessorKey: 'members',
      cell: ({ getValue }: any) => {
        let members: any[] = [];
        try {
          const raw = getValue();
          const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
          members = Array.isArray(parsed)
            ? Array.from(new Map(parsed.map((item: any) => [item?.user_uuid, item])).values())
            : [];
        } catch {
          members = [];
        }

        if (!members.length) return <span style={{ color: 'var(--ink-4)' }}>Unassigned</span>;

        return (
          <CustomTooltip
            side="top"
            className="max-w-xs"
            text={
              <div className="flex flex-col gap-1 max-w-xs">
                <div className="font-semibold text-sm mb-1">
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                </div>
                <div className="text-xs max-h-40 overflow-y-auto">
                  {members.map((item: any, index: number) => (
                    <div key={index} className="py-1 border-b border-gray-300 last:border-0">
                      {item?.label ||
                        `${item?.first_name || ''} ${item?.last_name || ''}`.trim() ||
                        'Unknown'}
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <button
              type="button"
              className="lnk num"
              style={{ fontWeight: 800 }}
              onClick={(event) => {
                event.stopPropagation();
                setModalState({ open: true, type: 'members', data: members });
              }}
            >
              {members.length}
            </button>
          </CustomTooltip>
        );
      },
    },
    {
      /* An unlabelled column of icons gives a reader nothing to go on, and the
         header row looked like it simply ran out. Right-aligned to sit over the
         buttons below it. */
      header: () => <span style={{ display: 'block', textAlign: 'right' }}>Actions</span>,
      accessorKey: 'action',
      enableSorting: false,
      cell: ({ row }: any) => {
        const data = row?.original || {};
        const now = moment();
        const start = data?.startDate ? moment.utc(data.startDate).local() : null;
        const end = data?.endDate ? moment.utc(data.endDate).local() : null;
        const outOfWindow =
          data?.campaignStatus === 'COMPLETED' ||
          (!!start && now.isBefore(start, 'day')) ||
          (!!end && now.isAfter(end, 'day'));
        const isExpired = !!(end && now.isAfter(end, 'day'));
        const canReschedule = data?.campaignStatus !== 'COMPLETED' && isExpired;
        const isRunning = data?.campaignStatus === 'PROCESSING';

        const windowText = `${start ? start.format('D MMM') : '?'} to ${end ? end.format('D MMM') : '?'}`;
        const say = (text: string) => handleAlert({ text, type: 'warning' });
        const isCompleted = data?.campaignStatus === 'COMPLETED';
        /* Every icon does something: the action when it can, a sentence
           saying why not when it cannot. A greyed button with a tooltip that
           never shows read as "broken". */
        const act = (blocked: string | null, run: () => void) => () =>
          blocked ? say(blocked) : run();
        const startBlocked = isCompleted
          ? 'This campaign is completed. Edit it to change the dates, or reschedule it.'
          : outOfWindow
            ? `The campaign window is ${windowText}. Edit the dates to start it now.`
            : null;
        const rescheduleBlocked = canReschedule
          ? null
          : isCompleted
            ? 'A completed campaign cannot be rescheduled; make a new one.'
            : 'Only a campaign past its end date can be rescheduled.';
        /* An inbound line is always "running"; it can be edited or deleted as it is. */
        const isInboundLine = String(data?.dialMethod).toUpperCase() === 'INBOUND';
        const editBlocked =
          isRunning && !isInboundLine ? 'Pause the campaign first, then edit it.' : null;
        const deleteBlocked =
          isRunning && !isInboundLine ? 'Pause the campaign first, then delete it.' : null;
        const dim = (blocked: string | null) => (blocked ? { opacity: 0.45 } : undefined);

        return (
          <div className="rowacts" onClick={(event) => event.stopPropagation()}>
            {/* No Join here on purpose. This list is where a campaign is set
                up and operated - started, paused, rescheduled, edited. Taking
                a campaign as an agent belongs to the Campaign Workspace, which
                is where the join actually happens. */}
            {campaignAccess?.pause && String(data?.dialMethod).toUpperCase() !== 'INBOUND' && (
              <CustomTooltip
                text={isRunning ? 'Pause campaign' : startBlocked || 'Start campaign'}
                side="top"
              >
                <button
                  type="button"
                  className="mini ic"
                  style={dim(isRunning ? null : startBlocked)}
                  onClick={act(isRunning ? null : startBlocked, () => onPlayPause(data))}
                >
                  <Ic n={isRunning ? 'pause' : 'play'} size={12} />
                </button>
              </CustomTooltip>
            )}
            {campaignAccess?.summary && (
              <CustomTooltip text="Open live board" side="top">
                <button type="button" className="mini ic" onClick={() => openMonitor(data)}>
                  <Ic n="eye" size={12} />
                </button>
              </CustomTooltip>
            )}
            {campaignAccess?.pause && (
              <CustomTooltip text={rescheduleBlocked || 'Reschedule campaign'} side="top">
                <button
                  type="button"
                  className="mini ic"
                  style={dim(rescheduleBlocked)}
                  onClick={act(rescheduleBlocked, () => onReSchedule(data))}
                >
                  <Ic n="cal" size={12} />
                </button>
              </CustomTooltip>
            )}
            {campaignAccess?.edit && (
              <CustomTooltip text={editBlocked || 'Edit campaign'} side="top">
                <button
                  type="button"
                  className="mini ic"
                  style={dim(editBlocked)}
                  onClick={act(editBlocked, () =>
                    setDrawerState({ selectedCampaign: data, isModalOpen: true }),
                  )}
                >
                  <Ic n="sliders" size={12} />
                </button>
              </CustomTooltip>
            )}
            {campaignAccess?.delete && (
              <CustomTooltip text={deleteBlocked || 'Delete campaign'} side="top">
                <button
                  type="button"
                  className="mini ic"
                  style={dim(deleteBlocked)}
                  onClick={act(deleteBlocked, () => setShowDeleteConfirmation(data))}
                >
                  <Ic n="trash" size={12} />
                </button>
              </CustomTooltip>
            )}
          </div>
        );
      },
    },
  ];

  const KPI_CARDS = [
    {
      key: 'live',
      label: 'Live campaigns',
      value: (
        <>
          {kpis.running}
          <small> / {kpis.total}</small>
        </>
      ),
      sub: `${kpis.paused} paused · ${kpis.scheduled} scheduled`,
    },
    {
      key: 'leads',
      label: 'Leads assigned',
      value: fmt(kpis.assigned),
      sub: `${fmt(kpis.pending)} still callable`,
    },
    {
      key: 'dialed',
      label: 'Dialled',
      value: fmt(kpis.dialed),
      sub: `${pct(kpis.dialed, kpis.assigned)}% of assigned`,
    },
    {
      key: 'answered',
      label: 'Answered',
      value: `${pct(kpis.answered, kpis.dialed)}%`,
      sub: `${fmt(kpis.answered)} connects`,
      tone: 'good' as const,
    },
    {
      key: 'noanswer',
      label: 'No answer',
      value: `${pct(kpis.noAnswer, kpis.dialed)}%`,
      sub: fmt(kpis.noAnswer),
    },
    {
      key: 'dnc',
      label: 'DNC / blocked',
      value: `${pct(kpis.dnc, kpis.dialed)}%`,
      sub: fmt(kpis.dnc),
      tone: kpis.dnc > 0 ? ('warnv' as const) : undefined,
    },
  ];

  return (
    <div className={`mcm-page cmp${embedded ? ' embedded' : ''}`}>
      <McmIconSprite />
      <div className="page">
        {!embedded && (
          <div className="page-head">
            <div>
              <div className="eyebrow">Campaign · Outbound and inbound</div>
              <h1>Campaigns</h1>
              <p>
                Every calling campaign on one line: outbound dialling with its contact outcomes and
                agent load, and inbound lines where customers call the team. Open one to watch it
                live.
              </p>
            </div>
            <button className="btn ghost" type="button" onClick={() => navigate('/campaign/leads')}>
              <Ic n="users" />
              Lead groups
            </button>
            {campaignAccess?.add && (
              <button
                className="btn primary"
                type="button"
                onClick={() => setDrawerState({ selectedCampaign: null, isModalOpen: true })}
              >
                <Ic n="plus" />
                New campaign
              </button>
            )}
          </div>
        )}

        {!embedded && (
          <div className="kpis kpis-cols-6">
            {KPI_CARDS.map((kpi) => (
              <div className="kpi" key={kpi.key}>
                <div className="k">{kpi.label}</div>
                <div className={`v num${kpi.tone ? ` ${kpi.tone}` : ''}`}>
                  {isLoadingKpis ? (
                    <span className="skel" style={{ display: 'block', width: 62, height: 24 }} />
                  ) : (
                    kpi.value
                  )}
                </div>
                <div className="d">{kpi.sub}</div>
              </div>
            ))}
          </div>
        )}

        <div className="tbar">
          <div className="cmp-search">
            <Ic n="search" />
            <input
              placeholder="Search campaigns"
              aria-label="Search campaigns"
              value={search}
              maxLength={50}
              onChange={(event) => {
                const value = event.target.value;
                if (value.startsWith(' ')) return;
                setSearch(value);
              }}
            />
          </div>

          {STATUS_FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`fchip${statusFilter === value ? ' on' : ''}`}
              onClick={() => setStatusFilter(value)}
            >
              {value === 'PROCESSING' ? <span className="dot green" /> : null}
              {label}
            </button>
          ))}

          <span style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 3px' }} />

          {MODE_FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`fchip${modeFilter === value ? ' on' : ''}`}
              onClick={() => setModeFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="panel-card">
          <div className="pc-head">
            <h3>All campaigns</h3>
            {Object.keys(liveBoards).length ? (
              <span className="src live pc-right">
                <Ic n="spark" size={10} />
                live
              </span>
            ) : (
              <span className="src pc-right">refreshes on change</span>
            )}
          </div>

          <TableManager
            {...{
              columns,
              fetcherKey: 'getCampaignListForPreview',
              fetcherFn: campaignList,
              emptyTablePlaceholder: 'No campaigns found',
              descriptionEmptyTable: 'Create a campaign to start dialling',
              getRowClassName: () => 'rowlink',
              /* Clicking the row opens that campaign's board. Every
                 interactive cell already stops propagation, so this only fires
                 on the row itself. Gated by the same permission as the eye. */
              ...(campaignAccess?.summary ? { onRowClick: openMonitor } : {}),
              extraParams: {
                ...(debouncedSearch ? { search: debouncedSearch } : {}),
                filters: [
                  ...(modeFilter !== 'ALL' ? [{ key: 'dialMethod', value: modeFilter }] : []),
                  ...(statusFilter !== 'ALL'
                    ? [{ key: 'campaignStatus', value: statusFilter }]
                    : []),
                ],
                sort: { key: 'createdAt', desc: true },
              },
              customClass: 'w-full',
              // TableManager sizes itself to fill the rest of the viewport,
              // which floors out at a 260px minimum — for this row's ~60px
              // height that clips the 4th row by ~18px. Embedded (this
              // panel sits mid-page rather than filling the screen) gets a
              // fixed height sized for exactly 4 rows instead, so all 4
              // show in full and a 5th scrolls. Standalone keeps the
              // viewport-fill sizing, which suits a full-page table.
              ...(embedded ? { tableMaxHeight: '284px' } : {}),
            }}
          />

          <div className="pc-foot">
            <OutcomeLegend />
            <span className="pc-right">
              Running campaigns show what is holding them back and how many calls are up. Open one
              for the live board.
            </span>
          </div>
        </div>
      </div>

      {drawerState?.isModalOpen && (
        <SideDrawer
          isOpen={drawerState?.isModalOpen}
          title={
            drawerState?.selectedCampaign
              ? `Update (${drawerState?.selectedCampaign?.name})`
              : 'Add Campaign'
          }
          isTab={false}
          isHeader
          enableResponsive
          width="42rem"
          responsiveWidth="95%"
          headerClassName="min-h-8 px-4 sm:px-5"
          handleClose={() => setDrawerState({ selectedCampaign: null, isModalOpen: false })}
          content={
            <div className="h-full">
              <div className="h-full sm:min-w-[640px] md:min-w-0">
                <AddEditCampaign
                  drawerState={drawerState?.isModalOpen}
                  setDrawerState={() =>
                    setDrawerState({ selectedCampaign: null, isModalOpen: false })
                  }
                  selectedCampaign={drawerState?.selectedCampaign}
                />
              </div>
            </div>
          }
        />
      )}

      {modalState?.open && (
        <AgentDetailsModal modalState={modalState} setModalState={setModalState} />
      )}

      {!!showDeleteConfirmation && (
        <AlertConfirm
          {...{
            apiLoading: isPendingDeleteCampaign,
            onConfirm: () => mutateDeleteCampaign(showDeleteConfirmation?._id),
            open: !!showDeleteConfirmation,
            setOpen: () => setShowDeleteConfirmation(null),
          }}
        />
      )}
    </div>
  );
};

export default Campaign;

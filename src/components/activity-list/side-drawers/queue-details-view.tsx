import { Icon } from '@/assets/icons/icon';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import Loader from '@/components/custom/loader';
import CallHistoryLogs from '@/components/call-history-logs';
import { getDepartmentAndCallLogs } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { safeJSONParse } from '../constants';
import { PRIORITY_WORD, parseCallRoutingRecord } from '@/lib/call-routing-record';

const QueueDetailsView = ({
  rowData,
  variant = 'drawer',
}: {
  rowData: any;
  /* 'drawer' (default): rendered inside SideDrawer, whose own content box
     doesn't scroll past the md breakpoint (`md:overflow-hidden` in
     side-drawer.tsx) — this component has to manage its own height and
     scrolling, hence the fixed viewport-relative height below. 'modal':
     rendered inside a Dialog that already sizes and scrolls itself
     (`max-h-[88vh] overflow-y-auto` on DialogContent) — adding another
     fixed height and scroll container here would just double up and
     could clip content awkwardly against the dialog's own bounds. */
  variant?: 'drawer' | 'modal';
}) => {
  const { callID, forward_type = '' } = rowData || {};

  const { data: departmentData = {}, isLoading: isPendingDepartmentList } = useQuery({
    queryKey: ['getDepartmentAndCallLogs', callID, forward_type],
    queryFn: () => getDepartmentAndCallLogs({ call_id: callID, type: forward_type }),
    select: (data) => data?.data?.data?.result || {},
    enabled: !!callID,
  });

  const rawQueueResult = Array.isArray(departmentData?.result)
    ? departmentData?.result?.[0] || {}
    : departmentData?.result || {};
  const queueInfo = rawQueueResult?.queue || rawQueueResult || {};
  const hasQueueInfo = Object?.keys(queueInfo || {})?.length > 0;

  const {
    members = '[]',
    manager = '{}',
    forward_call_actions = '{}',
    name = '',
    extension = '',
    description = '',
    site = '{}',
  } = queueInfo;

  const { call_handling = {} } = forward_call_actions || {};
  const { failover = {} } = call_handling;

  const departmentMembers: any = safeJSONParse(members, []);
  const managerInfo: any = safeJSONParse(manager, {});
  const siteInfo: any = safeJSONParse(site, {});
  const transformedCalls = departmentData?.calls || [];
  const routing = parseCallRoutingRecord(rowData?.call_flow);

  return (
    <>
      {isPendingDepartmentList ? (
        <div className="flex items-center justify-center h-full">
          <Loader variant="blue" size="sm" />
        </div>
      ) : (
        <div
          className={`qdv-root flex flex-col gap-3 ${
            variant === 'modal' ? '' : 'pt-3 h-[calc(100vh_-_10.3rem)] overflow-auto'
          }`}
        >
          {routing && (
            <div className="qdv-card bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3 border border-[rgba(225,200,165,0.9)] rounded-xl">
              <div className="qdv-card-title font-semibold text-[#2E2D35] truncate text-md mb-2">
                How this call was routed
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-[#EEE7DD] bg-[#FBE2C8]/40 rounded-xl p-3 text-sm">
                {routing.callback && (
                  <div>
                    <p className="qdv-label font-medium text-[#2E2D35]">Callback</p>
                    <p className="text-[#9A948F]">
                      {routing.callback.requested
                        ? `Asked to be called back${routing.callback.position ? ` at position ${routing.callback.position}` : ''}${routing.callback.waited !== null ? ` after ${routing.callback.waited}s` : ''}`
                        : routing.callback.accepted
                          ? `Return call${routing.callback.waitBefore ? `, ${routing.callback.waitBefore}s waited before` : ''}${routing.callback.waitAfter !== null ? `, ${routing.callback.waitAfter}s after` : ''}`
                          : routing.callback.outcome === 'declined'
                            ? 'Return call declined by the caller'
                            : 'Return call not accepted'}
                    </p>
                  </div>
                )}
                <div>
                  <p className="qdv-label font-medium text-[#2E2D35]">Round</p>
                  <p className="text-[#9A948F]">
                    {routing.round && routing.rounds ? `${routing.round} of ${routing.rounds}` : '--'}
                  </p>
                </div>
                <div>
                  <p className="qdv-label font-medium text-[#2E2D35]">Skills asked for</p>
                  <p className="text-[#9A948F]">
                    {routing.skills.length
                      ? `${routing.skills.join(', ')}${routing.bar && routing.bar > 1 ? ` at ${routing.bar}+ stars` : ''}`
                      : 'None'}
                    {routing.dropped ? ' (dropped by widening)' : ''}
                    {routing.waived ? ' (nobody held it, ignored)' : ''}
                  </p>
                </div>
                <div>
                  <p className="qdv-label font-medium text-[#2E2D35]">Caller chose</p>
                  <p className="text-[#9A948F]">{routing.caller.length ? routing.caller.join(', ') : '--'}</p>
                </div>
                <div>
                  <p className="qdv-label font-medium text-[#2E2D35]">Priority</p>
                  <p className="text-[#9A948F]">
                    {routing.priority ? PRIORITY_WORD[routing.priority] || String(routing.priority) : '--'}
                    {routing.held > 0
                      ? ` · held for another caller ${routing.held} time${routing.held === 1 ? '' : 's'}`
                      : ''}
                  </p>
                </div>
              </div>
              {routing.reason && (
                <p className="text-xs text-[#9A948F] mt-2">
                  Last decision: {routing.reason}
                  {routing.polls ? ` (${routing.polls} look${routing.polls === 1 ? '' : 's'} for someone free)` : ''}
                </p>
              )}
            </div>
          )}
          {hasQueueInfo ? (
            <>
              <div className="qdv-card bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3 border border-[rgba(225,200,165,0.9)] rounded-xl">
                <div className="qdv-card-title font-semibold text-[#2E2D35] truncate text-md mb-2">
                  Queue Info
                </div>
                <div className="qdv-info-grid grid grid-cols-2 sm:grid-cols-4 gap-4 border border-[#EEE7DD] bg-[#FBE2C8]/40 rounded-xl p-3">
                  <div>
                    <p className="qdv-label font-medium text-[#2E2D35]">Name</p>
                    <p className="qdv-value text-sm text-[#9A948F]">{name || '--'}</p>
                  </div>
                  <div>
                    <p className="qdv-label font-medium text-[#2E2D35]">Location</p>
                    <p className="qdv-value text-sm text-[#9A948F]">
                      {siteInfo?.label || siteInfo?.name || '--'}
                    </p>
                  </div>
                  <div>
                    <p className="qdv-label font-medium text-[#2E2D35]">Extension</p>
                    <p className="qdv-value text-sm text-[#9A948F]">{extension || '--'}</p>
                  </div>
                  <div>
                    <p className="qdv-label font-medium text-[#2E2D35]">Description</p>
                    <p className="qdv-value text-[#2E2D35] text-sm">
                      {description || 'No description provided'}
                    </p>
                  </div>
                </div>
                {/* Failover used to sit inside the same 4-column grid as a
                    5th item, which meant it either forced a 5th column
                    just for itself or wrapped alone onto an otherwise-
                    empty row. It's a fallback detail, not core queue
                    identity, so it reads better as one quiet inline strip
                    underneath rather than fighting the grid for space. */}
                {(failover?.type || failover?.value) && (
                  <div className="qdv-failover-pill mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-full px-3 py-1 text-xs text-[#9A948F]">
                    <span className="qdv-label font-medium text-[#2E2D35]">
                      If no one answers
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{failover?.type || '--'}</span>
                    {failover?.value ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{failover.value}</span>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="qdv-card bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] rounded-xl p-3">
                <p className="qdv-card-title font-semibold text-[#2E2D35] truncate text-md">
                  Department Manager
                </p>
                <div className="w-full mt-2">
                  <div className="qdv-manager-row flex items-center justify-between border border-[#EEE7DD] bg-[#FBE2C8]/40 rounded-xl p-3">
                    <div className="qdv-avatar-ring rounded-full">
                      <CustomAvatar
                        name={managerInfo?.label}
                        showPresence
                        size="40"
                        extension={managerInfo?.extension}
                        image={managerInfo?.profile}
                      />
                    </div>
                    <div className="flex flex-col w-[calc(100%_-_3.5rem)]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="qdv-value capitalize text-md truncate">
                          {managerInfo?.label}
                        </p>
                        <div className="flex gap-1">
                          <Icon name="Grid" className="w-4 h-4 text-[#9A948F]" />
                          <span className="qdv-ext-pill bg-[#fff1eb] text-[#ea580c] font-mono px-2 py-0.5 rounded-full text-xs">
                            {managerInfo?.extension || managerInfo?.value || '--'}
                          </span>
                        </div>
                      </div>
                      <small className="qdv-role text-primary text-[10px]">
                        {managerInfo?.role}
                      </small>
                      <small className="text-[#9A948F] truncate text-sm">
                        <CustomTooltip text={managerInfo?.email}>
                          <span>{managerInfo?.email}</span>
                        </CustomTooltip>
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="qdv-card bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] rounded-xl p-3">
                <p className="qdv-card-title font-semibold text-[#2E2D35] truncate text-md mb-2">
                  Members
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {departmentMembers?.length ? (
                    departmentMembers?.map((member: any) => {
                      const isMemberMatched = transformedCalls?.some(
                        (item: { destination_number: string }) =>
                          item?.destination_number === member?.value,
                      );
                      return (
                        /* A per-member solid red/green card border used to
                           double up with the "Call Picked"/"Call Not
                           Picked" text below as a second, harsher signal
                           for the exact same fact — every unanswered
                           member's whole card outlined in alarm-red. One
                           soft status pill already says this; the card
                           itself now stays the same neutral frosted card
                           regardless of outcome. */
                        <div
                          className="qdv-member-card flex items-center justify-between border border-[#EEE7DD] bg-[#FBE2C8]/40 rounded-xl p-3"
                          key={member?.uuid}
                        >
                          <div className="qdv-avatar-ring rounded-full">
                            <CustomAvatar
                              name={member?.label}
                              showPresence
                              extension={member?.extension}
                              image={member?.profile}
                            />
                          </div>
                          <div className="flex flex-col w-[calc(100%_-_3.5rem)]">
                            <div className="flex items-center justify-between gap-2">
                              <p className="qdv-value capitalize text-sm truncate">
                                {member?.label}
                              </p>
                              <div className="flex gap-1">
                                <Icon name="Grid" className="w-4 h-4 text-[#9A948F]" />
                                <span className="qdv-ext-pill bg-[#fff1eb] text-[#ea580c] font-mono px-2 py-0.5 rounded-full text-xs">
                                  {member?.extension || member?.value || '--'}
                                </span>
                              </div>
                            </div>
                            <small className="qdv-role text-primary text-[10px]">
                              {member?.role}
                            </small>
                            <small className="text-[#9A948F] truncate text-sm flex items-center justify-between gap-2">
                              <CustomTooltip text={member?.email}>
                                <span>{member?.email}</span>
                              </CustomTooltip>
                              <span
                                className={`qdv-status-tag inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                  isMemberMatched
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-rose-50 text-rose-600 border-rose-100'
                                }`}
                              >
                                {isMemberMatched ? 'Call Picked' : 'Call Not Picked'}
                              </span>
                            </small>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-[#9A948F]">No members found in this department.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="qdv-card bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3 border border-[rgba(225,200,165,0.9)] rounded-xl">
              <div className="qdv-card-title font-semibold text-[#2E2D35] truncate text-md mb-2">
                Queue Info
              </div>
              {transformedCalls?.length ? (
                <p className="text-sm text-[#9A948F]">Queue details for this call.</p>
              ) : (
                <p className="text-sm text-[#9A948F]">
                  Queue details are unavailable for this call.
                </p>
              )}
            </div>
          )}

          {transformedCalls?.length > 0 && <CallHistoryLogs data={transformedCalls || []} />}
        </div>
      )}
    </>
  );
};
export default QueueDetailsView;

import { useMemo, useState } from 'react';
import { CircleDot, Clock3, Headphones, ParkingSquare, Phone, PhoneCall } from 'lucide-react';
import { useDialpad } from '@/hooks/use-dialpad';
import { useAgentDuty } from '@/hooks/use-agent-duty';
import { useAgentWorkList } from '@/hooks/use-agent-work-list';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useCompanyFeatures } from '@/hooks/rbac';
import { makeCallQueueAvailable } from '@/services/api';
import { writeCampaignRingContact } from '@/lib/campaign-join-state';
import { handleAlert } from '@/lib/utils';
import {
  describeWait,
  parkPickupCode,
  waitSeverity,
  workListHeading,
  workRowAction,
  type AgentWorkRow,
} from '@/lib/agent-work-list';

/**
 * "Waiting for you" - the agent's own work list.
 *
 * Every call that is waiting for this person right now: one ringing here, one
 * they put on hold, a caller holding in a queue they are on, a campaign
 * customer who has answered and is waiting for a free agent. Each with who it
 * is, which queue or campaign, and how long they have been waiting, ticking.
 *
 * **Which actions are real.** A row this browser owns - ringing here, or held
 * by this agent - is answered or resumed locally and the button does exactly
 * what it says. A parked call is collected by dialling its slot, which the
 * router implements. A caller waiting in a queue or on a campaign **cannot**
 * be pulled to this device by the browser alone. The socket gateway forwards a
 * fixed list of call events to the call manager, and `call-transfer` was added
 * to that list on 14 Sep 2026 - the gateway pins the destination to the asking
 * socket's own extension and tenant, so the button cannot send a call anywhere
 * else. It is offered only to an agent who holds the call-takeover permission,
 * and only for a row the switch has given a call id. Every other waiting row
 * carries the real reason the call is not reaching this agent, and the repair
 * that will fix it, rather than a button that would do nothing.
 *
 * VERIFIED 14 Sep 2026: `call-transfer` is in the live gateway's forwarding
 * list (socket-api, 104), but its `[take-call]` log line has never once been
 * written - no browser has successfully emitted the event yet. So the path is
 * wired but UNPROVEN end to end. Until a real call has been moved by it, treat
 * this button as untested, not as working.
 */

const CARD =
  'rounded-2xl border border-[#d9e5f6] bg-white p-2.5 text-left shadow-[0_1px_2px_rgba(16,42,77,0.04)]';

const KIND_ICON = {
  ringing: PhoneCall,
  held: Clock3,
  parked: ParkingSquare,
  waiting: Headphones,
} as const;

const KIND_WORD = {
  ringing: 'Ringing you now',
  held: 'You put them on hold',
  parked: 'Parked',
  waiting: 'Waiting for an agent',
} as const;

type DialpadWorkListProps = {
  /** A heading and border, for a page. Off inside the dialer, which has its own. */
  framed?: boolean;
  className?: string;
};

const DialpadWorkList = ({ framed = false, className = '' }: DialpadWorkListProps) => {
  const {
    answerCall,
    unholdCall,
    setActiveSessionId,
    makeCall,
    openDialpad,
    sipContact,
    sessions,
    isDialpadOpen,
  } = useDialpad();
  const { setDuty, canChangeOwn } = useAgentDuty();
  const { rows, readiness, nowMs, joinedCampaignId } = useAgentWorkList();
  const { socketEventsManager } = useSocketEvents();
  const { features } = useCompanyFeatures();
  /* Taking a specific caller out of turn is a supervisor act in the reference
     products; here it needs the same permission as taking over a call. */
  const mayTake = Boolean((features as any)?.plan_features?.monitoring_features?.action?.intercept);
  const [isParkOpen, setIsParkOpen] = useState(false);
  const [ringRepairPending, setRingRepairPending] = useState(false);

  const heading = useMemo(() => workListHeading(rows), [rows]);

  /**
   * Bring the dialer forward WITHOUT resizing it.
   *
   * Every button here used to call `openDialpad('mini')`, and `openDialpad`
   * always sets the size it is given. On the campaign dialer - which is a full
   * page, not a panel - pressing "Take the call" therefore collapsed the whole
   * screen into a 430px box in the corner at the exact moment the agent was
   * trying to pick up a customer. It looked, correctly, like the call had
   * vanished. The dialer is only sized when it was shut; when it is already
   * open, whatever the agent is working in stays exactly as it is.
   */
  const surfaceDialer = () => {
    if (!isDialpadOpen) openDialpad('mini');
  };

  /* A row is a snapshot; by the time a finger lands on it the switch may have
     given the call to someone else or the caller may have hung up. Answering a
     session that is no longer there used to do nothing at all, silently, which
     is indistinguishable from a broken button. */
  const stillRinging = (sessionId?: string) => {
    if (!sessionId) return false;
    const status = String((sessions as any)?.[sessionId]?.status || '').toLowerCase();
    return ['incoming', 'ringing', 'connecting'].includes(status);
  };

  /* The repair for the fault that lost six customers on 12 Sep: the queue is
     ringing a contact this tab no longer has. Re-posting the contact is the
     same call the join makes, so nothing new is stored. */
  const ringThisTab = async () => {
    if (!joinedCampaignId || !sipContact || ringRepairPending) return;
    setRingRepairPending(true);
    try {
      await makeCallQueueAvailable({
        campaign_uuid: joinedCampaignId,
        status: 'Available',
        state: 'Waiting',
        sip_contact: sipContact,
      });
      writeCampaignRingContact(joinedCampaignId, sipContact);
      handleAlert({ type: 'success', text: 'Calls for this campaign will ring in this window.' });
    } catch {
      handleAlert({ type: 'error', text: 'Could not move the ring to this window. Try again.' });
    } finally {
      setRingRepairPending(false);
    }
  };

  const body = (
    <div className="flex flex-col gap-2">
      {rows.length === 0 ? (
        <p className="px-0.5 text-[11.5px] leading-relaxed text-[#5d7394]">
          Nothing is waiting for you. A caller who reaches one of your queues, or a campaign
          customer who answers, appears here with the time they have been waiting.
        </p>
      ) : null}

      {rows.map((row: AgentWorkRow) => {
        const action = workRowAction(row, readiness);
        const Icon = KIND_ICON[row.kind];
        const severity = waitSeverity(row.waitingSinceMs, nowMs);
        const wait = describeWait(row.waitingSinceMs, nowMs);
        return (
          <div key={row.id} className={CARD}>
            {/* Two rows, not two columns: at 480px - the width a campaign card
                actually gets - a name beside a button and a timer wraps one
                word per line. The name owns the top line and the action owns
                the bottom one, so nothing competes for the same 150px. */}
            <div className="flex min-w-0 items-start gap-2">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  row.kind === 'ringing'
                    ? 'bg-[#e6f5ec] text-[#1b7a45]'
                    : 'bg-ucass-active-bg text-[#1f4f8f]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#17385e]">{row.who}</p>
                <p className="truncate text-[11px] text-[#5a7396]">
                  {[KIND_WORD[row.kind], row.where, row.number !== row.who ? row.number : '']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {wait ? (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                    severity === 'long'
                      ? 'bg-[#fdecec] text-[#a32020]'
                      : severity === 'waiting'
                        ? 'bg-[#fff6e8] text-[#8a5300]'
                        : 'bg-[#eef4ff] text-[#2f4f79]'
                  }`}
                  title="How long they have been waiting"
                >
                  {wait}
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {action.kind === 'answer' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!row.sessionId) return;
                    if (!stillRinging(row.sessionId)) {
                      handleAlert({
                        type: 'error',
                        text: 'That call is no longer ringing here - the caller hung up or it went to another agent.',
                      });
                      return;
                    }
                    setActiveSessionId(row.sessionId);
                    answerCall(row.sessionId);
                    surfaceDialer();
                  }}
                  className="h-8 rounded-lg bg-[#1b7a45] px-3 text-[12px] font-semibold text-white transition hover:bg-[#166238]"
                  title={action.hint}
                >
                  {action.label}
                </button>
              ) : null}

              {action.kind === 'take' && !mayTake ? (
                /* Without the permission there is no button - so say why,
                   rather than leave a row with an empty space under it. */
                <span className="text-[11px] leading-snug text-[#5a7396]">
                  Waiting for the switch to ring you. Taking a caller out of turn needs the
                  call-takeover permission.
                </span>
              ) : null}

              {action.kind === 'take' && mayTake ? (
                <button
                  type="button"
                  onClick={() => {
                    /* Silence was the bug: with no socket, or a board row that
                       carries no call id, this returned and said nothing, so a
                       pressed button and a broken button looked the same. */
                    if (!socketEventsManager) {
                      handleAlert({
                        type: 'error',
                        text: 'Not connected to the call server, so this call cannot be moved to your phone.',
                      });
                      return;
                    }
                    if (!row.callId) {
                      handleAlert({
                        type: 'error',
                        text: 'The switch has not given this call an id yet. Wait for it to ring you.',
                      });
                      return;
                    }
                    socketEventsManager.emit('call-transfer', { data: { uuid: row.callId, sipCallId: row.callId } });
                    handleAlert({ text: `Bringing ${row.who} to your phone…`, type: 'info' });
                  }}
                  className="h-8 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white transition"
                  title={action.hint}
                >
                  {action.label}
                </button>
              ) : null}
              {action.kind === 'resume' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (row.sessionId) {
                      setActiveSessionId(row.sessionId);
                      unholdCall(row.sessionId);
                      surfaceDialer();
                    }
                  }}
                  className="h-8 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white transition"
                  title={action.hint}
                >
                  {action.label}
                </button>
              ) : null}

              {action.kind === 'pickup' ? (
                <button
                  type="button"
                  onClick={() => {
                    const code = parkPickupCode(row.parkSlot);
                    if (!code) return;
                    surfaceDialer();
                    void makeCall(code);
                  }}
                  className="h-8 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white transition"
                  title={action.hint}
                >
                  {action.label}
                </button>
              ) : null}

              {action.kind === 'none' ? (
                <>
                  <span className="text-[11px] leading-snug text-[#5a7396]">{action.hint}</span>
                  {action.repair === 'go-on-duty' && canChangeOwn ? (
                    <button
                      type="button"
                      onClick={() => setDuty({ action: 'start' })}
                      className="h-8 rounded-lg border border-[#d4e1f6] bg-white px-3 text-[12px] font-semibold text-[#2f4f79] transition hover:bg-[#f3f7ff]"
                    >
                      Go on duty
                    </button>
                  ) : null}
                  {action.repair === 'ring-this-tab' ? (
                    <button
                      type="button"
                      disabled={ringRepairPending}
                      onClick={() => void ringThisTab()}
                      className="h-8 rounded-lg border border-[#d4e1f6] bg-white px-3 text-[12px] font-semibold text-[#2f4f79] transition hover:bg-[#f3f7ff] disabled:opacity-60"
                    >
                      Ring this tab instead
                    </button>
                  ) : null}
                  {action.repair === 'ready-again' ? (
                    <span className="text-[11px] font-semibold text-amber-700">
                      Use “Ready again” on your duty chip.
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        );
      })}

      {/* Park pickup. The switch reads the slot number out to whoever parked
          the call; anyone in the company collects it by dialling that slot.
          Nothing publishes the lot's contents, so the slots are offered rather
          than listed - which is exactly what the feature is. */}
      <div>
        <button
          type="button"
          onClick={() => setIsParkOpen((open) => !open)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5a7396] hover:text-[#2f4f79]"
        >
          <ParkingSquare className="h-3.5 w-3.5" />
          {isParkOpen ? 'Hide parked calls' : 'Pick up a parked call'}
        </button>
        {isParkOpen ? (
          <div className="mt-1.5">
            <p className="text-[11px] leading-relaxed text-[#5d7394]">
              When a call is parked the switch reads out its slot number. Press that slot to
              take the call.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {['71', '72', '73', '74', '75', '76', '77', '78', '79'].map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    surfaceDialer();
                    void makeCall(parkPickupCode(slot));
                  }}
                  className="h-8 w-11 rounded-lg border border-[#d4e1f6] bg-white text-[12px] font-semibold text-[#2f4f79] transition hover:bg-[#f3f7ff]"
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  /* Inside the dialer the list is an interruption, not furniture: it appears
     when there is something to act on and takes no room at all otherwise. The
     page version keeps its heading and its empty state, because on a page the
     answer "nothing is waiting" is itself the information. */
  if (!framed) {
    if (!rows.length) return null;
    return (
      <div className={`px-1 pb-1 ${className}`}>
        <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a7396]">
          {heading}
        </p>
        {body}
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-gray-200/90 bg-white p-3 ${className}`}
      aria-label="Calls waiting for you"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CircleDot
            className={`h-3.5 w-3.5 ${rows.length ? 'text-[#1b7a45]' : 'text-[#9bb0cd]'}`}
          />
          <p className="text-[13px] font-semibold text-[#17385e]">{heading}</p>
        </div>
        <p className="flex items-center gap-1 text-[11px] text-[#5a7396]">
          <Phone className="h-3 w-3" />
          {readiness.registered ? 'Your phone is connected' : 'Your phone is not connected'}
        </p>
      </div>
      {body}
    </section>
  );
};

export default DialpadWorkList;

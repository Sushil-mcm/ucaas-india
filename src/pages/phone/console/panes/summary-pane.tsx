import type { DialpadSession } from '@/context/dialpad-context';
import { Ic } from '../icons';
import { sentimentColor, type ConsoleTurn } from '../copilot-adapter';
import type { ConsoleCallState } from '../use-console-call';
import type { ConsoleCallRow } from '../call-list-column';
import { DEMO_ENABLED, demoRecap } from '../demo-data';
import DemoChip from './demo-chip';

/**
 * Summary — the post-call recap, laid out as in the artifact.
 *
 * If the speech service returned summary turns for the call, those are the
 * recap and are labelled as platform output. There is no service that writes
 * the structured recap the artifact shows (reason / what happened / outcome /
 * action items), so that shape is filled with demo content behind a chip.
 *
 * The stats block is a mix: talk ratio and the checklist are genuinely measured
 * from the transcript in this browser; CSAT and auto-QA have no model and are
 * demo.
 */
const SummaryPane = ({
  state,
  session,
  turns,
  sentiment,
  talk,
  checklist,
  selectedCall,
}: {
  state: ConsoleCallState;
  session: DialpadSession | null;
  turns: ConsoleTurn[];
  sentiment: number;
  talk: number;
  checklist: boolean[];
  selectedCall?: ConsoleCallRow | null;
}) => {
  const summaries = turns.filter((t) => t.isSummary);
  const number = session?.remoteNumber || selectedCall?.number || '';

  if (state === 'active') {
    return (
      <div className="pscroll">
        <div className="empty">
          <Ic n="clock" size={32} />
          <p>
            The recap appears when the call ends. Everything it will use is streaming into the{' '}
            <strong style={{ color: 'var(--ai-ink)' }}>Copilot</strong> tab now.
          </p>
        </div>
      </div>
    );
  }

  if (!number) {
    return (
      <div className="pscroll">
        <div className="empty">
          <Ic n="spark" size={30} fill />
          <p>Pick a call on the left, or finish one, to read its recap.</p>
        </div>
      </div>
    );
  }

  const recap = DEMO_ENABLED ? demoRecap(number) : null;
  const measured = turns.length > 0;

  return (
    <div className="pscroll">
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span className="eyebrow">Call recap</span>
        {summaries.length ? (
          <span className="tag ai">
            <Ic n="spark" size={9} fill /> Speech service
          </span>
        ) : (
          <DemoChip />
        )}
      </div>

      {/* real recap, when the speech service produced one */}
      {summaries.length
        ? summaries.map((s) => (
            <div className="aicard" key={s.id}>
              <div className="ac-head">
                <span className="ac-kind">
                  <Ic n="spark" size={12} fill /> Summary
                </span>
                <span className="src ai" style={{ marginLeft: 'auto' }}>
                  Speech service · live
                </span>
              </div>
              <div className="ac-body">{s.text}</div>
            </div>
          ))
        : null}

      {recap ? (
        <>
          <div className="aicard">
            <div className="ac-head">
              <span className="ac-kind">
                <Ic n="spark" size={12} fill /> Reason for contact
              </span>
              <span style={{ marginLeft: 'auto' }}>
                <DemoChip />
              </span>
            </div>
            <div className="ac-body">{recap.reason}</div>
          </div>

          <div className="aicard">
            <div className="ac-head">
              <span className="ac-kind">
                <Ic n="spark" size={12} fill /> What happened
              </span>
            </div>
            <div className="ac-body">{recap.happened}</div>
          </div>

          <div className="aicard">
            <div className="ac-head">
              <span className="ac-kind">
                <Ic n="spark" size={12} fill /> Outcome
              </span>
            </div>
            <div className="ac-body">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {recap.outcome.map((o) => (
                  <span className={`tag ${o.tone}`} key={o.label}>
                    {o.label}
                  </span>
                ))}
              </div>
              {recap.outcomeNote}
            </div>
          </div>

          <div className="aicard">
            <div className="ac-head">
              <span className="ac-kind">
                <Ic n="spark" size={12} fill /> Action items
              </span>
            </div>
            <div className="ac-body">
              {recap.actions.map((a) => (
                <div className="action-row" key={a.text}>
                  <span className="action-box" />
                  <span style={{ flex: 1, fontSize: 12.5 }}>{a.text}</span>
                  <span className="tag acc">{a.owner}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {/* measured vs modelled, kept apart on purpose */}
      <div className="panel-card">
        <div className="pc-head" style={{ padding: '11px 14px' }}>
          <h3>Call measures</h3>
        </div>
        <div className="pc-body" style={{ padding: '10px 14px 14px' }}>
          <div className="kv">
            <span className="k">
              Sentiment <span className="src">derived</span>
            </span>
            <span className="v" style={{ color: sentimentColor(sentiment) }}>
              {measured ? `${sentiment > 0 ? '+' : ''}${sentiment}` : '—'}
            </span>
          </div>
          <div className="kv">
            <span className="k">
              Talk ratio <span className="src">measured</span>
            </span>
            <span className="v">{measured ? `You ${talk}% · Customer ${100 - talk}%` : '—'}</span>
          </div>
          <div className="kv">
            <span className="k">
              Checklist <span className="src">derived</span>
            </span>
            <span className="v">
              {checklist.filter(Boolean).length} / {checklist.length}
            </span>
          </div>
          <div className="kv">
            <span className="k">
              Transcript turns <span className="src live">live</span>
            </span>
            <span className="v num">{turns.length}</span>
          </div>
          {recap
            ? recap.stats
                .filter((s) => s.k === 'Inferred CSAT' || s.k === 'Auto-QA score')
                .map((s) => (
                  <div className="kv" key={s.k}>
                    <span className="k">
                      {s.k} <DemoChip label="demo" />
                    </span>
                    <span
                      className="v"
                      style={{
                        color: s.tone
                          ? `var(--${s.tone === 'warn' ? 'warn' : s.tone === 'neg' ? 'crit' : 'live'})`
                          : undefined,
                      }}
                    >
                      {s.v}
                    </span>
                  </div>
                ))
            : null}
        </div>
      </div>

      {!measured ? (
        <div className="demo-foot">
          No transcript was captured for this call, so the measured rows read “—”. The recap above
          is placeholder content for layout review.
        </div>
      ) : null}
    </div>
  );
};

export default SummaryPane;

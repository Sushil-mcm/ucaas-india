import { hasChurnSignal, initialsOf, languageLabel, type ConsoleTurn } from '../copilot-adapter';

/** One transcript turn, shared by the Copilot and Transcript panes. */
export const Turn = ({ turn }: { turn: ConsoleTurn }) => {
  const risk = turn.speaker === 'customer' && hasChurnSignal(turn.text);
  return (
    <div className={`turn ${risk ? 'hl' : ''}`}>
      <div
        className={`turn-av ${turn.speaker === 'agent' ? 'agent' : turn.isSummary ? 'ivr' : 'cust'}`}
      >
        {turn.isSummary ? 'AI' : initialsOf(turn.who) || '?'}
      </div>
      <div className="turn-body">
        <div className="turn-meta">
          <span className="turn-who">{turn.who}</span>
          <span className="turn-t">{turn.time}</span>
          {turn.language ? (
            <span className="tag neu" title={turn.language}>
              {languageLabel(turn.language)}
            </span>
          ) : null}
          {risk ? <span className="tag neg">churn signal</span> : null}
        </div>
        <div className="turn-text">{turn.text}</div>
      </div>
    </div>
  );
};

export default Turn;

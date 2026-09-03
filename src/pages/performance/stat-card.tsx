import type { ReactNode } from 'react';

/**
 * The stat tile every Performance tab is built from, on the MCM Unified
 * Console design system (`.stat` in `components/mcm/mcm-page.css`).
 * Tone maps onto the shared status tokens rather than raw colours so light
 * and dark stay in step.
 */
export type StatCardTone = 'default' | 'warning' | 'danger' | 'success';

const TONE_STYLE: Record<StatCardTone, string | undefined> = {
  default: undefined,
  warning: 'var(--warn)',
  danger: 'var(--crit)',
  success: 'var(--live)',
};

const PerfStatCard = ({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  /* "inline" puts the value beside the label/sub instead of stacked below
     it — for a card that's fundamentally one number and one short line,
     stacking leaves the card's own width mostly empty. Opt-in so every
     existing (denser, multi-line) usage keeps its current layout. */
  layout = 'stacked',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: any;
  tone?: StatCardTone;
  layout?: 'stacked' | 'inline';
}) => {
  if (layout === 'inline') {
    return (
      <div className="stat stat-inline">
        <div className="v num stat-inline-value" style={{ color: TONE_STYLE[tone] }}>
          {value}
        </div>
        <div className="stat-inline-text">
          <span className="k">{label}</span>
          {sub && (
            <div className="d" style={{ color: 'var(--ink-3)', fontWeight: 500 }}>
              {sub}
            </div>
          )}
        </div>
        {Icon && (
          <span className="stat-inline-icon">
            <Icon style={{ width: 15, height: 15 }} />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="stat">
      <div
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}
      >
        <span className="k">{label}</span>
        {Icon && (
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 22,
              height: 22,
              flex: 'none',
              borderRadius: 99,
              background: 'var(--accent-wash)',
              color: 'var(--accent-ink)',
            }}
          >
            <Icon style={{ width: 13, height: 13 }} />
          </span>
        )}
      </div>
      <div className="v num" style={{ color: TONE_STYLE[tone] }}>
        {value}
      </div>
      {sub && (
        <div className="d" style={{ color: 'var(--ink-3)', fontWeight: 500 }}>
          {sub}
        </div>
      )}
    </div>
  );
};

export default PerfStatCard;

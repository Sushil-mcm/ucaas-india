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
  /* Adds a `stat-hl-{highlight}` class alongside `.stat`, purely for a
     theme's own CSS to hook a whole-card treatment onto (a gold "top
     performer" wash, a warm attention tint) — this component stays
     unopinionated about what that treatment looks like. Default 'none'
     adds nothing, so every existing usage renders exactly as before. */
  highlight = 'none',
  /* Per-card icon wash/ink override — every existing caller keeps the
     shared accent-wash/accent-ink pair by leaving these unset; a caller
     that wants each tile's icon in its own colour (a dashboard-style KPI
     row, one hue per metric) passes both together. */
  iconBg,
  iconColor,
  /* Colours just the label text, independent of `tone` (which colours the
     value) — for a single standout tile (e.g. "Top performer") without
     touching every other card's label. */
  labelColor,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: any;
  tone?: StatCardTone;
  layout?: 'stacked' | 'inline';
  highlight?: 'none' | 'gold' | 'warning' | 'ai';
  iconBg?: string;
  iconColor?: string;
  labelColor?: string;
}) => {
  const highlightClass = highlight !== 'none' ? ` stat-hl-${highlight}` : '';
  if (layout === 'inline') {
    return (
      <div className={`stat stat-inline${highlightClass}`}>
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
    <div className={`stat${highlightClass}`}>
      <div
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}
      >
        <span className="k" style={{ color: labelColor }}>
          {label}
        </span>
        {Icon && (
          <span
            className="stat-icon"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 22,
              height: 22,
              flex: 'none',
              borderRadius: 99,
              background: iconBg ?? 'var(--accent-wash)',
              color: iconColor ?? 'var(--accent-ink)',
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

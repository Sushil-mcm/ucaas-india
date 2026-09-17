import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type KpiStripItem = {
  key: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'success' | 'danger';
  breaching?: boolean;
  /* Kept optional for callers built against the old icon-badge cell design
     (see the git history) — icons aren't rendered any more. This strip is
     deliberately not another set of KPI cards: one flat ribbon, a divider
     between each segment instead of a card per metric, no icon badge. */
  icon?: LucideIcon;
};

const KpiStrip = ({ items }: { items: KpiStripItem[] }) => (
  <div className="kpi-strip">
    {items.map((item) => (
      <div
        key={item.key}
        className={`kpi-strip-cell${item.breaching ? ' kpi-strip-cell-breach' : ''}`}
      >
        <span className="kpi-strip-label">{item.label}</span>
        <span className={`kpi-strip-value kpi-strip-value-${item.tone ?? 'default'}`}>
          {item.value}
        </span>
        {item.sub && <span className="kpi-strip-sub">{item.sub}</span>}
      </div>
    ))}
  </div>
);

export default KpiStrip;

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
     (see the git history) — icons aren't rendered any more. */
  icon?: LucideIcon;
};

/* Third pass at this strip. A row of icon-badge cards, then a plain table,
   were both tried and rejected — the cards read as "more KPI tiles" and
   the table still split into two visually competing zones (a dense label
   row, a bold value row) across 7 crowded columns. This is a single calm
   line of "label: value" pairs instead — one weight of text throughout
   (the value just a touch bolder), wrapping naturally instead of forcing
   7 columns into a fixed grid. About as far from a dashboard tile as this
   information can read while still being scannable. */
const KpiStrip = ({ items }: { items: KpiStripItem[] }) => (
  <div className="kpi-strip">
    {items.map((item, index) => (
      <span className="kpi-strip-item" key={item.key}>
        {index > 0 && <span className="kpi-strip-sep" aria-hidden="true">·</span>}
        <span className="kpi-strip-label">{item.label}:</span>{' '}
        <span
          className={`kpi-strip-value kpi-strip-value-${item.tone ?? 'default'}${
            item.breaching ? ' kpi-strip-breach' : ''
          }`}
        >
          {item.value}
        </span>
        {item.sub && <span className="kpi-strip-sub"> ({item.sub})</span>}
      </span>
    ))}
  </div>
);

export default KpiStrip;

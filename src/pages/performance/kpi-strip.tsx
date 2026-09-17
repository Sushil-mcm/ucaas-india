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

/* A plain table — one header row of labels, one data row of values — not a
   row of cards. Two KPI-card-style redesigns of this strip were both
   rejected as "still KPI style"; a table reads as a different kind of
   thing entirely (a snapshot readout, like the queue detail rows right
   below it), not another tile grid stacked under the one above. */
const KpiStrip = ({ items }: { items: KpiStripItem[] }) => (
  <table className="kpi-strip">
    <thead>
      <tr>
        {items.map((item) => (
          <th key={item.key}>{item.label}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      <tr>
        {items.map((item) => (
          <td
            key={item.key}
            className={item.breaching ? 'kpi-strip-breach' : undefined}
          >
            <span className={`kpi-strip-value kpi-strip-value-${item.tone ?? 'default'}`}>
              {item.value}
            </span>
            {item.sub && <span className="kpi-strip-sub">{item.sub}</span>}
          </td>
        ))}
      </tr>
    </tbody>
  </table>
);

export default KpiStrip;

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type KpiStripItem = {
  key: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'success' | 'danger';
  breaching?: boolean;
  /* Optional — every caller passes one today, but kept optional so a future
     metric with no obvious glyph doesn't need to invent one just to satisfy
     the type. Icon badge sits top-right of the label, matching the Live
     Wallboard hero cards this strip was brought up to parity with. */
  icon?: LucideIcon;
};

const KpiStrip = ({ items }: { items: KpiStripItem[] }) => (
  <div className="kpi-strip">
    {items.map((item) => {
      const Icon = item.icon;
      return (
        <div
          key={item.key}
          className={`kpi-strip-cell${item.breaching ? ' kpi-strip-cell-breach' : ''}`}
        >
          <div className="kpi-strip-cell-top">
            <span className="kpi-strip-label">{item.label}</span>
            {Icon ? (
              <span className="kpi-strip-icon">
                <Icon />
              </span>
            ) : null}
          </div>
          <span className={`kpi-strip-value kpi-strip-value-${item.tone ?? 'default'}`}>
            {item.value}
          </span>
          {item.sub && <span className="kpi-strip-sub">{item.sub}</span>}
        </div>
      );
    })}
  </div>
);

export default KpiStrip;

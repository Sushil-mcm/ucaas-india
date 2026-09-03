import type { ReactNode } from 'react';

export type KpiStripItem = {
  key: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'success' | 'danger';
  breaching?: boolean;
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

import { Ic } from '@/components/mcm/icons';

/**
 * Performance page header, on the MCM Unified Console design system.
 * The artifact's Performance opens with an eyebrow, a tight headline and the
 * two escape hatches a supervisor reaches for: the room-facing wallboard and
 * their own saved dashboards.
 */
const PerformancePageHeader = ({
  onOpenWallboard,
  onOpenDashboards,
}: {
  onOpenWallboard: () => void;
  onOpenDashboards: () => void;
}) => (
  <div className="page-head">
    <div>
      <span className="eyebrow">Performance</span>
      <h1>Contact centre performance</h1>
      <p>
        Live across every queue, agent and flow — the same feeds the phone console reads for its
        briefs, seen from the supervisor's side.
      </p>
    </div>
    <div className="hero-right">
      <button type="button" className="btn ghost" onClick={onOpenWallboard}>
        <Ic n="expand" />
        Wallboard
      </button>
      <button type="button" className="btn primary" onClick={onOpenDashboards}>
        <Ic n="grid" />
        My dashboards
      </button>
    </div>
  </div>
);

export default PerformancePageHeader;

import { Ic } from '../icons';

/**
 * Marks content that came from `demo-data.ts` rather than the platform.
 * Every surface that falls back to demo values must render one of these next
 * to it, so nothing synthetic can be mistaken for a real meeting record.
 */
export const DemoChip = ({ label = 'Demo data' }: { label?: string }) => (
  <span className="src demo" title="Placeholder content — no backend service for this yet">
    <Ic n="alert" size={9} />
    {label}
  </span>
);

export default DemoChip;

import { Clock } from 'lucide-react';
import CustomTooltip from '../custom-tooltip';
import { usePlatformClock } from '@/hooks/use-platform-clock';
import { clockText, longDateText } from '@/lib/platform-clock';

/* The live clock on every page. Every time the platform shows — a call in a
   log, an "Updated 19:41:07" on a report, a timer on the live board — is in
   this zone, so the reader looks up here and knows how far back it was. */
const HeaderClock = () => {
  const { now, timeZone, short, label } = usePlatformClock();
  const zone = label.replace(/^times in /, '');
  /* The date on its own line, then the zone and what it means underneath, in
     the app's dark info tip. It was one long white-on-black sentence running
     wider than the header controls it hung under. */
  return (
    <CustomTooltip
      side="bottom"
      className="mcm-infotip"
      text={
        <>
          <span className="block font-semibold">{longDateText(now, timeZone)}</span>
          <span className="mcm-infotip-sub">
            {zone}. Every time on the platform is shown in this zone.
          </span>
        </>
      }
    >
      <div
        className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-gray-100 px-3 text-gray-700"
        data-testid="platform-clock"
        aria-label={`Platform time ${clockText(now, timeZone)} ${short}`}
      >
        {/* 13px, the same size as the digits beside it. At 16px the icon was
            three pixels taller than the time it labels, so it read as the
            loudest thing in the pill. */}
        <Clock className="h-[13px] w-[13px] shrink-0 text-primary" />
        <span className="text-[13px] font-semibold tabular-nums">{clockText(now, timeZone)}</span>
        {/* The zone name gives way below 1440px so the bar fits; the tooltip
            still names it in full. */}
        <span className="hidden text-[11px] font-medium text-gray-500 min-[1440px]:inline">{short}</span>
      </div>
    </CustomTooltip>
  );
};

export default HeaderClock;

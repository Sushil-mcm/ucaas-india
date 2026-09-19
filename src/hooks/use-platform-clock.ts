import { useCompanyTimeZone } from '@/hooks/use-company-time-zone';
import { useNow } from '@/hooks/use-now';
import { zoneShort } from '@/lib/platform-clock';

/* The platform's one clock: the time now, and the zone every screen shows
   times in. The zone is the company's (main location), else the person's
   regional setting, else the browser — lib/company-time-zone.ts explains the
   order — and it is the same zone the header clock shows, so a time on any
   report can be read straight against the clock. */
export const usePlatformClock = (tickMs = 1000) => {
  const zone = useCompanyTimeZone();
  const now = useNow(tickMs);
  return {
    now,
    timeZone: zone.timeZone,
    source: zone.source,
    /* "times in Asia/Kolkata (company)" */
    label: zone.label,
    /* "IST" */
    short: zoneShort(zone.timeZone, now),
  };
};

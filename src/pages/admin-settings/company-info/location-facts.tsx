/* The one-line summary under each location card.
 *
 * The cards already list address, country, state, city, postcode and timezone —
 * everything that was typed in. What they could not answer is the pair of
 * questions an admin actually scans a location list for: is anybody there, and is
 * anything broken. Both platforms this is modelled on put those two facts on the
 * row itself rather than behind a click.
 */

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Hash, Users } from 'lucide-react';
import { useSiteHeadcount } from '@/hooks/use-site-headcount';
import { useLocationNumbers } from '@/hooks/use-location-numbers';
import { evaluateLocation } from '@/lib/location-readiness';

const LocationFacts = ({ site }: { site: any }) => {
  const uuid = site?.uuid || '';
  const readiness = useMemo(() => evaluateLocation(site), [site]);
  /* Keyed per location, so the same count is shared with the detail panel rather
     than fetched twice when an admin opens one. */
  const { counts, isLoading } = useSiteHeadcount(uuid ? [uuid] : []);
  const headcount = counts[uuid];
  /* One shared fetch across every card — the query key is the same, so React
     Query serves all of them from a single request. */
  const { bySite } = useLocationNumbers();
  const numberCount = (bySite[uuid] || []).length;

  const peopleLabel = isLoading
    ? 'Counting…'
    : headcount === undefined
      ? 'People unknown'
      : headcount === 0
        ? 'No people yet'
        : `${headcount} ${headcount === 1 ? 'person' : 'people'}`;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
        <Users className="h-3.5 w-3.5 text-gray-400" />
        {peopleLabel}
      </span>

      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
        <Hash className="h-3.5 w-3.5 text-gray-400" />
        {numberCount === 0
          ? 'No numbers'
          : `${numberCount} ${numberCount === 1 ? 'number' : 'numbers'}`}
      </span>

      {readiness.isComplete ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Details complete
        </span>
      ) : (
        /* A count on its own ("1 thing needed") makes an admin open the record to
           find out what. With one issue there is room to just say it. */
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
            readiness.requiredMissing > 0 ? 'text-amber-700' : 'text-gray-600'
          }`}
          title={readiness.issues.map((issue) => issue.label).join(' · ')}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {readiness.issues.length === 1
            ? readiness.issues[0].label
            : `${readiness.issues.length} things to complete`}
        </span>
      )}
    </div>
  );
};

export default LocationFacts;

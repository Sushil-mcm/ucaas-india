import ActivityList from '@/components/activity-list/activity-list';
import { useMemo, useState } from 'react';
import SkillMatchFilter, { SkillMatch, withSkillMatchFilter } from './skill-match-filter';

/* The campaign call log with its own filter row.
 *
 * The page hands over whatever filters it already has (the campaign, the
 * answered-only view); this adds the Skill match control and merges its
 * choice into the same `filters` list, so the page itself needs no state
 * for it and the list refetches the way it does for any filter. */

interface CampaignCallLogListProps {
  payloadExtraParams?: { filters?: Array<{ key: string; value: unknown }>; [key: string]: unknown };
  emptyPlaceholder?: string;
  description?: string;
}

const CampaignCallLogList = ({
  payloadExtraParams,
  emptyPlaceholder = 'No campaign logs found',
  description = 'Campaign activity will appear here once campaigns start running.',
}: CampaignCallLogListProps) => {
  const [skillMatch, setSkillMatch] = useState<SkillMatch>('');
  const merged = useMemo(
    () => withSkillMatchFilter(payloadExtraParams, skillMatch),
    [payloadExtraParams, skillMatch],
  );

  return (
    <div className="w-full flex flex-col">
      <div className="w-full px-3 pt-3 flex items-center justify-end gap-3">
        <span className="text-xs text-gray-500">Skill match</span>
        <SkillMatchFilter value={skillMatch} onChange={setSkillMatch} />
      </div>
      <ActivityList
        payloadExtraParams={merged}
        activityType="campaignLogs"
        contactId=""
        notesOnlyAction
        showActions={true}
        emptyPlaceholder={emptyPlaceholder}
        description={description}
      />
    </div>
  );
};

export default CampaignCallLogList;

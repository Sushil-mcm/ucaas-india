import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import CustomTooltip from '@/components/custom/custom-tooltip';
import './activity-page-head.css';

/**
 * The head every Activity screen gets.
 *
 * Phone, Chat, Agent Chat, Video, Inbox and Campaign are full-height
 * application layouts rather than list pages, so they never shared the head
 * that Directory's `DirectoryPage` gives its screens -- each one started
 * straight into its own columns with no title at all. This is the same head,
 * lifted out so those six can carry it without being rebuilt around a shell
 * they do not fit.
 *
 * Deliberately the same shape as Directory: the title at 23px/800 in a white
 * card, and the description behind an info button rather than printed as a
 * second line. That keeps the head one line tall, which is what lets the title
 * sit level with the rail beside it.
 */
export const ActivityPageHead = ({
  title,
  description,
  actions,
}: {
  title: string;
  /** Shown in the info tooltip beside the title, never inline. */
  description?: ReactNode;
  actions?: ReactNode;
}) => (
  <div className="mcm-acthead">
    <div className="mcm-acthead-title">
      <h1>{title}</h1>
      {description ? (
        <CustomTooltip text={description} side="bottom" className="max-w-xs">
          <button type="button" className="mcm-acthead-info" aria-label={`About ${title}`}>
            <Info size={15} aria-hidden="true" />
          </button>
        </CustomTooltip>
      ) : null}
    </div>
    {actions ? <div className="mcm-acthead-actions">{actions}</div> : null}
  </div>
);

export default ActivityPageHead;

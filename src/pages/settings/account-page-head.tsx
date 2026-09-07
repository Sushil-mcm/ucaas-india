import { Info } from 'lucide-react';
import CustomTooltip from '@/components/custom/custom-tooltip';

/**
 * The page head shared by every My Account screen.
 *
 * All seven used to carry `.mcm-adminpage-head`: an eyebrow reading
 * "My Account", the page name, and a sentence explaining the page — three
 * stacked lines above a form whose own fields and section headings say the
 * same thing more precisely. The eyebrow in particular repeated what the rail
 * to the left already shows and highlights, so it told nobody anything they
 * could not see without moving their eyes.
 *
 * On a settings screen that is a lot of the first screenful spent before a
 * single control appears. This is one slim bar with the page's name, and the
 * sentence kept on an info button for anyone who wants it.
 *
 * Written as one component rather than repeated markup because seven copies
 * of a header is seven places for it to drift — which is how the old one
 * ended up with a different heading from its own sidebar label on two pages.
 */
const AccountPageHead = ({
  title,
  about,
  children,
}: {
  /** Matches the label the rail uses for this page. */
  title: string;
  /** The sentence that used to sit under the title; now on the info button. */
  about: string;
  /** Optional right-hand slot: a status note, a search box, an action. */
  children?: React.ReactNode;
}) => (
  <div className="mcm-acct-head-slim">
    <h1>{title}</h1>
    <CustomTooltip side="right" text={about}>
      <button type="button" className="mcm-acct-head-info" aria-label={`About ${title}`}>
        <Info aria-hidden="true" />
      </button>
    </CustomTooltip>
    {children ? <div className="mcm-acct-head-slim-end">{children}</div> : null}
  </div>
);

export default AccountPageHead;

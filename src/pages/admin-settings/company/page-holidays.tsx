/* Declaring the dates and putting them on lines are two halves of one job, so
   they sit together rather than in separate sections. */
import CompanyHolidays from './company-holidays';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import CompanyHolidayApply from './company-holiday-apply';
import { SectionActions } from './section-actions';
import type { CompanyHolidaysHandle } from './company-holidays';

const CompanyHolidaysPage = () => {
  /* The save belongs to the holiday list, which is where the draft and the
     mutation live. The page holds the handle so the row that closes every other
     settings tab can close this one too, rather than this being the one screen
     whose only save is tucked into a panel header. */
  const list = useRef<CompanyHolidaysHandle>(null);

  return (
    <div className="cs-section flex flex-col gap-4">
      <CompanyHolidays ref={list} />
      <CompanyHolidayApply />
      <div className="cs-savebar">
        <p>Saved for your whole company. Holiday dates apply to every menu, queue and person.</p>
        <SectionActions>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="cs-save"
            onClick={() => list.current?.save()}
          >
            Save settings
          </Button>
        </SectionActions>
      </div>
    </div>
  );
};

export default CompanyHolidaysPage;

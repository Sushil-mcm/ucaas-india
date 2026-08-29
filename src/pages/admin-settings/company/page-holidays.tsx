/* Declaring the dates and putting them on lines are two halves of one job, so
   they sit together rather than in separate sections. */
import CompanyHolidays from './company-holidays';
import CompanyHolidayApply from './company-holiday-apply';

const CompanyHolidaysPage = () => (
  <div className="flex flex-col gap-4">
    <CompanyHolidays />
    <CompanyHolidayApply />
  </div>
);

export default CompanyHolidaysPage;

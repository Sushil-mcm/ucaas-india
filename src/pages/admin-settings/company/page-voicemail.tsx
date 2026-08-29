/* Ring time and voicemail together: how long a phone rings, then where the call
   lands when nobody picks up. Splitting them made an admin set half a rule. */
import CompanyRingTime from './company-ring-time';
import CompanyVoicemail from './company-voicemail';

const CompanyVoicemailPage = () => (
  <div className="flex flex-col gap-4">
    <CompanyRingTime />
    <CompanyVoicemail />
  </div>
);

export default CompanyVoicemailPage;

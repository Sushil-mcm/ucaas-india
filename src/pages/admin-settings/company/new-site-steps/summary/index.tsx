import { Icon } from '@/assets/icons/icon';
import { MapPinIcon } from 'lucide-react';

const Summary = ({ formInstance }: any) => {
  const { watch } = formInstance;
  const [
    watchSiteName,
    watchAddress,
    watchState,
    watchCity,
    watchCountry,
    watchPostalCode,
    watchTimezone,
    watchCallerIdType,
    watchCallerIdName,
  ] = watch([
    'name',
    'address',
    'state',
    'city',
    'country',
    'postal_code',
    'timezone',
    'caller_id_type',
    'caller_id_name',
  ]);

  /* The summary is the last chance to catch a wrong setting, so the codes are
     spelled out here the same way they are on the form. */
  const callerIdSummary: Record<string, string> = {
    MAIN: 'Company main number',
    CUSTOM: watchCallerIdName ? `Custom name — ${watchCallerIdName}` : 'Custom name — none entered',
    BLANK: 'Withheld — no number shown',
  };

  return (
    // <div className="flex flex-col gap-2 h-[calc(100vh_-_19rem)] overflow-auto pt-4">
    <div className="flex w-full flex-col gap-3">
      <h5 className="font-semibold text-gray-900 text-md">Site Summary Overview</h5>
      <div className="flex gap-4">
        {/* <div className="flex flex-col gap-3 border border-gray-200 rounded-xl p-3 w-1/2"> */}
        <div className="flex w-full flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <h6 className="font-semibold text-gray-900 text-base flex items-center gap-2">
              <Icon name="CompayIcon" className="h-4.5 w-4.5 text-primary" />
              Location Details
            </h6>
            <div className="flex flex-col gap-1 rounded-md border border-gray-200 bg-gray-100 p-3 sm:flex-row sm:items-center">
              <h6 className="text-sm font-semibold text-gray-800">Location Name:</h6>
              <span className="break-words text-sm text-gray-800">{watchSiteName}</span>
            </div>
          </div>
          <hr className="text-gray-200 w-full my-2" />
          <div className="flex flex-col gap-3">
            <h6 className="font-semibold text-gray-900 text-base flex items-center gap-2">
              <MapPinIcon className="w-4.5 h-4.5 text-primary" />
              Physical Address
            </h6>
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <h6 className="min-w-32 text-sm font-semibold text-gray-800">Address:</h6>
                <span className="break-words text-sm text-gray-800">{watchAddress}</span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <h6 className="min-w-32 text-sm font-semibold text-gray-800">City:</h6>
                <span className="break-words text-sm text-gray-800">{watchCity}</span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <h6 className="min-w-32 text-sm font-semibold text-gray-800">State:</h6>
                <span className="break-words text-sm text-gray-800">{watchState}</span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <h6 className="min-w-32 text-sm font-semibold text-gray-800">Country:</h6>
                <span className="break-words text-sm text-gray-800">{watchCountry?.value}</span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <h6 className="min-w-32 text-sm font-semibold text-gray-800">Postal Code:</h6>
                <span className="break-words text-sm text-gray-800">{watchPostalCode}</span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <h6 className="min-w-32 text-sm font-semibold text-gray-800">Timezone:</h6>
                <span className="break-words text-sm text-gray-800">
                  {watchTimezone?.value || '---'}
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <h6 className="min-w-32 text-sm font-semibold text-gray-800">Caller ID:</h6>
                <span className="break-words text-sm text-gray-800">
                  {callerIdSummary[watchCallerIdType] || '---'}
                </span>
              </div>
            </div>
          </div>

          {/* Said here rather than discovered later.

              Established business phone systems ask for a billing contact and an
              emergency address as part of creating a location, and an admin who
              has used one will be looking for those steps. This platform keeps
              both for the company as a whole — there is nowhere on a location
              record to put them — so the honest thing is to name where they
              actually live instead of leaving somebody hunting for a step that
              does not exist. */}
          <hr className="text-gray-200 w-full my-2" />
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-semibold text-gray-900">What this location will control</p>
            <p className="mt-1 text-xs text-gray-600">
              Anyone you assign here picks up this timezone for their working hours, and this
              address is what the location is registered at for buying local numbers.
            </p>
            <p className="mt-2 text-xs text-gray-600">
              Billing details and the emergency address are held once for your whole company, not
              per location — you will find them under Company &amp; Locations, in Billing and in
              Emergency address. Outbound caller ID is recorded against this location but is not yet
              applied to calls; what someone shows when they dial out still comes from their own
              record.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;

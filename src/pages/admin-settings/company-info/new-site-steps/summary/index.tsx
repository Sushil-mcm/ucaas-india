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
    // watchCallerIdType,
    // watchCallerIdName,
  ] = watch([
    'name',
    'address',
    'state',
    'city',
    'country',
    'postal_code',
    'timezone',
    // 'caller_id_type',
    // 'caller_id_name',
  ]);

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
            </div>
          </div>
        </div>
        {/* <div className="flex flex-col gap-5 border border-gray-400 rounded-xl p-3 w-1/2">
            <div className="flex gap-1 flex-col">
              <h6 className="font-semibold">Caller ID</h6>
              <div className="flex gap-1 items-center">
                <h6 className="font-medium text-xs">Name:</h6>
                <span className="text-xs ">{watchCallerIdName}</span>
              </div>
              <div className="flex gap-1 items-center">
                <h6 className="font-medium text-xs">Type:</h6>
                <span className="text-xs">{watchCallerIdType}</span>
              </div>
            </div>
          </div> */}
      </div>
    </div>
  );
};

export default Summary;

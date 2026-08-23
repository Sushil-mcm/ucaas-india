import { useFormContext } from 'react-hook-form';
import { SET_UP_CALL_SCREENING_OPTIONS } from '../constants';

const Summary = () => {
  const { watch } = useFormContext();
  const {
    condition = {},
    callHandling: { businessHours = {}, closedHours = {}, recording = {} } = {},
    media: { welcome = {}, hold = {}, voicemail = {} } = {},
  } = watch();
  const callScreeningObj = SET_UP_CALL_SCREENING_OPTIONS?.find(
    (item) => item?.value === condition?.callScreening?.value,
  );
  return (
    <div className="flex flex-col gap-2 h-[calc(100vh_-_16.5rem)] overflow-auto">
      <div className="flex gap-4 mt-2 ">
        <div className="flex flex-col gap-3 border border-gray-200 rounded-xl p-3 w-1/2">
          <div className="flex gap-2 flex-col">
            <h6 className="font-semibold text-gray-900 text-md">Condition</h6>
            <div className="flex flex-col gap-1.5">
              {/* <div className="flex gap-1 items-center">
                                <h6 className="font-semibold">Template Name:</h6>
                                <span className="text-sm">{condition?.templateName || ''}</span>
                            </div> */}
              <div className="flex gap-1 items-center">
                <h6 className="text-gray-800 text-sm font-semibold">Business Hours:</h6>
                <span className="text-gray-800 text-sm">
                  {condition?.dateTime?.businessHours?.type === 'weekly' ? 'Weekly' : '24 Hours'}
                </span>
              </div>
              <div className="flex gap-1 items-center">
                <h6 className="text-gray-800 text-sm font-semibold">Caller ID:</h6>
                <span className="text-gray-800 text-sm">
                  {condition?.callerId?.enabled ? condition?.callerId?.value.join(',') : 'Disabled'}
                </span>
              </div>
              <div className="flex gap-1 items-center">
                <h6 className="text-gray-800 text-sm font-semibold">Call Screening:</h6>
                <span className="text-gray-800 text-sm">
                  {condition?.callScreening?.enabled ? callScreeningObj?.label : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border border-gray-200 rounded-xl p-3 w-1/2">
          <div className="flex gap-2 flex-col">
            <h6 className="font-semibold text-gray-900 text-md">Call Handling</h6>
            <div className="flex flex-col gap-1.5">
              <h6 className="text-gray-900 text-sm font-semibold">Business Hours</h6>
              <div className="flex gap-1 items-center">
                <h6 className="text-gray-800 text-sm font-semibold">Incoming Calls:</h6>
                <span className="text-gray-800 text-sm">{businessHours?.forwardType}</span>
              </div>
              {/* <div className="flex gap-1 items-center">
                <h6 className="text-gray-800 text-sm font-semibold">Missed Calls:</h6>
                <span className="text-gray-800 text-sm">
                  {businessHours?.missedCall?.forwardType?.value}
                </span>
              </div> */}
            </div>
          </div>
          <hr className="text-grey-400 w-full" />
          {condition?.dateTime?.businessHours?.type !== '24_hours' && (
            <div className="flex flex-col gap-1.5">
              <h6 className="text-gray-900 text-sm font-semibold">Closed Hours</h6>
              <div className="flex gap-1 items-center">
                <h6 className="text-gray-800 text-sm font-semibold">Incoming Calls:</h6>
                <span className="text-gray-800 text-sm">{closedHours?.forwardType}</span>
              </div>
              {/* <div className="flex gap-1 items-center">
                <h6 className="text-gray-800 text-sm font-semibold">Missed Calls:</h6>
                <span className="text-gray-800 text-sm">
                  {closedHours?.missedCall?.forwardType?.value}
                </span>
              </div> */}
            </div>
          )}
          {condition?.dateTime?.businessHours?.type !== '24_hours' && (
            <hr className="text-grey-200 w-full" />
          )}
          <div className="flex flex-col gap-1.5">
            <h6 className="text-gray-900 text-sm font-semibold">Recording</h6>
            <div className="flex gap-1 items-center">
              <h6 className="text-gray-800 text-sm font-semibold">On Demand Call Recording:</h6>
              <span className="text-gray-800 text-sm">
                {recording?.onDemand ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex gap-1 items-center">
              <h6 className="text-gray-800 text-sm font-semibold">Automatic Call Recording:</h6>
              <span className="text-gray-800 text-sm">
                {recording?.automatic ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border border-gray-200 rounded-xl p-3 w-1/2">
          <div className="flex gap-2 flex-col">
            <h6 className="font-semibold text-gray-900 text-md">Media</h6>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1 items-center">
                <h6 className="text-gray-800 text-sm font-semibold">Welcome Message:</h6>
                <span className="text-gray-800 text-sm">
                  {welcome?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex gap-1 items-center">
                <h6 className="text-gray-800 text-sm font-semibold">On hold Message:</h6>
                <span className="text-gray-800 text-sm">
                  {hold?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex gap-1 items-center">
                <h6 className="text-gray-800 text-sm font-semibold">Voicemail Message:</h6>
                <span className="text-gray-800 text-sm">
                  {voicemail?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;

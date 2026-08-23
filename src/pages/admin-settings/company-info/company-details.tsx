const CompanyDetails = ({ data = {} }: any) => {
  const {
    name = '',
    address = '',
    city = '',
    state = '',
    country = '',
    postal_code = '',
    caller_id_name = '',
    caller_id_type = '',
    timezone = '',
  } = data;
  return (
    <div className="h-full w-full flex flex-col justify-between">
      <div className="flex flex-col gap-2 h-[calc(100vh_-_19rem)] overflow-auto pt-2">
        <h5 className="font-semibold text-gray-900 text-md">Company Details</h5>
        <div className="flex gap-4">
          <div className="flex flex-col gap-3 border border-gray-200 rounded-xl p-3 w-1/2">
            <div className="flex gap-1 flex-col">
              <h6 className="font-semibold text-gray-900 text-md">General Info</h6>
              <div className="flex gap-1 items-center">
                <h6 className="text-gray-800 text-sm font-semibold">Location Name:</h6>
                <span className="text-gray-800 text-sm">{name}</span>
              </div>
            </div>
            <hr className="text-gray-200 w-full" />
            <div className="flex gap-2 flex-col">
              <h6 className="font-semibold text-gray-900 text-md">Address</h6>
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1 items-center">
                  <h6 className="text-gray-800 text-sm font-semibold">Address:</h6>
                  <span className="text-gray-800 text-sm">{address}</span>
                </div>
                <div className="flex gap-1 items-center">
                  <h6 className="text-gray-800 text-sm font-semibold">City:</h6>
                  <span className="text-gray-800 text-sm">{city}</span>
                </div>
                <div className="flex gap-1 items-center">
                  <h6 className="text-gray-800 text-sm font-semibold">State:</h6>
                  <span className="text-gray-800 text-sm">{state}</span>
                </div>
                <div className="flex gap-1 items-center">
                  <h6 className="text-gray-800 text-sm font-semibold">Country:</h6>
                  <span className="text-gray-800 text-sm">{country}</span>
                </div>
                <div className="flex gap-1 items-center">
                  <h6 className="text-gray-800 text-sm font-semibold">ZIP Code:</h6>
                  <span className="text-gray-800 text-sm">{postal_code}</span>
                </div>
                <div className="flex gap-1 items-center">
                  <h6 className="text-gray-800 text-sm font-semibold">Timezone:</h6>
                  <span className="text-gray-800 text-sm">{timezone || '---'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 border border-gray-200 rounded-xl p-3 w-1/2">
            <div className="flex gap-2 flex-col">
              <h6 className="font-semibold text-gray-900 text-md">Caller ID</h6>
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1 items-center">
                  <h6 className="text-gray-800 text-sm font-semibold">Name:</h6>
                  <span className="text-gray-800 text-sm">{caller_id_name}</span>
                </div>
                <div className="flex gap-1 items-center">
                  <h6 className="text-gray-800 text-sm font-semibold">Type:</h6>
                  <span className="text-gray-800 text-sm">{caller_id_type}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetails;

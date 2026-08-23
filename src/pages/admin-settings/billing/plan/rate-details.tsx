import { useQuery } from '@tanstack/react-query';
import { checkPlanRates } from '@/services/api';

export type RateType = 'call' | 'sms' | 'mms' | 'fax';

interface RateCountry {
  country_name: string;
  country_code_iso2: string;
}

interface RateDetailsProps {
  countries: RateCountry[];
  credits: number;
  rateTypes: RateType[];
  rateCardIds: Partial<Record<RateType, string>>;
}

const getRateResult = (response: any) => {
  const result = response?.data?.data?.result ?? response?.data?.result ?? [];
  return Array.isArray(result) ? result : [];
};

const RateDetails = ({ countries, credits, rateTypes, rateCardIds }: RateDetailsProps) => {
  const alpha2Codes = countries
    .map((country) => country?.country_code_iso2)
    .filter(Boolean)
    .map((countryCode) => countryCode.toUpperCase());
  const requestTypes = rateTypes.filter((serviceType) => rateCardIds[serviceType]);

  const {
    data: detailsData = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: [
      'checkPlanRates',
      credits,
      alpha2Codes.join(','),
      requestTypes.join(','),
      requestTypes.map((serviceType) => rateCardIds[serviceType]).join(','),
    ],
    queryFn: async () => {
      const responses = await Promise.all(
        requestTypes.map(async (serviceType) => ({
          serviceType,
          response: await checkPlanRates({
            ratecard_uuid: rateCardIds[serviceType] || '',
            price: Number(credits) || 0,
            type: serviceType,
            alpha2code: alpha2Codes,
          }),
        })),
      );

      return responses.flatMap(({ response, serviceType }) =>
        getRateResult(response).map((item) => ({
          ...item,
          _serviceType: serviceType,
        })),
      );
    },
    enabled: alpha2Codes.length > 0 && requestTypes.length > 0,
  });

  if (!alpha2Codes.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
        No countries are available for this service.
      </div>
    );
  }

  if (!requestTypes.length) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-700">
        Rate card details are not available for this plan.
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
        Checking rates...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        Unable to load rates.
      </div>
    );
  }

  if (!detailsData.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
        No rate data available.
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      {detailsData.map((item: any, index: number) => {
        const serviceType = (item?._serviceType || requestTypes[0]) as RateType;
        const perUnitValue =
          serviceType === 'call'
            ? item?.minutes_per_unit
            : serviceType === 'sms'
              ? (item?.sms_per_unit ?? item?.minutes_per_unit)
              : serviceType === 'mms'
                ? item?.mms_per_unit
                : (item?.fax_per_unit ?? item?.minutes_per_unit);
        const perUnit = Number(perUnitValue || 0);
        const unit =
          serviceType === 'call'
            ? perUnit === 1
              ? 'Minute'
              : 'Minutes'
            : serviceType === 'sms'
              ? 'SMS'
              : serviceType === 'mms'
                ? 'MMS'
                : 'FAX';

        return (
          <div
            key={`${serviceType}-${item?.ratecard_uuid || 'rate'}-${item?.alpha2code || 'country'}-${item?.type || 'type'}-${index}`}
            className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-primary hover:bg-white"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">
                {item?.country_name || item?.alpha2code || 'Unknown country'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {item?.type ? (
                  <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {item.type}
                  </span>
                ) : null}
                {item?.rate != null ? (
                  <span className="text-xs text-gray-600">
                    Rate: <span className="font-semibold text-gray-900">${item.rate}</span>
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-baseline gap-1 text-right">
              <span className="text-lg font-semibold text-primary">{perUnit}</span>
              <span className="text-sm text-gray-600">{unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RateDetails;

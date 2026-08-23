import { getSmsRate } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

interface UseSmsRateCreditsParams {
  segment: number;
  phone?: string;
  alpha2code?: string;
}

const getCreditsFromResponse = (response: any) => {
  const result =
    response?.data?.data?.result ??
    response?.data?.result ??
    response?.data?.data ??
    response?.data;
  const rateResult = Array.isArray(result) ? result[0] : result;
  const credits =
    typeof rateResult === 'number' || typeof rateResult === 'string'
      ? rateResult
      : (rateResult?.applied_sms_cost ??
        rateResult?.applied_sms_cost ??
        rateResult?.applied_sms_cost ??
        0);
  const numericCredits = Number(credits);

  return Number.isFinite(numericCredits) ? numericCredits : 0;
};

export const useSmsRateCredits = ({
  segment,
  phone = '',
  alpha2code = '',
}: UseSmsRateCreditsParams) => {
  const normalizedPhone = String(phone).replace(/\D/g, '');
  const normalizedAlpha2Code = String(alpha2code).trim().toUpperCase();
  const normalizedSegment = Number(segment) || 0;

  const { data: credits = 0, ...query } = useQuery({
    queryKey: ['getSmsRate', normalizedSegment, normalizedPhone, normalizedAlpha2Code],
    queryFn: () =>
      getSmsRate({
        segment: normalizedSegment,
        phone: normalizedPhone,
        alpha2code: normalizedAlpha2Code,
      }),
    select: getCreditsFromResponse,
    enabled:
      normalizedSegment > 0 && normalizedPhone.length > 8 && normalizedAlpha2Code.length === 2,
  });

  return { credits, ...query };
};

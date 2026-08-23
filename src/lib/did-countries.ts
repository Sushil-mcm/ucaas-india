export interface DidCountry {
  country_name: string;
  country_prefix: string;
  country_code_iso2: string;
  country_code_iso3: string;
}

const parseDidCountries = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const normalizeDidCountries = (value: unknown): DidCountry[] => {
  const countries = parseDidCountries(value)
    .map((country: any) => ({
      country_name: String(country?.country_name || country?.name || '').trim(),
      country_prefix: String(country?.country_prefix || country?.prefix || '').trim(),
      country_code_iso2: String(
        country?.country_code_iso2 || country?.country_iso || country?.iso || country?.code || '',
      )
        .trim()
        .toUpperCase(),
      country_code_iso3: String(country?.country_code_iso3 || '')
        .trim()
        .toUpperCase(),
    }))
    .filter((country) => country.country_name && country.country_code_iso2);

  return countries.filter(
    (country, index) =>
      countries.findIndex((item) => item.country_code_iso2 === country.country_code_iso2) === index,
  );
};

export const getPlanDidCountries = (source: any): DidCountry[] => {
  const candidates = [
    source,
    source?.did_countries,
    source?.didCountries,
    source?.dataValues?.did_countries,
    source?.plan_info?.did_countries,
    source?.plan_info?.dataValues?.did_countries,
    source?.current_plan_details?.did_countries,
    source?.current?.did_countries,
    source?.current?.plan_info?.did_countries,
    source?.current?.plan_info?.dataValues?.did_countries,
    source?.signUpResponseData?.current?.did_countries,
    source?.signUpResponseData?.current?.plan_info?.did_countries,
    source?.signUpResponseData?.current?.plan_info?.dataValues?.did_countries,
  ];

  for (const candidate of candidates) {
    const countries = normalizeDidCountries(candidate);
    if (countries.length) return countries;
  }

  return [];
};

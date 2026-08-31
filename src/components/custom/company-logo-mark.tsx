/* The company's logo in the header, beside the user's avatar.
 *
 * Renders nothing at all when no logo is set, which is the ordinary case - an
 * empty placeholder in a header is worse than no logo, because it looks like
 * something failed to load.
 *
 * The image is fetched through the authenticated media route, so it only works
 * for somebody signed in to that company. That is the point: a logo is often
 * the first file a new customer uploads, and it should not be the one thing
 * about them that is readable by anybody with the URL.
 */

import { useQuery } from '@tanstack/react-query';

import { AuthenticatedImage } from '@/components/custom/authenticated-media';
import { useUser } from '@/hooks/use-user';
import { getEnv } from '@/lib/utils';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';
import { logoMediaUrl, readStoredLogo } from '@/lib/company-logo';

const CompanyLogoMark = () => {
  const { user } = useUser();

  const { data: companyDefaults } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    /* The header is on every screen, so this must not become a request per
       navigation. The company logo changes about once. */
    staleTime: 5 * 60 * 1000,
  });

  const src = logoMediaUrl({
    apiBaseUrl: getEnv().VITE_API_BASE_URL,
    companyUuid: user?.company_info?.uuid || (user as any)?.company_uuid,
    fileName: readStoredLogo(companyDefaults?.settings),
  });

  if (!src) return null;

  return (
    <AuthenticatedImage
      src={src}
      /* Named rather than described: a screen reader saying "company logo" adds
         nothing a sighted user gets, and the company name is the useful part. */
      alt={`${user?.company_info?.name || 'Company'} logo`}
      className="mr-2 h-7 max-w-[7.5rem] shrink-0 object-contain"
    />
  );
};

export default CompanyLogoMark;

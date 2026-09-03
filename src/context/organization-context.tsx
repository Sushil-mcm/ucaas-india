import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
// import { getEnv } from '@/lib/utils';
import { getMainSiteInfo } from '@/services/api';
import ServerMaintenance from '@/components/custom/server-maintenance';
import { getEnv } from '@/lib/utils';
import FullPageLoader from '@/components/custom/full-page-loader';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const NO_ORGANIZATION_PATH = '/no-organization';

const getFirstNonEmptyString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const getAbsoluteAssetUrl = (path: unknown) => {
  const assetPath = getFirstNonEmptyString(path);
  if (!assetPath) return '';
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  const baseUrl = (getEnv() as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL || '';
  return `${baseUrl.replace(/\/$/, '')}/${assetPath.replace(/^\//, '')}`;
};

const setMetaContent = (attribute: 'name' | 'property', key: string, content: string) => {
  if (!content) return;

  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.content = content;
};

export interface MainSiteInfo {
  [key: string]: unknown;
}

interface OrganizationContextType {
  mainSiteInfo: MainSiteInfo | null;
  isLoading: boolean;
  error: Error | null;
}

export const OrganizationContext = createContext<OrganizationContextType>({
  mainSiteInfo: null,
  isLoading: true,
  error: null,
});

/** Domain is taken from the current route (window.location.origin). */
const getDomain = () => window.location.origin;

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [mainSiteInfo, setMainSiteInfo] = useState<MainSiteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isNoOrgPage, setIsNoOrgPage] = useState(false);

  const stripePublishableKey =
    typeof mainSiteInfo?.stripe_publish_key === 'string'
      ? mainSiteInfo.stripe_publish_key.trim()
      : '';
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );
  const appearance = { theme: 'stripe', hidePostalCode: true };

  const options: any = {
    currency: 'usd',
    appearance,
    fonts: [
      {
        cssSrc: 'https://fonts.googleapis.com/css?family=Montserrat:300,300i,400,500,600',
      },
    ],
  };

  const fetchMainSiteInfo = useCallback(async () => {
    const domain = getDomain().includes('localhost')
      ? 'https://qa.mycountrymobile.com'
      : getDomain();
    // const domain = "https://mcm.mycountrymobile.com";
    try {
      setIsLoading(true);
      setError(null);
      const res = await getMainSiteInfo({ domain }, { hideToastOnError: true });
      const result = res?.data?.data?.result ?? res?.data?.result ?? res?.data ?? null;
      setMainSiteInfo(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load organization'));
      // window.location.replace(NO_ORGANIZATION_PATH);
      return;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === NO_ORGANIZATION_PATH) {
      setIsNoOrgPage(true);
      setIsLoading(false);
      return;
    }
    // Clear title so it doesn't show until org data (fav_title) arrives
    document.title = '';
    fetchMainSiteInfo();
  }, [fetchMainSiteInfo]);
  // Apply mainSiteInfo colors to CSS variables: --primary, --color-ucass-primary-200, --color-ucass-active
  useEffect(() => {
    if (!mainSiteInfo || typeof document === 'undefined') return;
    const root = document.documentElement;
    const primary = mainSiteInfo.primary_color;
    const secondary = mainSiteInfo.secondary_color;
    const activeSidebar = mainSiteInfo.active_sidebar_color;
    const activeSidebarbg = mainSiteInfo.active_sidebar_bg_color;
    const loginBgColor = mainSiteInfo.login_page_bg_color;
    if (typeof primary === 'string' && primary) {
      root.style.setProperty('--primary', primary);
    }
    if (typeof secondary === 'string' && secondary) {
      root.style.setProperty('--color-ucass-primary-200', secondary);
    }
    if (typeof activeSidebar === 'string' && activeSidebar) {
      root.style.setProperty('--color-ucass-active', activeSidebar);
    }
    if (typeof activeSidebarbg === 'string' && activeSidebarbg) {
      root.style.setProperty('--color-ucass-active-bg', activeSidebarbg);
    }
    if (typeof loginBgColor === 'string' && loginBgColor) {
      root.style.setProperty('--color-ucass-login-bg', loginBgColor);
    }
  }, [mainSiteInfo]);

  // Apply organization branding to the document and social-sharing metadata.
  useEffect(() => {
    if (!mainSiteInfo || typeof document === 'undefined') return;
    const organizationName = getFirstNonEmptyString(
      mainSiteInfo.source_name,
      mainSiteInfo.organization_name,
      mainSiteInfo.organisation_name,
      mainSiteInfo.company_name,
      mainSiteInfo.fav_title,
    );
    const title = getFirstNonEmptyString(mainSiteInfo.fav_title, organizationName);
    const description = getFirstNonEmptyString(
      mainSiteInfo.meta_description,
      mainSiteInfo.description,
      organizationName,
      title,
    );
    const shareImageUrl = getAbsoluteAssetUrl(
      mainSiteInfo.large_logo || mainSiteInfo.small_logo || mainSiteInfo.fav_icon,
    );
    const pageUrl = window.location.href;

    document.title = title;
    setMetaContent('name', 'description', description);
    setMetaContent('property', 'og:type', 'website');
    setMetaContent('property', 'og:title', organizationName || title);
    setMetaContent('property', 'og:site_name', organizationName || title);
    setMetaContent('property', 'og:description', description);
    setMetaContent('property', 'og:url', pageUrl);
    setMetaContent('name', 'twitter:card', shareImageUrl ? 'summary_large_image' : 'summary');
    setMetaContent('name', 'twitter:title', organizationName || title);
    setMetaContent('name', 'twitter:description', description);

    if (shareImageUrl) {
      setMetaContent('property', 'og:image', shareImageUrl);
      setMetaContent('property', 'og:image:secure_url', shareImageUrl);
      setMetaContent('property', 'og:image:alt', organizationName || title);
      setMetaContent('name', 'twitter:image', shareImageUrl);
      setMetaContent('name', 'twitter:image:alt', organizationName || title);
    }

    /* The tab icon is deliberately NOT taken from mainSiteInfo.fav_icon.

       This used to rewrite <link rel="icon"> to the org record's stored icon
       once the branding call returned. That record still holds the older
       cloud-only mark, so whatever index.html shipped was replaced a moment
       after load and the bundled icon could never be seen — and it also
       overwrote the light/dark pair with a single icon. The icon is part of
       this build now, the same way --primary is pinned in index.css for the
       same reason: the org API is not the source of truth for this
       deployment's branding.

       `mainSiteInfo.fav_icon` is still read a few lines above as the last
       fallback for the og:image / twitter:image tags, which should follow the
       org record. To go back to API-driven favicons, restore this block from
       git history and re-point the org's fav_icon; changing only one of the
       two leaves them disagreeing. */
  }, [mainSiteInfo]);

  const value: OrganizationContextType = {
    mainSiteInfo,
    isLoading,
    error,
  };

  if (!stripePublishableKey) {
    return <FullPageLoader />;
  }

  if (isNoOrgPage) {
    return (
      <OrganizationContext.Provider value={{ ...value, isLoading: false }}>
        <Elements stripe={stripePromise} options={options}>
          {children}
        </Elements>
      </OrganizationContext.Provider>
    );
  }

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (error) {
    return <ServerMaintenance onRefresh={fetchMainSiteInfo} />;
  }

  return (
    <OrganizationContext.Provider value={value}>
      <Elements stripe={stripePromise} options={options}>
        {children}
      </Elements>
    </OrganizationContext.Provider>
  );
};

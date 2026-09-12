/* Admin › People › Authentication (People module stage 2, 11 Sep 2026).
 *
 * How people sign in and how they are provisioned, on one owner-only page:
 *   - Single sign-on: the status of the SAML setup (the details live on
 *     Company › Security, which the live sign-in code reads).
 *   - Sessions: the inactivity timeout. It used to be a browser-only script;
 *     the gateway now enforces it on every request.
 *   - Allowed e-mail domains: a new person must be on one of them.
 *   - Provisioning (SCIM 2.0): the bearer token an identity provider uses to
 *     create, update and deactivate people through /scim/v2.
 *
 * All four live in the company_security section of the company defaults; the
 * page merges into it and never replaces it (lib/authentication-settings). */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldCheck, Timer, Mail } from 'lucide-react';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { getEnv, handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults, saveCompanyDefaults } from '@/lib/company-defaults';
import {
  generateScimSecret,
  invalidDomains,
  isIdleMinutesValid,
  IDLE_MAX_MINUTES,
  IDLE_MIN_MINUTES,
  normaliseDomains,
  readAuthSettings,
  scimBaseUrl,
  scimTokenFor,
  settingsObject,
  sha256Hex,
  withAuthSettings,
} from '@/lib/authentication-settings';

const SECURITY_KEY = 'company_security';

const toGreetingsObject = (raw: any): Record<string, any> => {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
};

const AuthenticationPage = () => {
  const queryClient: any = useQueryClient();
  const { user } = useUser();
  const companyUuid = String(user?.company_info?.uuid || user?.user_info?.company_uuid || '');
  const apiBase = String(getEnv().VITE_API_BASE_URL || '');

  const { data: template = null, isLoading, isError } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
  });
  const savedSettings = useMemo(() => settingsObject(template?.settings), [template]);
  const current = useMemo(() => readAuthSettings(savedSettings[SECURITY_KEY]), [savedSettings]);

  const [idleEnabled, setIdleEnabled] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState('30');
  const [domainsText, setDomainsText] = useState('');
  const [freshToken, setFreshToken] = useState<string | null>(null);

  useEffect(() => {
    setIdleEnabled(current.idleEnabled);
    setIdleMinutes(String(current.idleSeconds ? Math.round(current.idleSeconds / 60) : 30));
    setDomainsText(current.allowedDomains.join(', '));
  }, [current]);

  const { mutateAsync: save, isPending: isSaving } = useMutation({
    mutationFn: async (nextSection: Record<string, any>) =>
      saveCompanyDefaults({
        uuid: template?.uuid,
        settings: { ...savedSettings, [SECURITY_KEY]: nextSection },
        greetings: toGreetingsObject(template?.greetings),
        only: [SECURITY_KEY],
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_DEFAULTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['userTemplateList'] });
    },
    onError: (e: any) => handleAlert({ type: 'error', text: e?.response?.data?.message || 'Could not save.' }),
  });

  const badDomains = invalidDomains(domainsText);
  const idleValid = !idleEnabled || isIdleMinutesValid(idleMinutes);

  const saveSessionsAndDomains = async () => {
    if (!idleValid || badDomains.length) return;
    await save(
      withAuthSettings(savedSettings[SECURITY_KEY], {
        idleEnabled,
        idleMinutes: idleEnabled ? Number(idleMinutes) : null,
        allowedDomains: normaliseDomains(domainsText),
      }),
    );
    handleAlert({ type: 'success', text: 'Saved. The gateway applies it within half a minute.' });
  };

  const issueToken = async () => {
    if (!companyUuid) return;
    const secret = generateScimSecret();
    const tokenHash = await sha256Hex(secret);
    await save(
      withAuthSettings(savedSettings[SECURITY_KEY], {
        scim: { enabled: true, token_hash: tokenHash, token_hint: secret.slice(-4), created_at: new Date().toISOString() },
      }),
    );
    setFreshToken(scimTokenFor(companyUuid, secret));
    handleAlert({ type: 'success', text: 'Provisioning token issued. Copy it now; it is not shown again.' });
  };

  const revokeToken = async () => {
    await save(withAuthSettings(savedSettings[SECURITY_KEY], { scim: null }));
    setFreshToken(null);
    handleAlert({ type: 'success', text: 'Provisioning switched off. The old token no longer works.' });
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <Loader />
      </div>
    );
  }
  if (isError) return <p className="p-4 text-destructive">Could not load the company settings. Try again.</p>;

  return (
    <div className="flex flex-col gap-4 p-3">
      <div>
        <h2 className="text-xl font-semibold">Authentication</h2>
        <p className="text-sm text-muted-foreground max-w-[80ch]">
          How people sign in and how they are provisioned. Every rule here applies to the whole company.
        </p>
      </div>

      <SettingCard
        title="Single sign-on"
        icon={<ShieldCheck className="w-4 h-4" />}
        description="Sign in through your identity provider. The provider details (entity id, sign-in URL, certificate) are on Company › Security; the sign-in code reads them from there."
      >
        <SettingRow
          label="Status"
          description={current.ssoEnabled ? 'On. People can sign in with the provider; passwords still work unless you also require SSO there.' : 'Off. People sign in with a password and a code.'}
          control={<span className={`rounded-full px-2 py-0.5 text-xs ${current.ssoEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-muted'}`}>{current.ssoEnabled ? 'On' : 'Off'}</span>}
        />
        <SettingRow
          label="Metadata for your provider"
          description="Give this to the identity provider when you set the application up."
          control={<code className="text-xs break-all">{`${apiBase.replace(/\/+$/, '')}/api/auth/sso/saml/${companyUuid}/metadata`}</code>}
        />
      </SettingCard>

      <SettingCard
        title="Sessions"
        icon={<Timer className="w-4 h-4" />}
        description="How long a signed-in session may sit idle. The gateway now enforces this on every request (a tab left open elsewhere is signed out too); the browser also warns before it happens."
      >
        <SettingRow
          label="Inactivity timeout"
          description={`Between ${IDLE_MIN_MINUTES} minutes and ${IDLE_MAX_MINUTES / 60} hours. Background requests count as activity, the way established platforms count them.`}
          control={
            <div className="flex items-center gap-2">
              <Switch checked={idleEnabled} onCheckedChange={(v) => setIdleEnabled(Boolean(v))} aria-label="Inactivity timeout" />
              <Input className="w-24" inputMode="numeric" value={idleMinutes} disabled={!idleEnabled} onChange={(e) => setIdleMinutes(e.target.value)} aria-label="Minutes" />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          }
        />
        {!idleValid && <p className="text-sm text-destructive">Enter a whole number of minutes between {IDLE_MIN_MINUTES} and {IDLE_MAX_MINUTES}.</p>}
        <SettingRow
          label="Sign out everywhere"
          description="An administrator can end every session of one person from Admin › People (row menu). Suspending or removing a person does the same automatically."
        />
      </SettingCard>

      <SettingCard
        title="Allowed e-mail domains"
        icon={<Mail className="w-4 h-4" />}
        description="A new person must have an e-mail address on one of these domains. Leave empty to allow any address. Applies to people added by hand, by CSV and by provisioning."
      >
        <SettingRow
          label="Domains"
          description="Comma or space separated, e.g. mycompany.com, mycompany.co.uk"
          control={<Input className="w-80" value={domainsText} onChange={(e) => setDomainsText(e.target.value)} placeholder="mycompany.com" aria-label="Allowed domains" />}
        />
        {badDomains.length > 0 && <p className="text-sm text-destructive">Not a domain: {badDomains.join(', ')}</p>}
        <div className="flex justify-end pt-2">
          <Button onClick={saveSessionsAndDomains} disabled={isSaving || !idleValid || badDomains.length > 0}>Save sessions and domains</Button>
        </div>
      </SettingCard>

      <SettingCard
        title="Provisioning (SCIM 2.0)"
        icon={<KeyRound className="w-4 h-4" />}
        description="Let your identity provider create, update and deactivate people automatically. Works with any provider that speaks SCIM 2.0 (Okta, Entra ID, JumpCloud, OneLogin). A person created this way gets an invite and the Agent role unless the provider sends another; the owner role can never be provisioned."
      >
        <SettingRow label="Base URL" description="Enter this in the provider's provisioning settings." control={<code className="text-xs">{scimBaseUrl(apiBase)}</code>} />
        <SettingRow
          label="Token"
          description={current.scimEnabled ? `Issued ${current.scimCreatedAt ? current.scimCreatedAt.slice(0, 10) : ''} · ends in …${current.scimTokenHint}. Issuing a new one replaces it.` : 'No token issued. Provisioning is off until one is.'}
          control={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={issueToken} disabled={isSaving || !companyUuid}>{current.scimEnabled ? 'Issue a new token' : 'Issue a token'}</Button>
              {current.scimEnabled && <Button variant="outline" size="sm" className="text-destructive" onClick={revokeToken} disabled={isSaving}>Switch off</Button>}
            </div>
          }
        />
        {freshToken && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            <div className="font-medium text-amber-900">Copy this token now. It is shown once and stored only as a hash.</div>
            <code className="block break-all mt-1 text-xs">{freshToken}</code>
          </div>
        )}
        <SettingRow label="What the provider may do" description="Create a person (invite sent, next free extension picked), change name or e-mail, deactivate (suspend: sessions ended, queues left) and reactivate, remove (72-hour restore applies). Everything goes through the same checks as Admin › People." />
      </SettingCard>
    </div>
  );
};

export default AuthenticationPage;

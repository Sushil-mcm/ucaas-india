import { useEffect, useMemo, useRef, useState } from 'react';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  ShieldCheck,
  Timer,
  Network,
  Info,
  UserMinus,
  History,
  Unlock,
  AlertTriangle,
} from 'lucide-react';

import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { SectionHeading } from './section-heading';
import { SectionActions } from './section-actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { getEnv, handleAlert } from '@/lib/utils';
import { getUserList } from '@/services/api';
import { useUser } from '@/hooks/use-user';
import {
  type AllowlistAuditEntry,
  type AllowlistEntry,
  type AllowlistKind,
  type BreakGlassWindow,
  appendAudit,
  migrateLegacyAllowlist,
} from '@/lib/ip-allowlist';
import IpListPanel, { type IpListPanelHandle, IP_LIST_MAX_ENTRIES } from './ip-list-panel';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  saveCompanyDefaults,
} from '@/lib/company-defaults';

/**
 * Company security
 * -----------------------------------------------------------------------------
 * This platform already has a "Security & Privacy" page, but it lives under
 * My Account (src/pages/settings/security/index.tsx) and it is personal: your
 * own password, your own signed-in devices. There was no place to write down a
 * rule that applies to the whole company. This page is that place.
 *
 * Storage follows the same route as the rest of Company info: one row per
 * section in the company's `company_settings` table (section
 * `company_security`; older tenants still fall back to the "Company Default"
 * user_template row). Everything written from here is namespaced under
 * `settings.company_security`, and the rest of the record is spread through
 * untouched on save.
 *
 * ---------------------------------------------------------------------------
 * WHAT READS EACH KEY (re-checked against the LIVE api2 build, 9 Sep 2026)
 * ---------------------------------------------------------------------------
 *   ip_allowlist   default-api AuthController.login + AuthMiddleware, enforced
 *                  since 2 Sep 2026 (IP_ALLOWLIST_ENFORCEMENT_ENABLED=true).
 *   idle_timeout   src/hooks/use-idle-timeout.ts — this browser signs the idle
 *                  person out; the API never checks a session's age, so the
 *                  card says "In this app only".
 *   sso            default-api AuthController samlLogin / samlAcs / samlMetadata
 *                  / ssoResolve read `company_settings` section company_security
 *                  key `sso` (enabled, idp_sso_url, idp_certificate) straight
 *                  from the company's own database. LIVE: the sign-in page's
 *                  "Continue with SSO" resolves the work email to the company
 *                  and redirects to the recorded IdP URL. idp_entity_id and
 *                  single_logout_uri are stored but not read.
 *   mfa            default-api AuthController.login (the "recognised device"
 *                  token shortcut) and sendOtp (the 30-day skip) — the anchored
 *                  dist patch backend-patches/default-api/
 *                  patch_auth_mfa_required_signin.py. The badge is driven by
 *                  MFA_ENFORCEMENT_LIVE below; flip it only once the patch is
 *                  applied on the box that takes sign-ins.
 *
 * A security page that looks live but is not is worse than no page at all,
 * because an admin reads it and believes they are covered. Every card below
 * carries a `status` saying which it is: "Coming soon" where the server does
 * not act on the key yet, "In this app only" where the browser does the work.
 * If a key's reader changes, change that card's status and rewrite its note —
 * do not leave a stale reassurance in place.
 */

const SECURITY_KEY = 'company_security';
const SECURITY_SCHEMA_VERSION = 1;

/* Whether the sign-in server honours `mfa.required` / `mfa.exempt_user_uuids`.
   True only once backend-patches/default-api/patch_auth_mfa_required_signin.py
   has been applied to the default-api that serves this portal. Applied and
   proven on api2 (unified) 9 Sep 2026 18:33 UTC. A build for a portal whose
   API does not carry it (unified2-5 -> api3/api4, 695, ucaas.in) must set this
   back to false: the two MFA cards then keep their "Coming soon" badge and say
   so; nothing else changes. */
const MFA_ENFORCEMENT_LIVE = true;

/* What the sign-in server actually does, read from the live code on 9 Sep
   2026 (default-api AuthController + security-api AlertRules). Shown in the
   "fixed by the platform" block at the bottom so an admin reads real values,
   not a description of some other product. */
const SESSION_TOKEN_DAYS = 30; // JWT_VALIDITY=30d on api2
const TRUSTED_DEVICE_DAYS = 30; // TRUSTED_DEVICE_DAYS default in sendOtp
const OTP_CODE_MINUTES = 10; // OTP_EXPIRY_MS
const OTP_MAX_WRONG_CODES = 5; // OTP_MAX_ATTEMPTS
const OTP_WAIT_MINUTES = 10; // OTP_COOLDOWN_MS
const LOGIN_FAILURES_PER_IP = 10; // user_login_failure_velocity.actionThreshold.value
const LOGIN_FAILURE_WINDOW_MINUTES = 15; // ...intervalMinutes
const LOGIN_BLOCK_MINUTES = 15; // ...blockDurationMinutes

/* other established systems: minimum 300 seconds (5 minutes), maximum 28800 seconds (8 hours).
   Expressed in minutes here because that is how an admin thinks about it; the
   value is stored in seconds, which is the unit other established systems itself uses. */
const IDLE_MIN_MINUTES = 5;
const IDLE_MAX_MINUTES = 480;
const IDLE_HIPAA_MINUTES = 15;

/* How long a pre-armed emergency bypass stays open. Long enough to be useful
   if a home connection's address changes overnight; short enough that arming
   it and forgetting about it is not a standing hole. */
const BREAK_GLASS_HOURS = 2;

/* Where a browser can ask what its own public address is. Run client-side
   because the alternative - a same-origin endpoint that echoes the request's
   source IP back - needs a backend deploy this session cannot make (see the
   file header). api64.ipify.org answers with IPv6 when the browser has v6
   connectivity and falls back to IPv4 otherwise, so one call covers both. */
const MY_IP_LOOKUP_URL = 'https://api64.ipify.org?format=json';

/* Roles this platform treats as administrative. the usual hard rule is that
   Company, Office and Regional Admins cannot be put on the MFA exception list;
   this account's nearest equivalents are ADMIN and SUB-ADMIN, plus any custom
   role someone has named with "admin" in it. Matching on the name as well as
   the fixed roles is deliberate: a custom role called "Billing Admin" carries
   admin powers here even though it is not one of the built-in values. */
const FIXED_ADMIN_ROLES = ['ADMIN', 'SUB-ADMIN', 'SUPER-ADMIN', 'SUPERADMIN'];

interface SecurityForm {
  mfa_required: boolean;
  mfa_exempt_user_uuids: string[];
  idle_timeout_enabled: boolean;
  idle_timeout_minutes: string;
  ip_allow_enabled: boolean;
  ip_allow_entries: AllowlistEntry[];
  ip_block_enabled: boolean;
  ip_block_entries: AllowlistEntry[];
  ip_allowlist_audit: AllowlistAuditEntry[];
  ip_allowlist_break_glass: BreakGlassWindow | null;
  sso_enabled: boolean;
  sso_idp_entity_id: string;
  sso_idp_sso_url: string;
  sso_idp_certificate: string;
  sso_single_logout_uri: string;
}

const DEFAULT_FORM: SecurityForm = {
  /* Off until the company saves it on. The server treats "nothing saved" as
     "not required", so the switch must show that — showing it On for a
     company that never saved would tell an admin they are covered when they
     are not. (Earlier this defaulted to On as a written-down intent, back when
     nothing read the key.) */
  mfa_required: false,
  mfa_exempt_user_uuids: [],
  idle_timeout_enabled: false,
  idle_timeout_minutes: '30',
  ip_allow_enabled: false,
  ip_allow_entries: [],
  ip_block_enabled: false,
  ip_block_entries: [],
  ip_allowlist_audit: [],
  ip_allowlist_break_glass: null,
  sso_enabled: false,
  sso_idp_entity_id: '',
  sso_idp_sso_url: '',
  sso_idp_certificate: '',
  sso_single_logout_uri: '',
};

const toSettingsObject = (rawSettings: any): Record<string, any> => {
  if (!rawSettings) return {};
  if (typeof rawSettings === 'string') {
    try {
      const parsed = JSON.parse(rawSettings);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof rawSettings === 'object' ? rawSettings : {};
};

const toGreetingsObject = (rawGreetings: any): Record<string, any> =>
  toSettingsObject(rawGreetings);

const toStringValue = (value: any, fallback: string): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;

const toBoolean = (value: any, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toUuidList = (value: any): string[] =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim() !== '')
    : [];

const buildFormFromSettings = (settings: Record<string, any>): SecurityForm => {
  const security = settings?.[SECURITY_KEY] || {};
  const mfa = security?.mfa || {};
  const idle = security?.idle_timeout || {};
  const allowlist = migrateLegacyAllowlist(security?.ip_allowlist);
  const sso = security?.sso || {};

  const storedSeconds = Number(idle?.seconds);
  const storedMinutes =
    Number.isFinite(storedSeconds) && storedSeconds > 0
      ? String(Math.round(storedSeconds / 60))
      : DEFAULT_FORM.idle_timeout_minutes;

  return {
    mfa_required: toBoolean(mfa?.required, DEFAULT_FORM.mfa_required),
    mfa_exempt_user_uuids: toUuidList(mfa?.exempt_user_uuids),
    idle_timeout_enabled: toBoolean(idle?.enabled, DEFAULT_FORM.idle_timeout_enabled),
    idle_timeout_minutes: storedMinutes,
    ip_allow_enabled: allowlist.allow.enabled,
    ip_allow_entries: allowlist.allow.entries,
    ip_block_enabled: allowlist.block.enabled,
    ip_block_entries: allowlist.block.entries,
    ip_allowlist_audit: allowlist.audit_log,
    ip_allowlist_break_glass: allowlist.break_glass ?? null,
    sso_enabled: toBoolean(sso?.enabled, DEFAULT_FORM.sso_enabled),
    sso_idp_entity_id: toStringValue(sso?.idp_entity_id, DEFAULT_FORM.sso_idp_entity_id),
    sso_idp_sso_url: toStringValue(sso?.idp_sso_url, DEFAULT_FORM.sso_idp_sso_url),
    sso_idp_certificate: toStringValue(sso?.idp_certificate, DEFAULT_FORM.sso_idp_certificate),
    sso_single_logout_uri: toStringValue(
      sso?.single_logout_uri,
      DEFAULT_FORM.sso_single_logout_uri,
    ),
  };
};

const buildSecurityPayload = (form: SecurityForm) => ({
  version: SECURITY_SCHEMA_VERSION,
  updated_at: new Date().toISOString(),
  mfa: {
    required: form.mfa_required,
    /* Kept empty when MFA is not required, so a later reader can never mistake
       a leftover exception list for people who are currently being skipped. */
    exempt_user_uuids: form.mfa_required ? form.mfa_exempt_user_uuids : [],
  },
  idle_timeout: {
    enabled: form.idle_timeout_enabled,
    // Seconds, matching the unit other established systems stores and validates in.
    seconds: form.idle_timeout_enabled ? Number(form.idle_timeout_minutes) * 60 : null,
  },
  ip_allowlist: {
    /* Two fully independent lists, each with its own toggle - not a single
       list with a mode switch. A block match is always checked first and
       always wins, whatever the allow list says (see evaluateIpAllowlist in
       lib/ip-allowlist.ts); entries are kept even while a list is off, so
       pausing one never means retyping it later. */
    allow: {
      enabled: form.ip_allow_enabled,
      entries: form.ip_allow_entries,
    },
    block: {
      enabled: form.ip_block_enabled,
      entries: form.ip_block_entries,
    },
    audit_log: form.ip_allowlist_audit,
    break_glass: form.ip_allowlist_break_glass,
  },
  sso: {
    enabled: form.sso_enabled,
    idp_entity_id: form.sso_idp_entity_id.trim(),
    idp_sso_url: form.sso_idp_sso_url.trim(),
    idp_certificate: form.sso_idp_certificate.trim(),
    single_logout_uri: form.sso_single_logout_uri.trim(),
  },
});

const isWholeNumberInRange = (value: string, min: number, max: number) => {
  if (!/^\d+$/.test(value.trim())) return false;
  const parsed = Number(value);
  return parsed >= min && parsed <= max;
};

const isHttpsUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isAdminRole = (roleName: string): boolean => {
  const normalised = roleName.trim().toUpperCase();
  if (!normalised) return false;
  return FIXED_ADMIN_ROLES.includes(normalised) || normalised.includes('ADMIN');
};

interface RosterPerson {
  uuid: string;
  name: string;
  extension: string;
  email: string;
  roleName: string;
  isAdmin: boolean;
}

const toRosterPerson = (person: any): RosterPerson | null => {
  const uuid = String(person?.uuid || person?.user_uuid || '');
  if (!uuid) return null;
  const roleName = String(
    person?.custom_role_data?.name || person?.role_data?.name || person?.role || '',
  );
  return {
    uuid,
    name:
      `${person?.first_name || ''} ${person?.last_name || ''}`.trim() ||
      String(person?.email || 'Unnamed user'),
    extension: String(person?.extension || ''),
    email: String(person?.email || ''),
    roleName: roleName || 'No role',
    isAdmin: isAdminRole(roleName),
  };
};

/**
 * The honesty badge. `enforced` is only ever passed `true` once the auth layer
 * genuinely acts on that key. Today every card passes `false`.
 */
const textareaClass =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none placeholder:text-gray-400 hover:border-primary focus:border-primary disabled:bg-gray-100 disabled:text-slate-500';

const CompanySecurity = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const actorUuid = String(user?.user_info?.uuid || '');
  const actorName =
    `${user?.user_info?.first_name || ''} ${user?.user_info?.last_name || ''}`.trim() ||
    String(user?.user_info?.email || 'An admin');
  /* The SAML service-provider addresses are per company: the sign-in server
     mounts them at /api/auth/sso/saml/<company uuid>/{metadata,acs,login}
     (SAML_SP_BASE_URL on the box; the same host this portal's API calls go
     to). An identity provider needs these three when the platform is added
     as an application. */
  const companyUuid = String(
    user?.company_info?.uuid || (user as any)?.company_uuid || user?.user_info?.company_uuid || '',
  );
  const samlSpBase = companyUuid
    ? `${String(getEnv().VITE_API_BASE_URL || '').replace(/\/+$/, '')}/api/auth/sso/saml/${companyUuid}`
    : '';

  const [form, setForm] = useState<SecurityForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [peopleSearch, setPeopleSearch] = useState('');
  /* The lockout acknowledgement is deliberately not stored, and deliberately
     kept as two independent booleans: the allow list and the block list are
     two independent decisions to save, each with its own lockout risk, and
     ticking the box for one must never silently cover the other. Re-ticking
     on every save is the point. */
  const [allowLockoutAcknowledged, setAllowLockoutAcknowledged] = useState(false);
  const [blockLockoutAcknowledged, setBlockLockoutAcknowledged] = useState(false);

  /* ------------------------------------------------------- the allowlist UI */

  /* Which list's table is currently on screen. The two lists are independent
     data - own toggle, own entries - but only one is shown at a time, so a
     save-time error routes here too (switch to the tab with the problem)
     rather than leaving the admin to go hunting for it. */
  const [activeListTab, setActiveListTab] = useState<AllowlistKind>('allow');
  const allowPanelRef = useRef<IpListPanelHandle | null>(null);
  const blockPanelRef = useRef<IpListPanelHandle | null>(null);

  /* Looked up once per visit to the page, not on every keystroke or render -
     it is a real network call to a third party, and there is no reason to
     repeat it. `null` = not looked up yet, `''` = looked up and failed. */
  const [myIp, setMyIp] = useState<string | null>(null);
  const [myIpLoading, setMyIpLoading] = useState(false);
  const lookupStarted = useRef(false);

  useEffect(() => {
    if (lookupStarted.current) return;
    lookupStarted.current = true;
    setMyIpLoading(true);
    fetch(MY_IP_LOOKUP_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data) => setMyIp(typeof data?.ip === 'string' ? data.ip : ''))
      .catch(() => setMyIp(''))
      .finally(() => setMyIpLoading(false));
  }, []);

  const [showAuditLog, setShowAuditLog] = useState(false);
  const [breakGlassReason, setBreakGlassReason] = useState('');

  const {
    data: companyDefaultTemplate = null,
    isLoading,
    isError,
  } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
  });

  /* The exception list needs real people to choose from, and it needs each
     person's role so the admin rule can actually be applied rather than merely
     described. Read-only use of the existing roster endpoint. */
  const { data: roster = [], isLoading: isRosterLoading } = useQuery({
    queryKey: ['companySecurityRoster'],
    queryFn: () => getUserList({ page: 1, limit: 500 }),
    select: (response: any): RosterPerson[] =>
      ((response?.data?.data?.result?.rows || []) as any[])
        .map(toRosterPerson)
        .filter((person): person is RosterPerson => person !== null),
  });

  const savedSettings = useMemo(
    () => toSettingsObject(companyDefaultTemplate?.settings),
    [companyDefaultTemplate],
  );

  const savedForm = useMemo(() => buildFormFromSettings(savedSettings), [savedSettings]);

  useEffect(() => {
    setForm(savedForm);
    setErrors({});
    setAllowLockoutAcknowledged(false);
    setBlockLockoutAcknowledged(false);
  }, [savedForm]);

  const { mutate: saveSecurity, isPending: isSaving } = useMutation({
    mutationFn: saveCompanyDefaults,
    onSuccess: (response: any) => {
      handleAlert({
        text: response?.data?.message || 'Company security settings saved',
        type: 'success',
      });
      /* The whole company record is invalidated, not just this page. Policies,
         holidays and the emergency address all live in the same row, so a save
         here must make them re-read — otherwise the next page saves a merge
         built on a stale blob and silently drops what was just written. */
      queryClient.invalidateQueries({ queryKey: COMPANY_DEFAULTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['userTemplateList'] });
      setAllowLockoutAcknowledged(false);
      setBlockLockoutAcknowledged(false);
    },
  });

  const updateForm = (patch: Partial<SecurityForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const logAllowlistAction = (action: AllowlistAuditEntry['action'], detail: string) => {
    updateForm({
      ip_allowlist_audit: appendAudit(form.ip_allowlist_audit, {
        at: new Date().toISOString(),
        actor_uuid: actorUuid || undefined,
        actor_name: actorName,
        action,
        detail,
      }),
    });
  };

  /* One pair of handlers, parameterised by which list, rather than four
     near-identical functions - the allow list and the block list add/remove
     entries and enable/disable the same way, they just write into a
     different half of `form` and log a different word. */
  const addEntry = (kind: AllowlistKind, entry: AllowlistEntry) => {
    if (kind === 'allow') {
      updateForm({ ip_allow_entries: [...form.ip_allow_entries, entry] });
    } else {
      updateForm({ ip_block_entries: [...form.ip_block_entries, entry] });
    }
    logAllowlistAction(
      'add',
      `${kind === 'block' ? 'Block list' : 'Allow list'}: ${
        entry.label ? `${entry.cidr} (${entry.label})` : entry.cidr
      }`,
    );
  };

  const removeEntry = (kind: AllowlistKind, entry: AllowlistEntry) => {
    if (kind === 'allow') {
      updateForm({
        ip_allow_entries: form.ip_allow_entries.filter((item) => item.id !== entry.id),
      });
    } else {
      updateForm({
        ip_block_entries: form.ip_block_entries.filter((item) => item.id !== entry.id),
      });
    }
    logAllowlistAction(
      'remove',
      `${kind === 'block' ? 'Block list' : 'Allow list'}: ${
        entry.label ? `${entry.cidr} (${entry.label})` : entry.cidr
      }`,
    );
  };

  /* Turning a list on reveals its own panel below - it does not, on its own,
     restrict anything yet. Nothing is enforced until the whole page is
     saved, and `validateForm` refuses that save while a list is on and empty
     (allow list only - an empty block list is a normal, harmless state), or
     its own lockout checkbox is unticked. */
  const toggleAllow = (enabled: boolean) => {
    updateForm({ ip_allow_enabled: enabled });
    logAllowlistAction(enabled ? 'enable' : 'disable', 'Allow list');
  };

  const toggleBlock = (enabled: boolean) => {
    updateForm({ ip_block_enabled: enabled });
    logAllowlistAction(enabled ? 'enable' : 'disable', 'Block list');
  };

  const armBreakGlass = () => {
    const expires = new Date(Date.now() + BREAK_GLASS_HOURS * 60 * 60 * 1000).toISOString();
    const window: BreakGlassWindow = {
      active: true,
      expires_at: expires,
      created_by_uuid: actorUuid || undefined,
      created_by_name: actorName,
      reason: breakGlassReason.trim() || 'No reason given',
    };
    updateForm({ ip_allowlist_break_glass: window });
    logAllowlistAction('break_glass_armed', `${BREAK_GLASS_HOURS}h window - ${window.reason}`);
    setBreakGlassReason('');
  };

  const clearBreakGlass = () => {
    updateForm({ ip_allowlist_break_glass: null });
    logAllowlistAction('break_glass_cleared', 'Cleared before it expired');
  };

  const activeBreakGlass =
    form.ip_allowlist_break_glass?.active &&
    Date.parse(form.ip_allowlist_break_glass.expires_at) > Date.now()
      ? form.ip_allowlist_break_glass
      : null;

  const rosterByUuid = useMemo(() => {
    const map = new Map<string, RosterPerson>();
    roster.forEach((person) => map.set(person.uuid, person));
    return map;
  }, [roster]);

  const filteredRoster = useMemo(() => {
    const needle = peopleSearch.trim().toLowerCase();
    if (!needle) return roster;
    return roster.filter((person) =>
      `${person.name} ${person.extension} ${person.email} ${person.roleName}`
        .toLowerCase()
        .includes(needle),
    );
  }, [roster, peopleSearch]);

  /* Someone can be exempted today and promoted to admin tomorrow. When that
     happens the stored list quietly breaks the usual rule, so those entries are
     surfaced rather than hidden — an exception nobody can see is the dangerous
     kind. */
  const exemptAdmins = useMemo(
    () =>
      form.mfa_exempt_user_uuids
        .map((uuid) => rosterByUuid.get(uuid))
        .filter((person): person is RosterPerson => Boolean(person?.isAdmin)),
    [form.mfa_exempt_user_uuids, rosterByUuid],
  );

  const toggleExempt = (person: RosterPerson, checked: boolean) => {
    // the usual hard rule, enforced rather than merely written in the helper text.
    if (checked && person.isAdmin) {
      handleAlert({
        text: `${person.name} holds the ${person.roleName} role. Admins cannot be exempted from MFA.`,
        type: 'error',
      });
      return;
    }
    const next = checked
      ? Array.from(new Set([...form.mfa_exempt_user_uuids, person.uuid]))
      : form.mfa_exempt_user_uuids.filter((uuid) => uuid !== person.uuid);
    updateForm({ mfa_exempt_user_uuids: next });
  };

  const validateForm = (): Record<string, string> => {
    const nextErrors: Record<string, string> = {};

    if (form.mfa_required && exemptAdmins.length) {
      nextErrors.mfa_exempt_user_uuids = `Remove ${exemptAdmins
        .map((person) => person.name)
        .join(', ')} from the exception list — admins cannot skip MFA.`;
    }

    if (
      form.idle_timeout_enabled &&
      !isWholeNumberInRange(form.idle_timeout_minutes, IDLE_MIN_MINUTES, IDLE_MAX_MINUTES)
    ) {
      nextErrors.idle_timeout_minutes = `Enter a whole number of minutes between ${IDLE_MIN_MINUTES} and ${IDLE_MAX_MINUTES} (8 hours)`;
    }

    /* Two fully independent lists - each validated on its own, against its
       own lockout checkbox, with its own error key so one list's problem
       never blocks or masks the other's save. */
    if (form.ip_allow_enabled) {
      if (form.ip_allow_entries.length > IP_LIST_MAX_ENTRIES) {
        nextErrors.ip_allow_entries = `${form.ip_allow_entries.length} entries. The limit is ${IP_LIST_MAX_ENTRIES}.`;
      } else if (!form.ip_allow_entries.length) {
        /* An empty, enabled allow list means "let nobody in" - the one state
           the block list has no equivalent of, since an empty block list
           just means "block nobody", a perfectly ordinary starting point. */
        nextErrors.ip_allow_entries =
          'Add at least one address or block, or turn the allow list off. An empty allow list that is switched on would mean nobody.';
      } else if (!allowLockoutAcknowledged) {
        nextErrors.ip_allow_entries =
          'Confirm you have checked that your own public IP falls inside one of these blocks.';
      }
    }

    if (form.ip_block_enabled) {
      if (form.ip_block_entries.length > IP_LIST_MAX_ENTRIES) {
        nextErrors.ip_block_entries = `${form.ip_block_entries.length} entries. The limit is ${IP_LIST_MAX_ENTRIES}.`;
      } else if (form.ip_block_entries.length > 0 && !blockLockoutAcknowledged) {
        /* An empty, enabled block list blocks nobody yet - nothing to
           acknowledge. Only entries that could actually match something,
           including the admin's own address, need confirming. */
        nextErrors.ip_block_entries =
          'Confirm you have checked that your own public IP is not matched by any of these blocks.';
      }
    }

    if (form.sso_enabled) {
      if (!form.sso_idp_entity_id.trim()) {
        nextErrors.sso_idp_entity_id = 'Required when SSO is switched on';
      }
      if (!form.sso_idp_sso_url.trim()) {
        nextErrors.sso_idp_sso_url = 'Required when SSO is switched on';
      } else if (!isHttpsUrl(form.sso_idp_sso_url.trim())) {
        nextErrors.sso_idp_sso_url = 'Must be a full https:// URL from your identity provider';
      }
      if (!form.sso_idp_certificate.trim()) {
        nextErrors.sso_idp_certificate = 'Required when SSO is switched on';
      } else if (!form.sso_idp_certificate.includes('BEGIN CERTIFICATE')) {
        nextErrors.sso_idp_certificate =
          'Paste the whole PEM certificate, including the BEGIN CERTIFICATE and END CERTIFICATE lines';
      }
      if (form.sso_single_logout_uri.trim() && !isHttpsUrl(form.sso_single_logout_uri.trim())) {
        nextErrors.sso_single_logout_uri = 'Leave blank, or enter a full https:// URL';
      }
    }

    return nextErrors;
  };

  const handleSave = () => {
    const nextErrors = validateForm();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      handleAlert({ text: 'Please fix the highlighted fields', type: 'error' });
      /* Whichever list is the reason, switch to its tab and focus the field -
         scrolled to rather than left for the admin to go hunting for among
         five other cards on this page. */
      if (nextErrors.ip_allow_entries) {
        setActiveListTab('allow');
        window.setTimeout(() => allowPanelRef.current?.focusNewEntry(), 0);
      } else if (nextErrors.ip_block_entries) {
        setActiveListTab('block');
        window.setTimeout(() => blockPanelRef.current?.focusNewEntry(), 0);
      }
      return;
    }

    // Merge, never replace: the Company Default row carries the rest of the
    // company defaults blob, and other screens write into it.
    const nextSettings = {
      ...savedSettings,
      /* Keys this page does not edit (allowed_domains, provisioning - written
         by Admin › People › Authentication) ride along instead of being dropped. */
      [SECURITY_KEY]: { ...(savedSettings?.[SECURITY_KEY] || {}), ...buildSecurityPayload(form) },
    };

    saveSecurity({
      uuid: companyDefaultTemplate?.uuid,
      settings: nextSettings,
      greetings: toGreetingsObject(companyDefaultTemplate?.greetings),
      only: [SECURITY_KEY],
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <Loader />
      </div>
    );
  }

  return (
    <section className="cs-section flex w-full flex-col gap-4">
      <div className="cs-block">
        <SectionHeading
          icon={<ShieldCheck className="h-[18px] w-[18px]" />}
          title="Security"
          description="Security rules for everyone in the company. The Security &amp; Privacy page under My Account covers only your own password and devices — this one is company-wide."
        />
      </div>

      <div className="w-full">
        <div className="flex w-full flex-col gap-4">
          {/* Once, at the top — then specifically again on every card. */}
          <div
            className={`rounded-lg border p-4 ${
              MFA_ENFORCEMENT_LIVE
                ? 'border-gray-200 bg-gray-50'
                : 'border-amber-300 bg-amber-50'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">
              {MFA_ENFORCEMENT_LIVE
                ? 'Everything on this page is enforced, apart from the idle timeout, which works in this app only.'
                : 'The IP lists and single sign-on are enforced by the sign-in server. The MFA rule is built and waiting to be switched on there.'}
            </p>
            <p className="mt-1 text-xs text-gray-700">
              Every password sign-in already asks for a code sent by email, and a person may choose
              to skip that code on one device for {TRUSTED_DEVICE_DAYS} days. The MFA rule below
              takes that choice away for everyone except the people you list.
              {MFA_ENFORCEMENT_LIVE
                ? ' It is live: what you save here is what the sign-in server checks.'
                : ' Until the sign-in server has the update, what you save here is recorded and not yet checked — the card says so.'}{' '}
              The IP allow and block lists are checked at sign-in and on every request. Single
              sign-on hands sign-in to your identity provider as soon as it is switched on and
              saved.
            </p>
          </div>

          {isError && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center">
              <p className="text-sm font-semibold text-[#2E2D35]">
                We could not load the saved security settings
              </p>
              <p className="text-xs text-[#9A948F]">
                What you see below are the built-in defaults, not your saved values. Reload before
                you save, or you may overwrite settings you cannot currently see.
              </p>
            </div>
          )}

          {!companyDefaultTemplate && !isError && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4">
              <p className="text-sm font-semibold text-[#2E2D35]">No security settings saved yet</p>
              <p className="text-xs text-[#9A948F]">
                Nothing has been set for your company yet. Choose what you want below and save.
              </p>
            </div>
          )}

          <SettingCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Require multi-factor authentication"
            description="Whether everyone signing in with a password must enter the emailed code every time."
            status={MFA_ENFORCEMENT_LIVE ? 'active' : 'coming-soon'}
            note={
              MFA_ENFORCEMENT_LIVE
                ? `Enforced at sign-in. With this on, the "skip the code on this device for ${TRUSTED_DEVICE_DAYS} days" choice is refused for everyone in the company except the people on the exception list below, so every password sign-in completes the emailed code. Sign-ins through your identity provider (SSO) are never asked — the provider has already checked. If the rule cannot be read, the code is asked for: the safe failure is one extra email.`
                : 'Coming soon on this server. The sign-in server does not check this rule yet, so switching it on records your policy and changes nothing at sign-in today. The check is built (it refuses the 30-day device skip for everyone but the exception list) and turns on the moment the sign-in update is applied.'
            }
          >
            <SettingRow
              label="Require MFA for password sign-in"
              description={`Off until you switch it on and save. Today a person can tick "Skip the code on this device for ${TRUSTED_DEVICE_DAYS} days" at sign-in. With this on, that tick is ignored for everyone except the exception list, and the code is required on every password sign-in. People who sign in through SSO are never prompted, because the identity provider has already done the checking.`}
              control={
                <Switch
                  checked={form.mfa_required}
                  onCheckedChange={(checked) => updateForm({ mfa_required: checked })}
                />
              }
            />
          </SettingCard>

          <SettingCard
            icon={<UserMinus className="h-5 w-5" />}
            title="MFA exception list"
            description={`The named people who may still skip the emailed code on a device they have chosen to trust for ${TRUSTED_DEVICE_DAYS} days.`}
            status={MFA_ENFORCEMENT_LIVE ? 'active' : 'coming-soon'}
            note={
              MFA_ENFORCEMENT_LIVE
                ? 'Enforced with the rule above. Only the people ticked here keep the 30-day device skip while MFA is required. The admin rule is checked on the server too: an Admin, Sub-Admin or anyone whose role name contains "admin" is ignored if their name is somehow on this list, and the refusal is written to the sign-in log.'
                : 'Coming soon on this server, together with the rule above. Names saved here are recorded and will be honoured the moment the sign-in update is applied. The server will also ignore any admin on the list, so the rule below cannot be worked around.'
            }
          >
            {!form.mfa_required && (
              <p className="rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 py-2 text-xs text-[#9A948F]">
                MFA is not required, so an exception list has nothing to except anyone from. Turn
                the requirement on above to edit it. Any names already saved are kept but are
                cleared from the stored record while the requirement is off.
              </p>
            )}

            <p className="text-xs text-[#9A948F]">
              Admins can never be added to the exception list — the accounts with the most power
              are the ones that must not skip the second factor. That means the Admin and Sub-Admin
              roles, plus any custom role with &ldquo;admin&rdquo; in its name. Those rows are
              locked below, and the sign-in server applies the same rule again on its side.
            </p>

            {Boolean(exemptAdmins.length) && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {exemptAdmins.map((person) => person.name).join(', ')}{' '}
                {exemptAdmins.length === 1 ? 'is' : 'are'} on this list but now hold an admin role —
                most likely promoted after being added. Untick{' '}
                {exemptAdmins.length === 1 ? 'them' : 'those names'} before saving.
              </p>
            )}

            <Input
              placeholder="Search people by name, extension, email or role"
              value={peopleSearch}
              disabled={!form.mfa_required}
              onChange={(event) => setPeopleSearch(event.target.value)}
            />

            {errors.mfa_exempt_user_uuids && (
              <p className="text-xs font-semibold text-red-600">{errors.mfa_exempt_user_uuids}</p>
            )}

            <div className="max-h-[320px] overflow-y-auto rounded-lg border border-[rgba(225,200,165,0.9)]">
              {isRosterLoading && (
                <p className="px-3 py-4 text-xs text-[#9A948F]">Loading people…</p>
              )}
              {!isRosterLoading && !filteredRoster.length && (
                <p className="px-3 py-4 text-xs text-[#9A948F]">
                  {roster.length
                    ? 'Nobody matches that search.'
                    : 'No people were returned for this account.'}
                </p>
              )}
              {filteredRoster.map((person) => {
                const isChecked = form.mfa_exempt_user_uuids.includes(person.uuid);
                const isLocked = person.isAdmin || !form.mfa_required;
                return (
                  <div
                    key={person.uuid}
                    className="flex items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0"
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={isLocked && !isChecked}
                      onCheckedChange={(checked) => toggleExempt(person, checked === true)}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-sm text-[#2E2D35]">
                        {person.name}
                        {person.extension ? (
                          <span className="text-[#9A948F]"> · ext {person.extension}</span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-[#9A948F]">{person.roleName}</p>
                    </div>
                    {person.isAdmin && (
                      <span className="shrink-0 rounded-sm bg-gray-100 px-2 py-1 text-[11px] font-semibold text-[#9A948F]">
                        Admin — cannot be exempted
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </SettingCard>

          <SettingCard
            icon={<Timer className="h-5 w-5" />}
            title="Idle timeout"
            description="How long someone can leave the console untouched before they are signed out."
            status="app-only"
            note="Works in this app. Somebody who leaves this app untouched for this long is signed out of it, with a warning first and a chance to stay signed in, and the clock waits while they are on a call. It only reaches this app — it does not sign anybody out of anything else."
          >
            <SettingRow
              label="Sign people out when idle"
              description="Off by default. Switch it on if you want people signed out after a period of inactivity."
              control={
                <Switch
                  checked={form.idle_timeout_enabled}
                  onCheckedChange={(checked) => updateForm({ idle_timeout_enabled: checked })}
                />
              }
            />

            {form.idle_timeout_enabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Input
                    type="number"
                    min={IDLE_MIN_MINUTES}
                    max={IDLE_MAX_MINUTES}
                    label="Idle timeout (minutes)"
                    value={form.idle_timeout_minutes}
                    error={errors.idle_timeout_minutes}
                    onChange={(event) => updateForm({ idle_timeout_minutes: event.target.value })}
                  />
                  <p className="text-xs text-[#9A948F]">
                    Between {IDLE_MIN_MINUTES} minutes and {IDLE_MAX_MINUTES} minutes (8 hours) —
                    the same range the usual range is, which it stores as 300 to 28800 seconds.
                    Stored here in seconds too.
                  </p>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 py-2 text-xs text-[#9A948F]">
                    Some phone systems force HIPAA-enabled organisations down to{' '}
                    {IDLE_HIPAA_MINUTES} minutes and does not let them choose. This platform has no
                    HIPAA flag, so nothing is forced here. If you are handling health data, set{' '}
                    {IDLE_HIPAA_MINUTES} yourself — and remember this signs somebody out of this app
                    only, so it is housekeeping rather than a rule you can point an auditor at.
                  </p>
                </div>
              </div>
            )}
          </SettingCard>

          <SettingCard
            icon={<Network className="h-5 w-5" />}
            title="IP allowlist / blocklist"
            description="The networks people may — or may not — sign in from: individual addresses or CIDR blocks, IPv4 or IPv6."
            note="Enforced at sign-in and on every request since 2 September 2026. What you save here is what the server checks, so add your own network before switching the allow list on — the break-glass window below is the way back in if you lock yourself out."
          >
            {/* Two independent lists - own toggle, own entries, own table -
                shown one at a time. Switching tabs never mixes the two
                tables together; only the selected list's panel is mounted
                below. */}
            <div className="inline-flex w-fit overflow-hidden rounded-lg border border-gray-300">
              {(['allow', 'block'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setActiveListTab(kind)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeListTab === kind
                      ? 'bg-primary text-white'
                      : 'bg-white text-[#9A948F] hover:bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]'
                  }`}
                >
                  {kind === 'block' ? 'Block these' : 'Only allow these'}
                </button>
              ))}
            </div>

            {activeListTab === 'allow' ? (
              <IpListPanel
                ref={allowPanelRef}
                kind="allow"
                enabled={form.ip_allow_enabled}
                entries={form.ip_allow_entries}
                onToggle={toggleAllow}
                onAddEntry={(entry) => addEntry('allow', entry)}
                onRemoveEntry={(entry) => removeEntry('allow', entry)}
                myIp={myIp || ''}
                myIpLoading={myIpLoading}
                actorUuid={actorUuid}
                actorName={actorName}
                lockoutAcknowledged={allowLockoutAcknowledged}
                onLockoutAcknowledgedChange={setAllowLockoutAcknowledged}
                saveError={errors.ip_allow_entries}
              />
            ) : (
              <IpListPanel
                ref={blockPanelRef}
                kind="block"
                enabled={form.ip_block_enabled}
                entries={form.ip_block_entries}
                onToggle={toggleBlock}
                onAddEntry={(entry) => addEntry('block', entry)}
                onRemoveEntry={(entry) => removeEntry('block', entry)}
                myIp={myIp || ''}
                myIpLoading={myIpLoading}
                actorUuid={actorUuid}
                actorName={actorName}
                lockoutAcknowledged={blockLockoutAcknowledged}
                onLockoutAcknowledgedChange={setBlockLockoutAcknowledged}
                saveError={errors.ip_block_entries}
              />
            )}

            {/* Break-glass: armed while you can still get in, in case your own
              address changes before you are back to fix a list. Shared by
              both tabs - not something a locked-out admin can reach for -
              the escape route for that case is the operations runbook in
              backend-patches/default-api/, not a button on this screen. */}
            <div className="rounded-lg border border-[rgba(225,200,165,0.9)] p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#2E2D35]">
                <Unlock className="h-3.5 w-3.5" />
                Emergency bypass
              </p>
              {activeBreakGlass ? (
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-amber-800">
                    <AlertTriangle className="mr-1 inline h-3 w-3" />
                    Open until {new Date(activeBreakGlass.expires_at).toLocaleString()} — every
                    network is allowed through until then, regardless of either list. Armed by{' '}
                    {activeBreakGlass.created_by_name || 'an admin'}
                    {activeBreakGlass.reason ? `: “${activeBreakGlass.reason}”` : '.'}
                  </p>
                  <Button
                    type="button"
                    variant="destructiveOutline"
                    size="sm"
                    onClick={clearBreakGlass}
                  >
                    Close it now
                  </Button>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-xs text-[#9A948F]">
                    Arm a {BREAK_GLASS_HOURS}-hour window where every network is allowed through,
                    for the case where your address changes before you can fix a list. Do this
                    now, while you can still get in — it is no help once you are already locked
                    out.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <div className="min-w-[14rem] flex-1">
                      <Input
                        placeholder="Reason — e.g. travelling next week"
                        value={breakGlassReason}
                        onChange={(event) => setBreakGlassReason(event.target.value)}
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={armBreakGlass}>
                      Arm {BREAK_GLASS_HOURS}h window
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Recorded here on every add, remove, enable and disable, across
              both lists — the quick view. The durable, tamper-evident record
              is the server table, written to once enforcement is deployed. */}
            <div>
              <button
                type="button"
                className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#9A948F] hover:text-[#2E2D35]"
                onClick={() => setShowAuditLog((prev) => !prev)}
              >
                <History className="h-3.5 w-3.5" />
                {showAuditLog ? 'Hide' : 'Show'} recent activity ({form.ip_allowlist_audit.length}
                )
              </button>
              {showAuditLog && (
                <div className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-[rgba(225,200,165,0.9)] p-2">
                  {form.ip_allowlist_audit.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-[#9A948F]">Nothing recorded yet.</p>
                  ) : (
                    form.ip_allowlist_audit.map((entry, index) => (
                      <div
                        key={`${entry.at}-${index}`}
                        className="flex flex-wrap items-baseline gap-x-2 rounded px-2 py-1 text-xs odd:bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]"
                      >
                        <span className="font-medium text-[#2E2D35]">
                          {entry.actor_name || 'Someone'}
                        </span>
                        <span className="text-[#9A948F]">{entry.action.replace(/_/g, ' ')}</span>
                        <span className="text-gray-700">{entry.detail}</span>
                        <span className="ml-auto text-gray-400">
                          {new Date(entry.at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </SettingCard>

          <SettingCard
            icon={<KeyRound className="h-5 w-5" />}
            title="Single sign-on (SAML)"
            description="Where your identity provider lives, so sign-in can be handed over to it."
            status="active"
            note="Live. Once this is on and saved, anyone who picks “Continue with SSO” on the sign-in page and enters a work email from this company is sent to the sign-in URL below, and comes back signed in when your provider vouches for them. A first-time person from your provider is added to the company automatically. Password sign-in keeps working alongside it. The Entity ID and Single Logout URI are recorded but not used yet — the server checks the signature on the assertion against the certificate, and signing out here does not yet sign out at the provider."
          >
            <SettingRow
              label="Use SAML single sign-on"
              description="Your identity provider gives you these when you add this platform as an application. The certificate is a public key, not a secret — but this record is ordinary account data, not a secrets store, so do not paste anything private into it."
              control={
                <Switch
                  checked={form.sso_enabled}
                  onCheckedChange={(checked) => updateForm({ sso_enabled: checked })}
                />
              }
            />

            {form.sso_enabled && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Input
                      label="IdP Entity ID (Issuer)"
                      placeholder="https://idp.example.com/saml/metadata"
                      value={form.sso_idp_entity_id}
                      error={errors.sso_idp_entity_id}
                      onChange={(event) => updateForm({ sso_idp_entity_id: event.target.value })}
                    />
                    <p className="text-xs text-[#9A948F]">
                      The identifier the provider puts in the Issuer field of every assertion.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Input
                      label="IdP SSO URL"
                      placeholder="https://idp.example.com/saml/sso"
                      value={form.sso_idp_sso_url}
                      error={errors.sso_idp_sso_url}
                      onChange={(event) => updateForm({ sso_idp_sso_url: event.target.value })}
                    />
                    <p className="text-xs text-[#9A948F]">
                      Where people would be sent to sign in. Must be https.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="sso-certificate">
                    IdP signing certificate (PEM)
                  </label>
                  <textarea
                    id="sso-certificate"
                    rows={6}
                    spellCheck={false}
                    className={`${textareaClass} font-mono ${
                      errors.sso_idp_certificate ? 'border-red-500' : ''
                    }`}
                    placeholder={'-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'}
                    value={form.sso_idp_certificate}
                    onChange={(event) => updateForm({ sso_idp_certificate: event.target.value })}
                  />
                  <p className="text-xs text-[#9A948F]">
                    Paste the whole block, BEGIN and END lines included. It is used to check that an
                    assertion really came from your provider.
                  </p>
                  {errors.sso_idp_certificate && (
                    <p className="text-xs font-semibold text-red-600">
                      {errors.sso_idp_certificate}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Input
                      label="Single Logout URI (optional)"
                      placeholder="https://idp.example.com/saml/slo"
                      value={form.sso_single_logout_uri}
                      error={errors.sso_single_logout_uri}
                      onChange={(event) =>
                        updateForm({ sso_single_logout_uri: event.target.value })
                      }
                    />
                    <p className="text-xs text-[#9A948F]">
                      Optional, and recorded only for now: signing out here does not yet end the
                      session at the provider. Leave blank if your provider does not offer one.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-900">
                    What to give your identity provider
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Add this platform as a SAML application at your provider using these addresses.
                    They are fixed for your company; the metadata address returns the full
                    service-provider XML.
                  </p>
                  {samlSpBase ? (
                    <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-[9rem_1fr]">
                      <dt className="font-medium text-gray-700">SP Entity ID</dt>
                      <dd className="break-all font-mono text-gray-800">{samlSpBase}/metadata</dd>
                      <dt className="font-medium text-gray-700">ACS (reply) URL</dt>
                      <dd className="break-all font-mono text-gray-800">{samlSpBase}/acs</dd>
                      <dt className="font-medium text-gray-700">SP metadata</dt>
                      <dd className="break-all font-mono text-gray-800">
                        <a
                          className="text-primary underline"
                          href={`${samlSpBase}/metadata`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {samlSpBase}/metadata
                        </a>
                      </dd>
                      <dt className="font-medium text-gray-700">Name ID / attribute</dt>
                      <dd className="text-gray-800">
                        Send the person&rsquo;s work email as the Name ID (or an{' '}
                        <span className="font-mono">email</span> attribute). It is matched to the
                        account&rsquo;s email address.
                      </dd>
                    </dl>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">
                      Your company reference is not loaded yet; reload the page to see the
                      addresses.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-600">
                    Test it after saving: open the sign-in page in a private window, choose
                    &ldquo;Continue with SSO&rdquo;, enter a work email from this company, and you
                    should land on your provider&rsquo;s sign-in page. If you see &ldquo;SSO
                    sign-in failed&rdquo; instead, the details above did not match what the
                    provider sent.
                  </p>
                </div>
              </>
            )}
          </SettingCard>

          <div className="rounded-xl border border-[rgba(225,200,165,0.9)] bg-white shadow-sm">
            <div className="flex flex-wrap items-start gap-3 border-b border-[rgba(225,200,165,0.9)] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[#9A948F]">
                <Info className="h-5 w-5" />
              </div>
              <div className="flex min-w-[220px] flex-1 flex-col gap-1">
                <p className="text-base font-semibold text-[#2E2D35]">
                  Fixed by the platform — no setting to change
                </p>
                <p className="text-xs text-[#9A948F]">
                  What the sign-in server does for every company, read from its code on 9
                  September 2026. These are facts about this platform, not a description of
                  another one.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div className="rounded-lg border border-[rgba(225,200,165,0.9)] p-3">
                <p className="text-sm font-semibold text-[#2E2D35]">Passwords</p>
                <p className="text-xs text-[#9A948F]">
                  A new password must differ from the current one and must not appear in the public
                  list of passwords found in data breaches (checked without sending the password
                  itself). There is no history beyond that: a password used two changes ago can be
                  used again. Changing a password signs the person out of every device.
                </p>
              </div>
              <div className="rounded-lg border border-[rgba(225,200,165,0.9)] p-3">
                <p className="text-sm font-semibold text-[#2E2D35]">Failed sign-ins</p>
                <p className="text-xs text-[#9A948F]">
                  {LOGIN_FAILURES_PER_IP} failed password sign-ins from the same network address
                  within {LOGIN_FAILURE_WINDOW_MINUTES} minutes block sign-in from that address for{' '}
                  {LOGIN_BLOCK_MINUTES} minutes, and the platform team is alerted from the third
                  failure. The block is by address, not by account. The emailed code expires after{' '}
                  {OTP_CODE_MINUTES} minutes; {OTP_MAX_WRONG_CODES} wrong codes mean a{' '}
                  {OTP_WAIT_MINUTES}-minute wait before a new one can be requested.
                </p>
              </div>
              <div className="rounded-lg border border-[rgba(225,200,165,0.9)] p-3">
                <p className="text-sm font-semibold text-[#2E2D35]">Session length</p>
                <p className="text-xs text-[#9A948F]">
                  A sign-in lasts {SESSION_TOKEN_DAYS} days unless the person signs out, changes
                  their password, or an admin removes the device — the server checks the session
                  record on every request, so a removed session stops at once. The
                  &ldquo;skip the code on this device&rdquo; choice also lasts{' '}
                  {TRUSTED_DEVICE_DAYS} days, and the idle timeout above ends a session sooner in
                  this app only.
                </p>
              </div>
            </div>
          </div>

          <div className="cs-savebar">
            <p className="text-xs text-[#9A948F]">
              Saved for your whole company. Your other settings are not affected.
            </p>
            <SectionActions>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="cs-save"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save settings'}
              </Button>
            </SectionActions>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanySecurity;

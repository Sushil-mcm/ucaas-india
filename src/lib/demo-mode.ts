/**
 * Demo mode — a signed-in shell with no backend behind it.
 *
 * It exists so the UI can be worked on without an account on whatever API the
 * deployment points at. A session token is seeded before React mounts, so the
 * route guards treat the app as authenticated and `/` lands on the dashboard,
 * and every API call is answered locally instead of going out.
 *
 * Most lists come back with no rows, so screens render their real empty
 * states. The exception is the contact centre in `demo-contact-centre.ts` —
 * queues, agents, a call log, IVR flows, campaigns, SMS, contact lists, tasks
 * and voicemail — because Performance's tables and stat cards cannot be
 * worked on against nothing. All of it is invented and Indian throughout
 * (agents, contacts, +91 numbers). Nothing here reflects a real account, and
 * no screen showing this data is showing anything true about a customer.
 *
 * It can only ever run on a preview host — a `vercel.app` domain or a local dev
 * server, per `isPreviewHost`. On a real domain the checks below return false
 * whatever the environment says, so a stray `VITE_DEMO_MODE=true` in a
 * production build cannot open a hole: it is a build that never runs on a host
 * where the flag is consulted. Set `VITE_DEMO_MODE=false` to turn it off on a
 * preview host and sign in against the real API instead.
 */
import { isPreviewHost } from '@/lib/utils';
import { demoAiVoiceRows } from '@/lib/demo-ai-voices';
import { demoAiSessionRows } from '@/lib/demo-ai-sessions';
import { demoCrawledPages } from '@/lib/demo-site-crawl';
import { getDemoReviewJob, startDemoReviewJob } from '@/lib/demo-knowledge-review';
import { resolveCaptainRequest } from '@/lib/demo-captain';
import {
  DEMO_AGENTS,
  demoAgentReportRows,
  demoAssignedDidRows,
  demoCallStats,
  demoCalls,
  demoCalendarTaskRows,
  demoCampaignRows,
  demoContactBookRows,
  demoContactGroupRows,
  demoDepartmentRows,
  demoDncRows,
  demoFaxConversations,
  demoFaxMessages,
  demoFlowRows,
  demoQueueCallLogDetail,
  filterCallsByDateRange,
  demoInboundCallRows,
  demoLocalCallRows,
  demoMeetingRows,
  demoSiteRows,
  demoTemplateRows,
  demoQueueReportRows,
  demoQueueRows,
  demoSmsConversations,
  demoSmsLogRows,
  demoSmsThreadRows,
  demoVoicemailRows,
} from '@/lib/demo-contact-centre';

export const DEMO_SESSION_TOKEN = 'demo-mode-session-token';

export const isDemoMode = () => {
  if (!isPreviewHost()) return false;

  return String(import.meta.env.VITE_DEMO_MODE ?? '').toLowerCase() !== 'false';
};

/** Route guards read dotted paths and require exactly `true` at the leaf. */
const grant = (paths: string[]) => {
  const root: Record<string, any> = {};

  for (const path of paths) {
    const keys = path.split('.');
    let node = root;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        node[key] = true;
        return;
      }
      if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
      node = node[key];
    });
  }

  return root;
};

/* Every key the route guards in src/router/index.tsx check, so demo mode can
   reach each screen rather than bouncing to an upgrade prompt. */
const PLAN_FEATURES = grant([
  'ai.IS_SHOW',
  /* The AI screens gate their Create and Analytics buttons on `.add`, and the
     row menus on `.edit`/`.delete` - not on `.view`. Granting only `view` left
     the Chat Agents page with no way to create an agent at all. */
  'ai.action.agent.view',
  'ai.action.agent.add',
  'ai.action.agent.edit',
  'ai.action.agent.delete',
  'ai.action.domain.view',
  'ai.action.domain.add',
  'ai.action.domain.edit',
  'ai.action.domain.delete',
  'ai.action.knowledge_base.view',
  'ai.action.knowledge_base.add',
  'ai.action.knowledge_base.edit',
  'ai.action.knowledge_base.delete',
  'ai.access.CHAT',
  'ai.access.VOICE',
  'account_setting.access.SITE.action.view',
  'account_setting.access.SITE.action.add',
  'account_setting.access.SITE.action.edit',
  'account_setting.access.SITE.action.delete',
  'account_setting.access.USER.action.view',
  'account_setting.access.USER.action.add',
  'account_setting.access.USER.action.edit',
  'account_setting.access.USER.action.delete',
  'advance_call_management.access.RECORDING',
  'advance_call_management.access.TRANSCRIPTION',
  'billing.action.view',
  'calling_rates.IS_SHOW',
  'calling_rates.action.view',
  'campaign.IS_SHOW',
  'campaign.action.view',
  'chat.IS_SHOW',
  'chat.action.view',
  'chat.access.DIRECT_MESSAGE',
  'chat.access.TEAM_MESSAGE',
  'chat.access.UPLOAD_FILES',
  'chat.access.CHAT_VIDEO',
  'chat.create_folder',
  'chat.create_note',
  'contact.IS_SHOW',
  'contact.action.view',
  'integration.IS_SHOW',
  'integration.action.view',
  'messages.IS_SHOW',
  'messages.action.send_fax',
  'messages.action.send_message',
  'messages.action.send_mms',
  'monitoring.action.view',
  'monitoring_features.action.barge',
  'monitoring_features.action.hangup',
  'monitoring_features.action.intercept',
  'monitoring_features.action.listen',
  'monitoring_features.action.whisper',
  'omni_channel.IS_SHOW',
  'omni_channel.access',
  'omni_channel.action.view',
  'phone_system.EXTENSION',
  'phone_system.VOICEMAIL',
  'phone_system_action.IS_SHOW',
  'phone_system_action.access.ANNOUNCEMENT',
  'phone_system_action.access.DEPARTMENT',
  'phone_system_action.access.IVR',
  'phone_system_action.access.QUEUE',
  'phone_system_action.action.view',
  'phone_system_action.action.add',
  'reports.IS_SHOW',
  'reports.action.call_recording_listen',
  'reports.action.sms',
  'settings.action.greeting.view',
  'video.IS_SHOW',
  'video.access.RECORDING',
  'video.action.view',
  'video.action.create',
  'virtual_numbers.action.view',
  'virtual_numbers.action.assign_number',
]);

/** Shaped like the `/api/user/info` result the app hydrates the session from. */
export const DEMO_USER = {
  token: DEMO_SESSION_TOKEN,
  uuid: 'demo-user-0000-0000-0000-000000000001',
  plan_uuid: 'demo-plan-0000-0000-0000-000000000001',
  user_info: {
    uuid: 'demo-user-0000-0000-0000-000000000001',
    first_name: 'Arjun',
    last_name: 'Mehta',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@example.com',
    /* ADMIN so the guards read company plan features rather than a role's,
       and admin-only pages stay reachable. */
    role: 'ADMIN',
    extension: '1001',
    status: 1,
    timezone: 'Asia/Kolkata',
    plan_features: PLAN_FEATURES,
  },
  /* Inbox's "Your number" picker reads `user.assigned_did` off the top-level
     session object the app hydrates `user` from (`{...data}` in
     UserContext) — not off `user_info` — so it has to sit here rather than
     nested, or the dropdown and its default-number effect have nothing to
     work with. */
  assigned_did: demoAssignedDidRows(),
  company_info: {
    uuid: 'demo-company-0000-0000-0000-000000000001',
    company_name: 'Demo Company',
    /* AuthProvider sends anyone without this to /phone-lines-auth. */
    free_did: true,
    is_trial: 'N',
    currency: 'USD',
    country: 'IN',
    timezone: 'Asia/Kolkata',
    plan_features: PLAN_FEATURES,
  },
};

/**
 * A list that answers to every shape the screens unwrap results with — `result`
 * itself, `result.rows`, `result.data`. It is a real array, so a screen that
 * maps straight over it works, and it carries the same rows on the properties a
 * paginated screen reaches for.
 */
/**
 * `page`/`limit` come third rather than being folded into `extra`: every
 * TableManager screen sends them on every request (a "per page" picker, a
 * page-forward click), and until this read them the same full array came
 * back for page 1 and page 2 alike — a 64-row call log under a 25-per-page
 * table showed all 64 with no second page to click to. Passing the raw
 * request body here is enough; page/limit default to "no real paging" (one
 * page holding everything) when the caller doesn't have them or the list is
 * always small, so most call sites need change nothing.
 */
const listPayload = (
  items: any[] = [],
  extra: Record<string, any> = {},
  requestData?: unknown,
) => {
  const totalItems = items.length;
  const requested = asObject(requestData);
  const page = Math.max(1, Number(requested?.page) || 1);
  const limit = Number(requested?.limit) || totalItems || 1;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const start = (page - 1) * limit;
  const pageItems = limit >= totalItems ? items : items.slice(start, start + limit);

  const list: any = [...pageItems];
  list.data = pageItems;
  list.rows = pageItems;
  list.total = totalItems;
  list.count = totalItems;
  list.totalItems = totalItems;
  list.totalPages = totalPages;
  list.current_page = page;
  list.last_page = totalPages;
  /* Aggregates a screen reads off the result alongside the rows — the call
     log's `call_stats`, for instance. */
  Object.assign(list, extra);
  return list;
};

const ok = (result: unknown) => ({
  success: true,
  status: true,
  message: 'Demo mode',
  data: { message: 'Demo mode', result },
  result,
});

/* ---------------------------------------------------------------------------
   A small store so the management screens behave, not just render.

   Creating a user, editing one, assigning a role or defining a custom role all
   write here and show up in the lists afterwards, which is what makes those
   screens worth working on. It lives in localStorage, so a reload keeps what
   was entered; clearing site data resets it to the seed below.

   Everything in it is visibly fake — example.com addresses, "Demo" names — so
   nothing on screen can be mistaken for a real customer's data.
--------------------------------------------------------------------------- */

/* Bumped when the seed changes: the store is persisted, so an existing
   browser would otherwise keep serving the previous, smaller roster. */
const STORE_KEY = 'demo-mode-data-v4';

/* `company_uuid: 'PREDEFINED'` is what marks a role as one of the platform's
   built-in starting points — `add-new-role/select-role` filters on exactly
   this to build its "Select a role to use as a starting point" list, and
   `permission.plan_features` is what its permissions accordion reads. Seed
   roles carried neither, so both of those rendered empty. */
const ROLE_SEED = [
  {
    uuid: 'demo-role-admin',
    name: 'Administrator',
    slug: 'ADMIN',
    is_custom: false,
    company_uuid: 'PREDEFINED',
    description: 'Full access — billing, users, numbers and every setting.',
    permission: { plan_features: PLAN_FEATURES },
  },
  {
    uuid: 'demo-role-subadmin',
    name: 'Sub Admin',
    slug: 'SUB_ADMIN',
    is_custom: false,
    company_uuid: 'PREDEFINED',
    description: 'Runs day-to-day settings without billing or plan changes.',
    permission: { plan_features: PLAN_FEATURES },
  },
  {
    uuid: 'demo-role-manager',
    name: 'Manager',
    slug: 'MANAGER',
    is_custom: false,
    company_uuid: 'PREDEFINED',
    description: 'Oversees a team — queues, reports and their own department.',
    permission: { plan_features: PLAN_FEATURES },
  },
  {
    uuid: 'demo-role-agent',
    name: 'Agent',
    slug: 'AGENT',
    is_custom: false,
    company_uuid: 'PREDEFINED',
    description: 'Takes calls and chats — no settings or other people’s data.',
    permission: { plan_features: PLAN_FEATURES },
  },
  {
    uuid: 'demo-role-supervisor',
    name: 'Supervisor',
    slug: 'SUPERVISOR',
    is_custom: true,
    description: 'Monitors live queues and can barge into calls.',
    permission: { plan_features: PLAN_FEATURES },
  },
  {
    uuid: 'demo-role-billing',
    name: 'Billing Specialist',
    slug: 'BILLING_SPECIALIST',
    is_custom: true,
    description: 'Invoices, refunds and payment methods only.',
    permission: { plan_features: PLAN_FEATURES },
  },
  {
    uuid: 'demo-role-readonly',
    name: 'Read Only',
    slug: 'READ_ONLY',
    is_custom: true,
    description: 'Can view every screen, cannot change anything.',
    permission: { plan_features: PLAN_FEATURES },
  },
];

/** A couple of voices per language the greeting text-to-speech screen offers. */
const DEMO_VOICES = [
  { short_name: 'en-US-demo-1', display_name: 'Ava', gender: 'Female', locale: 'en-US' },
  { short_name: 'en-US-demo-2', display_name: 'Guy', gender: 'Male', locale: 'en-US' },
  { short_name: 'hi-IN-demo-1', display_name: 'Swara', gender: 'Female', locale: 'hi-IN' },
  { short_name: 'hi-IN-demo-2', display_name: 'Madhur', gender: 'Male', locale: 'hi-IN' },
  { short_name: 'es-ES-demo-1', display_name: 'Elvira', gender: 'Female', locale: 'es-ES' },
  { short_name: 'ar-SA-demo-1', display_name: 'Hamed', gender: 'Male', locale: 'ar-SA' },
];

/* A ~1-second silent WAV — there is no real speech engine behind demo mode,
   so this stands in for "the synthesized clip" wherever one is needed
   (audio preview player, the file handed to Upload). */
const DEMO_SILENT_WAV_BASE64 =
  'UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA=';

const buildUser = (
  first: string,
  last: string,
  role: string,
  roleName: string,
  extension: string,
  phone = '',
  site = '',
) => ({
  uuid: `demo-user-${extension}`,
  first_name: first,
  last_name: last,
  name: `${first} ${last}`,
  full_name: `${first} ${last}`,
  email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
  extension,
  phone,
  site: site ? { name: site } : null,
  role,
  role_name: roleName,
  role_data: { name: roleName, slug: role },
  status: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
});

/* The same roster the contact-centre data is built around, so an agent in the
   user list is the agent Performance reports handled calls for. */
const USER_SEED = DEMO_AGENTS.map((row) =>
  buildUser(
    row.first_name,
    row.last_name,
    row.role,
    row.role_name,
    row.extension,
    row.phone,
    row.site,
  ),
);

type Store = {
  users: any[];
  roles: any[];
  receptionists?: any[];
  chatAgents?: any[];
  departments?: any[];
  sites?: any[];
  templates?: any[];
};

const readStore = (): Store => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      /* The AI arrays (and, later, departments/sites) were added after the
         first stores were written, so an existing browser holds a record
         without them. Defaulting here rather than bumping STORE_KEY again
         keeps whatever that browser already created. */
      const parsed = JSON.parse(raw) as Store;
      /* Rows added to a seed list later (more demo users, more demo
         templates) need to reach a browser that already wrote a store
         before that seed grew — a plain `??` only fires when the field is
         missing entirely, not when it's present but shorter than the
         current seed. Appending whichever seed rows aren't already present
         (matched by uuid) shows the new rows without touching or
         reordering anything already there, including any edits made to it. */
      const mergeSeed = <T extends { uuid: string }>(existing: T[] | undefined, seed: T[]): T[] => {
        const present = new Set((existing ?? []).map((row) => row.uuid));
        return [...(existing ?? []), ...seed.filter((row) => !present.has(row.uuid))];
      };
      return {
        ...parsed,
        users: mergeSeed(parsed.users, USER_SEED),
        receptionists: parsed.receptionists ?? [],
        chatAgents: parsed.chatAgents ?? [],
        departments: parsed.departments ?? demoDepartmentRows(),
        sites: parsed.sites ?? demoSiteRows(),
        templates: mergeSeed(parsed.templates, demoTemplateRows()),
      };
    }
  } catch {
    /* Corrupt or unavailable storage falls back to the seed. */
  }
  return {
    users: [...USER_SEED],
    roles: [...ROLE_SEED],
    receptionists: [],
    chatAgents: [],
    departments: demoDepartmentRows(),
    sites: demoSiteRows(),
    templates: demoTemplateRows(),
  };
};

/** The Roles table's "People" column reads `user_count` off each role — the
   seed never carried one, which is why it always showed 0. Computed here
   instead of hardcoded so it stays right as users are added, edited or
   reassigned rather than drifting from a number typed in once. */
const withUserCounts = (roles: any[], users: any[]) => {
  const bySlug = new Map<string, number>();
  users.forEach((user: any) => {
    const slug = String(user?.role || '').toUpperCase();
    if (!slug) return;
    bySlug.set(slug, (bySlug.get(slug) || 0) + 1);
  });
  return roles.map((role: any) => ({
    ...role,
    user_count: bySlug.get(String(role?.slug || '').toUpperCase()) || 0,
  }));
};

const writeStore = (store: Store) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* A full or blocked store only costs persistence, not the screen. */
  }
};

const newUuid = () =>
  globalThis.crypto?.randomUUID?.() || `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const asObject = (data: unknown): Record<string, any> => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) ?? {};
    } catch {
      return {};
    }
  }
  return data && typeof data === 'object' ? (data as Record<string, any>) : {};
};

/** Writes that the management screens make; returns null when none applies. */
/**
 * One row for an AI screen's table, from whatever its wizard posted.
 *
 * The list columns read `agentName`, `status`, `caller_id`, `sentiment` and
 * `updatedAt`, so those are filled whether or not the payload carried them —
 * a row missing them renders as a blank line rather than the thing just made.
 * The rest of the payload is kept so reopening the record for edit finds its
 * own answers again.
 */
const buildDemoAgentRecord = (body: Record<string, any>, kind: 'receptionist' | 'chat-agent') => {
  const id = newUuid();
  const now = new Date().toISOString();

  return {
    ...body,
    _id: id,
    uuid: id,
    agentId: id,
    agentName: body.agentName || body.name || body.agent_name || 'Untitled',
    name: body.agentName || body.name || body.agent_name || 'Untitled',
    /* The wizard posts `status: 'active'` on create; a draft posts nothing and
       should not claim to be live. */
    status: body.status || 'inactive',
    agentStatus: body.status || 'inactive',
    caller_id: body.caller_id ?? [],
    sentiment: null,
    type: kind,
    createdAt: now,
    updatedAt: now,
  };
};

const applyWrite = (url: string, body: Record<string, any>) => {
  const store = readStore();
  /* The AI builders create through these. Without somewhere to put the record
     the wizard reported success and the list it returned to stayed empty, so
     a receptionist could be created over and over and never appear. */
  if (url.includes('/api/ai/receptionist/create') || url.includes('/api/ai/receptionist/draft/create')) {
    const created = buildDemoAgentRecord(body, 'receptionist');
    store.receptionists = [created, ...(store.receptionists ?? [])];
    writeStore(store);
    return ok(created);
  }
  if (url.includes('/api/ai/chat-agent/create') || url.includes('/api/ai/chat-agent/draft/create')) {
    const created = buildDemoAgentRecord(body, 'chat-agent');
    store.chatAgents = [created, ...(store.chatAgents ?? [])];
    writeStore(store);
    return ok(created);
  }
  if (url.includes('/api/ai/receptionist/update') || url.includes('/api/ai/chat-agent/update')) {
    const isReceptionist = url.includes('/receptionist/');
    const list = (isReceptionist ? store.receptionists : store.chatAgents) ?? [];
    const targetId = String(body.agentId || body._id || body.uuid || '');
    const next = list.map((row: any) =>
      String(row._id) === targetId || String(row.agentId) === targetId
        ? { ...row, ...body, updatedAt: new Date().toISOString() }
        : row,
    );
    if (isReceptionist) store.receptionists = next;
    else store.chatAgents = next;
    writeStore(store);
    return ok(next.find((row: any) => String(row._id) === targetId) ?? null);
  }
  if (url.includes('/api/ai/receptionist/delete') || url.includes('/api/ai/chat-agent/delete')) {
    const isReceptionist = url.includes('/receptionist/');
    const list = (isReceptionist ? store.receptionists : store.chatAgents) ?? [];
    const targetId = String(body.agentId || body._id || body.uuid || body.id || '');
    const next = list.filter(
      (row: any) => String(row._id) !== targetId && String(row.agentId) !== targetId,
    );
    if (isReceptionist) store.receptionists = next;
    else store.chatAgents = next;
    writeStore(store);
    return ok({ deleted: true });
  }

  if (url.includes('/api/user/add-member')) {
    const created = {
      ...buildUser(
        body.first_name || 'New',
        body.last_name || 'Member',
        body.role || 'AGENT',
        body.role_name || body.role || 'Agent',
        String(body.extension || 1000 + store.users.length + 1),
      ),
      ...body,
      uuid: newUuid(),
    };
    store.users = [...store.users, created];
    writeStore(store);
    return ok(created);
  }

  if (url.includes('/api/user/update') || url.includes('/api/user/assign-role-bulk-users')) {
    const targets = new Set<string>(
      [body.uuid, body.user_uuid, ...(Array.isArray(body.user_uuids) ? body.user_uuids : [])].filter(
        Boolean,
      ),
    );
    store.users = store.users.map((user) =>
      targets.has(user.uuid) ? { ...user, ...body, uuid: user.uuid } : user,
    );
    writeStore(store);
    return ok(listPayload(store.users, {}, body));
  }

  if (url.includes('/api/user/delete')) {
    const target = body.uuid || body.user_uuid;
    store.users = store.users.filter((user) => user.uuid !== target);
    writeStore(store);
    return ok({ deleted: true });
  }

  if (url.includes('/api/user/role/custom/upsert')) {
    const existing = store.roles.find((role) => role.uuid && role.uuid === body.uuid);
    if (existing) {
      store.roles = store.roles.map((role) =>
        role.uuid === body.uuid ? { ...role, ...body } : role,
      );
      writeStore(store);
      return ok(existing);
    }
    const created = { ...body, uuid: newUuid(), is_custom: true, name: body.name || 'Custom Role' };
    store.roles = [...store.roles, created];
    writeStore(store);
    return ok(created);
  }

  if (url.includes('/api/user/role/custom/remove')) {
    const target = url.split('/').filter(Boolean).pop();
    store.roles = store.roles.filter((role) => role.uuid !== target && role.uuid !== body.uuid);
    writeStore(store);
    return ok({ deleted: true });
  }

  /* `createDeparment` puts an edit's uuid on the URL (`.../upsert/<uuid>`)
     rather than the body, so a create is whatever's left after that path
     segment is stripped off — no uuid there at all. */
  if (url.includes('/api/tenant/department/upsert')) {
    const departments = store.departments ?? [];
    const urlUuid = url.split('/api/tenant/department/upsert/')[1]?.split(/[/?]/)[0];
    const existing = urlUuid && departments.find((dept) => dept.uuid === urlUuid);
    const record = existing
      ? { ...existing, ...body, uuid: existing.uuid }
      : { ...body, uuid: newUuid() };
    store.departments = existing
      ? departments.map((dept) => (dept.uuid === existing.uuid ? record : dept))
      : [...departments, record];
    writeStore(store);
    return ok(record);
  }

  if (url.includes('/api/tenant/department/delete')) {
    const target = body.uuid || url.split('/').filter(Boolean).pop();
    store.departments = (store.departments ?? []).filter((dept) => dept.uuid !== target);
    writeStore(store);
    return ok({ deleted: true });
  }

  /* `upsertSite` puts an edit's uuid on the URL (`.../upsert/<uuid>`), same
     as department upsert above. */
  if (url.includes('/api/site/upsert')) {
    const sites = store.sites ?? [];
    const urlUuid = url.split('/api/site/upsert/')[1]?.split(/[/?]/)[0];
    const existing = urlUuid && sites.find((site) => site.uuid === urlUuid);
    const record = existing
      ? { ...existing, ...body, uuid: existing.uuid }
      : { ...body, uuid: newUuid() };
    store.sites = existing
      ? sites.map((site) => (site.uuid === existing.uuid ? record : site))
      : [...sites, record];
    writeStore(store);
    return ok(record);
  }

  if (url.includes('/api/site/delete')) {
    const target = body.uuid || body.id || url.split('/').filter(Boolean).pop();
    store.sites = (store.sites ?? []).filter((site) => site.uuid !== target);
    writeStore(store);
    return ok({ deleted: true });
  }

  /* `upsertTemplate` puts an edit's uuid on the URL (`.../upsert/<uuid>`),
     same shape as department/site upsert above — Duplicate and Create both
     post here with no uuid, so both fall into the "new record" branch. */
  if (url.includes('/api/tenant/user/template/upsert')) {
    const templates = store.templates ?? [];
    const urlUuid = url.split('/api/tenant/user/template/upsert/')[1]?.split(/[/?]/)[0];
    const existing = urlUuid && templates.find((template) => template.uuid === urlUuid);
    const now = new Date().toISOString();
    const record = existing
      ? { ...existing, ...body, uuid: existing.uuid, updated_at: now }
      : { ...body, uuid: newUuid(), created_at: now, updated_at: now };
    store.templates = existing
      ? templates.map((template) => (template.uuid === existing.uuid ? record : template))
      : [...templates, record];
    writeStore(store);
    return ok(record);
  }

  if (url.includes('/api/tenant/user/template/delete')) {
    const target = body.uuid || url.split('/').filter(Boolean).pop();
    store.templates = (store.templates ?? []).filter((template) => template.uuid !== target);
    writeStore(store);
    return ok({ deleted: true });
  }

  return null;
};

/* ---------------------------------------------------------------------------
   Phone console — its own dedicated calls/voicemails, distinct from the
   shared contact-centre log `demoCalls()` answers for Reports/Performance/
   Home. Scoped to just this page (see the `limit === 50` check below) rather
   than swapping demoCalls() itself, which stays untouched for everyone else.
--------------------------------------------------------------------------- */
const phoneDemoMinutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

const PHONE_CALL_SEED = [
  {
    uuid: 'demo-call-1',
    direction: 'Inbound',
    caller_id_number: '+14155550142',
    caller_id_name: 'Sam Sub',
    destination_number: '1002',
    start_stamp: phoneDemoMinutesAgo(18),
    billsec: 264,
    disposition: 'Billing',
    hangup_cause: 'NORMAL_CLEARING',
  },
  {
    /* Same number as demo-call-1 — gives the History pane (which queries
       /api/tenant/report/call-list filtered by phone) a real second entry
       to show instead of "No previous calls logged for this number." */
    uuid: 'demo-call-1b',
    direction: 'Inbound',
    caller_id_number: '+14155550142',
    caller_id_name: 'Sam Sub',
    destination_number: '1002',
    start_stamp: phoneDemoMinutesAgo(60 * 24 * 9),
    billsec: 187,
    disposition: 'Billing',
    hangup_cause: 'NORMAL_CLEARING',
  },
  {
    uuid: 'demo-call-2',
    direction: 'Outbound',
    caller_id_number: '1001',
    caller_id_name: 'Demo User',
    destination_number: '+442071838750',
    start_stamp: phoneDemoMinutesAgo(55),
    billsec: 96,
    disposition: 'Support',
    hangup_cause: 'NORMAL_CLEARING',
    record_file: 'demo-recording-2.mp3',
  },
  {
    uuid: 'demo-call-3',
    direction: 'Inbound',
    caller_id_number: '+919812345678',
    caller_id_name: 'Priya Nair',
    destination_number: '1001',
    start_stamp: phoneDemoMinutesAgo(140),
    billsec: 0,
    disposition: 'Sales',
    hangup_cause: 'NO_ANSWER',
  },
  {
    uuid: 'demo-call-4',
    direction: 'Inbound',
    caller_id_number: '+13105550118',
    caller_id_name: 'Mia Manager',
    destination_number: '1001',
    start_stamp: phoneDemoMinutesAgo(320),
    billsec: 512,
    disposition: 'Account Review',
    hangup_cause: 'NORMAL_CLEARING',
    record_file: 'demo-recording-4.mp3',
  },
  {
    uuid: 'demo-call-5',
    direction: 'Outbound',
    caller_id_number: '1001',
    caller_id_name: 'Alex Agent',
    destination_number: '1004',
    start_stamp: phoneDemoMinutesAgo(1400),
    billsec: 183,
    disposition: 'Internal',
    hangup_cause: 'NORMAL_CLEARING',
  },
  {
    uuid: 'demo-call-6',
    direction: 'Inbound',
    caller_id_number: '+16465550199',
    caller_id_name: 'Tom Walsh',
    destination_number: '1001',
    start_stamp: phoneDemoMinutesAgo(2600),
    billsec: 0,
    disposition: 'Technical',
    hangup_cause: 'NO_ANSWER',
  },
  {
    /* A voicemail greeting plays before the caller hangs up, so the switch
       still captures a short recording even though the call itself counts
       as missed — gives the Recordings tab's "Missed" filter a real row
       instead of always reading empty. */
    uuid: 'demo-call-7',
    direction: 'Inbound',
    caller_id_number: '+917042581369',
    caller_id_name: 'Rohit Kapoor',
    destination_number: '1001',
    start_stamp: phoneDemoMinutesAgo(95),
    billsec: 6,
    disposition: 'Billing',
    hangup_cause: 'NO_ANSWER',
    record_file: 'demo-recording-7.mp3',
  },
];

const PHONE_VOICEMAIL_SEED = [
  {
    uuid: 'demo-voicemail-1',
    direction: 'Inbound',
    caller_id_number: '+919812345678',
    caller_id_name: 'Priya Nair',
    destination_number: '1001',
    start_stamp: phoneDemoMinutesAgo(142),
    billsec: 34,
    disposition: 'Voicemail — Sales enquiry',
    hangup_cause: 'NO_ANSWER',
    record_file: 'demo-voicemail-1.mp3',
  },
  {
    uuid: 'demo-voicemail-2',
    direction: 'Inbound',
    caller_id_number: '+16465550199',
    caller_id_name: 'Tom Walsh',
    destination_number: '1001',
    start_stamp: phoneDemoMinutesAgo(2604),
    billsec: 51,
    disposition: 'Voicemail — Follow-up requested',
    hangup_cause: 'NO_ANSWER',
    record_file: 'demo-voicemail-2.mp3',
  },
  {
    uuid: 'demo-voicemail-3',
    direction: 'Inbound',
    caller_id_number: '+442071838750',
    caller_id_name: 'Unknown',
    destination_number: '1001',
    start_stamp: phoneDemoMinutesAgo(4100),
    billsec: 21,
    disposition: 'Voicemail',
    hangup_cause: 'NO_ANSWER',
    record_file: 'demo-voicemail-3.mp3',
  },
];

/** Endpoint-specific answers; everything else gets an empty list. */
const matchDemoPayload = (url: string, data: unknown) => {
  if (url.includes('/api/user/info')) return ok(DEMO_USER);

  if (url.includes('/api/login') || url.includes('/api/verify-otp')) {
    return ok({ ...DEMO_USER, auth: DEMO_USER, token: DEMO_SESSION_TOKEN });
  }

  if (url.includes('/api/send-otp')) return ok({ sent: true });

  const written = applyWrite(url, asObject(data));
  if (written) return written;

  /* The contact centre the Performance views read. Empty lists would leave
     Queues, Agents, Calls, Flows and Boards as five empty states. */
  if (url.includes('/api/tenant/report/call-list')) {
    /* The phone console's History pane (history-pane.tsx) is the only
       caller that filters this endpoint by `phone` — everyone else (Reports,
       Callbacks) filters by `direction` or not at all. Answer it from the
       console's own PHONE_CALL_SEED instead of the shared demoCalls() log,
       so it can actually find repeat calls for e.g. Sam Sub's number. */
    const phoneFilterValue = (asObject(data)?.filter || []).find(
      (row: any) => row?.key === 'phone',
    )?.value;
    if (phoneFilterValue) {
      const digitsOnly = (value: unknown) => String(value || '').replace(/\D/g, '');
      const target = digitsOnly(phoneFilterValue);
      const rows = PHONE_CALL_SEED.filter(
        (row) =>
          digitsOnly(row.caller_id_number) === target || digitsOnly(row.destination_number) === target,
      );
      return ok(listPayload(rows, {}, data));
    }

    const dateRange = asObject(data)?.filter_date as { from?: string; to?: string } | undefined;
    // Callbacks ▸ "Queue voicemail" calls this same endpoint with
    // `type: 'voicemail'` — a distinct, smaller set of rows, not the whole
    // day's call log filtered down.
    if (asObject(data)?.type === 'voicemail') {
      const voicemailRows = filterCallsByDateRange(demoVoicemailRows(), dateRange);
      return ok(listPayload(voicemailRows, {}, data));
    }
    let rangedCalls = filterCallsByDateRange(demoCalls(), dateRange);
    // Reports ▸ Outbound sends `filter: [{key:'direction', value:'Outbound'}, ...]` —
    // without honoring it the page would list inbound calls under "Outbound".
    const directionFilter = (asObject(data)?.filter || []).find(
      (row: any) => row?.key === 'direction',
    );
    if (directionFilter?.value) {
      rangedCalls = rangedCalls.filter((row) => row.direction === directionFilter.value);
    }
    return ok(listPayload(rangedCalls, { call_stats: demoCallStats(rangedCalls) }, data));
  }
  if (url.includes('/api/tenant/report/agents')) {
    const dateRange = asObject(data)?.filter_date as { from?: string; to?: string } | undefined;
    const rangedCalls = filterCallsByDateRange(demoCalls(), dateRange);
    return ok(listPayload(demoAgentReportRows(rangedCalls), {}, data));
  }
  if (url.includes('/api/tenant/report/call-queue/list')) {
    /* The shipped Queue report calls this with no date filter at all (see
       queue/index.tsx, where filter_date is commented out) — always the
       full pool, matching real backend behaviour. */
    return ok(listPayload(demoQueueReportRows(), {}, data));
  }
  if (url.includes('/api/call-queue/list')) return ok(listPayload(demoQueueRows(), {}, data));
  if (url.includes('/api/tenant/ivr/list')) return ok(listPayload(demoFlowRows(), {}, data));
  if (url.includes('/api/tenant/xml/call-logs')) {
    const params = asObject(data);
    return ok(demoQueueCallLogDetail(String(params?.call_id || ''), String(params?.type || '')));
  }
  /* Sessions derives seven stat cards, both filter rows and the CSV export
     from these rows, so an empty list left the whole screen at zero. */
  if (url.includes('/api/ai/agent/session/list')) {
    return ok(listPayload(demoAiSessionRows(), {}, data));
  }
  /* The lists the two AI screens read. Answered from the store so a
     receptionist or chat agent created in the wizard is there on return. */
  if (url.includes('/api/ai/receptionist/list')) {
    return ok(listPayload(readStore().receptionists ?? [], {}, data));
  }
  if (url.includes('/api/ai/chat-agent/list')) {
    return ok(listPayload(readStore().chatAgents ?? [], {}, data));
  }
  /* The AI Receptionist builder's Voice & Persona step. An empty list here
     leaves its required voice field with nothing to select, which stops the
     wizard at step 2 rather than just looking bare. */
  if (url.includes('/api/ai/voice/list')) return ok(listPayload(demoAiVoiceRows()));
  /* The website scan behind both knowledge-base builders. Deliberately a bare
     array rather than `ok(...)`: both read `Array.isArray(response.data)` and
     treat anything else as nothing found. */
  if (url.includes('/api/ai/chat-agent/site-crawl')) {
    return demoCrawledPages(String(asObject(data)?.site_url || ''));
  }
  /* The Review step's job. Order matters: every path below contains the
     `review-job` prefix, so the specific ones have to be tested first or they
     would all be answered as a fresh job. */
  if (url.includes('/api/ai/knowledge-base/review-job/status')) {
    return getDemoReviewJob(String(asObject(data)?.jobId || ''));
  }
  if (url.includes('/api/ai/knowledge-base/review-job/cleanup')) return ok({ cleaned: true });
  if (url.includes('/api/ai/knowledge-base/review-job')) {
    return startDemoReviewJob(asObject(data));
  }
  /* Creating the receptionist ingests its knowledge first, and every ingest
     is checked for an id before the next one runs — "Generated knowledge base
     was created without an ingestion ID." is thrown on a missing one, which
     stopped Create Receptionist on the last step. The id is read off the body
     directly, so it sits at the top level rather than inside `ok()`. */
  if (
    url.includes('/api/ai/user/add-content') ||
    url.includes('/api/ai/user/ingest/url') ||
    url.includes('/api/ai/user/ingest/pdf')
  ) {
    return { ingestionId: `demo-ingestion-${Math.random().toString(36).slice(2, 10)}` };
  }
  if (url.includes('/api/campaign/list')) {
    /* The KPI strip's own aggregate query (limit=500, no filters) needs the
       full set, so filtering has to apply only when the caller actually
       asked for it — same shape as /api/contact/list's tag filter below. */
    const requested = asObject(data);
    const filters: Array<{ key?: string; value?: unknown }> = Array.isArray(requested?.filters)
      ? requested.filters
      : [];
    const search = String(requested?.search || '')
      .trim()
      .toLowerCase();

    const rows = demoCampaignRows().filter((row) => {
      if (search && !String(row.name || '').toLowerCase().includes(search)) return false;
      return filters.every((filter) => {
        if (!filter?.key) return true;
        return String((row as Record<string, unknown>)[filter.key] ?? '') === String(filter.value);
      });
    });

    return ok(listPayload(rows, {}, data));
  }
  if (url.includes('/api/campaign/analytics')) {
    const campaignId = asObject(data)?.campaignId;
    const campaign = demoCampaignRows().find((row) => row._id === campaignId);
    return ok(campaign?.campaignAnalytics || {});
  }
  if (url.includes('/api/calendar/event-task/list')) {
    return ok(listPayload(demoCalendarTaskRows(), {}, data));
  }
  if (url.includes('/api/v1/sms/logs')) return ok(listPayload(demoSmsLogRows(), {}, data));
  if (url.includes('/api/contact/group/list')) {
    return ok(listPayload(demoContactGroupRows(), {}, data));
  }

  /* Directory ▸ Groups/Locations and Admin ▸ Departments — read from the
     store (seeded from the contact-centre rows below) rather than calling
     `demoDepartmentRows()`/`demoSiteRows()` directly, so a department or site
     created/edited/deleted here actually sticks instead of reverting to the
     seed on the next list request. */
  if (url.includes('/api/tenant/department/list')) {
    return ok(listPayload(readStore().departments ?? [], {}, data));
  }
  if (url.includes('/api/site/list')) return ok(listPayload(readStore().sites ?? [], {}, data));

  if (url.includes('/api/contact/list')) {
    /* Directory ▸ Blocked reads this same endpoint twice — once for the whole
       book, once filtered to `tag: 'BLOCK'` for the table itself — so the
       filter has to actually apply or "blocked" shows everyone. */
    const tagFilter = (asObject(data)?.filters || []).find((row: any) => row?.key === 'tag');
    const rows = tagFilter
      ? demoContactBookRows().filter((row) => row.tag === tagFilter.value)
      : demoContactBookRows();
    return ok(listPayload(rows, {}, data));
  }
  if (url.includes('/api/tenant/report/inbound-calls')) {
    /* This page reads `result.data.data` for rows and `result.data.call_stats`
       for the summary tiles — one extra `.data` nesting level deeper than
       every other call-list-backed report. */
    const dateRange = asObject(data)?.filter_date as { from?: string; to?: string } | undefined;
    const rangedCalls = filterCallsByDateRange(demoCalls(), dateRange);
    const rows = demoInboundCallRows(rangedCalls);
    const totalDuration = rows.reduce((sum, row) => sum + (Number(row.billsectotal) || 0), 0);
    return ok({
      data: {
        data: rows,
        call_stats: { ...demoCallStats(rangedCalls), total_duration: totalDuration },
      },
    });
  }
  if (url.includes('/api/tenant/local-call-list')) {
    return ok(listPayload(demoLocalCallRows(), {}, data));
  }
  if (url.includes('/api/campaign/dnc/list')) return ok(listPayload(demoDncRows(), {}, data));
  if (url.includes('/api/tenant/user/template/list')) {
    return ok(listPayload(readStore().templates ?? demoTemplateRows(), {}, data));
  }
  if (url.includes('/api/v1/meeting/listing')) return ok(listPayload(demoMeetingRows(), {}, data));

  /* Inbox and the admin Numbers list both read the same handful of company
     numbers — one function, three callers. */
  if (url.includes('/api/fax/did/number/assigned')) return ok(demoAssignedDidRows());
  if (url.includes('/api/numbers/list')) return ok(listPayload(demoAssignedDidRows(), {}, data));

  /* Inbox's conversation list, then the open thread's own messages. Neither
     shares a URL with the SMS *log* above — that's Reports, this is Inbox. */
  if (url.includes('/api/v1/sms/did-list')) return ok(demoSmsConversations());
  if (url.includes('/api/v1/sms/list')) {
    const chatId = asObject(data)?.chat_id;
    return ok(listPayload(demoSmsThreadRows(chatId), {}, data));
  }
  if (url.includes('/api/fax/to-number-list')) {
    return ok(listPayload(demoFaxConversations(), {}, data));
  }
  if (url.includes('/api/fax/list')) {
    const faxMessageId = asObject(data)?.filters?.faxMessageId;
    return ok(listPayload(demoFaxMessages(faxMessageId), {}, data));
  }

  /* Home's "today" digest re-reads the call log through a second endpoint
     rather than the one `demoCalls()` already answers above. */
  if (url.includes('/api/tenant/report/phone-call-list')) {
    const params = asObject(data);
    /* The phone console (call-list-column.tsx) is the only caller that pages
       this endpoint 50 at a time — Home's digest above asks for 1 or 25. That
       makes `limit` a safe way to give the console its own dedicated seed
       (PHONE_CALL_SEED/PHONE_VOICEMAIL_SEED) without touching what Home's
       "today" digest reads from the shared demoCalls() contact-centre log. */
    if (Number(params?.limit) === 50) {
      const rows =
        params?.type === 'voicemail'
          ? PHONE_VOICEMAIL_SEED
          : params?.type === 'recording'
            ? PHONE_CALL_SEED.filter((row) => Boolean(row.record_file))
            : PHONE_CALL_SEED;
      return ok(listPayload(rows, { totalRecords: rows.length }, data));
    }
    if (params?.type === 'voicemail') {
      const rows = demoVoicemailRows();
      return ok(listPayload(rows, { totalRecords: rows.length }, data));
    }
    const wantsMissed = (params?.filter || []).some(
      (row: any) => row?.key === 'direction' && row?.value === 'Missed',
    );
    const rows = wantsMissed
      ? demoCalls()
          .filter((row) => row.direction === 'Inbound' && row.billsectotal === 0)
          .map((row) => ({ ...row, direction: 'Missed' }))
      : demoCalls();
    return ok(listPayload(rows, { totalRecords: rows.length }, data));
  }

  if (url.includes('/api/user/role/list')) {
    const store = readStore();
    return ok(listPayload(withUserCounts(store.roles, store.users), {}, data));
  }
  if (url.includes('/api/user/list')) return ok(listPayload(readStore().users, {}, data));
  if (url.includes('/api/user/detail')) return ok(readStore().users[0] ?? null);

  /* Whoever can be forwarded to — the same roster new-department's "Add
     Members" step, and anywhere else in the app that offers "who should
     this go to", picks from. Unhandled before, so every one of those
     pickers always came back empty ("Nobody to add") regardless of how
     many people exist. Filtered by site *name* rather than a `site_uuid` on
     the user record — the roster built from `DEMO_AGENTS` only ever carries
     a site name, never a site id. */
  if (url.includes('/api/tenant/forwarding-action/type')) {
    const params = asObject(data);
    let rows = readStore().users;
    if (params.site_uuid) {
      const site = (readStore().sites ?? []).find((row: any) => row.uuid === params.site_uuid);
      if (site?.name) {
        rows = rows.filter((user: any) => user?.site?.name === site.name);
      }
    }
    const needle = String(params.search || '')
      .trim()
      .toLowerCase();
    if (needle) {
      rows = rows.filter((user: any) =>
        [user?.first_name, user?.last_name, user?.email, user?.extension]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle)),
      );
    }
    return ok(listPayload(rows, {}, data));
  }

  /* Text-to-speech has no real synthesis engine to call from a static
     preview, so this hands back a tiny (silent) WAV instead of the actual
     spoken text — enough for the "convert" round-trip (voice list → speak →
     preview → attach) to work end to end rather than silently doing
     nothing, which is what every screen using this flow did before. */
  if (url.includes('/api/tenant/greeting/voice-list')) {
    const params = asObject(data);
    const locale = String(params.locale || 'en-US');
    return ok({
      voices: DEMO_VOICES.filter((voice) => voice.locale === locale),
    });
  }
  if (url.includes('/api/tenant/greeting/upload-v2')) {
    return ok(DEMO_SILENT_WAV_BASE64);
  }
  if (url.includes('/api/media/upload/url')) {
    const params = asObject(data);
    return ok({ url: 'demo://upload', file_name: params.file_name || 'audio.mp3' });
  }
  if (url.includes('/api/tenant/greeting/create') || url.includes('/api/tenant/greeting/update')) {
    return ok({ uuid: `demo-greeting-${Date.now()}` });
  }

  return ok(listPayload());
};

export const buildDemoPayload = (url: string, data?: unknown) => matchDemoPayload(url, data);

/**
 * The Captain screens call their own service with `fetch`, so the axios
 * adapter never sees them. Answering them means intercepting `fetch` itself.
 *
 * Only `/captain-api/` paths are handled; everything else — the organisation
 * lookup, fonts, the Vite dev client — is passed through to the real `fetch`
 * untouched, so nothing outside Captain changes behaviour.
 */
const CAPTAIN_PREFIX = '/captain-api/';

export const installCaptainDemoFetch = () => {
  if (!isDemoMode()) return;
  if ((window.fetch as { __demo?: boolean }).__demo) return;

  const realFetch = window.fetch.bind(window);

  const demoFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (!url.includes(CAPTAIN_PREFIX)) return realFetch(input as RequestInfo, init);

    const method = init?.method || (input instanceof Request ? input.method : undefined) || 'GET';

    return new Response(
      JSON.stringify({ data: resolveCaptainRequest(url, { ...init, method }) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  (demoFetch as { __demo?: boolean }).__demo = true;
  window.fetch = demoFetch as typeof window.fetch;
};

/** Seeded before React mounts so the guards see a session on first render. */
export const seedDemoSession = (sessionKey: string) => {
  if (!isDemoMode()) return;
  if (localStorage.getItem(sessionKey)) return;

  localStorage.setItem(sessionKey, DEMO_SESSION_TOKEN);
};

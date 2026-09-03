/**
 * Demo fixtures for the Captain (AI assistant) screens.
 *
 * Captain talks to its own service at `/captain-api/...` with `fetch`, not the
 * axios client the rest of the app uses, so the demo adapter in
 * `services/api/axios.tsx` never sees these calls and every Captain screen came
 * up empty. This fills them in the same spirit as the rest of demo mode: enough
 * shape to see the interface, visibly fake content, and writes that stick so
 * the create and edit flows can be exercised.
 *
 * Every Captain screen unwraps `json.data`, so that is the only envelope needed.
 */

const STORE_KEY = 'demo-captain-data';

const ASSISTANT_ID = 'demo-assistant-1';

const isoAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60000).toISOString().replace('Z', '');

const ASSISTANTS = [
  {
    id: ASSISTANT_ID,
    name: 'Support Captain',
    description: 'Answers billing and setup questions on the website widget.',
    config: {
      instructions:
        'You are a support assistant for a demo telecom console. Answer briefly, and say so when you do not know.',
      product_name: 'Demo Console',
      welcome_message: 'Hi! Ask me anything about your account.',
      handoff_message: 'Let me pass you to a colleague.',
      resolution_message: 'Glad that helped. Anything else?',
      temperature: 0.4,
      feature_faq: true,
      feature_memory: true,
      feature_citation: true,
      feature_contact_attributes: false,
    },
    response_guidelines: ['Keep answers under four sentences.', 'Never invent a price.'],
    guardrails: ['Do not discuss other customers.', 'Do not promise refunds.'],
  },
  {
    id: 'demo-assistant-2',
    name: 'Sales Captain',
    description: 'Qualifies inbound enquiries before a rep picks them up.',
    config: {
      instructions: 'Qualify the enquiry, then offer to book a call.',
      product_name: 'Demo Console',
      welcome_message: 'Looking for pricing? I can help.',
      handoff_message: 'Putting you through to sales.',
      resolution_message: 'Thanks for your time.',
      temperature: 0.6,
      feature_faq: true,
      feature_memory: false,
      feature_citation: false,
      feature_contact_attributes: true,
    },
    response_guidelines: ['Ask company size before quoting.'],
    guardrails: ['Do not quote a final price.'],
  },
];

const DOCUMENTS = [
  {
    id: 'demo-doc-1',
    assistant_id: ASSISTANT_ID,
    name: 'Getting started guide',
    type: 'url',
    source_url: 'https://example.com/docs/getting-started',
    status: 'ready',
    error_message: null,
    created_at: isoAgo(180),
    content_length: 18420,
  },
  {
    id: 'demo-doc-2',
    assistant_id: ASSISTANT_ID,
    name: 'Billing FAQ.pdf',
    type: 'pdf',
    source_url: null,
    status: 'ready',
    error_message: null,
    created_at: isoAgo(2880),
    content_length: 9260,
  },
  {
    id: 'demo-doc-3',
    assistant_id: ASSISTANT_ID,
    name: 'Number porting policy',
    type: 'url',
    source_url: 'https://example.com/docs/porting',
    status: 'processing',
    error_message: null,
    created_at: isoAgo(6),
    content_length: 0,
  },
  {
    id: 'demo-doc-4',
    assistant_id: ASSISTANT_ID,
    name: 'Old pricing sheet',
    type: 'url',
    source_url: 'https://example.com/docs/pricing-2024',
    status: 'failed',
    error_message: 'The page returned 404.',
    created_at: isoAgo(4320),
    content_length: 0,
  },
];

const FAQS = [
  {
    id: 'demo-faq-1',
    assistant_id: ASSISTANT_ID,
    question: 'How do I add a new user?',
    answer: 'Open Admin, then People, then Add member, and assign a role and an extension.',
    status: 'approved',
    created_at: isoAgo(400),
  },
  {
    id: 'demo-faq-2',
    assistant_id: ASSISTANT_ID,
    question: 'Can I keep my existing number?',
    answer: 'Yes. Start a port request under Numbers and we handle it with your current carrier.',
    status: 'approved',
    created_at: isoAgo(900),
  },
  {
    id: 'demo-faq-3',
    assistant_id: ASSISTANT_ID,
    question: 'Where do I download invoices?',
    answer: 'Admin, then Billing, then Invoices. Each row has a PDF download.',
    status: 'draft',
    created_at: isoAgo(60),
  },
];

const INBOXES = [
  {
    id: 'demo-inbox-1',
    name: 'Website chat',
    channel_type: 'website',
    website_domain: 'example.com',
    assistant_id: ASSISTANT_ID,
    assistant_name: 'Support Captain',
    legacy_assistant_id: null,
    enabled: true,
  },
  {
    id: 'demo-inbox-2',
    name: 'Pricing page chat',
    channel_type: 'website',
    website_domain: 'pricing.example.com',
    assistant_id: 'demo-assistant-2',
    assistant_name: 'Sales Captain',
    legacy_assistant_id: null,
    enabled: false,
  },
];

const CONVERSATIONS = [
  {
    id: 'demo-conv-1',
    visitor_name: 'Visitor 8241',
    page_url: 'https://example.com/pricing',
    owner: 'ai',
    last_message: 'Does the starter plan include call recording?',
    last_message_at: isoAgo(12),
  },
  {
    id: 'demo-conv-2',
    visitor_name: 'Visitor 8237',
    page_url: 'https://example.com/docs/porting',
    owner: 'human',
    last_message: 'Thanks, I will send the bill copy over.',
    last_message_at: isoAgo(95),
  },
];

const MESSAGES = [
  {
    id: 'demo-msg-1',
    role: 'visitor',
    content: 'Hi, does the starter plan include call recording?',
    created_at: isoAgo(14),
  },
  {
    id: 'demo-msg-2',
    role: 'assistant',
    content:
      'Starter includes on-demand recording. Always-on recording starts on Business and above.',
    created_at: isoAgo(13),
  },
  {
    id: 'demo-msg-3',
    role: 'visitor',
    content: 'Can I upgrade later?',
    created_at: isoAgo(12),
  },
];

const TOOLS = [
  {
    id: 'demo-tool-1',
    assistant_id: ASSISTANT_ID,
    slug: 'lookup_invoice',
    title: 'Look up invoice',
    description: 'Fetches an invoice total by invoice number.',
    http_method: 'GET',
    endpoint_url: 'https://api.example.com/invoices/{invoice_no}',
    request_template: null,
    response_template: null,
    auth_type: 'bearer',
    auth_config: {},
    param_schema: [
      { name: 'invoice_no', type: 'string', description: 'Invoice number', required: true },
    ],
    config: { data_access: 'limited', allowed_response_fields: ['total', 'status'] },
    operation_type: 'read',
    security_tier: 'standard',
    enabled: true,
    kind: 'http',
    composio_tool_slug: null,
    composio_connection_id: null,
  },
  {
    id: 'demo-tool-2',
    assistant_id: ASSISTANT_ID,
    slug: 'create_ticket',
    title: 'Create support ticket',
    description: 'Opens a ticket for a human to pick up.',
    http_method: 'POST',
    endpoint_url: 'https://api.example.com/tickets',
    request_template: '{"subject": "{{subject}}"}',
    response_template: null,
    auth_type: 'api_key',
    auth_config: {},
    param_schema: [
      { name: 'subject', type: 'string', description: 'Ticket subject', required: true },
    ],
    config: { data_access: 'full' },
    operation_type: 'write',
    security_tier: 'secure',
    enabled: false,
    kind: 'http',
    composio_tool_slug: null,
    composio_connection_id: null,
  },
];

const TOOLKITS = [
  {
    slug: 'gmail',
    name: 'Gmail',
    description: 'Send and read mail.',
    logo: null,
    tools_count: 18,
    categories: ['email'],
  },
  {
    slug: 'slack',
    name: 'Slack',
    description: 'Post messages to channels.',
    logo: null,
    tools_count: 24,
    categories: ['chat'],
  },
  {
    slug: 'hubspot',
    name: 'HubSpot',
    description: 'Read and update CRM records.',
    logo: null,
    tools_count: 31,
    categories: ['crm'],
  },
];

const CONNECTIONS = [
  {
    id: 'demo-conn-1',
    toolkit_slug: 'slack',
    toolkit_name: 'Slack',
    connected_account_id: 'demo-acct-1',
    status: 'ACTIVE',
  },
];

const SCENARIOS = [
  {
    id: 'demo-scenario-1',
    assistant_id: ASSISTANT_ID,
    name: 'Refund request',
    description: 'Visitor is asking for money back on a recent invoice.',
    triggers: ['I want a refund', 'cancel my plan', 'charge me back'],
    instruction:
      'Check the invoice date. Inside 30 days, hand over to a person. Outside 30 days, explain the policy and offer a callback.',
    status: 'active',
    created_at: isoAgo(2600),
  },
  {
    id: 'demo-scenario-2',
    assistant_id: ASSISTANT_ID,
    name: 'Number porting',
    description: 'Visitor wants to bring an existing number across.',
    triggers: ['port my number', 'keep my existing number', 'transfer number'],
    instruction:
      'Ask which carrier holds the number and whether it is prepaid or postpaid, then link the porting guide.',
    status: 'active',
    created_at: isoAgo(1400),
  },
  {
    id: 'demo-scenario-3',
    assistant_id: ASSISTANT_ID,
    name: 'Outage report',
    description: 'Visitor says calls are failing.',
    triggers: ['calls not connecting', 'service is down', 'no audio'],
    instruction:
      'Collect the affected number and the time it started, then hand over to a person immediately. Do not promise a fix time.',
    status: 'draft',
    created_at: isoAgo(320),
  },
];

const SETTINGS = {
  assistant_id: ASSISTANT_ID,
  auto_reply: true,
  reply_delay_seconds: 2,
  language: 'en',
  handoff_enabled: true,
  handoff_after_failures: 2,
  handoff_email: 'support@example.com',
  office_hours_enabled: true,
  office_hours_start: '09:00',
  office_hours_end: '18:00',
  away_message: 'We are away right now. Leave a message and we will reply the next working day.',
  transcript_retention_days: 90,
  collect_visitor_email: true,
};

type Store = Record<string, any[]>;

const SEED: Store = {
  assistants: ASSISTANTS,
  documents: DOCUMENTS,
  faqs: FAQS,
  inboxes: INBOXES,
  tools: TOOLS,
  scenarios: SCENARIOS,
};

const readStore = (): Store => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...JSON.parse(JSON.stringify(SEED)), ...JSON.parse(raw) };
  } catch {
    /* Corrupt or unavailable storage falls back to the seed. */
  }
  return JSON.parse(JSON.stringify(SEED));
};

const writeStore = (store: Store) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* A blocked store only costs persistence, not the screen. */
  }
};

const newId = () =>
  globalThis.crypto?.randomUUID?.() || `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Which seeded collection a path refers to, if any. */
const collectionFor = (path: string) => {
  if (path.includes('/assistants')) return 'assistants';
  if (path.includes('/documents')) return 'documents';
  if (path.includes('/faqs')) return 'faqs';
  if (path.includes('/inboxes') || path.includes('/inbox-channels')) return 'inboxes';
  if (path.includes('/custom-tools')) return 'tools';
  if (path.includes('/scenarios')) return 'scenarios';
  return '';
};

const readBody = (init?: RequestInit): Record<string, any> => {
  const body = init?.body;
  if (typeof body !== 'string') return {};
  try {
    return JSON.parse(body) ?? {};
  } catch {
    return {};
  }
};

/**
 * Answers one Captain request, returning the value that belongs in `json.data`.
 *
 * Reads serve the store; writes update it and persist, so a document added or
 * an FAQ edited on screen is still there after a reload.
 */
export const resolveCaptainRequest = (url: string, init?: RequestInit): unknown => {
  const method = (init?.method || 'GET').toUpperCase();
  const path = url.split('?')[0];
  const store = readStore();
  const key = collectionFor(path);
  const body = readBody(init);

  /* Endpoints that are not one of the seeded collections. */
  if (path.includes('/composio/toolkits') && path.includes('/tools')) return [];
  if (path.includes('/composio/toolkits')) return TOOLKITS;
  if (path.includes('/composio/connections')) return CONNECTIONS;
  if (path.includes('/composio-access')) return [];
  if (path.includes('/composio/connect')) return { redirect_url: '' };
  if (path.includes('/widget-conversations') && path.includes('/messages')) return MESSAGES;
  if (path.includes('/conversations') || path.includes('/widget-conversations')) {
    return CONVERSATIONS;
  }
  if (path.includes('/playground')) {
    return { reply: 'Demo mode: the assistant is not connected to a model.' };
  }
  if (path.includes('/generate-faqs')) return { faqs: [] };
  if (path.includes('/custom-tools/test')) {
    return { ok: true, result: 'Demo mode: the request was not sent.' };
  }

  /* Settings is one record rather than a collection, and it is the whole
     object that gets written back, so it keeps its own key in the store. */
  if (path.includes('/settings')) {
    if (method === 'PUT' || method === 'POST') {
      const saved = { ...SETTINGS, ...body };
      try {
        localStorage.setItem(`${STORE_KEY}-settings`, JSON.stringify(saved));
      } catch {
        /* A blocked store only costs persistence, not the screen. */
      }
      return saved;
    }
    try {
      const raw = localStorage.getItem(`${STORE_KEY}-settings`);
      if (raw) return { ...SETTINGS, ...JSON.parse(raw) };
    } catch {
      /* Fall through to the seed. */
    }
    return SETTINGS;
  }

  if (!key) return [];

  if (method === 'GET') {
    /* A single record when the path ends in an id the store holds. */
    const tail = path.split('/').filter(Boolean).pop() || '';
    const one = store[key]?.find((item) => item.id === tail);
    return one ?? store[key] ?? [];
  }

  if (method === 'POST') {
    if (path.endsWith('/bulk') && Array.isArray(body?.faqs)) {
      const added = body.faqs.map((faq: any) => ({
        ...faq,
        id: newId(),
        assistant_id: body.assistant_id || ASSISTANT_ID,
        status: faq.status || 'draft',
        created_at: isoAgo(0),
      }));
      store[key] = [...added, ...(store[key] ?? [])];
      writeStore(store);
      return added;
    }

    /* `/{id}/toggle` and friends act on an existing record rather than create. */
    const parts = path.split('/').filter(Boolean);
    const action = parts[parts.length - 1];
    const target = store[key]?.find((item) => item.id === parts[parts.length - 2]);
    if (target) {
      if (action === 'toggle') target.enabled = !target.enabled;
      writeStore(store);
      return target;
    }

    const created = {
      id: newId(),
      assistant_id: body.assistant_id || ASSISTANT_ID,
      status: 'ready',
      created_at: isoAgo(0),
      enabled: true,
      ...body,
    };
    store[key] = [...(store[key] ?? []), created];
    writeStore(store);
    /* The documents screen counts `data.documents` after a create. */
    return key === 'documents' ? { documents: [created] } : created;
  }

  if (method === 'PUT' || method === 'PATCH') {
    const targetId = path.split('/').filter(Boolean).pop();
    store[key] = (store[key] ?? []).map((item) =>
      item.id === targetId ? { ...item, ...body, id: item.id } : item,
    );
    writeStore(store);
    return store[key].find((item) => item.id === targetId) ?? null;
  }

  if (method === 'DELETE') {
    const targetId = path.split('/').filter(Boolean).pop();
    store[key] = (store[key] ?? []).filter((item) => item.id !== targetId);
    writeStore(store);
    return { deleted: true };
  }

  return [];
};

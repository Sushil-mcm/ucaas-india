/* Placeholders in a call script, and what fills them in.
 *
 * A script is written once and read on every call, so the parts that change -
 * who is being called, who is calling them, which campaign or queue the call
 * belongs to - are written as placeholders and substituted when the agent's
 * panel renders. Nothing is stored substituted: the script keeps the
 * placeholder, and every call resolves it again.
 *
 * The syntax is {{Group.Field}}. It is matched without regard to case or
 * surrounding spaces, so {{ customer.firstname }} works too - an admin typing
 * from memory should not be punished for it.
 *
 * A placeholder with nothing behind it renders as an empty string, never as
 * raw braces. An agent reading "Hello {{Customer.FirstName}}" aloud to a
 * customer is worse than a slightly bare sentence, and on a queue call we
 * often know the number and not the name. */

export interface ScriptVariable {
  /* What the admin inserts, without the braces. */
  token: string;
  label: string;
  description: string;
  /* Where a value for it exists. A campaign call knows the lead; a queue call
     knows the caller's number and, when the number matches a contact, a name. */
  availableOn: Array<'campaign' | 'queue'>;
  example: string;
}

export const SCRIPT_VARIABLES: ScriptVariable[] = [
  {
    token: 'Customer.Name',
    label: "Customer's full name",
    description: 'The person being called, or the caller. Blank when only a number is known.',
    availableOn: ['campaign', 'queue'],
    example: 'Priya Sharma',
  },
  {
    token: 'Customer.FirstName',
    label: "Customer's first name",
    description: 'The first word of their name, for a greeting.',
    availableOn: ['campaign', 'queue'],
    example: 'Priya',
  },
  {
    token: 'Customer.Number',
    label: "Customer's number",
    description: 'The number on this call.',
    availableOn: ['campaign', 'queue'],
    example: '+44 20 7946 0123',
  },
  {
    token: 'Customer.Email',
    label: "Customer's email",
    description: 'From the lead, when the list carried one.',
    availableOn: ['campaign'],
    example: 'priya@example.com',
  },
  {
    token: 'Agent.Name',
    label: "Agent's name",
    description: 'The person reading the script. This is how a greeting introduces them.',
    availableOn: ['campaign', 'queue'],
    example: 'Sam Taylor',
  },
  {
    token: 'Agent.FirstName',
    label: "Agent's first name",
    description: 'Just their first name.',
    availableOn: ['campaign', 'queue'],
    example: 'Sam',
  },
  {
    token: 'Agent.Extension',
    label: "Agent's extension",
    description: 'For a call-back line or a transfer instruction.',
    availableOn: ['campaign', 'queue'],
    example: '1001',
  },
  {
    token: 'Agent.Email',
    label: "Agent's email",
    description: 'For "I will send that to you from".',
    availableOn: ['campaign', 'queue'],
    example: 'sam@example.com',
  },
  {
    token: 'Company.Name',
    label: 'Company name',
    description: 'Your own company, as it is set up on the account.',
    availableOn: ['campaign', 'queue'],
    example: 'Northwind Travel',
  },
  {
    token: 'Campaign.Name',
    label: 'Campaign name',
    description: 'The campaign this call belongs to.',
    availableOn: ['campaign'],
    example: 'Autumn renewals',
  },
  {
    token: 'Queue.Name',
    label: 'Queue name',
    description: 'The queue that delivered the call.',
    availableOn: ['queue'],
    example: 'Billing',
  },
];

export type ScriptVariableValues = Record<string, string>;

const TOKEN_PATTERN = /\{\{\s*([A-Za-z][A-Za-z0-9_]*\.[A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;

const firstWord = (value: string): string => String(value || '').trim().split(/\s+/)[0] || '';

const clean = (value: unknown): string => {
  const text = String(value ?? '').trim();
  /* The switch sends "Unknown" and "unknown" for a caller it cannot name, and
     the campaign card falls back to "Unknown Contact". None of those belong in
     a sentence an agent reads out. */
  if (!text || /^unknown( contact)?$/i.test(text)) return '';
  return text;
};

/* The values for one live call, from what the agent's panel already holds. */
export const scriptValuesFromCall = ({
  customerName,
  customerNumber,
  customerEmail,
  agentName,
  agentExtension,
  agentEmail,
  companyName,
  campaignName,
  queueName,
}: {
  customerName?: unknown;
  customerNumber?: unknown;
  customerEmail?: unknown;
  agentName?: unknown;
  agentExtension?: unknown;
  agentEmail?: unknown;
  companyName?: unknown;
  campaignName?: unknown;
  queueName?: unknown;
}): ScriptVariableValues => {
  const customer = clean(customerName);
  const agent = clean(agentName);
  return {
    'customer.name': customer,
    'customer.firstname': firstWord(customer),
    'customer.number': clean(customerNumber),
    'customer.email': clean(customerEmail),
    'agent.name': agent,
    'agent.firstname': firstWord(agent),
    'agent.extension': clean(agentExtension),
    'agent.email': clean(agentEmail),
    'company.name': clean(companyName),
    'campaign.name': clean(campaignName),
    'queue.name': clean(queueName),
  };
};

/* The values a preview uses: the catalogue's own examples, so an admin sees
   the script the way an agent will, with a name in every blank. The same
   keys `scriptValuesFromCall` produces, so the renderer cannot tell the two
   apart. */
export const sampleScriptValues = (): ScriptVariableValues =>
  SCRIPT_VARIABLES.reduce<ScriptVariableValues>((values, variable) => {
    values[variable.token.toLowerCase()] = variable.example;
    return values;
  }, {});

/* One line of a script, with its placeholders filled in. */
export const resolveScriptText = (text: string, values: ScriptVariableValues): string => {
  if (!text || text.indexOf('{{') < 0) return text;
  return text.replace(TOKEN_PATTERN, (_whole, token: string) => values[token.toLowerCase()] ?? '');
};

/* The same, over the rich-text nodes a script is stored as. The tree is copied
   rather than edited, so the stored script is never changed by being read. */
export const resolveScriptNodes = <T,>(nodes: T, values: ScriptVariableValues): T => {
  const walk = (node: any): any => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const next: any = { ...node };
    if (typeof next.text === 'string') next.text = resolveScriptText(next.text, values);
    if (Array.isArray(next.children)) next.children = next.children.map(walk);
    return next;
  };
  return walk(nodes);
};

/* Every placeholder used in a script, in the order they first appear. Used to
   tell an admin which of them this kind of call cannot fill. */
export const scriptTokensUsed = (nodes: unknown): string[] => {
  const found: string[] = [];
  const walk = (node: any): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (typeof node.text === 'string') {
      const matches = node.text.matchAll(TOKEN_PATTERN);
      for (const match of matches) {
        const token = String(match[1]);
        if (!found.some((seen) => seen.toLowerCase() === token.toLowerCase())) found.push(token);
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(nodes);
  return found;
};

/* Which of the placeholders a script uses have no meaning on this kind of
   call - "Campaign name" on a queue script, or a token nobody defined. */
export const unfillableTokens = (nodes: unknown, on: 'campaign' | 'queue'): string[] =>
  scriptTokensUsed(nodes).filter((token) => {
    const known = SCRIPT_VARIABLES.find((v) => v.token.toLowerCase() === token.toLowerCase());
    return !known || !known.availableOn.includes(on);
  });

export const asToken = (token: string): string => `{{${token}}}`;

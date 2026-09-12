/* The get-started flow: the order of the steps, and every decision the screens
 * make that does not need a server.
 *
 * Two paths share one wizard. A free trial goes account -> verify -> about
 * your team -> setting things up -> number. Buy now goes account -> verify ->
 * plan and seats -> payment (with the order review on the same screen, above
 * the one button that charges) -> setting things up -> number. The
 * server calls behind each step are the ones the current sign-up already
 * uses; what changed is the order, what is asked when, and what the screen
 * says when something goes wrong.
 */

export type StartPath = 'trial' | 'buy' | 'free';

export type StartStep =
  | 'account'
  | 'verify'
  | 'team'
  | 'plan'
  | 'payment'
  | 'review'
  | 'creating'
  | 'number'
  | 'done'
  | 'exists';

/** The steps a path walks, in order. "exists" is a detour, never in the list. */
export const stepsFor = (path: StartPath, options: { trialNeedsCard?: boolean } = {}): StartStep[] =>
  path === 'trial'
    ? /* A card is asked for before the trial starts (saved, not charged) so the
         plan carries on by itself when the trial ends - the shape most paid
         business tools use. The super-admin can switch it off per plan. */
      options.trialNeedsCard === false
      ? ['account', 'verify', 'team', 'creating', 'number']
      : ['account', 'verify', 'team', 'payment', 'creating', 'number']
    : path === 'free'
      ? /* A plan with no monthly fee has nothing to pay for and no seats to choose. */
        ['account', 'verify', 'creating', 'number']
      : ['account', 'verify', 'plan', 'payment', 'creating', 'number'];

/** The labels the progress rail shows for a path. */
export const RAIL_LABELS: Record<StartStep, string> = {
  account: 'Account',
  verify: 'Verify',
  team: 'Your team',
  plan: 'Plan',
  payment: 'Payment',
  review: 'Review',
  creating: 'Setting up',
  number: 'Number',
  done: 'Number',
  exists: 'Account',
};

/** Where the rail's highlight sits for a step: detours map onto the step they
    belong to, and the finished screen sits past the last dot so every dot is
    ticked. */
export const railIndexFor = (path: StartPath, step: StartStep, options: { trialNeedsCard?: boolean } = {}): number => {
  const list = stepsFor(path, options);
  if (step === 'exists') return list.indexOf('account');
  if (step === 'done') return list.length;
  return list.indexOf(step);
};

export const nextStep = (path: StartPath, current: StartStep, options: { trialNeedsCard?: boolean } = {}): StartStep | null => {
  const list = stepsFor(path, options);
  const i = list.indexOf(current);
  return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
};

export const prevStep = (path: StartPath, current: StartStep, options: { trialNeedsCard?: boolean } = {}): StartStep | null => {
  const list = stepsFor(path, options);
  const i = list.indexOf(current);
  return i > 0 ? list[i - 1] : null;
};

/* --- plans and seats ---------------------------------------------------- */

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SIX_MONTH' | 'YEARLY';

export interface PlanCost {
  type: BillingCycle;
  original_price: number;
  discount_price?: number;
  discount_enabled?: boolean;
  discount?: number;
}

export interface PlanRow {
  uuid: string;
  plan_name?: string;
  /** The plan's seat ceiling; 0 or null means no ceiling. */
  licenses?: number | null;
  is_trial?: number | boolean | null;
  trial_period?: number | null;
  custom_plan?: 'Yes' | 'No';
  trial_requires_card?: 'Y' | 'N' | null;
  cost?: PlanCost[];
}

/** Whether this plan's trial asks for a card (the admin's switch; default yes). */
export const trialNeedsCard = (plan: PlanRow | null | undefined): boolean => plan?.trial_requires_card !== 'N';

/** The price of one seat for one month on this cycle, after any discount. */
export const seatPricePerMonth = (plan: PlanRow | null | undefined, cycle: BillingCycle): number => {
  const row = (plan?.cost || []).find((c) => c.type === cycle);
  if (!row) return 0;
  const months = { MONTHLY: 1, QUARTERLY: 3, SIX_MONTH: 6, YEARLY: 12 }[cycle];
  const price = row.discount_enabled && row.discount_price ? row.discount_price : row.original_price;
  return Math.round(((Number(price) || 0) / months) * 100) / 100;
};

/** The seat ceiling of a plan; Infinity when it has none. */
export const seatCeiling = (plan: PlanRow | null | undefined): number => {
  const n = Number(plan?.licenses);
  return n > 0 ? n : Number.POSITIVE_INFINITY;
};

/** Keep a typed seat count inside 1..ceiling. */
export const clampSeats = (value: unknown, plan: PlanRow | null | undefined): number => {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, seatCeiling(plan));
};

/** Subtotal before tax for seats on a cycle, in the plan's currency. */
export const subtotal = (plan: PlanRow | null | undefined, seats: number, cycle: BillingCycle): number => {
  const months = { MONTHLY: 1, QUARTERLY: 3, SIX_MONTH: 6, YEARLY: 12 }[cycle];
  return Math.round(seatPricePerMonth(plan, cycle) * months * seats * 100) / 100;
};

export const CYCLE_LABELS: Record<BillingCycle, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Every 3 months',
  SIX_MONTH: 'Every 6 months',
  YEARLY: 'Annual',
};

/* The API's plan_duration is a number of months and accepts only 1 or 12
   (UserValidator: Joi.number().valid(1, 12)), so only those two cycles can be
   bought at sign-up; the quarterly and six-month rows on a plan are for
   renewals from Billing. */
export const CYCLE_TO_DURATION: Record<BillingCycle, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SIX_MONTH: 6,
  YEARLY: 12,
};

/** The cycles the sign-up API accepts, in the order the screen offers them. */
export const SIGNUP_CYCLES: BillingCycle[] = ['YEARLY', 'MONTHLY'];

/** The cycles a plan can actually be bought on: the API's two, with a real price. */
export const cyclesFor = (plan: PlanRow | null | undefined): BillingCycle[] =>
  SIGNUP_CYCLES.filter((c) => seatPricePerMonth(plan, c) > 0);

const priceOf = (plan: PlanRow | null | undefined, cycle: BillingCycle): { list: number; charged: number } | null => {
  const row = (plan?.cost || []).find((c) => c.type === cycle);
  if (!row) return null;
  const list = Number(row.original_price);
  if (!Number.isFinite(list)) return null;
  const charged = row.discount_enabled && Number(row.discount_price) > 0 ? Number(row.discount_price) : list;
  return { list, charged };
};

/** A plan with no monthly fee at all (pay as you go). */
export const isFreePlan = (plan: PlanRow | null | undefined): boolean => {
  const m = priceOf(plan, 'MONTHLY');
  const y = priceOf(plan, 'YEARLY');
  return !!plan && m !== null && m.list === 0 && (y === null || y.list === 0);
};

/** A plan the flow can sell on its own: a monthly price above zero and a
    yearly row that is not nonsense (cheaper than a month, or a "discount"
    above the list price). Anything else goes to sales. */
export const planSellable = (plan: PlanRow | null | undefined): boolean => {
  const m = priceOf(plan, 'MONTHLY');
  if (!m || m.list <= 0) return false;
  const y = priceOf(plan, 'YEARLY');
  if (y && y.list > 0 && (y.list < m.list || y.charged > y.list)) return false;
  return true;
};

/** The plan a trial link without a plan lands on: the first with a trial. */
export const trialPlanOf = (plans: PlanRow[]): PlanRow | null => plans.find((p) => Number(p.trial_period) > 0) || null;

/** "buy" turns into "free" once the plan turns out to have no fee. */
export const effectivePath = (path: StartPath, plan: PlanRow | null | undefined): StartPath =>
  path === 'buy' && isFreePlan(plan) ? 'free' : path;

/** The day a trial started today ends, as people write it. */
export const trialEndsOn = (plan: PlanRow | null | undefined, from: Date = new Date()): string => {
  const days = Math.max(0, Math.floor(Number(plan?.trial_period) || 0));
  const d = new Date(from.getTime() + days * 86400000);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
};

/* --- what the server said ---------------------------------------------- */

export type ExistsReason = 'phone' | 'company' | 'email' | null;

/**
 * Why the account check refused. The API answers with words, not codes, so
 * the words are matched here in one place. Anything unrecognised is null and
 * the screen shows the message as it came.
 */
export const existsReason = (message: unknown): ExistsReason => {
  const text = String(message || '').toLowerCase();
  /* "Please use a valid mobile phone number." also contains "phone"; only a
     message that says the thing is taken is a duplicate. */
  if (!/(already|exist|taken|in use|duplicate)/.test(text)) return null;
  if (text.includes('phone') || text.includes('mobile')) return 'phone';
  if (text.includes('company')) return 'company';
  if (text.includes('email')) return 'email';
  return null;
};

export const EXISTS_COPY: Record<Exclude<ExistsReason, null>, { title: string; body: string }> = {
  company: {
    title: 'This company already uses MCM',
    body: 'A company with this name already has an account. Creating a second one would split your team across two companies.',
  },
  phone: {
    title: 'This mobile number already has an account',
    body: 'That number is the sign-in for an existing account. Use a different mobile, or log in to the account it belongs to.',
  },
  email: {
    title: 'This email already has an account',
    body: 'Log in instead, or reset your password if you have forgotten it.',
  },
};

/* --- setting things up ------------------------------------------------- */

export interface SignupStatus {
  workspace_ready: boolean;
  numbers: number;
  is_trial: boolean;
  payment_verified: boolean;
}

export type ProvisionState = 'working' | 'ready' | 'stuck';

/** How long to keep polling before saying it is stuck: about 90 seconds at 3 s. */
export const PROVISION_MAX_POLLS = 30;

/** What the "Setting things up" screen shows, from the status and how long it has waited. */
export const provisionState = (status: SignupStatus | null, polls: number): ProvisionState => {
  if (status?.workspace_ready) return 'ready';
  if (polls >= PROVISION_MAX_POLLS) return 'stuck';
  return 'working';
};

/* --- payloads ----------------------------------------------------------- */

export interface AccountForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  password: string;
  company_country: string;
  company_state: string;
  company_city: string;
  company_address: string;
  company_postal_code: string;
  timezone: string;
}

/** A first and last name from one typed name, since the API wants both. */
export const splitName = (full: unknown): { first_name: string; last_name: string } => {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: '', last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') || parts[0] };
};

/** The digits of a phone with one leading plus, the way the API stores it. */
export const e164 = (raw: unknown): string => {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
};

/** Password rule: 12+ characters, mixed case, a number. */
export const passwordProblems = (value: unknown): string[] => {
  const text = String(value || '');
  const problems: string[] = [];
  if (text.length < 12) problems.push('at least 12 characters');
  if (!/[a-z]/.test(text) || !/[A-Z]/.test(text)) problems.push('upper and lower case');
  if (!/\d/.test(text)) problems.push('a number');
  return problems;
};

/** The body of the account check, from the form. */
export const accountCheckPayload = (form: AccountForm, planUuid: string) => ({
  email: form.email.trim().toLowerCase(),
  company_name: form.company_name.trim(),
  plan_uuid: planUuid,
  phone: e164(form.phone),
  timezone: form.timezone,
});

/** The body of the sign-up call, from the form and the choices. */
export const signupPayload = (input: {
  form: AccountForm;
  planUuid: string;
  seats: number;
  cycle: BillingCycle;
  isTrial: boolean;
  taxCalculationId?: string;
  amount?: number | string;
  paymentMethodId?: string;
  deviceId: string;
  websiteUuid?: string;
  captchaToken?: string;
}) => {
  const { form } = input;
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: e164(form.phone),
    /* No password here: the sign-up API generates one and emails the sign-in
       details (its schema refuses a password field). Letting people choose
       one in the flow is a server change, listed as the next phase. */
    company_name: form.company_name.trim(),
    company_address: form.company_address.trim(),
    company_city: form.company_city,
    company_state: form.company_state,
    company_country: form.company_country,
    company_postal_code: form.company_postal_code.trim(),
    timezone: form.timezone,
    plan_uuid: input.planUuid,
    licenses: input.seats,
    plan_duration: CYCLE_TO_DURATION[input.cycle],
    tax_calculation_id: input.taxCalculationId || '',
    is_trial: input.isTrial ? 'Y' : 'N',
    device_id: input.deviceId,
    ...(input.websiteUuid ? { website_uuid: input.websiteUuid } : {}),
    ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
    ...(input.paymentMethodId
      ? { payment: { amount: input.isTrial ? '0.00' : String(input.amount ?? 0), payment_method_id: input.paymentMethodId } }
      : {}),
  };
};

/** The state the existing number-choice screen expects, from the sign-up answer. */
export const numberScreenState = (result: any, planUuid: string, didCountries: unknown[] = []) => {
  const auth = result?.auth || {};
  const token = String(result?.token || '');
  return {
    isLogin: false,
    signUpResponseData: { current: { ...auth, token } },
    didCountries,
    planUuid,
    accessToken: token,
  };
};

/* --- the number step ---------------------------------------------------- */

export interface NumberCountry {
  label: string;
  value: string;
}

/** The countries a number may be bought in: the plan's own list first, else
    the general country list, in the shape the screen's select wants. */
export const numberCountryOptions = (planCountries: any[], fallbackRows: any[]): NumberCountry[] => {
  const seen = new Set<string>();
  const out: NumberCountry[] = [];
  const push = (label: unknown, value: unknown) => {
    const iso = String(value || '').trim().toUpperCase();
    const name = String(label || '').trim();
    if (!iso || !name || seen.has(iso)) return;
    seen.add(iso);
    out.push({ label: name, value: iso });
  };
  (Array.isArray(planCountries) ? planCountries : []).forEach((c) => push(c?.country_name || c?.name, c?.country_code_iso2 || c?.country_iso || c?.iso || c?.code));
  if (out.length) return out;
  (Array.isArray(fallbackRows) ? fallbackRows : []).forEach((c) => push(c?.country_name || c?.name, c?.country_code_iso2 || c?.country_iso || c?.isoCode || c?.iso || c?.code));
  return out;
};

/** The customer-facing name of a carrier number type. */
export const numberTypeLabel = (name: unknown): string => {
  const text = String(name || '').trim().toLowerCase();
  if (text.startsWith('toll')) return 'Toll-free';
  if (text === 'local') return 'Local';
  return String(name || '').trim();
};

export const NUMBER_TYPE_HINT: Record<string, string> = {
  Local: 'A number with an area code near you.',
  'Toll-free': 'Free for callers anywhere in the country.',
};

export type NumberListStage =
  | 'choose-type'
  | 'loading'
  | 'stock'
  | 'choose-region'
  | 'choose-area'
  | 'choose-group'
  | 'carrier'
  | 'none';

/**
 * What the number list shows. Our own stock answers from country and type
 * alone; only when the shelf is empty does the screen ask for a region, an
 * area code and (when the carrier offers several) a prefix group, because
 * that is how a carrier search is keyed.
 */
export const numberListStage = (s: {
  typeId: string;
  loading: boolean;
  source: 'inventory' | 'carrier' | 'empty' | null;
  regionId: string;
  areaId: string;
  groupId: string;
  groupCount: number;
  count: number;
}): NumberListStage => {
  if (!s.typeId) return 'choose-type';
  if (s.loading) return 'loading';
  if (s.source === 'inventory' && s.count > 0) return 'stock';
  if (!s.regionId) return 'choose-region';
  if (!s.areaId) return 'choose-area';
  if (!s.groupId) return s.groupCount === 0 ? 'none' : 'choose-group';
  return s.count > 0 ? 'carrier' : 'none';
};

/** A carrier's number list can change under us; the list is refreshed and the
    pick cleared after this long, the same window the old screen used. */
export const PURCHASE_WINDOW_SECONDS = 120;

export const secondsLeft = (deadline: number, now: number): number => Math.max(0, Math.ceil((deadline - now) / 1000));

export const countdownLabel = (seconds: number): string =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

/** A phone number the way people read it; North American numbers are grouped,
    everything else keeps its plus and digits. */
export const prettyNumber = (raw: unknown): string => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `+${digits}`;
};

/** The body of the number purchase, the same one the old screen sends. */
export const buyNumberPayload = (input: {
  number: string;
  didId: string;
  userUuid: string;
  companyUuid: string;
  deviceId: string;
  apiBase: string;
  features?: unknown;
}) => ({
  caller_id: String(input.number),
  did_id: [String(input.didId)],
  uuid: input.userUuid,
  company_uuid: input.companyUuid,
  type: 'signup' as const,
  device_id: input.deviceId,
  callback_url: `${input.apiBase}/api/didw/callback`,
  features: Array.isArray(input.features) ? input.features : [],
});

/** What the number purchase needs before it can be sent; empty when it can. */
export const buyNumberProblems = (input: { number: string; didId: string; userUuid: string; companyUuid: string }): string[] => {
  const problems: string[] = [];
  if (!input.didId || !input.number) problems.push('pick a number first');
  if (!input.userUuid) problems.push('the sign-up did not return your user id');
  if (!input.companyUuid) problems.push('the sign-up did not return your company id');
  return problems;
};

/* --- the account form, checked before any server call ---------------- */

export const emailLooksValid = (value: unknown): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());

export type AccountField = keyof AccountForm;

/** Every field that is missing or malformed, with the words shown under it.
    Order is the order on the screen, so the first key is the one to focus. */
export const accountProblems = (form: AccountForm): Partial<Record<AccountField, string>> => {
  const out: Partial<Record<AccountField, string>> = {};
  if (!form.first_name.trim()) out.first_name = 'Your first name is needed.';
  if (!form.email.trim()) out.email = 'Your work email is needed: the code and the sign-in details go there.';
  else if (!emailLooksValid(form.email)) out.email = 'That does not look like an email address (name@company.com).';
  if (!form.company_name.trim()) out.company_name = 'The company name is needed.';
  if (!form.phone.trim()) out.phone = 'A mobile number is needed: it is your second sign-in factor.';
  else if (e164(form.phone).length < 8) out.phone = 'That mobile number is too short.';
  if (!form.company_address.trim()) out.company_address = 'The street address is needed: emergency calls are sent from it.';
  if (!form.company_state) out.company_state = 'Choose the state or region.';
  if (!form.company_postal_code.trim()) out.company_postal_code = 'The postal code is needed.';
  return out;
};

/** The mobile field's placeholder and prefix for a country's dialling code. */
export const phonePrefix = (phonecode: unknown): string => {
  const digits = String(phonecode || '').replace(/\D/g, '');
  return digits ? `+${digits} ` : '';
};
export const phonePlaceholder = (phonecode: unknown): string => `${phonePrefix(phonecode) || '+1 '}555 0100`;

/** The prefix is filled in for the customer, and swapped when the country
    changes, but never over digits they typed themselves. */
export const phoneWithPrefix = (current: unknown, oldCode: unknown, newCode: unknown): string => {
  const text = String(current || '');
  const oldPrefix = phonePrefix(oldCode);
  if (!text.trim() || (oldPrefix && text.trim() === oldPrefix.trim())) return phonePrefix(newCode);
  return text;
};

/* --- the code step ----------------------------------------------------- */

/** Plain words for the code server's replies. */
export const otpErrorText = (message: unknown): string => {
  const text = String(message || '').toLowerCase();
  if (text.includes('invalid') || text.includes('expired') || text.includes('otp')) return 'That code is not right. Check the email or send a new one.';
  return String(message || 'That code did not match.');
};

/** The digits of a typed code, at most six; typing over a selection replaces it. */
export const otpDigits = (value: unknown): string => String(value || '').replace(/\D/g, '').slice(0, 6);

/** The next value of the code box. A box that is already full and gets
    another digit starts over with what was just typed, so a customer who
    could not clear it (select-all lost, caret at the front) is not stuck
    with the old digits. */
export const otpNext = (prev: unknown, next: unknown, typed: unknown): string => {
  const before = otpDigits(prev);
  const raw = String(next || '').replace(/\D/g, '');
  const keys = String(typed || '').replace(/\D/g, '');
  if (before.length >= 6 && raw.length > 6 && keys) return keys.slice(0, 6);
  return otpDigits(next);
};

export const RESEND_COOLDOWN_SECONDS = 30;

/* --- money on the screen ----------------------------------------------- */

export const money = (value: unknown): string => `$${(Number(value) || 0).toFixed(2)}`;

/** A typed seat count, and what to say if it had to be changed. */
export const seatEntry = (typed: unknown, plan: PlanRow | null | undefined): { seats: number; note: string } => {
  const seats = clampSeats(typed, plan);
  const n = Number(typed);
  const ceiling = seatCeiling(plan);
  if (String(typed ?? '').trim() === '' || !Number.isFinite(n) || n < 1) return { seats, note: 'At least one seat is needed, so it is set to 1.' };
  if (n > ceiling) return { seats, note: `This plan holds up to ${ceiling} seats, so it is set to ${ceiling}.` };
  return { seats, note: '' };
};

/* --- the link that opened the flow ------------------------------------- */

/** Buy unless the link asks for a trial: nobody should land on a trial they
    did not choose. */
export const pathFromParams = (isTrial: string | null | undefined): StartPath => (String(isTrial || '').toLowerCase() === 'true' ? 'trial' : 'buy');

/** A note when the plan in the link is not one we sell any more. */
export const planLinkNote = (planIdParam: string, plans: PlanRow[], chosen: PlanRow | null): string => {
  if (!planIdParam || !plans.length || !chosen) return '';
  if (plans.some((p) => p.uuid === planIdParam)) return '';
  return `That plan link is out of date, so ${chosen.plan_name || 'the current plan'} is shown instead.`;
};

export const trialHeading = (plan: PlanRow | null | undefined): string => {
  const days = Number(plan?.trial_period) || 0;
  return days > 0 ? `Start your ${days}-day free trial` : 'Start your free trial';
};

/** "Your 14-day trial" when the plan says how long; "Your trial" when it does not. */
export const trialNoun = (plan: PlanRow | null | undefined): string => {
  const days = Number(plan?.trial_period) || 0;
  return days > 0 ? `Your ${days}-day trial` : 'Your trial';
};

/* --- carrying on after a reload ---------------------------------------- */

export const FLOW_STORAGE_KEY = 'gs_flow_v1';

export interface SavedFlow {
  step: StartStep;
  path: StartPath;
  form: AccountForm;
  planUuid: string;
  cycle: BillingCycle;
  seats: number;
  team: Record<string, string>;
  verifiedEmail: string;
  /** The sign-up answer (token, auth). Kept so the number step can carry on. */
  result: any;
  mainNumber: string;
  savedAt: number;
}

/** How long a saved flow is honoured: the sign-up token does not last for ever. */
export const FLOW_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/** What is kept between reloads. Never the code or a card. */
export const serializeFlow = (flow: Omit<SavedFlow, 'savedAt'>): string =>
  JSON.stringify({ ...flow, form: { ...flow.form, password: '' }, savedAt: Date.now() });

const STEPS: StartStep[] = ['account', 'verify', 'team', 'plan', 'payment', 'review', 'creating', 'number', 'done', 'exists'];

/** The saved flow, or null when there is none, it is too old, or it is not ours. */
export const restoreFlow = (raw: unknown, now: number = Date.now()): SavedFlow | null => {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const f = JSON.parse(raw);
    if (!f || typeof f !== 'object' || !STEPS.includes(f.step) || !f.form || typeof f.form.email !== 'string') return null;
    if (!Number.isFinite(f.savedAt) || now - f.savedAt > FLOW_MAX_AGE_MS) return null;
    return f as SavedFlow;
  } catch {
    return null;
  }
};

/**
 * The step that is safe to show for a step someone asked for (a reload, the
 * browser's Back or Forward, a typed URL). A consumed or half-done step is
 * never shown as it was: a detour goes back to the form, the code step asks
 * for a fresh code, anything past the code needs a verified email, and
 * anything after the account exists goes to "setting things up", which reads
 * the server's status and moves on by itself.
 */
export const safeStep = (target: StartStep, ctx: { verifiedEmail?: string; token?: string }): StartStep => {
  /* Once the account exists (the sign-up answered with a token) there is no
     way back to the form or the plan: the only steps left are setting up,
     which reads the server's status and moves on, and the finished screen. */
  if (ctx.token) return target === 'done' ? 'done' : 'creating';
  if (target === 'account' || target === 'exists' || target === 'verify') return 'account';
  if (target === 'team' || target === 'plan' || target === 'payment' || target === 'review') return ctx.verifiedEmail ? target : 'account';
  if (target === 'creating' || target === 'number') return ctx.token ? 'creating' : 'account';
  if (target === 'done') return ctx.token ? 'done' : 'account';
  return 'account';
};

/** Where a reload lands. */
export const resumeStep = (saved: Pick<SavedFlow, 'step' | 'verifiedEmail' | 'result'>): StartStep =>
  safeStep(saved.step, { verifiedEmail: saved.verifiedEmail, token: saved.result?.token });

/* --- the browser's Back and Forward ------------------------------------- */

/** The step named in the address, if it is one; never the detour. */
export const stepFromParam = (raw: unknown): StartStep | null => {
  const text = String(raw || '');
  return STEPS.includes(text as StartStep) && text !== 'exists' ? (text as StartStep) : null;
};

/** The query string with the step written in, so every step is a history
    entry. The first step carries no parameter. */
export const withStep = (search: string, step: StartStep): string => {
  const q = new URLSearchParams(search);
  if (step === 'account' || step === 'exists') q.delete('step');
  else q.set('step', step);
  const text = q.toString();
  return text ? `?${text}` : '';
};

/* --- words --------------------------------------------------------------- */

/** Plain words for the account check's validation replies. */
export const accountServerError = (message: unknown): string => {
  const text = String(message || '').toLowerCase();
  if (/valid (mobile|phone)/.test(text)) return 'That does not look like a mobile number. Enter a mobile, not a landline.';
  if (/valid email/.test(text)) return 'That does not look like an email address (name@company.com).';
  return String(message || '');
};

/** A different company with the same name needs a word that tells them
    apart; the place is the obvious one. */
export const companyNameHint = (name: unknown, place: unknown): string => {
  const base = String(name || '').trim();
  const word = String(place || '').trim() || 'HQ';
  return `Add a word so it is different, for example "${base ? `${base} ${word}` : word}".`;
};

export const joinNames = (names: string[]): string => {
  const list = names.filter(Boolean);
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
};

/** Why the number step offers the countries it does. */
export const numberCountriesLine = (labels: string[]): string =>
  labels.length ? `This plan includes numbers in ${joinNames(labels)}. Numbers in other countries can be added later under Numbers.` : '';

/* --- what a failed request says ---------------------------------------- */

/**
 * The words for a failed request. The server's own message when it gave one
 * and the failure was ours to fix (a 4xx); otherwise what actually happened
 * in plain words and what to do next, never the HTTP client's own text.
 */
export const requestErrorText = (input: { status?: number | null; message?: unknown; fallback: string }): string => {
  const status = Number(input.status) || 0;
  const message = String(input.message || '').trim();
  if (!status) return 'We could not reach the server just now. Check your connection and try again in a moment.';
  if (status >= 500) return `The server could not answer just now (HTTP ${status}). Try again in a moment.`;
  return message || input.fallback;
};

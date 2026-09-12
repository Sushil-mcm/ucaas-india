/* The public pricing page's decisions, kept away from the markup so they can be
   tested without a browser (tests/pricing-cards-test.cjs).

   The cards are built from the live plan records (/api/plan/list), never from
   a hand-typed table, so what a visitor sees is what checkout charges. When a
   record carries a price that cannot be right (a year cheaper than a month, a
   "discount" above the list price, nothing at all) the card says "Let's talk"
   instead of printing a number nobody will honour. */

export type Cycle = 'MONTHLY' | 'YEARLY';

export interface PlanCost {
  type: string;
  original_price?: number | string | null;
  discount_price?: number | string | null;
  discount_enabled?: boolean | null;
  discount?: number | string | null;
}

export interface PricingPlan {
  uuid: string;
  plan_name: string;
  description?: string | null;
  licenses?: number | null;
  trial_period?: number | null;
  free_calls?: number | string | null;
  free_sms?: number | string | null;
  free_storage?: number | string | null;
  did_count?: number | string | null;
  credits?: number | string | null;
  did_number_type?: string[] | null;
  call_countries?: { country_name?: string; country_code_iso2?: string }[] | null;
  cost?: PlanCost[] | null;
  /* Pricing-page controls set in super-admin (all optional on older records). */
  show_on_pricing?: number | boolean | null;
  sort_order?: number | string | null;
  is_popular?: number | boolean | null;
  trial_requires_card?: 'Y' | 'N' | null;
  pricing_bullets?: string[] | null;
}

/** Listed on the page unless the admin switched it off (missing = shown). */
export const shownOnPricing = (plan: PricingPlan): boolean =>
  plan.show_on_pricing === undefined || plan.show_on_pricing === null || Number(plan.show_on_pricing) === 1 || plan.show_on_pricing === true;

/** The admin's own card lines, when any were written. */
export const adminBullets = (plan: PricingPlan): string[] =>
  Array.isArray(plan.pricing_bullets) ? plan.pricing_bullets.map((b) => String(b || '').trim()).filter(Boolean).slice(0, 8) : [];

/* The records store "unlimited" as a very large number. */
export const UNLIMITED_THRESHOLD = 999999;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

export const costFor = (plan: PricingPlan, cycle: Cycle): PlanCost | null =>
  (plan.cost || []).find((c) => c && c.type === cycle) || null;

export type PriceView =
  | { kind: 'free' }
  | { kind: 'quote'; reason: string }
  | {
      kind: 'priced';
      cycle: Cycle;
      perMonth: number;
      perYear: number | null;
      listPerMonth: number | null;
      savePct: number | null;
    };

/* What the price block prints for one plan on one billing cycle. */
export const priceView = (plan: PricingPlan, cycle: Cycle): PriceView => {
  const monthlyCost = costFor(plan, 'MONTHLY');
  const yearlyCost = costFor(plan, 'YEARLY');
  const monthly = num(monthlyCost?.original_price);
  if (monthly === null) return { kind: 'quote', reason: 'no monthly price on the record' };
  if (monthly < 0) return { kind: 'quote', reason: 'negative monthly price' };

  const yearList = num(yearlyCost?.original_price);
  const yearDiscounted = yearlyCost?.discount_enabled ? num(yearlyCost?.discount_price) : null;
  const yearTotal = yearDiscounted !== null && yearDiscounted > 0 ? yearDiscounted : yearList;

  if (monthly === 0 && (yearTotal === null || yearTotal === 0)) return { kind: 'free' };
  if (monthly === 0) return { kind: 'quote', reason: 'free month with a paid year' };
  if (yearList !== null && yearList > 0) {
    if (yearDiscounted !== null && yearDiscounted > yearList)
      return { kind: 'quote', reason: 'discounted year above the list year' };
    if (yearList < monthly) return { kind: 'quote', reason: 'a year cheaper than a month' };
  }

  if (cycle === 'YEARLY' && yearTotal !== null && yearTotal > 0) {
    const perMonth = round2(yearTotal / 12);
    const savePct = perMonth < monthly ? Math.round((1 - perMonth / monthly) * 100) : 0;
    return {
      kind: 'priced',
      cycle: 'YEARLY',
      perMonth,
      perYear: yearTotal,
      listPerMonth: savePct > 0 ? monthly : null,
      savePct: savePct > 0 ? savePct : null,
    };
  }
  return { kind: 'priced', cycle: 'MONTHLY', perMonth: monthly, perYear: null, listPerMonth: null, savePct: null };
};

/* The biggest annual saving across the plans, for the "Save up to N%" pill. */
export const maxSavingPct = (plans: PricingPlan[]): number => {
  let best = 0;
  for (const p of plans) {
    const v = priceView(p, 'YEARLY');
    if (v.kind === 'priced' && v.savePct && v.savePct > best) best = v.savePct;
  }
  return best;
};

export const money = (n: number): string =>
  Number.isInteger(n) ? `$${n.toLocaleString('en-US')}` : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const seatLine = (plan: PricingPlan): string => {
  const seats = num(plan.licenses);
  if (seats === null || seats <= 0 || seats >= UNLIMITED_THRESHOLD) return 'Unlimited users';
  return `Up to ${seats.toLocaleString('en-US')} user${seats === 1 ? '' : 's'}`;
};

const countryList = (plan: PricingPlan): string => {
  const names = (plan.call_countries || []).map((c) => c.country_name || c.country_code_iso2 || '').filter(Boolean);
  if (!names.length) return 'your country';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.length} countries`;
};

/* What each plan includes, read off the record; nothing is invented. */
export const bullets = (plan: PricingPlan): string[] => {
  const own = adminBullets(plan);
  if (own.length) return own;
  const out: string[] = [];
  const view = priceView(plan, 'MONTHLY');
  const minutes = num(plan.free_calls) ?? 0;
  const texts = num(plan.free_sms) ?? 0;
  const numbers = num(plan.did_count) ?? 0;
  const storage = num(plan.free_storage) ?? 0;
  const credit = num(plan.credits) ?? 0;
  const where = countryList(plan);

  if (view.kind === 'free') {
    out.push('No monthly fee, no seat charge');
    out.push(`Pay per number and per minute in ${where}`);
  } else if (minutes >= UNLIMITED_THRESHOLD) {
    out.push(`Unlimited calling in ${where}, per user`);
  } else if (minutes > 0) {
    out.push(`${minutes.toLocaleString('en-US')} calling minutes a month in ${where}, per user`);
  }
  if (texts >= UNLIMITED_THRESHOLD) out.push('Unlimited texts');
  else if (texts > 0) out.push(`${texts.toLocaleString('en-US')} texts a month, per user`);
  if (numbers > 0) out.push(`${numbers} phone number${numbers === 1 ? '' : 's'} included`);
  const types = (plan.did_number_type || []).map((t) => String(t).toLowerCase());
  if (types.length) out.push(`${types.map((t) => (t === 'toll free' ? 'toll-free' : t)).join(', ')} numbers`.replace(/^./, (c) => c.toUpperCase()));
  if (storage > 0) out.push(`${storage.toLocaleString('en-US')} GB recording storage`);
  if (credit > 0) out.push(`${money(credit)} calling credit to start`);
  if (view.kind !== 'free') out.push('Auto attendant, call routing, voicemail and texting');
  return out;
};

/* Only plans the admin shows, in the admin's order; ties (and records without
   a position) go cheapest first, with plans without a usable price last. */
export const orderPlans = <T extends PricingPlan>(plans: T[]): T[] => {
  const pos = (p: PricingPlan): number => {
    const n = Number(p.sort_order);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const key = (p: PricingPlan): number => {
    const v = priceView(p, 'MONTHLY');
    if (v.kind === 'free') return 0;
    if (v.kind === 'priced') return v.perMonth;
    return Number.POSITIVE_INFINITY;
  };
  return plans.filter(shownOnPricing).sort((a, b) => {
    const pa = pos(a);
    const pb = pos(b);
    if (pa !== pb) {
      if (pa === 0) return 1;
      if (pb === 0) return -1;
      return pa - pb;
    }
    return key(a) - key(b);
  });
};

/* The card that gets the "Most popular" badge: the priced plan with the longest
   free trial, since that is the one the funnel is built around; failing that
   the dearest priced plan. */
export const popularUuid = (plans: PricingPlan[]): string | null => {
  const flagged = plans.find((p) => Number(p.is_popular) === 1 || p.is_popular === true);
  if (flagged) return flagged.uuid;
  const priced = plans.filter((p) => priceView(p, 'MONTHLY').kind === 'priced');
  if (!priced.length) return null;
  const withTrial = priced.filter((p) => (num(p.trial_period) ?? 0) > 0);
  const pool = withTrial.length ? withTrial : priced;
  return pool.reduce((best, p) => {
    const t = num(p.trial_period) ?? 0;
    const bt = num(best.trial_period) ?? 0;
    if (t !== bt) return t > bt ? p : best;
    const pv = priceView(p, 'MONTHLY');
    const bv = priceView(best, 'MONTHLY');
    return pv.kind === 'priced' && bv.kind === 'priced' && pv.perMonth > bv.perMonth ? p : best;
  }).uuid;
};

export const trialDays = (plan: PricingPlan): number => Math.max(0, Math.floor(num(plan.trial_period) ?? 0));

/* Which sign-up a button opens. The new flow is the default; the old one stays
   reachable as a backup by setting localStorage.signup_v2 = 'off' (and 'on'
   forces the new one whatever the default is). */
export const signupBase = (stored: string | null | undefined, newFlowByDefault: boolean): string => {
  if (stored === 'on') return '/get-started';
  if (stored === 'off') return '/sign-up';
  return newFlowByDefault ? '/get-started' : '/sign-up';
};

export const signupHref = (base: string, planUuid: string, isTrial: boolean): string =>
  `${base}?planId=${encodeURIComponent(planUuid)}&isTrial=${isTrial ? 'true' : 'false'}`;

/* The custom / enterprise conversation has no self-serve checkout: it goes to
   the sales form, which lives in the older sign-up. */
export const TALK_TO_SALES_PATH = '/sign-up?planId=custom&isTrial=false';

export type Cta = { label: string; href: string };
export const ctasFor = (plan: PricingPlan, cycle: Cycle, base: string): { primary: Cta; trial: Cta | null; note: string | null } => {
  const view = priceView(plan, cycle);
  if (view.kind === 'quote') return { primary: { label: 'Talk to sales', href: TALK_TO_SALES_PATH }, trial: null, note: 'Volume pricing, invoicing and a dedicated onboarding team.' };
  const days = trialDays(plan);
  const trial = days > 0 ? { label: `Try free for ${days} days`, href: signupHref(base, plan.uuid, true) } : null;
  if (view.kind === 'free') return { primary: { label: 'Get started', href: signupHref(base, plan.uuid, false) }, trial, note: null };
  return { primary: { label: 'Buy now', href: signupHref(base, plan.uuid, false) }, trial, note: trial ? null : 'No free trial on this plan.' };
};

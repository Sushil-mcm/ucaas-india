import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Country, State, City } from 'country-state-city';
import {
  buyVirtualDID,
  countryList,
  didGroupTypes,
  didRegionList,
  getAvailableDid,
  getDidGroup,
  getDidPrefixes,
  getPlanInfo,
  getSignupStatus,
  getTaxesAndFeesQuiet,
  retrySignupProvision,
  sendOtpForSignUPQuiet,
  signup,
  signupOnTrial,
  validateAccountQuiet,
  verifyOtpQuiet,
} from '@/services/api';
import { getPlanDidCountries } from '@/lib/did-countries';
import { isSellableNumberType, lookupInventory } from '@/lib/did-inventory';
import { useGetPlans } from '@/hooks/common';
import { useOrganization } from '@/hooks/use-organisation';
import { Turnstile } from '@/hooks/use-turnstile';
import PaymentScreen from '@/components/payment';
import { Ic, McmIconSprite } from '@/components/mcm/icons';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { getDeviceId, getEnv, handleAlert } from '@/lib/utils';
import countryListJson from '@/lib/countries.json';
import LogoIcon from '@/assets/images/LogoIcon.svg';
import {
  CYCLE_LABELS,
  CYCLE_TO_DURATION,
  EXISTS_COPY,
  FLOW_STORAGE_KEY,
  NUMBER_TYPE_HINT,
  PROVISION_MAX_POLLS,
  PURCHASE_WINDOW_SECONDS,
  RAIL_LABELS,
  RESEND_COOLDOWN_SECONDS,
  type AccountField,
  type AccountForm,
  type BillingCycle,
  type ExistsReason,
  type PlanRow,
  type SignupStatus,
  type StartPath,
  type StartStep,
  accountCheckPayload,
  accountProblems,
  accountServerError,
  buyNumberPayload,
  buyNumberProblems,
  clampSeats,
  companyNameHint,
  countdownLabel,
  existsReason,
  money,
  nextStep,
  numberCountriesLine,
  numberCountryOptions,
  numberListStage,
  numberTypeLabel,
  otpErrorText,
  otpNext,
  pathFromParams,
  phonePlaceholder,
  phoneWithPrefix,
  planLinkNote,
  prettyNumber,
  provisionState,
  railIndexFor,
  requestErrorText,
  restoreFlow,
  resumeStep,
  safeStep,
  seatCeiling,
  seatEntry,
  seatPricePerMonth,
  secondsLeft,
  serializeFlow,
  signupPayload,
  stepFromParam,
  stepsFor,
  subtotal,
  trialHeading,
  trialNoun,
  trialEndsOn,
  trialNeedsCard,
  trialPlanOf,
  planSellable,
  effectivePath,
  cyclesFor,
  withStep,
} from '@/lib/get-started-flow';
import './get-started.css';

/**
 * Get started: the sign-up, trial and purchase flow, in the order the
 * reference products use and our own sign-up did not.
 *
 * It lives beside the current /sign-up rather than replacing it, and calls
 * the same server endpoints that flow calls (account check, OTP, tax, sign-up,
 * number purchase). What is new: the order of the questions, the honest
 * "setting things up" step that watches the company's workspace being built
 * and retries it, a clear answer when the company or phone already exists,
 * and the human check on every public form.
 *
 * Nothing here is reachable from the pricing page until the switch in
 * src/pages/pricing is on; testers open /get-started?planId=...&isTrial=true.
 */

const EMPTY_FORM: AccountForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company_name: '',
  password: '',
  company_country: 'US',
  company_state: '',
  company_city: '',
  company_address: '',
  company_postal_code: '',
  timezone: '',
};

const TEAM_SIZES = ['Just me', '2 to 10', '11 to 50', 'More than 50'];
const TEAM_USES = ['Business calls and texts', 'Answer customers', 'Call lists'];
const TEAM_TODAY = ['Mobile phones', 'Another provider', 'A desk phone system'];
/* The brand's own policy pages, the same links the log-in page uses. */
/* Every failure in this flow is shown in the card, so the API client's own
   error toast is switched off for its calls. */
const QUIET = { hideToastOnError: true } as const;
const TERMS_URL = 'https://www.mycountrymobile.com/terms-and-conditions/';
const PRIVACY_URL = 'https://www.mycountrymobile.com/privacy-policy/';

const errorText = (error: any, fallback: string) =>
  requestErrorText({
    status: error?.response?.status,
    message: error?.response?.data?.message || error?.response?.data?.error?.message || '',
    fallback,
  });

/* The saved flow, read once. Reloading used to drop a customer whose account
   already existed back onto an empty form. */
const readSavedFlow = () => {
  try {
    return restoreFlow(sessionStorage.getItem(FLOW_STORAGE_KEY));
  } catch {
    return null;
  }
};

/** Put the cursor in a form field by name, once the screen has drawn it. */
const focusField = (name: string, mode: 'plain' | 'select' | 'end' = 'plain') =>
  window.setTimeout(() => {
    const el = document.querySelector<HTMLInputElement>(`[name="gs-${name}"]`);
    if (!el) return;
    el.focus();
    try {
      if (mode === 'select') el.select();
      if (mode === 'end') el.setSelectionRange(el.value.length, el.value.length);
    } catch {
      /* selects have no selection range */
    }
    el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, 30);

const GetStarted = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { mainSiteInfo } = useOrganization();
  const planIdParam = String(params.get('planId') || '');
  const saved = useRef(readSavedFlow()).current;
  const linkPath: StartPath = params.has('isTrial') ? pathFromParams(params.get('isTrial')) : saved?.path || 'buy';

  const { data: plans = [], isPending: plansPending } = useGetPlans();
  /* Every plan the super-admin publishes with a real price is sellable here;
     a plan whose price rows are nonsense is left to sales (planSellable). */
  const buyable: PlanRow[] = useMemo(() => (plans as PlanRow[]).filter((p) => planSellable(p)), [plans]);
  const [planUuid, setPlanUuid] = useState(planIdParam || saved?.planUuid || '');
  const plan: PlanRow | null = useMemo(
    () => (plans as PlanRow[]).find((p) => p.uuid === planUuid) || (linkPath === 'trial' ? trialPlanOf(plans as PlanRow[]) || buyable[0] : buyable[0]) || null,
    [plans, planUuid, linkPath, buyable],
  );
  const path: StartPath = effectivePath(linkPath, plan);
  const stepOptions = { trialNeedsCard: trialNeedsCard(plan) };

  const stepParam = stepFromParam(params.get('step'));
  const [step, setStepRaw] = useState<StartStep>(saved ? resumeStep({ ...saved, step: stepParam || saved.step }) : 'account');
  const [form, setForm] = useState<AccountForm>(saved?.form ? { ...EMPTY_FORM, ...saved.form } : EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AccountField, string>>>({});
  const set = <K extends keyof AccountForm>(key: K, value: AccountForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };
  const [captchaToken, setCaptchaToken] = useState('');
  const [exists, setExists] = useState<{ reason: ExistsReason; message: string } | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resentNote, setResentNote] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [verifiedEmail, setVerifiedEmail] = useState(saved?.verifiedEmail || '');
  const [team, setTeam] = useState<Record<string, string>>(saved?.team || { size: TEAM_SIZES[1], use: TEAM_USES[0], today: TEAM_TODAY[0] });
  const [cycle, setCycle] = useState<BillingCycle>(saved?.cycle || 'YEARLY');
  const [seats, setSeats] = useState(saved?.seats || 1);
  const [seatText, setSeatText] = useState(String(saved?.seats || 1));
  const [seatNote, setSeatNote] = useState('');
  const [tax, setTax] = useState<any>(null);
  const [agreed, setAgreed] = useState(false);
  const [result, setResult] = useState<any>(saved?.result || null);
  const [resumedNote, setResumedNote] = useState(saved ? 'Welcome back. Carrying on where you left off.' : '');
  /* Every step change clears the previous step's toasts, so an old error
     never sits on top of a new screen. */
  const setStep = (next: StartStep) => {
    toast.dismiss();
    setResumedNote('');
    setStepRaw(next);
    /* Each step is a history entry, so the browser's Back goes to the
       previous step instead of leaving the flow. */
    const search = withStep(params.toString(), next);
    if (search !== window.location.search) navigate({ pathname: window.location.pathname, search });
  };
  /* Back or Forward changed the address: show the step it names, or the
     nearest one that is safe to show. */
  useEffect(() => {
    const target = stepParam || 'account';
    if (target === step) return;
    toast.dismiss();
    setStepRaw(safeStep(target, { verifiedEmail, token: String(result?.token || '') }));
  }, [stepParam]);
  const [companyHint, setCompanyHint] = useState('');
  const [polls, setPolls] = useState(0);
  const [status, setStatus] = useState<SignupStatus | null>(null);
  const paymentRef = useRef<any>(null);
  const websiteUuid = (() => {
    try {
      return localStorage.getItem('org_uuid') || '';
    } catch {
      return '';
    }
  })();

  useEffect(() => {
    if (plan) setSeats((s) => clampSeats(s, plan));
  }, [plan]);
  useEffect(() => setSeatText(String(seats)), [seats]);

  /* What is kept between reloads: the step, the form and the sign-up answer;
     never the code or a card. Cleared when the customer leaves for log in. */
  useEffect(() => {
    try {
      sessionStorage.setItem(FLOW_STORAGE_KEY, serializeFlow({ step, path, form, planUuid: plan?.uuid || planUuid, cycle, seats, team, verifiedEmail, result, mainNumber: '' }));
    } catch {
      /* storage unavailable: the flow still works, it just cannot survive a reload */
    }
  }, [step, path, form, planUuid, plan, cycle, seats, team, verifiedEmail, result]);
  const leaveForLogin = () => {
    try {
      sessionStorage.removeItem(FLOW_STORAGE_KEY);
    } catch {
      /* nothing to clear */
    }
    toast.dismiss();
    navigate('/', { state: { email: form.email.trim() } });
  };

  /* Address lookups, the same library the current sign-up uses. */
  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(() => (form.company_country ? State.getStatesOfCountry(form.company_country) : []), [form.company_country]);
  const cities = useMemo(
    () => (form.company_country && form.company_state ? City.getCitiesOfState(form.company_country, form.company_state) : []),
    [form.company_country, form.company_state],
  );
  const prevCountry = useRef(form.company_country);
  useEffect(() => {
    const zones = (countryListJson as any[])?.find((c) => c?.isoCode === form.company_country)?.timezones || [];
    const changed = prevCountry.current !== form.company_country;
    const oldCode = Country.getCountryByCode(prevCountry.current)?.phonecode;
    const newCode = Country.getCountryByCode(form.company_country)?.phonecode;
    prevCountry.current = form.company_country;
    if (changed || !form.timezone) set('timezone', zones[0]?.zoneName || '');
    if (changed) {
      /* A restored form keeps its state and city; only a real change clears them. */
      set('company_state', '');
      set('company_city', '');
    }
    /* The dialling code is filled in and follows the country; typed digits are kept. */
    set('phone', phoneWithPrefix(form.phone, changed ? oldCode : newCode, newCode));
  }, [form.company_country]);
  const phoneCode = Country.getCountryByCode(form.company_country)?.phonecode;

  /* --- server calls, in the order the steps use them --- */
  const resending = useRef(false);
  const { mutate: sendOtp, isPending: sendingOtp } = useMutation({
    mutationFn: sendOtpForSignUPQuiet,
    onSuccess: () => {
      if (resending.current) {
        resending.current = false;
        setResentNote(`A new code is on its way to ${form.email.trim()}.`);
        setResendAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
        return;
      }
      setStep('verify');
    },
    onError: (error: any) => {
      resending.current = false;
      const message = errorText(error, 'the request failed.');
      /* From the account step (first send) a refused email belongs under the
         email field; on the code step it is the card's message. */
      if (step === 'account') {
        if (/email/i.test(message)) {
          setFieldErrors((e) => ({ ...e, email: accountServerError(message) }));
          focusField('email', 'select');
        } else handleAlert({ text: `The code could not be sent: ${message}`, type: 'error' });
        return;
      }
      setOtpError(`The code could not be sent: ${message}`);
    },
  });
  const otpPayload = () => ({ email: form.email.trim(), device_id: getDeviceId(), website_uuid: websiteUuid, name: `${form.first_name} ${form.last_name}`.trim() });
  const resendCode = () => {
    toast.dismiss();
    setOtp('');
    setOtpError('');
    setResentNote('');
    resending.current = true;
    sendOtp(otpPayload());
    focusField('otp');
  };

  const { mutate: checkAccount, isPending: checking } = useMutation({
    mutationFn: validateAccountQuiet,
    onSuccess: () => {
      /* An email that already passed its code is not asked for another one
         (Back from Plan used to land on a consumed code). The account check
         still ran, because the company or mobile may have changed. */
      if (verifiedEmail && form.email.trim() === verifiedEmail) {
        if (path === 'free') submitFree();
        else setStep(nextStep(path, 'verify', stepOptions) || 'creating');
        return;
      }
      sendOtp(otpPayload());
    },
    onError: (error: any) => {
      const message = errorText(error, 'That account could not be created.');
      const reason = existsReason(message);
      if (reason) {
        setExists({ reason, message });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      /* A validation message lands under the field it is about, not in a toast. */
      const lower = message.toLowerCase();
      const field: AccountField | null = /phone|mobile/.test(lower) ? 'phone' : /email/.test(lower) ? 'email' : /company/.test(lower) ? 'company_name' : null;
      if (field) {
        const words = accountServerError(message);
        setFieldErrors((e) => ({ ...e, [field]: words }));
        focusField(field, 'select');
      } else handleAlert({ text: message, type: 'error' });
    },
  });

  const { mutate: verify, isPending: verifying } = useMutation({
    mutationFn: verifyOtpQuiet,
    onSuccess: () => {
      setVerifiedEmail(form.email.trim());
      if (path === 'free') submitFree();
      else setStep(nextStep(path, 'verify', stepOptions) || 'creating');
    },
    onError: (error: any) => {
      setOtpError(otpErrorText(errorText(error, 'That code did not match.')));
      setOtp('');
      focusField('otp');
    },
  });
  /* The box is empty on every arrival at the code step. */
  useEffect(() => {
    if (step !== 'verify') return;
    setOtp('');
    setOtpError('');
    setResentNote('');
    focusField('otp', 'select');
  }, [step]);
  const [ticker, setTicker] = useState(Date.now());
  useEffect(() => {
    if (resendAt <= Date.now()) return;
    const id = window.setInterval(() => setTicker(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [resendAt]);
  const resendWait = secondsLeft(resendAt, ticker);

  const { mutateAsync: quote, isPending: quoting } = useMutation({ mutationFn: getTaxesAndFeesQuiet });

  const onSignedUp = ({ data }: any) => {
    const res = data?.data?.result || {};
    if (res?.stripe_message) {
      handleAlert({ text: res.stripe_message, type: 'error' });
      return;
    }
    setResult(res);
    if (res?.requires_action && paymentRef.current) {
      paymentRef.current.handle3DSPayment(res.payment_intent);
      return;
    }
    setStep('creating');
  };
  const onSignupError = (error: any) => handleAlert({ text: errorText(error, 'The account could not be created.'), type: 'error' });
  const { mutate: createTrial, isPending: creatingTrial } = useMutation({ mutationFn: (p: any) => signupOnTrial(p, QUIET), onSuccess: onSignedUp, onError: onSignupError });
  const { mutate: createPaid, isPending: creatingPaid } = useMutation({ mutationFn: (p: any) => signup(p, QUIET), onSuccess: onSignedUp, onError: onSignupError });

  /* Setting things up: poll until the workspace exists, then hand over to the
     number screen. Stuck after PROVISION_MAX_POLLS; the retry button asks the
     server to try again. */
  const token = String(result?.token || '');
  const provision = provisionState(status, polls);
  const [pollError, setPollError] = useState('');
  useQuery({
    queryKey: ['signupStatus', token, polls],
    queryFn: async () => {
      /* A failed read counts as a poll too, so a broken status route ends in
         the honest "taking longer than it should" state with the reason
         shown, instead of a spinner that never moves. */
      try {
        const res: any = await getSignupStatus(token);
        const s = res?.data?.data?.result || res?.data?.data || null;
        setStatus(s);
        setPollError('');
        return s;
      } catch (error: any) {
        setPollError(errorText(error, 'The status could not be read.'));
        return null;
      } finally {
        setPolls((n) => n + 1);
      }
    },
    enabled: step === 'creating' && Boolean(token) && provision === 'working',
    refetchInterval: 3000,
  });
  const { mutate: retry, isPending: retrying } = useMutation({
    mutationFn: () => retrySignupProvision(token),
    onSuccess: () => setPolls(0),
  });
  /* A resumed flow whose number was already bought has nothing left to do. */
  useEffect(() => {
    if (step === 'creating' && Number(status?.numbers) > 0) setStep('done');
  }, [step, status?.numbers]);

  /* --- step submits --- */
  const submitAccount = () => {
    const problems = accountProblems(form);
    setFieldErrors(problems);
    const first = Object.keys(problems)[0];
    if (first) {
      focusField(first);
      return;
    }
    setExists(null);
    checkAccount({ ...accountCheckPayload(form, plan?.uuid || ''), ...(captchaToken ? { captchaToken } : {}) });
  };
  const fieldErr = (key: AccountField) => (fieldErrors[key] ? <small className="gs-err" role="alert">{fieldErrors[key]}</small> : null);
  const fieldClass = (key: AccountField, extra = '') => `mcm-field${extra ? ` ${extra}` : ''}${fieldErrors[key] ? ' invalid' : ''}`;
  const setSeatCount = (value: unknown) => {
    const entry = seatEntry(value, plan);
    setSeats(entry.seats);
    setSeatText(String(entry.seats));
    setSeatNote(entry.note);
  };

  /* The sign-up API insists on a tax calculation id even for a trial (the
     old flow quotes before it checks the account), so the trial quotes for
     one seat, monthly, and hands the id over. A quote that fails is shown
     with the real reason and the trial cannot start; nothing is charged either way. */
  const submitTrial = async (paymentMethodId?: string) => {
    if (!plan) return;
    let taxCalculationId = '';
    try {
      const res: any = await quote({
        plan_uuid: plan.uuid,
        licenses: 1,
        plan_duration: CYCLE_TO_DURATION.MONTHLY,
        line1: form.company_address,
        country: form.company_country,
        state: form.company_state,
        ...(form.company_city ? { city: form.company_city } : {}),
        postal_code: form.company_postal_code,
        type: 'SIGNUP',
      });
      taxCalculationId = String((res?.data?.data?.result || res?.data?.data || {})?.tax_calculation_id || '');
    } catch (error: any) {
      handleAlert({ text: errorText(error, 'The plan could not be priced.'), type: 'error' });
      return;
    }
    createTrial({
      ...signupPayload({ form, planUuid: plan.uuid, seats: 1, cycle: 'MONTHLY', isTrial: true, taxCalculationId, paymentMethodId, deviceId: getDeviceId(), websiteUuid, captchaToken }),
      otp,
    });
  };

  /* A plan with no monthly fee: the account is created straight after the
     code, with nothing to pay and no card to add. */
  const submitFree = async () => {
    if (!plan) return;
    let taxCalculationId = '';
    try {
      const res: any = await quote({ plan_uuid: plan.uuid, licenses: 1, plan_duration: CYCLE_TO_DURATION.MONTHLY, line1: form.company_address, country: form.company_country, state: form.company_state, ...(form.company_city ? { city: form.company_city } : {}), postal_code: form.company_postal_code, type: 'SIGNUP' });
      taxCalculationId = String((res?.data?.data?.result || res?.data?.data || {})?.tax_calculation_id || '');
    } catch (error: any) {
      handleAlert({ text: errorText(error, 'The plan could not be priced.'), type: 'error' });
      return;
    }
    createPaid({
      ...signupPayload({ form, planUuid: plan.uuid, seats: 1, cycle: 'MONTHLY', isTrial: false, taxCalculationId, deviceId: getDeviceId(), websiteUuid, captchaToken }),
      otp,
    });
  };

  const refreshQuote = async () => {
    if (!plan) return;
    try {
      const res: any = await quote({
        plan_uuid: plan.uuid,
        licenses: seats,
        plan_duration: CYCLE_TO_DURATION[cycle],
        line1: form.company_address,
        country: form.company_country,
        state: form.company_state,
        ...(form.company_city ? { city: form.company_city } : {}),
        postal_code: form.company_postal_code,
        type: 'SIGNUP',
      });
      setTax(res?.data?.data?.result || res?.data?.data || null);
    } catch (error: any) {
      setTax(null);
      handleAlert({ text: errorText(error, 'The tax could not be worked out.'), type: 'error' });
    }
  };
  useEffect(() => {
    if (step === 'payment') refreshQuote();
  }, [step, seats, cycle]);

  const onCardReady = (card: any) => {
    card?.setLoader?.(false);
    if (!plan || !agreed) {
      handleAlert({ text: 'Tick the agreement first.', type: 'error' });
      return;
    }
    if (path === 'trial') {
      submitTrial(card?.id);
      return;
    }
    createPaid({
      ...signupPayload({
        form,
        planUuid: plan.uuid,
        seats,
        cycle,
        isTrial: false,
        taxCalculationId: tax?.tax_calculation_id,
        amount: tax?.total_amount || subtotal(plan, seats, cycle),
        paymentMethodId: card?.id,
        deviceId: getDeviceId(),
        websiteUuid,
        captchaToken,
      }),
      otp,
    });
  };

  /* --- the number step ---
     The same query chain as the old number page, in the same order: the
     plan's countries (else the general list), the sellable number types, our
     own stock first, and the carrier's region -> area code -> prefix group ->
     numbers only when the shelf is empty. Every call carries the sign-up
     token, because there is no session yet. */
  const onNumberStep = step === 'number';
  const auth = useMemo(() => ({ headers: token ? { Authorization: `Bearer ${token}` } : undefined, hideToastOnError: true, allowUnauthorized: true }), [token]);
  const userUuid = String(result?.auth?.uuid || '');
  const companyUuid = String(result?.auth?.company_uuid || '');
  const [country, setCountry] = useState('');
  const [numberType, setNumberType] = useState<{ label: string; value: string } | null>(null);
  const [regionId, setRegionId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [group, setGroup] = useState<any>(null);
  const [pick, setPick] = useState<any>(null);
  const [buyError, setBuyError] = useState('');
  const [mainNumber, setMainNumber] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [clock, setClock] = useState(Date.now());

  const { data: planInfo, isLoading: planInfoLoading, error: planInfoError } = useQuery({
    queryKey: ['gsPlanInfo', plan?.uuid],
    queryFn: () => getPlanInfo(plan?.uuid || ''),
    select: (res: any) => res?.data?.data?.result,
    enabled: onNumberStep && Boolean(plan?.uuid),
  });
  const planCountries = useMemo(() => getPlanDidCountries(planInfo), [planInfo]);
  const { data: fallbackCountries = [], isLoading: fallbackLoading, error: fallbackError } = useQuery({
    queryKey: ['gsCountryList', token],
    queryFn: () => countryList(auth),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    enabled: onNumberStep && !planInfoLoading && planCountries.length === 0 && Boolean(token),
    retry: 1,
  });
  const countryOptions = useMemo(() => numberCountryOptions(planCountries, fallbackCountries), [planCountries, fallbackCountries]);
  const countriesLoading = planInfoLoading || fallbackLoading;
  useEffect(() => {
    if (!onNumberStep || country || !countryOptions.length) return;
    setCountry((countryOptions.find((c) => c.value === 'US') || countryOptions[0]).value);
  }, [onNumberStep, country, countryOptions]);

  const { data: typeRows = [], isLoading: typesLoading, error: typesError } = useQuery({
    queryKey: ['gsNumberTypes', country],
    queryFn: () => didGroupTypes(country, auth),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    enabled: onNumberStep && Boolean(country),
  });
  const typeOptions = useMemo(
    () => (typeRows as any[]).filter(isSellableNumberType).map((r) => ({ label: numberTypeLabel(r?.name), value: String(r?.id) })),
    [typeRows],
  );
  useEffect(() => {
    if (!onNumberStep || numberType || !typeOptions.length) return;
    setNumberType(typeOptions.find((t) => t.label === 'Local') || typeOptions[0]);
  }, [onNumberStep, numberType, typeOptions]);

  const { data: numbers, isFetching: numbersLoading, error: numbersError, refetch: refetchNumbers } = useQuery({
    queryKey: ['gsNumbers', country, numberType?.value, regionId, areaId, group?.id],
    queryFn: async (): Promise<{ source: 'inventory' | 'carrier' | 'empty'; rows: any[] }> => {
      const stock = await lookupInventory({ countryIso: country, numberType, regionName: null, config: auth });
      if (stock.source === 'inventory') return { source: 'inventory', rows: stock.rows };
      if (!group?.id) return { source: 'empty', rows: [] };
      const res: any = await getAvailableDid(
        { country_iso: country, region_id: regionId, group_type_id: [numberType?.value], group_id: group.id },
        auth,
      );
      return { source: 'carrier', rows: res?.data?.data?.result?.rows || [] };
    },
    enabled: onNumberStep && Boolean(country && numberType?.value),
  });
  const shelfEmpty = onNumberStep && Boolean(numberType?.value) && !numbersLoading && numbers?.source !== 'inventory';

  const { data: regions = [], isLoading: regionsLoading, error: regionsError } = useQuery({
    queryKey: ['gsRegions', country],
    queryFn: () => didRegionList({ country_iso: country }, auth),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    enabled: shelfEmpty,
  });
  const { data: areas = [], isLoading: areasLoading, error: areasError } = useQuery({
    queryKey: ['gsAreaCodes', country, regionId],
    queryFn: () => getDidPrefixes({ country_iso: country, region_id: regionId }, auth),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    enabled: shelfEmpty && Boolean(regionId),
  });
  const { data: groups = [], isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ['gsGroups', country, numberType?.value, regionId, areaId],
    queryFn: () => getDidGroup({ country_iso: country, group_type_id: [numberType?.value], region_id: regionId, nanpa_prefix_id: areaId }, auth),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    enabled: shelfEmpty && Boolean(regionId && areaId),
  });
  /* One prefix group is the common case: it is chosen for the customer. */
  useEffect(() => {
    if (!group && (groups as any[]).length === 1) setGroup(groups[0]);
  }, [groups, group]);

  const stage = numberListStage({
    typeId: numberType?.value || '',
    loading: numbersLoading || (shelfEmpty && Boolean(areaId) && groupsLoading),
    source: numbers?.source || null,
    regionId,
    areaId,
    groupId: group?.id ? String(group.id) : '',
    groupCount: (groups as any[]).length,
    count: numbers?.rows?.length || 0,
  });
  const numberRows: any[] = numbers?.rows || [];

  /* The list is only good for a while: after the window the pick is cleared
     and the list read again, so nobody buys a number that has gone. */
  useEffect(() => {
    if (!numberRows.length) return;
    setDeadline(Date.now() + PURCHASE_WINDOW_SECONDS * 1000);
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [numbers]);
  const left = deadline ? secondsLeft(deadline, clock) : PURCHASE_WINDOW_SECONDS;
  useEffect(() => {
    if (!numberRows.length || left > 0) return;
    setPick(null);
    setDeadline(Date.now() + PURCHASE_WINDOW_SECONDS * 1000);
    refetchNumbers();
  }, [left]);

  const pickCountry = (iso: string) => { setCountry(iso); setNumberType(null); setRegionId(''); setAreaId(''); setGroup(null); setPick(null); setBuyError(''); };
  const pickType = (t: { label: string; value: string }) => { setNumberType(t); setRegionId(''); setAreaId(''); setGroup(null); setPick(null); setBuyError(''); };
  const pickRegion = (id: string) => { setRegionId(id); setAreaId(''); setGroup(null); setPick(null); };
  const pickArea = (id: string) => { setAreaId(id); setGroup(null); setPick(null); };

  const { mutate: buyNumber, isPending: buying } = useMutation({
    mutationFn: (payload: any) => buyVirtualDID(payload, auth),
    onSuccess: () => {
      setMainNumber(String(pick?.number || ''));
      setStep('done');
    },
    onError: (error: any) => setBuyError(errorText(error, 'The number could not be added.')),
  });
  const submitNumber = () => {
    const input = { number: String(pick?.number || ''), didId: String(pick?.id || ''), userUuid, companyUuid };
    const problems = buyNumberProblems(input);
    if (problems.length) {
      setBuyError(`Cannot add the number yet: ${problems.join('; ')}.`);
      return;
    }
    setBuyError('');
    buyNumber(buyNumberPayload({ ...input, deviceId: getDeviceId(), apiBase: getEnv().VITE_API_BASE_URL, features: pick?.features ?? group?.features }));
  };
  const numberFault = (label: string, error: any) => (error ? <p className="gs-fault">{label}: {errorText(error, 'the request failed.')}</p> : null);

  /* --- rail --- */
  const rail = stepsFor(path, stepOptions);
  const railIndex = railIndexFor(path, step, stepOptions);

  const busy = checking || sendingOtp || verifying || creatingTrial || creatingPaid;

  return (
    <div className="mcm-page gs-page">
      <McmIconSprite />
      <header className="gs-header">
        <a className="gs-brand" onClick={() => navigate('/')}>
          <img src={mainSiteInfo?.small_logo ? `${getEnv().VITE_API_BASE_URL}/${mainSiteInfo.small_logo}` : LogoIcon} alt="" />
        </a>
        <span className="gs-help">
          Need help? <a href="/pricing">See plans</a> · <a onClick={leaveForLogin}>Log in</a>
        </span>
      </header>

      <main className="gs-main">
        <ol className="gs-rail" aria-label="Steps">
          {rail.map((s, i) => (
            <li key={s} className={i < railIndex ? 'done' : i === railIndex ? 'current' : ''}>
              <span className="gs-dot">{i < railIndex ? <Ic n="check" size={12} /> : i + 1}</span>
              {RAIL_LABELS[s]}
            </li>
          ))}
        </ol>

        {resumedNote && step !== 'account' ? <div className="gs-note gs-resumed">{resumedNote}</div> : null}

        {step === 'account' && !exists && (
          <form className="gs-card" onSubmit={(e) => { e.preventDefault(); if (!busy) submitAccount(); }} onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName === 'INPUT') { e.preventDefault(); if (!busy) submitAccount(); } }}>
            <h1>{path === 'trial' ? trialHeading(plan) : 'Create your account'}</h1>
            <p className="gs-sub">
              {path === 'trial'
                ? trialNeedsCard(plan)
                  ? `${plan?.plan_name || 'Your plan'} · a card is asked for, nothing is charged until the trial ends · cancel any time.`
                  : `${plan?.plan_name || 'Your plan'} · no card needed today · cancel any time.`
                : path === 'free'
                  ? `${plan?.plan_name || 'Your plan'} · no monthly fee · you pay for the numbers you keep and the calls you make.`
                  : `${plan?.plan_name || 'Your plan'} · you choose seats and pay on the next screens.`}
            </p>
            {planLinkNote(planIdParam, plans as PlanRow[], plan) ? <p className="gs-warn">{planLinkNote(planIdParam, plans as PlanRow[], plan)}</p> : null}
            <div className="gs-grid2">
              <label className="gs-field"><span>First name</span><input name="gs-first_name" className={fieldClass('first_name')} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} autoComplete="given-name" />{fieldErr('first_name')}</label>
              <label className="gs-field"><span>Last name</span><input name="gs-last_name" className="mcm-field" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} autoComplete="family-name" /></label>
            </div>
            <label className="gs-field"><span>Work email</span><input name="gs-email" className={fieldClass('email')} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />{fieldErr('email') || <small>We send a code here to confirm it is yours.</small>}</label>
            <label className="gs-field"><span>Company name</span><input name="gs-company_name" className={fieldClass('company_name')} value={form.company_name} onChange={(e) => { set('company_name', e.target.value); setCompanyHint(''); }} autoComplete="organization" />{fieldErr('company_name') || (companyHint ? <small className="gs-hint">{companyHint}</small> : null)}</label>
            <div className="gs-grid2">
              <label className="gs-field"><span>Country</span>
                <select name="gs-company_country" className="mcm-field" value={form.company_country} onChange={(e) => set('company_country', e.target.value)}>
                  {countries.map((c) => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                </select>
              </label>
              <label className="gs-field"><span>Mobile number</span><input name="gs-phone" className={fieldClass('phone', 'num')} inputMode="tel" placeholder={phonePlaceholder(phoneCode)} value={form.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />{fieldErr('phone') || <small>A mobile, not a landline: it is your second sign-in factor.</small>}</label>
            </div>
            <p className="gs-sub">Your sign-in details are emailed to you once the account exists. You can change the password from your profile.</p>

            <h2 className="gs-h2">Company address</h2>
            <p className="gs-sub">Where emergency calls from your numbers are sent, and what tax is worked out from. You can change it later under Company.</p>
            <label className="gs-field"><span>Street address</span><input name="gs-company_address" className={fieldClass('company_address')} value={form.company_address} onChange={(e) => set('company_address', e.target.value)} autoComplete="street-address" />{fieldErr('company_address')}</label>
            <div className="gs-grid3">
              <label className="gs-field"><span>State or region</span>
                <select name="gs-company_state" className={fieldClass('company_state')} value={form.company_state} onChange={(e) => set('company_state', e.target.value)}>
                  <option value="">Choose</option>
                  {states.map((s) => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                </select>
                {fieldErr('company_state')}
              </label>
              <label className="gs-field"><span>City</span>
                <select name="gs-company_city" className="mcm-field" value={form.company_city} onChange={(e) => set('company_city', e.target.value)} disabled={!form.company_state}>
                  <option value="">{!form.company_state ? 'Choose a state first' : cities.length ? 'Choose' : 'Not needed'}</option>
                  {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </label>
              <label className="gs-field"><span>Postal code</span><input name="gs-company_postal_code" className={fieldClass('company_postal_code', 'num')} value={form.company_postal_code} onChange={(e) => set('company_postal_code', e.target.value)} autoComplete="postal-code" />{fieldErr('company_postal_code')}</label>
            </div>
            <div className="gs-captcha"><Turnstile action="signup" onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} /></div>
            <div className="gs-actions">
              <button type="submit" className="btn primary" disabled={busy}>
                {checking || sendingOtp ? 'Checking…' : 'Continue'} <Ic n="arrow-in" size={14} />
              </button>
            </div>
            <p className="gs-fine">By continuing you agree to the <a href={TERMS_URL} target="_blank" rel="noreferrer">Terms of Service</a> and <a href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy Policy</a>. Already have an account? <a onClick={leaveForLogin}>Log in</a></p>
          </form>
        )}

        {exists ? (
          <section className="gs-card">
            <h1>{exists?.reason ? EXISTS_COPY[exists.reason].title : 'That account could not be created'}</h1>
            <p className="gs-sub">{exists?.reason ? EXISTS_COPY[exists.reason].body : exists?.message}</p>
            <div className="gs-choice-list">
              <button type="button" className="gs-choice" onClick={leaveForLogin}><strong>That account is mine</strong><span>Log in instead, or reset the password. Your email is filled in for you.</span></button>
              {exists?.reason === 'company' ? (
                <button type="button" className="gs-choice" onClick={() => { setExists(null); setCompanyHint(companyNameHint(form.company_name, form.company_city || states.find((x) => x.isoCode === form.company_state)?.name)); focusField('company_name', 'end'); }}><strong>This is a different company with the same name</strong><span>Carry on: add a word to the name so people can tell them apart.</span></button>
              ) : (
                <button type="button" className="gs-choice" onClick={() => { const f: AccountField = exists?.reason === 'phone' ? 'phone' : 'email'; setExists(null); focusField(f, 'select'); }}><strong>Use different details</strong><span>Go back and change the {exists?.reason === 'phone' ? 'mobile number' : 'email'}.</span></button>
              )}
            </div>
          </section>
        ) : null}

        {step === 'verify' && !exists && (
          <form className="gs-card gs-narrow" onSubmit={(e) => { e.preventDefault(); if (otp.length === 6 && !verifying) verify({ email: form.email.trim(), otp, device_id: getDeviceId() }); }}>
            <h1>Enter the 6-digit code</h1>
            <p className="gs-sub">Sent to <strong>{form.email.trim()}</strong>. The code proves the email is really yours.</p>
            <input name="gs-otp" className={`mcm-field gs-otp${otpError ? ' invalid' : ''}`} inputMode="numeric" value={otp} onChange={(e) => { setOtp(otpNext(otp, e.target.value, (e.nativeEvent as InputEvent)?.data)); setOtpError(''); }} onFocus={(e) => e.target.select()} aria-label="Verification code" autoFocus />
            {otpError ? <p className="gs-fault" role="alert">{otpError}</p> : null}
            {resentNote ? <p className="gs-ok" role="status">{resentNote}</p> : null}
            <div className="gs-actions">
              <button type="button" className="btn ghost" onClick={() => setStep('account')}>Back</button>
              <button type="submit" className="btn primary" disabled={otp.length !== 6 || verifying}>
                {verifying ? 'Checking…' : 'Verify'} <Ic n="arrow-in" size={14} />
              </button>
            </div>
            <p className="gs-fine">
              Nothing arrived? Check the spam folder, or{' '}
              {resendWait > 0 ? <span>send it again in {resendWait} s</span> : sendingOtp ? <span>sending…</span> : <a onClick={resendCode}>send it again</a>}.
            </p>
          </form>
        )}

        {step === 'team' && (
          <form className="gs-card" onSubmit={(e) => { e.preventDefault(); if (!plan) return; if (trialNeedsCard(plan)) setStep('payment'); else if (!(creatingTrial || quoting)) submitTrial(); }}>
            <h1>Tell us about your team</h1>
            <p className="gs-sub">Three quick answers so the trial starts on the right plan and setup skips what you do not need.</p>
            {[['How many people will use it?', TEAM_SIZES, 'size'], ['What will you mostly do?', TEAM_USES, 'use'], ['What do you use today?', TEAM_TODAY, 'today']].map(([q, options, key]) => (
              <div key={String(key)} className="gs-question">
                <div className="gs-q">{q as string}</div>
                <div className="gs-picks">
                  {(options as string[]).map((o) => (
                    <button type="button" key={o} className={`gs-pick${(team as any)[key as string] === o ? ' on' : ''}`} onClick={() => setTeam((t) => ({ ...t, [key as string]: o }))}>{o}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="gs-note">
              {trialNoun(plan)} starts on <strong>{plan?.plan_name || 'the trial plan'}</strong>{team.size === 'More than 50' ? '. For more than 50 people, talk to sales before the trial ends.' : '. Change plans any time from Billing.'}
            </div>
            <div className="gs-actions">
              <button type="button" className="btn ghost" onClick={() => setStep('account')}>Back</button>
              <button type="submit" className="btn primary" disabled={!plan || creatingTrial || quoting}>
                {trialNeedsCard(plan) ? 'Continue: add a card' : creatingTrial || quoting ? 'Starting…' : 'Start my trial'} <Ic n="arrow-in" size={14} />
              </button>
            </div>
          </form>
        )}

        {step === 'plan' && (
          <form className="gs-card gs-wide" onSubmit={(e) => { e.preventDefault(); if (plan) setStep('payment'); }}>
            <h1>Choose your plan and seats</h1>
            <p className="gs-sub">Nothing is charged on this screen.</p>
            <div className="gs-plans">
              {buyable.map((p) => (
                <button type="button" key={p.uuid} className={`gs-plan${plan?.uuid === p.uuid ? ' on' : ''}`} onClick={() => setPlanUuid(p.uuid)}>
                  <strong>{p.plan_name}</strong>
                  <span className="num">{money(seatPricePerMonth(p, cycle))}</span>
                  <small>per user / month{seatCeiling(p) !== Infinity ? ` · up to ${seatCeiling(p)} seats` : ''}</small>
                </button>
              ))}
            </div>
            <SettingCard title="Billing cycle and seats" description="One seat per person who makes or takes calls. Add more any time; we only charge for seats you have bought.">
              <SettingRow label="Billing cycle" description="Annual is cheaper per month. Moving from monthly to annual later is pro-rated." control={
                <select className="mcm-field" value={cycle} onChange={(e) => setCycle(e.target.value as BillingCycle)} aria-label="Billing cycle">
                  {cyclesFor(plan).map((c) => <option key={c} value={c}>{CYCLE_LABELS[c]}</option>)}
                </select>
              } />
              <SettingRow label="How many people?" description={seatCeiling(plan) !== Infinity ? `This plan holds up to ${seatCeiling(plan)} seats.` : 'No limit on this plan.'} control={
                <span className="gs-stepper">
                  <button type="button" className="mini" onClick={() => setSeatCount(seats - 1)} aria-label="Fewer seats">–</button>
                  <input className="mcm-field num" inputMode="numeric" value={seatText} onChange={(e) => setSeatText(e.target.value)} onBlur={() => setSeatCount(seatText)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setSeatCount(seatText); } }} aria-label="Seats" />
                  <button type="button" className="mini" onClick={() => setSeatCount(seats + 1)} aria-label="More seats">+</button>
                </span>
              } />
            </SettingCard>
            {seatNote ? <p className="gs-warn">{seatNote}</p> : null}
            <div className="gs-total"><span>Subtotal before tax</span><strong className="num">{money(subtotal(plan, seats, cycle))}</strong></div>
            <div className="gs-actions">
              <button type="button" className="btn ghost" onClick={() => setStep('account')}>Back</button>
              <button type="submit" className="btn primary" disabled={!plan}>Continue to payment <Ic n="arrow-in" size={14} /></button>
            </div>
          </form>
        )}

        {step === 'payment' && path === 'trial' && (
          <section className="gs-card gs-wide">
            <div className="gs-title-row">
              <h1>Add a card to start your trial</h1>
              <button type="button" className="btn ghost" onClick={() => setStep('team')}>Back</button>
            </div>
            <p className="gs-sub">Nothing is charged today. The card is kept on file so your plan carries on by itself when the trial ends; cancel from Billing before then and it is never charged.</p>
            <div className="gs-order">
              <div><span>{plan?.plan_name} · {trialNoun(plan).replace(/^Your /, '')} · 1 seat</span><span className="num">{money(0)} today</span></div>
              <div><span>From {trialEndsOn(plan)}: {plan?.plan_name} monthly</span><span className="num">{money(seatPricePerMonth(plan, 'MONTHLY'))} per user / month</span></div>
              <small>Tax and regulatory fees are added when the plan starts, worked out from the company address you gave. Seats added later are pro-rated.</small>
            </div>
            <label className="gs-agree">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>I agree to the <a href={TERMS_URL} target="_blank" rel="noreferrer">Terms of Service</a> and the <a href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy Policy</a>, and to the plan starting on {trialEndsOn(plan)} unless I cancel first.</span>
            </label>
            {!agreed ? <p className="gs-fine gs-left">Tick the agreement to enable Start my trial.</p> : null}
            <div className={`gs-stripe${agreed ? '' : ' locked'}`}>
              <PaymentScreen
                ref={paymentRef}
                onSuccessPayment={onCardReady}
                isSavedPaymentCard={true}
                onSuccess3dsPayment={() => setStep('creating')}
                onFailure3dsPayment={() => handleAlert({ text: 'The bank did not approve the card. Nothing was charged; try another card.', type: 'error' })}
                isApiLoad={creatingTrial || quoting}
                submitButtonText={`Start my free trial · ${money(0)} today`}
                enableSaveCard={false}
                showIsSaveCard={false}
              />
            </div>
            <p className="gs-fine">Card details go straight to the payment provider. We never see or store the number.</p>
          </section>
        )}

        {step === 'payment' && path !== 'trial' && (
          <section className="gs-card gs-wide">
            <div className="gs-title-row">
              <h1>Payment</h1>
              <button type="button" className="btn ghost" onClick={() => setStep('plan')}>Back to plan and seats</button>
            </div>
            <p className="gs-sub">Tax and fees are worked out from the company address you gave. One button charges the card, and it is the last one on this screen.</p>
            <div className="gs-order">
              <div><span>{plan?.plan_name} · {seats} seat{seats === 1 ? '' : 's'} · {CYCLE_LABELS[cycle]}</span><span className="num">{money(subtotal(plan, seats, cycle))}</span></div>
              {Number(tax?.discount_amount) > 0 ? <div><span>{CYCLE_LABELS[cycle]} saving</span><span className="num">−{money(tax.discount_amount)}</span></div> : null}
              <div><span>Tax and regulatory fees</span><span className="num">{quoting ? 'working out…' : tax ? money(tax?.tax_amount ?? Number(tax?.total_amount || 0) - subtotal(plan, seats, cycle)) : 'unavailable'}</span></div>
              <div className="gs-order-total"><span>Total charged today</span><span className="num">{money(tax?.total_amount ?? subtotal(plan, seats, cycle))}</span></div>
              <small>Renews on this cycle at the same price unless you change the plan. Seats added later are pro-rated. Annual plans are not refunded.</small>
            </div>
            <label className="gs-agree">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>I agree to the <a href={TERMS_URL} target="_blank" rel="noreferrer">Terms of Service</a>, the <a href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy Policy</a> and the no-refund rule on annual plans.</span>
            </label>
            {!agreed ? <p className="gs-fine gs-left">Tick the agreement to enable Place order.</p> : null}
            <div className={`gs-stripe${agreed ? '' : ' locked'}`}>
              <PaymentScreen
                ref={paymentRef}
                onSuccessPayment={onCardReady}
                isSavedPaymentCard={true}
                onSuccess3dsPayment={() => setStep('creating')}
                onFailure3dsPayment={() => handleAlert({ text: 'The bank did not approve the payment. Nothing was charged; try another card.', type: 'error' })}
                isApiLoad={creatingPaid}
                submitButtonText={`Place order · ${money(tax?.total_amount ?? subtotal(plan, seats, cycle))}`}
                enableSaveCard={false}
                showIsSaveCard={false}
              />
            </div>
            <p className="gs-fine">Card details go straight to the payment provider. We never see or store the number.</p>
          </section>
        )}

        {step === 'creating' && (
          <section className="gs-card gs-narrow">
            <h1>{provision === 'ready' ? 'Your workspace is ready' : provision === 'stuck' ? 'This is taking longer than it should' : 'Setting things up'}</h1>
            <p className="gs-sub">
              {provision === 'ready'
                ? 'Now pick the number your customers will call.'
                : provision === 'stuck'
                  ? 'Your account and sign-in exist. The company workspace has not finished building. Try again below; if it still does not finish, we will email you with the exact step that stopped.'
                  : 'Your account is created. Building the company workspace takes about half a minute.'}
            </p>
            <ul className="gs-progress">
              <li className="done"><Ic n="check" size={12} /> Account and sign-in created</li>
              <li className={provision === 'ready' ? 'done' : provision === 'stuck' ? 'stuck' : 'busy'}>{provision === 'ready' ? <Ic n="check" size={12} /> : null} Company workspace {provision === 'ready' ? 'created' : provision === 'stuck' ? 'not finished' : `building… (${Math.min(polls, PROVISION_MAX_POLLS) * 3}s)`}</li>
              <li className={status?.numbers ? 'done' : ''}>{status?.numbers ? <Ic n="check" size={12} /> : null} Main number {status?.numbers ? 'active' : 'next step'}</li>
            </ul>
            {pollError ? <p className="gs-fine" style={{ color: 'var(--crit)' }}>Last check: {pollError}</p> : null}
            <div className="gs-actions">
              {provision === 'stuck' ? <button type="button" className="btn ghost" disabled={retrying} onClick={() => retry()}>{retrying ? 'Trying…' : 'Try again'}</button> : null}
              <button type="button" className="btn primary" disabled={provision !== 'ready'} onClick={() => setStep('number')}>Choose my main number <Ic n="arrow-in" size={14} /></button>
            </div>
          </section>
        )}
        {step === 'number' && (
          <form className="gs-card gs-wide" onSubmit={(e) => { e.preventDefault(); if (pick && !buying) submitNumber(); }}>
            <h1>Choose your main number</h1>
            <p className="gs-sub">The number your customers call and see. It is yours as soon as you add it, and you can add more later under Numbers.</p>
            {planCountries.length ? <p className="gs-sub">{numberCountriesLine(countryOptions.map((c) => c.label))}</p> : null}

            {countriesLoading ? <p className="gs-sub">Loading countries…</p> : null}
            {!countriesLoading && !countryOptions.length ? (
              <p className="gs-fault">No country to buy a number in: the plan lists none{fallbackError ? ` and the country list could not be read (${errorText(fallbackError, 'request failed')})` : planInfoError ? ` and the plan could not be read (${errorText(planInfoError, 'request failed')})` : ''}.</p>
            ) : null}
            {countryOptions.length > 1 ? (
              <label className="gs-field"><span>Country</span>
                <select className="mcm-field" value={country} onChange={(e) => pickCountry(e.target.value)}>
                  {countryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
            ) : null}

            {country ? (
              <div className="gs-question">
                <div className="gs-q">Number type{countryOptions.length === 1 ? ` · ${countryOptions[0].label}` : ''}</div>
                {typesLoading ? <p className="gs-sub">Loading number types…</p> : null}
                {numberFault('Number types could not be read', typesError)}
                {!typesLoading && !typesError && !typeOptions.length ? <p className="gs-fault">No local or toll-free numbers are sold in this country.</p> : null}
                <div className="gs-picks">
                  {typeOptions.map((t) => (
                    <button type="button" key={t.value} className={`gs-pick${numberType?.value === t.value ? ' on' : ''}`} onClick={() => pickType(t)}>
                      {t.label}
                      {NUMBER_TYPE_HINT[t.label] ? <small>{NUMBER_TYPE_HINT[t.label]}</small> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {shelfEmpty && stage !== 'choose-type' ? (
              <div className="gs-grid2">
                <label className="gs-field"><span>State or region</span>
                  <select className="mcm-field" value={regionId} onChange={(e) => pickRegion(e.target.value)} disabled={regionsLoading}>
                    <option value="">{regionsLoading ? 'Loading…' : 'Choose'}</option>
                    {(regions as any[]).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  {numberFault('Regions could not be read', regionsError)}
                </label>
                <label className="gs-field"><span>Area code</span>
                  <select className="mcm-field" value={areaId} onChange={(e) => pickArea(e.target.value)} disabled={!regionId || areasLoading}>
                    <option value="">{!regionId ? 'Pick a region first' : areasLoading ? 'Loading…' : 'Choose'}</option>
                    {(areas as any[]).map((a) => <option key={a.id} value={a.id}>{a.npanxx}</option>)}
                  </select>
                  {numberFault('Area codes could not be read', areasError)}
                </label>
              </div>
            ) : null}
            {numberFault('Prefixes could not be read', groupsError)}

            {stage === 'choose-group' ? (
              <div className="gs-question">
                <div className="gs-q">Prefix</div>
                <div className="gs-picks">
                  {(groups as any[]).map((g) => (
                    <button type="button" key={g.id} className={`gs-pick${group?.id === g.id ? ' on' : ''}`} onClick={() => { setGroup(g); setPick(null); }}>
                      {g.area_name} ({g.prefix})
                      {g.needs_registration ? <small>Needs registration papers.</small> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {stage === 'loading' ? <p className="gs-sub">Looking for numbers…</p> : null}
            {numberFault('Numbers could not be read', numbersError)}
            {stage === 'choose-region' ? <p className="gs-sub">Nothing in stock for that type right now, so pick where the number should be from and we will ask the carrier.</p> : null}
            {stage === 'none' ? <p className="gs-fault">No numbers in that area code right now. Try another area code or region.</p> : null}
            {stage === 'stock' || stage === 'carrier' ? (
              <div className="gs-question">
                <div className="gs-q">
                  {stage === 'stock' ? 'Ready now, from our own stock' : 'Available from the carrier'}
                  <span className="gs-countdown num">List refreshes in {countdownLabel(left)}</span>
                </div>
                <div className="gs-numbers">
                  {numberRows.slice(0, 10).map((n) => (
                    <button type="button" key={`${n.id}-${n.number}`} className={`gs-number num${pick?.id === n.id ? ' on' : ''}`} onClick={() => { setPick(n); setBuyError(''); }}>
                      {prettyNumber(n.number)}
                      {n.area_name || n.region_name ? <small>{[n.area_name, n.region_name].filter(Boolean).join(', ')}</small> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {buyError ? <p className="gs-fault">{buyError}</p> : null}
            <div className="gs-actions">
              <button type="button" className="btn ghost" onClick={() => setStep('done')}>Do this later</button>
              <button type="submit" className="btn primary" disabled={!pick || buying}>
                {buying ? 'Adding…' : pick ? `Add ${prettyNumber(pick.number)} as my main number` : 'Pick a number'} <Ic n="arrow-in" size={14} />
              </button>
            </div>
            <p className="gs-fine">Adding the number switches your company on to the phone network. Nothing else is charged on this screen.</p>
          </form>
        )}

        {step === 'done' && (
          <section className="gs-card gs-narrow">
            <h1>{mainNumber ? 'You are on the phone network' : 'Your workspace is ready'}</h1>
            <p className="gs-sub">{mainNumber ? 'Your main number is live. Calls to it reach you as soon as you log in.' : 'Add your main number any time under Numbers; until then the workspace has no number to ring.'}</p>
            {mainNumber ? <div className="gs-main-number num">{prettyNumber(mainNumber) || mainNumber}</div> : null}
            <ul className="gs-progress">
              <li className="done"><Ic n="check" size={12} /> Account and sign-in created</li>
              <li className="done"><Ic n="check" size={12} /> Company workspace created</li>
              <li className={mainNumber ? 'done' : ''}>{mainNumber ? <Ic n="check" size={12} /> : null} Main number {mainNumber ? 'active' : 'not yet chosen'}</li>
            </ul>
            <p className="gs-sub">Your sign-in details were emailed to <strong>{form.email.trim()}</strong>. Use them to log in; you can change the password from your profile.</p>
            <div className="gs-actions">
              <button type="button" className="btn primary" onClick={leaveForLogin}>Log in <Ic n="arrow-in" size={14} /></button>
            </div>
          </section>
        )}
      </main>
      {plansPending ? <div className="gs-loading">Loading plans…</div> : null}
    </div>
  );
};

export default GetStarted;

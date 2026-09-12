import LogoIcon from '@/assets/images/LogoIcon.svg';
import { useNavigate } from 'react-router-dom';
import PricingDropDown from './dropdown';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGetPlans } from '@/hooks/common';
import PlanCards from './plan-cards';
import {
  money,
  popularUuid,
  priceView,
  signupBase,
  TALK_TO_SALES_PATH,
  trialDays,
  type Cycle,
  type PricingPlan,
} from '@/lib/pricing-cards';

/* Which sign-up the plan buttons open. The new get-started flow is the
   default since 11 Sep 2026; the older /sign-up stays as a backup and can be
   forced per browser with localStorage.signup_v2 = 'off' ('on' forces new). */
const SIGNUP_V2_DEFAULT = true;
const signupPath = (): string => {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('signup_v2');
  } catch {
    stored = null;
  }
  return signupBase(stored, SIGNUP_V2_DEFAULT);
};
import { Check, InfoIcon } from '@/assets/icons';
import { getEnv } from '@/lib/utils';
import { useOrganization } from '@/hooks/use-organisation';
import { PLANS } from '@/lib/plan-catalogue';

export type PricingDropdownKey = 'virtual_phone' | 'international_calling' | 'sms' | 'learn';

/* The plans shown here come from the billing catalogue, so a price on this page
   cannot disagree with the price a customer is actually charged. This page used
   to carry three hardcoded plan names with one identical price caption repeated
   under every one of them, matching nothing we sell.

   Only paid plans get a column - a free plan has no per-seat price to compare
   and belongs in its own section rather than in a price grid. */
const PAID_PLANS = PLANS.filter((plan) => plan.monthlyPerSeat > 0);

/* A year is quoted individually, so there is no annual figure to print. Saying
   that plainly beats printing a number nobody honours. */
const planPriceLine = (plan?: (typeof PAID_PLANS)[number]): string => {
  if (!plan) return '';
  const monthly = `$${plan.monthlyPerSeat} per user, per month`;
  return plan.yearlyPerSeat === null
    ? `${monthly} · annual billing quoted on request`
    : `${monthly} · $${plan.yearlyPerSeat} per user, per year`;
};

const Pricing = () => {
  const navigate = useNavigate();
  const { mainSiteInfo } = useOrganization();
  const [dropDown, setDropDown] = useState({
    virtual_phone: false,
    international_calling: false,
    sms: false,
    learn: false,
  });
  const [cycle, setCycle] = useState<Cycle>('MONTHLY');
  const [menuOpen, setMenuOpen] = useState(false);
  const compareRef = useRef<HTMLDivElement>(null);
  const { data: planData, isLoading } = useGetPlans();
  const trialPlan = ((planData as PricingPlan[] | undefined) || []).find((p) => trialDays(p) > 0) || null;
  const livePlans = (planData as PricingPlan[] | undefined) || [];
  const popular = popularUuid(livePlans);
  const isPopularName = (name?: string): boolean =>
    !!name && livePlans.some((p) => p.uuid === popular && p.plan_name === name);
  /* The compare table's column heads read the live record, like the cards; the
     hand-written catalogue line is only the fallback while the list loads. */
  const comparePriceLine = (plan?: (typeof PAID_PLANS)[number]): string => {
    if (!plan) return '';
    const live = livePlans.find((p) => p.plan_name === plan.name);
    if (!live) return planPriceLine(plan);
    const monthly = priceView(live, 'MONTHLY');
    const yearly = priceView(live, 'YEARLY');
    if (monthly.kind === 'quote') return 'Priced on a quote';
    if (monthly.kind === 'free') return 'No monthly fee';
    const year = yearly.kind === 'priced' && yearly.perYear ? ` · ${money(yearly.perYear)} per user, per year` : '';
    return `${money(monthly.perMonth)} per user, per month${year}`;
  };

  const toggleDropdown = (key: PricingDropdownKey) => {
    setDropDown((prevState) => ({
      ...prevState,
      virtual_phone: key === 'virtual_phone' ? !prevState.virtual_phone : false,
      international_calling:
        key === 'international_calling' ? !prevState.international_calling : false,
      sms: key === 'sms' ? !prevState.sms : false,
      learn: key === 'learn' ? !prevState.learn : false,
    }));
  };

  return (
    <>
      <div className="w-full bg-white h-full">
        {/* header */}
        <div className="mx-auto w-full px-8">
          <header className="bg-white py-8">
            <nav className="flex items-center justify-between flex-row gap-6" aria-label="Global">
              {/* logo */}
              <div className="flex flex-1">
                <a className="h-8 cursor-pointer" onClick={() => navigate('/')}>
                  <img
                    src={
                      mainSiteInfo?.small_logo
                        ? `${getEnv().VITE_API_BASE_URL}/${mainSiteInfo?.small_logo}`
                        : LogoIcon
                    }
                    alt="Logo"
                    className="h-full"
                  />
                </a>
              </div>
              {/* logo */}

              {/* mobile toggle button */}
              <div className="flex md:hidden">
                <button
                  type="button"
                  className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 "
                  aria-expanded={menuOpen}
                  aria-controls="pricing-mobile-menu"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <span className="sr-only">Open main menu</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                    data-slot="icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    />
                  </svg>
                </button>
              </div>
              {/* mobile toggle button */}

              {/* menus */}
              <div className="hidden md:flex md:gap-8">
                <div className="relative">
                  <button
                    type="button"
                    className="cursor-pointer flex items-center gap-x-1 text-sm font-semibold leading-6  hover:text-primary focus:text-primary"
                    aria-expanded="true"
                    onClick={() => toggleDropdown('virtual_phone')}
                  >
                    Virtual Phone Numbers
                    <svg
                      className="h-5 w-5 flex-none text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                      data-slot="icon"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <PricingDropDown isDropDownOpen={dropDown.virtual_phone} />
                </div>
                <div className="relative">
                  <button
                    type="button"
                    className="cursor-pointer flex items-center gap-x-1 text-sm font-semibold leading-6  hover:text-primary focus:text-primary"
                    aria-expanded="true"
                    onClick={() => toggleDropdown('international_calling')}
                  >
                    International Calling
                    <svg
                      className="h-5 w-5 flex-none text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                      data-slot="icon"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <PricingDropDown isDropDownOpen={dropDown.international_calling} />
                </div>
                <div className="relative">
                  <button
                    type="button"
                    className="cursor-pointer flex items-center gap-x-1 text-sm font-semibold leading-6  hover:text-primary focus:text-primary"
                    aria-expanded="true"
                    onClick={() => toggleDropdown('sms')}
                  >
                    SMS
                    <svg
                      className="h-5 w-5 flex-none text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                      data-slot="icon"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <PricingDropDown isDropDownOpen={dropDown.sms} />
                </div>
                <div className="cursor-pointer text-sm font-semibold leading-6  hover:text-primary focus:text-primary">
                  International Top-Up
                </div>
                <div className="relative">
                  <button
                    type="button"
                    className="cursor-pointer flex items-center gap-x-1 text-sm font-semibold leading-6  hover:text-primary focus:text-primary"
                    aria-expanded="true"
                    onClick={() => toggleDropdown('learn')}
                  >
                    Learn
                    <svg
                      className="h-5 w-5 flex-none text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                      data-slot="icon"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <PricingDropDown isDropDownOpen={dropDown.learn} />
                </div>
              </div>
              {/* menus */}

              {/* actions */}
              <div className="hidden md:flex md:items-center md:gap-3">
                <Button variant={'outline'} onClick={() => navigate('/')}>
                  Login
                </Button>
                {trialPlan && (
                  <Button
                    className="bg-primary text-white hover:bg-primary/90"
                    onClick={() =>
                      navigate(`${signupPath()}?planId=${encodeURIComponent(trialPlan.uuid)}&isTrial=true`)
                    }
                  >
                    Try free for {trialDays(trialPlan)} days
                  </Button>
                )}
              </div>
              {/* actions */}
            </nav>
            {menuOpen && (
              <div id="pricing-mobile-menu" className="md:hidden border-t border-gray-100 px-4 py-4 flex flex-col gap-3">
                <button type="button" className="text-left text-sm font-semibold py-2" onClick={() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Plans</button>
                <button type="button" className="text-left text-sm font-semibold py-2" onClick={() => { setMenuOpen(false); compareRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Compare features</button>
                <button type="button" className="text-left text-sm font-semibold py-2" onClick={() => navigate(TALK_TO_SALES_PATH)}>Talk to sales</button>
                <Button variant={'outline'} className="w-full" onClick={() => navigate('/')}>Login</Button>
                {trialPlan && (
                  <Button className="w-full bg-primary text-white hover:bg-primary/90" onClick={() => navigate(`${signupPath()}?planId=${encodeURIComponent(trialPlan.uuid)}&isTrial=true`)}>
                    Try free for {trialDays(trialPlan)} days
                  </Button>
                )}
              </div>
            )}
          </header>
        </div>
        {/* header */}

        {/* content */}
        <div className="relative overflow-auto h-full">
          {/* background */}
          <div className="bg-ucass-primary-100">
            <div className="mx-auto w-full px-8">
              <div className="flex justify-center p-8 min-h-80"></div>
            </div>
          </div>
          {/* background */}

          {/* pricing */}
          <div className="absolute top-4 left-0 w-full">
            <div className="mx-auto w-full px-4 md:px-8 pt-4 gap-5 flex flex-col">
              <PlanCards
                plans={planData}
                isLoading={isLoading}
                cycle={cycle}
                onCycle={setCycle}
                signupBase={signupPath()}
                onCompare={() => compareRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
              <div className="h-8" />
              <div ref={compareRef} className="flex flex-col items-center gap-6 scroll-mt-6">
                <h1 className="text-2xl md:text-3xl text-gray-900 font-semibold text-center">Compare plan features</h1>
                <div className="w-full overflow-x-auto">
                <div className="flex w-full min-w-[960px]">
                  <div className="flex flex-col w-[30%] justify-center gap-5 sticky left-0 z-10 bg-white">
                    <div className="flex flex-col py-3">
                      <div className="flex flex-col w-full min-h-20 justify-center">
                        <div className="flex items-center gap-3">
                          <h4 className="flex items-center text-xl">Have a question?</h4>
                        </div>
                        <button
                          type="button"
                          className="font-semibold flex items-center text-xl text-primary underline underline-offset-4 w-fit"
                          onClick={() => navigate(TALK_TO_SALES_PATH)}
                        >
                          Talk to sales
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-6 pt-3">
                      <h4 className="text-primary font-semibold flex items-center">
                        Cloud phone system
                      </h4>
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Business phone numbers</p>
                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Toll-free number and minutes</p>
                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            Domestic calling in US/Canada
                            <span className="text-primary">*</span>
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            Enhanced Business SMS
                            <span className="text-primary">*</span>
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            Visual voicemail – voicemail transcriptions, voicemail to email
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Multi-level auto attendant and IVR</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Shared lines</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            High-definition (HD) voice; AI-noise cancellation
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">End-to-end encryption for calls (beta)</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Emergency calling (E911)</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Desk phone & conference phone rentals</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Incoming caller ID</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Call queues</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Call recording</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Up to 8-digit extensions with site codes</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            Receptionist and admin console (heads-up display)
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            Advanced call monitoring including whisper, barge, and monitor
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Hot desking</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Push-to-talk / walkie talkie</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-6 pt-3">
                      <h4 className="text-primary font-semibold flex items-center">
                        Cloud phone system
                      </h4>
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Business phone numbers</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Toll-free number and minutes</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            Domestic calling in US/Canada
                            <span className="text-primary">*</span>
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            Enhanced Business SMS
                            <span className="text-primary">*</span>
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            Visual voicemail – voicemail transcriptions, voicemail to email
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Multi-level auto attendant and IVR</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Shared lines</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            High-definition (HD) voice; AI-noise cancellation
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">End-to-end encryption for calls (beta)</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Emergency calling (E911)</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Desk phone & conference phone rentals</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Incoming caller ID</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Call queues</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Call recording</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Up to 8-digit extensions with site codes</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            Receptionist and admin console (heads-up display)
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">
                            Advanced call monitoring including whisper, barge, and monitor
                          </p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Hot desking</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p className="truncate">Push-to-talk / walkie talkie</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col w-[23.3%] px-2 gap-5">
                    <div className="p-3 rounded-xl border border-gray-200 bg-gray-100">
                      <div className="flex flex-col items-center justify-center gap-1 w-full min-h-20">
                        <div className="flex items-center gap-3">
                          <h2 className="text-primary font-semibold flex items-center leading-none text-2xl">
                            {PAID_PLANS[0]?.name ?? ''}
                          </h2>
                          {isPopularName(PAID_PLANS[0]?.name) && (
                            <span className="inline-flex items-center rounded-md bg-ucass-green px-2 py-1 text-xs font-medium  uppercase tracking-widest">
                              Popular
                            </span>
                          )}
                        </div>
                        <small className="text-gray-800 font-normal">
                          {comparePriceLine(PAID_PLANS[0])}
                        </small>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-6 pt-3">
                      <h3 className="text-primary font-semibold flex items-center">&nbsp;</h3>
                      <div className="flex flex-col items-center gap-6">
                        <div className="min-h-7 flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">100</p>
                        <p className="min-h-7 text-sm flex items-center">Unlimited</p>
                        <p className="min-h-7 text-sm flex items-center">25/user/mo</p>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>Basic</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>On-demand</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <p className="min-h-7 text-sm flex items-center">&nbsp;</p>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">&nbsp;</p>
                        <p className="min-h-7 text-sm flex items-center">&nbsp;</p>
                        <p className="min-h-7 text-sm flex items-center">Add-on option</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-6 pt-3">
                      <h3 className="text-primary font-semibold flex items-center">&nbsp;</h3>
                      <div className="flex flex-col items-center gap-6">
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">100</p>
                        <p className="min-h-7 text-sm flex items-center">Unlimited</p>
                        <p className="min-h-7 text-sm flex items-center">25/user/mo</p>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>Basic</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>On-demand</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <p className="min-h-7 text-sm flex items-center">&nbsp;</p>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">&nbsp;</p>
                        <p className="min-h-7 text-sm flex items-center">&nbsp;</p>
                        <p className="min-h-7 text-sm flex items-center">Add-on option</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col w-[23.3%] px-2 gap-5">
                    <div className="p-3 rounded-xl border border-gray-200 bg-gray-100">
                      <div className="flex flex-col items-center justify-center gap-1 w-full min-h-20">
                        <div className="flex items-center gap-3">
                          <h2 className="text-primary font-semibold flex items-center leading-none text-2xl">
                            {PAID_PLANS[1]?.name ?? ''}
                          </h2>
                          {isPopularName(PAID_PLANS[1]?.name) && (
                            <span className="inline-flex items-center rounded-md bg-ucass-green px-2 py-1 text-xs font-medium  uppercase tracking-widest">
                              Popular
                            </span>
                          )}
                        </div>
                        <small className="text-gray-800 font-normal">
                          {comparePriceLine(PAID_PLANS[1])}
                        </small>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-6 pt-3">
                      <h3 className="text-primary font-semibold flex items-center">&nbsp;</h3>
                      <div className="flex flex-col items-center gap-6">
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">1000</p>
                        <p className="min-h-7 text-sm flex items-center">Unlimited</p>
                        <p className="min-h-7 text-sm flex items-center">100/user/mo</p>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>Advanced rules and routing</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>Automatic / on‑demand</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">Add-on option</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-6 pt-3">
                      <h3 className="text-primary font-semibold flex items-center">&nbsp;</h3>
                      <div className="flex flex-col items-center gap-6">
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">1000</p>
                        <p className="min-h-7 text-sm flex items-center">Unlimited</p>
                        <p className="min-h-7 text-sm flex items-center">100/user/mo</p>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>Advanced rules and routing</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>Automatic / on‑demand</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">Add-on option</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col w-[23.3%] px-2 gap-5">
                    <div className="p-3 rounded-xl border border-gray-200 bg-gray-100">
                      <div className="flex flex-col items-center justify-center gap-1 w-full min-h-20">
                        <div className="flex items-center gap-3">
                          <h2 className="text-primary font-semibold flex items-center leading-none text-2xl">
                            {PAID_PLANS[2]?.name ?? ''}
                          </h2>
                          {isPopularName(PAID_PLANS[2]?.name) && (
                            <span className="inline-flex items-center rounded-md bg-ucass-green px-2 py-1 text-xs font-medium  uppercase tracking-widest">
                              Popular
                            </span>
                          )}
                        </div>
                        <small className="text-gray-800 font-normal">
                          {comparePriceLine(PAID_PLANS[2])}
                        </small>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-6 pt-3">
                      <h3 className="text-primary font-semibold flex items-center">&nbsp;</h3>
                      <div className="flex flex-col items-center gap-6">
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">10,000</p>
                        <p className="min-h-7 text-sm flex items-center">Unlimited</p>
                        <p className="min-h-7 text-sm flex items-center">200/user/mo</p>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>Advanced rules and routing</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>Automatic / on‑demand</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">Add-on option</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-6 pt-3">
                      <h3 className="text-primary font-semibold flex items-center">&nbsp;</h3>
                      <div className="flex flex-col items-center gap-6">
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">10,000</p>
                        <p className="min-h-7 text-sm flex items-center">Unlimited</p>
                        <p className="min-h-7 text-sm flex items-center">200/user/mo</p>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>Advanced rules and routing</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 min-h-7 text-sm">
                          <p>Automatic / on‑demand</p>

                          <InfoIcon className="w-3 h-3" />
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <div className="min-h-7 text-sm flex items-center">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary/50 rounded-full p-1.5">
                            <Check className="w-100 h-100 " />
                          </div>
                        </div>
                        <p className="min-h-7 text-sm flex items-center">Add-on option</p>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pricing;

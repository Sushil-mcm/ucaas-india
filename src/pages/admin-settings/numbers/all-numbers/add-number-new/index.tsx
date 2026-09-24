import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import Loader from '@/components/custom/loader';
import { SearchLine } from '@/assets/icons';
import { listIndiaInventory, claimIndiaInventoryNumber } from '@/services/api';
import { toast } from 'react-toastify';

/* ucaas.in has no DIDWW numbers - India isn't a country DIDWW sells at all,
   which is why the old multi-step wizard (country -> region -> DIDWW group
   -> DIDWW quantity reservation -> DIDWW order) could never actually
   complete here; a handful of numbers were hand-seeded onto one company as
   a workaround instead of going through any real purchase flow. This
   replaces that wizard for ucaas.in specifically: numbers MCM already
   bought in bulk from the Tata trunk sit unassigned (company_uuid = NULL)
   in the same did_numbers table, and this just lists and claims from that
   pool - no external carrier call, ever. Added 11 Sep 2026, at the user's
   explicit request not to show or depend on DIDWW here.

   Laid out as pick-then-check-out, the two steps the reference console
   uses, so the cost is agreed on a page of its own rather than in the
   corner of the list. Both steps read the one inventory call above; the
   claim still sends a single number and nothing else. */

type InventoryRow = {
  uuid: string;
  did_number: string;
  did_name?: string;
  did_city?: string;
  did_state?: string;
  monthly_cost: number;
  setup_cost: number;
};

const STEPS = [
  { key: 1, label: 'Select number' },
  { key: 2, label: 'Checkout' },
];

const money = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const placeOf = (row?: InventoryRow | null) =>
  [row?.did_city, row?.did_state].filter(Boolean).join(', ') || 'India';

const AddNumber = ({ handleClose }: any) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<InventoryRow | null>(null);
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['india-number-inventory'],
    queryFn: () => listIndiaInventory({ limit: 100, page: 1 }),
    /* apiClient's interceptor returns the full axios response (unlike other
       repos in this project that unwrap to response.data), so the real
       envelope sits one level deeper: response.data.data.result.rows. This
       originally read .data.data.rows - missing .result entirely - so it
       never found real data and always fell back to the empty-inventory
       message, even though the API was correctly returning rows (confirmed
       via nginx access log: 200, 1679 bytes). Fixed 11 Sep 2026. */
    select: (response: any) =>
      response?.data?.data?.result?.rows ?? response?.data?.result?.rows ?? [],
  });

  const rows: InventoryRow[] = useMemo(() => data || [], [data]);

  /* Filtered here, over the page of inventory already fetched - no second
     request, and no change to what the server is asked for. */
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.did_number, row.did_city, row.did_state, row.did_name]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    );
  }, [rows, query]);

  const { mutate: claimNumber, isPending } = useMutation({
    mutationFn: () => claimIndiaInventoryNumber({ did_number: selected!.did_number }),
    onSuccess: () => {
      toast.success(`${selected?.did_number} added to your account.`);
      queryClient.invalidateQueries();
      handleClose();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Could not add that number. It may have just been taken - refresh and try another.';
      toast.error(message);
      queryClient.invalidateQueries({ queryKey: ['india-number-inventory'] });
      setSelected(null);
      setStep(1);
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The two steps, with the line between them filling in as you pass
          it - so the dialog says how far along you are before you read a
          word of it. */}
      <ol className="flex items-center gap-3 border-b border-[#EEE7DD] px-5 py-4">
        {STEPS.map((item, index) => {
          const done = step > item.key;
          const on = step === item.key;
          return (
            <li key={item.key} className="flex flex-1 items-center gap-3 last:flex-none">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  on
                    ? 'border-primary bg-primary text-white'
                    : done
                      ? 'border-[#FFD9AD] bg-[#FFF1E0] text-[#C96F1F]'
                      : 'border-[#EEE7DD] bg-white text-[#9A948F]'
                }`}
              >
                {done ? '✓' : item.key}
              </span>
              <span
                className={`shrink-0 text-sm font-semibold ${
                  on ? 'text-[#C96F1F]' : 'text-[#9A948F]'
                }`}
              >
                {item.label}
              </span>
              {index === 0 && (
                <span
                  className={`h-px min-w-6 flex-1 ${step > 1 ? 'bg-primary' : 'bg-[#EEE7DD]'}`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#2E2D35]">Choose your number</h3>
              <p className="mt-0.5 text-sm text-[#9A948F]">
                The number your customers call and see. It is yours as soon as you add it.
              </p>
            </div>
            <label className="relative w-full min-w-0 sm:w-64">
              <SearchLine className="pointer-events-none absolute left-3 top-1/2 z-[2] h-4 w-4 -translate-y-1/2 text-[#9A948F]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search number, city or state"
                className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm text-[#2E2D35] outline-none placeholder:text-[#9A948F] focus:border-primary"
              />
            </label>
          </div>

          <div className="px-5 pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#9A948F]">
              Number type
            </p>
            <p className="mt-1 text-sm text-[#2E2D35]">
              <span className="font-semibold">Local</span>
              <span className="text-[#9A948F]"> · Voice calls · SMS · Fax</span>
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#9A948F]">
              Ready now, from our own stock
              {!isLoading && !isError ? (
                <span className="ml-2 font-medium normal-case tracking-normal text-[#6B645E]">
                  {visible.length} available
                </span>
              ) : null}
            </p>

            {isLoading && (
              <div className="flex justify-center py-10">
                <Loader />
              </div>
            )}

            {isError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Could not load the number inventory. Please try again.
              </p>
            )}

            {!isLoading && !isError && rows.length === 0 && (
              <div className="rounded-xl border border-[#EEE7DD] bg-[#FBFAF8] px-4 py-8 text-center">
                <p className="text-sm font-semibold text-[#2E2D35]">No numbers in stock</p>
                <p className="mt-1 text-sm text-[#9A948F]">
                  None are provisioned for this account right now. Contact support to have more
                  added.
                </p>
              </div>
            )}

            {!isLoading && !isError && rows.length > 0 && visible.length === 0 && (
              <p className="py-8 text-center text-sm text-[#9A948F]">No number matches “{query}”.</p>
            )}

            {!isLoading && visible.length > 0 && (
              /* A grid of cards rather than a list of rows: every number
                 carries the same four facts, so they compare side by side. */
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {visible.map((row) => {
                  const on = selected?.uuid === row.uuid;
                  return (
                    <button
                      key={row.uuid}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelected(row)}
                      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                        on
                          ? 'border-primary bg-[#FFF6EC]'
                          : 'border-[#EEE7DD] bg-white hover:border-[#FFD9AD]'
                      }`}
                    >
                      <span className="font-mono text-sm font-semibold text-[#2E2D35]">
                        {row.did_number}
                      </span>
                      <span className="truncate text-xs text-[#9A948F]">{placeOf(row)}</span>
                      <span className="mt-1 text-xs font-semibold text-[#2E2D35]">
                        {money(row.monthly_cost)}
                        <span className="font-medium text-[#9A948F]">/mo</span>
                        {Number(row.setup_cost || 0) > 0 ? (
                          <span className="font-medium text-[#9A948F]">
                            {' '}
                            · {money(row.setup_cost)} once
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <h3 className="text-base font-semibold text-[#2E2D35]">Checkout</h3>
          <p className="mt-0.5 text-sm text-[#9A948F]">
            What you are adding, and what it costs. Nothing is charged until you confirm.
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-[#EEE7DD]">
            <div className="flex items-center justify-between gap-3 bg-[#FBFAF8] px-4 py-3">
              <div className="min-w-0">
                <div className="font-mono text-sm font-semibold text-[#2E2D35]">
                  {selected?.did_number}
                </div>
                <div className="mt-0.5 text-xs text-[#9A948F]">{placeOf(selected)} · Local</div>
              </div>
              <button
                type="button"
                className="mcm-numlink shrink-0"
                onClick={() => setStep(1)}
                disabled={isPending}
              >
                Change
              </button>
            </div>
            <dl className="divide-y divide-[#F0E4D3]">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-sm text-[#6B645E]">Monthly</dt>
                <dd className="text-sm font-semibold text-[#2E2D35]">
                  {money(selected?.monthly_cost)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-sm text-[#6B645E]">One-off setup</dt>
                <dd className="text-sm font-semibold text-[#2E2D35]">
                  {Number(selected?.setup_cost || 0) > 0 ? money(selected?.setup_cost) : 'None'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 bg-[#FFF6EC] px-4 py-3">
                <dt className="text-sm font-semibold text-[#2E2D35]">Due today</dt>
                <dd className="text-sm font-bold text-[#C96F1F]">
                  {money(Number(selected?.setup_cost || 0) + Number(selected?.monthly_cost || 0))}
                </dd>
              </div>
            </dl>
          </div>

          <p className="mt-3 text-xs text-[#9A948F]">
            Adding a number to an existing plan charges for the number only, not a new
            subscription. Give it a label and point it somewhere from the numbers list once it is
            yours.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEE7DD] px-5 py-3">
        <p className="text-sm text-[#6B645E]">
          {step === 1 ? (
            selected ? (
              <>
                <span className="font-mono font-semibold text-[#2E2D35]">
                  {selected.did_number}
                </span>
                {' selected'}
              </>
            ) : (
              'Pick a number to continue.'
            )
          ) : (
            'Step 2 of 2'
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => (step === 1 ? handleClose() : setStep(1))}
            disabled={isPending}
          >
            {step === 1 ? 'Close' : 'Back'}
          </Button>
          {step === 1 ? (
            <Button variant="primary" type="button" disabled={!selected} onClick={() => setStep(2)}>
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              type="button"
              disabled={!selected || isPending}
              onClick={() => claimNumber()}
            >
              {isPending ? <Loader variant="white" /> : 'Add this number'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddNumber;

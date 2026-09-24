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
   explicit request not to show or depend on DIDWW here. */

type InventoryRow = {
  uuid: string;
  did_number: string;
  did_name?: string;
  did_city?: string;
  did_state?: string;
  monthly_cost: number;
  setup_cost: number;
};

const AddNumber = ({ handleClose }: any) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<InventoryRow | null>(null);

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

  /* Filtering happens here, over the page of inventory already fetched -
     no second request, and no change to what the server is asked for. */
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.did_number, row.did_city, row.did_state, row.did_name]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    );
  }, [rows, query]);

  const money = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

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
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Search sits above the list and below the dialog's own title, so the
          title says what this is once and the controls stay with what they
          control. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#EEE7DD] px-5 py-3">
        <label className="relative min-w-0 flex-1">
          <SearchLine className="pointer-events-none absolute left-3 top-1/2 z-[2] h-4 w-4 -translate-y-1/2 text-[#9A948F]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by number, city or state"
            className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm text-[#2E2D35] outline-none placeholder:text-[#9A948F] focus:border-primary"
          />
        </label>
        <span className="shrink-0 rounded-full bg-[#F4F5F7] px-3 py-1 text-xs font-semibold text-[#6B645E]">
          {visible.length} available
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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
            <p className="text-sm font-semibold text-[#2E2D35]">No numbers in inventory</p>
            <p className="mt-1 text-sm text-[#9A948F]">
              None are provisioned for this account right now. Contact support to have more added.
            </p>
          </div>
        )}

        {!isLoading && !isError && rows.length > 0 && visible.length === 0 && (
          <p className="py-8 text-center text-sm text-[#9A948F]">
            No number matches “{query}”.
          </p>
        )}

        {!isLoading && visible.length > 0 && (
          /* One card per number, each carrying everything the inventory
             knows about it - where it is, what it costs to keep and what it
             costs once. The setup fee was fetched and never shown, so the
             price on screen was not the price being agreed to. */
          <div className="flex flex-col gap-2">
            {visible.map((row) => {
              const isOn = selected?.uuid === row.uuid;
              return (
                <label
                  key={row.uuid}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                    isOn
                      ? 'border-primary bg-[#FFF6EC]'
                      : 'border-[#EEE7DD] bg-white hover:border-[#FFD9AD]'
                  }`}
                >
                  <input
                    type="radio"
                    name="india-inventory-number"
                    className="accent-primary"
                    checked={isOn}
                    onChange={() => setSelected(row)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm font-semibold text-[#2E2D35]">
                      {row.did_number}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-[#9A948F]">
                      {[row.did_city, row.did_state].filter(Boolean).join(', ') || 'India'}
                      {row.did_name ? ` · ${row.did_name}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-[#2E2D35]">
                      {money(row.monthly_cost)}
                      <span className="text-xs font-medium text-[#9A948F]">/mo</span>
                    </div>
                    <div className="text-xs text-[#9A948F]">
                      {Number(row.setup_cost || 0) > 0
                        ? `${money(row.setup_cost)} one-off`
                        : 'No setup fee'}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* What is about to happen, spelled out beside the button that does
          it, rather than left for the invoice to explain. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEE7DD] px-5 py-3">
        <p className="text-sm text-[#6B645E]">
          {selected ? (
            <>
              <span className="font-mono font-semibold text-[#2E2D35]">{selected.did_number}</span>
              {' · '}
              {money(selected.monthly_cost)}/mo
              {Number(selected.setup_cost || 0) > 0
                ? ` plus ${money(selected.setup_cost)} once`
                : ''}
            </>
          ) : (
            'Pick a number to continue.'
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" type="button" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            disabled={!selected || isPending}
            onClick={() => claimNumber()}
          >
            {isPending ? <Loader variant="white" /> : 'Add this number'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddNumber;

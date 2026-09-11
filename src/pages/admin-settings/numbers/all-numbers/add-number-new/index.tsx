import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import Loader from '@/components/custom/loader';
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
    select: (response: any) => response?.data?.data?.rows || response?.data?.rows || [],
  });

  const rows: InventoryRow[] = useMemo(() => data || [], [data]);

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
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-gray-900">Available India numbers</h3>
        <p className="text-sm text-gray-500">
          Numbers already provisioned for ucaas.in. Pick one to add it to your account.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600">
          Could not load the number inventory. Please try again.
        </p>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <p className="text-sm text-gray-500 py-6 text-center">
          No India numbers are available in inventory right now. Contact support to have more
          numbers provisioned.
        </p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto border rounded-lg divide-y">
          {rows.map((row) => (
            <label
              key={row.uuid}
              className={`flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
                selected?.uuid === row.uuid ? 'bg-primary/5' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="india-inventory-number"
                  className="accent-primary"
                  checked={selected?.uuid === row.uuid}
                  onChange={() => setSelected(row)}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{row.did_number}</span>
                  {(row.did_city || row.did_state) && (
                    <span className="text-xs text-gray-500">
                      {[row.did_city, row.did_state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-700">
                ₹{Number(row.monthly_cost || 0).toLocaleString('en-IN')}/mo
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
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
  );
};

export default AddNumber;

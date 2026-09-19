import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleAlert } from '@/lib/utils';
import { invalidateNumberLists } from '@/lib/number-list-cache';
import { pendingReleaseList, undoRelease } from '@/services/api';

/* Numbers in their 30-day cooling-off.
 *
 * Release no longer hands a number straight back to the carrier: it is taken
 * out of service at once and kept for 30 days, and this panel is where it can
 * be brought back. After the 30 days the nightly job gives it to the carrier.
 * On a server without this endpoint the request 404s and the panel shows
 * nothing, so the tab reads exactly as it did before. */

interface PendingRow {
  uuid: string;
  did_number: string;
  did_name?: string | null;
  released_at: string;
  release_on: string;
  days_left: number;
}

const unwrap = (res: any) => res?.data?.data?.result ?? res?.data?.result ?? res?.data ?? {};

const PendingReleasePanel = ({ canUndo }: { canUndo: boolean }) => {
  const queryClient = useQueryClient();
  const { data, isError } = useQuery({
    queryKey: ['pendingReleaseNumbers'],
    queryFn: pendingReleaseList,
    select: (res: any) => unwrap(res) as { rows?: PendingRow[]; cooling_off_days?: number },
    retry: false,
  });
  const rows = data?.rows || [];
  const days = data?.cooling_off_days || 30;

  const { mutate, isPending, variables } = useMutation({
    mutationFn: (uuid: string) => undoRelease(uuid),
    onSuccess: (res: any) => {
      handleAlert({ text: res?.data?.data?.message || res?.data?.message || 'The number is back on the account.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['pendingReleaseNumbers'] });
      invalidateNumberLists(queryClient);
    },
    onError: (error: any) =>
      handleAlert({ text: error?.response?.data?.message || 'Could not bring the number back.', type: 'error' }),
  });

  if (isError || !rows.length) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-sm font-semibold text-gray-900">Leaving the account soon</p>
      <p className="mb-2 text-xs text-gray-600">
        Released numbers are kept for {days} days before they go back to the carrier. Until then they
        can be brought back; they return unassigned, with no forwarding.
      </p>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="py-1 pr-3 font-medium">Number</th>
            <th className="py-1 pr-3 font-medium">Label</th>
            <th className="py-1 pr-3 font-medium">Goes back on</th>
            <th className="py-1 pr-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.uuid} className="border-t border-amber-100">
              <td className="py-1.5 pr-3 font-mono">{row.did_number}</td>
              <td className="py-1.5 pr-3">{row.did_name || <span className="text-gray-500">—</span>}</td>
              <td className="py-1.5 pr-3">
                {new Date(row.release_on).toLocaleDateString()}{' '}
                <span className="text-xs text-gray-500">
                  ({row.days_left} {row.days_left === 1 ? 'day' : 'days'} left)
                </span>
              </td>
              <td className="py-1.5 text-right">
                {canUndo ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending && variables === row.uuid}
                    onClick={() => mutate(row.uuid)}
                  >
                    <Undo2 className="mr-1 h-3.5 w-3.5" />
                    {isPending && variables === row.uuid ? 'Bringing back…' : 'Bring back'}
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PendingReleasePanel;

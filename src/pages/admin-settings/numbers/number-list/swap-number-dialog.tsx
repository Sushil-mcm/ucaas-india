import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { handleAlert } from '@/lib/utils';
import { invalidateNumberLists } from '@/lib/number-list-cache';
import { allNumbersList, assignDIDNumber, removeAssignNumber } from '@/services/api';

/* Swap a person's number for a spare one.
 *
 * Two existing calls, in the order that cannot leave the person with nothing:
 * the spare number is assigned first (the server refuses if they are at the
 * 30-number cap, and then nothing has changed), and only then is the old one
 * taken off them. The old number goes to Numbers › Unused; it is not released. */

interface SwapNumberDialogProps {
  open: boolean;
  number: { uuid?: string; did_number?: string; User?: { uuid?: string; first_name?: string; last_name?: string } } | null;
  onClose: () => void;
}

const SwapNumberDialog = ({ open, number, onClose }: SwapNumberDialogProps) => {
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<string>('');
  const person = number?.User;
  const personName = [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'this person';

  const { data: spare = [], isLoading } = useQuery({
    queryKey: ['spareNumbersForSwap'],
    queryFn: () => allNumbersList({ type: 'inventory', page: 1, limit: 200 }),
    select: (res: any) => (res?.data?.data?.result?.rows || []) as Array<{ uuid: string; did_number: string; did_name?: string }>,
    enabled: open,
  });
  const options = useMemo(() => spare.filter((row) => row.did_number && row.did_number !== number?.did_number), [spare, number]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!person?.uuid || !chosen || !number?.did_number) throw new Error('Choose a spare number first.');
      await assignDIDNumber({ uuid: person.uuid, did_number: chosen });
      await removeAssignNumber({ did_number: number.did_number });
    },
    onSuccess: () => {
      handleAlert({ text: `${personName} now has ${chosen}. ${number?.did_number} is back in Unused.`, type: 'success' });
      invalidateNumberLists(queryClient);
      setChosen('');
      onClose();
    },
    onError: (error: any) =>
      handleAlert({ text: error?.response?.data?.message || error?.message || 'The swap did not complete.', type: 'error' }),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Swap number</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Give {personName} a different number. {number?.did_number} comes off them and goes to
          Numbers › Unused; it is not released.
        </p>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">New number</span>
          <select
            className="min-h-10 rounded-lg border border-gray-200 px-3"
            value={chosen}
            onChange={(e) => setChosen(e.target.value)}
            disabled={isLoading}
          >
            <option value="">{isLoading ? 'Loading spare numbers…' : options.length ? 'Choose a spare number…' : 'No spare numbers — buy one first'}</option>
            {options.map((row) => (
              <option key={row.uuid} value={row.did_number}>
                {row.did_number}
                {row.did_name ? ` · ${row.did_name}` : ''}
              </option>
            ))}
          </select>
        </label>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={() => mutate()} disabled={!chosen || isPending}>
            {isPending ? 'Swapping…' : 'Swap'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SwapNumberDialog;

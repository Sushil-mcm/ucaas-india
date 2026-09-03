import { FC, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import { invalidateNumberLists } from '@/lib/number-list-cache';
import { HOME_DIAL_CODE } from '@/lib/india';
import {
  describeParse,
  parseOwnedNumbers,
  splitAlreadyRegistered,
} from '@/lib/owned-numbers';
import { registerOwnedNumbers, sipTrunkList } from '@/services/api';

/**
 * Adding numbers the account already holds.
 *
 * This replaces the number-purchase wizard. That wizard walked an admin through
 * country, region, group type, prefix, availability, reservation and payment —
 * seven steps whose entire purpose was to buy a number from a wholesale carrier
 * that could not sell Indian ranges in the first place. On an India-only
 * platform the operator brings its own +91 numbers from a licensed carrier and
 * terminates them over its own SIP trunk, so the honest version of this screen
 * is a box you paste numbers into.
 *
 * It takes a paste rather than one field per number because that is how the
 * numbers arrive: a column out of a carrier portal or a spreadsheet, thirty or
 * three hundred at a time. Every row is validated before anything is sent, and
 * the rows that fail are shown as typed — an admin who pastes a hundred numbers
 * and gets ninety-eight registered needs to see which two did not, on this
 * screen, not infer it from a list that is short by two.
 */

interface AddOwnedNumbersProps {
  handleClose: () => void;
  /** Numbers already on the account, so a repeat paste is caught before saving. */
  existingNumbers?: unknown[];
}

const AddOwnedNumbers: FC<AddOwnedNumbersProps> = ({ handleClose, existingNumbers = [] }) => {
  const queryClient = useQueryClient();
  const [raw, setRaw] = useState('');
  const [label, setLabel] = useState('');
  const [trunkUuid, setTrunkUuid] = useState('');

  /* The trunk the numbers arrive on. Optional: an account with exactly one
     trunk should not be made to choose it, and an account with none can still
     register numbers and attach the trunk afterwards. */
  const { data: trunkData } = useQuery({
    queryKey: ['sip-trunk-list'],
    queryFn: () => sipTrunkList({}),
  });
  const trunks: any[] = useMemo(() => {
    const result = (trunkData as any)?.data?.data?.result ?? (trunkData as any)?.data?.result;
    return Array.isArray(result?.rows) ? result.rows : Array.isArray(result) ? result : [];
  }, [trunkData]);

  const parsed = useMemo(() => parseOwnedNumbers(raw), [raw]);
  const { fresh, already } = useMemo(
    () => splitAlreadyRegistered(parsed.valid, existingNumbers),
    [parsed.valid, existingNumbers],
  );
  const summary = describeParse(parsed, already.length);

  const { mutate, isPending } = useMutation({
    mutationFn: registerOwnedNumbers,
    onSuccess: () => {
      invalidateNumberLists(queryClient);
      handleAlert({
        text: `${fresh.length} number${fresh.length === 1 ? '' : 's'} added.`,
        type: 'success',
      });
      handleClose();
    },
    /* A failed save must not read as success. The axios layer already shows the
       server's message; this only keeps the drawer open so the paste survives
       and the admin can retry without retyping it. */
    onError: () => {},
  });

  const submit = () => {
    if (!fresh.length) return;
    mutate({
      numbers: fresh,
      ...(label.trim() ? { label: label.trim() } : {}),
      ...(trunkUuid ? { trunk_uuid: trunkUuid } : {}),
    });
  };

  return (
    <div className="flex flex-col gap-5 p-1">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold">Add numbers you own</h2>
        <p className="text-sm text-muted-foreground">
          Paste the {HOME_DIAL_CODE} numbers your carrier has assigned to this account. They must
          already route to your SIP trunk — adding them here tells the platform to answer for them,
          it does not order anything from a carrier.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="owned-numbers" className="text-sm font-medium">
          Numbers
        </label>
        <textarea
          id="owned-numbers"
          className="min-h-[168px] w-full rounded-md border bg-background p-3 font-mono text-sm"
          placeholder={`${HOME_DIAL_CODE} 98765 43210\n${HOME_DIAL_CODE} 98765 43211\n02245678900`}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          One per line, or separated by commas. Spaces, +91, a leading zero and the country code are
          all accepted.
        </p>
      </div>

      {raw.trim() ? <p className="text-sm font-medium">{summary}</p> : null}

      {parsed.invalid.length ? (
        <div className="flex flex-col gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">
            These are not valid Indian numbers and will be skipped
          </p>
          <p className="font-mono text-xs break-all text-muted-foreground">
            {parsed.invalid.slice(0, 20).join(', ')}
            {parsed.invalid.length > 20 ? ` … and ${parsed.invalid.length - 20} more` : ''}
          </p>
        </div>
      ) : null}

      {already.length ? (
        <p className="text-sm text-muted-foreground">
          {already.length} of these are already on the account and will be left alone.
        </p>
      ) : null}

      {trunks.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="owned-trunk" className="text-sm font-medium">
            Arrives on
          </label>
          <select
            id="owned-trunk"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={trunkUuid}
            onChange={(event) => setTrunkUuid(event.target.value)}
          >
            <option value="">Any trunk</option>
            {trunks.map((trunk: any) => (
              <option key={trunk?.uuid} value={trunk?.uuid}>
                {trunk?.name || trunk?.host}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Input
          label="Label (optional)"
          placeholder="Mumbai sales"
          value={label}
          onChange={(event: any) => setLabel(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Applied to every number in this batch. You can rename them individually afterwards.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" type="button" onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={!fresh.length || isPending}>
          {isPending
            ? 'Adding…'
            : `Add ${fresh.length || ''} number${fresh.length === 1 ? '' : 's'}`.replace('  ', ' ')}
        </Button>
      </div>
    </div>
  );
};

export default AddOwnedNumbers;

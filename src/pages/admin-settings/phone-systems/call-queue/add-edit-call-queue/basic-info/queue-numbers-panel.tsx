import { FC, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Loader from '@/components/custom/loader';
import NumberWithFlag from '@/components/custom/number-with-flag';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SettingCard } from '@/components/mcm/setting-card';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { invalidateNumberLists } from '@/lib/number-list-cache';
import { labelOf } from '@/lib/number-labels';
import {
  buildQueueAttachPatch,
  buildQueueDetachPatch,
  currentRouteOf,
  numbersOnQueue,
  planBulkAttach,
} from '@/lib/queue-numbers';
import { handleAlert } from '@/lib/utils';
import { allNumbersList, callForwarding } from '@/services/api';

/**
 * The numbers that ring this queue, chosen from the queue.
 *
 * A queue is fed by however many numbers you point at it - one per city, a
 * toll-free number, one per advert - and the queue record holds none of them:
 * each number stores where it forwards. Read from the number's side that is
 * fine. Read from the queue's side it was invisible, so the only way to learn
 * what fed a queue was to open every number in turn.
 *
 * This card works before the queue exists as well as after, and the difference
 * matters. A number points at a queue by its id, and a queue being created has
 * no id yet - so during create the choice is held on the form and written the
 * moment the queue is saved. Making the admin save, reopen and come back was
 * the single worst thing about setting one of these up.
 *
 * Writes go through the same endpoint the forwarding screen uses, with the
 * stored routing spread back verbatim, so adding a number here cannot disturb
 * its hours, recording, hold music or label.
 */

const ROUTE_WORDS: Record<string, string> = {
  EXTENSION: 'a person',
  VOICEMAIL: 'a mailbox',
  DEPARTMENT: 'a department',
  IVR: 'a menu',
  QUEUE: 'another queue',
  AI: 'an AI receptionist',
  PHONE: 'an outside number',
  GREETING: 'a greeting',
  MESSAGE: 'a message',
  HANGUP: 'a hang-up',
  DEVICE: 'a device',
};

const describeRoute = (did: any): string => {
  const route = currentRouteOf(did);
  if (!route.busy) return 'Not pointed anywhere yet';
  const word = ROUTE_WORDS[route.type] || 'something else';
  return route.name ? `Rings ${word} - ${route.name}` : `Rings ${word}`;
};

interface QueueNumbersPanelProps {
  /** The saved queue. Absent while the queue is still being created. */
  queueDetails: any;
  /** Numbers chosen before the queue exists, by `uuid`. */
  pendingUuids: string[];
  onPendingChange: (uuids: string[]) => void;
}

const QueueNumbersPanel: FC<QueueNumbersPanelProps> = ({
  queueDetails,
  pendingUuids,
  onPendingChange,
}) => {
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [ticked, setTicked] = useState<string[]>([]);

  const queueId = String(queueDetails?._id || '');
  const isCreating = !queueId;

  const queue = useMemo(
    () => ({
      id: queueId,
      name: String(queueDetails?.name || ''),
      extension: String(queueDetails?.extension || ''),
    }),
    [queueId, queueDetails?.name, queueDetails?.extension],
  );

  /* The same list, key and endpoint the numbers screens use, so a change made
     here refreshes them and a change made there refreshes this. */
  const { data: numbers = [], isPending } = useQuery({
    queryKey: ['numbersByLine'],
    queryFn: () => fetchAllPages(allNumbersList),
    staleTime: 60 * 1000,
  });

  /* Saved queue: read the pool back out of the numbers. Still being created:
     the pool is whatever has been ticked so far. */
  const pool = useMemo(() => {
    if (isCreating) {
      return (numbers as any[]).filter((did) => pendingUuids.includes(String(did?.uuid)));
    }
    return numbersOnQueue(numbers, queueId);
  }, [numbers, queueId, isCreating, pendingUuids]);

  const candidates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (numbers as any[])
      .filter((did) => !pool.includes(did))
      .filter((did) => {
        if (!needle) return true;
        return (
          String(did?.did_number || '')
            .toLowerCase()
            .includes(needle) || labelOf(did).toLowerCase().includes(needle)
        );
      });
  }, [numbers, pool, search]);

  const { mutateAsync: saveForwarding } = useMutation({ mutationFn: callForwarding });

  const runPatches = async (patches: any[], done: (n: number) => string) => {
    if (!patches.length) return;
    /* One at a time on purpose. These are writes to different rows but the same
       column family, and a failure halfway has to leave a state the admin can
       read off the screen rather than an unknown mixture. */
    let saved = 0;
    try {
      for (const patch of patches) {
        await saveForwarding(patch);
        saved += 1;
      }
      handleAlert({ text: done(saved), type: 'success' });
    } catch {
      handleAlert({
        text: saved
          ? `Saved ${saved} of ${patches.length}. The rest were not changed - try again.`
          : 'That did not save. Nothing was changed.',
        type: 'error',
      });
    } finally {
      invalidateNumberLists(queryClient);
    }
  };

  const closePicker = () => {
    setPickerOpen(false);
    setTicked([]);
    setSearch('');
  };

  const addTicked = async () => {
    if (isCreating) {
      /* Nothing to write yet - the queue has no id to point at. Held on the
         form and applied by the parent the moment the queue is saved. */
      onPendingChange([...new Set([...pendingUuids, ...ticked])]);
      closePicker();
      return;
    }

    const chosen = (numbers as any[]).filter((did) => ticked.includes(String(did?.uuid)));
    const patches = chosen.map((did) => buildQueueAttachPatch(did, queue)).filter(Boolean) as any[];
    closePicker();
    await runPatches(patches, (n) =>
      n === 1 ? 'That number now rings this queue.' : `${n} numbers now ring this queue.`,
    );
  };

  const removeOne = async (did: any) => {
    if (isCreating) {
      onPendingChange(pendingUuids.filter((id) => id !== String(did?.uuid)));
      return;
    }
    const patch = buildQueueDetachPatch(did);
    if (!patch) return;
    await runPatches([patch], () => 'Removed. That number now rings nowhere - point it somewhere.');
  };

  const plan = planBulkAttach(
    (numbers as any[]).filter((did) => ticked.includes(String(did?.uuid))),
    queue,
  );

  return (
    <>
      <SettingCard
        title="Numbers that ring this queue"
        description="Callers reach this queue on these numbers. Add as many as you need - one per city, a toll-free number, one per advert."
        status="active"
        note={
          isCreating
            ? 'These are attached the moment you save the queue. A number can only point at a queue that exists.'
            : undefined
        }
        aside={
          <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
            Add numbers
          </Button>
        }
      >
        {isPending ? (
          <Loader />
        ) : pool.length === 0 ? (
          <p className="text-sm text-gray-600">
            No number rings this queue yet, so no outside caller can reach it. Add one to put the
            queue live.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100">
            {pool.map((did: any, index: number) => (
              <li key={String(did?.uuid)} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <NumberWithFlag number={did?.did_number} />
                    {index === 0 && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                        Primary
                      </span>
                    )}
                    {isCreating && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                        On save
                      </span>
                    )}
                  </div>
                  {labelOf(did) && <p className="truncate text-xs text-gray-500">{labelOf(did)}</p>}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => removeOne(did)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SettingCard>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add numbers to this queue</h2>
              <p className="text-sm text-gray-600">
                Tick every number that should ring {queue.name || 'this queue'}.
              </p>
            </div>

            <Input
              placeholder="Search a number or its label"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="max-h-72 overflow-y-auto pr-1">
              {candidates.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-600">
                  {search ? 'No number matches that search.' : 'Every number already rings here.'}
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-gray-100">
                  {candidates.map((did: any) => {
                    const uuid = String(did?.uuid);
                    const route = currentRouteOf(did);
                    return (
                      <li key={uuid} className="flex items-start gap-3 py-2">
                        <Checkbox
                          className="mt-1"
                          checked={ticked.includes(uuid)}
                          onCheckedChange={(on: boolean) =>
                            setTicked((prev) =>
                              on ? [...prev, uuid] : prev.filter((id) => id !== uuid),
                            )
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <NumberWithFlag number={did?.did_number} />
                          <p
                            className={`truncate text-xs ${
                              route.busy ? 'text-amber-700' : 'text-gray-500'
                            }`}
                          >
                            {describeRoute(did)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {plan.moving.length > 0 && (
              <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {plan.moving.length === 1
                  ? '1 of these already answers somewhere else. Adding it here stops it doing that.'
                  : `${plan.moving.length} of these already answer somewhere else. Adding them here stops them doing that.`}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closePicker}>
              Cancel
            </Button>
            <Button type="button" disabled={ticked.length === 0} onClick={addTicked}>
              {ticked.length > 1 ? `Add ${ticked.length} numbers` : 'Add number'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QueueNumbersPanel;

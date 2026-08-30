/* Shown inside the delete dialog, before anybody presses the button.
 *
 * The whole of removing a person used to be "Are you sure, you want to delete
 * this user?" — and there was no way to become sure. Whether the main line
 * forwards to their extension, whether they are the last agent on a queue,
 * whether a menu key sends callers to them: none of it was visible here, and
 * none of it was discoverable afterwards either. The queue just stops
 * answering.
 *
 * Everything the check needs is already available from lists this admin can
 * read, so nothing new is needed from the backend. The lists are only fetched
 * once the dialog is actually open — an admin scrolling the people page should
 * not be pulling every queue and menu in the company on the off-chance.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  allNumbersList,
  callQueueList,
  getDepartmentList,
  getUserList,
  ivrList,
} from '@/services/api';
import {
  blocksRemoval,
  checkRemoval,
  sortImpacts,
  summarise,
  type Impact,
  type Person,
} from '@/lib/removal-impact';

const LIST = { page: 1, limit: 200 };

const rowsOf = (response: any): any[] => {
  const found =
    response?.data?.data?.result?.rows ?? response?.data?.data?.rows ?? response?.data?.data ?? [];
  return Array.isArray(found) ? found : [];
};

const TONE: Record<Impact['level'], string> = {
  'locks-you-out': 'border-red-200 bg-red-50 text-red-900',
  'stops-calls': 'border-amber-200 bg-amber-50 text-amber-900',
  'worth-knowing': 'border-gray-200 bg-gray-50 text-gray-700',
};

export const useRemovalImpact = (
  person: Person | null,
  open: boolean,
  /* The screen that opens this dialog usually has the roster on screen already.
     Passing it in avoids fetching every person a second time just to count how
     many administrators are left. */
  knownPeople?: Person[],
) => {
  const enabled = Boolean(open && person);
  const shared = { enabled, staleTime: 60 * 1000, retry: false as const };

  /* Written out one by one rather than generated in a loop: these are hooks,
     and a helper that calls useQuery on their behalf is one refactor away from
     calling a different number of them on different renders. */
  const people = useQuery({
    queryKey: ['removal-people'],
    queryFn: () => getUserList(LIST),
    ...shared,
    enabled: enabled && !knownPeople,
  });
  const queues = useQuery({
    queryKey: ['removal-queues'],
    queryFn: () => callQueueList(LIST),
    ...shared,
  });
  const ivrs = useQuery({ queryKey: ['removal-ivrs'], queryFn: () => ivrList(LIST), ...shared });
  const departments = useQuery({
    queryKey: ['removal-departments'],
    queryFn: () => getDepartmentList(LIST),
    ...shared,
  });
  const numbers = useQuery({
    queryKey: ['removal-numbers'],
    queryFn: () => allNumbersList(LIST),
    ...shared,
  });

  const loading =
    enabled &&
    ((!knownPeople && people.isLoading) ||
      queues.isLoading ||
      ivrs.isLoading ||
      departments.isLoading ||
      numbers.isLoading);

  const impacts = useMemo(() => {
    if (!person || loading) return [];
    return sortImpacts(
      checkRemoval({
        person,
        everyone: knownPeople ?? rowsOf(people.data),
        queues: rowsOf(queues.data),
        ivrs: rowsOf(ivrs.data),
        departments: rowsOf(departments.data),
        numbers: rowsOf(numbers.data),
      }),
    );
  }, [
    person,
    loading,
    knownPeople,
    people.data,
    queues.data,
    ivrs.data,
    departments.data,
    numbers.data,
  ]);

  /* A list that failed to load is not the same as a list with nothing in it.
     Reporting "nothing points at this person" when the queue list never
     arrived would be the most dangerous thing this screen could say. */
  const incomplete = [...(knownPeople ? [] : [people]), queues, ivrs, departments, numbers].some(
    (q) => q.isError,
  );

  return { impacts, loading, incomplete, blocked: blocksRemoval(impacts) };
};

const RemovalWarning = ({
  impacts,
  loading,
  incomplete,
  name,
}: {
  impacts: Impact[];
  loading: boolean;
  incomplete?: boolean;
  name: string;
}) => {
  if (loading) {
    return (
      <div className="text-sm text-gray-700">
        <p className="font-medium">Remove {name}?</p>
        <p className="mt-1 text-xs text-gray-500">Checking what still points at them…</p>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-700">
      <p className="font-medium">Remove {name}?</p>
      <p className="mt-1 text-xs text-gray-600">
        {incomplete
          ? 'Some of the checks could not run, so this list may be short. Nothing here is wrong — there may simply be more.'
          : summarise(impacts)}
      </p>

      {impacts.length > 0 ? (
        <ul className="scroller mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
          {impacts.map((impact, i) => (
            <li
              key={`${impact.code}-${impact.where ?? i}`}
              className={`rounded-md border px-2.5 py-2 text-xs leading-relaxed ${TONE[impact.level]}`}
            >
              {impact.message}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Said last, because it is the part that cannot be walked back. The
          things above are fixable; this one is not. */}
      <p className="mt-3 text-xs text-gray-500">
        Their call history stays for your records. Their voicemail, recordings and messages go with
        them and cannot be brought back.
      </p>
    </div>
  );
};

export default RemovalWarning;

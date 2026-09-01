import { FC, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import Loader from '@/components/custom/loader';
import NumberWithFlag from '@/components/custom/number-with-flag';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { allNumbersList } from '@/services/api';
import {
  canEditLabel,
  groupByLine,
  labelOf,
  matchesLineSearch,
  numberTypeOf,
  numbersWithoutLine,
  isSmsCapable,
} from '@/lib/number-labels';

/**
 * The numbers on each shared line, together.
 *
 * Every other view here is a flat list of numbers, which answers "what do we
 * own" and never answers "what rings Support". That second question is the one
 * asked when a number has to be added, retired or explained to a customer, and
 * today it is answered by reading the Forwarded-to column of a hundred rows.
 *
 * Nothing new is fetched. A line does not store its numbers — each number
 * stores where it forwards — so the grouping is that relationship read
 * backwards, out of the same list the other views use.
 *
 * The warning at the top is there because this screen would otherwise be
 * quietly misleading. A number pointed at a department, queue or menu is stored
 * correctly and looks correct here, and the switch that answers inbound calls
 * handles only two destinations: an extension and a voicemail box. Everything
 * else it logs as unhandled and drops. Showing these numbers grouped under
 * their line without saying so would tell an admin their setup is fine.
 */

/* Destinations the switch does not yet act on. The dialplan connects a call to
   an extension, a mailbox, a menu, a queue, an outside number or a hang-up; a
   department or an AI receptionist is logged as unhandled and the call is
   dropped. Kept as a list rather than a sentence because it is the thing that
   changes as the switch gains destinations, and a stale banner claiming a queue
   does not work is worse than no banner at all. */
const NOT_CARRIED_OUT: string[] = ['DEPARTMENT', 'AI'];

const TYPE_WORDS: Record<string, string> = {
  DEPARTMENT: 'Department',
  QUEUE: 'Queue',
  IVR: 'Menu',
  AI: 'AI receptionist',
};

interface NumbersByLineProps {
  search: string;
  onEditLabel: (did: any) => void;
  canLabel: boolean;
}

const NumbersByLine: FC<NumbersByLineProps> = ({ search, onEditLabel, canLabel }) => {
  const { data: numbers = [], isPending } = useQuery({
    queryKey: ['numbersByLine'],
    queryFn: () => fetchAllPages(allNumbersList),
    staleTime: 60 * 1000,
  });

  const groups = useMemo(() => groupByLine(numbers), [numbers]);
  const visible = useMemo(
    () => groups.filter((group) => matchesLineSearch(group, search)),
    [groups, search],
  );
  const unlinked = useMemo(() => numbersWithoutLine(numbers).length, [numbers]);
  const hasUnroutedLine = useMemo(
    () => groups.some((group) => NOT_CARRIED_OUT.includes(group.line.type)),
    [groups],
  );

  if (isPending) {
    return (
      <div className="flex w-full items-center justify-center p-8">
        <Loader variant="blue" size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hasUnroutedLine ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-gray-900">
          <strong>Some of these routes are stored but not yet carried out.</strong> A number
          pointing at a department or an AI receptionist is saved correctly and shown here, but the
          call is dropped rather than answered. Those lines are marked below. Numbers pointing at a
          queue, a menu, a person or a mailbox are connected normally.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="px-3 py-8 text-center">
          <p className="font-semibold text-gray-900">No lines to show</p>
          <p className="text-sm text-gray-500">
            {groups.length
              ? 'No line matches that search.'
              : 'Point a number at a department, queue or menu and it will be grouped here.'}
          </p>
        </div>
      ) : (
        visible.map((group) => (
          <section key={group.line.key} className="flex flex-col gap-1">
            <header className="flex flex-wrap items-baseline gap-2">
              <h3 className="text-md font-semibold text-gray-900">{group.line.name}</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {TYPE_WORDS[group.line.type] || group.line.type}
              </span>
              {NOT_CARRIED_OUT.includes(group.line.type) ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                  Calls not connected yet
                </span>
              ) : null}
              <span className="text-xs text-gray-500">
                {group.numbers.length} {group.numbers.length === 1 ? 'number' : 'numbers'}
              </span>
            </header>
            <table>
              <thead>
                <tr>
                  <th>Phone number</th>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Texting</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {group.numbers.map((did: any, index: number) => {
                  const label = labelOf(did);
                  const allowed = canEditLabel(did);
                  return (
                    <tr key={did?.uuid || did?.did_number}>
                      <td>
                        <div className="flex items-center gap-2">
                          <NumberWithFlag number={did?.did_number} />
                          {/* Not a stored flag — the platform has none. It is the
                              first number on the line, which is the one people
                              mean when they say "the Support number". */}
                          {index === 0 ? (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-800">
                              Primary
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>{label || <span className="text-gray-500">No label</span>}</td>
                      <td>{numberTypeOf(did)}</td>
                      <td>{isSmsCapable(did) ? 'Yes' : 'No'}</td>
                      <td className="text-right">
                        {canLabel && allowed.ok ? (
                          <button
                            type="button"
                            className="cursor-pointer text-primary"
                            onClick={() => onEditLabel(did)}
                          >
                            {label ? 'Edit label' : 'Add label'}
                          </button>
                        ) : (
                          <span className="text-gray-500">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))
      )}

      {unlinked ? (
        <p className="text-xs text-gray-500">
          {unlinked} {unlinked === 1 ? 'number rings' : 'numbers ring'} a person, or nothing at all,
          so {unlinked === 1 ? 'it is' : 'they are'} not on a shared line. They are all in All
          numbers.
        </p>
      ) : null}
    </div>
  );
};

export default NumbersByLine;

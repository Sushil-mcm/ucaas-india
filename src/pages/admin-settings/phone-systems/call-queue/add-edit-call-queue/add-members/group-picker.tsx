import { useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronIcon, SearchLine, UsersGroupLine } from '@/assets/icons';
import { getInitials } from '@/lib/utils';
import { getDepartmentList } from '@/services/api';
import { chooseManager, isOnQueue, memberKey, toggleMember } from '@/lib/queue-members';
import {
  addGroupToQueue,
  addableMembers,
  groupCoverage,
  isOtherLocation,
  memberDisplayName,
  memberExtension,
  memberRole,
  removeGroupFromQueue,
  searchGroups,
  toQueueGroup,
  unreachableMembers,
  type QueueGroup,
} from '@/lib/queue-groups';

/**
 * Putting a whole team on a queue, and seeing exactly who that is.
 *
 * Groups already exist as a thing an admin maintains (Phone System > Groups), so
 * building a queue that rings Support no longer means finding the same six
 * people again by hand.
 *
 * ONE SOURCE OF TRUTH
 * -------------------
 * Every tick on this tab and every tick on the People tab reads and writes the
 * same `members` array on the form. Nothing here keeps a list of "groups that
 * have been added" - that would be a second copy of the truth, and the moment
 * somebody unticked one person on the other tab the two would disagree with no
 * way to tell which was right.
 *
 * So the group's own tick box is not a stored setting, it is a summary: ticked
 * when everybody in the group is on the queue, half-ticked when some are,
 * empty when none are. Untick one person on the People tab and this group drops
 * to half-ticked on its own, because it is reading the same list.
 *
 * A group is still a starting point, not a live link: somebody added to the
 * group next week does not join this queue by themselves.
 *
 * The expansion itself lives in @/lib/queue-groups, kept pure and covered.
 */

/* The list endpoints reject a limit above 200, and the other membership readers
   settle on one page for the same reason - see use-group-caller-id-options.ts. */
const GROUP_PAGE_LIMIT = 200;

const rowsOf = (response: any): any[] => response?.data?.data?.result?.rows || [];

/**
 * Writing to the queue, the one way this screen is allowed to do it.
 *
 * Two rules, both learned the hard way on the People tab:
 *   - read the list at the moment of the click (`getValues`), never from the
 *     render that drew the row, or a second tick spreads a stale list and the
 *     first person vanishes;
 *   - settle the manager afterwards, or adding people to an empty queue leaves
 *     it unsaveable with the complaint on a different tab.
 */
const useQueueWriter = () => {
  const { control, setValue, clearErrors, getValues } = useFormContext();
  /* Watched so rows redraw as the queue changes - including changes made on the
     People tab. Never used as the base for a write. */
  const members = useWatch({ control, name: 'members', defaultValue: [] });

  const apply = (next: any[]) => {
    setValue('members', next, { shouldValidate: true });
    clearErrors('members');
    const nextManager = chooseManager(next, getValues('manager'));
    if (memberKey(nextManager) !== memberKey(getValues('manager'))) {
      setValue('manager', nextManager || { value: '' }, { shouldValidate: true });
      clearErrors('manager');
    }
  };

  return { members, apply, getValues };
};

/** One person inside an open group. Ticking them is ticking them on People. */
const GroupMemberRow = ({ person }: { person: any }) => {
  const { members, apply, getValues } = useQueueWriter();
  const isOn = isOnQueue(members, person);
  const name = memberDisplayName(person);
  const extension = memberExtension(person);
  const role = memberRole(person);

  const toggle = () => apply(toggleMember(getValues('members') || [], person));

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isOn}
      title={isOn ? 'Click to take them off this queue' : 'Click to put them on this queue'}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      }}
      className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-100 ${
        isOn ? 'bg-primary/5' : ''
      }`}
    >
      {/* Inert: the whole row is the target, so one click cannot count twice. */}
      <Checkbox checked={isOn} className="pointer-events-none text-primary" tabIndex={-1} />
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-medium uppercase text-gray-600">
        {getInitials(name)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm capitalize text-gray-900">{name}</span>
        {role ? <span className="text-[10px] text-primary">{role}</span> : null}
      </div>
      <span className="shrink-0 text-xs text-gray-500">{extension}</span>
    </div>
  );
};

/** Somebody the queue cannot ring. Shown, so they are not silently missing. */
const UnreachableMemberRow = ({ person }: { person: any }) => (
  <div
    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 opacity-60"
    title="This person has no extension, so a queue cannot ring them"
  >
    <Checkbox checked={false} disabled className="pointer-events-none" tabIndex={-1} />
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-medium uppercase text-gray-500">
      {getInitials(memberDisplayName(person))}
    </div>
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-sm capitalize text-gray-600">{memberDisplayName(person)}</span>
      <span className="text-[10px] text-amber-700">No extension - cannot be rung</span>
    </div>
  </div>
);

const GroupRow = ({ group, queueSite }: { group: QueueGroup; queueSite: string }) => {
  const { members, apply, getValues } = useQueueWriter();
  const [isOpen, setIsOpen] = useState(false);

  const coverage = useMemo(() => groupCoverage(group, members), [group, members]);
  const people = useMemo(() => addableMembers(group), [group]);
  const skipped = useMemo(() => unreachableMembers(group), [group]);
  const elsewhere = isOtherLocation(group, queueSite);

  /* Select-all semantics, the same as the People tab's header box: ticked means
     "put all of them on", unticking means "take all of them off". */
  const toggleWholeGroup = () => {
    const current = getValues('members') || [];
    apply(
      coverage.isFullyAdded
        ? removeGroupFromQueue(current, group)
        : addGroupToQueue(current, group),
    );
  };

  const boxState: boolean | 'indeterminate' = coverage.isFullyAdded
    ? true
    : coverage.isPartiallyAdded
      ? 'indeterminate'
      : false;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-1 px-2 py-2">
        {/* The tick box is a sibling of the open/close button, not inside it, so
            one cannot ever trigger the other. */}
        <div
          role="button"
          tabIndex={0}
          aria-pressed={coverage.isFullyAdded}
          aria-label={
            coverage.isFullyAdded
              ? `Take everyone in ${group.name} off this queue`
              : `Put everyone in ${group.name} on this queue`
          }
          title={
            coverage.isFullyAdded
              ? 'Everyone in this group is on the queue. Click to take them all off.'
              : 'Put everyone in this group on this queue'
          }
          onClick={toggleWholeGroup}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleWholeGroup();
            }
          }}
          className={`flex items-center justify-center rounded p-2 text-primary ${
            people.length === 0 ? 'pointer-events-none opacity-40' : 'cursor-pointer'
          }`}
        >
          <Checkbox
            checked={boxState}
            disabled={people.length === 0}
            className="pointer-events-none"
            tabIndex={-1}
          />
        </div>

        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-gray-50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-xs font-medium uppercase text-gray-600">
            {getInitials(group.name)}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold capitalize text-gray-900">{group.name}</span>
              {group.extension ? (
                <span className="text-xs text-gray-500">{group.extension}</span>
              ) : null}
              {coverage.isFullyAdded ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                  all on this queue
                </span>
              ) : coverage.isPartiallyAdded ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                  {coverage.onQueue} of {coverage.addable} on this queue
                </span>
              ) : null}
            </div>
            <span className="text-xs text-gray-500">
              {people.length === 0
                ? 'Nobody in this group can be rung yet'
                : `${people.length} ${people.length === 1 ? 'person' : 'people'}`}
              {skipped.length > 0 ? ` · ${skipped.length} without an extension` : ''}
              {elsewhere ? ` · ${group.siteLabel || 'another location'}` : ''}
            </span>
          </div>

          <ChevronIcon
            className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-gray-200 bg-gray-50/60 px-2 py-2">
          {elsewhere ? (
            <p className="px-2 pb-1.5 text-[11px] text-amber-700">
              This group is at {group.siteLabel || 'another location'}, not the one chosen on Basic
              info. You can still add them, but they will not show on the People tab.
            </p>
          ) : null}

          {people.length === 0 && skipped.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-gray-500">This group has nobody in it yet.</p>
          ) : null}

          <div className="flex flex-col gap-0.5">
            {people.map((person) => (
              <GroupMemberRow key={memberExtension(person)} person={person} />
            ))}
            {skipped.map((person, index) => (
              <UnreachableMemberRow
                key={`${person?.user_uuid || person?.uuid || 'anon'}-${index}`}
                person={person}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const GroupPicker = ({ queueSite }: { queueSite: string }) => {
  const [search, setSearch] = useState('');

  /* Same key prefix the rest of the app uses for this list, so a group edited
     elsewhere in this session is invalidated here rather than served stale. */
  const {
    data: rows = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['getDepartmentList', 'queueGroupPicker'],
    queryFn: () => getDepartmentList({ page: 1, limit: GROUP_PAGE_LIMIT, filters: [], search: '' }),
    select: rowsOf,
    staleTime: 60_000,
  });

  const groups = useMemo(
    () => (rows as any[]).map(toQueueGroup).filter(Boolean) as QueueGroup[],
    [rows],
  );
  const visible = useMemo(() => searchGroups(groups, search), [groups, search]);
  const isTruncated = (rows as any[]).length >= GROUP_PAGE_LIMIT;

  if (isPending) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500">
        Loading groups…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-6 text-center">
        <p className="text-sm text-red-700">The groups could not be loaded.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center">
        <UsersGroupLine className="h-5 w-5 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">No groups yet</p>
        <p className="text-xs text-gray-500">
          Create one under Phone System &gt; Groups and it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-600">
          Tick a group to put everyone in it on this queue, or open it to pick people one at a time.
          These are the same ticks as the People tab - untick somebody there and the group shows as
          half-ticked here.
        </p>
        <div className="relative w-full min-w-[13rem] sm:max-w-xs">
          <Input
            type="text"
            placeholder="Search groups"
            IconPosition="left-0 pl-2 inset-y-0"
            value={search}
            Icon={<SearchLine className="text-gray-700" />}
            onChange={(event) => {
              const value = event.target.value;
              if (value.startsWith(' ')) return;
              setSearch(value);
            }}
            className="w-full pl-10"
          />
        </div>
      </div>

      {isTruncated ? (
        <p className="text-[11px] text-amber-700">
          Showing the first {GROUP_PAGE_LIMIT} groups. Search by name to find one that is not
          listed.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500">
          No group matches “{search.trim()}”.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((group) => (
            <GroupRow key={group.uuid} group={group} queueSite={queueSite} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-500">
        Adding a group copies the people in it onto this queue. It does not link the two - somebody
        added to the group later will not join this queue on their own.
      </p>
    </div>
  );
};

export default GroupPicker;

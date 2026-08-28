/**
 * The shared numbers a person is allowed to call out from.
 *
 * WHY THIS EXISTS
 * ---------------
 * `settings.company_calling_permissions.caller_id.allow_office_or_group_number`
 * has been stored since the permissions screen shipped and has never done
 * anything, because the caller-ID picker
 * (src/hooks/use-dialpad-caller-id-options.ts:70) is fed by exactly one source —
 * `useGetAssignedDIDNumbers()` (src/hooks/common.ts:72), the numbers assigned to
 * that one person. There was no group number in the list for the permission to
 * unlock. This hook produces that missing half.
 *
 * HOW A NUMBER BELONGS TO A GROUP
 * -------------------------------
 * Nothing in this product models "the company main number", and no group owns a
 * number as a field on the group. The binding runs the other way, from the
 * number: a DID's `forward_call_actions.call_handling.business_hours` says
 * `{ type, value }`, where type is DEPARTMENT / IVR / QUEUE and value is that
 * destination's id. So "the group's number" is really "every number pointed at
 * the group", and there can be more than one. Written by
 * src/pages/admin-settings/numbers/set-number-forwarding/call-handling/hours/index.tsx
 * and read back at src/pages/admin-settings/numbers/set-number-forwarding/index.tsx:472-477.
 *
 * THE ID THAT IS NOT A UUID
 * -------------------------
 * The three destination types do not agree on which id gets written into
 * `value`:
 *
 *   DEPARTMENT -> department.uuid  (hours/index.tsx:128)
 *   IVR        -> ivr.uuid         (hours/index.tsx:134)
 *   QUEUE      -> queue._id        (hours/index.tsx:140)  <- not uuid
 *
 * A call queue row carries both a Mongo-style `_id` and a `uuid`, and different
 * screens pick different ones: the number-forwarding screen writes `_id`, while
 * src/components/custom/forward-action-all.tsx:167 writes
 * `uuid || _id || id`. Matching on `uuid` alone therefore finds no queue numbers
 * at all on some accounts and only some of them on others — it fails silently,
 * which is the worst way for this to fail. Every queue is indexed under all
 * three ids (`queueIdsOf`), so whichever one the number happens to hold, it
 * matches.
 *
 * MEMBERSHIP
 * ----------
 * Departments and queues both carry a `members` blob (a JSON string on some
 * responses, an array on others) and both list endpoints return it, so
 * membership is resolved by fetching the lists and filtering in memory — the
 * pattern already proven in src/pages/directory/people-rows.ts:97-115 and
 * src/hooks/use-live-contact-centre.ts:65-81.
 *
 * Nobody is a "member" of an IVR — a menu has key presses, not people. An IVR's
 * number is offered only when one of its key presses leads to a department or
 * queue the person is actually in, which is the one hop that makes a reception
 * menu number genuinely theirs to use.
 *
 * ADDITIVE BY CONSTRUCTION
 * ------------------------
 * With the permission absent or false this hook fetches nothing and returns an
 * empty list. Absent is treated as off: this grants a person the ability to
 * present a number that is not theirs, and that is not something a company
 * should acquire by upgrading. Every query also degrades to empty on error — an
 * agent whose role cannot read the tenant-wide numbers list keeps the personal
 * picker they have today rather than getting a broken one.
 *
 * NOT A DEFAULT. A group number is a per-call choice and must never be written
 * back as the person's stored caller ID — see `isGroupCallerIdOption`.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  type CompanyDefaultTemplate,
} from '@/lib/company-defaults';
import { parseForwardActions } from '@/lib/call-standard';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import {
  allNumbersList,
  callQueueList,
  getDepartmentList,
  ivrList,
} from '@/services/api';
import { useGetAssignedDIDNumbers } from './common';
import { useUser } from './use-user';
import type { CallerIdOption } from '@/components/dialpad/types';

const PERMISSIONS_KEY = 'company_calling_permissions';

/* Same figure the other company-policy readers use, e.g.
   src/hooks/use-transfer-permissions.ts:234. Company rules change rarely and
   this is read every time the dialpad mounts. */
const POLICY_STALE_TIME = 5 * 60 * 1000;

/* Several list endpoints reject a limit above 200 (see
   src/lib/fetch-all-pages.ts). The membership lists are read as a single page,
   matching src/pages/directory/people-rows.ts:104 and
   src/hooks/use-live-contact-centre.ts:60 — so a tenant with more than 200
   departments, queues or menus has its membership silently truncated. That is
   reported rather than hidden: see `isMembershipTruncated`. */
const MEMBERSHIP_PAGE_LIMIT = 200;

export type GroupCallerIdSource = 'personal' | 'group';

export type GroupDestinationType = 'DEPARTMENT' | 'IVR' | 'QUEUE';

/**
 * A caller-ID option that belongs to a group rather than to the person.
 *
 * Structurally a `CallerIdOption`, so it drops straight into the existing
 * picker, with the provenance the UI needs to head one list "Your numbers" and
 * the other "Shared numbers".
 */
export type GroupCallerIdOption = CallerIdOption & {
  /* Always 'group' here. Personal options carry no source field, so the wiring
     tags them 'personal' as it merges the two lists. */
  source: GroupCallerIdSource;
  /* What kind of thing the number rings, for a subheading or an icon. */
  groupType: GroupDestinationType;
  /* The group's own name — the same string as `label`, kept separate so the
     label can be reworded without losing the underlying name. */
  groupName: string;
  /* The DID record this option came from, for logging a mis-set number back to
     the row that holds it. */
  didUuid: string;
};

/**
 * Option ids are prefixed so a group selection is recognisable anywhere it
 * travels, without the receiving code needing this module's types. The
 * persistence guard in the dialpad is the reason this exists.
 */
export const GROUP_CALLER_ID_ID_PREFIX = 'group:';

/**
 * True when this option is a shared group number.
 *
 * The one thing every caller of the picker must check before persisting: a
 * group number is a per-call choice, not the person's default.
 */
export const isGroupCallerIdOption = (option?: { id?: string } | null): boolean =>
  String(option?.id || '').startsWith(GROUP_CALLER_ID_ID_PREFIX);

/* Only an explicit `true` grants this. See the header — absent is off. */
const readAllowGroupCallerId = (
  template: CompanyDefaultTemplate | null | undefined,
): boolean => {
  const settings = template?.settings;
  if (!settings || typeof settings !== 'object') return false;
  const permissions = (settings as Record<string, any>)[PERMISSIONS_KEY];
  if (!permissions || typeof permissions !== 'object') return false;
  const callerId = permissions.caller_id;
  if (!callerId || typeof callerId !== 'object') return false;
  return callerId.allow_office_or_group_number === true;
};

/* `members` arrives as a JSON string on some responses and an already-parsed
   array on others. Same guard as src/pages/directory/people-rows.ts:71. */
const parseMembers = (members: unknown): any[] => {
  if (Array.isArray(members)) return members;
  if (typeof members !== 'string') return [];
  try {
    const parsed = JSON.parse(members || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/* `ivr_option` comes back as an array on the list endpoint (read unparsed at
   src/pages/admin-settings/phone-systems/ivr-menus/add-edit-ivr/index.tsx:282),
   but a string is accepted in case another endpoint serialises it. */
const parseIvrOptions = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const cleanId = (value: unknown): string => String(value ?? '').trim();

/* A queue is reachable by any of these. See the header. */
const queueIdsOf = (queue: any): string[] =>
  [queue?._id, queue?.uuid, queue?.id].map(cleanId).filter(Boolean);

/* Digits only, so '+12568081010' and '12568081010' compare equal. This mirrors
   `callerIdMatchKey` in use-dialpad-caller-id-options.ts:37; it is repeated
   rather than imported because that helper is module-private and exporting it
   would mean editing the existing picker. */
const numberMatchKey = (value: unknown): string => String(value ?? '').replace(/\D/g, '');

/** True when two numbers are the same, allowing for a missing country code. */
const sameNumber = (left: unknown, right: unknown): boolean => {
  const a = numberMatchKey(left);
  const b = numberMatchKey(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= 7 && longer.endsWith(shorter);
};

const rowsOf = (response: any): any[] => response?.data?.data?.result?.rows || [];

export interface GroupCallerIdOptions {
  /** The shared numbers this person may present. Empty unless permitted. */
  groupCallerIdOptions: GroupCallerIdOption[];
  /** True only when a stored company record explicitly grants this. */
  isGroupCallerIdAllowed: boolean;
  isGroupCallerIdLoading: boolean;
  /**
   * True when a membership list came back full at the page limit, so somebody's
   * group may be missing from it. The picker is then incomplete, not wrong.
   */
  isMembershipTruncated: boolean;
}

export const useGroupCallerIdOptions = (): GroupCallerIdOptions => {
  const { user } = useUser();

  const { data: companyDefaultTemplate, isLoading: isPolicyLoading } =
    useQuery<CompanyDefaultTemplate | null>({
      queryKey: COMPANY_DEFAULTS_QUERY_KEY,
      queryFn: fetchCompanyDefaults,
      staleTime: POLICY_STALE_TIME,
    });

  const isGroupCallerIdAllowed = readAllowGroupCallerId(companyDefaultTemplate);

  /* Nothing below runs until the company has actually granted this. A person on
     an account that never turned it on costs four requests they would otherwise
     have paid for on every dialpad mount. */
  const enabled = isGroupCallerIdAllowed && Boolean(user);

  /* Deliberately the same key, fetcher and params as
     src/hooks/use-location-numbers.ts:41-45, so when a location screen has
     already walked the tenant's numbers the dialpad reuses that cache instead of
     walking it a second time. The endpoint has no group filter, which is why the
     whole in-use list is read and grouped in memory. */
  const { data: allNumbers = [], isLoading: isNumbersLoading } = useQuery({
    queryKey: ['location-numbers'],
    queryFn: () => fetchAllPages(allNumbersList, { type: 'in_use', filters: [], search: '' }),
    enabled,
    staleTime: POLICY_STALE_TIME,
  });

  /* Same key prefix the platform invalidates on a membership change, so adding
     somebody to a group reaches this picker rather than sitting stale — the
     reasoning at src/pages/directory/people-rows.ts:96-99. */
  const { data: departments = [], isLoading: isDepartmentsLoading } = useQuery({
    queryKey: ['getDepartmentList', 'groupCallerId'],
    queryFn: () =>
      getDepartmentList({ page: 1, limit: MEMBERSHIP_PAGE_LIMIT, filters: [], search: '' }),
    select: rowsOf,
    enabled,
    staleTime: POLICY_STALE_TIME,
  });

  const { data: queues = [], isLoading: isQueuesLoading } = useQuery({
    queryKey: ['getCallQueueListQuery', 'groupCallerId'],
    queryFn: () =>
      callQueueList({ page: 1, limit: MEMBERSHIP_PAGE_LIMIT, filters: [], search: '' }),
    select: rowsOf,
    enabled,
    staleTime: POLICY_STALE_TIME,
  });

  const { data: ivrs = [], isLoading: isIvrsLoading } = useQuery({
    queryKey: ['getIVRList', 'groupCallerId'],
    queryFn: () => ivrList({ page: 1, limit: MEMBERSHIP_PAGE_LIMIT, filters: [], search: '' }),
    select: rowsOf,
    enabled,
    staleTime: POLICY_STALE_TIME,
  });

  /* The person's own numbers, so a number that is both assigned to them and
     pointed at their group is not offered twice under two headings. This is the
     same query key the existing picker uses, so it is served from cache and
     costs no extra request. */
  const { data: assignedDIDList = [] } = useGetAssignedDIDNumbers();

  /* Every id this account is known by. Membership blobs are written by several
     screens and key their entries differently — `user_uuid` in one place,
     `uuid` in another, the bare extension in a third — so all of them are
     collected and compared. */
  const identityKeys = useMemo(() => {
    const keys = [
      user?.uuid,
      user?.user_uuid,
      user?.user_info?.uuid,
      user?.user_info?.user_uuid,
      user?.user_info?.extension,
      user?.extension,
    ]
      .map(cleanId)
      .filter(Boolean);
    return new Set(keys);
  }, [
    user?.uuid,
    user?.user_uuid,
    user?.user_info?.uuid,
    user?.user_info?.user_uuid,
    user?.user_info?.extension,
    user?.extension,
  ]);

  const isMemberOf = useMemo(
    () => (row: any) =>
      parseMembers(row?.members).some((member: any) =>
        [member?.user_uuid, member?.uuid, member?.extension]
          .map(cleanId)
          .filter(Boolean)
          .some((key) => identityKeys.has(key)),
      ),
    [identityKeys],
  );

  const isMembershipTruncated =
    (Array.isArray(departments) && departments.length >= MEMBERSHIP_PAGE_LIMIT) ||
    (Array.isArray(queues) && queues.length >= MEMBERSHIP_PAGE_LIMIT) ||
    (Array.isArray(ivrs) && ivrs.length >= MEMBERSHIP_PAGE_LIMIT);

  const groupCallerIdOptions = useMemo<GroupCallerIdOption[]>(() => {
    if (!enabled || identityKeys.size === 0) return [];

    /* `TYPE:id` -> the group that id names. One flat index, because a number
       says only which type and which id it points at. */
    const myGroups = new Map<string, { name: string; type: GroupDestinationType }>();

    (departments as any[]).forEach((department) => {
      if (!isMemberOf(department)) return;
      const uuid = cleanId(department?.uuid);
      if (!uuid) return;
      myGroups.set(`DEPARTMENT:${uuid}`, {
        name: cleanId(department?.name) || 'Group',
        type: 'DEPARTMENT',
      });
    });

    /* Every id a queue answers to — `_id` is the one the number-forwarding
       screen writes, and the one a uuid-only match would miss. */
    (queues as any[]).forEach((queue) => {
      if (!isMemberOf(queue)) return;
      const name = cleanId(queue?.name) || 'Queue';
      queueIdsOf(queue).forEach((id) => {
        myGroups.set(`QUEUE:${id}`, { name, type: 'QUEUE' });
      });
    });

    /* One hop for menus. A menu is the person's when a key press on it leads to
       a group they are in — the ids compared here are the same ones the index
       above was built from, so the queue `_id` mismatch is handled once. */
    (ivrs as any[]).forEach((ivr) => {
      const uuid = cleanId(ivr?.uuid);
      if (!uuid) return;
      const leadsToMyGroup = parseIvrOptions(ivr?.ivr_option).some((option: any) => {
        const type = cleanId(option?.type).toUpperCase();
        const value = cleanId(option?.value);
        if (!value) return false;
        if (type === 'DEPARTMENT') return myGroups.has(`DEPARTMENT:${value}`);
        if (type === 'QUEUE') return myGroups.has(`QUEUE:${value}`);
        return false;
      });
      if (!leadsToMyGroup) return;
      myGroups.set(`IVR:${uuid}`, { name: cleanId(ivr?.name) || 'Menu', type: 'IVR' });
    });

    if (myGroups.size === 0) return [];

    const personalNumbers = (assignedDIDList as any[])
      .map((did: any) => cleanId(did?.did_number))
      .filter(Boolean);

    const options: GroupCallerIdOption[] = [];
    const seen: string[] = [];

    (allNumbers as any[]).forEach((did: any) => {
      const number = cleanId(did?.did_number);
      if (!number) return;

      const businessHours = parseForwardActions(did?.forward_call_actions)?.call_handling
        ?.business_hours;
      const type = cleanId(businessHours?.type).toUpperCase();
      const value = cleanId(businessHours?.value);
      if (!type || !value) return;

      const group = myGroups.get(`${type}:${value}`);
      if (!group) return;

      /* Already offered under the person's own heading — one number, one row. */
      if (personalNumbers.some((personal) => sameNumber(personal, number))) return;
      if (seen.some((taken) => sameNumber(taken, number))) return;
      seen.push(number);

      options.push({
        id: `${GROUP_CALLER_ID_ID_PREFIX}${cleanId(did?.uuid) || number}`,
        label: group.name,
        /* `did_country` is the number's own country, which is what the flag
           should show; the account's country is only a fallback for rows that
           never had one set. Same field the existing picker reads
           (use-dialpad-caller-id-options.ts:21). */
        country: (cleanId(did?.did_country) || user?.countryInfo?.alpha2code || 'US').toUpperCase(),
        number,
        source: 'group',
        groupType: group.type,
        groupName: group.name,
        didUuid: cleanId(did?.uuid),
      });
    });

    /* Stable order: by group name, then by number, so the list does not shuffle
       between renders when the numbers endpoint changes its ordering. */
    return options.sort(
      (left, right) =>
        left.groupName.localeCompare(right.groupName) || left.number.localeCompare(right.number),
    );
  }, [
    allNumbers,
    assignedDIDList,
    departments,
    enabled,
    identityKeys,
    isMemberOf,
    ivrs,
    queues,
    user?.countryInfo?.alpha2code,
  ]);

  return {
    groupCallerIdOptions,
    isGroupCallerIdAllowed,
    /* While the policy itself is still in flight nothing is claimed either way.
       Once it says no, this hook is done — it is not waiting on lists it will
       never request. */
    isGroupCallerIdLoading:
      isPolicyLoading ||
      (enabled && (isNumbersLoading || isDepartmentsLoading || isQueuesLoading || isIvrsLoading)),
    isMembershipTruncated,
  };
};

export default useGroupCallerIdOptions;

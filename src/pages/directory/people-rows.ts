import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDepartmentList, getUserList } from '@/services/api';
import { useGetSite } from '@/hooks/common';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useLiveContactCentre, CONFIG_REFRESH_MS } from '@/hooks/use-live-contact-centre';
import { handleDate } from '@/components/custom/date-dropdown/constant';
import { getAgentLiveState } from '@/pages/performance/agent-rows';

/**
 * The organisation roster, as the console's People page reads it.
 *
 * The platform stores the pieces separately — the user list, department
 * membership, queue membership and live presence all arrive from different
 * places — so this assembles one row per person from all four. Presence reuses
 * `getAgentLiveState` from Performance rather than re-deriving it, so a person
 * cannot show as Available here and On Call there.
 *
 * Location comes from the site a user is assigned to (`site.name`), which is
 * what the platform calls the same thing.
 */

export type PresenceTone = 'good' | 'busy' | 'warn' | 'idle';

export type PersonRow = {
  uuid: string;
  name: string;
  initials: string;
  image?: string;
  email: string;
  role: string;
  department: string;
  extension: string;
  /** The site's name — in most tenants this reads like a company name. */
  location: string;
  /** "City, Country" for that site, so the location reads as a place. */
  locationPlace: string;
  jobTitle: string;
  phone: string;
  /** Outbound number assigned to the user; blank until one is assigned. */
  callerId: string;
  skills: string[];
  /** Live state from the socket — On Call, Offline, Available… */
  presence: string;
  /** The availability stored against the person, which an admin can change. */
  availability: string;
  tone: PresenceTone;
  /** The untouched user record, for surfaces that expect the platform shape. */
  raw: any;
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '—';

/** How each live state should read on the roster. */
const TONE: Record<string, PresenceTone> = {
  'On Call': 'busy',
  Ringing: 'warn',
  'On Hold': 'warn',
  Available: 'good',
  Busy: 'busy',
  'Do Not Disturb': 'busy',
  Offline: 'idle',
};

const parseMembers = (members: unknown): any[] => {
  try {
    const parsed = typeof members === 'string' ? JSON.parse((members as string) || '[]') : members;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const usePeopleRows = () => {
  const today = useMemo(() => handleDate('Today'), []);
  const { queues, activeQueueCalls } = useLiveContactCentre(today);
  const { usersOnlineStatus } = useSocketEvents();

  const { data: roster = [], isPending: isRosterLoading } = useQuery({
    queryKey: ['directoryPeople'],
    queryFn: () => getUserList({ page: 1, limit: 500 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    refetchInterval: CONFIG_REFRESH_MS,
  });

  /* Sites carry city/country; the user row only carries the site's name. Joining
     them lets the roster show where someone actually is, not just the label
     whoever created the site happened to type. */
  const { data: sites = [] } = useGetSite();

  const { data: departments = [] } = useQuery({
    /* Same key prefix the platform invalidates, so membership changes reach
       People's Groups column instead of sitting stale. */
    queryKey: ['getDepartmentList', 'directoryDepartments'],
    queryFn: () => getDepartmentList({ page: 1, limit: 200 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  /** user uuid -> the departments they belong to */
  const departmentByUser = useMemo(() => {
    const map = new Map<string, string[]>();
    departments.forEach((department: any) => {
      parseMembers(department?.members).forEach((member: any) => {
        const key = String(member?.user_uuid || member?.uuid || '');
        if (!key) return;
        map.set(key, [...(map.get(key) || []), department?.name].filter(Boolean));
      });
    });
    return map;
  }, [departments]);

  const rows: PersonRow[] = useMemo(
    () =>
      roster.map((person: any) => {
        const name = `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || 'Unknown';
        const extension = String(person?.extension || '');
        const keys = [person?.uuid, person?.user_uuid, extension].filter(Boolean).map(String);

        // Queue membership is the platform's nearest thing to an ACD skill.
        const skills = queues
          .filter((queue: any) => queue.memberKeys.some((key: string) => keys.includes(key)))
          .map((queue: any) => queue.name);

        const live = getAgentLiveState(extension, usersOnlineStatus, activeQueueCalls);

        return {
          uuid: String(person?.uuid || extension || name),
          name,
          initials: initialsOf(name),
          image: person?.profile,
          email: person?.email || '',
          role: person?.custom_role_data?.name || person?.role_data?.name || person?.role || '—',
          department: (departmentByUser.get(String(person?.uuid)) || []).join(', ') || '—',
          extension,
          location: person?.site?.name || '—',
          locationPlace:
            (() => {
              const site = sites.find(
                (entry: any) =>
                  entry?.uuid === person?.site_uuid || entry?.name === person?.site?.name,
              );
              return [site?.city, site?.country].filter(Boolean).join(', ');
            })() || '',
          jobTitle: person?.job_title || '',
          phone: person?.phone || person?.mobile || '',
          callerId: person?.caller_id || '',
          skills,
          presence: live.status,
          availability: (() => {
            const raw = person?.call_forwarding;
            const rules =
              typeof raw === 'string'
                ? (() => {
                    try {
                      return JSON.parse(raw);
                    } catch {
                      return null;
                    }
                  })()
                : raw;
            return rules?.status || 'online';
          })(),
          tone: TONE[live.status] || 'idle',
          raw: person,
        };
      }),
    [roster, queues, usersOnlineStatus, activeQueueCalls, departmentByUser, sites],
  );

  return { rows, isLoading: isRosterLoading };
};

export default usePeopleRows;

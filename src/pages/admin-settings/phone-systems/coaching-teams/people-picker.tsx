import { FC, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CloseIcon, SearchLine } from '@/assets/icons';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Input } from '@/components/ui/input';
import { forwardActionType } from '@/services/api';

/* One person on a coaching team, stored as the switch and the screens need
   it: the uuid ties back to the person, the extension is what a call carries,
   the name is what a coach reads. Same shape a group's members use. */
export interface TeamPerson {
  user_uuid: string;
  extension: string;
  name: string;
}

interface DirectoryPerson {
  uuid: string;
  first_name?: string;
  last_name?: string;
  label?: string;
  extension?: string;
  email?: string;
  profile?: string;
}

export const personName = (person?: DirectoryPerson | null): string =>
  [person?.first_name, person?.last_name].filter(Boolean).join(' ') || person?.label || '';

/* Everybody in the company, every site - the same directory the Skills
   people picker reads, so the two screens agree on who exists. */
export const useCompanyDirectory = () => {
  const directory = useQuery({
    queryKey: ['coachingDirectory'],
    queryFn: () =>
      forwardActionType({ page: 1, limit: 1000, filters: [], search: '', type: 'EXTENSION' }),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const people: DirectoryPerson[] = useMemo(
    () => directory?.data?.data?.data?.result?.rows || [],
    [directory?.data],
  );
  return { people, isLoading: directory.isLoading };
};

interface PeoplePickerProps {
  label: string;
  hint: string;
  value: TeamPerson[];
  onChange: (next: TeamPerson[]) => void;
  /* People who may not be picked here (already on the other list). */
  exclude?: TeamPerson[];
  people: DirectoryPerson[];
  readOnly?: boolean;
}

const LIST_LIMIT = 40;

/* Pick people for one side of a team. Chosen people sit on top with a remove
   cross; a search box narrows the rest. A company can have hundreds of
   people, so the list shows the first forty and says so. */
const PeoplePicker: FC<PeoplePickerProps> = ({
  label,
  hint,
  value,
  onChange,
  exclude = [],
  people,
  readOnly = false,
}) => {
  const [search, setSearch] = useState('');
  const chosen = useMemo(() => new Set(value.map((p) => p.user_uuid)), [value]);
  const blocked = useMemo(() => new Set(exclude.map((p) => p.user_uuid)), [exclude]);
  const byUuid = useMemo(() => new Map(people.map((p) => [String(p.uuid), p])), [people]);

  const candidates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return people
      .filter((p) => !chosen.has(String(p.uuid)) && !blocked.has(String(p.uuid)))
      .filter(
        (p) =>
          !needle ||
          personName(p).toLowerCase().includes(needle) ||
          String(p.extension || '').includes(needle) ||
          String(p.email || '')
            .toLowerCase()
            .includes(needle),
      )
      .sort((a, b) => personName(a).localeCompare(personName(b)));
  }, [people, chosen, blocked, search]);

  const add = (p: DirectoryPerson) =>
    onChange([
      ...value,
      { user_uuid: String(p.uuid), extension: String(p.extension || ''), name: personName(p) },
    ]);
  const remove = (uuid: string) => onChange(value.filter((p) => p.user_uuid !== uuid));

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-8">
        {value.length === 0 ? (
          <span className="text-xs text-gray-400 self-center">Nobody yet</span>
        ) : (
          value.map((p) => {
            const person = byUuid.get(p.user_uuid);
            return (
              <span
                key={p.user_uuid}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white pl-1 pr-2 py-0.5 text-xs"
              >
                <CustomAvatar
                  name={p.name || personName(person)}
                  extension={p.extension}
                  image={person?.profile}
                  size="20"
                />
                <span className="max-w-[160px] truncate">{p.name || personName(person)}</span>
                {p.extension ? <span className="text-gray-400">{p.extension}</span> : null}
                {!readOnly && (
                  <button
                    type="button"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => remove(p.user_uuid)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })
        )}
      </div>
      {!readOnly && (
        <>
          <div className="relative">
            <SearchLine className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Find a person by name, extension or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {candidates.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-500">
                {people.length ? 'Nobody matches.' : 'Loading people…'}
              </p>
            ) : (
              candidates.slice(0, LIST_LIMIT).map((p) => (
                <button
                  type="button"
                  key={p.uuid}
                  onClick={() => add(p)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50"
                >
                  <CustomAvatar
                    name={personName(p)}
                    extension={p.extension}
                    image={p.profile}
                    size="24"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-gray-900">{personName(p)}</span>
                    <span className="block truncate text-[11px] text-gray-500">
                      {[p.extension && `Ext ${p.extension}`, p.email].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="text-xs text-primary">Add</span>
                </button>
              ))
            )}
            {candidates.length > LIST_LIMIT && (
              <p className="px-3 py-1.5 text-[11px] text-gray-500">
                Showing {LIST_LIMIT} of {candidates.length}. Search to narrow the list.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PeoplePicker;

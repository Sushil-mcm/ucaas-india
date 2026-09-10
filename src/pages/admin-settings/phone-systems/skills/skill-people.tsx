import { CloseIcon, SearchLine } from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
import CustomAvatar from '@/components/custom/custom-avatar';
import StarRating from '@/components/custom/star-rating';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import { forwardActionType, getSkillPeople, setSkillPeople } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FC, useEffect, useMemo, useState } from 'react';

interface Person {
  uuid: string;
  first_name?: string;
  last_name?: string;
  label?: string;
  extension?: string;
  email?: string;
  profile?: string;
}

interface SkillPeopleModalProps {
  skill: any;
  onClose: () => void;
  readOnly?: boolean;
}

const fullName = (person?: Person): string =>
  [person?.first_name, person?.last_name].filter(Boolean).join(' ') || person?.label || '';

/* One person, in either list. Defined here rather than inside the modal so a
   keystroke in the search box does not remount every avatar on the screen. */
const PersonRow = ({
  uuid,
  person,
  stars,
  readOnly,
  onRate,
}: {
  uuid: string;
  person?: Person;
  stars: number;
  readOnly: boolean;
  onRate: (uuid: string, stars: number) => void;
}) => (
  <div className="grid grid-cols-[1fr_auto] gap-x-4 items-center px-4 py-2.5 border-b last:border-b-0 border-gray-100">
    <div className="flex items-center gap-2 min-w-0">
      {person ? (
        <CustomAvatar name={fullName(person)} extension={person?.extension} image={person?.profile} />
      ) : (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-xs shrink-0">
          ?
        </span>
      )}
      <div className="min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {person ? fullName(person) : 'Somebody no longer in the directory'}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {person
            ? [person?.extension && `Ext ${person.extension}`, person?.email]
                .filter(Boolean)
                .join(' · ')
            : 'Clear the rating to take them off this skill'}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <StarRating
        value={stars}
        readOnly={readOnly}
        label={fullName(person) || 'This person'}
        onChange={(next) => onRate(uuid, next)}
      />
      <span className="text-xs text-gray-500 w-20 text-right tabular-nums">
        {stars ? `${stars} of 5` : 'Click to add'}
      </span>
      {!readOnly && stars > 0 && (
        <span
          title="Take off this skill"
          onClick={() => onRate(uuid, 0)}
          className="flex items-center justify-center rounded-full w-7 h-7 cursor-pointer bg-gray-100 text-gray-500 hover:bg-red-500 hover:text-white"
        >
          <Icon name="TrashBin" className="w-4 h-4" />
        </span>
      )}
    </div>
  </div>
);

/* Putting people on a skill, from the skill.
 *
 * The ratings themselves already existed, but only from the other end: an
 * admin who added "Spanish" had to open every profile in the company to find
 * out who speaks it. Same rows (`user_skills`), same 1-5 stars, read and
 * written from the skill's side - so staffing a new skill is one screen
 * instead of twenty.
 *
 * One click does both jobs: clicking a star on somebody who is not on the
 * skill adds them AT that rating, and clicking their lit star again takes
 * them off. There is no separate "add" step to forget. */
const SkillPeopleModal: FC<SkillPeopleModalProps> = ({ skill, onClose, readOnly = false }) => {
  const queryClient: any = useQueryClient();
  const skillId = String(skill?._id || '');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Record<string, number>>({});
  const [searchKey, setSearchKey] = useState('');

  const roster = useQuery({
    queryKey: ['getSkillPeople', skillId],
    queryFn: () => getSkillPeople({ skill_id: skillId }),
    enabled: Boolean(skillId),
    refetchOnWindowFocus: false,
  });

  /* Everybody in the company, every site. The roster comes back as ids only,
     so the names on this screen are joined from here. */
  const directory = useQuery({
    queryKey: ['skillPeopleDirectory'],
    queryFn: () => forwardActionType({ page: 1, limit: 1000, filters: [], search: '', type: 'EXTENSION' }),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const people: Person[] = useMemo(
    () => directory?.data?.data?.data?.result?.rows || [],
    [directory?.data],
  );
  const byUuid = useMemo(
    () => new Map(people.map((person) => [String(person?.uuid), person])),
    [people],
  );

  useEffect(() => {
    const rows: any[] = roster?.data?.data?.data?.people || [];
    const next: Record<string, number> = {};
    rows.forEach((row) => {
      next[String(row?.user_uuid)] = Number(row?.stars) || 0;
    });
    setRatings(next);
    setSaved(next);
  }, [roster?.data]);

  const dirty = useMemo(() => {
    const keys = new Set([...Object.keys(ratings), ...Object.keys(saved)]);
    return Array.from(keys).some((key) => (ratings[key] || 0) !== (saved[key] || 0));
  }, [ratings, saved]);

  const rate = (uuid: string, stars: number) =>
    setRatings((prev) => ({ ...prev, [String(uuid)]: stars }));

  /* On the skill, best first. A rating left behind by somebody who has since
     left the company still shows, so it can be cleared rather than sitting
     in the routing copy where nobody can see it. */
  const onSkill = useMemo(() => {
    return Object.entries(ratings)
      .filter(([, stars]) => stars > 0)
      .map(([uuid, stars]) => ({ uuid, stars, person: byUuid.get(String(uuid)) }))
      .sort(
        (a, b) =>
          b.stars - a.stars ||
          fullName(a.person).localeCompare(fullName(b.person)) ||
          a.uuid.localeCompare(b.uuid),
      );
  }, [ratings, byUuid]);

  /* A company can have hundreds of people; drawing them all would make the
     modal crawl. The list shows the first of them and says so - searching
     narrows it rather than scrolling. */
  const ADD_LIST_LIMIT = 50;

  const others = useMemo(() => {
    const needle = searchKey.trim().toLowerCase();
    return people
      .filter((person) => !(ratings[String(person?.uuid)] > 0))
      .filter((person) => {
        if (!needle) return true;
        return [fullName(person), person?.email, person?.extension]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle));
      })
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [people, ratings, searchKey]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: setSkillPeople,
    onSuccess: () => {
      handleAlert({ text: 'People saved', type: 'success' });
      setSaved(ratings);
      queryClient.invalidateQueries(['getSkillPeople', skillId]);
      queryClient.invalidateQueries(['getSkillsList']);
      queryClient.invalidateQueries(['getUserSkills']);
      queryClient.invalidateQueries(['getUsersSkills']);
      onClose();
    },
  });

  const onSave = () =>
    save({
      skill_id: skillId,
      people: Object.entries(ratings)
        .filter(([, stars]) => stars > 0)
        .map(([user_uuid, stars]) => ({ user_uuid, stars })),
    });

  const loading = roster.isLoading || directory.isLoading;
  const failed = roster.isError || directory.isError;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="sm:max-w-[46rem] w-full p-0 max-h-[92vh] flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-200">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-gray-900">People with {skill?.name}</p>
            <p className="text-xs text-gray-500 max-w-prose">
              1 star means they can cover it, 5 means they are the best choice. A queue that asks
              for this skill rings the highest-rated free person first. The same ratings show on
              each person's profile.
            </p>
          </div>
          <div
            onClick={onClose}
            className="cursor-pointer text-gray-500 opacity-70 transition-opacity hover:opacity-100 mt-1"
          >
            <CloseIcon className="w-3 h-3" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {loading ? (
            <div className="text-sm text-gray-500">Loading people…</div>
          ) : failed ? (
            <div className="text-sm text-red-600">
              Could not load the people on this skill.{' '}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  roster.refetch();
                  directory.refetch();
                }}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-gray-50">
                  <span>On this skill</span>
                  <span className="tabular-nums normal-case">
                    {onSkill.length === 1 ? '1 person' : `${onSkill.length} people`}
                  </span>
                </div>
                {onSkill.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-600">
                    Nobody yet. Give somebody below a rating and they join this skill.
                  </div>
                ) : (
                  onSkill.map((row) => (
                    <PersonRow
                      key={row.uuid}
                      uuid={row.uuid}
                      person={row.person}
                      stars={row.stars}
                      readOnly={readOnly}
                      onRate={rate}
                    />
                  ))
                )}
              </div>

              {!readOnly && (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Add people</span>
                    <div className="relative w-full max-w-xs">
                      <Input
                        type="text"
                        placeholder="Search by name, email or extension"
                        IconPosition="left-0 pl-2 inset-y-0"
                        value={searchKey}
                        Icon={<SearchLine className="text-gray-700" />}
                        onChange={(e) => {
                          if (e.target.value.startsWith(' ')) return;
                          setSearchKey(e.target.value);
                        }}
                        className="w-full pl-10 min-h-9"
                      />
                    </div>
                  </div>
                  <div className="max-h-[16rem] overflow-y-auto">
                    {others.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-600">
                        {searchKey
                          ? 'Nobody matches that search.'
                          : 'Everybody in the company is already on this skill.'}
                      </div>
                    ) : (
                      others.slice(0, ADD_LIST_LIMIT).map((person) => (
                        <PersonRow
                          key={String(person?.uuid)}
                          uuid={String(person?.uuid)}
                          person={person}
                          stars={0}
                          readOnly={readOnly}
                          onRate={rate}
                        />
                      ))
                    )}
                    {others.length > ADD_LIST_LIMIT && (
                      <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                        Showing {ADD_LIST_LIMIT} of {others.length}. Search to find somebody
                        further down the list.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          {dirty && <span className="text-xs text-amber-600 mr-auto">Unsaved changes</span>}
          <Button variant={'transparent'} type="button" onClick={onClose}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button
              variant={'primary'}
              type="button"
              disabled={!dirty || isPending || loading}
              onClick={onSave}
            >
              {isPending ? 'Saving…' : 'Save people'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SkillPeopleModal;

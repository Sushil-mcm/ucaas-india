import StarRating from '@/components/custom/star-rating';
import { Button } from '@/components/ui/button';
import { handleAlert } from '@/lib/utils';
import { getSkills, getUserSkills, setUserSkills } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

interface SkillsTabProps {
  userUuid?: string;
  personName?: string;
}

/* Rate one person on every skill in the catalogue. Saved on its own, apart
   from the rest of the profile, because a rating is a routing change and
   should land the moment the admin confirms it. */
const SkillsTab = ({ userUuid, personName }: SkillsTabProps) => {
  const queryClient: any = useQueryClient();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Record<string, number>>({});

  const catalogue = useQuery({
    queryKey: ['getSkillsList', { page: 1, limit: 500, forPerson: true }],
    queryFn: () => getSkills({ page: 1, limit: 500 }),
    refetchOnWindowFocus: false,
  });
  const mine = useQuery({
    queryKey: ['getUserSkills', userUuid],
    queryFn: () => getUserSkills({ user_uuid: userUuid }),
    enabled: Boolean(userUuid),
    refetchOnWindowFocus: false,
  });

  const skills: any[] = useMemo(
    () => catalogue?.data?.data?.data?.result?.rows || [],
    [catalogue?.data],
  );

  useEffect(() => {
    const rows: any[] = mine?.data?.data?.data?.skills || [];
    const next: Record<string, number> = {};
    rows.forEach((row) => {
      next[String(row?.skill_id)] = Number(row?.stars) || 0;
    });
    setRatings(next);
    setSaved(next);
  }, [mine?.data]);

  const dirty = useMemo(() => {
    const keys = new Set([...Object.keys(ratings), ...Object.keys(saved)]);
    return Array.from(keys).some((key) => (ratings[key] || 0) !== (saved[key] || 0));
  }, [ratings, saved]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: setUserSkills,
    onSuccess: () => {
      handleAlert({ text: 'Skills saved', type: 'success' });
      setSaved(ratings);
      queryClient.invalidateQueries(['getUserSkills', userUuid]);
      queryClient.invalidateQueries(['getSkillsList']);
    },
  });

  const onSave = () => {
    save({
      user_uuid: userUuid,
      skills: Object.entries(ratings)
        .filter(([, stars]) => stars > 0)
        .map(([skill_id, stars]) => ({ skill_id, stars })),
    });
  };

  const ratedCount = Object.values(ratings).filter((stars) => stars > 0).length;

  /* Under their category headings, so a gap reads at a glance: a person
     with no Language rating at all is obvious here. */
  const groups = useMemo(() => {
    const order = new Map<string, { name: string; sort: number; skills: any[] }>();
    skills.forEach((skill) => {
      const key = String(skill?.category_id || '');
      const group = order.get(key) || {
        name: String(skill?.category_name || 'General'),
        sort: Number(skill?.category_sort) || 0,
        skills: [],
      };
      group.skills.push(skill);
      order.set(key, group);
    });
    return Array.from(order.values()).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  }, [skills]);

  if (!userUuid) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Save this person first, then come back here to rate their skills.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-gray-900">Skills</p>
          <p className="text-xs text-gray-500 max-w-prose">
            Rate {personName || 'this person'} on each skill: 1 star means they can cover it, 5
            means they are the best choice. A queue that asks for a skill rings the highest-rated
            free person first. Leave a skill unrated if they do not handle it.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
          <Button
            type="button"
            variant={'primary'}
            className="min-h-9"
            disabled={!dirty || isPending}
            onClick={onSave}
          >
            {isPending ? 'Saving…' : 'Save skills'}
          </Button>
        </div>
      </div>

      {catalogue.isLoading || mine.isLoading ? (
        <div className="text-sm text-gray-500">Loading skills…</div>
      ) : catalogue.isError || mine.isError ? (
        <div className="text-sm text-red-600">
          Could not load skills.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              catalogue.refetch();
              mine.refetch();
            }}
          >
            Try again
          </button>
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">
          No skills yet. Add them under{' '}
          <Link to="/admin-settings/phone/skills" className="text-primary underline">
            Phone System → Skills
          </Link>
          , then rate people here.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-gray-50">
            <span>Skill</span>
            <span>Rating</span>
          </div>
          {groups.map((group) => [
            <div
              key={`h-${group.name}`}
              className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700"
            >
              <span>{group.name}</span>
              <span className="font-normal text-gray-500">
                {group.skills.filter((skill) => (ratings[String(skill?._id)] || 0) > 0).length} of{' '}
                {group.skills.length} rated
              </span>
            </div>,
            ...group.skills.map((skill) => {
            const id = String(skill?._id);
            const stars = ratings[id] || 0;
            return (
              <div
                key={id}
                className="grid grid-cols-[1fr_auto] gap-x-4 items-center px-4 py-3 border-b last:border-b-0 border-gray-100"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{skill?.name}</div>
                  {skill?.description && (
                    <div className="text-xs text-gray-500 truncate">{skill.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StarRating
                    value={stars}
                    label={skill?.name}
                    onChange={(next) => setRatings((prev) => ({ ...prev, [id]: next }))}
                  />
                  <span className="text-xs text-gray-500 w-16 text-right tabular-nums">
                    {stars ? `${stars} of 5` : 'Not rated'}
                  </span>
                </div>
              </div>
            );
            }),
          ])}
          <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
            {ratedCount === 0
              ? 'No skills rated yet.'
              : `${ratedCount} of ${skills.length} skill${skills.length === 1 ? '' : 's'} rated.`}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsTab;

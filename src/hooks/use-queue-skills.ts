import { getSkillCategories, getSkills, getUsersSkills } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  LadderRound,
  QueueRouting,
  RatedStars,
  RequirementRow,
  effectiveRows,
  holdsRows,
  normaliseRows,
  rowsFit,
  rowsScore,
  rowsStage,
  widenLadder as ladderFor,
} from '@/lib/queue-requirements';

export type { LadderRound, QueueRouting, RequirementRow };
export type SkillCategoryKind = 'language' | 'general';

export interface RatedSkill extends RatedStars {
  name: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  category_kind?: SkillCategoryKind;
}

export interface SkillOption {
  value: string;
  label: string;
  description?: string;
  category_id: string;
  category_name: string;
  category_kind: SkillCategoryKind;
  category_sort: number;
  code?: string;
}

/* A heading skills sit under: Language, Customer service, Sales... */
export interface SkillCategory {
  _id: string;
  name: string;
  kind: SkillCategoryKind;
  description: string;
  sort: number;
  is_default: boolean;
  skillCount: number;
}

export const SKILLS_QUERY_KEY = 'getSkillsList';
export const SKILL_CATEGORIES_QUERY_KEY = 'getSkillCategories';

/* The company's skills, as select options, in category order. */
export const useSkillsCatalogue = () => {
  const query = useQuery({
    queryKey: [SKILLS_QUERY_KEY, { page: 1, limit: 500, forQueue: true }],
    queryFn: () => getSkills({ page: 1, limit: 500 }),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const options: SkillOption[] = useMemo(
    () =>
      (query.data?.data?.data?.result?.rows || []).map((row: any) => ({
        value: String(row?._id),
        label: String(row?.name || ''),
        description: row?.description || '',
        category_id: String(row?.category_id || ''),
        category_name: String(row?.category_name || 'General'),
        category_kind: row?.category_kind === 'language' ? 'language' : 'general',
        category_sort: Number(row?.category_sort) || 0,
        code: row?.code || '',
      })),
    [query.data],
  );
  return { ...query, options };
};

export const useSkillCategories = () => {
  const query = useQuery({
    queryKey: [SKILL_CATEGORIES_QUERY_KEY],
    queryFn: () => getSkillCategories({}),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const rows: SkillCategory[] = useMemo(
    () =>
      (query.data?.data?.data?.rows || [])
        .map((row: any) => ({
          _id: String(row?._id),
          name: String(row?.name || ''),
          kind: row?.kind === 'language' ? 'language' : 'general',
          description: String(row?.description || ''),
          sort: Number(row?.sort) || 0,
          is_default: Boolean(row?.is_default),
          skillCount: Number(row?.skillCount) || 0,
        }))
        .sort((a: SkillCategory, b: SkillCategory) => a.sort - b.sort || a.name.localeCompare(b.name)),
    [query.data],
  );
  const byId = useMemo(() => new Map(rows.map((row) => [row._id, row])), [rows]);
  return { ...query, rows, byId };
};

/* Star ratings for a set of people, keyed by their id. One request, however
   many people are on screen. */
export const useMembersSkills = (userUuids: Array<string | undefined | null>) => {
  const ids = useMemo(
    () =>
      Array.from(new Set(userUuids.map((u) => String(u || '').trim()).filter(Boolean))).sort(),
    [userUuids],
  );
  const query = useQuery({
    queryKey: ['getUsersSkills', ids],
    queryFn: () => getUsersSkills({ user_uuids: ids }),
    enabled: ids.length > 0,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
  const byUser: Record<string, RatedSkill[]> = useMemo(
    () => query.data?.data?.data?.users || {},
    [query.data],
  );
  return { ...query, byUser };
};

/* The routing block as the form stores it, read defensively. */
export const readRouting = (raw: any): QueueRouting => ({
  required_skills: Array.isArray(raw?.required_skills) ? raw.required_skills.map(String) : [],
  min_stars: Number(raw?.min_stars) || 1,
  evaluation: raw?.evaluation === 'ANY' ? 'ANY' : 'ALL',
  priority: Number(raw?.priority) || 5,
  requirements: normaliseRows(raw?.requirements),
  order: raw?.order === 'fair' ? 'fair' : 'best_first',
});

/* The same rules the queue service applies, from the routing block. See
   src/lib/queue-requirements.ts for the rules themselves. */
export const holdsQueueSkills = (rated: RatedStars[] | undefined, routing: Partial<QueueRouting>) =>
  holdsRows(rated, effectiveRows(routing));

export const queueSkillScore = (rated: RatedStars[] | undefined, routing: Partial<QueueRouting>) =>
  rowsScore(rated, effectiveRows(routing));

export const queueSkillStage = (rated: RatedStars[] | undefined, routing: Partial<QueueRouting>) =>
  rowsStage(rated, effectiveRows(routing));

export const queueSkillFit = (rated: RatedStars[] | undefined, routing: Partial<QueueRouting>) =>
  rowsFit(rated, effectiveRows(routing));

export const widenLadder = ({
  tiers,
  routing,
  widenAfterSeconds,
}: {
  tiers: number[];
  routing: Partial<QueueRouting>;
  widenAfterSeconds: number;
}): LadderRound[] => ladderFor({ tiers, rows: effectiveRows(routing), widenAfterSeconds });

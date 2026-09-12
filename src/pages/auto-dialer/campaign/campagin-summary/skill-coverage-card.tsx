import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCampaignSkillCoverage } from '@/services/api';

/* "Skill coverage" on the campaign board.
 *
 * A lead may name a skill (the Skill column on the upload). This card reads
 * GET /campaign/:id/skill-coverage and says, per skill, how many leads ask
 * for it and how many people on the team hold it - and, in one line, how
 * many leads nobody on the team can take. Those are never dialled, so the
 * number is the one a supervisor has to act on: rate someone, or add
 * someone to the team.
 *
 * Mount with one line:  <CampaignSkillCoverageCard campaignId={id} />
 * It draws a `.panel-card`, so it sits in any `.mcm-page` grid as it is. */

export interface SkillCoverageRow {
  skill_id: string;
  name: string;
  leads: number;
  members_holding: number;
}

export interface SkillCoverage {
  leads_by_skill: SkillCoverageRow[];
  uncoverable: number;
}

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/* The body, whichever envelope the api client hands back. */
export const readSkillCoverage = (raw: any): SkillCoverage | null => {
  const body = raw?.data?.data?.result ?? raw?.data?.data ?? raw?.data ?? raw;
  if (!body || typeof body !== 'object') return null;
  const list = Array.isArray(body.leads_by_skill) ? body.leads_by_skill : null;
  if (!list && body.uncoverable === undefined) return null;
  return {
    leads_by_skill: (list || [])
      .map((row: any) => ({
        skill_id: String(row?.skill_id ?? row?._id ?? ''),
        name: String(row?.name ?? row?.skill_name ?? 'Skill'),
        leads: num(row?.leads),
        members_holding: num(row?.members_holding),
      }))
      .sort((a: SkillCoverageRow, b: SkillCoverageRow) => b.leads - a.leads || a.name.localeCompare(b.name)),
    uncoverable: num(body.uncoverable),
  };
};

export const SKILL_COVERAGE_QUERY_KEY = 'campaignSkillCoverage';

interface CampaignSkillCoverageCardProps {
  campaignId: string;
  /** Poll while the board is open; 30 s matches the rest of the page. */
  refetchIntervalMs?: number;
}

const CampaignSkillCoverageCard = ({ campaignId, refetchIntervalMs = 30000 }: CampaignSkillCoverageCardProps) => {
  const { data, error, isLoading } = useQuery({
    queryKey: [SKILL_COVERAGE_QUERY_KEY, campaignId],
    queryFn: () => getCampaignSkillCoverage({ campaignId }),
    enabled: Boolean(campaignId),
    staleTime: 15000,
    refetchInterval: refetchIntervalMs,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const coverage = useMemo(() => readSkillCoverage(data), [data]);
  const status = (error as any)?.response?.status;
  const unavailable = Boolean(error) && (status === 404 || status === 501);
  const totalSkilled = coverage?.leads_by_skill.reduce((sum, row) => sum + row.leads, 0) || 0;
  const uncoverable = coverage?.uncoverable || 0;

  return (
    <div className="panel-card" data-testid="skill-coverage-card">
      <div className="pc-head">
        <h3>Skill coverage</h3>
        <span className="src pc-right">from the lead list and the team’s ratings</span>
      </div>
      <div className="pc-body tight">
        {isLoading ? (
          <div className="src">Counting leads by skill…</div>
        ) : unavailable ? (
          <div className="src">
            Skill coverage is not available on this server yet. Leads that name a skill are still
            offered only to people rated on it once the dialer supports it.
          </div>
        ) : error || !coverage ? (
          <div className="src">Skill coverage could not be read just now. It will retry on its own.</div>
        ) : !coverage.leads_by_skill.length ? (
          <div className="src">
            No lead on this campaign names a skill, so every lead can go to anyone on the team.
          </div>
        ) : (
          <>
            {coverage.leads_by_skill.map((row) => (
              <div className="kv" key={row.skill_id || row.name}>
                <span className="k">
                  {row.name}
                  {row.members_holding === 0 ? (
                    <>
                      {' '}
                      <span className="tag warn">nobody on the team</span>
                    </>
                  ) : null}
                </span>
                <span className="v num">
                  {row.leads} {row.leads === 1 ? 'lead' : 'leads'}
                  <span className="src">
                    {' '}
                    · {row.members_holding} {row.members_holding === 1 ? 'person holds it' : 'people hold it'}
                  </span>
                </span>
              </div>
            ))}
            <div className="kv">
              <span className="k">Leads that name a skill</span>
              <span className="v num">{totalSkilled}</span>
            </div>
          </>
        )}
        {coverage ? (
          <div className="kv">
            <span className="k">Leads nobody on the team can take</span>
            <span className="v num">
              {uncoverable}{' '}
              <span className={`tag ${uncoverable > 0 ? 'neg' : 'pos'}`}>
                {uncoverable > 0 ? 'never dialled' : 'all covered'}
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CampaignSkillCoverageCard;

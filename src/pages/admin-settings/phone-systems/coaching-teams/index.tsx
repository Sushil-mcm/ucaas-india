import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import { SearchLine } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useCompanyFeatures } from '@/hooks/rbac';
import { handleAlert } from '@/lib/utils';
import { deleteCoachingTeam, listCoachingTeams } from '@/services/api';
import AddEditCoachingTeam, { COACHING_TEAMS_QUERY_KEY, CoachingTeam, RECORD_RULES } from './add-edit-coaching-team';
import { AdminHeadActions, useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';

/* Coaching teams: the third kind of team. A group is somewhere calls ring, a
   queue is somewhere calls wait; a coaching team routes nothing. It says who
   is training whom, so coaches can watch and listen to their trainees' calls
   from the Coaching page, and so the switch records trainees' calls for
   review when the team asks for it. Stored per tenant (coaching_teams,
   created on first use). */
/* One template for the header and the rows. Two copies of it is how a
   header ends up a column out from the data under it. */
const COLS = 'md:grid-cols-[1.3fr_1fr_1.5fr_0.9fr_auto]';

const CoachingTeamsPage = () => {
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const phoneAccess = features?.plan_features?.phone_system_action?.action;
  const canEdit = Boolean(phoneAccess?.edit);
  const canDelete = Boolean(phoneAccess?.delete ?? phoneAccess?.edit);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ open: boolean; team: CoachingTeam | null }>({ open: false, team: null });
  const [pendingDelete, setPendingDelete] = useState<CoachingTeam | null>(null);

  const teamsQuery = useQuery({
    queryKey: [COACHING_TEAMS_QUERY_KEY, { page: 1, limit: 200 }],
    queryFn: () => listCoachingTeams({ page: 1, limit: 200 }),
    refetchOnWindowFocus: false,
  });
  const teams: CoachingTeam[] = useMemo(
    () => teamsQuery.data?.data?.data?.result?.rows || [],
    [teamsQuery.data],
  );

  const { mutate: mutateDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteCoachingTeam,
    onSuccess: (data) => {
      if (data?.data?.success) {
        handleAlert({ text: 'Coaching team deleted', type: 'success' });
        setPendingDelete(null);
        queryClient.invalidateQueries([COACHING_TEAMS_QUERY_KEY]);
        queryClient.invalidateQueries(['myCoachingTeams']);
      }
    },
    onError: (err: any) => {
      handleAlert({ text: String(err?.response?.data?.error?.message || 'Could not delete the team.'), type: 'error' });
    },
  });

  const needle = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      teams.filter(
        (t) =>
          !needle ||
          String(t.name || '').toLowerCase().includes(needle) ||
          (t.coaches || []).some((p) => String(p.name || '').toLowerCase().includes(needle)) ||
          (t.trainees || []).some((p) => String(p.name || '').toLowerCase().includes(needle)),
      ),
    [teams, needle],
  );
  const ruleLabel = (v: string) => RECORD_RULES.find((r) => r.value === v)?.label || 'Follow the company policy';
  const names = (people: { name: string }[] = []) =>
    people.length ? people.map((p) => p.name).join(', ') : 'Nobody yet';

  useSetAdminPageMeta({
    description: (
      <>
        Coaches and the people they train. Coaches use the{' '}
        <Link to="/coaching" className="underline underline-offset-2">
          Coaching page
        </Link>{' '}
        to watch and listen to their trainees&rsquo; calls.
      </>
    ),
  });

  return (
    <div className="mcm-page flex h-full min-h-0 flex-col">
      {/* The head above already prints "Coaching Teams" and holds the
          sentence on its info button, so this screen printed the pair a
          second time three lines down. Search and the button go up to that
          head, where they sit on the title's line - and at one height: the
          search was the shared Input's 40px while the button was `size=sm`,
          32px, which is why the two never matched. */}
      <AdminHeadActions>
        <label className="mcm-numsearch mcm-headsearch">
          <SearchLine />
          <input
            type="search"
            placeholder="Search teams or people"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {canEdit && (
          <Button
            variant="primary"
            className="min-h-9 h-9"
            onClick={() => setEditing({ open: true, team: null })}
          >
            New coaching team
          </Button>
        )}
      </AdminHeadActions>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {teamsQuery.isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : teamsQuery.isError ? (
          <p className="text-sm text-red-600">
            The coaching teams could not be loaded. If this keeps happening the tenant service may
            not have this feature yet.
          </p>
        ) : visible.length === 0 ? (
          <div className="mcm-coachempty">
            <p className="text-sm font-semibold text-[#2E2D35]">
              {teams.length ? 'No team matches that search.' : 'No coaching teams yet.'}
            </p>
            <p className="mx-auto mt-1 max-w-prose text-xs text-[#9A948F]">
              A coaching team pairs coaches with trainees. It does not take calls: it lets coaches
              see, listen to and review their trainees&rsquo; calls.
            </p>
          </div>
        ) : (
          <div className="mcm-coachcard">
            {/* `COLS` on both the header and every row, so the two cannot
                drift apart - they were two separate copies of the same
                five-column template. */}
            <div className={`mcm-coachhead ${COLS}`}>
              <span>Team</span>
              <span>Coaches</span>
              <span>Trainees</span>
              <span>Recording</span>
              <span className="text-right">Actions</span>
            </div>
            {visible.map((team) => (
              <div key={team.uuid} className={`mcm-coachrow ${COLS}`}>
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{team.name}</p>
                  {team.description ? <p className="truncate text-xs text-gray-500">{team.description}</p> : null}
                </div>
                <p className="truncate text-gray-700" title={names(team.coaches)}>
                  <span className="md:hidden text-xs text-gray-500">Coaches: </span>
                  {names(team.coaches)}
                </p>
                <p className="truncate text-gray-700" title={names(team.trainees)}>
                  <span className="md:hidden text-xs text-gray-500">Trainees: </span>
                  {(team.trainees || []).length
                    ? `${team.trainees.length} ${team.trainees.length === 1 ? 'person' : 'people'} · ${names(team.trainees)}`
                    : 'Nobody yet'}
                </p>
                <p className="text-xs text-gray-600">
                  {ruleLabel(team.record_calls)}
                  {team.record_screen ? ' · screens too' : ''}
                </p>
                {/* The same square row buttons every other Admin list uses,
                    rather than two filled discs in different colours. */}
                <span className="mcm-numacts">
                  {canEdit && (
                    <span
                      className="mcm-rowact flex cursor-pointer items-center justify-center"
                      title="Edit"
                      onClick={() => setEditing({ open: true, team })}
                    >
                      <Icon name="EditStrokIcon" className="h-4 w-4" />
                    </span>
                  )}
                  {canDelete && (
                    <span
                      className="mcm-rowact is-danger flex cursor-pointer items-center justify-center"
                      title="Delete"
                      onClick={() => setPendingDelete(team)}
                    >
                      <Icon name="TrashBin" className="h-4 w-4" />
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {editing.open && (
        <AddEditCoachingTeam team={editing.team} onClose={() => setEditing({ open: false, team: null })} />
      )}
      {pendingDelete && (
        <AlertConfirm
          open
          setOpen={(open: boolean) => !open && setPendingDelete(null)}
          headerText={`Delete "${pendingDelete.name}"?`}
          descriptionTextComp={
            <p className="text-sm text-gray-600">
              Coaches lose their view of these trainees and the team&rsquo;s recording rule stops.
              Recordings already made are kept.
            </p>
          }
          confirmBtnText={isDeleting ? 'Deleting…' : 'Delete'}
          confirmBtnDisabled={isDeleting}
          onConfirm={() => pendingDelete.uuid && mutateDelete(pendingDelete.uuid)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
};

export default CoachingTeamsPage;

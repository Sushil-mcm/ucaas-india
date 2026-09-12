import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import { SearchLine } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useCompanyFeatures } from '@/hooks/rbac';
import { handleAlert } from '@/lib/utils';
import { deleteCoachingTeam, listCoachingTeams } from '@/services/api';
import AddEditCoachingTeam, { COACHING_TEAMS_QUERY_KEY, CoachingTeam, RECORD_RULES } from './add-edit-coaching-team';

/* Coaching teams: the third kind of team. A group is somewhere calls ring, a
   queue is somewhere calls wait; a coaching team routes nothing. It says who
   is training whom, so coaches can watch and listen to their trainees' calls
   from the Coaching page, and so the switch records trainees' calls for
   review when the team asks for it. Stored per tenant (coaching_teams,
   created on first use). */
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

  return (
    <div className="mcm-page flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-lg font-semibold text-gray-900">Coaching Teams</p>
          <p className="text-xs text-gray-500">
            Coaches and the people they train. Coaches use the{' '}
            <Link to="/coaching" className="text-primary underline underline-offset-2">
              Coaching page
            </Link>{' '}
            to watch and listen to their trainees&rsquo; calls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchLine className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              className="h-9 w-56 pl-8 text-sm"
              placeholder="Search teams or people"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canEdit && (
            <Button variant="primary" size="sm" onClick={() => setEditing({ open: true, team: null })}>
              New coaching team
            </Button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {teamsQuery.isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : teamsQuery.isError ? (
          <p className="text-sm text-red-600">
            The coaching teams could not be loaded. If this keeps happening the tenant service may
            not have this feature yet.
          </p>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm font-medium text-gray-900">
              {teams.length ? 'No team matches that search.' : 'No coaching teams yet.'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              A coaching team pairs coaches with trainees. It does not take calls: it lets coaches
              see, listen to and review their trainees&rsquo; calls.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="hidden md:grid grid-cols-[1.2fr_1fr_1.4fr_1fr_auto] gap-4 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
              <span>Team</span>
              <span>Coaches</span>
              <span>Trainees</span>
              <span>Recording</span>
              <span />
            </div>
            {visible.map((team) => (
              <div
                key={team.uuid}
                className="grid grid-cols-1 gap-2 border-t border-gray-100 px-4 py-3 text-sm md:grid-cols-[1.2fr_1fr_1.4fr_1fr_auto] md:items-center md:gap-4"
              >
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
                <span className="flex items-center gap-2">
                  {canEdit && (
                    <span
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                      title="Edit"
                      onClick={() => setEditing({ open: true, team })}
                    >
                      <Icon name="EditStrokIcon" className="h-5 w-5" />
                    </span>
                  )}
                  {canDelete && (
                    <span
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white"
                      title="Delete"
                      onClick={() => setPendingDelete(team)}
                    >
                      <Icon name="TrashBin" className="h-5 w-5" />
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

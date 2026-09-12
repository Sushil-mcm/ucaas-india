import { FC, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CustomSelect from '@/components/custom/custom-select';
import { Switch } from '@/components/ui/switch';
import { CloseIcon } from '@/assets/icons';
import { handleAlert } from '@/lib/utils';
import { saveCoachingTeam } from '@/services/api';
import PeoplePicker, { TeamPerson, useCompanyDirectory } from './people-picker';

export const COACHING_TEAMS_QUERY_KEY = 'coachingTeams';

/* What the switch does with a trainee's own calls. "Their own calls" means a
   call straight to their extension or one they dial; calls they take from a
   queue or a group follow the company policy as before. The team rule can only
   add recording on top of the company's - it never switches one off. */
export const RECORD_RULES = [
  { value: 'off', label: 'Follow the company policy' },
  { value: 'all', label: 'Record every call a trainee makes or takes' },
  { value: 'inbound', label: 'Record calls to a trainee' },
  { value: 'outbound', label: 'Record calls a trainee makes' },
];

export interface CoachingTeam {
  uuid?: string;
  name: string;
  description?: string | null;
  coaches: TeamPerson[];
  trainees: TeamPerson[];
  record_calls: 'off' | 'all' | 'inbound' | 'outbound';
  record_screen?: boolean;
}

const empty = (): CoachingTeam => ({
  name: '',
  description: '',
  coaches: [],
  trainees: [],
  record_calls: 'off',
  record_screen: false,
});

interface Props {
  team: CoachingTeam | null;
  onClose: () => void;
}

const AddEditCoachingTeam: FC<Props> = ({ team, onClose }) => {
  const queryClient: any = useQueryClient();
  const [form, setForm] = useState<CoachingTeam>(empty());
  const [error, setError] = useState('');
  const { people } = useCompanyDirectory();

  useEffect(() => {
    setForm(team ? { ...empty(), ...team, coaches: team.coaches || [], trainees: team.trainees || [] } : empty());
    setError('');
  }, [team]);

  const { mutate, isPending } = useMutation({
    mutationFn: saveCoachingTeam,
    onSuccess: (data) => {
      if (data?.data?.success) {
        handleAlert({ text: form.uuid ? 'Coaching team saved' : 'Coaching team created', type: 'success' });
        queryClient.invalidateQueries([COACHING_TEAMS_QUERY_KEY]);
        queryClient.invalidateQueries(['myCoachingTeams']);
        onClose();
      } else {
        setError(String(data?.data?.error?.message || 'The team could not be saved.'));
      }
    },
    onError: (err: any) => {
      setError(String(err?.response?.data?.error?.message || err?.message || 'The team could not be saved.'));
    },
  });

  const submit = () => {
    const name = form.name.trim();
    if (name.length < 2) return setError('Give the team a name (at least 2 characters).');
    if (!form.coaches.length) return setError('Add at least one coach.');
    setError('');
    mutate({ ...form, name, description: form.description?.trim() || '' });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <p className="text-base font-semibold text-gray-900">
              {form.uuid ? 'Edit coaching team' : 'New coaching team'}
            </p>
            <p className="text-xs text-gray-500">
              Coaches can watch their trainees&rsquo; calls, listen in, and have them recorded for
              review.
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4 flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coaching-name">Team name</Label>
              <Input
                id="coaching-name"
                value={form.name}
                maxLength={100}
                placeholder="e.g. New starters, Sales onboarding"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coaching-desc">Description (optional)</Label>
              <Input
                id="coaching-desc"
                value={form.description || ''}
                maxLength={500}
                placeholder="What this team is for"
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <PeoplePicker
              label="Coaches"
              hint="They see the trainees' live calls on the Coaching page and can listen, whisper or barge."
              value={form.coaches}
              exclude={form.trainees}
              people={people}
              onChange={(coaches) => setForm((f) => ({ ...f, coaches }))}
            />
            <PeoplePicker
              label="Trainees"
              hint="The people being coached. A person cannot be a coach and a trainee of the same team."
              value={form.trainees}
              exclude={form.coaches}
              people={people}
              onChange={(trainees) => setForm((f) => ({ ...f, trainees }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Recording of trainees&rsquo; own calls</Label>
            <CustomSelect
              options={RECORD_RULES}
              value={RECORD_RULES.find((o) => o.value === form.record_calls) || RECORD_RULES[0]}
              handleChange={(opt: any) =>
                setForm((f) => ({ ...f, record_calls: (opt?.value || 'off') as CoachingTeam['record_calls'] }))
              }
              className="w-full max-w-md"
            />
            <p className="text-xs text-gray-500">
              Read by the call switch for calls straight to a trainee and calls they dial. It adds
              to the company recording policy and never switches recording off. Calls through a
              queue or a group follow the company policy. The usual recording notice plays.
            </p>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Also record the trainees&rsquo; screens</p>
              <p className="text-xs text-gray-600">
                On — the app records what is on a trainee&rsquo;s screen during their calls and
                stores it next to the audio. The trainee shares their screen once per shift (the
                app asks); with nothing shared, the call goes on and no screen is recorded.
              </p>
            </div>
            <Switch
              className="cursor-pointer shrink-0"
              checked={Boolean(form.record_screen)}
              onCheckedChange={(checked: boolean) => setForm((f) => ({ ...f, record_screen: checked }))}
              aria-label="Also record the trainees' screens"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <Button type="button" variant="transparent" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={isPending}>
            {isPending ? 'Saving…' : form.uuid ? 'Save team' : 'Create team'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditCoachingTeam;

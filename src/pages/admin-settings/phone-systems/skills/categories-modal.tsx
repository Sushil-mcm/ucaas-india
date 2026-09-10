import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomSelect from '@/components/custom/custom-select';
import { CloseIcon } from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
import { handleAlert } from '@/lib/utils';
import { deleteSkillCategory, upsertSkillCategory } from '@/services/api';
import { SKILLS_QUERY_KEY, SKILL_CATEGORIES_QUERY_KEY, SkillCategory, useSkillCategories } from '@/hooks/use-queue-skills';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

/* The headings skills sit under. Language is the one kind the product
   treats specially (rating words, menu languages); everything else is a
   plain heading named however the business talks - Sales, Customer service,
   Flight booking. A category with skills in it cannot be deleted: move or
   delete the skills first, so nobody's ratings end up under the wrong name. */

const KIND_OPTIONS = [
  { value: 'general', label: 'Skills', description: 'Know-how: Sales, Billing, Flight booking...' },
  { value: 'language', label: 'Languages', description: 'Languages a person can take a call in.' },
];

interface CategoriesModalProps {
  onClose: () => void;
}

const CategoriesModal = ({ onClose }: CategoriesModalProps) => {
  const queryClient: any = useQueryClient();
  const { rows, isLoading } = useSkillCategories();
  const [editing, setEditing] = useState<{ uuid?: string; name: string; kind: string } | null>(null);
  const [error, setError] = useState('');

  const refresh = () => {
    queryClient.invalidateQueries([SKILL_CATEGORIES_QUERY_KEY]);
    queryClient.invalidateQueries([SKILLS_QUERY_KEY]);
  };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: upsertSkillCategory,
    onSuccess: () => {
      handleAlert({ text: editing?.uuid ? 'Category renamed' : 'Category added', type: 'success' });
      setEditing(null);
      setError('');
      refresh();
    },
    onError: (err: any) => setError(err?.response?.data?.message || err?.message || 'Could not save the category.'),
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: deleteSkillCategory,
    onSuccess: () => {
      handleAlert({ text: 'Category deleted', type: 'success' });
      setError('');
      refresh();
    },
    onError: (err: any) => setError(err?.response?.data?.message || err?.message || 'Could not delete the category.'),
  });

  const submit = () => {
    const name = editing?.name?.trim() || '';
    if (name.length < 2) {
      setError('Give the category a name of at least 2 characters.');
      return;
    }
    save({ ...(editing?.uuid ? { uuid: editing.uuid } : {}), name, kind: editing?.kind || 'general' });
  };

  const whyNotDeletable = (row: SkillCategory) =>
    row.is_default
      ? 'General cannot be deleted: it is where a skill goes when no category is chosen.'
      : row.skillCount
        ? `Move or delete its ${row.skillCount} skill${row.skillCount === 1 ? '' : 's'} first.`
        : '';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:w-2/3 md:w-1/3 w-full p-0 max-h-[90%] overflow-hidden flex flex-col" showCloseButton={false}>
        <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-200">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-gray-900">Skill categories</p>
            <p className="text-xs text-gray-500 max-w-prose">
              A skill sits in exactly one category. A queue asks for one skill from each category it
              names: any one inside the category, all of the categories.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 opacity-70 hover:opacity-100 mt-1">
            <CloseIcon className="w-3 h-3" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            rows.map((row) =>
              editing?.uuid === row._id ? (
                <CategoryForm
                  key={row._id}
                  value={editing}
                  onChange={setEditing}
                  onSubmit={submit}
                  onCancel={() => setEditing(null)}
                  saving={saving}
                />
              ) : (
                <div key={row._id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{row.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded-full px-1.5">
                        {row.kind === 'language' ? 'Languages' : 'Skills'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {row.skillCount ? `${row.skillCount} skill${row.skillCount === 1 ? '' : 's'}` : 'No skills yet'}
                    </div>
                  </div>
                  <span
                    className="flex items-center justify-center rounded-full w-8 h-8 cursor-pointer bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                    title="Rename"
                    onClick={() => setEditing({ uuid: row._id, name: row.name, kind: row.kind })}
                  >
                    <Icon name="EditStrokIcon" className="w-4 h-4" />
                  </span>
                  <button
                    type="button"
                    disabled={Boolean(whyNotDeletable(row)) || removing}
                    title={whyNotDeletable(row) || 'Delete'}
                    onClick={() => remove({ uuid: row._id })}
                    className="flex items-center justify-center rounded-full w-8 h-8 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-100 disabled:hover:text-red-500"
                  >
                    <Icon name="TrashBin" className="w-4 h-4" />
                  </button>
                </div>
              ),
            )
          )}

          {editing && !editing.uuid ? (
            <CategoryForm value={editing} onChange={setEditing} onSubmit={submit} onCancel={() => setEditing(null)} saving={saving} />
          ) : (
            <Button type="button" variant="outline" className="min-h-9 self-start" onClick={() => setEditing({ name: '', kind: 'general' })}>
              Add category
            </Button>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CategoryForm = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  saving,
}: {
  value: { uuid?: string; name: string; kind: string };
  onChange: (next: { uuid?: string; name: string; kind: string }) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
}) => (
  <div className="flex flex-wrap items-end gap-2 rounded-xl border border-primary/40 bg-white p-3">
    <div className="flex-1 min-w-[10rem]">
      <Input
        type="text"
        label="Name"
        placeholder="e.g. Sales, Flight booking"
        value={value.name}
        maxLength={50}
        autoFocus
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
    </div>
    <div className="w-40">
      <CustomSelect
        label="Holds"
        options={KIND_OPTIONS}
        value={KIND_OPTIONS.find((o) => o.value === value.kind) || KIND_OPTIONS[0]}
        handleChange={(picked: any) => onChange({ ...value, kind: picked?.value || 'general' })}
      />
    </div>
    <Button type="button" variant="primary" className="min-h-9" disabled={saving} onClick={onSubmit}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
    <Button type="button" variant="transparent" className="min-h-9" onClick={onCancel}>
      Cancel
    </Button>
  </div>
);

export default CategoriesModal;

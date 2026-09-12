import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import { getCallScript } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { STARTING_TEMPLATES, type StartingTemplate } from './starting-templates';
import { dailMethodsArr } from './constants';

interface StartFromProps {
  open: boolean;
  onClose: () => void;
  /* Called with the script the new one should begin from: name, type,
     description and content. The form opens with these filled in. */
  onPick: (start: {
    name: string;
    dialMethod: string;
    description: string;
    script: any[];
    pages?: any[];
  }) => void;
}

/* Where a new script begins. The four starting points ship with the
   platform; below them, whatever this company has saved as a template. */
const StartFrom = ({ open, onClose, onPick }: StartFromProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['getCallScript', 'templates'],
    queryFn: () => getCallScript({ page: 1, limit: 100, filters: [{ key: 'isTemplate', value: true }] }),
    enabled: open,
    refetchOnWindowFocus: false,
  });
  const saved: any[] = data?.data?.data?.result?.rows || [];
  const typeLabel = (value: string) => dailMethodsArr.find((d) => d.value === value)?.label || value;

  const pickBuiltIn = (template: StartingTemplate) =>
    onPick({
      name: template.key === 'blank' ? '' : template.name,
      dialMethod: template.dialMethod,
      description: template.key === 'blank' ? '' : template.description,
      script: JSON.parse(JSON.stringify(template.script)),
      ...(template.pages ? { pages: JSON.parse(JSON.stringify(template.pages)) } : {}),
    });
  const pickSaved = (row: any) =>
    onPick({
      name: `${row?.name || 'Script'} copy`,
      dialMethod: row?.dialMethod || 'PREVIEW',
      description: row?.description || '',
      script: JSON.parse(JSON.stringify(row?.script || [])),
      ...(Array.isArray(row?.pages) && row.pages.length
        ? { pages: JSON.parse(JSON.stringify(row.pages)) }
        : {}),
    });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:w-2/3 md:w-1/2 p-4 max-h-[90vh] overflow-y-auto" showCloseButton={false}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Start a new script from</p>
            <p className="text-xs text-gray-500">
              Every starting point already uses details that fill themselves in on each call, like
              the customer’s name. Change anything you like once it opens.
            </p>
          </div>
          <div onClick={onClose} className="cursor-pointer text-gray-500 opacity-70 hover:opacity-100">
            <CloseIcon className="w-3 h-3" />
          </div>
        </div>

        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Built in</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STARTING_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => pickBuiltIn(t)}
              className="text-left rounded-xl border border-gray-200 p-3 hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900">{t.name}</span>
                <span className="text-[11px] text-gray-500">{typeLabel(t.dialMethod)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
            </button>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Your templates</p>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : saved.length === 0 ? (
          <p className="text-sm text-gray-500">
            None yet. Tick “Save as a template” on any script and it will appear here.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {saved.map((row) => (
              <button
                key={row._id}
                type="button"
                onClick={() => pickSaved(row)}
                className="text-left rounded-xl border border-gray-200 p-3 hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 truncate">{row.name}</span>
                  <span className="text-[11px] text-gray-500">{typeLabel(row.dialMethod)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{row.description || '—'}</p>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StartFrom;

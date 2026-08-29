import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Pencil, Plus, Bot, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu';

const CAPTAIN_API_BASE = '/captain-api/api/captain';
export const SELECTED_ASSISTANT_KEY = 'captain_selected_assistant_id';

export type Assistant = { id: string; name: string };

const COLORS = ['bg-orange-400', 'bg-emerald-400', 'bg-sky-400', 'bg-violet-400', 'bg-rose-400', 'bg-amber-500'];
function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

// Shared "which assistant am I looking at" state for Captain's per-assistant
// pages (Documents, FAQs, ...) — persisted so it survives navigating between them.
export function useSelectedAssistant() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedId, setSelectedId] = useState<string>(() => localStorage.getItem(SELECTED_ASSISTANT_KEY) || '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${CAPTAIN_API_BASE}/assistants`)
      .then((res) => res.json())
      .then((json) => {
        const list: Assistant[] = json.data || [];
        setAssistants(list);
        setSelectedId((prev) => {
          const next = prev && list.some((a) => a.id === prev) ? prev : list[0]?.id || '';
          if (next) localStorage.setItem(SELECTED_ASSISTANT_KEY, next);
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const selectAssistant = (id: string) => {
    setSelectedId(id);
    localStorage.setItem(SELECTED_ASSISTANT_KEY, id);
  };

  return { assistants, selectedId, selectAssistant, isLoading };
}

export function AssistantSwitcher({
  assistants,
  selectedId,
  onSelect,
  pageTitle,
}: {
  assistants: Assistant[];
  selectedId: string;
  onSelect: (id: string) => void;
  pageTitle?: string;
}) {
  const selected = assistants.find((a) => a.id === selectedId);

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-base font-semibold text-gray-950 outline-none hover:bg-gray-100">
          {selected?.name || 'Select assistant'}
          <ChevronDown className="size-4 text-gray-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72 border-gray-200 p-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
            <div>
              <div className="text-sm font-semibold text-gray-950">Assistants</div>
              <div className="text-xs text-gray-500">Switch between assistants</div>
            </div>
            <div className="flex gap-1.5">
              <Link
                to="/admin-settings/captain/assistants"
                className="flex size-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                title="Manage assistants"
              >
                <Pencil className="size-3.5" />
              </Link>
              <Link
                to="/admin-settings/captain/assistants"
                className="flex size-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                title="Add assistant"
              >
                <Plus className="size-3.5" />
              </Link>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {assistants.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-white ${colorFor(a.id)}`}
                >
                  <Bot className="size-3.5" />
                </span>
                <span className="flex-1 truncate text-gray-800">{a.name}</span>
                {a.id === selectedId && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {pageTitle && (
        <>
          <span className="text-gray-300">|</span>
          <span className="text-base font-bold text-gray-950">{pageTitle}</span>
        </>
      )}
    </div>
  );
}

/* Pick a phone model: search, grouped by product line, and it will take a
 * model it has never heard of.
 *
 * A vendor's catalogue runs to thirty-odd part numbers that differ by one
 * character, so scrolling for one is slow and error-prone. Typing is how
 * somebody with the phone in their hand actually finds it: they read the code
 * off the label and want the list to come to them.
 *
 * The search is a plain substring of either the catalogue's own token or the
 * name as the vendor prints it, with case and punctuation ignored - so "942",
 * "spa 942" and "SPA942" all reach SPA942. It is deliberately not fuzzy:
 * matching the letters and digits separately would let "t4" drag in every T
 * model containing a 4, and a short query is the common one.
 *
 * When nothing matches, the query itself becomes the answer: a phone that
 * arrives before the catalogue knows about it can still be added, because the
 * API records an unlisted model rather than refusing it. That replaces the
 * old "Another model…" mode with one less thing to understand.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { groupModels, modelLabel } from '@/lib/desk-phone-setup-guides';

/** Case, spaces and dashes carry no meaning in a part number. */
const key = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '');

type Choice = { model: string; label: string };

const ModelPicker = ({
  vendor,
  models,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  vendor: string;
  models: string[];
  value: string;
  onChange: (model: string) => void;
  placeholder: string;
  invalid?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => groupModels(vendor, models), [vendor, models]);

  /* The groups with only the matching models left in, and the flat order the
     arrow keys walk. A group that keeps nothing is dropped, so the list never
     shows an empty heading. */
  const { shown, order, offered } = useMemo(() => {
    const q = key(query);
    const kept = groups
      .map((group) => ({
        title: group.title,
        choices: group.models
          .map((model) => ({ model, label: modelLabel(vendor, model) }))
          .filter((c) => !q || key(c.model).includes(q) || key(c.label).includes(q)),
      }))
      .filter((group) => group.choices.length > 0);
    const flat: Choice[] = kept.flatMap((group) => group.choices);
    /* Offer the typed text itself unless it is already one of the models. */
    const exact = flat.some((c) => key(c.model) === q);
    const own: Choice | null = query.trim() && !exact ? { model: query.trim(), label: query.trim() } : null;
    return { shown: kept, order: own ? [...flat, own] : flat, offered: own };
  }, [groups, query, vendor]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  /* Keep the highlighted row in view while the arrows move it. */
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (choice: Choice) => {
    onChange(choice.model);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!order.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + order.length) % order.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault(); // never submits the form from inside the list
      if (order[active]) choose(order[active]);
    }
  };

  const chosen = value ? modelLabel(vendor, value) : '';
  let index = -1; // running position in `order`, for the arrow keys

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={`flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 text-left ${
            invalid ? 'border-red-300' : 'border-gray-200'
          }`}
        >
          <span className={chosen ? '' : 'text-gray-500'}>{chosen || 'Choose the model…'}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="mcm-dialog w-[var(--radix-popover-trigger-width)] min-w-64 p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector('input')?.focus();
        }}
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder={`Search ${placeholder} …`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search models"
          />
        </div>

        <div ref={listRef} className="max-h-64 overflow-y-auto py-1" role="listbox">
          {shown.map((group) => (
            <div key={group.title}>
              <div className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {group.title}
              </div>
              {group.choices.map((choice) => {
                index += 1;
                const here = index;
                return (
                  <button
                    key={choice.model}
                    type="button"
                    role="option"
                    aria-selected={choice.model === value}
                    data-active={here === active}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${
                      here === active ? 'bg-gray-100' : ''
                    }`}
                    onMouseEnter={() => setActive(here)}
                    onClick={() => choose(choice)}
                  >
                    <span>{choice.label}</span>
                    {choice.model === value ? <Check className="h-4 w-4 text-gray-500" /> : null}
                  </button>
                );
              })}
            </div>
          ))}

          {offered ? (
            <>
              {shown.length ? <div className="my-1 border-t border-gray-100" /> : null}
              {(() => {
                index += 1;
                const here = index;
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    data-active={here === active}
                    className={`w-full px-3 py-2 text-left text-sm ${here === active ? 'bg-gray-100' : ''}`}
                    onMouseEnter={() => setActive(here)}
                    onClick={() => choose(offered)}
                  >
                    Use “<span className="font-medium">{offered.label}</span>”
                    <span className="block text-xs text-gray-500">
                      {shown.length ? 'A model not on this list.' : 'No model matches. Add it as typed.'}
                    </span>
                  </button>
                );
              })()}
            </>
          ) : null}

          {!shown.length && !offered ? (
            <p className="px-3 py-4 text-sm text-gray-500">No models for this vendor yet.</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ModelPicker;

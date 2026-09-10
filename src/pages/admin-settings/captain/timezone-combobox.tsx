import { useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { TIMEZONES } from './timezones';

type Props = {
  value: string;
  onChange: (iana: string) => void;
  className?: string;
};

/** Searchable timezone picker — Chatwoot-style: current label + chevron trigger,
 * a search box and a scrollable list of "City (GMT±HH:MM)" options. */
const TimezoneCombobox = ({ value, onChange, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const current = useMemo(
    () => TIMEZONES.find((t) => t.value === value)?.label || value || 'Select timezone',
    [value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TIMEZONES;
    return TIMEZONES.filter((t) => t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q));
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setQuery('');
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }}
    >
      <PopoverTrigger
        className={`flex min-h-10 items-center justify-between rounded-xl border border-gray-300 dark:border-border bg-white dark:bg-card px-3 text-sm text-gray-700 dark:text-foreground shadow-sm outline-none focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10 ${className || ''}`}
      >
        <span className="truncate">{current}</span>
        <ChevronDown className="ml-2 size-4 shrink-0 text-gray-400 dark:text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] p-0">
        <div className="border-b border-gray-100 dark:border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="h-8 w-full rounded-lg border border-gray-200 dark:border-border pl-8 pr-3 text-xs text-gray-700 dark:text-foreground outline-none focus:border-primary dark:focus:border-primary"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400 dark:text-muted-foreground">No timezone found.</div>
          ) : (
            filtered.map((t) => (
              <button
                key={`${t.label}`}
                type="button"
                onClick={() => {
                  onChange(t.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-muted ${
                  t.value === value ? 'font-medium text-primary' : 'text-gray-700 dark:text-foreground'
                }`}
              >
                <span className="truncate">{t.label}</span>
                {t.value === value && <Check className="ml-2 size-3.5 shrink-0" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimezoneCombobox;

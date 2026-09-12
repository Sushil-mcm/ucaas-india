import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import { getSection, saveSection } from '@/lib/company-settings-api';
import {
  GRACE_RANGE,
  QUEUE_SECTION,
  describeGrace,
  mergeQueueSettings,
  readGraceSeconds,
} from '@/lib/queue-company-settings';

export const QUEUE_SECTION_QUERY_KEY = ['companySettingsSection', QUEUE_SECTION];

/* Company › Break reasons › Lost connection.
 *
 * When a person's last browser session drops (closed laptop, dead tab, lost
 * network) the queues keep their duty for a grace window and only then sign
 * them out - so a reload does not throw somebody off the queue, and a desk
 * nobody is at does not ring for ever. This is that window, company-wide.
 * The section is saved whole, so the save starts from what is stored and
 * changes only this key. */
const CompanyQueueGrace = () => {
  const queryClient: any = useQueryClient();
  const query = useQuery({
    queryKey: QUEUE_SECTION_QUERY_KEY,
    queryFn: () => getSection(QUEUE_SECTION),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const stored = readGraceSeconds(query.data?.settings);
  const [value, setValue] = useState<string>('');
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setValue(stored === null ? '' : String(stored));
  }, [stored, dirty]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      /* Read fresh, then merge: another screen may own other keys here. */
      const current = await getSection(QUEUE_SECTION);
      const n = value.trim() === '' ? null : Number(value);
      return saveSection({
        section: QUEUE_SECTION,
        settings: mergeQueueSettings(current?.settings, { disconnect_grace_seconds: n }),
        ...(typeof current?.version === 'number' ? { version: current.version } : {}),
      });
    },
    onSuccess: () => {
      handleAlert({ type: 'success', text: 'Lost-connection window saved' });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: QUEUE_SECTION_QUERY_KEY });
    },
  });

  const parsed = value.trim() === '' ? null : Number(value);
  const invalid =
    parsed !== null &&
    (!Number.isFinite(parsed) || parsed < GRACE_RANGE.min || parsed > GRACE_RANGE.max);
  const effective = readGraceSeconds({ disconnect_grace_seconds: parsed });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-gray-500 mt-0.5" aria-hidden="true">
          <WifiOff size={18} />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-gray-900">Lost connection</h3>
          <p className="text-xs text-gray-600">
            When somebody's last browser session drops, the queues keep their duty for this long
            before signing them out. A person who comes back inside the window is exactly as they
            were. Leave it empty for the platform default of {describeGrace(null)}.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 pl-8">
        <div className="w-40">
          <Input
            type="number"
            min={GRACE_RANGE.min}
            max={GRACE_RANGE.max}
            placeholder={String(GRACE_RANGE.default)}
            value={value}
            disabled={query.isLoading}
            onChange={(e) => {
              setValue(e.target.value);
              setDirty(true);
            }}
          />
        </div>
        <span className="text-xs text-gray-600">
          seconds ({GRACE_RANGE.min} to {GRACE_RANGE.max}) · {describeGrace(effective)}
        </span>
        <Button
          type="button"
          variant="primary"
          className="min-h-9"
          disabled={!dirty || invalid || isPending || query.isLoading}
          onClick={() => save()}
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
      {invalid ? (
        <p className="text-xs text-red-600 pl-8">
          Enter between {GRACE_RANGE.min} and {GRACE_RANGE.max} seconds, or leave it empty.
        </p>
      ) : null}
      {query.isError ? (
        <p className="text-xs text-red-600 pl-8">
          Could not read the stored value.{' '}
          <button type="button" className="underline" onClick={() => query.refetch()}>
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
};

export default CompanyQueueGrace;

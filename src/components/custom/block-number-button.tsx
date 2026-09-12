import { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { addBlockedNumbers, getBlockReach } from '@/services/api';
import {
  BLOCK_REASONS,
  DEFAULT_BLOCK_CHOICE,
  TREATMENT_DESCRIPTIONS,
  TREATMENT_LABELS,
  type BlockLine,
  type BlockReach,
  type BlockTreatment,
  LINE_LABELS,
  isEmergencyNumber,
  isShortCode,
  lineChoices,
  prettyNumber,
} from '@/lib/contact-blocking';
import { isExtensionNumber } from '@/lib/utils';
import CustomTooltip from '@/components/custom/custom-tooltip';

/**
 * "Block this number", one click from the row it is on.
 *
 * The reference products block from the conversation you are looking at, not
 * from a settings page you have to go and find. This is that: a small sheet
 * with the number filled in, the two choices that matter (what the caller
 * gets, whose numbers it protects), a reason, and a button. Everything else
 * takes the defaults the Blocked screen would.
 *
 * Nothing inside a table can be blocked from here: an extension or a short
 * code is not a caller. The button simply does not render for those.
 */
type Props = {
  number?: string | null;
  /** Where the block came from, kept on the record. */
  source?: string;
  className?: string;
};

const BlockNumberButton: FC<Props> = ({ number, source = 'call-history', className = '' }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [treatment, setTreatment] = useState<BlockTreatment>(DEFAULT_BLOCK_CHOICE.treatment);
  const [line, setLine] = useState<BlockLine>('personal');
  const [dids, setDids] = useState<string[]>([]);
  const [reason, setReason] = useState(BLOCK_REASONS[0]);
  const clean = String(number || '').trim();
  /* Only read once the sheet is open: a row list should not cost a request per row. */
  const { data: reach = null } = useQuery({
    queryKey: ['blockReach'],
    queryFn: getBlockReach,
    select: (res: any) => (res?.data?.data || null) as BlockReach | null,
    enabled: open,
  });
  const lines = lineChoices(reach);

  if (!clean || isExtensionNumber(clean) || isShortCode(clean) || isEmergencyNumber(clean)) return null;

  const { mutate, isPending } = useMutation({
    mutationFn: addBlockedNumbers,
    onSuccess: (res: any) => {
      const data = res?.data?.data || {};
      if (data?.already?.length && !data?.added?.length) {
        toast.info(`${prettyNumber(clean)} was already blocked.`);
      } else {
        toast.success(`${prettyNumber(clean)} is blocked.`);
      }
      queryClient.invalidateQueries({ queryKey: ['blockedNumbers'] });
      setOpen(false);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.error?.message || error?.response?.data?.message || 'That did not save. Try again.'),
  });

  const sheet = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Block ${prettyNumber(clean)}`}
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900">Block {prettyNumber(clean)}</h3>
            <p className="mt-1 text-sm text-gray-500">
              Calls, faxes and texts from this number will be stopped. You can undo this any time
              under Directory › Blocked.
            </p>

            <label className="mt-4 block text-xs font-semibold text-gray-600">What the caller gets</label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={treatment}
              onChange={(event) => setTreatment(event.target.value as BlockTreatment)}
            >
              {(Object.keys(TREATMENT_LABELS) as BlockTreatment[]).map((key) => (
                <option key={key} value={key}>
                  {TREATMENT_LABELS[key]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">{TREATMENT_DESCRIPTIONS[treatment]}</p>

            <label className="mt-3 block text-xs font-semibold text-gray-600">Whose numbers</label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={line}
              onChange={(event) => setLine(event.target.value as BlockLine)}
            >
              {lines.map((key) => (
                <option key={key} value={key}>
                  {LINE_LABELS[key]}
                </option>
              ))}
            </select>
            {reach?.message ? <p className="mt-1 text-xs text-gray-500">{reach.message}</p> : null}
            {line === 'shared' && reach?.lines?.length ? (
              <div className="mt-2 flex flex-col gap-1">
                {reach.lines.map((item) => (
                  <label key={item.number} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={dids.includes(item.number)}
                      onChange={() =>
                        setDids((prev) => (prev.includes(item.number) ? prev.filter((d) => d !== item.number) : [...prev, item.number]))
                      }
                    />
                    {prettyNumber(item.number)}
                    {item.label ? <span className="text-gray-500">{item.label}</span> : null}
                  </label>
                ))}
              </div>
            ) : null}

            <label className="mt-3 block text-xs font-semibold text-gray-600">Reason</label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {BLOCK_REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || (line === 'shared' && dids.length === 0)}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                onClick={() =>
                  mutate({
                    numbers: [clean],
                    kind: 'number',
                    scope: 'both',
                    treatment,
                    line,
                    ...(line === 'shared' ? { dids } : {}),
                    reason,
                    source,
                  })
                }
              >
                {isPending ? 'Blocking…' : 'Block this number'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <CustomTooltip text="Block this number" side="top">
        <button
          type="button"
          aria-label={`Block ${prettyNumber(clean)}`}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white ${className}`}
        >
          <Ban className="h-4 w-4" />
        </button>
      </CustomTooltip>
      {sheet}
    </>
  );
};

export default BlockNumberButton;

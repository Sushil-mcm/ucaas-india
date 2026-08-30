import { FC, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CloseIcon } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import { invalidateNumberLists } from '@/lib/number-list-cache';
import { callForwarding } from '@/services/api';
import {
  LABEL_MAX_LENGTH,
  buildLabelPatch,
  canEditLabel,
  checkLabel,
  labelOf,
  normaliseLabel,
} from '@/lib/number-labels';

/**
 * Naming one number.
 *
 * Three numbers can ring the same line, and until now the only thing telling
 * them apart on this screen was the digits. A label is the few words that say
 * which is which — "Accounting voicemail", "Invoice footer", "Partner line".
 *
 * The two sentences at the foot are not boilerplate. A label saved here rides
 * inside the number's call-handling record, because that is the only part of a
 * number the platform lets anything change — so removing that number's
 * forwarding, or releasing the number, takes the label with it. Somebody who
 * writes thirty labels and then tidies up a number's routing should have been
 * told that beforehand, not discovered it afterwards.
 */

interface EditNumberLabelProps {
  did: any;
  open: boolean;
  onClose: () => void;
}

const EditNumberLabel: FC<EditNumberLabelProps> = ({ did, open, onClose }) => {
  const queryClient = useQueryClient();
  const [value, setValue] = useState<string>(() => labelOf(did));

  const allowed = canEditLabel(did);
  const check = checkLabel(value);
  const normalised = normaliseLabel(value);
  const unchanged = normalised === labelOf(did);

  const { mutate, isPending } = useMutation({
    mutationFn: callForwarding,
    onSuccess: () => {
      invalidateNumberLists(queryClient);
      handleAlert({
        text: normalised ? 'Label saved.' : 'Label cleared.',
        type: 'success',
      });
      onClose();
    },
    /* A failed save must not read as success: the admin would carry on
       believing the number is named, and the next person to see it would not
       know why it is not. */
    onError: (error: any) => {
      handleAlert({
        text: error?.response?.data?.message || 'The label could not be saved. Please try again.',
        type: 'error',
      });
    },
  });

  const handleSave = () => {
    const patch = buildLabelPatch(did, value);
    if (!patch) return;
    mutate(patch);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="max-w-lg p-4" showCloseButton={false}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="text-md font-semibold text-gray-900">Edit label</div>
            <div className="text-sm text-gray-800">{did?.did_number}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        </div>

        {allowed.ok ? (
          <div className="mt-3 flex flex-col gap-2">
            <Input
              label="Label"
              placeholder="Accounting voicemail"
              value={value}
              maxLength={LABEL_MAX_LENGTH}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
              error={check.ok ? undefined : check.reason}
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Shown beside this number wherever numbers are listed.</span>
              <span>
                {normalised.length}/{LABEL_MAX_LENGTH}
              </span>
            </div>
            {/* Said plainly and up front, because it is the one thing about this
                label a person cannot work out from the screen. */}
            <p className="mt-1 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-800">
              The label is kept with this number&apos;s call handling, so removing its forwarding or
              releasing the number clears it. It appears on these admin screens only — it is not
              shown on the softphone or in call history.
            </p>
          </div>
        ) : (
          <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-800">
            {allowed.reason}
          </p>
        )}

        <DialogFooter>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="transparent" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!allowed.ok || !check.ok || unchanged || isPending}
              onClick={handleSave}
            >
              {isPending ? 'Saving...' : 'Save label'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditNumberLabel;

import { FC, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Check } from 'lucide-react';

import AlertConfirm from '@/components/custom/alert-confirm';
import { Button } from '@/components/ui/button';
import { handleAlert } from '@/lib/utils';
import { addDncCampaign } from '@/services/api';

/**
 * Wrap-up action: add the contact the agent has just spoken to to the personal
 * Do-Not-Call list, without leaving the campaign.
 *
 * An entity-specific do-not-call request has to be honoured and recorded, so the
 * agent needs to be able to do this while the request is still on the call -
 * previously the only route was to leave the campaign, open /campaign/dnc and
 * retype the name and number by hand.
 *
 * Uses the same API function as the manual "Add DNC" form
 * (src/pages/auto-dialer/dnc/addDnc.tsx).
 */

interface AddToDncControlProps {
  /** The campaign contact currently being wrapped up (`selectedContact`). */
  contact: any;
}

/** react-phone-input-2 stores digits only, so keep DNC entries in that shape. */
const normalisePhone = (phone: unknown): string =>
  String(phone ?? '')
    .replace(/[^\d]/g, '')
    .trim();

const AddToDncControl: FC<AddToDncControlProps> = ({ contact }) => {
  const queryClient: any = useQueryClient();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const contactDetails = contact?.contacts?.[0] || {};
  const rawPhone = contactDetails?.phone || '';
  const phone = normalisePhone(rawPhone);
  const fullName = `${contactDetails?.firstName || ''} ${contactDetails?.lastName || ''}`.trim();
  const displayName = fullName || rawPhone || 'this contact';
  const email = contactDetails?.email || '';

  // A new contact means a new wrap-up, so the "added" confirmation resets.
  useEffect(() => {
    setIsAdded(false);
    setIsConfirmOpen(false);
  }, [contact?._id, contact?.contactId, phone]);

  const { mutate: addToDnc, isPending } = useMutation({
    mutationFn: addDncCampaign,
    onSuccess: () => {
      setIsAdded(true);
      setIsConfirmOpen(false);
      handleAlert({
        text: `${displayName} added to the Do-Not-Call list.`,
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['getPersonalDncList'] });
    },
    onError: () => {
      setIsConfirmOpen(false);
      handleAlert({
        text: 'Could not add this number to the Do-Not-Call list. Please try again.',
        type: 'error',
      });
    },
  });

  const handleConfirm = () => {
    if (!phone) return;
    addToDnc({
      phone,
      // The DNC form requires a name of at least 2 characters.
      name: fullName.length >= 2 ? fullName : rawPhone || 'Campaign contact',
      ...(email ? { email } : {}),
    });
  };

  if (!phone) return null;

  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
      <div className="flex flex-col">
        <p className="text-sm font-semibold text-red-900">Do-Not-Call request</p>
        <p className="text-xs text-red-800">
          Caller asked not to be contacted again? Add them here.
        </p>
      </div>
      {isAdded ? (
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-green-700">
          <Check className="h-4 w-4" />
          Added to DNC
        </span>
      ) : (
        <Button
          type="button"
          variant="destructiveOutline"
          className="shrink-0"
          onClick={() => setIsConfirmOpen(true)}
          disabled={isPending}
        >
          <Ban className="h-4 w-4" />
          {isPending ? 'Adding...' : 'Add to Do-Not-Call'}
        </Button>
      )}

      <AlertConfirm
        open={isConfirmOpen}
        setOpen={setIsConfirmOpen}
        apiLoading={isPending}
        headerText="Add to Do-Not-Call list"
        confirmBtnText="Add to DNC"
        onConfirm={handleConfirm}
        descriptionTextComp={
          <span className="flex flex-col gap-2 text-md">
            <span>
              This adds <b>{displayName}</b> ({rawPhone}) to your Do-Not-Call list. They will not be
              dialled by your campaigns again.
            </span>
            <span className="text-sm text-gray-500">
              Use this when the person asks not to be called again. It does not replace your
              disposition - finish the wrap-up as usual.
            </span>
          </span>
        }
      />
    </div>
  );
};

export default AddToDncControl;

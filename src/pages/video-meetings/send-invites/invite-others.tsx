import { FC, useEffect, useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Loader from '@/components/custom/loader';
import { CloseIcon, Minus } from '@/assets/icons';

interface InviteOthersModalProps {
  formInstance: any;
  modalState: boolean;
  setModalState: (open: boolean) => void;
  handleSendInvite?: () => void;
  isPending?: boolean;
}

const InviteOthersModal: FC<InviteOthersModalProps> = ({
  modalState,
  setModalState,
  formInstance,
  handleSendInvite,
  isPending,
}) => {
  const { watch, setValue } = formInstance;
  const [localInviteOthers, setLocalInviteOthers] = useState<any[]>([]);
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set());
  const [invalidIndices, setInvalidIndices] = useState<Set<number>>(new Set());
  const parentInviteOthers = watch('inviteOthers') || [];

  useEffect(() => {
    if (modalState) {
      setLocalInviteOthers(
        parentInviteOthers?.length > 0
          ? parentInviteOthers?.map((p: any) => ({ ...p }))
          : [{ email: '', type: 'GUEST', name: '', user_uuid: '' }],
      );
      setDuplicateIndices(new Set());
      setInvalidIndices(new Set());
    }
  }, [modalState, parentInviteOthers]);

  const handleAdd = () => {
    setLocalInviteOthers([
      ...localInviteOthers,
      { email: '', type: 'GUEST', name: '', user_uuid: '' },
    ]);
  };
  const handleRemove = (index: number) =>
    setLocalInviteOthers(localInviteOthers?.filter((_, i) => i !== index));

  const normalizeEmail = (email: string) => (email || '').trim().toLowerCase();
  const isValidEmail = (email: string) => {
    const value = normalizeEmail(email);
    if (!value) return false;
    // simple RFC 5322-inspired pattern, sufficient for client-side
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return pattern.test(value);
  };

  const recomputeDuplicates = (list: any[]) => {
    const counts: Record<string, number> = {};
    const newDuplicates = new Set<number>();
    list.forEach((item) => {
      const key = normalizeEmail(item?.email);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    list.forEach((item, i) => {
      const key = normalizeEmail(item?.email);
      if (!key) return;
      if (counts[key] > 1) newDuplicates.add(i);
    });
    setDuplicateIndices(newDuplicates);
  };

  const recomputeInvalids = (list: any[]) => {
    const newInvalids = new Set<number>();
    list.forEach((item, i) => {
      const value = normalizeEmail(item?.email);
      if (!value) return; // ignore empty rows for invalid marking
      if (!isValidEmail(value)) newInvalids.add(i);
    });
    setInvalidIndices(newInvalids);
  };

  const handleEmailChange = (index: number, value: string) => {
    const updated = localInviteOthers?.map((item, i) =>
      i === index ? { ...item, email: value } : item,
    );
    setLocalInviteOthers(updated);
    recomputeDuplicates(updated);
    recomputeInvalids(updated);
  };

  const uniqueEmails = Array.from(
    new Set(
      localInviteOthers
        ?.map((item) => normalizeEmail(item?.email))
        ?.filter((e) => !!e && isValidEmail(e)),
    ),
  );
  const participantCount = uniqueEmails?.length;

  const handleInviteClick = () => {
    if (duplicateIndices?.size > 0) return;
    const filteredList = localInviteOthers?.filter((item) => item?.email?.trim() !== '');
    if (filteredList?.length === 0) return;
    setValue('inviteOthers', filteredList, { shouldValidate: true });
    handleSendInvite?.();
  };

  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent className="sm:w-2/6 p-3" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80 ">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Invite Others
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-gray-900 text-sm">
            Invite your friends to collaborate on this meeting
          </p>
          <div className="overflow-auto max-h-[300px] flex flex-col gap-2">
            {localInviteOthers?.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2 justify-between">
                <div className="flex gap-1 w-full">
                  <Input
                    placeholder="Enter Email"
                    type="email"
                    value={field?.email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    className={
                      duplicateIndices?.has(index) || invalidIndices.has(index)
                        ? 'border-red-500'
                        : ''
                    }
                    error={
                      duplicateIndices?.has(index)
                        ? 'Duplicate email'
                        : invalidIndices?.has(index)
                          ? 'Invalid email'
                          : ''
                    }
                  />
                </div>
                {/* {duplicateIndices.has(index) && (
                  <small className="text-red-500 whitespace-nowrap">Duplicate email</small>
                )} */}
                {localInviteOthers?.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="cursor-pointer flex items-center justify-center rounded-xl w-10 h-10 bg-white border border-red-500 hover:bg-red-500 hover:text-white text-red-500"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleAdd}
                  className="cursor-pointer flex items-center justify-center rounded-xl w-10 h-10 bg-white border border-primary hover:bg-primary hover:text-white text-primary"
                >
                  <Icon name="Plus" className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="gap-2.5 flex items-center pt-2">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center">
              <h5 className="text-white font-medium text-sm">
                {participantCount ? participantCount : 0}
              </h5>
            </div>
            <div className="flex flex-col gap-0.5">
              <small className="font-light text-xs">Participants selected</small>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 w-full">
          <Button variant={'transparent'} onClick={() => setModalState(false)}>
            Cancel
          </Button>
          <Button
            variant={'primary'}
            type="submit"
            onClick={handleInviteClick}
            disabled={
              participantCount === 0 ||
              duplicateIndices.size > 0 ||
              invalidIndices.size > 0 ||
              isPending
            }
          >
            {isPending ? (
              <div className="flex items-center justify-center p-5">
                <Loader variant="blue" size="sm" />
              </div>
            ) : (
              'Invite'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteOthersModal;

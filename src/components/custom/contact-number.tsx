import { FC, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Pencil } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import NumberWithFlag from '@/components/custom/number-with-flag';
import SideDrawer from '@/components/custom/side-drawer';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import CreateContactNew from '@/pages/new-contact/create-new-contact';
import { useContactBook, useContactForNumber } from '@/hooks/use-contact-suggestions';
import { addContactPhone } from '@/services/api';
import { handleAlert, isExtensionNumber } from '@/lib/utils';

/**
 * A phone number the way a phone shows it: the saved name when there is one,
 * otherwise the number with an "Add" action that opens the contact sheet with
 * the number filled in, or adds it to a contact that already exists.
 *
 * Every list that shows an outside number goes through this, so a caller is
 * named at display time, not only when the call record was written.
 *
 * The sheet is portalled to the body: mounted inside a table cell it inherits
 * the table's stacking context and the sticky pagination bar paints over its
 * Submit button.
 */
type ContactNumberProps = {
  number?: string | null;
  /** A name the row already carries (from the call record); shown when nothing is saved. */
  fallbackName?: string | null;
  /** Hide the Add action (read-only places). */
  readOnly?: boolean;
  className?: string;
};

const ContactNumber: FC<ContactNumberProps> = ({ number, fallbackName, readOnly = false, className = '' }) => {
  const contactFor = useContactForNumber();
  const [open, setOpen] = useState(false);
  const clean = String(number || '').trim();
  const saved = clean ? contactFor(clean) : null;
  const isInside = !clean || isExtensionNumber(clean) || clean.replace(/\D/g, '').length < 7;

  if (!clean) return <span className="text-gray-400">Unknown</span>;

  return (
    <span className={`inline-flex flex-col gap-0.5 min-w-0 ${className}`}>
      {saved?.name || fallbackName ? (
        <span className="font-medium text-gray-900 truncate">{saved?.name || fallbackName}</span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <NumberWithFlag number={clean} />
        {!readOnly && !isInside ? (
          <button
            type="button"
            title={saved ? 'Edit contact' : 'Add to contacts'}
            aria-label={saved ? 'Edit contact' : 'Add to contacts'}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-primary"
          >
            {saved ? <Pencil className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </span>
      {open
        ? createPortal(
            <QuickContactDrawer number={clean} contactId={saved?.id || null} onClose={() => setOpen(false)} />,
            document.body,
          )
        : null}
    </span>
  );
};

export default ContactNumber;

/**
 * The contact sheet for one number. Opened on the modal layer (isHeader):
 * the plain drawer layer sits under a table's sticky pagination bar, which
 * covered the Submit button. New contact by default; "Add to an
 * existing contact" puts the number on someone already saved instead.
 */
export const QuickContactDrawer: FC<{
  number: string;
  contactId?: string | null;
  onClose: () => void;
}> = ({ number, contactId, onClose }) => {
  const queryClient = useQueryClient();
  const { contacts } = useContactBook();
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [target, setTarget] = useState<{ label: string; value: string } | null>(null);

  const existing = useMemo(() => contacts.find((c) => c.id === contactId) || null, [contacts, contactId]);
  /* Opened as an edit sheet, and the number just stopped belonging to that
     contact (Remove): close rather than flip into an "Add" sheet. */
  useEffect(() => {
    if (contactId && contacts.length && !existing) onClose();
  }, [contactId, contacts.length, existing, onClose]);
  const options = useMemo(
    () =>
      contacts
        .filter((c) => c.name)
        .map((c) => ({ label: `${c.name}${c.phone ? ` · ${c.phone}` : ''}`, value: c.id })),
    [contacts],
  );

  const { mutate: addToExisting, isPending } = useMutation({
    mutationFn: () => addContactPhone({ contact_id: String(target?.value), phone: number, label: 'other' }),
    onSuccess: () => {
      handleAlert({ text: `Number added to ${target?.label?.split(' · ')[0] || 'the contact'}.`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['getContactList'] });
      onClose();
    },
    onError: (error: any) => {
      handleAlert({
        text: error?.response?.data?.message || error?.message || 'Could not add the number.',
        type: 'error',
      });
    },
  });

  // Editing someone already saved: straight to their sheet.
  if (existing) {
    return (
      <SideDrawer
        isOpen
        isHeader
        title="Edit contact"
        handleClose={onClose}
        content={
          <CreateContactNew
            contactData={existing.raw || { _id: existing.id }}
            isDisable={false}
            setIsDisable={() => void 0}
            setDrawerState={() => void 0}
            keepFormDataAfterSave
            isLead={false}
            handleClose={onClose}
          />
        }
      />
    );
  }

  return (
    <SideDrawer
      isOpen
      isHeader
      title="Add to contacts"
      handleClose={onClose}
      content={
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`rounded-full border px-3 py-1 ${mode === 'new' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600'}`}
            >
              New contact
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`rounded-full border px-3 py-1 ${mode === 'existing' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600'}`}
            >
              Add to an existing contact
            </button>
          </div>
          {mode === 'new' ? (
            <div className="min-h-0 flex-1">
              {/* keepFormDataAfterSave: the form's other path navigates to a
                  contact page that does not exist; this drawer simply closes. */}
              <CreateContactNew
                isDisable={false}
                setIsDisable={() => void 0}
                setDrawerState={() => void 0}
                keepFormDataAfterSave
                isLead={false}
                prefillPhone={number}
                hideCancelButton
                handleClose={onClose}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-600">
                Put <span className="font-medium text-gray-900">{number}</span> on a contact you already have.
              </p>
              <CustomSelect
                label="Contact"
                options={options}
                value={target}
                placeholder="Pick a contact"
                handleChange={(v: any) => setTarget(v || null)}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="transparent" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" disabled={!target || isPending} onClick={() => addToExisting()}>
                  {isPending ? 'Saving…' : 'Add number'}
                </Button>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};

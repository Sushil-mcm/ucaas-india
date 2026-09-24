import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import Loader from './loader';
import { CloseIcon } from '@/assets/icons';
import { cn } from '@/lib/utils';

interface AlertConfirmationProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onConfirm: any;
  onCancel?: any;
  onClose?: () => void;
  apiLoading?: boolean;
  descriptionTextComp?: any;
  closeBtnText?: string;
  confirmBtnText?: string;
  showButton?: boolean;
  headerText?: string;
  singleButton?: boolean;
  singleButtonText?: string;
  singleButtonHandler?: any;
  className?: string;
  confirmBtnDisabled?: boolean;
}

const AlertConfirm = ({
  open,
  setOpen,
  onConfirm,
  onCancel,
  onClose,
  apiLoading,
  descriptionTextComp,
  closeBtnText,
  confirmBtnText,
  showButton = true,
  headerText = 'Confirm',
  singleButton = false,
  singleButtonText = 'Confirm',
  singleButtonHandler = () => {},
  className,
  confirmBtnDisabled = false,
}: AlertConfirmationProps) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        /* Sized to its content, not to the viewport.

           This was `w-full sm:w-1/2 md:w-1/3 lg:1/4`, and `lg:1/4` is a typo —
           the `w-` is missing, so that class has never existed and the box
           stayed a third of the window at every size above md. A third of a
           1280px screen is 427px; a third of a 1920px one is 640px, for the
           same two lines of text. That is where the emptiness came from: the
           dialog grew with the monitor while its contents did not.

           A max-width holds it at a readable measure on any screen, and the
           w-[calc] keeps the phone case from touching the edges. */
        className={cn('w-[calc(100%-2rem)] gap-0 p-0 sm:max-w-[440px]', className)}
        /* Lighter than the shared bg-black/50: these confirmations are small
           and sit over a page you are still reading. A wash rather than a
           blackout, and no blur. Scoped here rather than changed globally. */
        overlayClassName="bg-black/30"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* A real DialogTitle, not a styled div. Radix needs one to name the
            dialog for screen readers — without it the whole thing announces
            as unlabelled, and it warns in the console about exactly this. */}
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
          <DialogTitle className="truncate text-[15px] font-semibold text-[#1a1a1a]">
            {headerText}
          </DialogTitle>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              setOpen(false);
              onClose?.();
            }}
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#8a7a67] opacity-70 transition hover:bg-[#f5ece1] hover:opacity-100"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        </div>

        {/* asChild because DialogDescription renders a <p>, and every caller
            passes a <div> of icon + text into it — a div inside a p is
            invalid and the browser closes the paragraph early, which is why
            the spacing here never behaved. */}
        <DialogDescription asChild>
          <div className="px-5 pb-5 text-sm text-[#5a5550]">
            {descriptionTextComp || <span>Are you sure you want to delete this record?</span>}
          </div>
        </DialogDescription>

        {/* The actions sit on their own band. It gives the box a floor —
            without it the buttons floated in the same space as the message
            and the whole thing read as unfinished. */}
        {singleButton && (
          <div className="flex w-full justify-end gap-2 border-t border-[rgba(150,100,50,0.12)] bg-[rgba(251,246,239,0.7)] px-5 py-4">
            <Button
              variant={'primary'}
              className="min-w-[120px]"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                singleButtonHandler?.();
              }}
            >
              {singleButtonText || 'Confirm'}
            </Button>
          </div>
        )}
        {showButton && !singleButton && (
          <div className="flex w-full justify-end gap-2 border-t border-[rgba(150,100,50,0.12)] bg-[rgba(251,246,239,0.7)] px-5 py-4">
            <Button
              variant={'transparent'}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onCancel?.();
              }}
            >
              {closeBtnText || 'Cancel'}
            </Button>
            {/* `primary` so the action you came here to take looks like the
                action. Both buttons were outlined before, which left the
                choice unweighted. */}
            <Button
              variant={'primary'}
              className="min-w-[120px]"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onConfirm(e);
              }}
              disabled={apiLoading || confirmBtnDisabled}
            >
              {apiLoading ? <Loader variant="blue" /> : confirmBtnText || 'Confirm'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AlertConfirm;

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
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
        className={cn('w-full sm:w-1/2 md:w-1/3 lg:1/4 p-3', className)}
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1.5 text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            {headerText}
            <div
              onClick={() => {
                setOpen(false);
                onClose?.();
              }}
              className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        {/* <DialogTitle className=" text-gray-900 text-xl font-medium"></DialogTitle> */}
        <DialogDescription>
          {descriptionTextComp || (
            <div className=" text-md">Are you sure, you want to delete this record?</div>
          )}
        </DialogDescription>
        {singleButton && (
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant={'outline'}
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
          <div className="flex justify-end gap-2 w-full">
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
            <Button
              variant={'outline'}
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

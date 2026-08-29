import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import Loader from '@/components/custom/loader';

interface TermsModalationProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onConfirm: any;
  onCancel?: any;
  apiLoading?: boolean;
  descriptionTextComp?: any;
  closeBtnText?: string;
  confirmBtnText?: string;
}

const TermsModal = ({
  open,
  setOpen,
  onConfirm,
  apiLoading,
  descriptionTextComp,
  confirmBtnText,
}: TermsModalationProps) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="w-1/4 p-3"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* <DialogTitle className=" text-gray-900 text-xl font-medium"></DialogTitle> */}
        <DialogDescription>
          {descriptionTextComp || (
            <div className="flex">
              <div className=" text-md">
                The terms displayed in this page may be subject to change at the sole discretion of
                the MNO
              </div>
            </div>
          )}
        </DialogDescription>

        <div className="flex justify-end gap-2  w-full">
          {/* <Button
                        variant={'transparent'}
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                            onCancel();
                        }}
                    >
                        {closeBtnText || 'Cancel'}
                    </Button> */}
          <Button
            variant={'primary'}
            className="min-w-[120px]"
            type="submit"
            onClick={onConfirm}
            disabled={apiLoading}
          >
            {apiLoading ? <Loader variant="blue" /> : confirmBtnText || 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsModal;

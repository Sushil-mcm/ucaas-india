import { CloseIcon } from '@/assets/icons';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface AddGroupLeadModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  templateData: any;
}

function TemplateModal({ modalState, setModalState, templateData = {} }: AddGroupLeadModalProps) {
  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-1/4 p-3  max-h-[99%] overflow-y-auto" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80 ">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Selected Template
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="border border-grey-400 rounded-lg p-3 w-full gap-2 flex flex-col h-72 max-h-72 overflow-y-auto">
            <div className="text-left text-md font-semibold">
              {templateData?.components[0]?.text || ''}
            </div>
            <div className="text-left text-sm font-normal">
              {templateData?.components[1]?.text || ''}
            </div>
            <div className="text-left text-sm text-grey-400">
              {templateData?.components[2]?.text || ''}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateModal;

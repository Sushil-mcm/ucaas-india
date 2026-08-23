import { CloseIcon } from '@/assets/icons';
import ForwardingActions from '@/components/custom/forwarding-actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

interface AiForwardProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
}
const AiForward: FC<AiForwardProps> = ({ modalState, setModalState }) => {
  const {
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext();

  const handleSubmit = async () => {
    const isValid = await trigger(['callHandling.businessHours.ai_forward_to.value.value']);
    if (!isValid) return;
    setModalState(false);
  };
  const handleCancel = () => {
    setModalState(false);
  };
  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="w-fit p-3 max-h-[99%]  overflow-y-auto" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Forward to AI
            <div
              onClick={handleCancel}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <ForwardingActions
          setValue={setValue}
          watch={watch}
          errors={errors}
          forwardState="callHandling.businessHours.ai_forward_to"
          description="Set how you'd like your calls to be forwarded."
          isUser={true}
          SITE_UUID={watch('basic.site.value')}
          selectedUserExt={watch('basic.extension')}
        />
        <DialogFooter>
          <div className="flex justify-end gap-2">
            <Button type="button" variant={'transparent'} onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" variant={'outline'} onClick={() => handleSubmit()}>
              Submit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AiForward;

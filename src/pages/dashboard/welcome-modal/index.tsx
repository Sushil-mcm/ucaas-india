import { FC, useEffect, useState } from 'react';
import Hand from '@/assets/images/Hand.png';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export const WelcomeModalPopup: FC = () => {
  const [modalState, setModalState] = useState(false);

  useEffect(() => {
    const isPopup = sessionStorage.getItem('welcomePopup');
    if (isPopup) {
      setModalState(true);
      sessionStorage.removeItem('welcomePopup');
    }
  }, []);

  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent
        className="w-full sm:w-1/2 md:w-2/6 xxl:w-2/7 p-8"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex min-h-full items-center justify-center text-center ">
          <div className="flex flex-col gap-3 w-full">
            <div className="gap-3 flex items-center justify-center">
              <img src={Hand} alt="Hand" />
              <h3 className="text-black text-2xl font-semibold text-start">Welcome to UCAAS!</h3>
            </div>

            <div className="flex flex-col items-start gap-4">
              <p className="text-grey-800 text-base font-normal text-center">
                Thank you for choosing us to be part of your journey. We are excited to have you on
                board and ready to help you with all your needs.
              </p>
            </div>
            <div className="flex justify-center mt-4">
              <Button
                variant={'outline'}
                onClick={() => setModalState(false)}
                type="button"
                className="focus:outline-0"
              >
                Start Exploring
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

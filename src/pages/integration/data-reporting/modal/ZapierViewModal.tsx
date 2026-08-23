import { CloseIcon } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toTitleCase } from '@/lib/utils';
import { crmZapData, McmLogo, getMcmLogoIcon } from '@/pages/integration/constant';
import { useOrganization } from '@/hooks/use-organisation';

const ZapierViewModal = ({
  modalOpen,
  handleClose,
  setModalOpen,
}: {
  modalOpen: string;
  handleClose: () => void;
  setModalOpen: (val: string | null) => void;
}) => {
  const { mainSiteInfo } = useOrganization();
  const modalTitle = modalOpen ? toTitleCase(modalOpen) : '';
  const data = crmZapData[modalOpen];

  return (
    <Dialog open={!!modalOpen} onOpenChange={(val) => !val && setModalOpen(null)}>
      <DialogContent
        className="lg:w-1/2 p-3 max-h-[99%] w-full overflow-auto"
        showCloseButton={false}
      >
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            {modalTitle}
            <div
              onClick={handleClose}
              className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>

        {data?.zaps?.map((zap, index) => (
          <div
            key={index}
            className="sm:flex-row flex-col flex sm:items-center gap-4 justify-between border rounded-md border-gray-200 p-3 hover:shadow-sm transition"
          >
            <div className="flex sm:flex-row flex-col sm:items-center gap-4">
              <div className="flex gap-1 mt-1">
                {zap?.icons?.map((icon, i) => (
                  <img
                    key={i}
                    src={icon === McmLogo ? getMcmLogoIcon(mainSiteInfo) : icon}
                    alt="icon"
                    className="w-8 h-8 object-contain border rounded-sm p-1"
                  />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-sm w-full sm:min-w-[375px] whitespace-normal">
                  {zap.label}
                </span>
                <span className="text-xs text-gray-500">{zap.subtitle}</span>
              </div>
            </div>
            <div className="flex">
              <Button variant={'outline'} onClick={() => window?.open(zap?.url)}>
                Use this Zap
              </Button>
            </div>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default ZapierViewModal;

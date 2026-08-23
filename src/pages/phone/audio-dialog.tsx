import { FC, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media';
import ReadyAudio from '@/components/custom/ready-audio';
import { Skeleton } from '@/components/ui/skeleton';

interface AudioModalProps {
  modalState: boolean;
  setModalState: (val: boolean) => void;
  serRecordingUrl: (val: any) => void;
  srcUrl: string | null;
}

const AudioModal: FC<AudioModalProps> = ({
  modalState,
  setModalState,
  srcUrl,
  serRecordingUrl,
}) => {
  const {
    data: authenticatedSrcUrl,
    isLoading: isMediaLoading,
    isError: hasMediaError,
  } = useAuthenticatedMediaUrl(srcUrl || '', modalState);

  useEffect(() => {
    if (!modalState) {
      serRecordingUrl('');
    }
  }, [modalState, serRecordingUrl]);

  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent className="w-1/4 p-3" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80 ">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Play Audio
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer  text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <DialogDescription>
          {hasMediaError ? (
            <p className="py-3 text-center text-sm text-red-500">Unable to load this recording.</p>
          ) : isMediaLoading ? (
            <Skeleton className="h-10 w-full rounded-full bg-gray-200" />
          ) : authenticatedSrcUrl ? (
            <ReadyAudio controls src={authenticatedSrcUrl} autoPlay />
          ) : null}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default AudioModal;

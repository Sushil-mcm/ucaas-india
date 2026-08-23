import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { CloseIcon } from '@/assets/icons';
import { Button } from '../ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Loader from './loader';

const FileCropper = forwardRef(
  (
    {
      image = null,
      modalState,
      setModalState,
      handleUpload,
      uploadMediaLoad,
      loader,
      setLoader,
    }: any,
    ref,
  ) => {
    const cropperRef = useRef<any>(null);
    const getCropData = () => {
      if (typeof cropperRef?.current?.cropper !== 'undefined') {
        return cropperRef.current?.cropper.getCroppedCanvas().toDataURL();
      }
    };

    useImperativeHandle(ref, () => {
      return { getCropData };
    }, []);

    useEffect(() => {
      if (modalState) {
        setLoader(false);
      }
    }, [modalState]);

    return (
      <Dialog open={modalState} onOpenChange={setModalState}>
        <DialogContent className="w-1/4 p-3" showCloseButton={false}>
          <div className="flex flex-col gap-1.5 p-3 bg-ucass-primary-200 text-primary rounded-xl border border-gray-200">
            <div className="font-semibold truncate text-md flex items-center justify-between">
              Crop Image
              <div
                onClick={() => setModalState(false)}
                className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>
          </div>
          <Cropper
            ref={cropperRef}
            className="cropperBox"
            style={{ height: '100%', width: '100%', textAlign: 'center' }}
            zoomTo={0.5}
            initialAspectRatio={1}
            preview=".img-preview"
            src={image}
            viewMode={1}
            minCropBoxHeight={10}
            minCropBoxWidth={10}
            background={false}
            responsive={true}
            autoCropArea={1}
            checkOrientation={false}
            guides={true}
          />
          <div className="flex justify-end gap-2  w-full">
            <Button variant={'secondary'} onClick={() => setModalState(false)} type="button">
              Close
            </Button>
            <Button type="submit" onClick={handleUpload}>
              {uploadMediaLoad || loader ? (
                <div className="flex items-center justify-center p-5">
                  <Loader variant="blue" size="sm" />
                </div>
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  },
);

export default FileCropper;

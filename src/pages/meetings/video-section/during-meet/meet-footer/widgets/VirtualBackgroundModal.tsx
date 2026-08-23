import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useJitsi } from '@/hooks/use-jitsi';
import { getVirtualBackgroundList } from '@/services/jitsi/virtual-background/constants';
import { toggleBackgroundEffect } from '@/services/jitsi/virtual-background/toggleBackgroundsEffect';
import { stopAndDisposeJitsiTrack } from '@/services/jitsi/media-cleanup';
import { useEffect, useRef, useState } from 'react';

// const blobToData = (blob: any) =>
//   new Promise((resolve) => {
//     const reader = new FileReader();
//     reader.onloadend = () => resolve(reader.result?.toString());
//     reader.readAsDataURL(blob);
//   });

// const toDataURL = async (url: string) => {
//   return new Promise((resolve, reject) => {
//     fetch(url + '?not-from-cache-please')
//       .then((response) => response.blob())
//       .then(async (blob) => {
//         const resData = await blobToData(blob);
//         resolve(resData);
//       })
//       .catch((error) => {
//         reject(error);
//       });
//   });
// };

const VirtualBackgroundModal = ({ handleClose = () => null }: { handleClose?: () => void }) => {
  const { localVideoTrack, cameraDeviceId, virtualBackgroundOptions, setVirtualBackgroundOptions } =
    useJitsi();
  const videoRef = useRef<any>(null);
  const [backgroundList, setBackgroundList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory] = useState('abstract');
  const [options, setOptions] = useState<any>(
    virtualBackgroundOptions || {
      backgroundEffectEnabled: false,
      selectedThumbnail: 'none',
      backgroundType: null,
      blurValue: null,
      virtualSource: null,
    },
  );
  const [previewVideoTrack, setPreviewVideoTrack] = useState<any>(null);

  useEffect(() => {
    getBackgroundsList();
  }, [selectedCategory]);

  useEffect(() => {
    // Initialize options from context when modal opens
    if (virtualBackgroundOptions) {
      setOptions(virtualBackgroundOptions);
    }
  }, [virtualBackgroundOptions]);

  useEffect(() => {
    const trackToAttach = previewVideoTrack || localVideoTrack;
    const videoElement = videoRef.current;
    if (videoElement && trackToAttach) {
      trackToAttach.attach(videoElement);
    }

    return () => {
      if (videoElement && trackToAttach) {
        trackToAttach.detach(videoElement);
      }
    };
  }, [localVideoTrack, previewVideoTrack]);

  useEffect(() => {
    let mounted = true;
    let createdTrack: any = null;

    const createPreviewTrack = async () => {
      if (!window?.JitsiMeetJS?.createLocalTracks) return;

      try {
        const createdTracks = await window.JitsiMeetJS.createLocalTracks({
          devices: ['video'],
          ...(cameraDeviceId ? { cameraDeviceId } : {}),
        });
        createdTrack = createdTracks.find((track: any) => track?.getType?.() === 'video');
        if (mounted && createdTrack) {
          setPreviewVideoTrack(createdTrack);
        } else if (createdTrack) {
          void stopAndDisposeJitsiTrack(createdTrack);
        }
      } catch (error) {
        console.error('Failed to create virtual background preview track:', error);
      }
    };

    createPreviewTrack();

    return () => {
      mounted = false;
      if (createdTrack) {
        void stopAndDisposeJitsiTrack(createdTrack);
      }
    };
  }, [cameraDeviceId]);

  useEffect(() => {
    if (!previewVideoTrack || !options) return;

    toggleBackgroundEffect(options, previewVideoTrack);
  }, [options, previewVideoTrack]);

  const getBackgroundsList = () => {
    setLoading(true);
    getVirtualBackgroundList()
      .then((response: any) => {
        if (response.status === 200) {
          setBackgroundList(response.data);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const setImageBackground = (image: any) => {
    const newOptions = {
      backgroundEffectEnabled: true,
      selectedThumbnail: image.uuid,
      backgroundType: 'image',
      blurValue: null,
      virtualSource: image.background,
    };
    // Keep selection local to the modal. Real track mutation happens only on Apply.
    setOptions(newOptions);
  };

  const removeBackground = () => {
    const newOptions = {
      backgroundEffectEnabled: false,
      selectedThumbnail: 'none',
      backgroundType: null,
      blurValue: null,
      virtualSource: null,
    };
    // Keep selection local to the modal. Real track mutation happens only on Apply.
    setOptions(newOptions);
  };

  const applyVirtualBackground = async () => {
    if (localVideoTrack && options) {
      await toggleBackgroundEffect(options, localVideoTrack);

      // Save the applied background options to context
      setVirtualBackgroundOptions(options);

      const video: any = document.querySelector('#custom_jitsi_LVideo_container');
      if (video && localVideoTrack.stream) {
        video.srcObject = localVideoTrack.stream;

        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => video.play()).catch(() => video.pause());
        }
      }
    }
    handleClose();
  };

  const handleCloseModal = () => {
    handleClose();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="w-1/3 p-3 max-h-[99%] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Virtual Background</DialogTitle>
        </DialogHeader>
        <div>
          <div className="rounded-xl w-full relative">
            <div className="relative w-full h-full overflow-hidden rounded-xl flex justify-center mb-3">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="relative z-10 w-80 h-40 object-cover rounded-xl"
                style={{
                  transform: 'rotateY(180deg)',
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {backgroundList.length > 0 ? (
                  backgroundList.map((image: any, index) => (
                    <div
                      className={`w-12 h-11 rounded overflow-hidden border-2 transition-all duration-200 relative ${
                        options?.selectedThumbnail === image.uuid
                          ? 'border-ucass-active ring-2 ring-ucass-active-bg'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      key={index}
                    >
                      <img
                        className="w-full h-full cursor-pointer"
                        key={index}
                        onClick={() => setImageBackground(image)}
                        src={image.background}
                        loading="lazy"
                      />
                      {options?.selectedThumbnail === image.uuid && (
                        <div className="absolute top-0 right-0 bg-ucass-active text-white rounded-bl-md w-4 h-4 flex items-center justify-center">
                          <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    {!loading && selectedCategory === 'upload' && (
                      <p>Images you upload will appear here</p>
                    )}
                  </>
                )}
                <span
                  className={`w-12 h-11 rounded bg-gray-700 flex items-center justify-center text-white cursor-pointer border-2 transition-all duration-200 relative ${
                    options?.selectedThumbnail === 'none' || !options?.backgroundEffectEnabled
                      ? 'border-ucass-active ring-2 ring-ucass-active-bg'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  onClick={removeBackground}
                >
                  <small>None</small>
                  {(options?.selectedThumbnail === 'none' || !options?.backgroundEffectEnabled) && (
                    <div className="absolute top-0 right-0 bg-ucass-active text-white rounded-bl-md w-4 h-4 flex items-center justify-center">
                      <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </span>
              </div>
              {/* <div className="flex flex-wrap gap-2">
                <span
                  className="w-12 h-11 rounded bg-ucass-active flex items-center justify-center text-white cursor-pointer"
                  onClick={removeBackground}
                >
                  <small>None</small>
                </span>
              </div> */}
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="ml-auto flex gap-2">
            <Button variant={'transparent'} type="button" onClick={() => handleCloseModal()}>
              Cancel
            </Button>
            <Button
              variant={'outline'}
              type="button"
              disabled={!localVideoTrack}
              onClick={applyVirtualBackground}
            >
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VirtualBackgroundModal;

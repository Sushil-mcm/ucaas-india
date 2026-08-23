import {
  forwardRef,
  type AudioHTMLAttributes,
  type ImgHTMLAttributes,
  type VideoHTMLAttributes,
} from 'react';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media';

export const AuthenticatedAudio = forwardRef<
  HTMLAudioElement,
  AudioHTMLAttributes<HTMLAudioElement>
>(({ src = '', ...props }, ref) => {
  const { data: authenticatedSrc } = useAuthenticatedMediaUrl(src, Boolean(src));
  return <audio {...props} ref={ref} src={authenticatedSrc || undefined} />;
});

AuthenticatedAudio.displayName = 'AuthenticatedAudio';

export const AuthenticatedVideo = forwardRef<
  HTMLVideoElement,
  VideoHTMLAttributes<HTMLVideoElement>
>(({ src = '', ...props }, ref) => {
  const { data: authenticatedSrc } = useAuthenticatedMediaUrl(src, Boolean(src));
  return <video {...props} ref={ref} src={authenticatedSrc || undefined} />;
});

AuthenticatedVideo.displayName = 'AuthenticatedVideo';

export const AuthenticatedImage = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(
  ({ src = '', ...props }, ref) => {
    const { data: authenticatedSrc } = useAuthenticatedMediaUrl(src, Boolean(src));
    return <img {...props} ref={ref} src={authenticatedSrc || undefined} />;
  },
);

AuthenticatedImage.displayName = 'AuthenticatedImage';

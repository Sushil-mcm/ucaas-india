import { Skeleton } from '@/components/ui/skeleton';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media';
import { cn } from '@/lib/utils';
import { useEffect, useState, type AudioHTMLAttributes } from 'react';

type ReadyAudioProps = AudioHTMLAttributes<HTMLAudioElement> & {
  authenticated?: boolean;
  loadingClassName?: string;
};

const ReadyAudio = ({
  authenticated = false,
  className,
  loadingClassName,
  onCanPlay,
  onError,
  onLoadStart,
  src,
  ...props
}: ReadyAudioProps) => {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const {
    data: authenticatedSrc,
    isLoading: isAuthenticatedSrcLoading,
    isError: hasAuthenticatedSrcError,
  } = useAuthenticatedMediaUrl(String(src || ''), authenticated && Boolean(src));
  const resolvedSrc = authenticated ? authenticatedSrc || undefined : src;
  const isLoading = isAuthenticatedSrcLoading || !isReady;
  const isError = hasAuthenticatedSrcError || hasError;

  useEffect(() => {
    setIsReady(false);
    setHasError(false);
  }, [src]);

  return (
    <div className="w-full" aria-busy={isLoading && !isError}>
      {isLoading && !isError ? (
        <Skeleton
          className={cn('h-10 w-full rounded-full bg-gray-200', loadingClassName)}
          aria-label="Loading audio preview"
        />
      ) : null}

      {isError ? (
        <p className="py-2 text-center text-xs text-red-500">Unable to load this audio.</p>
      ) : null}

      <audio
        {...props}
        src={resolvedSrc}
        preload="auto"
        className={cn('h-10 w-full', className, (!isReady || isError) && 'hidden')}
        onLoadStart={(event) => {
          setIsReady(false);
          setHasError(false);
          onLoadStart?.(event);
        }}
        onCanPlay={(event) => {
          setIsReady(true);
          setHasError(false);
          onCanPlay?.(event);
        }}
        onError={(event) => {
          setIsReady(false);
          setHasError(true);
          onError?.(event);
        }}
      />
    </div>
  );
};

export default ReadyAudio;

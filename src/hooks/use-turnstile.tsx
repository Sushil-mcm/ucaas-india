import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';
const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const DEFAULT_TURNSTILE_SITE_KEY = '0x4AAAAAAAJIystrqehYNKVT';

type TurnstileTheme = 'auto' | 'light' | 'dark';
type TurnstileSize = 'normal' | 'compact' | 'flexible';

type TurnstileRenderOptions = {
  sitekey: string;
  action?: string;
  theme?: TurnstileTheme;
  size?: TurnstileSize;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': (errorCode?: string) => void;
  'timeout-callback': () => void;
  'refresh-expired': 'auto';
  'response-field': false;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<TurnstileApi> | null = null;

const loadTurnstile = () => {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const handleLoad = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
        reject(new Error('Cloudflare Turnstile did not initialize.'));
      }
    };

    const handleError = () => {
      document.getElementById(TURNSTILE_SCRIPT_ID)?.remove();
      reject(new Error('Unable to load Cloudflare Turnstile. Please try again.'));
    };

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    turnstileScriptPromise = null;
    throw error;
  });

  return turnstileScriptPromise;
};

export type UseTurnstileOptions = {
  siteKey?: string;
  action?: string;
  theme?: TurnstileTheme;
  size?: TurnstileSize;
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string) => void;
};

export const useTurnstile = ({
  siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || DEFAULT_TURNSTILE_SITE_KEY,
  action,
  theme = 'auto',
  size = 'flexible',
  onVerify,
  onExpire,
  onError,
}: UseTurnstileOptions = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callbacksRef.current = { onVerify, onExpire, onError };
  }, [onError, onExpire, onVerify]);

  const clearVerification = useCallback(() => {
    setToken(null);
    setIsLoading(true);
  }, []);

  const reset = useCallback(() => {
    clearVerification();
    setError(null);

    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [clearVerification]);

  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    setError(null);
    setToken(null);

    void loadTurnstile()
      .then((turnstile) => {
        if (isCancelled || !containerRef.current) return;

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme,
          size,
          callback: (verificationToken) => {
            if (isCancelled) return;
            setToken(verificationToken);
            setIsLoading(false);
            setError(null);
            callbacksRef.current.onVerify?.(verificationToken);
          },
          'expired-callback': () => {
            if (isCancelled) return;
            clearVerification();
            callbacksRef.current.onExpire?.();
          },
          'error-callback': (errorCode) => {
            if (isCancelled) return;
            setToken(null);
            setIsLoading(false);
            setError('Security verification failed. Please try again.');
            callbacksRef.current.onError?.(errorCode);
          },
          'timeout-callback': () => {
            if (isCancelled) return;
            clearVerification();
            callbacksRef.current.onExpire?.();
          },
          'refresh-expired': 'auto',
          'response-field': false,
        });
      })
      .catch((loadError: unknown) => {
        if (isCancelled) return;
        setIsLoading(false);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load Cloudflare Turnstile. Please try again.',
        );
        callbacksRef.current.onError?.();
      });

    return () => {
      isCancelled = true;

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, clearVerification, siteKey, size, theme]);

  return {
    containerRef,
    token,
    isVerified: Boolean(token),
    isLoading,
    error,
    reset,
  };
};

export type TurnstileHandle = {
  reset: () => void;
};

export type TurnstileProps = UseTurnstileOptions & {
  className?: string;
};

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(
  ({ className = '', ...options }, ref) => {
    const { containerRef, isVerified, isLoading, error, reset } = useTurnstile(options);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    return (
      <div className={className}>
        <div ref={containerRef} aria-label="Security verification" />
        <div className="mt-2 min-h-5 text-sm" aria-live="polite">
          {error && (
            <span className="text-red-600" role="alert">
              {error}
            </span>
          )}
          {!error && isVerified && <span className="text-green-600">Verification complete.</span>}
          {!error && isLoading && <span className="text-gray-500">Checking your browser…</span>}
        </div>
      </div>
    );
  },
);

Turnstile.displayName = 'Turnstile';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Pull a human-readable message out of an axios-style error, falling back to a
 * caller-supplied default. Used so a failed request tells the user what went
 * wrong instead of silently rendering an "empty" state.
 */
export const getApiErrorMessage = (error: any, fallback = 'Something went wrong. Please try again.') => {
  const message =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    (typeof error?.message === 'string' && !error?.message?.startsWith('{') ? error.message : '');
  return String(message || fallback).trim();
};

interface ListErrorStateProps {
  onRetry?: () => void;
  title?: string;
  description?: string;
  isRetrying?: boolean;
}

/**
 * Shown in place of a list when its fetch fails, so an error is not
 * indistinguishable from "nothing here yet".
 */
export const ListErrorState = ({
  onRetry,
  title = "Couldn't load this list",
  description = 'The request failed. Check your connection and try again.',
  isRetrying = false,
}: ListErrorStateProps) => (
  <div className="w-full mx-auto max-w-250 min-h-52 lg:min-h-80 bg-white p-4 rounded-lg m-auto border border-gray-100 flex flex-col items-center justify-center gap-2 text-center">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
      <AlertTriangle className="h-5 w-5" />
    </div>
    <p className="font-medium text-gray-900">{title}</p>
    <p className="text-sm text-gray-600 max-w-80">{description}</p>
    {onRetry && (
      <Button
        variant="outline"
        size="sm"
        type="button"
        className="mt-1"
        onClick={onRetry}
        disabled={isRetrying}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {isRetrying ? 'Retrying…' : 'Try again'}
      </Button>
    )}
  </div>
);

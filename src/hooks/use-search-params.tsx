import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * A utility hook for managing URL search params in React Router with robust error handling.
 */
export function useSearchParamManager() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /**
   * Internal helper to perform navigation safely.
   */
  function safeNavigate(search: string) {
    try {
      navigate({ search }, { replace: true });
    } catch (error) {
      console.error('Navigation error:', error);
      // On error, clear all params
      navigate({ search: '' }, { replace: true });
    }
  }

  // Overloads for setParam
  function setParam(key: string, value: string): void;
  function setParam(params: Record<string, string>): void;
  function setParam(keyOrParams: string | Record<string, string>, value?: string) {
    try {
      const params = new URLSearchParams(searchParams.toString());

      if (typeof keyOrParams === 'string') {
        params.set(keyOrParams, value as string);
      } else {
        Object.entries(keyOrParams).forEach(([key, val]) => {
          params.set(key, val);
        });
      }

      safeNavigate(params.toString());
    } catch (error) {
      console.error('Error setting param(s):', error);
      clearAllParams();
    }
  }

  // Overloads for removeParam
  function removeParam(key: string): void;
  function removeParam(keys: string[]): void;
  function removeParam(keyOrKeys: string | string[]) {
    try {
      const params = new URLSearchParams(searchParams.toString());

      if (Array.isArray(keyOrKeys)) {
        keyOrKeys.forEach((key) => params.delete(key));
      } else {
        params.delete(keyOrKeys);
      }

      safeNavigate(params.toString());
    } catch (error) {
      console.error('Error removing param(s):', error);
      clearAllParams();
    }
  }

  /**
   * Clear all search params.
   */
  function clearAllParams() {
    try {
      safeNavigate('');
    } catch (error) {
      console.error('Error clearing all params:', error);
      window.location.search = '';
    }
  }

  /**
   * Get a single search param value, or null if absent or on error.
   */
  function getParam(key: string): string | null {
    try {
      return searchParams.get(key);
    } catch (error) {
      console.error(`Error getting param "${key}":`, error);
      return null;
    }
  }

  /**
   * Get all search params as a key/value object.
   */
  function getAllParams(): Record<string, string> {
    try {
      const result: Record<string, string> = {};
      for (const [key, value] of searchParams.entries()) {
        result[key] = value;
      }
      return result;
    } catch (error) {
      console.error('Error getting all params:', error);
      return {};
    }
  }

  return {
    setParam,
    removeParam,
    clearAllParams,
    getParam,
    getAllParams,
  };
}

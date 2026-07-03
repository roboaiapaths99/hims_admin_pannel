import { useState } from 'react';
import { AxiosError } from 'axios';

interface UseApiMutationReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  execute: (fn: () => Promise<T>) => Promise<T | null>;
}

/**
 * Hook for handling API mutations with loading and error state
 * Replaces repetitive useState patterns in forms
 */
export const useApiMutation = <T = any>(
  onSuccess?: (data: T) => void,
  onError?: (error: string) => void
): UseApiMutationReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (fn: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fn();
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'An unexpected error occurred';

      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, execute };
};

/**
 * Hook for handling API queries with loading and error state
 */
export const useApiQuery = <T = any>(
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
  }
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (options?.enabled === false) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await queryFn();
        setData(result);
        options?.onSuccess?.(result);
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to fetch data';

        setError(errorMessage);
        options?.onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, isLoading, error };
};

import React from 'react';

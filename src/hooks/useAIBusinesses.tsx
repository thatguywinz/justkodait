/**
 * Hook for fetching AI-generated businesses based on location
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Business, BusinessCategory } from '@/types/database';

interface UseAIBusinessesOptions {
  category?: BusinessCategory | null;
}

export function useAIBusinesses(options: UseAIBusinessesOptions = {}) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<string | null>(null);

  const discoverBusinesses = useCallback(async (location: string) => {
    setLoading(true);
    setError(null);
    setSearchedLocation(location);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('discover-businesses', {
        body: { location, category: options.category },
      });

      if (fnError) {
        let message = 'Failed to discover businesses';
        try {
          if (fnError.context && typeof fnError.context.json === 'function') {
            const errorBody = await fnError.context.json();
            if (errorBody?.error) {
              message = errorBody.error;
            }
          }
        } catch {
          if (data?.error) {
            message = typeof data.error === 'string' ? data.error : message;
          }
        }
        setError(new Error(message));
        setBusinesses([]);
        return { ok: false as const, message };
      }

      if (data?.error) {
        const message = typeof data.error === 'string' ? data.error : 'Failed to discover businesses';
        setError(new Error(message));
        setBusinesses([]);
        return { ok: false as const, message };
      }

      setBusinesses(data?.businesses || []);
      return { ok: true as const };
    } catch (err) {
      console.error('Error discovering businesses:', err);
      const message = err instanceof Error ? err.message : 'Failed to discover businesses';
      setError(new Error(message));
      setBusinesses([]);
      return { ok: false as const, message };
    } finally {
      setLoading(false);
    }
  }, [options.category]);

  const clearBusinesses = useCallback(() => {
    setBusinesses([]);
    setSearchedLocation(null);
  }, []);

  return {
    businesses,
    loading,
    error,
    searchedLocation,
    discoverBusinesses,
    clearBusinesses,
  };
}

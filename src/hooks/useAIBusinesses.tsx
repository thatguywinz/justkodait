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
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setBusinesses(data.businesses || []);
    } catch (err) {
      console.error('Error discovering businesses:', err);
      setError(err instanceof Error ? err : new Error('Failed to discover businesses'));
      setBusinesses([]);
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

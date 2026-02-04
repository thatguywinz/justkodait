/**
 * Business Discovery Context
 * Shared state for AI-discovered businesses across pages
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Business, BusinessCategory } from '@/types/database';

interface DiscoveryContextType {
  businesses: Business[];
  loading: boolean;
  error: Error | null;
  searchedLocation: string | null;
  discoverBusinesses: (location: string, category?: BusinessCategory | null) => Promise<{ ok: boolean; message?: string }>;
  clearBusinesses: () => void;
}

const DiscoveryContext = createContext<DiscoveryContextType | null>(null);

export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<string | null>(null);

  const discoverBusinesses = useCallback(async (location: string, category?: BusinessCategory | null) => {
    setLoading(true);
    setError(null);
    setSearchedLocation(location);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('discover-businesses', {
        body: { location, category },
      });

      // Check data.error first for our custom error messages
      if (data?.error) {
        const message = typeof data.error === 'string' ? data.error : 'Failed to discover businesses';
        setError(new Error(message));
        // Don't clear businesses on error - keep previous results
        return { ok: false, message };
      }

      if (fnError) {
        const message = fnError.message || 'Failed to discover businesses';
        setError(new Error(message));
        return { ok: false, message };
      }

      setBusinesses(data?.businesses || []);
      return { ok: true };
    } catch (err) {
      console.error('Error discovering businesses:', err);
      const message = err instanceof Error ? err.message : 'Failed to discover businesses';
      setError(new Error(message));
      return { ok: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearBusinesses = useCallback(() => {
    setBusinesses([]);
    setSearchedLocation(null);
    setError(null);
  }, []);

  return (
    <DiscoveryContext.Provider
      value={{
        businesses,
        loading,
        error,
        searchedLocation,
        discoverBusinesses,
        clearBusinesses,
      }}
    >
      {children}
    </DiscoveryContext.Provider>
  );
}

export function useDiscovery() {
  const context = useContext(DiscoveryContext);
  if (!context) {
    throw new Error('useDiscovery must be used within a DiscoveryProvider');
  }
  return context;
}

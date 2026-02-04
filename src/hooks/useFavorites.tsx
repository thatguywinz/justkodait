/**
 * Hook for managing user favorites
 * Provides add/remove functionality and favorites list
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Favorite, Business } from '@/types/database';
import { toast } from 'sonner';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteBusinesses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: favData } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id);

    if (favData) {
      setFavorites(favData as Favorite[]);
      
      // Fetch business details for favorites
      const businessIds = favData.map(f => f.business_id);
      if (businessIds.length > 0) {
        const { data: businessData } = await supabase
          .from('businesses')
          .select('*')
          .in('id', businessIds);
        
        setFavoriteBusinesses((businessData as Business[]) || []);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback((businessId: string) => {
    return favorites.some(f => f.business_id === businessId);
  }, [favorites]);

  const addFavorite = async (businessId: string) => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      return false;
    }

    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, business_id: businessId });

    if (error) {
      if (error.code === '23505') {
        toast.info('Already in favorites');
      } else {
        toast.error('Failed to add favorite');
      }
      return false;
    }

    toast.success('Added to favorites!');
    await fetchFavorites();
    return true;
  };

  const removeFavorite = async (businessId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('business_id', businessId);

    if (error) {
      toast.error('Failed to remove favorite');
      return false;
    }

    toast.success('Removed from favorites');
    await fetchFavorites();
    return true;
  };

  const toggleFavorite = async (businessId: string) => {
    if (isFavorite(businessId)) {
      return removeFavorite(businessId);
    } else {
      return addFavorite(businessId);
    }
  };

  return {
    favorites,
    favoriteBusinesses,
    loading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    refetch: fetchFavorites,
  };
}

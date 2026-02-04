/**
 * Hook for fetching and filtering businesses
 * Provides search, category filtering, and sorting capabilities
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Business, BusinessCategory, Deal } from '@/types/database';

interface UseBusinessesOptions {
  category?: BusinessCategory | null;
  searchQuery?: string;
  sortBy?: 'rating' | 'reviews' | 'name' | 'distance';
  userLocation?: { lat: number; lng: number } | null;
  maxDistance?: number; // in km
}

export function useBusinesses(options: UseBusinessesOptions = {}) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [deals, setDeals] = useState<Record<string, Deal[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchBusinesses();
    fetchDeals();
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('average_rating', { ascending: false });

    if (error) {
      setError(error);
    } else {
      setBusinesses((data as Business[]) || []);
    }
    setLoading(false);
  };

  const fetchDeals = async () => {
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('is_active', true);

    if (data) {
      const dealsByBusiness: Record<string, Deal[]> = {};
      (data as Deal[]).forEach(deal => {
        if (!dealsByBusiness[deal.business_id]) {
          dealsByBusiness[deal.business_id] = [];
        }
        dealsByBusiness[deal.business_id].push(deal);
      });
      setDeals(dealsByBusiness);
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filteredBusinesses = useMemo(() => {
    let result = [...businesses];

    // Filter by category
    if (options.category) {
      result = result.filter(b => b.category === options.category);
    }

    // Filter by search query
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      result = result.filter(
        b =>
          b.name.toLowerCase().includes(query) ||
          b.description?.toLowerCase().includes(query) ||
          b.address.toLowerCase().includes(query)
      );
    }

    // Filter by distance if user location is available
    if (options.userLocation && options.maxDistance) {
      result = result.filter(b => {
        if (!b.latitude || !b.longitude) return true;
        const distance = calculateDistance(
          options.userLocation!.lat,
          options.userLocation!.lng,
          b.latitude,
          b.longitude
        );
        return distance <= options.maxDistance!;
      });
    }

    // Sort
    switch (options.sortBy) {
      case 'rating':
        result.sort((a, b) => b.average_rating - a.average_rating);
        break;
      case 'reviews':
        result.sort((a, b) => b.review_count - a.review_count);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'distance':
        if (options.userLocation) {
          result.sort((a, b) => {
            const distA = a.latitude && a.longitude
              ? calculateDistance(options.userLocation!.lat, options.userLocation!.lng, a.latitude, a.longitude)
              : Infinity;
            const distB = b.latitude && b.longitude
              ? calculateDistance(options.userLocation!.lat, options.userLocation!.lng, b.latitude, b.longitude)
              : Infinity;
            return distA - distB;
          });
        }
        break;
      default:
        result.sort((a, b) => b.average_rating - a.average_rating);
    }

    return result;
  }, [businesses, options.category, options.searchQuery, options.sortBy, options.userLocation, options.maxDistance]);

  return {
    businesses: filteredBusinesses,
    allBusinesses: businesses,
    deals,
    loading,
    error,
    refetch: fetchBusinesses,
  };
}

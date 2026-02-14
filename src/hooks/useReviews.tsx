/**
 * Hook for managing reviews
 * Provides CRUD operations for business reviews
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Review } from '@/types/database';
import { toast } from 'sonner';

export function useReviews(businessId?: string) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReviewsForBusiness = useCallback(async (bizId: string) => {
    setLoading(true);
    // Use the public view that excludes user_id for privacy
    const { data, error } = await supabase
      .from('reviews_public' as any)
      .select('*')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReviews(data as unknown as Review[]);
    }
    setLoading(false);
    return (data as unknown as Review[]) || [];
  }, []);

  const fetchUserReviews = useCallback(async () => {
    if (!user) {
      setUserReviews([]);
      return [];
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUserReviews(data as Review[]);
    }
    setLoading(false);
    return (data as Review[]) || [];
  }, [user]);

  const addReview = async (businessId: string, rating: number, comment?: string) => {
    if (!user) {
      toast('Please sign in to leave a review', {
        action: {
          label: 'Sign In',
          onClick: () => window.location.href = '/auth',
        },
      });
      return null;
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        business_id: businessId,
        user_id: user.id,
        rating,
        comment,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('You have already reviewed this business');
      } else {
        toast.error('Failed to submit review');
      }
      return null;
    }

    toast.success('Review submitted!');
    return data as Review;
  };

  const updateReview = async (reviewId: string, rating: number, comment?: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('reviews')
      .update({ rating, comment })
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update review');
      return null;
    }

    toast.success('Review updated!');
    return data as Review;
  };

  const deleteReview = async (reviewId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to delete review');
      return false;
    }

    toast.success('Review deleted');
    return true;
  };

  return {
    reviews,
    userReviews,
    loading,
    fetchReviewsForBusiness,
    fetchUserReviews,
    addReview,
    updateReview,
    deleteReview,
  };
}

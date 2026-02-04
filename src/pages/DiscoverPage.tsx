/**
 * Discover Page Component
 * Tinder-style swipe discovery for businesses
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Compass, RefreshCw, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { CategoryFilter } from '@/components/business/CategoryFilter';
import { SwipeCard } from '@/components/discover/SwipeCard';
import { BusinessDetail } from '@/components/business/BusinessDetail';
import { useDiscovery } from '@/contexts/DiscoveryContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Business, BusinessCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());

  const { businesses, loading, searchedLocation } = useDiscovery();
  const { isFavorite, addFavorite } = useFavorites();

  // Filter businesses by category
  const filteredBusinesses = useMemo(() => {
    if (!selectedCategory) return businesses;
    return businesses.filter(b => b.category === selectedCategory);
  }, [businesses, selectedCategory]);

  // Filter out already swiped businesses
  const availableBusinesses = filteredBusinesses.filter(b => !swipedIds.has(b.id));
  const currentBusiness = availableBusinesses[0];

  // Create empty deals map for AI businesses
  const deals: Record<string, never[]> = {};

  // Load swipe history for logged-in users
  useEffect(() => {
    if (user) {
      loadSwipeHistory();
    }
  }, [user]);

  const loadSwipeHistory = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('swipe_history')
      .select('business_id')
      .eq('user_id', user.id);
    
    if (data) {
      setSwipedIds(new Set(data.map(s => s.business_id)));
    }
  };

  const recordSwipe = async (businessId: string, direction: 'left' | 'right') => {
    if (!user) return;

    // Only record for real DB businesses (AI businesses have 'ai-' prefix)
    if (businessId.startsWith('ai-')) return;

    await supabase
      .from('swipe_history')
      .insert({
        user_id: user.id,
        business_id: businessId,
        direction,
      });
  };

  const handleSwipeLeft = useCallback(() => {
    if (!currentBusiness) return;
    
    recordSwipe(currentBusiness.id, 'left');
    setSwipedIds(prev => new Set([...prev, currentBusiness.id]));
    toast.info('Skipped!', { duration: 1000 });
  }, [currentBusiness]);

  const handleSwipeRight = useCallback(async () => {
    if (!currentBusiness) return;
    
    recordSwipe(currentBusiness.id, 'right');
    setSwipedIds(prev => new Set([...prev, currentBusiness.id]));
    
    if (user) {
      // Note: For AI businesses, favorites won't persist to DB since they don't have real IDs
      toast.success('Added to favorites!', { duration: 1500 });
    } else {
      toast.success('Great choice! Sign in to save favorites.', { duration: 2000 });
    }
  }, [currentBusiness, user]);

  const handleReset = () => {
    setSwipedIds(new Set());
    toast.success('Cards reset! Swipe away.');
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  return (
    <PageContainer className="flex flex-col items-center">
      {/* Header */}
      <div className="w-full text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold">
          <Compass className="h-6 w-6 text-primary" />
          Discover
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Swipe right to save, left to skip
        </p>
        {searchedLocation && (
          <p className="mt-1 text-xs text-primary">
            Near: {searchedLocation}
          </p>
        )}
      </div>

      {/* Categories */}
      <div className="mt-4 w-full">
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={(cat) => {
            setSelectedCategory(cat);
          }}
        />
      </div>

      {/* Swipe Area */}
      <div className="mt-6 flex flex-1 flex-col items-center justify-center">
        {!searchedLocation ? (
          // No location searched yet
          <div className="text-center">
            <div className="mb-4 flex h-[300px] w-[320px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border p-6">
              <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-foreground">Enter a location first</p>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                Search for an address on the Home tab to discover local gems to swipe through
              </p>
            </div>
            <Button onClick={handleGoToHome} className="mt-4">
              Go to Home
            </Button>
          </div>
        ) : loading ? (
          <div className="text-center text-muted-foreground">
            <div className="mb-4 h-[450px] w-[320px] animate-pulse rounded-3xl bg-muted" />
            <p>Loading local gems...</p>
          </div>
        ) : availableBusinesses.length === 0 ? (
          <div className="text-center">
            <div className="mb-4 flex h-[300px] w-[320px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border">
              <p className="text-lg font-medium text-muted-foreground">No more to discover!</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedCategory ? 'Try a different category' : 'Check back later for new gems'}
              </p>
            </div>
            <Button onClick={handleReset} variant="outline" className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          </div>
        ) : currentBusiness ? (
          <SwipeCard
            key={currentBusiness.id}
            business={currentBusiness}
            deals={deals[currentBusiness.id] ?? []}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onTap={() => setSelectedBusiness(currentBusiness)}
          />
        ) : null}
      </div>

      {/* Progress */}
      {searchedLocation && availableBusinesses.length > 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {availableBusinesses.length} more to discover
        </div>
      )}

      {/* Business Detail */}
      <BusinessDetail
        business={selectedBusiness}
        deals={selectedBusiness ? deals[selectedBusiness.id] ?? [] : []}
        isOpen={!!selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
        isFavorite={selectedBusiness ? isFavorite(selectedBusiness.id) : false}
        onFavoriteToggle={() => {
          if (selectedBusiness) {
            addFavorite(selectedBusiness.id);
          }
        }}
      />
    </PageContainer>
  );
}

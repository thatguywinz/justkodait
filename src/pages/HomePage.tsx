/**
 * Home Page Component
 * Main feed with search, filters, and business listings
 */

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { SearchBar } from '@/components/business/SearchBar';
import { CategoryFilter } from '@/components/business/CategoryFilter';
import { BusinessCard } from '@/components/business/BusinessCard';
import { BusinessDetail } from '@/components/business/BusinessDetail';
import { useBusinesses } from '@/hooks/useBusinesses';
import { useFavorites } from '@/hooks/useFavorites';
import { Business, BusinessCategory } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'name' | 'distance'>('rating');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const { businesses, deals, loading } = useBusinesses({
    searchQuery,
    category: selectedCategory,
    sortBy,
  });

  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <PageContainer className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <KeyRound className="h-6 w-6 text-primary" />
            Koda
          </h1>
          <p className="text-sm text-muted-foreground">The key to your neighborhood</p>
        </div>
      </div>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Categories */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {loading ? 'Loading...' : `${businesses.length} local gems found`}
      </div>

      {/* Business List */}
      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          // Skeleton loading state
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : businesses.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <p className="text-lg text-muted-foreground">No businesses found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          businesses.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              deals={deals[business.id]}
              isFavorite={isFavorite(business.id)}
              onFavoriteToggle={() => toggleFavorite(business.id)}
              onClick={() => setSelectedBusiness(business)}
            />
          ))
        )}
      </div>

      {/* Business Detail Sheet */}
      <BusinessDetail
        business={selectedBusiness}
        deals={selectedBusiness ? deals[selectedBusiness.id] : []}
        isOpen={!!selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
        isFavorite={selectedBusiness ? isFavorite(selectedBusiness.id) : false}
        onFavoriteToggle={() => selectedBusiness && toggleFavorite(selectedBusiness.id)}
      />
    </PageContainer>
  );
}

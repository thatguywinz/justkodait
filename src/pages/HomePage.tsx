/**
 * Home Page Component
 * Main feed with location-based AI search and business listings
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, MapPin, Sparkles, Loader2, Download, LocateFixed } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CategoryFilter } from '@/components/business/CategoryFilter';
import { BusinessCard } from '@/components/business/BusinessCard';
import { BusinessDetail } from '@/components/business/BusinessDetail';
import { useDiscovery } from '@/contexts/DiscoveryContext';
import { useFavorites } from '@/hooks/useFavorites';
import { Business, BusinessCategory } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'name'>('rating');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const { 
    businesses, 
    loading, 
    searchedLocation,
    discoverBusinesses 
  } = useDiscovery();
  

  // Keep location input synced with searched location
  const [locationInput, setLocationInput] = useState(searchedLocation || '');
  
  useEffect(() => {
    if (searchedLocation) {
      setLocationInput(searchedLocation);
    }
  }, [searchedLocation]);

  const { isFavorite, toggleFavorite } = useFavorites();

  // Filter and sort businesses
  const filteredBusinesses = useMemo(() => {
    let result = [...businesses];

    // Filter by category
    if (selectedCategory) {
      result = result.filter(b => b.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        result.sort((a, b) => b.average_rating - a.average_rating);
        break;
      case 'reviews':
        result.sort((a, b) => b.review_count - a.review_count);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [businesses, selectedCategory, sortBy]);

  // Create a deals map (empty for AI businesses, but needed for BusinessCard)
  const deals: Record<string, never[]> = {};

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    toast.info('Getting your location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Reverse geocode to get a human-readable address
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'User-Agent': 'KodaApp/1.0' } }
          );
          const data = await resp.json();
          const address = data.display_name?.split(',').slice(0, 3).join(',').trim() || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLocationInput(address);
          toast.info(`Discovering gems near your location...`);
          const result = await discoverBusinesses(address);
          if (!result.ok) {
            toast.error(result.message || 'Failed to discover businesses.');
            return;
          }
          toast.success('Found local gems near you!');
        } catch {
          const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLocationInput(fallback);
          const result = await discoverBusinesses(fallback);
          if (!result.ok) {
            toast.error(result.message || 'Failed to discover businesses.');
          }
        }
      },
      (error) => {
        toast.error(error.code === 1 ? 'Location access denied. Please enable location permissions.' : 'Could not get your location. Please enter it manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationInput.trim()) {
      toast.error('Please enter an address or postal code');
      return;
    }
    toast.info(`Discovering gems near ${locationInput}...`);
    const result = await discoverBusinesses(locationInput.trim());
    if (!result.ok) {
      toast.error(result.message || 'Failed to discover businesses. Please try again.');
      return;
    }
    toast.success(`Found local gems near ${locationInput}!`);
  };

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
        <div className="flex items-center gap-2">
          {!localStorage.getItem('koda-installed') && (
            <Button variant="outline" size="sm" onClick={() => navigate('/install')}>
              <Download className="h-4 w-4 mr-1" />
              Install
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Location Input */}
      <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Discover local gems with AI</span>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter address or postal code..."
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={loading}
            onClick={handleUseCurrentLocation}
            title="Use my current location"
          >
            <LocateFixed className="h-4 w-4" />
          </Button>
          <Button type="submit" disabled={loading || !locationInput.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Search'
            )}
          </Button>
        </form>
        {searchedLocation && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing businesses near: {searchedLocation}
          </p>
        )}
      </div>

      {/* Categories and Sort */}
      {businesses.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <DropdownMenuRadioItem value="rating">Highest Rated</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="reviews">Most Reviews</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name">Name (A-Z)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${filteredBusinesses.length} local gems found`}
          </div>
        </>
      )}

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
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground">Enter your location</p>
            <p className="text-sm text-muted-foreground mt-1">
              Type an address or postal code above to discover local gems near you
            </p>
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <p className="text-lg text-muted-foreground">No businesses found in this category</p>
            <p className="text-sm text-muted-foreground">Try selecting a different category</p>
          </div>
        ) : (
          filteredBusinesses.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              deals={deals[business.id] ?? []}
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
        deals={selectedBusiness ? deals[selectedBusiness.id] || [] : []}
        isOpen={!!selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
        isFavorite={selectedBusiness ? isFavorite(selectedBusiness.id) : false}
        onFavoriteToggle={() => selectedBusiness && toggleFavorite(selectedBusiness.id)}
      />
    </PageContainer>
  );
}

/**
 * Business Detail Component
 * Full business information view with reviews
 */

import { useState, useEffect } from 'react';
import { Star, MapPin, Phone, Globe, Heart, BadgeCheck, Tag, X, Clock } from 'lucide-react';
import { Business, Deal, Review, CATEGORY_ICONS, CATEGORY_LABELS } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ReviewForm } from './ReviewForm';
import { ReviewList } from './ReviewList';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface BusinessDetailProps {
  business: Business | null;
  deals?: Deal[];
  isOpen: boolean;
  onClose: () => void;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
}

export function BusinessDetail({
  business,
  deals = [],
  isOpen,
  onClose,
  isFavorite = false,
  onFavoriteToggle,
}: BusinessDetailProps) {
  const { user } = useAuth();
  const { reviews, fetchReviewsForBusiness, addReview, userReviews, fetchUserReviews } = useReviews();
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (business && isOpen) {
      fetchReviewsForBusiness(business.id);
    }
  }, [business, isOpen, fetchReviewsForBusiness]);

  useEffect(() => {
    if (user && business && isOpen) {
      fetchUserReviews();
    }
  }, [user, business, isOpen, fetchUserReviews]);

  if (!business) return null;

  const handleSubmitReview = async (rating: number, comment: string) => {
    const result = await addReview(business.id, rating, comment);
    if (result) {
      setShowReviewForm(false);
      fetchReviewsForBusiness(business.id);
    }
  };

  const userHasReviewed = userReviews.some(r => r.business_id === business.id);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl p-0">
        <div className="sticky top-0 z-10 bg-card">
          {/* Image Header */}
          <div className="relative h-56 overflow-hidden">
            {business.image_url ? (
              <img
                src={business.image_url}
                alt={business.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted text-6xl">
                {CATEGORY_ICONS[business.category]}
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <SheetHeader className="px-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-xl">{business.name}</SheetTitle>
                  {business.is_verified && (
                    <BadgeCheck className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary">
                    {CATEGORY_ICONS[business.category]} {CATEGORY_LABELS[business.category]}
                  </Badge>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={onFavoriteToggle}
              >
                <Heart
                  className={cn(
                    'h-5 w-5',
                    isFavorite ? 'fill-destructive text-destructive' : ''
                  )}
                />
              </Button>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'h-4 w-4',
                      star <= Math.round(business.average_rating)
                        ? 'fill-primary text-primary'
                        : 'text-muted'
                    )}
                  />
                ))}
              </div>
              <span className="font-semibold">{business.average_rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({business.review_count} reviews)
              </span>
            </div>
          </SheetHeader>
        </div>

        <div className="px-4 pb-8">
          {/* Deals Section */}
          {deals.length > 0 && (
            <>
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Tag className="h-4 w-4 text-primary" />
                  Special Offers
                </h3>
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg bg-accent/50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{deal.title}</span>
                      {deal.discount_percent && (
                        <Badge className="bg-primary text-primary-foreground">
                          {deal.discount_percent}% OFF
                        </Badge>
                      )}
                    </div>
                    {deal.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{deal.description}</p>
                    )}
                    {deal.code && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Code:</span>
                        <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono font-semibold">
                          {deal.code}
                        </code>
                      </div>
                    )}
                    {deal.valid_until && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Valid until {new Date(deal.valid_until).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
            </>
          )}

          {/* Description */}
          {business.description && (
            <>
              <div>
                <h3 className="mb-2 font-semibold">About</h3>
                <p className="text-sm text-muted-foreground">{business.description}</p>
              </div>
              <Separator className="my-4" />
            </>
          )}

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="font-semibold">Contact & Location</h3>
            
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm">{business.address}</span>
            </div>
            
            {business.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${business.phone}`} className="text-sm text-primary">
                  {business.phone}
                </a>
              </div>
            )}
            
            {business.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary"
                >
                  Visit Website
                </a>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Reviews Section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Reviews</h3>
              {user && !userHasReviewed && (
                <Button
                  size="sm"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                >
                  Write Review
                </Button>
              )}
            </div>

            {showReviewForm && (
              <div className="mb-4">
                <ReviewForm
                  onSubmit={handleSubmitReview}
                  onCancel={() => setShowReviewForm(false)}
                />
              </div>
            )}

            <ReviewList reviews={reviews} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

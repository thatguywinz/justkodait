/**
 * Business Card Component
 * Displays business info in a card format for listings
 */

import { Star, MapPin, Heart, BadgeCheck, Tag } from 'lucide-react';
import { Business, Deal, CATEGORY_ICONS, CATEGORY_LABELS } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BusinessCardProps {
  business: Business;
  deals?: Deal[];
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

export function BusinessCard({
  business,
  deals = [],
  isFavorite = false,
  onFavoriteToggle,
  onClick,
  compact = false,
}: BusinessCardProps) {
  const hasDeals = deals.length > 0;

  return (
    <Card 
      className={cn(
        'group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg',
        'border-border/50 bg-card'
      )}
      onClick={onClick}
    >
      <div className="relative">
        {/* Image */}
        <div className={cn(
          'relative overflow-hidden bg-muted',
          compact ? 'h-32' : 'h-40'
        )}>
          {business.image_url ? (
            <img
              src={business.image_url}
              alt={business.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">
              {CATEGORY_ICONS[business.category]}
            </div>
          )}
          
          {/* Deal Badge */}
          {hasDeals && (
            <div className="absolute left-2 top-2">
              <Badge className="bg-accent text-accent-foreground shadow-sm">
                <Tag className="mr-1 h-3 w-3" />
                Deal
              </Badge>
            </div>
          )}
          
          {/* Favorite Button */}
          {onFavoriteToggle && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute right-2 top-2 h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm',
                'hover:bg-card hover:scale-110 transition-all'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle();
              }}
            >
              <Heart
                className={cn(
                  'h-4 w-4 transition-colors',
                  isFavorite ? 'fill-destructive text-destructive' : 'text-foreground'
                )}
              />
            </Button>
          )}
        </div>

        <CardContent className={cn('p-3', compact && 'p-2')}>
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className={cn(
                  'truncate font-semibold text-foreground',
                  compact ? 'text-sm' : 'text-base'
                )}>
                  {business.name}
                </h3>
                {business.is_verified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                )}
              </div>
              
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{CATEGORY_ICONS[business.category]} {CATEGORY_LABELS[business.category]}</span>
              </div>
            </div>

            {/* Rating */}
            <div className="flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="text-sm font-semibold text-primary">
                {business.average_rating.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Description */}
          {!compact && business.description && (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {business.description}
            </p>
          )}

          {/* Address */}
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{business.address}</span>
          </div>

          {/* Deal Preview */}
          {hasDeals && !compact && (
            <div className="mt-2 rounded-md bg-accent/50 p-2">
              <p className="text-xs font-medium text-accent-foreground">
                🎉 {deals[0].title}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{business.review_count} reviews</span>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

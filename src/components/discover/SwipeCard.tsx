/**
 * Swipe Card Component
 * Tinder-style swipeable business card for Discover feature
 */

import { useState, useRef } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { Star, MapPin, Heart, X, BadgeCheck, Tag } from 'lucide-react';
import { Business, Deal, CATEGORY_ICONS, CATEGORY_LABELS } from '@/types/database';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SwipeCardProps {
  business: Business;
  deals?: Deal[];
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
}

export function SwipeCard({
  business,
  deals = [],
  onSwipeLeft,
  onSwipeRight,
  onTap,
}: SwipeCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const [{ x, rotate, opacity }, api] = useSpring(() => ({
    x: 0,
    rotate: 0,
    opacity: 1,
    config: { tension: 300, friction: 20 },
  }));

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startX.current = clientX;
    currentX.current = clientX;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    currentX.current = clientX;
    const deltaX = clientX - startX.current;
    
    api.start({
      x: deltaX,
      rotate: deltaX * 0.05,
    });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaX = currentX.current - startX.current;
    const threshold = 100;

    if (deltaX > threshold) {
      // Swipe right - like
      api.start({
        x: 500,
        rotate: 30,
        opacity: 0,
        onRest: onSwipeRight,
      });
    } else if (deltaX < -threshold) {
      // Swipe left - skip
      api.start({
        x: -500,
        rotate: -30,
        opacity: 0,
        onRest: onSwipeLeft,
      });
    } else {
      // Snap back
      api.start({
        x: 0,
        rotate: 0,
      });
    }
  };

  const handleButtonSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      api.start({
        x: 500,
        rotate: 30,
        opacity: 0,
        onRest: onSwipeRight,
      });
    } else {
      api.start({
        x: -500,
        rotate: -30,
        opacity: 0,
        onRest: onSwipeLeft,
      });
    }
  };

  const hasDeals = deals.length > 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <animated.div
        className="relative h-[450px] w-[320px] cursor-grab touch-none select-none overflow-hidden rounded-3xl bg-card shadow-xl active:cursor-grabbing"
        style={{ x, rotate, opacity }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={() => isDragging && handleTouchEnd()}
        onClick={() => !isDragging && onTap()}
      >
        {/* Swipe Indicators */}
        <animated.div
          className="absolute left-4 top-4 z-20 rounded-lg bg-destructive px-4 py-2 text-lg font-bold text-destructive-foreground"
          style={{
            opacity: x.to((v) => Math.max(0, -v / 100)),
            transform: x.to((v) => `rotate(-15deg) scale(${Math.min(1, -v / 100)})`),
          }}
        >
          SKIP
        </animated.div>
        
        <animated.div
          className="absolute right-4 top-4 z-20 rounded-lg bg-primary px-4 py-2 text-lg font-bold text-primary-foreground"
          style={{
            opacity: x.to((v) => Math.max(0, v / 100)),
            transform: x.to((v) => `rotate(15deg) scale(${Math.min(1, v / 100)})`),
          }}
        >
          SAVE
        </animated.div>

        {/* Image */}
        <div className="relative h-64 overflow-hidden">
          {business.image_url ? (
            <img
              src={business.image_url}
              alt={business.name}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted text-6xl">
              {CATEGORY_ICONS[business.category]}
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          
          {/* Deal badge */}
          {hasDeals && (
            <div className="absolute left-3 top-3">
              <div className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground shadow-lg">
                <Tag className="h-3.5 w-3.5" />
                Deal Available
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Name & Verified */}
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">{business.name}</h2>
            {business.is_verified && (
              <BadgeCheck className="h-5 w-5 text-primary" />
            )}
          </div>

          {/* Category */}
          <div className="mt-1 text-sm text-muted-foreground">
            {CATEGORY_ICONS[business.category]} {CATEGORY_LABELS[business.category]}
          </div>

          {/* Rating */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-semibold text-primary">{business.average_rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {business.review_count} reviews
            </span>
          </div>

          {/* Description */}
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {business.description}
          </p>

          {/* Address */}
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{business.address}</span>
          </div>
        </div>
      </animated.div>

      {/* Action Buttons */}
      <div className="flex items-center gap-6">
        <Button
          variant="outline"
          size="lg"
          className="h-16 w-16 rounded-full border-2 border-destructive/50 hover:border-destructive hover:bg-destructive/10"
          onClick={() => handleButtonSwipe('left')}
        >
          <X className="h-7 w-7 text-destructive" />
        </Button>
        
        <Button
          size="lg"
          className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
          onClick={() => handleButtonSwipe('right')}
        >
          <Heart className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}

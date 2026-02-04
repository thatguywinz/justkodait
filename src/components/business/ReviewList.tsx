/**
 * Review List Component
 * Displays list of reviews for a business
 */

import { Star, User } from 'lucide-react';
import { Review } from '@/types/database';
import { cn } from '@/lib/utils';

interface ReviewListProps {
  reviews: Review[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-lg bg-muted/30 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-3.5 w-3.5',
                        star <= review.rating
                          ? 'fill-primary text-primary'
                          : 'text-muted'
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              
              {review.comment && (
                <p className="mt-1 text-sm text-foreground">{review.comment}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

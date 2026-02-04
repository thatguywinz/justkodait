/**
 * Category Filter Component
 * Horizontal scrollable category filter chips
 */

import { BusinessCategory, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selectedCategory: BusinessCategory | null;
  onCategoryChange: (category: BusinessCategory | null) => void;
}

const categories: BusinessCategory[] = [
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'retail',
  'beauty',
  'fitness',
  'services',
  'entertainment',
  'grocery',
];

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange(null)}
          className={cn(
            'rounded-full shrink-0',
            selectedCategory === null && 'bg-primary text-primary-foreground'
          )}
        >
          All
        </Button>
        
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category)}
            className={cn(
              'rounded-full shrink-0',
              selectedCategory === category && 'bg-primary text-primary-foreground'
            )}
          >
            <span className="mr-1">{CATEGORY_ICONS[category]}</span>
            {CATEGORY_LABELS[category]}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

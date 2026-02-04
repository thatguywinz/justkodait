/**
 * Search Bar Component
 * Search input with filter options
 */

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
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

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  sortBy: 'rating' | 'reviews' | 'name' | 'distance';
  onSortChange: (sort: 'rating' | 'reviews' | 'name' | 'distance') => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  sortBy,
  onSortChange,
  placeholder = 'Search local gems...',
}: SearchBarProps) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => onSortChange(v as typeof sortBy)}>
            <DropdownMenuRadioItem value="rating">Highest Rated</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="reviews">Most Reviews</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="name">Name (A-Z)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="distance">Distance</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

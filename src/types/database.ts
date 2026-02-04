/**
 * Database types for Koda app
 * Defines interfaces for all database tables and related types
 */

export type BusinessCategory = 
  | 'restaurant'
  | 'cafe'
  | 'bakery'
  | 'bar'
  | 'retail'
  | 'beauty'
  | 'fitness'
  | 'services'
  | 'entertainment'
  | 'grocery';

export interface Business {
  id: string;
  name: string;
  description: string | null;
  category: BusinessCategory;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  image_url: string | null;
  average_rating: number;
  review_count: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  discount_percent: number | null;
  code: string | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  business_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface SwipeHistory {
  id: string;
  user_id: string;
  business_id: string;
  direction: 'left' | 'right';
  created_at: string;
}

export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  bakery: 'Bakery',
  bar: 'Bar & Pub',
  retail: 'Retail',
  beauty: 'Beauty',
  fitness: 'Fitness',
  services: 'Services',
  entertainment: 'Entertainment',
  grocery: 'Grocery',
};

export const CATEGORY_ICONS: Record<BusinessCategory, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  bakery: '🥐',
  bar: '🍺',
  retail: '🛍️',
  beauty: '💅',
  fitness: '💪',
  services: '🔧',
  entertainment: '🎭',
  grocery: '🥬',
};

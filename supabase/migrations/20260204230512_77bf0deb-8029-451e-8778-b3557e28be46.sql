-- Create enum for business categories
CREATE TYPE public.business_category AS ENUM (
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'retail',
  'beauty',
  'fitness',
  'services',
  'entertainment',
  'grocery'
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  postal_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category public.business_category NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT,
  website TEXT,
  image_url TEXT,
  average_rating DECIMAL(2, 1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deals table
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount_percent INTEGER,
  code TEXT,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
);

-- Create swipe_history table for discover feature
CREATE TABLE public.swipe_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Businesses policies (public read)
CREATE POLICY "Anyone can view businesses"
  ON public.businesses FOR SELECT
  USING (true);

-- Deals policies (public read)
CREATE POLICY "Anyone can view active deals"
  ON public.deals FOR SELECT
  USING (is_active = true);

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Swipe history policies
CREATE POLICY "Users can view own swipe history"
  ON public.swipe_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add swipe history"
  ON public.swipe_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update average rating
CREATE OR REPLACE FUNCTION public.update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.businesses
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(2,1), 0)
      FROM public.reviews
      WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.business_id, OLD.business_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for rating updates
CREATE TRIGGER update_rating_on_review_insert
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_rating();

CREATE TRIGGER update_rating_on_review_update
  AFTER UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_rating();

CREATE TRIGGER update_rating_on_review_delete
  AFTER DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_rating();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create timestamp triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Seed some initial business data
INSERT INTO public.businesses (name, description, category, address, latitude, longitude, image_url, average_rating, review_count, is_verified) VALUES
  ('The Cozy Corner Café', 'A warm and inviting café serving artisan coffee and fresh pastries. Perfect for remote work or catching up with friends.', 'cafe', '123 Main Street, Toronto, ON M5V 1A1', 43.6532, -79.3832, 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', 4.5, 127, true),
  ('Bella Italia Trattoria', 'Authentic Italian cuisine with recipes passed down through generations. Homemade pasta and wood-fired pizzas.', 'restaurant', '456 Queen Street West, Toronto, ON M5V 2A8', 43.6485, -79.3990, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 4.8, 89, true),
  ('Green Leaf Market', 'Family-owned grocery store specializing in organic produce and local artisan goods.', 'grocery', '789 Dundas Street, Toronto, ON M5T 1H5', 43.6544, -79.3900, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800', 4.2, 56, false),
  ('Sunrise Bakery', 'Early morning bakery with fresh bread, croissants, and specialty cakes made daily.', 'bakery', '321 College Street, Toronto, ON M5T 1S2', 43.6580, -79.4050, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', 4.7, 203, true),
  ('Zen Fitness Studio', 'Boutique fitness studio offering yoga, pilates, and HIIT classes in a peaceful environment.', 'fitness', '555 Bloor Street West, Toronto, ON M5S 1Y5', 43.6640, -79.4100, 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800', 4.6, 78, true),
  ('The Craft Bar', 'Local craft brewery taproom with rotating selection of small-batch beers and light bites.', 'bar', '888 King Street West, Toronto, ON M5V 1M3', 43.6447, -79.3960, 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800', 4.4, 145, true),
  ('Glow Beauty Lounge', 'Full-service beauty salon offering hair, nails, and skincare treatments by experienced professionals.', 'beauty', '222 Spadina Avenue, Toronto, ON M5T 2C2', 43.6510, -79.3970, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', 4.3, 92, true),
  ('Retro Records', 'Vintage vinyl shop with rare finds and a listening booth. Music lovers paradise since 1985.', 'retail', '444 Ossington Avenue, Toronto, ON M6J 2Z7', 43.6490, -79.4200, 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=800', 4.9, 167, true),
  ('Sushi Sensation', 'Fresh sushi and Japanese cuisine in a modern setting. Known for their omakase experience.', 'restaurant', '666 Yonge Street, Toronto, ON M4Y 1Z6', 43.6620, -79.3850, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800', 4.6, 234, true),
  ('The Reading Nook', 'Independent bookstore with curated selections and cozy reading corners. Regular author events.', 'retail', '111 Roncesvalles Avenue, Toronto, ON M6R 2K9', 43.6550, -79.4500, 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800', 4.8, 89, false),
  ('Taco Loco', 'Authentic Mexican street food with handmade tortillas and fresh salsas made daily.', 'restaurant', '333 Augusta Avenue, Toronto, ON M5T 2L7', 43.6540, -79.4010, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800', 4.5, 312, true),
  ('Paws & Claws Pet Spa', 'Premium pet grooming and daycare services with certified handlers.', 'services', '999 Danforth Avenue, Toronto, ON M4J 1L8', 43.6780, -79.3450, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800', 4.7, 156, true);

-- Seed some deals
INSERT INTO public.deals (business_id, title, description, discount_percent, code, valid_until) VALUES
  ((SELECT id FROM public.businesses WHERE name = 'The Cozy Corner Café'), '20% Off Your First Order', 'New customers get 20% off their first purchase!', 20, 'WELCOME20', now() + interval '30 days'),
  ((SELECT id FROM public.businesses WHERE name = 'Bella Italia Trattoria'), 'Free Dessert with Dinner', 'Order any main course and get a free tiramisu!', NULL, 'DOLCE', now() + interval '14 days'),
  ((SELECT id FROM public.businesses WHERE name = 'Zen Fitness Studio'), 'First Class Free', 'Try any class for free - no commitment required!', 100, 'FIRSTFREE', now() + interval '60 days'),
  ((SELECT id FROM public.businesses WHERE name = 'Sunrise Bakery'), 'Buy 6 Get 1 Free', 'Buy any 6 pastries and get the 7th free!', NULL, 'SWEET7', now() + interval '21 days'),
  ((SELECT id FROM public.businesses WHERE name = 'Sushi Sensation'), '15% Off Omakase', 'Special discount on our chef''s tasting menu!', 15, 'OMAKASE15', now() + interval '45 days');
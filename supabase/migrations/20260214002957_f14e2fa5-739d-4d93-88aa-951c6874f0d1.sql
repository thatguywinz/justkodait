
-- Create a public view that excludes user_id from reviews
CREATE VIEW public.reviews_public
WITH (security_invoker = on) AS
SELECT id, business_id, rating, comment, created_at, updated_at
FROM public.reviews;

-- Drop the old permissive public SELECT policy
DROP POLICY "Anyone can view reviews" ON public.reviews;

-- Only allow authenticated users to SELECT their own reviews (for edit/delete)
CREATE POLICY "Users can view own reviews"
ON public.reviews FOR SELECT
USING (auth.uid() = user_id);

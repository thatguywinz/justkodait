
CREATE OR REPLACE FUNCTION public.find_nearby_businesses(
  user_lat double precision,
  user_lng double precision,
  result_limit integer DEFAULT 20,
  category_filter text DEFAULT NULL
)
RETURNS SETOF public.businesses
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.businesses
  WHERE latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND (category_filter IS NULL OR category = category_filter::public.business_category)
  ORDER BY power(latitude - user_lat, 2) + power(longitude - user_lng, 2)
  LIMIT result_limit;
$$;

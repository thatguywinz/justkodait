import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_CATEGORIES = [
  "restaurant", "cafe", "bakery", "bar", "retail",
  "beauty", "fitness", "services", "entertainment", "grocery",
];

// Nominatim POI types mapped to our categories
const NOMINATIM_SEARCHES: { query: string; category: string }[] = [
  { query: "restaurant", category: "restaurant" },
  { query: "cafe coffee", category: "cafe" },
  { query: "bakery", category: "bakery" },
  { query: "bar pub", category: "bar" },
  { query: "shop store", category: "retail" },
  { query: "salon beauty hair", category: "beauty" },
  { query: "gym fitness", category: "fitness" },
  { query: "supermarket grocery", category: "grocery" },
  { query: "cinema theatre entertainment", category: "entertainment" },
];

function validateInput(body: unknown): { ok: true; location: string; category: string | null } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body" };
  }
  const { location, category } = body as Record<string, unknown>;
  if (typeof location !== "string" || location.trim().length === 0) {
    return { ok: false, error: "Location is required" };
  }
  if (location.length > 200) {
    return { ok: false, error: "Location is too long (max 200 characters)" };
  }
  const sanitizedLocation = location.replace(/[\x00-\x1F\x7F]/g, "").replace(/\s+/g, " ").trim();
  if (sanitizedLocation.length === 0) {
    return { ok: false, error: "Location contains only invalid characters" };
  }
  if (category !== undefined && category !== null) {
    if (typeof category !== "string" || !VALID_CATEGORIES.includes(category)) {
      return { ok: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` };
    }
  }
  return { ok: true, location: sanitizedLocation, category: (category as string) || null };
}

async function geocodeAddress(location: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const query = encodeURIComponent(location + ", Toronto, ON, Canada");
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { "User-Agent": "KodaApp/1.0" } }
    );
    if (!response.ok) return null;
    const results = await response.json();
    if (!results || results.length === 0) return null;
    return { latitude: parseFloat(results[0].lat), longitude: parseFloat(results[0].lon) };
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}

interface DiscoveredBusiness {
  name: string;
  category: string;
  address: string;
  description: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchNominatimPOIs(
  lat: number,
  lon: number,
  searchQuery: string,
  category: string,
  limit: number = 5
): Promise<DiscoveredBusiness[]> {
  try {
    // Use Nominatim's search with viewbox to find real POIs near the location
    const delta = 0.015; // ~1.5km bounding box
    const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;
    const q = encodeURIComponent(searchQuery);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=${limit}&viewbox=${viewbox}&bounded=1&addressdetails=1&extratags=1`;

    const response = await fetch(url, {
      headers: { "User-Agent": "KodaApp/1.0" },
    });

    if (!response.ok) {
      console.error(`Nominatim search error for "${searchQuery}":`, response.status);
      return [];
    }

    const results = await response.json();
    const businesses: DiscoveredBusiness[] = [];

    for (const r of results) {
      // Skip results that are just generic areas/roads
      if (!r.display_name || r.class === "highway" || r.class === "boundary") continue;

      // Extract a clean name (first part of display_name)
      const nameParts = r.display_name.split(",");
      const name = nameParts[0].trim();

      // Skip generic names
      if (name.length < 3 || /^\d+$/.test(name)) continue;

      // Build address from address details or display_name fallback
      const addr = r.address || {};
      const addressParts: string[] = [];
      if (addr.house_number) addressParts.push(addr.house_number);
      if (addr.road) addressParts.push(addr.road);
      const city = addr.city || addr.town || addr.village || addr.suburb || "Toronto";
      const province = addr.state || "ON";
      const postcode = addr.postcode || "";
      let address: string;
      if (addressParts.length > 0) {
        address = postcode
          ? `${addressParts.join(" ")}, ${city}, ${province} ${postcode}`
          : `${addressParts.join(" ")}, ${city}, ${province}`;
      } else {
        // Use display_name parts as fallback (skip name, take next 2-3 parts)
        const dpParts = r.display_name.split(",").map((s: string) => s.trim());
        const addrFromDisplay = dpParts.slice(1, 4).join(", ");
        address = addrFromDisplay || `${city}, ${province}`;
      }

      // Build description from extra tags
      const extras = r.extratags || {};
      let description = extras.description || "";
      if (!description) {
        const parts: string[] = [];
        if (extras.cuisine) parts.push(`Cuisine: ${extras.cuisine.replace(/;/g, ", ")}`);
        if (extras.opening_hours) parts.push(`Hours: ${extras.opening_hours}`);
        if (parts.length > 0) {
          description = parts.join(". ");
        } else {
          description = `Local ${category} near ${city}.`;
        }
      }

      businesses.push({
        name,
        category,
        address,
        description,
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        phone: extras.phone || extras["contact:phone"] || null,
        website: extras.website || extras["contact:website"] || null,
      });
    }

    return businesses;
  } catch (err) {
    console.error(`Nominatim POI search error for "${searchQuery}":`, err);
    return [];
  }
}

async function discoverWithNominatim(lat: number, lon: number, category: string | null): Promise<DiscoveredBusiness[]> {
  const searches = category
    ? NOMINATIM_SEARCHES.filter((s) => s.category === category)
    : NOMINATIM_SEARCHES;

  if (searches.length === 0 && category) {
    // Fallback: search with the category name directly
    return searchNominatimPOIs(lat, lon, category, category, 10);
  }

  const allBusinesses: DiscoveredBusiness[] = [];
  const seenNames = new Set<string>();

  // Run searches sequentially with small delay to respect Nominatim rate limits (1 req/sec)
  for (const search of searches) {
    const results = await searchNominatimPOIs(lat, lon, search.query, search.category, category ? 10 : 4);
    for (const biz of results) {
      const key = biz.name.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        allBusinesses.push(biz);
      }
    }
    // Nominatim usage policy: max 1 request per second
    if (searches.length > 1) {
      await delay(1100);
    }
  }

  console.log(`Nominatim discovered ${allBusinesses.length} businesses`);
  return allBusinesses;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validation = validateInput(body);
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { location, category } = validation;
    console.log("Discovering businesses near:", location);

    const coords = await geocodeAddress(location);
    if (!coords) {
      return new Response(
        JSON.stringify({ error: "Could not find that location. Please try a more specific address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("Geocoded to:", coords.latitude, coords.longitude);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Run DB query and Nominatim discovery in parallel
    const [dbResult, osmBusinesses] = await Promise.all([
      serviceClient.rpc("find_nearby_businesses", {
        user_lat: coords.latitude,
        user_lng: coords.longitude,
        result_limit: 20,
        category_filter: category,
      }),
      discoverWithNominatim(coords.latitude, coords.longitude, category),
    ]);

    if (dbResult.error) {
      console.error("Database query error:", dbResult.error);
    }

    const dbBusinesses = dbResult.data || [];
    console.log(`Found ${dbBusinesses.length} DB businesses, ${osmBusinesses.length} OSM businesses`);

    // Deduplicate OSM results against DB
    const dbNames = new Set(dbBusinesses.map((b: { name: string }) => b.name.toLowerCase()));
    const newBusinesses = osmBusinesses.filter((osm) => !dbNames.has(osm.name.toLowerCase()));

    // Save new OSM businesses to the database
    let savedBusinesses: any[] = [];
    if (newBusinesses.length > 0) {
      const rows = newBusinesses.map((osm) => ({
        name: osm.name,
        category: osm.category,
        address: osm.address,
        description: osm.description,
        latitude: osm.latitude,
        longitude: osm.longitude,
        phone: osm.phone || null,
        website: osm.website || null,
        is_verified: true,
        average_rating: 0,
        review_count: 0,
      }));

      const { data: inserted, error: insertError } = await serviceClient
        .from("businesses")
        .insert(rows)
        .select();

      if (insertError) {
        console.error("Error saving businesses:", insertError);
        savedBusinesses = rows.map((r) => ({
          ...r,
          id: crypto.randomUUID(),
          image_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      } else {
        savedBusinesses = inserted || [];
        console.log(`Saved ${savedBusinesses.length} new businesses to database`);
      }
    }

    const allBusinesses = [...dbBusinesses, ...savedBusinesses];

    return new Response(JSON.stringify({ businesses: allBusinesses }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in discover-businesses:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

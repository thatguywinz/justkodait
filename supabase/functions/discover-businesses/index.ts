import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function validateInput(body: unknown): { ok: true; location: string; category: string | null } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body" };
  }

  const { location, category } = body as Record<string, unknown>;

  if (typeof location !== "string" || location.trim().length === 0) {
    return { ok: false, error: "Location is required and must be a non-empty string" };
  }

  if (location.length > 200) {
    return { ok: false, error: "Location is too long (max 200 characters)" };
  }

  const sanitizedLocation = location
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (sanitizedLocation.length === 0) {
    return { ok: false, error: "Location contains only invalid characters" };
  }

  const VALID_CATEGORIES = [
    "restaurant", "cafe", "bakery", "bar", "retail",
    "beauty", "fitness", "services", "entertainment", "grocery",
  ];

  if (category !== undefined && category !== null) {
    if (typeof category !== "string" || !VALID_CATEGORIES.includes(category)) {
      return { ok: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` };
    }
  }

  return { ok: true, location: sanitizedLocation, category: (category as string) || null };
}

async function geocodeAddress(location: string, apiKey: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a geocoding assistant. Given an address or location, return ONLY a JSON object with latitude and longitude. No other text. Example: {\"latitude\": 43.76, \"longitude\": -79.41}",
          },
          {
            role: "user",
            content: `Geocode this location in or near North York, Toronto, Canada: "${location}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Geocoding AI error:", response.status);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const coords = JSON.parse(jsonMatch[0]);
    if (typeof coords.latitude === "number" && typeof coords.longitude === "number") {
      return { latitude: coords.latitude, longitude: coords.longitude };
    }
    return null;
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Input Validation ---
    const body = await req.json();
    const validation = validateInput(body);
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { location, category } = validation;

    // --- Geocode the address ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Geocoding location:", location, "for user:", user.id);

    const coords = await geocodeAddress(location, LOVABLE_API_KEY);
    if (!coords) {
      return new Response(
        JSON.stringify({ error: "Could not find that location. Please try a more specific address in North York." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Geocoded to:", coords.latitude, coords.longitude);

    // --- Query nearby businesses from database ---
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: businesses, error: dbError } = await serviceClient.rpc("find_nearby_businesses", {
      user_lat: coords.latitude,
      user_lng: coords.longitude,
      result_limit: 20,
      category_filter: category,
    });

    if (dbError) {
      console.error("Database query error:", dbError);
      throw new Error("Failed to query nearby businesses");
    }

    console.log(`Found ${businesses?.length || 0} nearby businesses`);

    return new Response(JSON.stringify({ businesses: businesses || [] }), {
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

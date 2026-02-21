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

  if (category !== undefined && category !== null) {
    if (typeof category !== "string" || !VALID_CATEGORIES.includes(category)) {
      return { ok: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` };
    }
  }

  return { ok: true, location: sanitizedLocation, category: (category as string) || null };
}

async function geocodeAddress(location: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const query = encodeURIComponent(location + ", North York, Toronto, ON, Canada");
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { "User-Agent": "KodaApp/1.0" } }
    );

    if (!response.ok) return null;

    const results = await response.json();
    if (!results || results.length === 0) {
      const fallbackQuery = encodeURIComponent(location + ", Toronto, ON, Canada");
      const fallbackResp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${fallbackQuery}&format=json&limit=1`,
        { headers: { "User-Agent": "KodaApp/1.0" } }
      );
      const fallbackResults = await fallbackResp.json();
      if (!fallbackResults || fallbackResults.length === 0) return null;
      return { latitude: parseFloat(fallbackResults[0].lat), longitude: parseFloat(fallbackResults[0].lon) };
    }

    return { latitude: parseFloat(results[0].lat), longitude: parseFloat(results[0].lon) };
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}

interface AIBusiness {
  name: string;
  category: string;
  address: string;
  description: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
}

async function discoverWithAI(location: string, category: string | null, coords: { latitude: number; longitude: number }): Promise<AIBusiness[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured, skipping AI discovery");
    return [];
  }

  const categoryPrompt = category ? `Focus specifically on the "${category}" category.` : `Include a mix of categories: ${VALID_CATEGORIES.join(", ")}.`;

  const prompt = `You are a local business directory expert for North York and Toronto, Canada.

Find 10 REAL businesses near "${location}" (coordinates: ${coords.latitude}, ${coords.longitude}).
${categoryPrompt}

IMPORTANT: Only include REAL businesses that actually exist. Do NOT make up fake businesses.
For each business provide accurate details including real addresses, real phone numbers, and real websites if available.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a helpful local business directory assistant." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_businesses",
              description: "Return a list of real local businesses near the given location.",
              parameters: {
                type: "object",
                properties: {
                  businesses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Business name" },
                        category: { type: "string", enum: VALID_CATEGORIES, description: "Business category" },
                        address: { type: "string", description: "Full street address" },
                        description: { type: "string", description: "Brief description (1-2 sentences)" },
                        latitude: { type: "number", description: "Latitude coordinate" },
                        longitude: { type: "number", description: "Longitude coordinate" },
                        phone: { type: "string", description: "Phone number or null" },
                        website: { type: "string", description: "Website URL or null" },
                      },
                      required: ["name", "category", "address", "description", "latitude", "longitude"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["businesses"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_businesses" } },
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return [];

    const parsed = JSON.parse(toolCall.function.arguments);
    return (parsed.businesses || []).map((b: AIBusiness) => ({
      ...b,
      category: VALID_CATEGORIES.includes(b.category) ? b.category : "services",
    }));
  } catch (err) {
    console.error("AI discovery error:", err);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    let userId = "anonymous";

    if (authHeader?.startsWith("Bearer ")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user?.id) {
        userId = user.id;
      }
    }

    const body = await req.json();
    const validation = validateInput(body);
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { location, category } = validation;

    console.log("Geocoding location:", location, "for user:", userId);
    const coords = await geocodeAddress(location);
    if (!coords) {
      return new Response(
        JSON.stringify({ error: "Could not find that location. Please try a more specific address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Geocoded to:", coords.latitude, coords.longitude);

    // Run DB query and AI discovery in parallel
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const [dbResult, aiBusinesses] = await Promise.all([
      serviceClient.rpc("find_nearby_businesses", {
        user_lat: coords.latitude,
        user_lng: coords.longitude,
        result_limit: 20,
        category_filter: category,
      }),
      discoverWithAI(location, category, coords),
    ]);

    if (dbResult.error) {
      console.error("Database query error:", dbResult.error);
    }

    const dbBusinesses = dbResult.data || [];
    console.log(`Found ${dbBusinesses.length} DB businesses, ${aiBusinesses.length} AI businesses`);

    // Merge: DB businesses first, then AI ones that aren't duplicates
    const dbNames = new Set(dbBusinesses.map((b: { name: string }) => b.name.toLowerCase()));
    const uniqueAI = aiBusinesses
      .filter((ai) => !dbNames.has(ai.name.toLowerCase()))
      .map((ai) => ({
        id: crypto.randomUUID(),
        name: ai.name,
        category: ai.category,
        address: ai.address,
        description: ai.description,
        latitude: ai.latitude,
        longitude: ai.longitude,
        phone: ai.phone || null,
        website: ai.website || null,
        image_url: null,
        average_rating: 0,
        review_count: 0,
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

    const allBusinesses = [...dbBusinesses, ...uniqueAI];

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

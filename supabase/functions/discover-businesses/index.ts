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

function buildPrompt(location: string, category: string | null, coords: { latitude: number; longitude: number }): string {
  const categoryPrompt = category
    ? `Focus specifically on "${category}" businesses.`
    : `Include a mix of categories: ${VALID_CATEGORIES.join(", ")}.`;

  return `You are a local business directory expert for Toronto, Canada.

Find 10 REAL businesses near "${location}" (coordinates: ${coords.latitude}, ${coords.longitude}).
${categoryPrompt}

IMPORTANT: Only include REAL businesses that actually exist in Toronto/North York. Do NOT invent fake businesses.
Provide accurate addresses, phone numbers, and websites where available.

Respond with ONLY valid JSON in this exact format, no other text:
{
  "businesses": [
    {
      "name": "Business Name",
      "category": "restaurant",
      "address": "123 Street, North York, ON",
      "description": "Brief 1-2 sentence description",
      "latitude": 43.75,
      "longitude": -79.41,
      "phone": "416-555-1234",
      "website": "https://example.com"
    }
  ]
}`;
}

function parseAIResponse(text: string): AIBusiness[] {
  try {
    const parsed = JSON.parse(text);
    return (parsed.businesses || []).map((b: AIBusiness) => ({
      ...b,
      category: VALID_CATEGORIES.includes(b.category) ? b.category : "services",
    }));
  } catch (err) {
    console.error("Failed to parse AI response:", err);
    return [];
  }
}

async function discoverWithGemini(location: string, category: string | null, coords: { latitude: number; longitude: number }): Promise<AIBusiness[]> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY not configured, skipping Gemini discovery");
    return [];
  }

  const prompt = buildPrompt(location, category, coords);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return [];
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [];

    return parseAIResponse(text);
  } catch (err) {
    console.error("Gemini discovery error:", err);
    return [];
  }
}

async function discoverWithLovableAI(location: string, category: string | null, coords: { latitude: number; longitude: number }): Promise<AIBusiness[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log("LOVABLE_API_KEY not configured, skipping Lovable AI discovery");
    return [];
  }

  const prompt = buildPrompt(location, category, coords);

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a local business directory expert. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Lovable AI error:", response.status, errText);
      return [];
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return [];

    // Try to extract JSON from the response (may be wrapped in markdown)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    return parseAIResponse(jsonStr);
  } catch (err) {
    console.error("Lovable AI discovery error:", err);
    return [];
  }
}

async function discoverWithAI(location: string, category: string | null, coords: { latitude: number; longitude: number }): Promise<AIBusiness[]> {
  // Try Gemini first
  console.log("Trying Gemini API for AI discovery...");
  const geminiResults = await discoverWithGemini(location, category, coords);
  if (geminiResults.length > 0) {
    console.log(`Gemini returned ${geminiResults.length} businesses`);
    return geminiResults;
  }

  // Fallback to Lovable AI
  console.log("Gemini failed or returned no results, falling back to Lovable AI...");
  const lovableResults = await discoverWithLovableAI(location, category, coords);
  if (lovableResults.length > 0) {
    console.log(`Lovable AI returned ${lovableResults.length} businesses`);
    return lovableResults;
  }

  console.log("Both AI providers failed or returned no results, will use DB results only");
  return [];
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
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await sb.auth.getUser();
      if (user?.id) userId = user.id;
    }

    const body = await req.json();
    const validation = validateInput(body);
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Run DB query and AI discovery in parallel
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

    // Deduplicate AI results against DB
    const dbNames = new Set(dbBusinesses.map((b: { name: string }) => b.name.toLowerCase()));
    const newAIBusinesses = aiBusinesses.filter((ai) => !dbNames.has(ai.name.toLowerCase()));

    // Save new AI businesses to the database
    let savedBusinesses: any[] = [];
    if (newAIBusinesses.length > 0) {
      const rows = newAIBusinesses.map((ai) => ({
        name: ai.name,
        category: ai.category,
        address: ai.address,
        description: ai.description,
        latitude: ai.latitude,
        longitude: ai.longitude,
        phone: ai.phone || null,
        website: ai.website || null,
        is_verified: false,
        average_rating: 0,
        review_count: 0,
      }));

      const { data: inserted, error: insertError } = await serviceClient
        .from("businesses")
        .insert(rows)
        .select();

      if (insertError) {
        console.error("Error saving AI businesses:", insertError);
        savedBusinesses = rows.map((r) => ({
          ...r,
          id: crypto.randomUUID(),
          image_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      } else {
        savedBusinesses = inserted || [];
        console.log(`Saved ${savedBusinesses.length} new AI businesses to database`);
      }
    }

    const allBusinesses = [...dbBusinesses, ...savedBusinesses];

    // Always return results — even if AI failed, DB results are returned
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

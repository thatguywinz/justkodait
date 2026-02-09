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
] as const;

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

  // Sanitize location
  const sanitizedLocation = location
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (sanitizedLocation.length === 0) {
    return { ok: false, error: "Location contains only invalid characters" };
  }

  // Validate category
  if (category !== undefined && category !== null) {
    if (typeof category !== "string" || !VALID_CATEGORIES.includes(category as any)) {
      return { ok: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` };
    }
  }

  return { ok: true, location: sanitizedLocation, category: (category as string) || null };
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const categoryFilter = category ? ` focusing on ${category} businesses` : "";
    
    const prompt = `You are a local business expert. Generate a JSON array of 10-12 realistic local businesses near "${location}"${categoryFilter}. 
    
Each business MUST have this exact structure:
{
  "name": "Business Name",
  "category": "one of: restaurant, cafe, bakery, bar, retail, beauty, fitness, services, entertainment, grocery",
  "description": "A brief 1-2 sentence description",
  "address": "Full street address in ${location} area",
  "phone": "Local phone number format",
  "website": "https://example.com or null",
  "image_url": "https://images.unsplash.com/photo-... (use real unsplash URLs for the category)",
  "average_rating": number between 3.5 and 5.0,
  "review_count": number between 5 and 500,
  "latitude": realistic latitude for the location,
  "longitude": realistic longitude for the location,
  "is_verified": boolean
}

Make the businesses diverse, realistic for the area, and include a mix of categories unless a specific category was requested.
Return ONLY the JSON array, no other text or markdown.`;

    console.log("Calling Lovable AI Gateway for location:", location, "user:", user.id);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a local business expert. Return only valid JSON arrays, no markdown or explanation." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI rate limited. Please try again in a moment.",
            retry_after_seconds: 30,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Please add credits to your Lovable workspace.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI service error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const textContent = data.choices?.[0]?.message?.content;
    
    if (!textContent) {
      console.error("No content in AI response");
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let businesses;
    try {
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        businesses = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response");
      throw new Error("Failed to parse business data");
    }

    const validCategories = ["restaurant", "cafe", "bakery", "bar", "retail", "beauty", "fitness", "services", "entertainment", "grocery"];
    
    const validatedBusinesses = businesses.map((b: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      name: b.name || "Local Business",
      category: validCategories.includes(b.category) ? b.category : "services",
      description: b.description || null,
      address: b.address || location,
      phone: b.phone || null,
      website: b.website || null,
      image_url: b.image_url || null,
      average_rating: Math.min(5, Math.max(0, Number(b.average_rating) || 4.0)),
      review_count: Math.max(0, Number(b.review_count) || 10),
      latitude: Number(b.latitude) || null,
      longitude: Number(b.longitude) || null,
      is_verified: Boolean(b.is_verified),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    console.log(`Successfully parsed ${validatedBusinesses.length} businesses`);

    return new Response(JSON.stringify({ businesses: validatedBusinesses }), {
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

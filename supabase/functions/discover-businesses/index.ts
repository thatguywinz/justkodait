import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractRetryAfterSeconds(errorBodyText: string): number | null {
  try {
    const parsed = JSON.parse(errorBodyText);
    const delay = parsed?.error?.details?.find((d: any) => d?.retryDelay)?.retryDelay as
      | string
      | undefined;
    if (!delay) return null;
    // retryDelay is like "35s"
    const m = String(delay).match(/(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, category } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      // Pass through useful status codes instead of turning everything into a 500.
      if (response.status === 429) {
        const retryAfterSeconds = extractRetryAfterSeconds(errorText);
        const headers: Record<string, string> = {
          ...corsHeaders,
          "Content-Type": "application/json",
        };
        if (retryAfterSeconds != null) headers["Retry-After"] = String(retryAfterSeconds);

        return new Response(
          JSON.stringify({
            error:
              "AI quota exceeded / rate limited. Please try again in a bit, or enable billing/quotas for your Gemini API key.",
            retry_after_seconds: retryAfterSeconds,
          }),
          { status: 429, headers }
        );
      }

      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Gemini API key is unauthorized. Please verify the key and that the Gemini API is enabled." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Gemini API error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      throw new Error("No content in Gemini response");
    }

    // Parse the JSON from the response (handle potential markdown wrapping)
    let businesses;
    try {
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        businesses = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", textContent);
      throw new Error("Failed to parse business data");
    }

    // Ensure each business has required fields and valid category
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

    return new Response(JSON.stringify({ businesses: validatedBusinesses }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in discover-businesses:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, category } = await req.json();
    
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

    console.log("Calling Lovable AI Gateway for location:", location);

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
      console.error("No content in AI response:", JSON.stringify(data));
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

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
      console.error("Failed to parse AI response:", textContent);
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

    console.log(`Successfully parsed ${validatedBusinesses.length} businesses`);

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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { conversation_id, event_type, timestamp, phone, metadata, ...rest } = body;

    // Validate required fields
    if (!conversation_id || !event_type || timestamp === undefined || timestamp === null) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: conversation_id, event_type, timestamp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse timestamp
    let parsedTimestamp: string;
    if (typeof timestamp === 'number') {
      parsedTimestamp = new Date(timestamp).toISOString();
    } else if (typeof timestamp === 'string') {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) {
        return new Response(
          JSON.stringify({ error: 'Invalid timestamp format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      parsedTimestamp = d.toISOString();
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid timestamp type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase.from('ai_events').insert({
      conversation_id,
      event_type,
      timestamp: parsedTimestamp,
      phone: phone ?? null,
      metadata: metadata ?? null,
    });

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('ai-event error:', err);
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

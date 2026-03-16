const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'style';
    const slug = formData.get('slug') as string || 'unknown';
    const filename = formData.get('filename') as string || file.name;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const path = `${folder}/${slug}/${filename}`;
    const arrayBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from('reference-library')
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: urlData } = supabase.storage
      .from('reference-library')
      .getPublicUrl(path);

    return new Response(JSON.stringify({ success: true, url: urlData.publicUrl, path }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

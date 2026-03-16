
-- Prompts table
CREATE TABLE public.prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name text NOT NULL,
  file_path text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'core',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read prompts" ON public.prompts FOR SELECT TO public USING (true);
CREATE POLICY "Public insert prompts" ON public.prompts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update prompts" ON public.prompts FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public delete prompts" ON public.prompts FOR DELETE TO public USING (true);

-- Demo sites table
CREATE TABLE public.demo_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL,
  live_url text NOT NULL DEFAULT '',
  reference_role text NOT NULL DEFAULT 'style',
  industry text NOT NULL DEFAULT '',
  desktop_screenshot_url text NOT NULL DEFAULT '',
  mobile_screenshot_url text NOT NULL DEFAULT '',
  preview_image text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.demo_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read demo_sites" ON public.demo_sites FOR SELECT TO public USING (true);
CREATE POLICY "Public insert demo_sites" ON public.demo_sites FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update demo_sites" ON public.demo_sites FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public delete demo_sites" ON public.demo_sites FOR DELETE TO public USING (true);

-- Client projects table
CREATE TABLE public.client_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug text NOT NULL UNIQUE,
  client_name text NOT NULL,
  included_image_limit integer NOT NULL DEFAULT 20,
  uploaded_image_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read client_projects" ON public.client_projects FOR SELECT TO public USING (true);
CREATE POLICY "Public insert client_projects" ON public.client_projects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update client_projects" ON public.client_projects FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public delete client_projects" ON public.client_projects FOR DELETE TO public USING (true);

-- Client assets table
CREATE TABLE public.client_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug text NOT NULL REFERENCES public.client_projects(client_slug) ON DELETE CASCADE,
  asset_type text NOT NULL DEFAULT 'portfolio',
  folder_slug text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  alt_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read client_assets" ON public.client_assets FOR SELECT TO public USING (true);
CREATE POLICY "Public insert client_assets" ON public.client_assets FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update client_assets" ON public.client_assets FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public delete client_assets" ON public.client_assets FOR DELETE TO public USING (true);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('prompts', 'prompts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('demo-sites', 'demo-sites', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('client-projects', 'client-projects', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for new buckets
CREATE POLICY "Public read prompts storage" ON storage.objects FOR SELECT TO public USING (bucket_id = 'prompts');
CREATE POLICY "Public upload prompts storage" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'prompts');
CREATE POLICY "Public delete prompts storage" ON storage.objects FOR DELETE TO public USING (bucket_id = 'prompts');

CREATE POLICY "Public read demo-sites storage" ON storage.objects FOR SELECT TO public USING (bucket_id = 'demo-sites');
CREATE POLICY "Public upload demo-sites storage" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'demo-sites');
CREATE POLICY "Public delete demo-sites storage" ON storage.objects FOR DELETE TO public USING (bucket_id = 'demo-sites');

CREATE POLICY "Public read client-projects storage" ON storage.objects FOR SELECT TO public USING (bucket_id = 'client-projects');
CREATE POLICY "Public upload client-projects storage" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'client-projects');
CREATE POLICY "Public delete client-projects storage" ON storage.objects FOR DELETE TO public USING (bucket_id = 'client-projects');
CREATE POLICY "Public update client-projects storage" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'client-projects') WITH CHECK (bucket_id = 'client-projects');

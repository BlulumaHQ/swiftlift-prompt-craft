
CREATE TABLE public.client_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug text NOT NULL,
  content_type text NOT NULL DEFAULT 'portfolio',
  item_slug text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  featured_image text NOT NULL DEFAULT '',
  image_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read client_content_items" ON public.client_content_items FOR SELECT TO public USING (true);
CREATE POLICY "Public insert client_content_items" ON public.client_content_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update client_content_items" ON public.client_content_items FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public delete client_content_items" ON public.client_content_items FOR DELETE TO public USING (true);

CREATE TABLE public.client_content_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES public.client_content_items(id) ON DELETE CASCADE,
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  caption text NOT NULL DEFAULT '',
  alt_text text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_content_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read client_content_images" ON public.client_content_images FOR SELECT TO public USING (true);
CREATE POLICY "Public insert client_content_images" ON public.client_content_images FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update client_content_images" ON public.client_content_images FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public delete client_content_images" ON public.client_content_images FOR DELETE TO public USING (true);

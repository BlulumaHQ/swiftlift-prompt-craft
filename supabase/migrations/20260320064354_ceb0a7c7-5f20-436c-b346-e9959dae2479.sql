ALTER TABLE public.prompts 
ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS content_hash text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS sync_origin text NOT NULL DEFAULT 'cloud';
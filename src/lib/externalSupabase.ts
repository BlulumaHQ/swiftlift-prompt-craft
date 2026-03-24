import { createClient } from '@supabase/supabase-js';

export const externalSupabase = createClient(
  "https://czdbnlewbbwbtgjjwute.supabase.co",
  "sb_publishable_kcpYpK49_gQxhocNbK-dmw_Ixc1dsyb"
);

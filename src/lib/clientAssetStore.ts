import { supabase } from '@/integrations/supabase/client';

export type AssetType = 'portfolio' | 'blog' | 'gallery' | 'logo';

export interface ClientProject {
  id: string;
  client_slug: string;
  client_name: string;
  included_image_limit: number;
  uploaded_image_count: number;
  created_at: string;
}

export interface ClientAsset {
  id: string;
  client_slug: string;
  asset_type: AssetType;
  folder_slug: string;
  file_url: string;
  caption: string;
  alt_text: string;
  created_at: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
}

// --- Client Projects ---

export async function getClientProjects(): Promise<ClientProject[]> {
  const { data, error } = await supabase
    .from('client_projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ClientProject[];
}

export async function createClientProject(name: string, imageLimit: number = 20): Promise<ClientProject> {
  const slug = slugify(name);
  const { data, error } = await supabase
    .from('client_projects')
    .insert({ client_slug: slug, client_name: name, included_image_limit: imageLimit })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ClientProject;
}

export async function deleteClientProject(slug: string): Promise<void> {
  // Delete all assets in storage
  const folders = ['portfolio', 'blog', 'gallery', 'branding'];
  for (const folder of folders) {
    const { data: files } = await supabase.storage.from('client-projects').list(`${slug}/${folder}`);
    if (files && files.length > 0) {
      await supabase.storage.from('client-projects').remove(files.map(f => `${slug}/${folder}/${f.name}`));
    }
  }
  // DB cascade deletes assets
  const { error } = await supabase.from('client_projects').delete().eq('client_slug', slug);
  if (error) throw error;
}

// --- Client Assets ---

export async function getClientAssets(clientSlug: string): Promise<ClientAsset[]> {
  const { data, error } = await supabase
    .from('client_assets')
    .select('*')
    .eq('client_slug', clientSlug)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ClientAsset[];
}

export async function uploadClientAsset(
  clientSlug: string,
  assetType: AssetType,
  file: File,
  caption: string,
  altText: string
): Promise<ClientAsset> {
  const folder = assetType === 'logo' ? 'branding' : assetType;
  const ext = file.name.split('.').pop() || 'png';
  const filename = `${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;
  const path = `${clientSlug}/${folder}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('client-projects')
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('client-projects').getPublicUrl(path);

  const { data, error } = await supabase
    .from('client_assets')
    .insert({
      client_slug: clientSlug,
      asset_type: assetType,
      folder_slug: folder,
      file_url: urlData.publicUrl,
      caption,
      alt_text: altText,
    })
    .select()
    .single();
  if (error) throw error;

  // Update count
  const { data: countData } = await supabase.from('client_assets').select('id').eq('client_slug', clientSlug);
  await supabase.from('client_projects').update({ uploaded_image_count: countData?.length || 0 }).eq('client_slug', clientSlug);

  return data as unknown as ClientAsset;
}

export async function deleteClientAsset(id: string, fileUrl: string, clientSlug: string): Promise<void> {
  // Extract path from URL
  const urlObj = new URL(fileUrl);
  const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/client-projects\/(.+)/);
  if (pathMatch) {
    await supabase.storage.from('client-projects').remove([pathMatch[1]]);
  }

  const { error } = await supabase.from('client_assets').delete().eq('id', id);
  if (error) throw error;

  // Update count
  const { data: assets } = await supabase.from('client_assets').select('id').eq('client_slug', clientSlug);
  await supabase.from('client_projects').update({ uploaded_image_count: assets?.length || 0 }).eq('client_slug', clientSlug);
}

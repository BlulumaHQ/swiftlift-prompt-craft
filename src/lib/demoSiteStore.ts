import { supabase } from '@/integrations/supabase/client';

export interface DemoSite {
  id: string;
  site_name: string;
  live_url: string;
  reference_role: 'style' | 'conversion_layout';
  industry: string;
  desktop_screenshot_url: string;
  mobile_screenshot_url: string;
  preview_image: string;
  notes: string;
  created_at: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site';
}

export async function getDemoSites(): Promise<DemoSite[]> {
  const { data, error } = await supabase
    .from('demo_sites')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as DemoSite[];
}

export async function addDemoSite(
  site: Omit<DemoSite, 'id' | 'created_at'>,
  desktopFile?: File,
  mobileFile?: File
): Promise<DemoSite> {
  const slug = slugify(site.site_name);
  const folder = site.reference_role === 'style' ? 'style' : 'conversion-layout';
  let desktopUrl = site.desktop_screenshot_url;
  let mobileUrl = site.mobile_screenshot_url;
  let previewUrl = site.preview_image;

  if (desktopFile) {
    const ext = desktopFile.name.split('.').pop() || 'png';
    const path = `${folder}/${slug}/desktop_full.${ext}`;
    const { error } = await supabase.storage.from('demo-sites').upload(path, desktopFile, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('demo-sites').getPublicUrl(path);
      desktopUrl = urlData.publicUrl;
      if (!previewUrl) previewUrl = desktopUrl;
    }
  }

  if (mobileFile) {
    const ext = mobileFile.name.split('.').pop() || 'png';
    const path = `${folder}/${slug}/mobile_full.${ext}`;
    const { error } = await supabase.storage.from('demo-sites').upload(path, mobileFile, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('demo-sites').getPublicUrl(path);
      mobileUrl = urlData.publicUrl;
    }
  }

  // Upload site.json
  const siteJson = JSON.stringify({
    site_name: site.site_name,
    live_url: site.live_url,
    reference_role: site.reference_role,
  });
  const jsonBlob = new Blob([siteJson], { type: 'application/json' });
  await supabase.storage.from('demo-sites').upload(`${folder}/${slug}/site.json`, jsonBlob, { upsert: true });

  const { data, error } = await supabase
    .from('demo_sites')
    .insert({
      site_name: site.site_name,
      live_url: site.live_url,
      reference_role: site.reference_role,
      industry: site.industry,
      desktop_screenshot_url: desktopUrl,
      mobile_screenshot_url: mobileUrl,
      preview_image: previewUrl || desktopUrl,
      notes: site.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DemoSite;
}

export async function deleteDemoSite(id: string, siteName: string, role: string): Promise<void> {
  const slug = slugify(siteName);
  const folder = role === 'style' ? 'style' : 'conversion-layout';

  // Delete storage files
  const { data: files } = await supabase.storage.from('demo-sites').list(`${folder}/${slug}`);
  if (files && files.length > 0) {
    await supabase.storage.from('demo-sites').remove(files.map(f => `${folder}/${slug}/${f.name}`));
  }

  const { error } = await supabase.from('demo_sites').delete().eq('id', id);
  if (error) throw error;
}

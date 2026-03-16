import { supabase } from '@/integrations/supabase/client';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ref';
}

export async function uploadScreenshot(
  file: File,
  folder: 'style' | 'conversion-layout',
  refSlug: string,
  filename: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('slug', refSlug);
  formData.append('filename', filename);

  const { data, error } = await supabase.functions.invoke('upload-reference-screenshot', {
    body: formData,
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Upload failed');
  return data.url;
}

export async function uploadReferenceScreenshots(
  files: { desktop_hero?: File; desktop_full?: File; mobile_hero?: File; mobile_full?: File },
  role: 'style' | 'conversion_layout',
  refName: string
): Promise<{ desktop_hero: string; desktop_full: string; mobile_hero: string; mobile_full: string }> {
  const folder = role === 'style' ? 'style' : 'conversion-layout';
  const slug = slugify(refName);
  const result = { desktop_hero: '', desktop_full: '', mobile_hero: '', mobile_full: '' };

  const uploads = Object.entries(files)
    .filter(([_, file]) => file)
    .map(async ([key, file]) => {
      const ext = file!.name.split('.').pop() || 'png';
      const url = await uploadScreenshot(file!, folder as any, slug, `${key}.${ext}`);
      (result as any)[key] = url;
    });

  await Promise.all(uploads);
  return result;
}

export { slugify };

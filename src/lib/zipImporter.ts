import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';

interface ZipImportResult {
  clientSlug: string;
  itemsCreated: number;
  imagesUploaded: number;
  errors: string[];
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'];

function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.includes(ext);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

export async function importClientZip(file: File): Promise<ZipImportResult> {
  const zip = await JSZip.loadAsync(file);
  const errors: string[] = [];
  let itemsCreated = 0;
  let imagesUploaded = 0;

  // Detect structure: client-slug/content-type/item-slug/files
  const paths = Object.keys(zip.files).filter(p => !zip.files[p].dir);

  // Determine client slug from root folder
  const firstPath = paths[0] || '';
  const segments = firstPath.split('/').filter(Boolean);
  if (segments.length < 2) {
    return { clientSlug: '', itemsCreated: 0, imagesUploaded: 0, errors: ['Invalid ZIP structure. Expected: client-slug/content-type/...'] };
  }

  const clientSlug = slugify(segments[0]);

  // Ensure client project exists
  const { data: existingProject } = await supabase
    .from('client_projects')
    .select('client_slug')
    .eq('client_slug', clientSlug)
    .maybeSingle();

  if (!existingProject) {
    const clientName = segments[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const { error } = await supabase
      .from('client_projects')
      .insert({ client_slug: clientSlug, client_name: clientName, included_image_limit: 200 });
    if (error) {
      errors.push(`Failed to create project: ${error.message}`);
      return { clientSlug, itemsCreated: 0, imagesUploaded: 0, errors };
    }
  }

  // Group files by content-type and item-slug
  const contentMap = new Map<string, Map<string, string[]>>();

  for (const path of paths) {
    const segs = path.split('/').filter(Boolean);
    if (segs.length < 3) continue; // Need at least client/type/file

    const contentType = segs[1].toLowerCase();
    const validTypes = ['portfolio', 'blog', 'gallery', 'branding'];
    if (!validTypes.includes(contentType)) continue;

    if (contentType === 'branding') {
      // Branding files go directly, no item slug
      if (!contentMap.has(contentType)) contentMap.set(contentType, new Map());
      const items = contentMap.get(contentType)!;
      if (!items.has('_root')) items.set('_root', []);
      items.get('_root')!.push(path);
    } else {
      const itemSlug = segs.length >= 4 ? segs[2] : '_root';
      if (!contentMap.has(contentType)) contentMap.set(contentType, new Map());
      const items = contentMap.get(contentType)!;
      if (!items.has(itemSlug)) items.set(itemSlug, []);
      items.get(itemSlug)!.push(path);
    }
  }

  // Process each content type and item
  for (const [contentType, items] of contentMap) {
    for (const [itemSlug, filePaths] of items) {
      // Check for project.json or post.json
      let title = itemSlug === '_root' ? contentType : itemSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      let description = '';
      let featuredImage = '';

      const jsonFile = filePaths.find(p => p.endsWith('.json'));
      if (jsonFile) {
        try {
          const jsonContent = await zip.files[jsonFile].async('text');
          const meta = JSON.parse(jsonContent);
          if (meta.title) title = meta.title;
          if (meta.description) description = meta.description;
          if (meta.featured_image) featuredImage = meta.featured_image;
        } catch {
          errors.push(`Failed to parse ${jsonFile}`);
        }
      }

      const imageFiles = filePaths.filter(p => isImageFile(p));

      // Create content item record
      const assetType = contentType === 'branding' ? 'logo' : contentType;
      const actualItemSlug = itemSlug === '_root' ? contentType : itemSlug;

      const { data: contentItem, error: itemError } = await supabase
        .from('client_content_items')
        .insert({
          client_slug: clientSlug,
          content_type: assetType,
          item_slug: actualItemSlug,
          title,
          description,
          image_count: imageFiles.length,
        })
        .select()
        .single();

      if (itemError) {
        errors.push(`Failed to create item ${actualItemSlug}: ${itemError.message}`);
        continue;
      }
      itemsCreated++;

      // Upload images
      const folder = contentType === 'branding' ? 'branding' : contentType;
      for (let i = 0; i < imageFiles.length; i++) {
        const imgPath = imageFiles[i];
        const fileName = imgPath.split('/').pop() || `image-${i}.png`;
        const storagePath = `${clientSlug}/${folder}/${actualItemSlug}/${fileName}`;

        try {
          const blob = await zip.files[imgPath].async('blob');
          const { error: uploadError } = await supabase.storage
            .from('client-projects')
            .upload(storagePath, blob, { upsert: true });

          if (uploadError) {
            errors.push(`Upload failed: ${fileName} — ${uploadError.message}`);
            continue;
          }

          const { data: urlData } = supabase.storage.from('client-projects').getPublicUrl(storagePath);

          // Create image record
          await supabase.from('client_content_images').insert({
            content_item_id: contentItem.id,
            file_url: urlData.publicUrl,
            file_name: fileName,
            sort_order: i,
            caption: '',
            alt_text: '',
          });

          // Also create legacy client_assets record for backward compat
          await supabase.from('client_assets').insert({
            client_slug: clientSlug,
            asset_type: assetType,
            folder_slug: folder,
            file_url: urlData.publicUrl,
            caption: title,
            alt_text: fileName,
          });

          // Set featured image
          if (i === 0 && !featuredImage) {
            await supabase.from('client_content_items')
              .update({ featured_image: urlData.publicUrl })
              .eq('id', contentItem.id);
          }

          imagesUploaded++;
        } catch (err: any) {
          errors.push(`Error uploading ${fileName}: ${err.message}`);
        }
      }

      // If featured_image was specified in JSON, resolve it
      if (featuredImage && contentItem) {
        const resolvedPath = `${clientSlug}/${folder}/${actualItemSlug}/${featuredImage}`;
        const { data: urlData } = supabase.storage.from('client-projects').getPublicUrl(resolvedPath);
        await supabase.from('client_content_items')
          .update({ featured_image: urlData.publicUrl })
          .eq('id', contentItem.id);
      }
    }
  }

  // Update project image count
  const { data: allAssets } = await supabase.from('client_assets').select('id').eq('client_slug', clientSlug);
  await supabase.from('client_projects')
    .update({ uploaded_image_count: allAssets?.length || 0 })
    .eq('client_slug', clientSlug);

  return { clientSlug, itemsCreated, imagesUploaded, errors };
}

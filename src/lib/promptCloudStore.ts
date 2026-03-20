import { supabase } from '@/integrations/supabase/client';

export interface CloudPrompt {
  id: string;
  prompt_name: string;
  file_path: string;
  version: number;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
  revision_number: number;
  content_hash: string;
  sync_origin: string;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'prompt';
}

/** Simple fast hash for content comparison (djb2) */
export function computeContentHash(content: string): string {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

async function uploadMarkdown(filePath: string, content: string): Promise<void> {
  const blob = new Blob([content], { type: 'text/markdown' });
  const { error } = await supabase.storage
    .from('prompts')
    .upload(filePath, blob, { contentType: 'text/markdown', upsert: true });
  if (error) throw error;
}

async function deleteMarkdown(filePath: string): Promise<void> {
  if (!filePath) return;
  await supabase.storage.from('prompts').remove([filePath]);
}

export async function getCloudPrompts(): Promise<CloudPrompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as CloudPrompt[];
}

export async function saveCloudPrompt(prompt: Omit<CloudPrompt, 'id' | 'created_at' | 'updated_at' | 'revision_number' | 'content_hash' | 'sync_origin'> & { id?: string; revision_number?: number; content_hash?: string; sync_origin?: string }): Promise<CloudPrompt> {
  const filePath = prompt.file_path || `core/${slugify(prompt.prompt_name)}_v${prompt.version}.md`;
  const contentHash = computeContentHash(prompt.content);

  // Upload markdown to storage
  await uploadMarkdown(filePath, prompt.content);

  if (prompt.id) {
    // Fetch existing record to determine revision increment
    const { data: existing } = await supabase
      .from('prompts')
      .select('revision_number, content_hash')
      .eq('id', prompt.id)
      .single();

    const currentRevision = (existing as any)?.revision_number ?? 0;
    const existingHash = (existing as any)?.content_hash ?? '';
    // Only increment revision if content actually changed
    const newRevision = (existingHash && existingHash === contentHash) ? currentRevision : currentRevision + 1;

    const { data, error } = await supabase
      .from('prompts')
      .update({
        prompt_name: prompt.prompt_name,
        file_path: filePath,
        version: prompt.version,
        content: prompt.content,
        category: prompt.category,
        updated_at: new Date().toISOString(),
        revision_number: newRevision,
        content_hash: contentHash,
        sync_origin: prompt.sync_origin || 'cloud',
      } as any)
      .eq('id', prompt.id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as CloudPrompt;
  } else {
    const { data, error } = await supabase
      .from('prompts')
      .insert({
        prompt_name: prompt.prompt_name,
        file_path: filePath,
        version: prompt.version,
        content: prompt.content,
        category: prompt.category,
        revision_number: 1,
        content_hash: contentHash,
        sync_origin: prompt.sync_origin || 'cloud',
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as CloudPrompt;
  }
}

export async function deleteCloudPrompt(id: string, filePath: string): Promise<void> {
  await deleteMarkdown(filePath);
  const { error } = await supabase.from('prompts').delete().eq('id', id);
  if (error) throw error;
}

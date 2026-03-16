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
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'prompt';
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

export async function saveCloudPrompt(prompt: Omit<CloudPrompt, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<CloudPrompt> {
  const filePath = prompt.file_path || `core/${slugify(prompt.prompt_name)}_v${prompt.version}.md`;

  // Upload markdown to storage
  await uploadMarkdown(filePath, prompt.content);

  if (prompt.id) {
    // Update
    const { data, error } = await supabase
      .from('prompts')
      .update({
        prompt_name: prompt.prompt_name,
        file_path: filePath,
        version: prompt.version,
        content: prompt.content,
        category: prompt.category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prompt.id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as CloudPrompt;
  } else {
    // Insert
    const { data, error } = await supabase
      .from('prompts')
      .insert({
        prompt_name: prompt.prompt_name,
        file_path: filePath,
        version: prompt.version,
        content: prompt.content,
        category: prompt.category,
      })
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

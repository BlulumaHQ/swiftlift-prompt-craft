import { useState, useEffect } from 'react';
import NavHeader from '@/components/NavHeader';
import {
  getCloudPrompts, saveCloudPrompt, deleteCloudPrompt, type CloudPrompt
} from '@/lib/promptCloudStore';
import {
  getPromptLibrary, savePromptBlock, deletePromptBlock,
  categoryLabels, categoryOrder, type PromptBlock,
} from '@/lib/promptLibraryStore';
import { Save, Check, Trash2, ChevronRight, ChevronDown, FileText, Cloud, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// System prompt IDs that should be hidden from the operational library
const SYSTEM_PROMPT_IDS = ['generator_app_build_v1'];

// Unified prompt item that can come from local or cloud
interface PromptItem {
  id: string;
  name: string;
  content: string;
  category: string;
  source: 'local' | 'cloud';
  cloudId?: string;
  filePath?: string;
  version?: number;
  type?: string;
  status?: string;
}

export default function PromptLibrary() {
  const { toast } = useToast();
  const [items, setItems] = useState<PromptItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    // Load local prompts — filter out system prompts
    const localPrompts = getPromptLibrary().filter(p => !SYSTEM_PROMPT_IDS.includes(p.id));
    const localItems: PromptItem[] = localPrompts.map(p => ({
      id: p.id, name: p.name, content: p.content, category: p.category,
      source: 'local' as const, type: p.type, status: p.status,
    }));

    // Load cloud prompts
    let cloudItems: PromptItem[] = [];
    try {
      const cloudPrompts = await getCloudPrompts();
      cloudItems = cloudPrompts.map(p => ({
        id: `cloud-${p.id}`, name: p.prompt_name, content: p.content, category: p.category,
        source: 'cloud' as const, cloudId: p.id, filePath: p.file_path, version: p.version,
      }));
    } catch (err) {
      console.warn('Could not load cloud prompts:', err);
    }

    const all = [...localItems, ...cloudItems];
    setItems(all);
    if (all.length > 0 && !selectedId) {
      setSelectedId(all[0].id);
      setEditContent(all[0].content);
      setEditName(all[0].name);
    }
  }

  const selectedItem = items.find(b => b.id === selectedId) || null;

  const handleSelect = (item: PromptItem) => {
    setSelectedId(item.id);
    setEditContent(item.content);
    setEditName(item.name);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      if (selectedItem.source === 'cloud') {
        await saveCloudPrompt({
          id: selectedItem.cloudId,
          prompt_name: editName,
          file_path: selectedItem.filePath || '',
          version: selectedItem.version || 1,
          content: editContent,
          category: selectedItem.category,
        });
        toast({ title: 'Saved to cloud' });
      } else {
        const updated: PromptBlock = {
          id: selectedItem.id,
          name: editName,
          content: editContent,
          category: selectedItem.category as any,
          mode: 'prompts',
          type: (selectedItem.type || 'Output Prompt') as any,
          status: (selectedItem.status || 'CONFIRMED') as any,
        };
        savePromptBlock(updated);
        toast({ title: 'Saved locally' });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const item = items.find(i => i.id === deleteTarget);
    if (!item) return;
    try {
      if (item.source === 'cloud' && item.cloudId) {
        await deleteCloudPrompt(item.cloudId, item.filePath || '');
      } else {
        deletePromptBlock(item.id);
      }
      await loadAll();
      if (selectedId === deleteTarget) {
        const remaining = items.filter(i => i.id !== deleteTarget);
        const next = remaining[0];
        setSelectedId(next?.id || null);
        setEditContent(next?.content || '');
        setEditName(next?.name || '');
      }
      setDeleteTarget(null);
      toast({ title: 'Prompt deleted' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSyncToCloud = async () => {
    setSyncing(true);
    try {
      // Load existing cloud prompts to match by name
      const existingCloud = await getCloudPrompts();
      const cloudByName = new Map(existingCloud.map(c => [c.prompt_name, c]));

      // Only sync operational prompts, not system ones
      const localPrompts = getPromptLibrary().filter(p => !SYSTEM_PROMPT_IDS.includes(p.id));
      for (const p of localPrompts) {
        const existing = cloudByName.get(p.name);
        await saveCloudPrompt({
          id: existing?.id,                       // pass existing id → UPDATE, not INSERT
          prompt_name: p.name,
          file_path: existing?.file_path || '',    // preserve existing file path
          version: existing ? existing.version : 1,
          content: p.content,
          category: p.category,
        });
      }
      toast({ title: `Synced ${localPrompts.length} prompts to cloud` });
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    }
    setSyncing(false);
  };

  // Group by source then category
  const groups = [
    { key: 'cloud', label: 'Cloud Prompts', items: items.filter(i => i.source === 'cloud') },
    { key: 'local', label: 'Local Prompts', items: items.filter(i => i.source === 'local') },
  ].filter(g => g.items.length > 0);

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Prompt Library" />

      <div className="flex flex-1 min-h-0">
        {/* Tree sidebar */}
        <aside className="w-[320px] shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <button onClick={() => setAllExpanded(!allExpanded)}
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                {allExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {allExpanded ? 'Collapse' : 'Expand'}
              </button>
              <button onClick={handleSyncToCloud} disabled={syncing}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                {syncing ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />}
                Sync to Cloud
              </button>
            </div>

            {groups.map(group => (
              <div key={group.key} className="mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {allExpanded ? <ChevronDown size={12} className="text-muted-foreground/60" /> : <ChevronRight size={12} className="text-muted-foreground/60" />}
                  {group.key === 'cloud' && <Cloud size={10} />}
                  {group.label}
                  <span className="ml-auto text-[10px] font-normal opacity-60">{group.items.length}</span>
                </div>
                {allExpanded && (
                  <div className="ml-3 border-l border-border/50">
                    {group.items.map(item => (
                      <button key={item.id} onClick={() => handleSelect(item)}
                        className={`w-full text-left flex items-center gap-2 pl-3 pr-2 py-1.5 text-[12px] transition-colors rounded-r-md ${
                          selectedId === item.id
                            ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-px'
                            : 'text-foreground hover:bg-muted/60'
                        }`}>
                        <FileText size={11} className="shrink-0 opacity-40" />
                        <span className="truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Editor */}
        <main className="flex-1 flex flex-col p-6 overflow-hidden">
          {selectedItem ? (
            <>
              <div className="flex items-start justify-between mb-4 gap-4">
                <div className="flex-1 min-w-0">
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="text-lg font-bold text-foreground bg-transparent border-none outline-none w-full focus:ring-0" />
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {selectedItem.source === 'cloud' ? 'Cloud' : 'Local'}
                    </Badge>
                    {selectedItem.filePath && (
                      <span className="text-[10px] text-muted-foreground font-mono">{selectedItem.filePath}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setDeleteTarget(selectedItem.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 size={14} /> Delete
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
                    {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                className="flex-1 w-full p-4 rounded-lg border border-border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter prompt content..." />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Select a prompt to edit</p>
            </div>
          )}
        </main>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this prompt?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

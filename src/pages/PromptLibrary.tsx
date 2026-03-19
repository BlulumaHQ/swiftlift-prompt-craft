import { useState, useEffect, useRef } from 'react';
import NavHeader from '@/components/NavHeader';
import {
  getCloudPrompts, saveCloudPrompt, deleteCloudPrompt, type CloudPrompt
} from '@/lib/promptCloudStore';
import {
  getPromptLibrary, savePromptBlock, deletePromptBlock,
  categoryLabels, categoryOrder, type PromptBlock,
} from '@/lib/promptLibraryStore';
import { Save, Check, Trash2, ChevronRight, ChevronDown, FileText, Cloud, Loader2, Lock, Unlock, RotateCcw, ShieldAlert, ArrowLeft } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const SYSTEM_PROMPT_IDS = ['generator_app_build_v1'];

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
  const isMobile = useIsMobile();
  const [items, setItems] = useState<PromptItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);

  const previousVersions = useRef<Map<string, { name: string; content: string }>>(new Map());

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { setEditMode(false); }, [selectedId]);

  async function loadAll() {
    const localPrompts = getPromptLibrary().filter(p => !SYSTEM_PROMPT_IDS.includes(p.id));
    const localItems: PromptItem[] = localPrompts.map(p => ({
      id: p.id, name: p.name, content: p.content, category: p.category,
      source: 'local' as const, type: p.type, status: p.status,
    }));

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
    setEditMode(false);
  };

  const hasPreviousVersion = selectedId ? previousVersions.current.has(selectedId) : false;

  const handleSaveRequest = () => {
    if (!selectedItem || !editMode) return;
    setSaveConfirmOpen(true);
  };

  const handleConfirmedSave = async () => {
    if (!selectedItem) return;
    setSaveConfirmOpen(false);
    setSaving(true);

    previousVersions.current.set(selectedItem.id, {
      name: selectedItem.name,
      content: selectedItem.content,
    });

    try {
      const localBlock: PromptBlock = {
        id: selectedItem.source === 'cloud' ? selectedItem.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') : selectedItem.id,
        name: editName, content: editContent,
        category: selectedItem.category as any, mode: 'prompts',
        type: (selectedItem.type || 'Output Prompt') as any,
        status: (selectedItem.status || 'CONFIRMED') as any,
      };
      savePromptBlock(localBlock);

      const existingCloud = await getCloudPrompts();
      const cloudMatch = existingCloud.find(c => c.prompt_name === editName || c.id === selectedItem.cloudId);
      await saveCloudPrompt({
        id: cloudMatch?.id || selectedItem.cloudId,
        prompt_name: editName,
        file_path: cloudMatch?.file_path || selectedItem.filePath || '',
        version: cloudMatch ? cloudMatch.version : (selectedItem.version || 1),
        content: editContent,
        category: selectedItem.category,
      });

      const verifyCloud = await getCloudPrompts();
      const savedCloud = verifyCloud.find(c => c.prompt_name === editName);
      const localPrompts = getPromptLibrary();
      const savedLocal = localPrompts.find(p => p.name === editName);

      if (savedCloud && savedLocal && savedCloud.content === savedLocal.content) {
        toast({ title: 'Saved & synced (local + cloud)' });
      } else {
        toast({ title: 'Saved', description: 'Warning: sync verification could not confirm match.', variant: 'destructive' });
      }

      setSaved(true);
      setEditMode(false);
      setTimeout(() => setSaved(false), 2000);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleRevertRequest = () => {
    if (!selectedId || !hasPreviousVersion) return;
    setRevertConfirmOpen(true);
  };

  const handleConfirmedRevert = async () => {
    if (!selectedId) return;
    setRevertConfirmOpen(false);
    const prev = previousVersions.current.get(selectedId);
    if (!prev) return;

    setEditName(prev.name);
    setEditContent(prev.content);

    const item = items.find(i => i.id === selectedId);
    if (!item) return;

    try {
      savePromptBlock({
        id: item.source === 'cloud' ? prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') : item.id,
        name: prev.name, content: prev.content,
        category: item.category as any, mode: 'prompts',
        type: (item.type || 'Output Prompt') as any,
        status: (item.status || 'CONFIRMED') as any,
      });

      const existingCloud = await getCloudPrompts();
      const cloudMatch = existingCloud.find(c => c.prompt_name === prev.name || c.id === item.cloudId);
      await saveCloudPrompt({
        id: cloudMatch?.id || item.cloudId,
        prompt_name: prev.name,
        file_path: cloudMatch?.file_path || item.filePath || '',
        version: cloudMatch ? cloudMatch.version : (item.version || 1),
        content: prev.content,
        category: item.category,
      });

      previousVersions.current.delete(selectedId);
      setEditMode(false);
      toast({ title: 'Reverted & synced (local + cloud)' });
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Revert failed', description: err.message, variant: 'destructive' });
    }
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
      const existingCloud = await getCloudPrompts();
      const cloudByName = new Map(existingCloud.map(c => [c.prompt_name, c]));
      const localPrompts = getPromptLibrary().filter(p => !SYSTEM_PROMPT_IDS.includes(p.id));
      for (const p of localPrompts) {
        const existing = cloudByName.get(p.name);
        await saveCloudPrompt({
          id: existing?.id,
          prompt_name: p.name,
          file_path: existing?.file_path || '',
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

  const groups = [
    { key: 'cloud', label: 'Cloud Prompts', items: items.filter(i => i.source === 'cloud') },
    { key: 'local', label: 'Local Prompts', items: items.filter(i => i.source === 'local') },
  ].filter(g => g.items.length > 0);

  const sidebar = (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <button onClick={() => setAllExpanded(!allExpanded)}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
          {allExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {allExpanded ? 'Collapse' : 'Expand'}
        </button>
        <div className="flex items-center gap-1">
          <button onClick={handleSyncToCloud} disabled={syncing}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />}
            Sync
          </button>
        </div>
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
                  className={`w-full text-left flex items-center gap-2 pl-3 pr-2 py-2 text-[12px] transition-colors rounded-r-md ${
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
  );

  const editor = selectedItem ? (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Mobile back button */}
      {isMobile && (
        <button onClick={() => setSelectedId(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft size={14} /> Back to list
        </button>
      )}

      {editMode && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs sm:text-sm font-medium">
          <ShieldAlert size={16} className="shrink-0" />
          <span>Editing system prompt — changes will affect future builds</span>
        </div>
      )}

      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-start justify-between gap-4'} mb-4`}>
        <div className="flex-1 min-w-0">
          <input value={editName} onChange={e => editMode && setEditName(e.target.value)}
            readOnly={!editMode}
            className={`text-base sm:text-lg font-bold bg-transparent border-none outline-none w-full focus:ring-0 ${
              editMode ? 'text-foreground' : 'text-foreground/70 cursor-default'
            }`} />
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono">
              {selectedItem.source === 'cloud' ? 'Cloud' : 'Local'}
            </Badge>
            {!editMode && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Lock size={8} /> Locked
              </Badge>
            )}
            {editMode && (
              <Badge className="text-[10px] gap-1 bg-amber-500/20 text-amber-700 border-amber-500/30">
                <Unlock size={8} /> Editing Mode Active
              </Badge>
            )}
            {selectedItem.filePath && !isMobile && (
              <span className="text-[10px] text-muted-foreground font-mono">{selectedItem.filePath}</span>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : 'shrink-0'}`}>
          {!editMode ? (
            <>
              <button onClick={() => setUnlockConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-500/30 transition-colors">
                <Unlock size={14} /> Unlock Editing
              </button>
              {hasPreviousVersion && (
                <button onClick={handleRevertRequest}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 transition-colors">
                  <RotateCcw size={14} /> <span className="hidden sm:inline">Revert to Previous Version</span><span className="sm:hidden">Revert</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => { setEditMode(false); setEditContent(selectedItem.content); setEditName(selectedItem.name); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-muted-foreground hover:bg-muted/60 transition-colors">
                Cancel
              </button>
              <button onClick={() => setDeleteTarget(selectedItem.id)}
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs sm:text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={14} />
              </button>
              <button onClick={handleSaveRequest} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-md">
                {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
                {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
      <textarea value={editContent} onChange={e => editMode && setEditContent(e.target.value)}
        readOnly={!editMode}
        className={`flex-1 w-full p-3 sm:p-4 rounded-lg border font-mono text-xs sm:text-sm resize-none focus:outline-none transition-colors min-h-[300px] ${
          editMode
            ? 'border-amber-500/40 bg-amber-500/5 focus:ring-2 focus:ring-amber-500/30'
            : 'border-border bg-muted/30 cursor-default text-foreground/80'
        }`}
        placeholder="Enter prompt content..." />
    </div>
  ) : (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <p>Select a prompt to edit</p>
    </div>
  );

  if (isMobile) {
    // On mobile: show list or editor
    return (
      <div className="flex flex-col h-screen">
        <NavHeader title="Prompt Library" />
        <div className="flex-1 overflow-y-auto">
          {selectedId ? (
            <div className="p-4 flex flex-col h-full">{editor}</div>
          ) : (
            <div className="border-b border-border bg-card">{sidebar}</div>
          )}
        </div>

        {/* Dialogs */}
        <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this prompt?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={unlockConfirmOpen} onOpenChange={setUnlockConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unlock Editing</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to edit a locked system prompt. Changes may affect all future builds. Do you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setUnlockConfirmOpen(false); setEditMode(true); }}>Unlock</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Save</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to overwrite this prompt? The current version will be replaced. A single previous version backup will be kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmedSave}>Confirm Save</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={revertConfirmOpen} onOpenChange={setRevertConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revert Prompt</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to revert to the previous version? This will overwrite the current version.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmedRevert}>Confirm Revert</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Prompt Library" />
      <div className="flex flex-1 min-h-0">
        <aside className="w-[320px] shrink-0 border-r border-border bg-card overflow-y-auto">
          {sidebar}
        </aside>
        <main className="flex-1 flex flex-col p-6 overflow-hidden">
          {editor}
        </main>
      </div>

      {/* Dialogs */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this prompt?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unlockConfirmOpen} onOpenChange={setUnlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock Editing</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to edit a locked system prompt. Changes may affect all future builds. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setUnlockConfirmOpen(false); setEditMode(true); }}>Unlock</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to overwrite this prompt? The current version will be replaced. A single previous version backup will be kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSave}>Confirm Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revertConfirmOpen} onOpenChange={setRevertConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revert to the previous version? This will overwrite the current version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedRevert}>Confirm Revert</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

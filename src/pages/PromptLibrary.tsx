import { useState, useEffect } from 'react';
import NavHeader from '@/components/NavHeader';
import {
  getPromptLibrary,
  savePromptBlock,
  deletePromptBlock,
  resetLibrary,
  categoryLabels,
  categoryOrder,
  PromptBlock,
  PromptCategory,
} from '@/lib/promptLibraryStore';
import { Save, Check, Trash2, ChevronRight, FileText } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PromptLibrary() {
  const [library, setLibrary] = useState<PromptBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    resetLibrary(); // Force clean state on mount per requirements
    const prompts = getPromptLibrary();
    setLibrary(prompts);
    if (prompts.length > 0) {
      setSelectedId(prompts[0].id);
      setEditContent(prompts[0].content);
    }
  }, []);

  const selectedBlock = library.find(b => b.id === selectedId) || null;

  const handleSelect = (block: PromptBlock) => {
    setSelectedId(block.id);
    setEditContent(block.content);
    setSaved(false);
  };

  const handleSave = () => {
    if (!selectedBlock) return;
    const updated = { ...selectedBlock, content: editContent };
    savePromptBlock(updated);
    setLibrary(getPromptLibrary());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePromptBlock(deleteTarget);
    const updated = getPromptLibrary();
    setLibrary(updated);
    if (selectedId === deleteTarget) {
      setSelectedId(updated.length > 0 ? updated[0].id : null);
      setEditContent(updated.length > 0 ? updated[0].content : '');
    }
    setDeleteTarget(null);
  };

  const grouped = categoryOrder.map(cat => ({
    category: cat,
    label: categoryLabels[cat],
    prompts: library.filter(b => b.category === cat),
  }));

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Prompt Library" />

      <div className="flex flex-1 min-h-0">
        {/* Tree sidebar */}
        <aside className="w-[300px] shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-3">
            {grouped.map(group => (
              <div key={group.category} className="mb-3">
                {/* Category heading - always visible */}
                <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <ChevronRight size={12} className="text-muted-foreground/60" />
                  {group.label}
                </div>
                {/* Prompt items - always visible (no toggle) */}
                <div className="ml-3 border-l border-border/50">
                  {group.prompts.map(block => (
                    <button
                      key={block.id}
                      onClick={() => handleSelect(block)}
                      className={`w-full text-left flex items-center gap-2 pl-3 pr-2 py-1.5 text-[13px] transition-colors rounded-r-md ${
                        selectedId === block.id
                          ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-px'
                          : 'text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <FileText size={12} className="shrink-0 opacity-50" />
                      <span className="truncate">{block.name}</span>
                    </button>
                  ))}
                  {group.prompts.length === 0 && (
                    <p className="pl-4 py-1 text-xs text-muted-foreground italic">No prompts</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Editor */}
        <main className="flex-1 flex flex-col p-6 overflow-hidden">
          {selectedBlock ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selectedBlock.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabels[selectedBlock.category]} · <span className="font-mono">{selectedBlock.id}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeleteTarget(selectedBlock.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save Changes</>}
                  </button>
                </div>
              </div>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="flex-1 w-full p-4 rounded-lg border border-border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter prompt content..."
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Select a prompt to edit</p>
            </div>
          )}
        </main>
      </div>

      {/* Delete confirmation */}
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

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
} from '@/lib/promptLibraryStore';
import { Save, Check, Trash2, ChevronRight, ChevronDown, FileText } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

export default function PromptLibrary() {
  const [library, setLibrary] = useState<PromptBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [saved, setSaved] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState(true);

  useEffect(() => {
    resetLibrary();
    const prompts = getPromptLibrary();
    setLibrary(prompts);
    if (prompts.length > 0) {
      setSelectedId(prompts[0].id);
      setEditContent(prompts[0].content);
      setEditName(prompts[0].name);
    }
  }, []);

  const selectedBlock = library.find(b => b.id === selectedId) || null;

  const handleSelect = (block: PromptBlock) => {
    setSelectedId(block.id);
    setEditContent(block.content);
    setEditName(block.name);
    setSaved(false);
  };

  const handleSave = () => {
    if (!selectedBlock) return;
    const updated = { ...selectedBlock, content: editContent, name: editName };
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
      const next = updated[0];
      setSelectedId(next?.id || null);
      setEditContent(next?.content || '');
      setEditName(next?.name || '');
    }
    setDeleteTarget(null);
  };

  const groups = categoryOrder.map(cat => ({
    key: cat,
    label: categoryLabels[cat],
    items: library.filter(b => b.category === cat),
  }));

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Prompt Library" />

      <div className="flex flex-1 min-h-0">
        {/* Tree sidebar */}
        <aside className="w-[320px] shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-3 space-y-2">
            {/* Expand / Collapse control */}
            <button
              onClick={() => setAllExpanded(!allExpanded)}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {allExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {allExpanded ? 'Collapse' : 'Expand'}
            </button>

            {/* Tree */}
            {groups.map(group => (
              <div key={group.key} className="mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {allExpanded ? <ChevronDown size={12} className="text-muted-foreground/60" /> : <ChevronRight size={12} className="text-muted-foreground/60" />}
                  {group.label}
                  <span className="ml-auto text-[10px] font-normal opacity-60">{group.items.length}</span>
                </div>
                {allExpanded && (
                  <div className="ml-3 border-l border-border/50">
                    {group.items.map(block => (
                      <button
                        key={block.id}
                        onClick={() => handleSelect(block)}
                        className={`w-full text-left flex items-center gap-2 pl-3 pr-2 py-1.5 text-[12px] transition-colors rounded-r-md ${
                          selectedId === block.id
                            ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-px'
                            : 'text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <FileText size={11} className="shrink-0 opacity-40" />
                        <span className="truncate">{block.name}</span>
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
          {selectedBlock ? (
            <>
              <div className="flex items-start justify-between mb-4 gap-4">
                <div className="flex-1 min-w-0">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="text-lg font-bold text-foreground bg-transparent border-none outline-none w-full focus:ring-0"
                  />
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {selectedBlock.type}
                    </Badge>
                    <Badge
                      variant="default"
                      className="text-[11px] font-bold tracking-wide bg-success text-success-foreground"
                    >
                      {selectedBlock.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">{selectedBlock.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                    {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
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

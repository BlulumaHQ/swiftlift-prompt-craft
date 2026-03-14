import { useState, useEffect } from 'react';
import NavHeader from '@/components/NavHeader';
import {
  getPromptLibrary,
  savePromptBlock,
  deletePromptBlock,
  resetLibrary,
  categoryLabels,
  categoryOrder,
  workflowCategoryLabels,
  workflowCategoryOrder,
  PromptBlock,
  LibraryMode,
} from '@/lib/promptLibraryStore';
import { Save, Check, Trash2, ChevronRight, ChevronDown, FileText, Workflow, Zap, Eye, EyeOff } from 'lucide-react';
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
  const [mode, setMode] = useState<LibraryMode>('prompts');
  const [allExpanded, setAllExpanded] = useState(true);

  useEffect(() => {
    resetLibrary();
    const prompts = getPromptLibrary();
    setLibrary(prompts);
    const firstInMode = prompts.find(p => p.mode === 'prompts');
    if (firstInMode) {
      setSelectedId(firstInMode.id);
      setEditContent(firstInMode.content);
      setEditName(firstInMode.name);
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
      const nextInMode = updated.find(p => p.mode === mode);
      setSelectedId(nextInMode?.id || null);
      setEditContent(nextInMode?.content || '');
      setEditName(nextInMode?.name || '');
    }
    setDeleteTarget(null);
  };

  const switchMode = (newMode: LibraryMode) => {
    setMode(newMode);
    const firstInMode = library.find(p => p.mode === newMode);
    if (firstInMode) {
      setSelectedId(firstInMode.id);
      setEditContent(firstInMode.content);
      setEditName(firstInMode.name);
    }
    setSaved(false);
  };

  const modeItems = mode === 'prompts'
    ? library.filter(p => p.mode === 'prompts')
    : library.filter(p => p.mode === 'workflows');

  const groups = mode === 'prompts'
    ? categoryOrder.map(cat => ({
        key: cat,
        label: categoryLabels[cat],
        items: modeItems.filter(b => b.category === cat),
      }))
    : workflowCategoryOrder.map(cat => ({
        key: cat,
        label: workflowCategoryLabels[cat],
        items: modeItems.filter(b => b.category === cat),
      }));

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Prompt Library" />

      <div className="flex flex-1 min-h-0">
        {/* Tree sidebar */}
        <aside className="w-[320px] shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-3 space-y-2">
            {/* Mode switcher */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => switchMode('prompts')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                  mode === 'prompts'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <FileText size={13} />
                Prompts
              </button>
              <button
                onClick={() => switchMode('workflows')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                  mode === 'workflows'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <Workflow size={13} />
                Workflows (for AI)
              </button>
            </div>

            {/* Expand / Collapse control */}
            <button
              onClick={() => setAllExpanded(!allExpanded)}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {allExpanded ? (
                <>
                  <EyeOff size={12} />
                  Hide All ▾
                </>
              ) : (
                <>
                  <Eye size={12} />
                  Show All ▸
                </>
              )}
            </button>

            {/* Tree */}
            {groups.map(group => (
              <div key={group.key} className="mb-1">
                {/* Category heading */}
                <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {allExpanded ? <ChevronDown size={12} className="text-muted-foreground/60" /> : <ChevronRight size={12} className="text-muted-foreground/60" />}
                  {group.label}
                  <span className="ml-auto text-[10px] font-normal opacity-60">{group.items.length}</span>
                </div>
                {/* Prompt items */}
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
                        {block.type === 'Workflow Placeholder' ? (
                          <Zap size={11} className="shrink-0 opacity-40" />
                        ) : block.mode === 'workflows' ? (
                          <Workflow size={11} className="shrink-0 opacity-40" />
                        ) : (
                          <FileText size={11} className="shrink-0 opacity-40" />
                        )}
                        <span className="truncate">{block.name}</span>
                        {block.status === 'TO BE DETERMINED' && (
                          <span className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-warning" />
                        )}
                      </button>
                    ))}
                    {group.items.length === 0 && (
                      <p className="pl-4 py-1 text-xs text-muted-foreground italic">Empty</p>
                    )}
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
              {/* Header */}
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
                      variant={selectedBlock.status === 'CONFIRMED' ? 'default' : 'secondary'}
                      className={`text-[11px] font-bold tracking-wide ${
                        selectedBlock.status === 'CONFIRMED'
                          ? 'bg-success text-success-foreground'
                          : 'bg-warning text-warning-foreground'
                      }`}
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
                    Delete Prompt
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save Changes</>}
                  </button>
                </div>
              </div>

              {/* Content editor */}
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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/swiftlift-logo.svg';
import { getPromptLibrary, savePromptBlock, categoryLabels, PromptBlock } from '@/lib/promptLibraryStore';
import { Save, Check, BookOpen, FolderOpen, Library, Settings } from 'lucide-react';

type Category = PromptBlock['category'];

const categoryOrder: Category[] = ['base', 'packages', 'upgrades', 'modules', 'reference_rules', 'brand_overrides', 'scraping'];

export default function PromptLibrary() {
  const [library, setLibrary] = useState<PromptBlock[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>('base');
  const [selectedBlock, setSelectedBlock] = useState<PromptBlock | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLibrary(getPromptLibrary());
  }, []);

  useEffect(() => {
    const blocks = library.filter(b => b.category === selectedCategory);
    if (blocks.length > 0 && !selectedBlock) {
      setSelectedBlock(blocks[0]);
      setEditContent(blocks[0].content);
    }
  }, [selectedCategory, library, selectedBlock]);

  const handleSelectBlock = (block: PromptBlock) => {
    setSelectedBlock(block);
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

  const blocksInCategory = library.filter(b => b.category === selectedCategory);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="console-header flex items-center justify-between px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="SwiftLift" className="h-8" />
          <div className="h-5 w-px bg-foreground/20" />
          <h1 className="text-sm font-semibold tracking-tight text-[hsl(var(--console-header-foreground))]">
            Prompt Library
          </h1>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/" className="nav-link"><Settings size={14} /> Generator</Link>
          <Link to="/prompt-library" className="nav-link active"><BookOpen size={14} /> Library</Link>
          <Link to="/references" className="nav-link"><Library size={14} /> References</Link>
          <Link to="/projects" className="nav-link"><FolderOpen size={14} /> Archive</Link>
        </nav>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Categories & Blocks */}
        <aside className="w-[280px] shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Category Tabs */}
            <div className="space-y-1">
              {categoryOrder.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedBlock(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>

            {/* Blocks in selected category */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Prompts
              </p>
              <div className="space-y-1">
                {blocksInCategory.map(block => (
                  <button
                    key={block.id}
                    onClick={() => handleSelectBlock(block)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedBlock?.id === block.id
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {block.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content - Editor */}
        <main className="flex-1 flex flex-col p-6 overflow-hidden">
          {selectedBlock ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedBlock.name}</h2>
                  <p className="text-sm text-muted-foreground">{categoryLabels[selectedBlock.category]}</p>
                </div>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save Changes</>}
                </button>
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
              <p>Select a prompt block to edit</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

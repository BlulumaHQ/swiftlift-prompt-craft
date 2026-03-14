import { useState, useEffect } from 'react';
import NavHeader from '@/components/NavHeader';
import { getPromptLibrary, savePromptBlock, sectionLabels, PromptBlock, PromptSection } from '@/lib/promptLibraryStore';
import { Save, Check, Crown, Hammer, Puzzle, SlidersHorizontal, PenLine, Bot } from 'lucide-react';

const sectionIcons: Record<PromptSection, typeof Crown> = {
  master: Crown,
  builder: Hammer,
  module: Puzzle,
  override: SlidersHorizontal,
  revision: PenLine,
  claude: Bot,
};

const sectionOrder: PromptSection[] = ['master', 'builder', 'module', 'override', 'revision', 'claude'];

export default function PromptLibrary() {
  const [library, setLibrary] = useState<PromptBlock[]>([]);
  const [activeSection, setActiveSection] = useState<PromptSection>('master');
  const [selectedBlock, setSelectedBlock] = useState<PromptBlock | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLibrary(getPromptLibrary());
  }, []);

  const blocksInSection = library.filter(b => b.section === activeSection);

  useEffect(() => {
    if (blocksInSection.length > 0 && (!selectedBlock || selectedBlock.section !== activeSection)) {
      setSelectedBlock(blocksInSection[0]);
      setEditContent(blocksInSection[0].content);
    }
  }, [activeSection, library]);

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

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Prompt Library" />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-[280px] shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Section Tabs */}
            <div className="space-y-1">
              {sectionOrder.map(section => {
                const Icon = sectionIcons[section];
                return (
                  <button
                    key={section}
                    onClick={() => {
                      setActiveSection(section);
                      setSelectedBlock(null);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                      activeSection === section
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon size={13} />
                    {sectionLabels[section]}
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-border" />

            {/* Prompt Blocks */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Prompts
              </p>
              <div className="space-y-1">
                {blocksInSection.map(block => (
                  <button
                    key={block.id}
                    onClick={() => handleSelectBlock(block)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedBlock?.id === block.id
                        ? 'bg-accent text-accent-foreground font-medium'
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
                  <p className="text-sm text-muted-foreground">
                    {sectionLabels[selectedBlock.section]} · <span className="font-mono text-xs">{selectedBlock.id}</span>
                  </p>
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

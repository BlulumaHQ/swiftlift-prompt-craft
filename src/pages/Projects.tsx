import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects } from '@/lib/store';
import { SavedProject, contentModules } from '@/lib/mockData';
import { compilePrompts } from '@/lib/promptCompiler';
import { saveProject } from '@/lib/store';
import logo from '@/assets/swiftlift-logo.svg';
import { ArrowLeft, Copy, Check, Files, Settings, BookOpen, Library, FolderOpen } from 'lucide-react';

const moduleLabel = (id: string) => contentModules.find(m => m.id === id)?.label || id;

export default function Projects() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selected, setSelected] = useState<SavedProject | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => { setProjects(getProjects()); }, []);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDuplicate = (project: SavedProject) => {
    const dup: SavedProject = {
      ...project,
      id: crypto.randomUUID(),
      name: `${project.name} (Copy)`,
      dateCreated: new Date().toISOString().slice(0, 10),
    };
    saveProject(dup);
    setProjects(getProjects());
  };

  const getPrompts = (p: SavedProject) => {
    if (p.promptA && p.promptB) return { promptA: p.promptA, promptB: p.promptB };
    return compilePrompts(p);
  };

  const navHeader = (
    <header className="console-header flex items-center justify-between px-6 py-3 shrink-0">
      <div className="flex items-center gap-3">
        <img src={logo} alt="SwiftLift" className="h-8" />
        <div className="h-5 w-px bg-foreground/20" />
        <h1 className="text-sm font-semibold tracking-tight text-[hsl(var(--console-header-foreground))]">Project Archive</h1>
      </div>
      <nav className="flex items-center gap-2">
        <Link to="/" className="nav-link"><Settings size={14} /> Generator</Link>
        <Link to="/prompt-library" className="nav-link"><BookOpen size={14} /> Library</Link>
        <Link to="/references" className="nav-link"><Library size={14} /> References</Link>
        <Link to="/projects" className="nav-link active"><FolderOpen size={14} /> Archive</Link>
      </nav>
    </header>
  );

  // Detail view
  if (selected) {
    const { promptA, promptB } = getPrompts(selected);
    const tierLabel = selected.packageTier === '350'
      ? { a: 'Prompt A — $350 Standard', b: 'Prompt B — $475 Premium' }
      : { a: 'Prompt A — $550 Standard', b: 'Prompt B — $750 Premium' };

    return (
      <div className="flex flex-col h-screen">
        {navHeader}
        <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Projects
          </button>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">{selected.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{selected.sourceUrl} · {selected.packageTier} · {selected.dateCreated}</p>
          </div>
          <div className="flex gap-2 mb-6">
            <button onClick={() => handleDuplicate(selected)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Files size={14} /> Duplicate Project
            </button>
          </div>
          <div className="space-y-4">
            {[{ title: tierLabel.a, content: promptA, field: 'a' }, { title: tierLabel.b, content: promptB, field: 'b' }].map(p => (
              <div key={p.field} className="prompt-output">
                <div className="prompt-output-header">
                  <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                  <button onClick={() => handleCopy(p.content, p.field)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                    {copiedField === p.field ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Prompt</>}
                  </button>
                </div>
                <div className="prompt-output-body">
                  <pre className="whitespace-pre-wrap break-words">{p.content}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col h-screen">
      {navHeader}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-foreground mb-6">Project Archive</h2>
        {projects.length === 0 ? (
          <p className="text-muted-foreground text-sm">No projects saved yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="text-left panel-section hover:shadow-md transition-shadow cursor-pointer"
              >
                <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">{p.sourceUrl}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                    {p.packageTier}
                  </span>
                  {p.modules.slice(0, 3).map(m => (
                    <span key={m} className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                      {moduleLabel(m)}
                    </span>
                  ))}
                  {p.modules.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{p.modules.length - 3}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">{p.dateCreated}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

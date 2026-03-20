import { useState, useEffect, useMemo } from 'react';
import NavHeader from '@/components/NavHeader';
import { getProjects, deleteProject, saveProject } from '@/lib/store';
import { SavedProject, contentModules } from '@/lib/mockData';
import { ArrowLeft, Copy, Check, Files, Search, Trash2, Calendar, Globe, Package } from 'lucide-react';

const moduleLabel = (id: string) => contentModules.find(m => m.id === id)?.label || id;

type SortOption = 'recent' | 'updated' | 'az' | 'tier';

export default function Projects() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selected, setSelected] = useState<SavedProject | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleDelete = (id: string) => {
    deleteProject(id);
    setProjects(getProjects());
    setDeleteConfirm(null);
    if (selected?.id === id) setSelected(null);
  };

  const filtered = useMemo(() => {
    let items = projects.filter(p => {
      const q = searchQuery.toLowerCase();
      return !q || p.name.toLowerCase().includes(q) || p.sourceUrl.toLowerCase().includes(q) || (p.clientName || '').toLowerCase().includes(q);
    });
    switch (sortBy) {
      case 'recent': items.sort((a, b) => b.dateCreated.localeCompare(a.dateCreated)); break;
      case 'updated': items.sort((a, b) => (b.lastModified || b.dateCreated).localeCompare(a.lastModified || a.dateCreated)); break;
      case 'az': items.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'tier': items.sort((a, b) => a.packageTier.localeCompare(b.packageTier)); break;
    }
    return items;
  }, [projects, searchQuery, sortBy]);

  // Detail view
  if (selected) {
    const promptA = selected.promptA || '';
    const promptB = selected.promptB || '';
    const tierLabel = selected.packageTier === '350'
      ? { a: 'Prompt A — $350 Standard Layout', b: 'Prompt B — $475 Conversion Style Layout' }
      : { a: 'Prompt A — $550 Standard Layout', b: 'Prompt B — $750 Conversion Style Layout' };

    return (
      <div className="flex flex-col h-screen">
        <NavHeader title="Archive" />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Projects
          </button>

          {/* Project metadata */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{selected.name}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              {selected.sourceUrl && (
                <span className="flex items-center gap-1"><Globe size={12} /> {selected.sourceUrl}</span>
              )}
              {selected.clientName && (
                <span>Client: {selected.clientName}</span>
              )}
              <span className="flex items-center gap-1"><Package size={12} /> ${selected.packageTier} Tier</span>
              <span className="flex items-center gap-1"><Calendar size={12} /> {selected.dateCreated}</span>
              {selected.lastModified && selected.lastModified !== selected.dateCreated && (
                <span>Updated: {selected.lastModified}</span>
              )}
            </div>
            {selected.modules.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selected.modules.map(m => (
                  <span key={m} className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{moduleLabel(m)}</span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            <button onClick={() => handleDuplicate(selected)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Files size={14} /> Duplicate
            </button>
          </div>

          {/* Prompt sections */}
          <div className="space-y-4">
            {[{ title: tierLabel.a, content: promptA, field: 'a' }, { title: tierLabel.b, content: promptB, field: 'b' }].map(p => (
              <div key={p.field} className="prompt-output">
                <div className="prompt-output-header flex-col sm:flex-row gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground">{p.title}</h3>
                  {p.content && (
                    <button onClick={() => handleCopy(p.content, p.field)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                      {copiedField === p.field ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  )}
                </div>
                <div className="prompt-output-body">
                  <pre className="whitespace-pre-wrap break-words text-xs sm:text-sm">
                    {p.content || 'No prompt was saved for this project.'}
                  </pre>
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
      <NavHeader title="Archive" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Project Archive</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 sm:mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects..." className="control-input pl-9" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
            className="control-input w-full sm:w-auto text-xs">
            <option value="recent">Recently Created</option>
            <option value="updated">Recently Updated</option>
            <option value="az">A–Z</option>
            <option value="tier">Package Tier</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">No generated projects yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => {
              const hasPrompts = !!(p.promptA || p.promptB);
              return (
                <div key={p.id} className="panel-section hover:shadow-md transition-shadow relative group">
                  <button onClick={() => setSelected(p)} className="text-left w-full">
                    <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
                    {p.sourceUrl && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{p.sourceUrl}</p>
                    )}
                    {p.clientName && (
                      <p className="text-xs text-muted-foreground mt-0.5">Client: {p.clientName}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">${p.packageTier}</span>
                      {hasPrompts && (
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-600">Prompts saved</span>
                      )}
                      {p.modules.slice(0, 2).map(m => (
                        <span key={m} className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{moduleLabel(m)}</span>
                      ))}
                      {p.modules.length > 2 && <span className="text-xs text-muted-foreground">+{p.modules.length - 2}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2.5">{p.dateCreated}</p>
                  </button>

                  {deleteConfirm === p.id ? (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-card border border-border rounded-lg px-2 py-1.5 shadow-lg">
                      <span className="text-xs text-muted-foreground">Delete?</span>
                      <button onClick={() => handleDelete(p.id)}
                        className="px-2 py-0.5 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Yes</button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">No</button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p.id); }}
                      className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

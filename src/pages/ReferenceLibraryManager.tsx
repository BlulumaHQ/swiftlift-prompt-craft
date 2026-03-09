import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/swiftlift-logo.svg';
import { getReferences, saveReference, deleteReference, ReferenceLayout } from '@/lib/referenceStore';
import { Plus, Trash2, X, Settings, BookOpen, Library, FolderOpen, Search } from 'lucide-react';

const industries = [
  'Dental', 'Construction', 'Restaurant', 'Real Estate',
  'Professional Services', 'Luxury Service', 'One Page Design', 'Other'
];
const categoryFilters = ['All', ...industries];

type SortOption = 'recent' | 'az' | 'industry';

export default function ReferenceLibraryManager() {
  const [references, setReferences] = useState<ReferenceLayout[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newRef, setNewRef] = useState({
    name: '', industry: 'Professional Services', referenceUrl: '', notes: ''
  });

  useEffect(() => { setReferences(getReferences()); }, []);

  const filtered = useMemo(() => {
    let items = references.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || r.name.toLowerCase().includes(q) || r.industry.toLowerCase().includes(q);
      const matchesFilter = filterCategory === 'All' || r.category === filterCategory || r.industry === filterCategory;
      return matchesSearch && matchesFilter;
    });
    switch (sortBy) {
      case 'recent': items.sort((a, b) => b.addedDate.localeCompare(a.addedDate)); break;
      case 'az': items.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'industry': items.sort((a, b) => a.industry.localeCompare(b.industry)); break;
    }
    return items;
  }, [references, searchQuery, filterCategory, sortBy]);

  const generatePreviewImage = (url: string, category: string): string => {
    // Generate a simple placeholder based on category color
    const colors: Record<string, string> = {
      'Dental': '2B6CB0', 'Construction': 'DD6B20', 'Restaurant': 'C53030',
      'Real Estate': '2C5282', 'Professional Services': '4A5568',
      'Luxury Service': '1A202C', 'One Page Design': '6B46C1', 'Other': '718096'
    };
    const color = colors[category] || '718096';
    return `https://placehold.co/600x400/${color}/ffffff?text=${encodeURIComponent(category)}`;
  };

  const handleAdd = () => {
    if (!newRef.name || !newRef.referenceUrl) return;
    const ref: ReferenceLayout = {
      id: crypto.randomUUID(),
      name: newRef.name,
      industry: newRef.industry,
      category: newRef.industry,
      image: generatePreviewImage(newRef.referenceUrl, newRef.industry),
      referenceUrl: newRef.referenceUrl,
      addedDate: new Date().toISOString().slice(0, 10),
      lastUsed: ''
    };
    saveReference(ref);
    setReferences(getReferences());
    setShowAddModal(false);
    setNewRef({ name: '', industry: 'Professional Services', referenceUrl: '', notes: '' });
  };

  const handleDelete = (id: string) => {
    deleteReference(id);
    setReferences(getReferences());
    setDeleteConfirm(null);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="console-header flex items-center justify-between px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="SwiftLift" className="h-8" />
          <div className="h-5 w-px bg-foreground/20" />
          <h1 className="text-sm font-semibold tracking-tight text-[hsl(var(--console-header-foreground))]">Reference Library</h1>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/" className="nav-link"><Settings size={14} /> Generator</Link>
          <Link to="/prompt-library" className="nav-link"><BookOpen size={14} /> Library</Link>
          <Link to="/references" className="nav-link active"><Library size={14} /> References</Link>
          <Link to="/projects" className="nav-link"><FolderOpen size={14} /> Archive</Link>
        </nav>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Reference Layouts</h2>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus size={16} /> Add Reference
            </button>
          </div>

          {/* Search, Filter, Sort */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search references..." className="control-input pl-9" />
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
                className="control-input w-auto text-xs">
                <option value="recent">Recently Added</option>
                <option value="az">A–Z</option>
                <option value="industry">Industry</option>
              </select>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categoryFilters.map(c => (
                <button key={c} onClick={() => setFilterCategory(c)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filterCategory === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(ref => (
              <div key={ref.id} className="rounded-lg border border-border bg-card overflow-hidden group relative">
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  <img src={ref.image} alt={ref.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{ref.name}</h3>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {ref.industry}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 truncate">{ref.referenceUrl}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      Select
                    </button>
                    {deleteConfirm === ref.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(ref.id)}
                          className="px-2 py-1 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                          Confirm
                        </button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 rounded text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(ref.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No reference layouts found.</p>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl border border-border w-[500px] max-w-[95vw]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Add Reference Layout</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="control-label">Layout Name</label>
                <input type="text" value={newRef.name} onChange={e => setNewRef({ ...newRef, name: e.target.value })}
                  placeholder="e.g., Modern Dental Layout" className="control-input" />
              </div>
              <div>
                <label className="control-label">Reference URL</label>
                <input type="url" value={newRef.referenceUrl} onChange={e => setNewRef({ ...newRef, referenceUrl: e.target.value })}
                  placeholder="https://example-reference.com" className="control-input" />
              </div>
              <div>
                <label className="control-label">Category / Industry</label>
                <select value={newRef.industry} onChange={e => setNewRef({ ...newRef, industry: e.target.value })}
                  className="control-input">
                  {industries.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="control-label">Optional Notes</label>
                <textarea value={newRef.notes} onChange={e => setNewRef({ ...newRef, notes: e.target.value })}
                  placeholder="Any additional notes about this reference..." rows={3} className="control-input resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
                <button onClick={handleAdd} disabled={!newRef.name || !newRef.referenceUrl}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  Add Reference
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

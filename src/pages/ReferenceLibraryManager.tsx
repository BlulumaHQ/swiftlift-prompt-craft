import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/swiftlift-logo.svg';
import { getReferences, saveReference, deleteReference, ReferenceLayout, industries } from '@/lib/referenceStore';
import { Plus, Trash2, X, Settings, BookOpen, Library, FolderOpen } from 'lucide-react';

export default function ReferenceLibraryManager() {
  const [references, setReferences] = useState<ReferenceLayout[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRef, setNewRef] = useState({
    name: '',
    industry: 'Professional Services',
    referenceUrl: '',
    image: ''
  });

  useEffect(() => {
    setReferences(getReferences());
  }, []);

  const handleAdd = () => {
    if (!newRef.name || !newRef.referenceUrl) return;
    
    const ref: ReferenceLayout = {
      id: crypto.randomUUID(),
      name: newRef.name,
      industry: newRef.industry,
      category: newRef.industry,
      image: newRef.image || '/placeholder.svg',
      referenceUrl: newRef.referenceUrl,
      addedDate: new Date().toISOString().slice(0, 10),
      lastUsed: ''
    };
    
    saveReference(ref);
    setReferences(getReferences());
    setShowAddModal(false);
    setNewRef({ name: '', industry: 'Professional Services', referenceUrl: '', image: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this reference layout?')) {
      deleteReference(id);
      setReferences(getReferences());
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="console-header flex items-center justify-between px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="SwiftLift" className="h-8" />
          <div className="h-5 w-px bg-foreground/20" />
          <h1 className="text-sm font-semibold tracking-tight text-[hsl(var(--console-header-foreground))]">
            Reference Library
          </h1>
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
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus size={16} /> Add Reference
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {references.map(ref => (
              <div key={ref.id} className="rounded-lg border border-border bg-card overflow-hidden group">
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  <img
                    src={ref.image}
                    alt={ref.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{ref.name}</h3>
                      <p className="text-sm text-muted-foreground">{ref.industry}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(ref.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 truncate">{ref.referenceUrl}</p>
                  <p className="text-xs text-muted-foreground mt-1">Added: {ref.addedDate}</p>
                </div>
              </div>
            ))}
          </div>

          {references.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No reference layouts yet.</p>
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
                <input
                  type="text"
                  value={newRef.name}
                  onChange={e => setNewRef({ ...newRef, name: e.target.value })}
                  placeholder="e.g., Modern Dental Layout"
                  className="control-input"
                />
              </div>
              <div>
                <label className="control-label">Industry Category</label>
                <select
                  value={newRef.industry}
                  onChange={e => setNewRef({ ...newRef, industry: e.target.value })}
                  className="control-input"
                >
                  {industries.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="control-label">Reference URL</label>
                <input
                  type="url"
                  value={newRef.referenceUrl}
                  onChange={e => setNewRef({ ...newRef, referenceUrl: e.target.value })}
                  placeholder="https://example-reference.com"
                  className="control-input"
                />
              </div>
              <div>
                <label className="control-label">Preview Image URL <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="url"
                  value={newRef.image}
                  onChange={e => setNewRef({ ...newRef, image: e.target.value })}
                  placeholder="https://example.com/preview.jpg"
                  className="control-input"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newRef.name || !newRef.referenceUrl}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
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

import { useState, useMemo } from 'react';
import { referenceLayouts, categories, sortOptions, ReferenceLayout } from '@/lib/mockData';
import { Search, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (layout: ReferenceLayout) => void;
}

export default function ReferenceLibraryModal({ open, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('Recently Added');

  const filtered = useMemo(() => {
    let items = referenceLayouts.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.industry.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || l.category === category;
      return matchesSearch && matchesCategory;
    });
    switch (sort) {
      case 'Recently Added': items.sort((a, b) => b.addedDate.localeCompare(a.addedDate)); break;
      case 'Recently Used': items.sort((a, b) => b.lastUsed.localeCompare(a.lastUsed)); break;
      case 'A–Z': items.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'Industry': items.sort((a, b) => a.industry.localeCompare(b.industry)); break;
    }
    return items;
  }, [search, category, sort]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl border border-border w-[900px] max-w-[95vw] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Reference Library</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="px-6 py-4 border-b border-border space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search layouts..."
              className="control-input pl-9"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-1.5 flex-wrap">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    category === c
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="control-input w-auto text-xs"
            >
              {sortOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(layout => (
              <div key={layout.id} className="group rounded-lg border border-border overflow-hidden bg-card hover:shadow-md transition-shadow">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={layout.image}
                    alt={layout.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{layout.name}</p>
                    <p className="text-xs text-muted-foreground">{layout.industry}</p>
                  </div>
                  <button
                    onClick={() => { onSelect(layout); onClose(); }}
                    className="w-full px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">No layouts found matching your criteria.</p>
          )}
        </div>
      </div>
    </div>
  );
}

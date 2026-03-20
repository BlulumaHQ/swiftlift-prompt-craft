import { useState, useMemo, useEffect } from 'react';
import { getDemoSites, type DemoSite } from '@/lib/demoSiteStore';
import { Search, X, ExternalLink } from 'lucide-react';

type ReferenceRole = 'style' | 'conversion_layout';
type SortOption = 'recent' | 'az' | 'industry';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (ref: DemoSite) => void;
  roleFilter?: ReferenceRole;
  title?: string;
}

/** Parse the pipe-separated notes field into a structured object (shared logic with ReferenceLibraryManager) */
function parseNotes(notes: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!notes) return result;
  notes.split('|').forEach(segment => {
    const colonIdx = segment.indexOf(':');
    if (colonIdx > 0) {
      const key = segment.slice(0, colonIdx).trim();
      const value = segment.slice(colonIdx + 1).trim();
      result[key] = value;
    }
  });
  return result;
}

function extractUniqueNotesValues(items: DemoSite[], key: string): string[] {
  const set = new Set<string>();
  items.forEach(item => {
    const parsed = parseNotes(item.notes);
    const val = parsed[key];
    if (val) set.add(val);
  });
  return Array.from(set).sort();
}

function generatePreviewPlaceholder(industry: string): string {
  const colors: Record<string, string> = {
    'dental-healthcare': '2B6CB0', 'construction': 'DD6B20', 'food-retail': 'C53030',
    'real-estate': '2C5282', 'capital-investment': '1A202C', 'manufacturing-b2b': '4A5568',
  };
  const color = colors[industry] || '718096';
  return `https://placehold.co/600x400/${color}/ffffff?text=${encodeURIComponent(industry)}`;
}

const conversionColors: Record<string, string> = {
  high: 'bg-primary/15 text-primary',
  medium: 'bg-accent text-accent-foreground',
  low: 'bg-muted text-muted-foreground',
};

const categoryColors: Record<string, string> = {
  business: 'bg-secondary text-secondary-foreground',
  style: 'bg-primary/10 text-primary',
  conversion: 'bg-accent text-accent-foreground',
};

export default function ReferenceLibraryModal({ open, onClose, onSelect, roleFilter, title }: Props) {
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterConversion, setFilterConversion] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [references, setReferences] = useState<DemoSite[]>([]);

  useEffect(() => {
    if (open) {
      getDemoSites().then(setReferences).catch(() => setReferences([]));
      setSearch('');
      setFilterIndustry('All');
      setFilterCategory('All');
      setFilterConversion('All');
      setSortBy('recent');
    }
  }, [open]);

  // Dynamic filter options from real data
  const uniqueIndustries = useMemo(() =>
    Array.from(new Set(references.map(i => i.industry).filter(Boolean))).sort(),
    [references]
  );
  const uniqueCategories = useMemo(() => extractUniqueNotesValues(references, 'category'), [references]);
  const uniqueConversions = useMemo(() => extractUniqueNotesValues(references, 'conversion_level'), [references]);

  const filtered = useMemo(() => {
    let items = references.filter(r => {
      const q = search.toLowerCase();
      const parsed = parseNotes(r.notes);
      const matchesSearch = !q || r.site_name.toLowerCase().includes(q) || r.industry.toLowerCase().includes(q) || (parsed.style_tags || '').toLowerCase().includes(q);
      const matchesIndustry = filterIndustry === 'All' || r.industry === filterIndustry;
      const matchesCategory = filterCategory === 'All' || parsed.category === filterCategory;
      const matchesConversion = filterConversion === 'All' || parsed.conversion_level === filterConversion;
      // Role matching: for conversion_layout, show all references as fallback (don't hard-filter to empty)
      let matchesRole = true;
      if (roleFilter === 'style') {
        matchesRole = r.reference_role === 'style';
      }
      // For conversion_layout or no roleFilter, show everything
      return matchesSearch && matchesIndustry && matchesCategory && matchesConversion && matchesRole;
    });
    // For conversion_layout: prioritize explicit conversion items at top
    if (roleFilter === 'conversion_layout') {
      const convItems = items.filter(r => r.reference_role === 'conversion_layout');
      const fallbackItems = items.filter(r => r.reference_role !== 'conversion_layout');
      items = [...convItems, ...fallbackItems];
    }
    switch (sortBy) {
      case 'recent': {
        const convItems = roleFilter === 'conversion_layout' ? items.filter(r => r.reference_role === 'conversion_layout') : [];
        const rest = roleFilter === 'conversion_layout' ? items.filter(r => r.reference_role !== 'conversion_layout') : items;
        rest.sort((a, b) => b.created_at.localeCompare(a.created_at));
        if (roleFilter === 'conversion_layout') {
          convItems.sort((a, b) => b.created_at.localeCompare(a.created_at));
          items = [...convItems, ...rest];
        } else {
          items = rest;
        }
        break;
      }
      case 'az': items.sort((a, b) => a.site_name.localeCompare(b.site_name)); break;
      case 'industry': items.sort((a, b) => a.industry.localeCompare(b.industry)); break;
    }
    if (import.meta.env.DEV) {
      console.debug('[ReferenceModal]', { roleFilter, total: references.length, explicitConversion: references.filter(r => r.reference_role === 'conversion_layout').length, rendered: items.length });
    }
    return items;
  }, [references, search, filterIndustry, filterCategory, filterConversion, sortBy, roleFilter]);

  if (!open) return null;

  const modalTitle = title || (roleFilter === 'conversion_layout'
    ? 'Select Conversion Layout Reference'
    : roleFilter === 'style'
      ? 'Select Style Reference'
      : 'Reference Library');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-t-xl sm:rounded-xl shadow-2xl border border-border w-full sm:w-[900px] sm:max-w-[95vw] max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">{modalTitle}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search references..." className="control-input pl-9" />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
              className="control-input w-full sm:w-auto text-xs shrink-0">
              <option value="recent">Recently Added</option>
              <option value="az">A–Z</option>
              <option value="industry">Industry</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="flex gap-1 flex-wrap items-center">
            <span className="text-[10px] font-medium text-muted-foreground mr-1">Category:</span>
            {['All', ...uniqueCategories].map(c => (
              <button key={c} onClick={() => setFilterCategory(c)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors capitalize ${
                  filterCategory === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                }`}>{c}</button>
            ))}
          </div>

          {/* Conversion level filter */}
          <div className="flex gap-1 flex-wrap items-center">
            <span className="text-[10px] font-medium text-muted-foreground mr-1">Conversion:</span>
            {['All', ...uniqueConversions].map(c => (
              <button key={c} onClick={() => setFilterConversion(c)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors capitalize ${
                  filterConversion === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                }`}>{c}</button>
            ))}
          </div>

          {/* Industry filter */}
          <div className="flex gap-1 flex-wrap items-center">
            <span className="text-[10px] font-medium text-muted-foreground mr-1">Industry:</span>
            <button onClick={() => setFilterIndustry('All')}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                filterIndustry === 'All' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}>All</button>
            {uniqueIndustries.map(ind => (
              <button key={ind} onClick={() => setFilterIndustry(ind)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  filterIndustry === ind ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                }`}>{ind}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map(ref => {
              const parsed = parseNotes(ref.notes);
              const category = parsed.category || '';
              const conversionLevel = parsed.conversion_level || '';
              return (
                <div key={ref.id} className="group rounded-lg border border-border overflow-hidden bg-card hover:shadow-md transition-shadow flex flex-col">
                  {/* Image area with hover overlay — 6:4 vertical ratio */}
                  <div className="aspect-[4/6] overflow-hidden bg-muted relative cursor-pointer"
                    onClick={() => ref.live_url && window.open(ref.live_url, '_blank')}>
                    <img
                      src={ref.preview_image || ref.desktop_screenshot_url || generatePreviewPlaceholder(ref.industry)}
                      alt={ref.site_name}
                      className="w-full h-full object-cover object-top"
                    />
                    {/* Hover overlay with Open Live View button */}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-card text-foreground shadow-lg border border-border">
                        <ExternalLink size={12} /> Open Live View
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 flex flex-col flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{ref.site_name}</p>
                    <div className="flex items-center gap-1 flex-wrap mt-1.5">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">{ref.industry}</span>
                      {category && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${categoryColors[category] || 'bg-muted text-muted-foreground'}`}>
                          {category}
                        </span>
                      )}
                      {conversionLevel && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${conversionColors[conversionLevel] || 'bg-muted text-muted-foreground'}`}>
                          Conv: {conversionLevel}
                        </span>
                      )}
                    </div>
                    <button onClick={() => { onSelect(ref); onClose(); }}
                      className="w-full mt-auto px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      Select
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">
              {references.length === 0
                ? 'No references found. Add some from the Reference Library page.'
                : 'No references found matching your filters. Try adjusting your search or filters.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

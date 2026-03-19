import { useState, useMemo, useEffect } from 'react';
import { getDemoSites, type DemoSite } from '@/lib/demoSiteStore';
import { Search, X } from 'lucide-react';

const industries = [
  'Dental', 'Construction', 'Restaurant', 'Real Estate',
  'Professional Services', 'Luxury Service', 'One Page Design', 'Other'
];
const categoryFilters = ['All', ...industries];

type ReferenceRole = 'style' | 'conversion_layout';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (ref: DemoSite) => void;
  roleFilter?: ReferenceRole;
  title?: string;
}

function generatePreviewPlaceholder(industry: string): string {
  const colors: Record<string, string> = {
    'Dental': '2B6CB0', 'Construction': 'DD6B20', 'Restaurant': 'C53030',
    'Real Estate': '2C5282', 'Professional Services': '4A5568',
    'Luxury Service': '1A202C', 'One Page Design': '6B46C1', 'Other': '718096'
  };
  const color = colors[industry] || '718096';
  return `https://placehold.co/600x400/${color}/ffffff?text=${encodeURIComponent(industry)}`;
}

export default function ReferenceLibraryModal({ open, onClose, onSelect, roleFilter, title }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('Recently Added');
  const [references, setReferences] = useState<DemoSite[]>([]);

  useEffect(() => {
    if (open) {
      getDemoSites().then(setReferences).catch(() => setReferences([]));
    }
  }, [open]);

  const filtered = useMemo(() => {
    let items = references.filter(r => {
      const matchesSearch = r.site_name.toLowerCase().includes(search.toLowerCase()) ||
        r.industry.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || r.industry === category;
      const matchesRole = !roleFilter || r.reference_role === roleFilter;
      return matchesSearch && matchesCategory && matchesRole;
    });
    switch (sort) {
      case 'Recently Added': items.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case 'A–Z': items.sort((a, b) => a.site_name.localeCompare(b.site_name)); break;
      case 'Industry': items.sort((a, b) => a.industry.localeCompare(b.industry)); break;
    }
    return items;
  }, [references, search, category, sort, roleFilter]);

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

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search references..." className="control-input pl-9" />
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex gap-1 sm:gap-1.5 flex-wrap flex-1">
              {categoryFilters.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
                    category === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)} className="control-input w-auto text-xs shrink-0">
              <option>Recently Added</option>
              <option>A–Z</option>
              <option>Industry</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map(ref => (
              <div key={ref.id} className="group rounded-lg border border-border overflow-hidden bg-card hover:shadow-md transition-shadow">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img src={ref.preview_image || ref.desktop_screenshot_url || generatePreviewPlaceholder(ref.industry)} alt={ref.site_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{ref.site_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">{ref.industry}</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        ref.reference_role === 'style' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
                      }`}>
                        {ref.reference_role === 'style' ? 'Style' : 'Conv. Layout'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => { onSelect(ref); onClose(); }}
                    className="w-full px-3 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">
              {roleFilter
                ? `No ${roleFilter === 'style' ? 'style' : 'conversion layout'} references found. Add one from the Reference Library page.`
                : 'No references found matching your criteria.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

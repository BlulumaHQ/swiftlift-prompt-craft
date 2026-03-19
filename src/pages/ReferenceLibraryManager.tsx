import { useState, useEffect, useMemo } from 'react';
import NavHeader from '@/components/NavHeader';
import {
  getDemoSites, addDemoSite, deleteDemoSite, type DemoSite
} from '@/lib/demoSiteStore';
import { Plus, Trash2, X, Search, ExternalLink, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const industries = [
  'Dental', 'Construction', 'Restaurant', 'Real Estate',
  'Professional Services', 'Luxury Service', 'One Page Design', 'Other'
];

type ReferenceRole = 'style' | 'conversion_layout';

const categoryFilters = ['All', ...industries];
const roleFilters: Array<{ value: 'all' | ReferenceRole; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'style', label: 'Style' },
  { value: 'conversion_layout', label: 'Conversion Layout' },
];

type SortOption = 'recent' | 'az' | 'industry';

function generatePreviewPlaceholder(industry: string): string {
  const colors: Record<string, string> = {
    'Dental': '2B6CB0', 'Construction': 'DD6B20', 'Restaurant': 'C53030',
    'Real Estate': '2C5282', 'Professional Services': '4A5568',
    'Luxury Service': '1A202C', 'One Page Design': '6B46C1', 'Other': '718096'
  };
  const color = colors[industry] || '718096';
  return `https://placehold.co/600x400/${color}/ffffff?text=${encodeURIComponent(industry)}`;
}

export default function ReferenceLibraryManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<DemoSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterRole, setFilterRole] = useState<'all' | ReferenceRole>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [newRef, setNewRef] = useState({
    name: '', industry: 'Professional Services', liveUrl: '', role: 'style' as ReferenceRole, notes: ''
  });
  const [desktopFile, setDesktopFile] = useState<File | undefined>();
  const [mobileFile, setMobileFile] = useState<File | undefined>();

  const [bulkJsonFile, setBulkJsonFile] = useState<File | null>(null);
  const [bulkStatus, setBulkStatus] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const cloudSites = await getDemoSites();
      setItems(cloudSites);
    } catch (err) {
      console.warn('Could not load demo sites:', err);
      setItems([]);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let result = items.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || r.site_name.toLowerCase().includes(q) || r.industry.toLowerCase().includes(q);
      const matchesCategory = filterCategory === 'All' || r.industry === filterCategory;
      const matchesRole = filterRole === 'all' || r.reference_role === filterRole;
      return matchesSearch && matchesCategory && matchesRole;
    });
    switch (sortBy) {
      case 'recent': result.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case 'az': result.sort((a, b) => a.site_name.localeCompare(b.site_name)); break;
      case 'industry': result.sort((a, b) => a.industry.localeCompare(b.industry)); break;
    }
    return result;
  }, [items, searchQuery, filterCategory, filterRole, sortBy]);

  const handleAdd = async () => {
    if (!newRef.name || !newRef.liveUrl) return;
    setUploading(true);
    try {
      await addDemoSite({
        site_name: newRef.name, live_url: newRef.liveUrl, reference_role: newRef.role,
        industry: newRef.industry, desktop_screenshot_url: '', mobile_screenshot_url: '',
        preview_image: '', notes: newRef.notes,
      }, desktopFile, mobileFile);
      toast({ title: 'Reference added to cloud' });
      setShowAddModal(false);
      setNewRef({ name: '', industry: 'Professional Services', liveUrl: '', role: 'style', notes: '' });
      setDesktopFile(undefined); setMobileFile(undefined);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleBulkImport = async () => {
    if (!bulkJsonFile) return;
    setUploading(true);
    setBulkStatus('Reading metadata...');
    try {
      const jsonText = await bulkJsonFile.text();
      const entries: any[] = JSON.parse(jsonText);
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setBulkStatus(`Importing ${i + 1} of ${entries.length}: ${entry.site_name || entry.reference_name || 'Untitled'}...`);
        await addDemoSite({
          site_name: entry.site_name || entry.reference_name || `Import ${i + 1}`,
          live_url: entry.live_url || '', reference_role: entry.reference_role || 'style',
          industry: entry.industry || 'Other', desktop_screenshot_url: entry.desktop_screenshot_url || '',
          mobile_screenshot_url: entry.mobile_screenshot_url || '', preview_image: entry.preview_image || '',
          notes: entry.notes || '',
        });
      }
      setBulkStatus(`✅ Imported ${entries.length} references`);
      await loadAll();
      setTimeout(() => { setShowBulkModal(false); setBulkStatus(''); setBulkJsonFile(null); }, 1500);
    } catch (err: any) {
      setBulkStatus(`❌ Error: ${err.message}`);
    }
    setUploading(false);
  };

  const handleDelete = async (item: DemoSite) => {
    try {
      await deleteDemoSite(item.id, item.site_name, item.reference_role);
      await loadAll();
      setDeleteConfirm(null);
      toast({ title: 'Reference deleted' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const roleBadge = (role: string) => (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
      role === 'style' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
    }`}>
      {role === 'style' ? 'Style' : 'Conversion Layout'}
    </span>
  );

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="References Demo Sites" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Reference Demo Sites</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                <Upload size={16} /> <span className="hidden sm:inline">Bulk Import</span><span className="sm:hidden">Bulk</span>
              </button>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Plus size={16} /> Add Reference
              </button>
            </div>
          </div>

          {/* Search, Filter, Sort */}
          <div className="space-y-3 mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search references..." className="control-input pl-9" />
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
                className="control-input w-full sm:w-auto text-xs">
                <option value="recent">Recently Added</option>
                <option value="az">A–Z</option>
                <option value="industry">Industry</option>
              </select>
            </div>
            <div className="flex gap-1 sm:gap-1.5 flex-wrap">
              {roleFilters.map(r => (
                <button key={r.value} onClick={() => setFilterRole(r.value)}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
                    filterRole === r.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}>{r.label}</button>
              ))}
              <span className="w-px bg-border mx-0.5 sm:mx-1" />
              {categoryFilters.map(c => (
                <button key={c} onClick={() => setFilterCategory(c)}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
                    filterCategory === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}>{c}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(ref => (
                <div key={ref.id} className="rounded-lg border border-border bg-card overflow-hidden group relative">
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    <img src={ref.preview_image || ref.desktop_screenshot_url || generatePreviewPlaceholder(ref.industry)} alt={ref.site_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{ref.site_name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">{ref.industry}</span>
                          {roleBadge(ref.reference_role)}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 truncate">{ref.live_url}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => window.open(ref.live_url, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                        <ExternalLink size={12} /> Live View
                      </button>
                      {deleteConfirm === ref.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(ref)}
                            className="px-2 py-1 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Confirm</button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 rounded text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">Cancel</button>
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
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-2">No reference layouts found.</p>
              <p className="text-xs text-muted-foreground">Add your first reference using the button above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Reference Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-t-xl sm:rounded-xl shadow-2xl border border-border w-full sm:w-[540px] sm:max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Add Reference</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div><label className="control-label">Reference Name</label>
                <input type="text" value={newRef.name} onChange={e => setNewRef({ ...newRef, name: e.target.value })}
                  placeholder="e.g., Modern Dental Layout" className="control-input" /></div>
              <div><label className="control-label">Live URL</label>
                <input type="url" value={newRef.liveUrl} onChange={e => setNewRef({ ...newRef, liveUrl: e.target.value })}
                  placeholder="https://example-reference.com" className="control-input" /></div>
              <div><label className="control-label">Industry</label>
                <select value={newRef.industry} onChange={e => setNewRef({ ...newRef, industry: e.target.value })} className="control-input">
                  {industries.map(i => <option key={i} value={i}>{i}</option>)}
                </select></div>
              <div><label className="control-label">Reference Role</label>
                <select value={newRef.role} onChange={e => setNewRef({ ...newRef, role: e.target.value as ReferenceRole })} className="control-input">
                  <option value="style">Style</option>
                  <option value="conversion_layout">Conversion Layout</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {newRef.role === 'style' ? 'Controls visual style: colors, fonts, component look & feel'
                    : 'Controls layout structure: section order, CTA placement, trust/proof positioning'}
                </p></div>
              <div>
                <label className="control-label">Screenshots (optional)</label>
                <p className="text-xs text-muted-foreground mb-2">Upload screenshots to cloud storage.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground mb-1 block">Desktop</label>
                    <input type="file" accept="image/*" onChange={e => setDesktopFile(e.target.files?.[0])}
                      className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-secondary file:text-secondary-foreground" />
                    {desktopFile && <p className="text-xs text-primary mt-0.5 truncate">✓ {desktopFile.name}</p>}</div>
                  <div><label className="text-xs text-muted-foreground mb-1 block">Mobile</label>
                    <input type="file" accept="image/*" onChange={e => setMobileFile(e.target.files?.[0])}
                      className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-secondary file:text-secondary-foreground" />
                    {mobileFile && <p className="text-xs text-primary mt-0.5 truncate">✓ {mobileFile.name}</p>}</div>
                </div>
              </div>
              <div><label className="control-label">Notes (optional)</label>
                <textarea value={newRef.notes} onChange={e => setNewRef({ ...newRef, notes: e.target.value })}
                  placeholder="Any additional notes..." rows={3} className="control-input resize-none" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">Cancel</button>
                <button onClick={handleAdd} disabled={!newRef.name || !newRef.liveUrl || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {uploading && <Loader2 size={14} className="animate-spin" />}
                  {uploading ? 'Uploading...' : 'Add Reference'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-t-xl sm:rounded-xl shadow-2xl border border-border w-full sm:w-[480px] sm:max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Bulk Import References</h2>
              <button onClick={() => { setShowBulkModal(false); setBulkStatus(''); setBulkJsonFile(null); }}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="control-label">JSON Metadata File</label>
                <input type="file" accept=".json" onChange={e => setBulkJsonFile(e.target.files?.[0] || null)}
                  className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-secondary file:text-secondary-foreground" />
                <p className="text-xs text-muted-foreground mt-1">Array of objects with site_name, live_url, industry, reference_role.</p>
              </div>
              {bulkStatus && <p className="text-xs text-muted-foreground">{bulkStatus}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowBulkModal(false); setBulkStatus(''); setBulkJsonFile(null); }}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">Cancel</button>
                <button onClick={handleBulkImport} disabled={!bulkJsonFile || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {uploading && <Loader2 size={14} className="animate-spin" />}
                  {uploading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

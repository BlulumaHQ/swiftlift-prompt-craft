import { useState, useEffect, useMemo, useRef } from 'react';
import NavHeader from '@/components/NavHeader';
import {
  getReferences, saveReference, deleteReference,
  createEmptyReference, generatePreviewPlaceholder,
  industries, type ReferenceEntry, type ReferenceRole
} from '@/lib/referenceStore';
import { uploadReferenceScreenshots } from '@/lib/referenceUpload';
import { Plus, Trash2, X, Search, ExternalLink, Upload, Loader2 } from 'lucide-react';

const categoryFilters = ['All', ...industries];
const roleFilters: Array<{ value: 'all' | ReferenceRole; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'style', label: 'Style' },
  { value: 'conversion_layout', label: 'Conversion Layout' },
];

type SortOption = 'recent' | 'az' | 'industry';

export default function ReferenceLibraryManager() {
  const [references, setReferences] = useState<ReferenceEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterRole, setFilterRole] = useState<'all' | ReferenceRole>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Single add state
  const [newRef, setNewRef] = useState({
    name: '', industry: 'Professional Services', liveUrl: '', role: 'style' as ReferenceRole, notes: ''
  });
  const [screenshotFiles, setScreenshotFiles] = useState<{
    desktop_hero?: File; desktop_full?: File; mobile_hero?: File; mobile_full?: File;
  }>({});

  // Bulk import state
  const [bulkJsonFile, setBulkJsonFile] = useState<File | null>(null);
  const [bulkScreenshotFiles, setBulkScreenshotFiles] = useState<File[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const bulkFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setReferences(getReferences()); }, []);

  const filtered = useMemo(() => {
    let items = references.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || r.reference_name.toLowerCase().includes(q) || r.industry.toLowerCase().includes(q);
      const matchesCategory = filterCategory === 'All' || r.industry === filterCategory;
      const matchesRole = filterRole === 'all' || r.reference_role === filterRole;
      return matchesSearch && matchesCategory && matchesRole;
    });
    switch (sortBy) {
      case 'recent': items.sort((a, b) => b.added_date.localeCompare(a.added_date)); break;
      case 'az': items.sort((a, b) => a.reference_name.localeCompare(b.reference_name)); break;
      case 'industry': items.sort((a, b) => a.industry.localeCompare(b.industry)); break;
    }
    return items;
  }, [references, searchQuery, filterCategory, filterRole, sortBy]);

  const handleAdd = async () => {
    if (!newRef.name || !newRef.liveUrl) return;
    setUploading(true);

    let screenshots = { desktop_hero: '', desktop_full: '', mobile_hero: '', mobile_full: '' };
    try {
      if (Object.values(screenshotFiles).some(f => f)) {
        screenshots = await uploadReferenceScreenshots(screenshotFiles, newRef.role, newRef.name);
      }
    } catch (err) {
      console.error('Screenshot upload failed:', err);
    }

    const ref = createEmptyReference({
      reference_name: newRef.name,
      industry: newRef.industry,
      reference_role: newRef.role,
      live_url: newRef.liveUrl,
      preview_image: screenshots.desktop_hero || generatePreviewPlaceholder(newRef.industry),
      screenshots,
      notes: newRef.notes,
    });
    saveReference(ref);
    setReferences(getReferences());
    setShowAddModal(false);
    setNewRef({ name: '', industry: 'Professional Services', liveUrl: '', role: 'style', notes: '' });
    setScreenshotFiles({});
    setUploading(false);
  };

  const handleBulkImport = async () => {
    if (!bulkJsonFile) return;
    setUploading(true);
    setBulkStatus('Reading metadata...');

    try {
      const jsonText = await bulkJsonFile.text();
      const entries: any[] = JSON.parse(jsonText);

      // Build a map of screenshot files by name for matching
      const fileMap: Record<string, File> = {};
      bulkScreenshotFiles.forEach(f => { fileMap[f.name] = f; });

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setBulkStatus(`Importing ${i + 1} of ${entries.length}: ${entry.reference_name || 'Untitled'}...`);

        let screenshots = { desktop_hero: '', desktop_full: '', mobile_hero: '', mobile_full: '' };

        // Try to match screenshot files by slug pattern
        const slug = (entry.reference_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const screenshotKeys = ['desktop_hero', 'desktop_full', 'mobile_hero', 'mobile_full'] as const;
        const matchedFiles: Record<string, File> = {};

        for (const key of screenshotKeys) {
          // Look for files matching pattern: slug-key.ext or slug/key.ext
          const match = bulkScreenshotFiles.find(f =>
            f.name.toLowerCase().includes(slug) && f.name.toLowerCase().includes(key.replace('_', '-'))
          ) || bulkScreenshotFiles.find(f =>
            f.name.toLowerCase().includes(slug) && f.name.toLowerCase().includes(key)
          );
          if (match) matchedFiles[key] = match;
        }

        if (Object.keys(matchedFiles).length > 0) {
          try {
            screenshots = await uploadReferenceScreenshots(
              matchedFiles,
              entry.reference_role || 'style',
              entry.reference_name || `ref-${i}`
            );
          } catch (err) {
            console.error('Bulk screenshot upload failed for', entry.reference_name, err);
          }
        }

        // Use provided screenshot URLs if no files matched
        if (entry.screenshots) {
          for (const key of screenshotKeys) {
            if (!screenshots[key] && entry.screenshots[key]) {
              screenshots[key] = entry.screenshots[key];
            }
          }
        }

        const ref = createEmptyReference({
          reference_name: entry.reference_name || `Import ${i + 1}`,
          industry: entry.industry || 'Other',
          reference_role: entry.reference_role || 'style',
          live_url: entry.live_url || '',
          theme_mode: entry.theme_mode || 'light',
          preview_image: screenshots.desktop_hero || entry.preview_image || generatePreviewPlaceholder(entry.industry || 'Other'),
          screenshots,
          style_tokens: entry.style_tokens || undefined,
          layout_tokens: entry.layout_tokens || undefined,
          notes: entry.notes || '',
        });
        saveReference(ref);
      }

      setBulkStatus(`✅ Imported ${entries.length} references`);
      setReferences(getReferences());
      setTimeout(() => {
        setShowBulkModal(false);
        setBulkStatus('');
        setBulkJsonFile(null);
        setBulkScreenshotFiles([]);
      }, 1500);
    } catch (err: any) {
      setBulkStatus(`❌ Error: ${err.message}`);
    }
    setUploading(false);
  };

  const handleDelete = (id: string) => {
    deleteReference(id);
    setReferences(getReferences());
    setDeleteConfirm(null);
  };

  const roleBadge = (role: ReferenceRole) => (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
      role === 'style'
        ? 'bg-primary/10 text-primary'
        : 'bg-accent text-accent-foreground'
    }`}>
      {role === 'style' ? 'Style' : 'Conversion Layout'}
    </span>
  );

  const handleScreenshotFile = (key: string, file: File | undefined) => {
    setScreenshotFiles(prev => ({ ...prev, [key]: file }));
  };

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="References Demo Sites" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Reference Demo Sites</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                <Upload size={16} /> Bulk Import
              </button>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Plus size={16} /> Add Reference
              </button>
            </div>
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
            {/* Role Filter */}
            <div className="flex gap-1.5 flex-wrap">
              {roleFilters.map(r => (
                <button key={r.value} onClick={() => setFilterRole(r.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filterRole === r.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}>
                  {r.label}
                </button>
              ))}
              <span className="w-px bg-border mx-1" />
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
                  <img src={ref.preview_image || generatePreviewPlaceholder(ref.industry)} alt={ref.reference_name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{ref.reference_name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                          {ref.industry}
                        </span>
                        {roleBadge(ref.reference_role)}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 truncate">{ref.live_url}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => window.open(ref.live_url, '_blank')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <ExternalLink size={12} /> Live View
                    </button>
                    <button className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      Select Reference
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
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-2">No reference layouts found.</p>
              <p className="text-xs text-muted-foreground">Add your first reference using the button above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Reference Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl border border-border w-[540px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Add Reference</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="control-label">Reference Name</label>
                <input type="text" value={newRef.name} onChange={e => setNewRef({ ...newRef, name: e.target.value })}
                  placeholder="e.g., Modern Dental Layout" className="control-input" />
              </div>
              <div>
                <label className="control-label">Live URL</label>
                <input type="url" value={newRef.liveUrl} onChange={e => setNewRef({ ...newRef, liveUrl: e.target.value })}
                  placeholder="https://example-reference.com" className="control-input" />
              </div>
              <div>
                <label className="control-label">Industry</label>
                <select value={newRef.industry} onChange={e => setNewRef({ ...newRef, industry: e.target.value })}
                  className="control-input">
                  {industries.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="control-label">Reference Role</label>
                <select value={newRef.role} onChange={e => setNewRef({ ...newRef, role: e.target.value as ReferenceRole })}
                  className="control-input">
                  <option value="style">Style</option>
                  <option value="conversion_layout">Conversion Layout</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {newRef.role === 'style'
                    ? 'Controls visual style: colors, fonts, component look & feel'
                    : 'Controls layout structure: section order, CTA placement, trust/proof positioning'}
                </p>
              </div>

              {/* Screenshot Uploads */}
              <div>
                <label className="control-label">Screenshots (optional)</label>
                <p className="text-xs text-muted-foreground mb-2">Upload screenshots to cloud storage for this reference.</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['desktop_hero', 'desktop_full', 'mobile_hero', 'mobile_full'] as const).map(key => (
                    <div key={key}>
                      <label className="text-xs text-muted-foreground mb-1 block capitalize">
                        {key.replace('_', ' ')}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleScreenshotFile(key, e.target.files?.[0])}
                        className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-secondary file:text-secondary-foreground"
                      />
                      {screenshotFiles[key] && (
                        <p className="text-xs text-primary mt-0.5 truncate">✓ {screenshotFiles[key]!.name}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="control-label">Notes (optional)</label>
                <textarea value={newRef.notes} onChange={e => setNewRef({ ...newRef, notes: e.target.value })}
                  placeholder="Any additional notes about this reference..." rows={3} className="control-input resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
                <button onClick={handleAdd} disabled={!newRef.name || !newRef.liveUrl || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl border border-border w-[540px] max-w-[95vw]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Bulk Import References</h2>
              <button onClick={() => { setShowBulkModal(false); setBulkStatus(''); }} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="control-label">Metadata JSON File</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload a JSON file containing an array of reference entries.
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={e => setBulkJsonFile(e.target.files?.[0] || null)}
                  className="text-sm w-full file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-secondary file:text-secondary-foreground"
                />
                {bulkJsonFile && <p className="text-xs text-primary mt-1">✓ {bulkJsonFile.name}</p>}
              </div>

              <div>
                <label className="control-label">Screenshot Files (optional)</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload screenshot images. Name them like: <code className="text-xs bg-muted px-1 rounded">slug-desktop-hero.png</code>
                </p>
                <input
                  ref={bulkFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => setBulkScreenshotFiles(Array.from(e.target.files || []))}
                  className="text-sm w-full file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-secondary file:text-secondary-foreground"
                />
                {bulkScreenshotFiles.length > 0 && (
                  <p className="text-xs text-primary mt-1">✓ {bulkScreenshotFiles.length} files selected</p>
                )}
              </div>

              {bulkStatus && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted text-sm">
                  {uploading && <Loader2 size={14} className="animate-spin text-primary" />}
                  <span>{bulkStatus}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowBulkModal(false); setBulkStatus(''); }}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
                <button onClick={handleBulkImport} disabled={!bulkJsonFile || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {uploading && <Loader2 size={14} className="animate-spin" />}
                  {uploading ? 'Importing...' : 'Import References'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

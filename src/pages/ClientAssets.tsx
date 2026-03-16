import { useState, useEffect } from 'react';
import NavHeader from '@/components/NavHeader';
import {
  getClientProjects, createClientProject, deleteClientProject,
  getClientAssets, uploadClientAsset, deleteClientAsset,
  type ClientProject, type ClientAsset, type AssetType
} from '@/lib/clientAssetStore';
import { Plus, Trash2, Upload, X, Loader2, Image, FolderOpen } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const assetTypes: { value: AssetType; label: string }[] = [
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'blog', label: 'Blog' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'logo', label: 'Logo' },
];

export default function ClientAssets() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [assets, setAssets] = useState<ClientAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // New project modal
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLimit, setNewProjectLimit] = useState(20);

  // Upload form
  const [uploadType, setUploadType] = useState<AssetType>('portfolio');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadAlt, setUploadAlt] = useState('');

  // Delete
  const [deleteAssetTarget, setDeleteAssetTarget] = useState<ClientAsset | null>(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<string | null>(null);

  // Filter
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedSlug) loadAssets(selectedSlug);
    else setAssets([]);
  }, [selectedSlug]);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await getClientProjects();
      setProjects(data);
      if (data.length > 0 && !selectedSlug) setSelectedSlug(data[0].client_slug);
    } catch (err: any) {
      toast({ title: 'Error loading projects', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  async function loadAssets(slug: string) {
    try {
      const data = await getClientAssets(slug);
      setAssets(data);
    } catch (err: any) {
      toast({ title: 'Error loading assets', description: err.message, variant: 'destructive' });
    }
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    try {
      const p = await createClientProject(newProjectName, newProjectLimit);
      setProjects(prev => [p, ...prev]);
      setSelectedSlug(p.client_slug);
      setShowNewProject(false);
      setNewProjectName('');
      toast({ title: 'Project created' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  async function handleDeleteProject() {
    if (!deleteProjectTarget) return;
    try {
      await deleteClientProject(deleteProjectTarget);
      setProjects(prev => prev.filter(p => p.client_slug !== deleteProjectTarget));
      if (selectedSlug === deleteProjectTarget) setSelectedSlug(null);
      setDeleteProjectTarget(null);
      toast({ title: 'Project deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  async function handleUpload() {
    if (!selectedSlug || uploadFiles.length === 0) return;
    setUploading(true);
    try {
      for (const file of uploadFiles) {
        await uploadClientAsset(selectedSlug, uploadType, file, uploadCaption, uploadAlt);
      }
      await loadAssets(selectedSlug);
      await loadProjects();
      setUploadFiles([]);
      setUploadCaption('');
      setUploadAlt('');
      toast({ title: `${uploadFiles.length} file(s) uploaded` });
    } catch (err: any) {
      toast({ title: 'Upload error', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  }

  async function handleDeleteAsset() {
    if (!deleteAssetTarget || !selectedSlug) return;
    try {
      await deleteClientAsset(deleteAssetTarget.id, deleteAssetTarget.file_url, selectedSlug);
      setAssets(prev => prev.filter(a => a.id !== deleteAssetTarget.id));
      await loadProjects();
      setDeleteAssetTarget(null);
      toast({ title: 'Asset deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  const selectedProject = projects.find(p => p.client_slug === selectedSlug);
  const filteredAssets = filterType === 'all' ? assets : assets.filter(a => a.asset_type === filterType);

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Client Assets" />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Projects */}
        <aside className="w-[260px] shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Projects</h3>
              <button onClick={() => setShowNewProject(true)}
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Plus size={14} />
              </button>
            </div>
            {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
            {projects.map(p => (
              <button key={p.client_slug} onClick={() => setSelectedSlug(p.client_slug)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors mb-1 ${
                  selectedSlug === p.client_slug
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted/60'
                }`}>
                <FolderOpen size={14} className="shrink-0 opacity-50" />
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{p.client_name}</span>
                  <span className="text-[10px] text-muted-foreground">{p.uploaded_image_count}/{p.included_image_limit} images</span>
                </div>
                <button onClick={e => { e.stopPropagation(); setDeleteProjectTarget(p.client_slug); }}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={12} />
                </button>
              </button>
            ))}
            {!loading && projects.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No projects yet</p>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {selectedProject ? (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedProject.client_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedProject.uploaded_image_count} / {selectedProject.included_image_limit} images uploaded
                  </p>
                </div>
              </div>

              {/* Upload Section */}
              <div className="rounded-lg border border-border bg-card p-4 mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Upload Assets</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Asset Type</label>
                    <select value={uploadType} onChange={e => setUploadType(e.target.value as AssetType)}
                      className="control-input text-xs">
                      {assetTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Caption</label>
                    <input type="text" value={uploadCaption} onChange={e => setUploadCaption(e.target.value)}
                      placeholder="Optional caption" className="control-input text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Alt Text</label>
                    <input type="text" value={uploadAlt} onChange={e => setUploadAlt(e.target.value)}
                      placeholder="Alt text for SEO" className="control-input text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Files</label>
                    <input type="file" accept="image/*" multiple
                      onChange={e => setUploadFiles(Array.from(e.target.files || []))}
                      className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-secondary file:text-secondary-foreground" />
                  </div>
                </div>
                {uploadFiles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-primary">✓ {uploadFiles.length} file(s) selected</span>
                    <button onClick={handleUpload} disabled={uploading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                )}
              </div>

              {/* Filter */}
              <div className="flex gap-1.5 mb-4">
                <button onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filterType === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}>All</button>
                {assetTypes.map(t => (
                  <button key={t.value} onClick={() => setFilterType(t.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      filterType === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
                    }`}>{t.label}</button>
                ))}
              </div>

              {/* Asset Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredAssets.map(asset => (
                  <div key={asset.id} className="rounded-lg border border-border bg-card overflow-hidden group relative">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img src={asset.file_url} alt={asset.alt_text || asset.caption} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground capitalize">
                        {asset.asset_type}
                      </span>
                      {asset.caption && <p className="text-xs text-foreground mt-1 truncate">{asset.caption}</p>}
                      <button onClick={() => setDeleteAssetTarget(asset)}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-card/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {filteredAssets.length === 0 && (
                <div className="text-center py-16">
                  <Image size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-muted-foreground text-sm">No assets uploaded yet</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center">
                <FolderOpen size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground">Select or create a client project</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl border border-border w-[400px] max-w-[95vw]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">New Client Project</h2>
              <button onClick={() => setShowNewProject(false)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="control-label">Client Name</label>
                <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g., kchen-construction" className="control-input" />
              </div>
              <div>
                <label className="control-label">Image Limit</label>
                <input type="number" value={newProjectLimit} onChange={e => setNewProjectLimit(Number(e.target.value))}
                  className="control-input" min={1} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowNewProject(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
                <button onClick={handleCreateProject} disabled={!newProjectName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Asset Confirm */}
      <AlertDialog open={!!deleteAssetTarget} onOpenChange={open => !open && setDeleteAssetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the file from storage permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAsset}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Project Confirm */}
      <AlertDialog open={!!deleteProjectTarget} onOpenChange={open => !open && setDeleteProjectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>All assets in this project will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

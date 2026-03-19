import { useState, useEffect, useMemo } from 'react';
import NavHeader from '@/components/NavHeader';
import {
  getClientProjects, createClientProject, deleteClientProject,
  getClientAssets, uploadClientAsset, deleteClientAsset,
  type ClientProject, type ClientAsset, type AssetType
} from '@/lib/clientAssetStore';
import { importClientZip } from '@/lib/zipImporter';
import {
  Plus, Trash2, Upload, X, Loader2, Image, FolderOpen,
  Pencil, FileArchive, ChevronRight, Briefcase, FileText,
  Images, Palette, ArrowLeft
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

type ContentType = {
  key: AssetType;
  label: string;
  folderLabel: string;
  icon: typeof Briefcase;
};

const contentTypes: ContentType[] = [
  { key: 'portfolio', label: 'Portfolio / Projects', folderLabel: 'Portfolio', icon: Briefcase },
  { key: 'blog', label: 'Blog', folderLabel: 'Blog', icon: FileText },
  { key: 'gallery', label: 'Gallery', folderLabel: 'Gallery', icon: Images },
  { key: 'logo', label: 'Branding', folderLabel: 'Branding', icon: Palette },
];

export default function ClientAssets() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [assets, setAssets] = useState<ClientAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [selectedContentType, setSelectedContentType] = useState<AssetType | null>(null);

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLimit, setNewProjectLimit] = useState(20);

  const [renameTarget, setRenameTarget] = useState<ClientProject | null>(null);
  const [renameName, setRenameName] = useState('');

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadAlt, setUploadAlt] = useState('');

  const [detailAsset, setDetailAsset] = useState<ClientAsset | null>(null);

  const [deleteAssetTarget, setDeleteAssetTarget] = useState<ClientAsset | null>(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<string | null>(null);

  // Mobile navigation depth
  const [mobileView, setMobileView] = useState<'projects' | 'types' | 'assets'>('projects');

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    if (selectedSlug) loadAssets(selectedSlug);
    else { setAssets([]); setSelectedContentType(null); }
  }, [selectedSlug]);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await getClientProjects();
      setProjects(data);
      if (data.length > 0 && !selectedSlug && !isMobile) setSelectedSlug(data[0].client_slug);
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
      setSelectedContentType(null);
      setShowNewProject(false);
      setNewProjectName('');
      setNewProjectLimit(20);
      if (isMobile) setMobileView('types');
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
      if (selectedSlug === deleteProjectTarget) {
        setSelectedSlug(null);
        setSelectedContentType(null);
        if (isMobile) setMobileView('projects');
      }
      setDeleteProjectTarget(null);
      toast({ title: 'Project deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  async function handleUpload() {
    if (!selectedSlug || !selectedContentType || uploadFiles.length === 0) return;
    setUploading(true);
    try {
      for (const file of uploadFiles) {
        await uploadClientAsset(selectedSlug, selectedContentType, file, uploadCaption, uploadAlt);
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
      if (detailAsset?.id === deleteAssetTarget.id) setDetailAsset(null);
      await loadProjects();
      setDeleteAssetTarget(null);
      toast({ title: 'Asset deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  const selectedProject = projects.find(p => p.client_slug === selectedSlug);

  const contentTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { portfolio: 0, blog: 0, gallery: 0, logo: 0 };
    assets.forEach(a => { counts[a.asset_type] = (counts[a.asset_type] || 0) + 1; });
    return counts;
  }, [assets]);

  const filteredAssets = useMemo(() => {
    if (!selectedContentType) return [];
    return assets.filter(a => a.asset_type === selectedContentType);
  }, [assets, selectedContentType]);

  const activeContentLabel = contentTypes.find(c => c.key === selectedContentType)?.folderLabel || '';

  // Mobile drilldown view
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <NavHeader title="Client Assets" />
        <div className="flex-1 overflow-y-auto">
          {/* Projects list */}
          {mobileView === 'projects' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Client Projects</h3>
                <button onClick={() => setShowNewProject(true)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
                  <Plus size={12} /> New Client
                </button>
              </div>
              {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
              {projects.map(p => (
                <button key={p.client_slug}
                  onClick={() => { setSelectedSlug(p.client_slug); setSelectedContentType(null); setMobileView('types'); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card text-left">
                  <FolderOpen size={16} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.client_name}</p>
                    <p className="text-xs text-muted-foreground">{p.uploaded_image_count} images</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              ))}
              {!loading && projects.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No projects yet</p>
              )}
            </div>
          )}

          {/* Content types */}
          {mobileView === 'types' && selectedProject && (
            <div className="p-4 space-y-3">
              <button onClick={() => { setMobileView('projects'); setSelectedSlug(null); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft size={12} /> Back
              </button>
              <h3 className="text-sm font-bold text-foreground">{selectedProject.client_name}</h3>
              {contentTypes.map(ct => {
                const count = contentTypeCounts[ct.key] || 0;
                const Icon = ct.icon;
                return (
                  <button key={ct.key}
                    onClick={() => { setSelectedContentType(ct.key); setDetailAsset(null); setMobileView('assets'); }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card text-left">
                    <Icon size={16} className="text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-foreground">{ct.label}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Assets grid */}
          {mobileView === 'assets' && selectedProject && selectedContentType && (
            <div className="p-4 space-y-3">
              <button onClick={() => { setMobileView('types'); setSelectedContentType(null); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft size={12} /> Back
              </button>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">{selectedProject.client_name} — {activeContentLabel}</h3>
                <label className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground cursor-pointer">
                  <Plus size={12} /> Add
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={e => { const files = Array.from(e.target.files || []); if (files.length > 0) setUploadFiles(files); }} />
                </label>
              </div>

              {uploadFiles.length > 0 && (
                <div className="p-3 bg-accent/30 rounded-lg border border-border space-y-2">
                  <p className="text-xs text-primary font-medium">✓ {uploadFiles.length} file(s) selected</p>
                  <input type="text" value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} placeholder="Caption" className="control-input text-xs" />
                  <input type="text" value={uploadAlt} onChange={e => setUploadAlt(e.target.value)} placeholder="Alt text" className="control-input text-xs" />
                  <div className="flex gap-2">
                    <button onClick={() => setUploadFiles([])} className="flex-1 py-2 rounded-md text-xs bg-secondary text-secondary-foreground">Cancel</button>
                    <button onClick={handleUpload} disabled={uploading}
                      className="flex-1 py-2 rounded-md text-xs bg-primary text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-1">
                      {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              )}

              {detailAsset ? (
                <div className="space-y-3">
                  <button onClick={() => setDetailAsset(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={12} /> Back to list
                  </button>
                  <div className="rounded-lg border border-border bg-muted overflow-hidden">
                    <img src={detailAsset.file_url} alt={detailAsset.alt_text || detailAsset.caption} className="w-full h-auto object-contain max-h-[300px]" />
                  </div>
                  <div className="space-y-2">
                    <div><label className="control-label">Title</label><input type="text" defaultValue={detailAsset.caption || ''} className="control-input" readOnly /></div>
                    <div><label className="control-label">Alt Text</label><input type="text" defaultValue={detailAsset.alt_text || ''} className="control-input" readOnly /></div>
                  </div>
                  <button onClick={() => setDeleteAssetTarget(detailAsset)}
                    className="w-full py-2 rounded-lg text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10">
                    <Trash2 size={12} className="inline mr-1" /> Delete Asset
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredAssets.map(a => (
                    <button key={a.id} onClick={() => setDetailAsset(a)}
                      className="rounded-lg border border-border bg-card overflow-hidden text-left">
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img src={a.file_url} alt={a.alt_text || a.caption} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-foreground truncate">{a.caption || a.folder_slug}</p>
                      </div>
                    </button>
                  ))}
                  {filteredAssets.length === 0 && (
                    <p className="col-span-2 text-xs text-muted-foreground text-center py-8">No assets yet</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showNewProject && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
            <div className="bg-card rounded-t-xl sm:rounded-xl border border-border w-full sm:max-w-md p-5 space-y-4">
              <h3 className="text-base font-semibold text-foreground">New Client Project</h3>
              <div><label className="control-label">Client Name</label>
                <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Client name" className="control-input" />
              </div>
              <div><label className="control-label">Image Limit</label>
                <input type="number" value={newProjectLimit} onChange={e => setNewProjectLimit(Number(e.target.value))} className="control-input" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewProject(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-secondary text-secondary-foreground">Cancel</button>
                <button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="flex-1 py-2.5 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">Create</button>
              </div>
            </div>
          </div>
        )}

        <AlertDialog open={!!deleteAssetTarget} onOpenChange={open => !open && setDeleteAssetTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete this asset?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently remove the file.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAsset}>Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteProjectTarget} onOpenChange={open => !open && setDeleteProjectTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete this project?</AlertDialogTitle>
              <AlertDialogDescription>All assets will be removed.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProject}>Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Client Assets" />

      <div className="flex flex-1 min-h-0">
        {/* LEFT PANEL */}
        <aside className="w-[240px] shrink-0 border-r border-border bg-card flex flex-col">
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Client Projects</h3>
              <button onClick={() => setShowNewProject(true)}
                className="px-2 py-1 rounded-md text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1">
                <Plus size={10} /> New Client
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loading && <p className="text-xs text-muted-foreground p-2">Loading...</p>}
            {projects.map(p => (
              <div key={p.client_slug}
                onClick={() => { setSelectedSlug(p.client_slug); setSelectedContentType(null); setDetailAsset(null); }}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors ${
                  selectedSlug === p.client_slug ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/60'
                }`}>
                <FolderOpen size={14} className="shrink-0 opacity-50" />
                <div className="flex-1 min-w-0">
                  <span className="truncate block text-[13px]">{p.client_name}</span>
                  <span className="text-[10px] text-muted-foreground">{p.uploaded_image_count} images</span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); setRenameTarget(p); setRenameName(p.client_name); }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
                  <button onClick={e => { e.stopPropagation(); setDeleteProjectTarget(p.client_slug); }}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
            {!loading && projects.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No projects yet</p>}
          </div>
        </aside>

        {/* CENTER PANEL */}
        <aside className="w-[220px] shrink-0 border-r border-border bg-background flex flex-col">
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Content Types</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {selectedProject ? (
              <div className="space-y-0.5">
                {contentTypes.map(ct => {
                  const count = contentTypeCounts[ct.key] || 0;
                  const Icon = ct.icon;
                  return (
                    <button key={ct.key}
                      onClick={() => { setSelectedContentType(ct.key); setDetailAsset(null); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors ${
                        selectedContentType === ct.key ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/60'
                      }`}>
                      <Icon size={14} className="shrink-0 opacity-60" />
                      <span className="flex-1 text-left text-[13px]">{ct.label}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">({count})</span>
                      <ChevronRight size={12} className="opacity-30" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">Select a project</p>
            )}
          </div>
        </aside>

        {/* RIGHT PANEL */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {selectedProject && selectedContentType ? (
            <>
              <div className="px-5 pt-4 pb-3 border-b border-border bg-card/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Content Manager</h2>
                    <p className="text-sm font-medium text-foreground">{selectedProject.client_name} — {activeContentLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer transition-colors">
                      <FileArchive size={12} /> Upload ZIP
                      <input type="file" accept=".zip" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        toast({ title: 'Processing ZIP...', description: 'Extracting and uploading assets.' });
                        try {
                          const result = await importClientZip(file);
                          await loadProjects();
                          if (result.clientSlug) {
                            setSelectedSlug(result.clientSlug);
                            if (result.clientSlug === selectedSlug) await loadAssets(result.clientSlug);
                          }
                          toast({ title: `ZIP imported: ${result.itemsCreated} items, ${result.imagesUploaded} images`,
                            description: result.errors.length > 0 ? `${result.errors.length} error(s) occurred` : undefined });
                        } catch (err: any) {
                          toast({ title: 'ZIP import failed', description: err.message, variant: 'destructive' });
                        }
                        e.target.value = '';
                      }} />
                    </label>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-colors">
                      <Plus size={12} /> Add Item
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={e => { const files = Array.from(e.target.files || []); if (files.length > 0) setUploadFiles(files); }} />
                    </label>
                  </div>
                </div>
              </div>

              {uploadFiles.length > 0 && (
                <div className="px-5 py-3 bg-accent/30 border-b border-border flex items-center gap-3">
                  <span className="text-xs text-primary font-medium">✓ {uploadFiles.length} file(s) selected</span>
                  <div className="flex-1 flex items-center gap-2">
                    <input type="text" value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} placeholder="Caption (optional)" className="control-input text-xs max-w-[180px]" />
                    <input type="text" value={uploadAlt} onChange={e => setUploadAlt(e.target.value)} placeholder="Alt text" className="control-input text-xs max-w-[180px]" />
                  </div>
                  <button onClick={() => setUploadFiles([])} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={14} /></button>
                  <button onClick={handleUpload} disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              )}

              {detailAsset ? (
                <div className="flex-1 p-5">
                  <button onClick={() => setDetailAsset(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    <ArrowLeft size={12} /> Back to list
                  </button>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-lg border border-border bg-muted overflow-hidden">
                      <img src={detailAsset.file_url} alt={detailAsset.alt_text || detailAsset.caption} className="w-full h-auto object-contain max-h-[400px]" />
                    </div>
                    <div className="space-y-4">
                      <div><label className="control-label">Title</label><input type="text" defaultValue={detailAsset.caption || ''} className="control-input" readOnly /></div>
                      <div><label className="control-label">Slug</label><input type="text" defaultValue={detailAsset.folder_slug || ''} className="control-input" readOnly /></div>
                      <div><label className="control-label">Alt Text</label><input type="text" defaultValue={detailAsset.alt_text || ''} className="control-input" readOnly /></div>
                      <div><label className="control-label">Description</label><textarea defaultValue="" className="control-input min-h-[80px]" placeholder="Item description..." readOnly /></div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => setDeleteAssetTarget(detailAsset)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 transition-colors">
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredAssets.map(a => (
                      <button key={a.id} onClick={() => setDetailAsset(a)}
                        className="rounded-lg border border-border bg-card overflow-hidden text-left hover:shadow-md transition-shadow">
                        <div className="aspect-square bg-muted overflow-hidden">
                          <img src={a.file_url} alt={a.alt_text || a.caption} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-foreground truncate">{a.caption || a.folder_slug}</p>
                          {a.alt_text && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{a.alt_text}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                  {filteredAssets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Image size={32} className="mb-3 opacity-40" />
                      <p className="text-sm">No {activeContentLabel.toLowerCase()} assets yet</p>
                      <p className="text-xs mt-1">Upload images using the Add Item button above</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">{selectedProject ? 'Select a content type' : 'Select a project to manage assets'}</p>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border w-full max-w-md mx-4 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground">New Client Project</h3>
            <div><label className="control-label">Client Name</label>
              <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Client name" className="control-input" /></div>
            <div><label className="control-label">Included Image Limit</label>
              <input type="number" value={newProjectLimit} onChange={e => setNewProjectLimit(Number(e.target.value))} className="control-input" /></div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowNewProject(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-secondary text-secondary-foreground">Cancel</button>
              <button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="flex-1 py-2.5 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">Create Project</button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteAssetTarget} onOpenChange={open => !open && setDeleteAssetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this asset?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the file.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAsset}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteProjectTarget} onOpenChange={open => !open && setDeleteProjectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this project and all its assets?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

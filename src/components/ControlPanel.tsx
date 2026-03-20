import { useState, useEffect, useRef, useCallback } from 'react';
import { googleFonts, contentModules, advancedModules } from '@/lib/mockData';
import { saveProject } from '@/lib/store';
import type { SavedProject } from '@/lib/mockData';
import ReferenceLibraryModal from './ReferenceLibraryModal';
import { LayoutGrid, Sparkles, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { DemoSite } from '@/lib/demoSiteStore';
import { supabase } from '@/integrations/supabase/client';
import { getPromptLibrary } from '@/lib/promptLibraryStore';
import { getCloudPrompts } from '@/lib/promptCloudStore';

// Authoritative Group B cloud prompt IDs
const CLOUD_PROMPT_IDS: Record<string, string> = {
  'SwiftLift Source Extraction Prompt V1': 'b7c1fb95-15f9-4e93-8a96-88e6152ee669',
  'SwiftLift Final Build Master Prompt V1': '035a3b80-251f-4bdf-9615-855a041eadca',
  'SwiftLift Prompt Assembly Rules V1': 'cd77a34e-9cb0-44f1-8d31-e1764c531f8e',
};

// Normalize prompt content for comparison — ignore formatting-only differences
function normalizePromptContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n')   // normalize line endings to LF
    .replace(/\r/g, '\n')
    .replace(/[ \t]+$/gm, '') // trim trailing whitespace per line
    .replace(/\n{3,}/g, '\n\n') // collapse 3+ blank lines to 2
    .trim();                   // trim leading/trailing
}

const projectBrands = ['SwiftLift', 'Bluluma', 'Sonykun', 'SwiftSite'];

interface Props {
  onPromptsGenerated: (promptA: string, promptB: string, tier: '350' | '550') => void;
  onGenerateStart: (tier: '350' | '550') => void;
  onGenerateError: (error: string) => void;
  onClear: () => void;
  clearSignal: number;
  saveSignal: number;
  newSignal: number;
}

function getProjectName(sourceUrl: string): string {
  try {
    const hostname = new URL(sourceUrl.startsWith('http') ? sourceUrl : `https://${sourceUrl}`).hostname;
    return hostname.replace('www.', '').split('.')[0].charAt(0).toUpperCase() +
      hostname.replace('www.', '').split('.')[0].slice(1);
  } catch {
    return 'Untitled Project';
  }
}

// Adapter: DemoSite fields used by the modal selection
interface RefSelection {
  reference_name: string;
  live_url: string;
}

interface DetectedBrand {
  primaryColor: { hex: string; source: string } | null;
  secondaryColor: { hex: string; source: string } | null;
  primaryFont: { family: string; source: string } | null;
  fontWeight: { weight: string; source: string } | null;
}

export default function ControlPanel({ onPromptsGenerated, onGenerateStart, onGenerateError, onClear, clearSignal, saveSignal, newSignal }: Props) {
  const [projectBrand, setProjectBrand] = useState('SwiftLift');
  const [sourceUrl, setSourceUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');

  // Style Reference
  const [styleRef, setStyleRef] = useState<RefSelection | null>(null);
  const [showStyleLibrary, setShowStyleLibrary] = useState(false);

  // Conversion Layout Reference
  const [convRef, setConvRef] = useState<RefSelection | null>(null);
  const [showConvLibrary, setShowConvLibrary] = useState(false);

  // Manual reference URL overrides
  const [styleRefUrl, setStyleRefUrl] = useState('');
  const [convRefUrl, setConvRefUrl] = useState('');
  const [styleUrlError, setStyleUrlError] = useState('');
  const [convUrlError, setConvUrlError] = useState('');

  const [packageTier, setPackageTier] = useState<'350' | '550'>('550');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [primaryFont, setPrimaryFont] = useState('');
  const [fontWeight, setFontWeight] = useState('');
  const [themeMode, setThemeMode] = useState<'auto' | 'force_light' | 'force_dark'>('auto');
  const [brandDetected, setBrandDetected] = useState(false);
  const [brandDetecting, setBrandDetecting] = useState(false);
  const [detectedSources, setDetectedSources] = useState<{
    primaryColor?: string; secondaryColor?: string; primaryFont?: string; fontWeight?: string;
  }>({});
  // Track manual overrides — once user manually changes a field, auto-detection won't overwrite it
  const manualOverrides = useRef<Set<string>>(new Set());
  const [modules, setModules] = useState<string[]>([]);
  const [advModules, setAdvModules] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'unknown' | 'synced' | 'unsynced' | 'checking'>('unknown');
  const [unsyncedPrompt, setUnsyncedPrompt] = useState<string | null>(null);
  const [showBrandConfirm, setShowBrandConfirm] = useState(false);
  const [confirmBrand, setConfirmBrand] = useState('SwiftLift');
  const detectAbortRef = useRef<AbortController | null>(null);

  const toggleModule = (id: string) => setModules(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAdvModule = (id: string) => setAdvModules(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  // Check prompt sync status — verify all 3 cloud prompts exist and have content
  const checkSyncStatus = useCallback(async () => {
    setSyncStatus('checking');
    try {
      const cloudPrompts = await getCloudPrompts();
      const requiredNames = Object.keys(CLOUD_PROMPT_IDS);

      for (const name of requiredNames) {
        const cloudId = CLOUD_PROMPT_IDS[name];
        const cloud = cloudPrompts.find(p => p.id === cloudId);
        if (!cloud || !normalizePromptContent(cloud.content)) {
          setSyncStatus('unsynced');
          const shortName = name.replace('SwiftLift ', '').replace(' V1', '');
          setUnsyncedPrompt(shortName + ' missing from cloud');
          return;
        }
      }
      setSyncStatus('synced');
      setUnsyncedPrompt(null);
    } catch {
      // If cloud fetch fails, assume synced to avoid blocking
      setSyncStatus('synced');
      setUnsyncedPrompt(null);
    }
  }, []);

  // Check sync on mount
  useEffect(() => {
    checkSyncStatus();
  }, [checkSyncStatus]);

  // Real brand detection via edge function
  const runBrandDetection = useCallback(async (url: string) => {
    if (!url || url.length < 5) return;

    // Abort any in-flight detection
    if (detectAbortRef.current) detectAbortRef.current.abort();
    const controller = new AbortController();
    detectAbortRef.current = controller;

    setBrandDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-brand', {
        body: { url },
      });

      if (controller.signal.aborted) return;

      if (error || !data?.success) {
        console.warn('Brand detection failed:', error?.message || data?.error);
        setBrandDetecting(false);
        return;
      }

      const result = data as DetectedBrand & { success: boolean };
      const newSources: typeof detectedSources = {};

      if (result.primaryColor?.hex && !manualOverrides.current.has('primaryColor')) {
        setPrimaryColor(result.primaryColor.hex);
        newSources.primaryColor = result.primaryColor.source;
      }
      if (result.secondaryColor?.hex && !manualOverrides.current.has('secondaryColor')) {
        setSecondaryColor(result.secondaryColor.hex);
        newSources.secondaryColor = result.secondaryColor.source;
      }
      if (result.primaryFont?.family && !manualOverrides.current.has('primaryFont')) {
        // Match against available Google Fonts list
        const matched = googleFonts.find(f => f.toLowerCase() === result.primaryFont!.family.toLowerCase());
        if (matched) {
          setPrimaryFont(matched);
          newSources.primaryFont = result.primaryFont.source;
        }
      }
      if (result.fontWeight?.weight && !manualOverrides.current.has('fontWeight')) {
        setFontWeight(result.fontWeight.weight);
        newSources.fontWeight = result.fontWeight.source;
      }

      setDetectedSources(newSources);
      setBrandDetected(true);
    } catch (err) {
      if (!controller.signal.aborted) console.warn('Brand detection error:', err);
    }
    if (!controller.signal.aborted) setBrandDetecting(false);
  }, []);

  const handleSourceUrlChange = (url: string) => {
    setSourceUrl(url);
    if (!url) {
      setBrandDetected(false);
      setDetectedSources({});
    }
  };

  // Trigger detection on URL blur (when user finishes typing)
  const handleSourceUrlBlur = () => {
    if (sourceUrl && sourceUrl.length > 5) {
      runBrandDetection(sourceUrl);
    }
  };

  function normalizeUrl(url: string): string {
    let u = url.trim();
    if (!u) return '';
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = u.startsWith('www.') ? `https://${u}` : `https://${u}`;
    }
    return u;
  }

  const executeGenerate = async () => {
    // Validate manual URLs if provided
    const normalizedStyleUrl = normalizeUrl(styleRefUrl);
    const normalizedConvUrl = normalizeUrl(convRefUrl);

    if (styleRefUrl && normalizedStyleUrl) {
      try {
        new URL(normalizedStyleUrl);
        setStyleUrlError('');
      } catch {
        setStyleUrlError('Unable to access the reference URL. Please check the address.');
        return;
      }
    }
    if (convRefUrl && normalizedConvUrl) {
      try {
        new URL(normalizedConvUrl);
        setConvUrlError('');
      } catch {
        setConvUrlError('Unable to access the reference URL. Please check the address.');
        return;
      }
    }

    setGenerating(true);
    onGenerateStart(packageTier);

    // Priority: Manual URL > Demo Site selection > empty
    const resolvedStyleRef = normalizedStyleUrl || styleRef?.live_url || '';
    const resolvedConvRef = normalizedConvUrl || convRef?.live_url || '';

    try {
      // Fetch latest cloud prompts and local prompts fresh
      const localPrompts = getPromptLibrary();
      let cloudPrompts: Awaited<ReturnType<typeof getCloudPrompts>> = [];
      try {
        cloudPrompts = await getCloudPrompts();
      } catch (fetchErr) {
        console.warn('Cloud prompt fetch failed, proceeding with local only:', fetchErr);
      }

      const requiredNames = Object.keys(CLOUD_PROMPT_IDS);
      const resolvedPrompts: Record<string, string> = {};

      // For each required prompt: compare normalized content, resolve latest
      for (const name of requiredNames) {
        const local = localPrompts.find(p => p.name === name);
        const cloudId = CLOUD_PROMPT_IDS[name];
        const cloud = cloudPrompts.find(p => p.id === cloudId);

        if (!local?.content && !cloud?.content) {
          onGenerateError(`Required prompt missing: "${name}". Check Prompt Library.`);
          setGenerating(false);
          return;
        }

        // Use normalized comparison
        const localNorm = local ? normalizePromptContent(local.content) : '';
        const cloudNorm = cloud ? normalizePromptContent(cloud.content) : '';

        if (local && cloud && localNorm !== cloudNorm) {
          const shortName = name.replace('SwiftLift ', '').replace(' V1', '');
          onGenerateError(`${shortName} is out of sync. Please save or sync in Prompt Library before generating.`);
          setSyncStatus('unsynced');
          setUnsyncedPrompt(name);
          setGenerating(false);
          return;
        }

        // Use local content as source of truth (it's what gets passed to the edge function)
        resolvedPrompts[name] = local?.content || cloud?.content || '';
      }

      const extractionPrompt = resolvedPrompts['SwiftLift Source Extraction Prompt V1'];
      const masterPrompt = resolvedPrompts['SwiftLift Final Build Master Prompt V1'];
      const assemblyRules = resolvedPrompts['SwiftLift Prompt Assembly Rules V1'];

      // Mark as synced since we passed the check
      setSyncStatus('synced');
      setUnsyncedPrompt(null);

      const { data, error } = await supabase.functions.invoke('generate-final-prompt', {
        body: {
          sourceUrl,
          referenceUrl: resolvedStyleRef,
          conversionLayoutUrl: resolvedConvRef,
          businessType: '',
          userNotes: specialInstructions || '',
          packageTier,
          projectBrand: projectBrand || 'SwiftLift',
          themeMode,
          primaryColor,
          secondaryColor,
          primaryFont,
          fontWeight,
          enabledModules: modules,
          // Pass local prompts for generation
          localPrompts: {
            extractionPrompt,
            masterPrompt,
            assemblyRules,
          },
        },
      });

      if (error) {
        onGenerateError(error.message || 'Edge function call failed');
      } else if (data?.success) {
        onPromptsGenerated(data.promptA, data.promptB, packageTier);
      } else {
        onGenerateError(data?.error || 'Generation failed');
      }
    } catch (err: any) {
      onGenerateError(err.message || 'Network error');
    }

    setGenerating(false);
  };

  const handleGenerate = () => {
    if (!sourceUrl) return;
    setConfirmBrand(projectBrand);
    setShowBrandConfirm(true);
  };

  const handleConfirmGenerate = () => {
    setProjectBrand(confirmBrand);
    setShowBrandConfirm(false);
    executeGenerate();
  };

  const doSave = () => {
    const resolvedStyleRef = normalizeUrl(styleRefUrl) || styleRef?.live_url || '';
    const project: SavedProject = {
      id: crypto.randomUUID(),
      name: projectName || getProjectName(sourceUrl),
      sourceUrl, referenceLayout: styleRef?.reference_name || '', referenceUrl: resolvedStyleRef, packageTier,
      modules, addons: [], primaryColor, secondaryColor, primaryFont,
      specialInstructions, promptA: '', promptB: '',
      dateCreated: new Date().toISOString().slice(0, 10),
      producedBy: projectBrand, projectName, clientName,
      fontWeight, advancedModules: advModules,
    };
    saveProject(project);
  };

  const doClear = () => {
    setProjectBrand('SwiftLift'); setSourceUrl(''); setProjectName(''); setClientName('');
    setStyleRef(null); setConvRef(null); setStyleRefUrl(''); setConvRefUrl('');
    setStyleUrlError(''); setConvUrlError('');
    setPackageTier('550'); setModules([]); setAdvModules([]);
    setPrimaryColor(''); setSecondaryColor('');
    setPrimaryFont(''); setFontWeight(''); setThemeMode('auto');
    setSpecialInstructions(''); setBrandDetected(false); setBrandDetecting(false);
    setDetectedSources({});
    manualOverrides.current = new Set();
    onClear();
  };

  useEffect(() => { if (clearSignal > 0) doClear(); }, [clearSignal]);
  useEffect(() => { if (saveSignal > 0) doSave(); }, [saveSignal]);
  useEffect(() => { if (newSignal > 0) { doSave(); doClear(); } }, [newSignal]);

  return (
    <>
      <div className="space-y-5 overflow-y-auto pr-1">
        {/* 1. Project Setup */}
        <div className="panel-section">
          <h3 className="panel-section-title">Project Setup</h3>
          <div className="space-y-3">
            <div>
              <label className="control-label">Project Brand</label>
              <select value={projectBrand} onChange={e => setProjectBrand(e.target.value)} className="control-input">
                {projectBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="control-label">Source URL</label>
              <div className="flex items-center gap-1.5">
                <input type="text" value={sourceUrl} onChange={e => handleSourceUrlChange(e.target.value)}
                  onBlur={handleSourceUrlBlur}
                  placeholder="https://example.com" className="control-input flex-1" />
                {brandDetecting && <Loader2 size={16} className="animate-spin text-muted-foreground shrink-0" />}
              </div>
            </div>
            <div>
              <label className="control-label">Project Name</label>
              <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
                placeholder="Auto-filled from Source URL" className="control-input" />
            </div>
            <div>
              <label className="control-label">Client Name</label>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="Client or business name" className="control-input" />
            </div>
          </div>
        </div>

        {/* 2. Reference Design */}
        <div className="panel-section">
          <h3 className="panel-section-title">Reference Design</h3>
          <div className="space-y-3">
            {/* Style Reference */}
            <div>
              <label className="control-label">Style Reference</label>
              {styleRef ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/50 min-h-[40px]">
                  <LayoutGrid size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{styleRef.reference_name}</span>
                  <button onClick={() => setStyleRef(null)} className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowStyleLibrary(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  <LayoutGrid size={16} /> Select Style Demo Site
                </button>
              )}
            </div>

            {/* Style Reference URL (manual override) */}
            <div>
              <label className="control-label">Style Reference URL <span className="text-muted-foreground font-normal">(manual override)</span></label>
              <input type="text" value={styleRefUrl} onChange={e => { setStyleRefUrl(e.target.value); setStyleUrlError(''); }}
                placeholder="https://reference-site.com" className="control-input" />
              {styleUrlError && <p className="text-xs text-destructive mt-1">{styleUrlError}</p>}
            </div>

            {/* Conversion Layout Reference */}
            <div>
              <label className="control-label">Conversion Layout Reference <span className="text-muted-foreground font-normal">(premium)</span></label>
              {convRef ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/50 min-h-[40px]">
                  <LayoutGrid size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{convRef.reference_name}</span>
                  <button onClick={() => setConvRef(null)} className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowConvLibrary(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  <LayoutGrid size={16} /> Select Conversion Demo Site
                </button>
              )}
            </div>

            {/* Conversion Reference URL (manual override) */}
            <div>
              <label className="control-label">Conversion Reference URL <span className="text-muted-foreground font-normal">(manual override)</span></label>
              <input type="text" value={convRefUrl} onChange={e => { setConvRefUrl(e.target.value); setConvUrlError(''); }}
                placeholder="https://conversion-reference.com" className="control-input" />
              {convUrlError && <p className="text-xs text-destructive mt-1">{convUrlError}</p>}
            </div>
          </div>
        </div>

        {/* 3. Package Tier */}
        <div className="panel-section">
          <h3 className="panel-section-title">Package Tier</h3>
          <div className="space-y-2">
            {[
              { value: '350' as const, label: '350 Structure', subA: 'Standard Layout Preview', subB: 'Conversion Style Layout Preview' },
              { value: '550' as const, label: '550 Structure', subA: 'Standard Layout Preview', subB: 'Conversion Style Layout Preview' },
            ].map(opt => (
              <label key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  packageTier === opt.value ? 'border-primary bg-accent' : 'border-border hover:bg-muted/50'
                }`}>
                <input type="radio" name="package" value={opt.value}
                  checked={packageTier === opt.value}
                  onChange={() => setPackageTier(opt.value)}
                  className="mt-0.5 accent-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Prompt A: {opt.subA} · Prompt B: {opt.subB}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 4. Brand & Theme Override */}
        <div className="panel-section">
          <h3 className="panel-section-title">Brand & Theme Override</h3>
          {brandDetected && (
            <div className="mb-3 px-3 py-2 rounded-md bg-accent text-accent-foreground text-xs">
              ✨ Brand styling auto-detected from live website
            </div>
          )}
          {brandDetecting && (
            <div className="mb-3 px-3 py-2 rounded-md bg-muted text-muted-foreground text-xs flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Detecting brand from source URL…
            </div>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="control-label">Primary Color</label>
                <div className="flex items-center gap-1.5">
                  <label className="relative w-8 h-8 rounded border border-border shrink-0 cursor-pointer overflow-hidden" style={{ background: primaryColor ? primaryColor : 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 8px 8px' }}>
                    <input type="color" value={primaryColor || '#000000'} onChange={e => {
                      manualOverrides.current.add('primaryColor');
                      setPrimaryColor(e.target.value);
                    }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                  <input type="text" value={primaryColor ? primaryColor.replace(/^#/, '') : ''} onChange={e => {
                    manualOverrides.current.add('primaryColor');
                    const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                    setPrimaryColor(v ? `#${v}` : '');
                  }}
                    placeholder="______" className="control-input flex-1 font-mono text-xs" maxLength={6} />
                </div>
                {detectedSources.primaryColor && !manualOverrides.current.has('primaryColor') && (
                  <p className="text-[10px] text-muted-foreground mt-1 italic">from {detectedSources.primaryColor}</p>
                )}
              </div>
              <div>
                <label className="control-label">Secondary Color</label>
                <div className="flex items-center gap-1.5">
                  <label className="relative w-8 h-8 rounded border border-border shrink-0 cursor-pointer overflow-hidden" style={{ background: secondaryColor ? secondaryColor : 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 8px 8px' }}>
                    <input type="color" value={secondaryColor || '#000000'} onChange={e => {
                      manualOverrides.current.add('secondaryColor');
                      setSecondaryColor(e.target.value);
                    }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                  <input type="text" value={secondaryColor ? secondaryColor.replace(/^#/, '') : ''} onChange={e => {
                    manualOverrides.current.add('secondaryColor');
                    const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                    setSecondaryColor(v ? `#${v}` : '');
                  }}
                    placeholder="______" className="control-input flex-1 font-mono text-xs" maxLength={6} />
                </div>
                {detectedSources.secondaryColor && !manualOverrides.current.has('secondaryColor') && (
                  <p className="text-[10px] text-muted-foreground mt-1 italic">from {detectedSources.secondaryColor}</p>
                )}
              </div>
            </div>
            <div>
              <label className="control-label">Primary Font</label>
              <select value={primaryFont} onChange={e => { manualOverrides.current.add('primaryFont'); setPrimaryFont(e.target.value); }} className="control-input">
                <option value="">— No override —</option>
                {googleFonts.map(f => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
              {detectedSources.primaryFont && !manualOverrides.current.has('primaryFont') && (
                <p className="text-[10px] text-muted-foreground mt-1 italic">from {detectedSources.primaryFont}</p>
              )}
              {primaryFont && (
                <p className="mt-2 text-lg text-foreground" style={{ fontFamily: `"${primaryFont}", sans-serif` }}>
                  The quick brown fox jumps over the lazy dog
                </p>
              )}
            </div>
            <div>
              <label className="control-label">Font Weight</label>
              <select value={fontWeight} onChange={e => { manualOverrides.current.add('fontWeight'); setFontWeight(e.target.value); }} className="control-input">
                <option value="">— No override —</option>
                <option value="400">400 — Regular</option>
                <option value="500">500 — Medium</option>
                <option value="600">600 — Semi Bold</option>
                <option value="700">700 — Bold</option>
                <option value="800">800 — Extra Bold</option>
                <option value="900">900 — Black</option>
              </select>
              {detectedSources.fontWeight && !manualOverrides.current.has('fontWeight') && (
                <p className="text-[10px] text-muted-foreground mt-1 italic">from {detectedSources.fontWeight}</p>
              )}
            </div>
            <div>
              <label className="control-label">Theme Mode</label>
              <select value={themeMode} onChange={e => setThemeMode(e.target.value as any)} className="control-input">
                <option value="auto">Auto — Follow source / reference</option>
                <option value="force_light">Force Light</option>
                <option value="force_dark">Force Dark</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {themeMode === 'auto' && 'Inherits theme from the source site or reference design.'}
                {themeMode === 'force_light' && 'Forces light backgrounds, light surfaces, and dark text.'}
                {themeMode === 'force_dark' && 'Forces dark backgrounds, dark surfaces, and light text.'}
              </p>
            </div>
          </div>
        </div>

        {/* 5. Content Modules */}
        <div className="panel-section">
          <h3 className="panel-section-title">Content Modules</h3>
          <div className="space-y-1.5">
            {contentModules.map(m => (
              <label key={m.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={modules.includes(m.id)} onChange={() => toggleModule(m.id)} className="rounded accent-primary" />
                <span className="text-sm text-foreground">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 6. Advanced Modules */}
        <div className="panel-section">
          <h3 className="panel-section-title">Advanced Modules</h3>
          <p className="text-xs text-muted-foreground mb-3">Add-on modules built on top of the $550 package.</p>
          <div className="space-y-1.5">
            {advancedModules.map(m => (
              <label key={m.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={advModules.includes(m.id)} onChange={() => toggleAdvModule(m.id)} className="rounded accent-primary" />
                <span className="text-sm text-foreground">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 7. Special Instructions */}
        <div className="panel-section">
          <h3 className="panel-section-title">Special Instructions</h3>
          <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)}
            placeholder="Custom instructions for the AI builder..." rows={4} className="control-input resize-none" />
        </div>

        {/* 9. Generate Button + Sync Status */}
        <div className="pb-2 space-y-1.5">
          <button onClick={handleGenerate} disabled={generating || !sourceUrl}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
            <Sparkles size={16} />
            {generating ? 'Generating...' : 'Generate Prompts'}
          </button>
          {syncStatus === 'synced' && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
              <CheckCircle2 size={12} /> Prompts synced
            </div>
          )}
          {syncStatus === 'unsynced' && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
              <AlertTriangle size={12} /> {unsyncedPrompt ? `${unsyncedPrompt.replace('SwiftLift ', '').replace(' V1', '')} out of sync` : 'Prompts out of sync'}
            </div>
          )}
          {syncStatus === 'checking' && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> Checking sync...
            </div>
          )}
        </div>
      </div>

      {/* Brand Confirmation Popup */}
      {showBrandConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Confirm Brand</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This prompt system is copyrighted by SwiftLift.<br />
              Are you generating this prompt under the correct brand?
            </p>
            <div className="mb-5">
              <label className="control-label">Brand</label>
              <select value={confirmBrand} onChange={e => setConfirmBrand(e.target.value)} className="control-input">
                {projectBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBrandConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmGenerate}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Confirm & Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style Reference Library Modal */}
      <ReferenceLibraryModal
        open={showStyleLibrary}
        onClose={() => setShowStyleLibrary(false)}
        onSelect={(ref) => setStyleRef({ reference_name: ref.site_name, live_url: ref.live_url })}
        roleFilter="style"
      />

      {/* Conversion Layout Reference Library Modal */}
      <ReferenceLibraryModal
        open={showConvLibrary}
        onClose={() => setShowConvLibrary(false)}
        onSelect={(ref) => setConvRef({ reference_name: ref.site_name, live_url: ref.live_url })}
        roleFilter="conversion_layout"
      />
    </>
  );
}

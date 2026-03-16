import { useState, useEffect } from 'react';
import { googleFonts, contentModules, advancedModules } from '@/lib/mockData';
import { saveProject } from '@/lib/store';
import type { SavedProject } from '@/lib/mockData';
import ReferenceLibraryModal from './ReferenceLibraryModal';
import { LayoutGrid, Sparkles, X } from 'lucide-react';
import type { DemoSite } from '@/lib/demoSiteStore';
import { supabase } from '@/integrations/supabase/client';

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

function simulateBrandDetection(url: string): { primary: string; secondary: string; font: string } {
  if (!url) return { primary: '', secondary: '', font: '' };
  const lower = url.toLowerCase();
  if (lower.includes('dental') || lower.includes('clinic')) return { primary: '#2B6CB0', secondary: '#38A169', font: 'DM Sans' };
  if (lower.includes('construct') || lower.includes('build')) return { primary: '#DD6B20', secondary: '#1A202C', font: 'Montserrat' };
  if (lower.includes('real') || lower.includes('estate') || lower.includes('property')) return { primary: '#2C5282', secondary: '#D69E2E', font: 'Playfair Display' };
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('cafe')) return { primary: '#C53030', secondary: '#2D3748', font: 'Lora' };
  if (lower.includes('luxury') || lower.includes('premium')) return { primary: '#1A202C', secondary: '#B7791F', font: 'Cormorant Garamond' };
  const hash = url.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return { primary: `hsl(${hue}, 65%, 45%)`, secondary: `hsl(${(hue + 120) % 360}, 55%, 40%)`, font: googleFonts[hash % googleFonts.length] };
}

// Adapter: DemoSite fields used by the modal selection
interface RefSelection {
  reference_name: string;
  live_url: string;
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
  const [fontWeight, setFontWeight] = useState('700');
  const [themeMode, setThemeMode] = useState<'auto' | 'force_light' | 'force_dark'>('auto');
  const [brandDetected, setBrandDetected] = useState(false);
  const [modules, setModules] = useState<string[]>([]);
  const [advModules, setAdvModules] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showBrandConfirm, setShowBrandConfirm] = useState(false);
  const [confirmBrand, setConfirmBrand] = useState('SwiftLift');

  const toggleModule = (id: string) => setModules(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAdvModule = (id: string) => setAdvModules(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSourceUrlChange = (url: string) => {
    setSourceUrl(url);
    if (url.length > 5 && !brandDetected) {
      const detected = simulateBrandDetection(url);
      if (detected.primary) setPrimaryColor(detected.primary);
      if (detected.secondary) setSecondaryColor(detected.secondary);
      if (detected.font) setPrimaryFont(detected.font);
      setBrandDetected(true);
    }
    if (!url) setBrandDetected(false);
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
      const { data, error } = await supabase.functions.invoke('generate-final-prompt', {
        body: {
          sourceUrl,
          referenceUrl: resolvedStyleRef,
          conversionLayoutUrl: resolvedConvRef,
          businessType: '',
          userNotes: specialInstructions || '',
          packageTier,
          themeMode,
          primaryColor,
          secondaryColor,
          primaryFont,
          fontWeight,
          enabledModules: modules,
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
    setPrimaryFont(''); setFontWeight('700'); setThemeMode('auto');
    setSpecialInstructions(''); setBrandDetected(false);
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
              <input type="text" value={sourceUrl} onChange={e => handleSourceUrlChange(e.target.value)}
                placeholder="https://example.com" className="control-input" />
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
              <div className="flex gap-2">
                <div className="control-input flex-1 bg-muted/50 flex items-center justify-between min-h-[36px]">
                  {styleRef ? (
                    <>
                      <span className="text-sm truncate">{styleRef.reference_name}</span>
                      <button onClick={() => setStyleRef(null)} className="ml-1 p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">Select style reference...</span>
                  )}
                </div>
                <button onClick={() => setShowStyleLibrary(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors whitespace-nowrap">
                  <LayoutGrid size={14} /> Demo Sites
                </button>
              </div>
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
              <div className="flex gap-2">
                <div className="control-input flex-1 bg-muted/50 flex items-center justify-between min-h-[36px]">
                  {convRef ? (
                    <>
                      <span className="text-sm truncate">{convRef.reference_name}</span>
                      <button onClick={() => setConvRef(null)} className="ml-1 p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">Select conversion layout...</span>
                  )}
                </div>
                <button onClick={() => setShowConvLibrary(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors whitespace-nowrap">
                  <LayoutGrid size={14} /> Demo Sites
                </button>
              </div>
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
              ✨ Colors and font auto-detected from source URL
            </div>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="control-label">Primary Color</label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={primaryColor || '#000000'} onChange={e => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer" />
                  <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    placeholder="#______" className="control-input flex-1 font-mono text-xs" />
                </div>
              </div>
              <div>
                <label className="control-label">Secondary Color</label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={secondaryColor || '#000000'} onChange={e => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer" />
                  <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                    placeholder="#______" className="control-input flex-1 font-mono text-xs" />
                </div>
              </div>
            </div>
            <div>
              <label className="control-label">Primary Font</label>
              <select value={primaryFont} onChange={e => setPrimaryFont(e.target.value)} className="control-input">
                <option value="">Use reference default</option>
                {googleFonts.map(f => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
              {primaryFont && (
                <p className="mt-2 text-lg text-foreground" style={{ fontFamily: `"${primaryFont}", sans-serif` }}>
                  The quick brown fox jumps over the lazy dog
                </p>
              )}
            </div>
            <div>
              <label className="control-label">Font Weight</label>
              <select value={fontWeight} onChange={e => setFontWeight(e.target.value)} className="control-input">
                <option value="600">600 — Semi Bold</option>
                <option value="700">700 — Bold</option>
                <option value="800">800 — Extra Bold</option>
                <option value="900">900 — Black</option>
              </select>
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

        {/* 9. Generate Button */}
        <div className="pb-2">
          <button onClick={handleGenerate} disabled={generating || !sourceUrl}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
            <Sparkles size={16} />
            {generating ? 'Generating...' : 'Generate Prompts'}
          </button>
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

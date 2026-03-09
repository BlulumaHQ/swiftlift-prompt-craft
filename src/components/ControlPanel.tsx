import { useState } from 'react';
import { googleFonts, contentModules } from '@/lib/mockData';
import { compilePrompts, getProjectName } from '@/lib/promptCompiler';
import { saveProject } from '@/lib/store';
import type { SavedProject } from '@/lib/mockData';
import ReferenceLibraryModal from './ReferenceLibraryModal';
import { Library, Sparkles, Save, Trash2, FilePlus } from 'lucide-react';
import type { ReferenceLayout } from '@/lib/mockData';

interface Props {
  onPromptsGenerated: (promptA: string, promptB: string, tier: '350' | '550') => void;
  onClear: () => void;
}

// Simulated brand detection from Source URL
function simulateBrandDetection(url: string): { primary: string; secondary: string; font: string } {
  if (!url) return { primary: '#2563eb', secondary: '#10b981', font: '' };
  
  // Simulate different detected brands based on URL keywords
  const lower = url.toLowerCase();
  if (lower.includes('dental') || lower.includes('clinic')) {
    return { primary: '#2B6CB0', secondary: '#38A169', font: 'DM Sans' };
  }
  if (lower.includes('construct') || lower.includes('build')) {
    return { primary: '#DD6B20', secondary: '#1A202C', font: 'Montserrat' };
  }
  if (lower.includes('real') || lower.includes('estate') || lower.includes('property')) {
    return { primary: '#2C5282', secondary: '#D69E2E', font: 'Playfair Display' };
  }
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('cafe')) {
    return { primary: '#C53030', secondary: '#2D3748', font: 'Lora' };
  }
  if (lower.includes('luxury') || lower.includes('premium')) {
    return { primary: '#1A202C', secondary: '#B7791F', font: 'Cormorant Garamond' };
  }
  // Default - analyze domain name hash for variety
  const hash = url.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return {
    primary: `hsl(${hue}, 65%, 45%)`,
    secondary: `hsl(${(hue + 120) % 360}, 55%, 40%)`,
    font: googleFonts[hash % googleFonts.length]
  };
}

export default function ControlPanel({ onPromptsGenerated, onClear }: Props) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [referenceLayout, setReferenceLayout] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [packageTier, setPackageTier] = useState<'350' | '550'>('350');
  const [modules, setModules] = useState<string[]>([]);
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');
  const [primaryFont, setPrimaryFont] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [brandDetected, setBrandDetected] = useState(false);

  const toggleModule = (id: string) => {
    setModules(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Auto-detect brand when Source URL changes
  const handleSourceUrlChange = (url: string) => {
    setSourceUrl(url);
    if (url.length > 5 && !brandDetected) {
      const detected = simulateBrandDetection(url);
      setPrimaryColor(detected.primary);
      setSecondaryColor(detected.secondary);
      if (detected.font) setPrimaryFont(detected.font);
      setBrandDetected(true);
    }
    if (!url) setBrandDetected(false);
  };

  const handleGenerate = () => {
    setGenerating(true);
    // Simulate automated pipeline: scrape → build content DB → compile
    setTimeout(() => {
      const { promptA, promptB } = compilePrompts({
        sourceUrl, referenceLayout, referenceUrl, packageTier,
        modules, primaryColor, secondaryColor, primaryFont, specialInstructions,
      });
      onPromptsGenerated(promptA, promptB, packageTier);
      setGenerating(false);
    }, 1200);
  };

  const handleSave = () => {
    const { promptA, promptB } = compilePrompts({
      sourceUrl, referenceLayout, referenceUrl, packageTier,
      modules, primaryColor, secondaryColor, primaryFont, specialInstructions,
    });
    const project: SavedProject = {
      id: crypto.randomUUID(),
      name: getProjectName(sourceUrl),
      sourceUrl, referenceLayout, referenceUrl, packageTier,
      modules, addons: [], primaryColor, secondaryColor, primaryFont,
      specialInstructions, promptA, promptB,
      dateCreated: new Date().toISOString().slice(0, 10),
    };
    saveProject(project);
  };

  const handleClear = () => {
    setSourceUrl(''); setReferenceLayout(''); setReferenceUrl('');
    setPackageTier('350'); setModules([]);
    setPrimaryColor('#2563eb'); setSecondaryColor('#10b981');
    setPrimaryFont(''); setSpecialInstructions('');
    setBrandDetected(false);
    onClear();
  };

  const handleNewProject = () => {
    handleSave();
    handleClear();
  };

  const handleSelectLayout = (layout: ReferenceLayout) => {
    setReferenceLayout(layout.name);
  };

  return (
    <>
      <div className="space-y-5 overflow-y-auto pr-1">
        {/* Source URL */}
        <div className="panel-section">
          <h3 className="panel-section-title">Source</h3>
          <div className="space-y-3">
            <div>
              <label className="control-label">Source URL</label>
              <input type="text" value={sourceUrl} onChange={e => handleSourceUrlChange(e.target.value)}
                placeholder="https://example.com" className="control-input" />
            </div>
          </div>
        </div>

        {/* Reference */}
        <div className="panel-section">
          <h3 className="panel-section-title">Reference</h3>
          <div className="space-y-3">
            <div>
              <label className="control-label">Reference Layout</label>
              <div className="flex gap-2">
                <input type="text" value={referenceLayout} readOnly
                  placeholder="Select from library..." className="control-input flex-1 bg-muted/50" />
                <button onClick={() => setShowLibrary(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors whitespace-nowrap">
                  <Library size={14} /> Library
                </button>
              </div>
            </div>
            <div>
              <label className="control-label">Reference URL <span className="text-muted-foreground font-normal">(optional — overrides library)</span></label>
              <input type="text" value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)}
                placeholder="https://reference-site.com" className="control-input" />
            </div>
          </div>
        </div>

        {/* Package Tier */}
        <div className="panel-section">
          <h3 className="panel-section-title">Package Tier</h3>
          <div className="space-y-2">
            {[
              { value: '350' as const, label: '350', sub: 'Standard $350 · Premium $475' },
              { value: '550' as const, label: '550', sub: 'Standard $550 · Premium $750' },
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
                  <p className="text-xs text-muted-foreground">{opt.sub}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Modules */}
        <div className="panel-section">
          <h3 className="panel-section-title">Modules</h3>
          <div className="space-y-1.5">
            {contentModules.map(m => (
              <label key={m.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={modules.includes(m.id)}
                  onChange={() => toggleModule(m.id)}
                  className="rounded accent-primary" />
                <span className="text-sm text-foreground">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Brand Override */}
        <div className="panel-section">
          <h3 className="panel-section-title">Brand Override</h3>
          {brandDetected && (
            <div className="mb-3 px-3 py-2 rounded-md bg-accent text-accent-foreground text-xs">
              ✨ Colors and font auto-detected from source URL
            </div>
          )}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="control-label">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer" />
                  <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="control-input flex-1 font-mono text-xs" />
                </div>
              </div>
              <div className="flex-1">
                <label className="control-label">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer" />
                  <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                    className="control-input flex-1 font-mono text-xs" />
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
                <p className="mt-2 text-lg text-foreground" style={{
                  fontFamily: `"${primaryFont}", sans-serif`,
                }}>
                  The quick brown fox jumps over the lazy dog
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="panel-section">
          <h3 className="panel-section-title">Special Instructions</h3>
          <textarea
            value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            placeholder="Strengthen hero messaging and keep services section detailed."
            rows={4}
            className="control-input resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pb-2">
          <button onClick={handleGenerate} disabled={generating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
            <Sparkles size={16} />
            {generating ? 'Generating...' : 'Generate Prompts'}
          </button>
          <div className="flex gap-2">
            <button onClick={handleClear}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Trash2 size={14} /> Clear
            </button>
            <button onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Save size={14} /> Save
            </button>
            <button onClick={handleNewProject}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <FilePlus size={14} /> New
            </button>
          </div>
        </div>
      </div>

      <ReferenceLibraryModal
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={handleSelectLayout}
      />
    </>
  );
}

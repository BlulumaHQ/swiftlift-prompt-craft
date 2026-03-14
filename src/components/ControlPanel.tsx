import { useState, useEffect } from 'react';
import { googleFonts, contentModules, advancedModules, industryOptions } from '@/lib/mockData';
import { compilePrompts, getProjectName } from '@/lib/promptCompiler';
import { saveProject } from '@/lib/store';
import type { SavedProject } from '@/lib/mockData';
import ReferenceLibraryModal from './ReferenceLibraryModal';
import { Library, Sparkles } from 'lucide-react';
import type { ReferenceLayout } from '@/lib/mockData';

interface Props {
  onPromptsGenerated: (promptA: string, promptB: string, tier: '350' | '550') => void;
  onClear: () => void;
  clearSignal: number;
  saveSignal: number;
  newSignal: number;
}

function simulateBrandDetection(url: string): { primary: string; secondary: string; accent: string; font: string } {
  if (!url) return { primary: '#2563eb', secondary: '#10b981', accent: '#f59e0b', font: '' };
  const lower = url.toLowerCase();
  if (lower.includes('dental') || lower.includes('clinic')) return { primary: '#2B6CB0', secondary: '#38A169', accent: '#E53E3E', font: 'DM Sans' };
  if (lower.includes('construct') || lower.includes('build')) return { primary: '#DD6B20', secondary: '#1A202C', accent: '#ECC94B', font: 'Montserrat' };
  if (lower.includes('real') || lower.includes('estate') || lower.includes('property')) return { primary: '#2C5282', secondary: '#D69E2E', accent: '#E53E3E', font: 'Playfair Display' };
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('cafe')) return { primary: '#C53030', secondary: '#2D3748', accent: '#D69E2E', font: 'Lora' };
  if (lower.includes('luxury') || lower.includes('premium')) return { primary: '#1A202C', secondary: '#B7791F', accent: '#E2E8F0', font: 'Cormorant Garamond' };
  const hash = url.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return { primary: `hsl(${hue}, 65%, 45%)`, secondary: `hsl(${(hue + 120) % 360}, 55%, 40%)`, accent: `hsl(${(hue + 240) % 360}, 50%, 50%)`, font: googleFonts[hash % googleFonts.length] };
}

export default function ControlPanel({ onPromptsGenerated, onClear, clearSignal, saveSignal, newSignal }: Props) {
  // Project Setup
  const [producedBy, setProducedBy] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [industry, setIndustry] = useState('');
  const [region, setRegion] = useState('');
  const [language, setLanguage] = useState('English');

  // Reference Design
  const [referenceLayout, setReferenceLayout] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);

  // Package Tier
  const [packageTier, setPackageTier] = useState<'350' | '550'>('550');

  // Brand Override
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [primaryFont, setPrimaryFont] = useState('');
  const [fontWeight, setFontWeight] = useState('400');
  const [brandDetected, setBrandDetected] = useState(false);

  // Content Modules
  const [modules, setModules] = useState<string[]>([]);

  // Advanced Modules
  const [advModules, setAdvModules] = useState<string[]>([]);

  // Special Instructions
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [generating, setGenerating] = useState(false);

  const toggleModule = (id: string) => {
    setModules(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAdvModule = (id: string) => {
    setAdvModules(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSourceUrlChange = (url: string) => {
    setSourceUrl(url);
    if (url.length > 5 && !brandDetected) {
      const detected = simulateBrandDetection(url);
      setPrimaryColor(detected.primary);
      setSecondaryColor(detected.secondary);
      setAccentColor(detected.accent);
      if (detected.font) setPrimaryFont(detected.font);
      setBrandDetected(true);
    }
    if (!url) setBrandDetected(false);
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const { promptA, promptB } = compilePrompts({
        sourceUrl, referenceLayout, referenceUrl, packageTier,
        modules: [...modules, ...advModules], primaryColor, secondaryColor, primaryFont, specialInstructions,
      });
      onPromptsGenerated(promptA, promptB, packageTier);
      setGenerating(false);
    }, 1200);
  };

  const doSave = () => {
    const { promptA, promptB } = compilePrompts({
      sourceUrl, referenceLayout, referenceUrl, packageTier,
      modules: [...modules, ...advModules], primaryColor, secondaryColor, primaryFont, specialInstructions,
    });
    const project: SavedProject = {
      id: crypto.randomUUID(),
      name: projectName || getProjectName(sourceUrl),
      sourceUrl, referenceLayout, referenceUrl, packageTier,
      modules, addons: [], primaryColor, secondaryColor, primaryFont,
      specialInstructions, promptA, promptB,
      dateCreated: new Date().toISOString().slice(0, 10),
      producedBy, projectName, clientName, industry, region, language,
      accentColor, fontWeight, advancedModules: advModules,
    };
    saveProject(project);
  };

  const doClear = () => {
    setProducedBy(''); setSourceUrl(''); setProjectName(''); setClientName('');
    setIndustry(''); setRegion(''); setLanguage('English');
    setReferenceLayout(''); setReferenceUrl('');
    setPackageTier('550'); setModules([]); setAdvModules([]);
    setPrimaryColor('#2563eb'); setSecondaryColor('#10b981'); setAccentColor('#f59e0b');
    setPrimaryFont(''); setFontWeight('400');
    setSpecialInstructions(''); setBrandDetected(false);
    onClear();
  };

  useEffect(() => { if (clearSignal > 0) doClear(); }, [clearSignal]);
  useEffect(() => { if (saveSignal > 0) doSave(); }, [saveSignal]);
  useEffect(() => { if (newSignal > 0) { doSave(); doClear(); } }, [newSignal]);

  const handleSelectLayout = (layout: ReferenceLayout) => {
    setReferenceLayout(layout.name);
  };

  return (
    <>
      <div className="space-y-5 overflow-y-auto pr-1">
        {/* 1. Project Setup */}
        <div className="panel-section">
          <h3 className="panel-section-title">Project Setup</h3>
          <div className="space-y-3">
            <div>
              <label className="control-label">Produced By</label>
              <input type="text" value={producedBy} onChange={e => setProducedBy(e.target.value)}
                placeholder="Your name" className="control-input" />
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
            <div>
              <label className="control-label">Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} className="control-input">
                <option value="">Select industry...</option>
                {industryOptions.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="control-label">Region / Market</label>
                <input type="text" value={region} onChange={e => setRegion(e.target.value)}
                  placeholder="e.g., Toronto, CA" className="control-input" />
              </div>
              <div className="flex-1">
                <label className="control-label">Language</label>
                <input type="text" value={language} onChange={e => setLanguage(e.target.value)}
                  placeholder="English" className="control-input" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Reference Design */}
        <div className="panel-section">
          <h3 className="panel-section-title">Reference Design</h3>
          <div className="space-y-3">
            <div>
              <label className="control-label">Select Reference Layout</label>
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
              <label className="control-label">Reference URL <span className="text-muted-foreground font-normal">(overrides library selection)</span></label>
              <input type="text" value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)}
                placeholder="https://reference-site.com" className="control-input" />
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

        {/* 4. Brand Override */}
        <div className="panel-section">
          <h3 className="panel-section-title">Brand Override</h3>
          {brandDetected && (
            <div className="mb-3 px-3 py-2 rounded-md bg-accent text-accent-foreground text-xs">
              ✨ Colors and font auto-detected from source URL
            </div>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="control-label">Primary</label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer" />
                  <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="control-input flex-1 font-mono text-xs" />
                </div>
              </div>
              <div>
                <label className="control-label">Secondary</label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer" />
                  <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                    className="control-input flex-1 font-mono text-xs" />
                </div>
              </div>
              <div>
                <label className="control-label">Accent</label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer" />
                  <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)}
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
                <p className="mt-2 text-lg text-foreground" style={{ fontFamily: `"${primaryFont}", sans-serif` }}>
                  The quick brown fox jumps over the lazy dog
                </p>
              )}
            </div>
            <div>
              <label className="control-label">Font Weight</label>
              <select value={fontWeight} onChange={e => setFontWeight(e.target.value)} className="control-input">
                <option value="300">300 — Light</option>
                <option value="400">400 — Regular</option>
                <option value="500">500 — Medium</option>
                <option value="600">600 — Semi Bold</option>
                <option value="700">700 — Bold</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5. Content Modules */}
        <div className="panel-section">
          <h3 className="panel-section-title">Content Modules</h3>
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

        {/* 6. Advanced Modules */}
        <div className="panel-section">
          <h3 className="panel-section-title">Advanced Modules</h3>
          <p className="text-xs text-muted-foreground mb-3">Add-on modules built on top of the $550 package.</p>
          <div className="space-y-1.5">
            {advancedModules.map(m => (
              <label key={m.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={advModules.includes(m.id)}
                  onChange={() => toggleAdvModule(m.id)}
                  className="rounded accent-primary" />
                <span className="text-sm text-foreground">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 7. Special Instructions */}
        <div className="panel-section">
          <h3 className="panel-section-title">Special Instructions</h3>
          <textarea
            value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            placeholder="Custom instructions for the AI builder..."
            rows={4}
            className="control-input resize-none"
          />
        </div>

        {/* 8. Generate Button */}
        <div className="pb-2">
          <button onClick={handleGenerate} disabled={generating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
            <Sparkles size={16} />
            {generating ? 'Generating...' : 'Generate Prompts'}
          </button>
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

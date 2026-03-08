import { useState } from 'react';
import { googleFonts, contentModules, premiumAddons, ReferenceLayout } from '@/lib/mockData';
import { compilePrompts, getProjectName } from '@/lib/promptCompiler';
import { saveProject } from '@/lib/store';
import type { SavedProject } from '@/lib/mockData';
import ReferenceLibraryModal from './ReferenceLibraryModal';
import { Library, Sparkles, Save, Trash2, FilePlus } from 'lucide-react';

interface Props {
  onPromptsGenerated: (promptA: string, promptB: string, tier: '350' | '550') => void;
  onClear: () => void;
}

export default function ControlPanel({ onPromptsGenerated, onClear }: Props) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [referenceLayout, setReferenceLayout] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [packageTier, setPackageTier] = useState<'350' | '550'>('350');
  const [modules, setModules] = useState<string[]>([]);
  const [addons, setAddons] = useState<string[]>([]);
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');
  const [primaryFont, setPrimaryFont] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [generating, setGenerating] = useState(false);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const { promptA, promptB } = compilePrompts({
        sourceUrl, referenceLayout, referenceUrl, packageTier,
        modules, addons, primaryColor, secondaryColor, primaryFont, specialInstructions,
      });
      onPromptsGenerated(promptA, promptB, packageTier);
      setGenerating(false);
    }, 800);
  };

  const handleSave = () => {
    const { promptA, promptB } = compilePrompts({
      sourceUrl, referenceLayout, referenceUrl, packageTier,
      modules, addons, primaryColor, secondaryColor, primaryFont, specialInstructions,
    });
    const project: SavedProject = {
      id: crypto.randomUUID(),
      name: getProjectName(sourceUrl),
      sourceUrl, referenceLayout, referenceUrl, packageTier,
      modules, addons, primaryColor, secondaryColor, primaryFont,
      specialInstructions, promptA, promptB,
      dateCreated: new Date().toISOString().slice(0, 10),
    };
    saveProject(project);
  };

  const handleClear = () => {
    setSourceUrl(''); setReferenceLayout(''); setReferenceUrl('');
    setPackageTier('350'); setModules([]); setAddons([]);
    setPrimaryColor('#2563eb'); setSecondaryColor('#10b981');
    setPrimaryFont(''); setSpecialInstructions('');
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
        {/* Project Setup */}
        <div className="panel-section">
          <h3 className="panel-section-title">Project Setup</h3>
          <div className="space-y-3">
            <div>
              <label className="control-label">Source URL</label>
              <input type="text" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://example.com" className="control-input" />
            </div>
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
              { value: '350' as const, label: '350 Structure', sub: 'Standard $350 · Premium $475' },
              { value: '550' as const, label: '550 Structure', sub: 'Standard $550 · Premium $750' },
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

        {/* Content Modules */}
        <div className="panel-section">
          <h3 className="panel-section-title">Content Modules</h3>
          <div className="space-y-1.5">
            {contentModules.map(m => (
              <label key={m.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={modules.includes(m.id)}
                  onChange={() => toggleItem(modules, setModules, m.id)}
                  className="rounded accent-primary" />
                <span className="text-sm text-foreground">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Premium Add-ons */}
        <div className="panel-section">
          <h3 className="panel-section-title">Premium Add-ons</h3>
          <div className="space-y-1.5">
            {premiumAddons.map(a => (
              <label key={a.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={addons.includes(a.id)}
                  onChange={() => toggleItem(addons, setAddons, a.id)}
                  className="rounded accent-primary" />
                <span className="text-sm text-foreground">{a.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Brand Override */}
        <div className="panel-section">
          <h3 className="panel-section-title">Brand Override</h3>
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
            <button onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Save size={14} /> Save
            </button>
            <button onClick={handleClear}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Trash2 size={14} /> Clear
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

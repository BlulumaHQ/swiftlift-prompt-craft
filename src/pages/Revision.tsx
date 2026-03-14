import { useState } from 'react';
import NavHeader from '@/components/NavHeader';
import PromptOutputPanel from '@/components/PromptOutputPanel';
import { ChevronDown, ChevronRight } from 'lucide-react';

const brands = ['SwiftLift', 'Bluluma', 'Sonykun', 'SwiftSite'] as const;

const layoutFixes = [
  'Reduce hero height',
  'Improve section spacing',
  'Align columns',
  'Improve visual hierarchy',
  'Reduce oversized elements',
];

const headerFooterFixes = [
  'Fix header alignment',
  'Fix footer column spacing',
  'Make footer links scroll to top',
  'Prevent sticky button overlap',
];

const mobileFixes = [
  'Fix mobile spacing',
  'Fix sticky CTA overlap',
  'Improve mobile menu behavior',
  'Fix anchor links on mobile',
];

const contentFixes = [
  'Add testimonial section',
  'Add trust badges',
  'Add FAQ section',
  'Add gallery',
  'Add process section',
  'Add CTA block',
];

const technicalFixes = [
  'Fix meta descriptions',
  'Fix public page routing',
  'Fix redirect / 404 behavior',
  'Fix internal page links',
  'Fix form issues',
];

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel-section">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full"
      >
        <h3 className="panel-section-title mb-0">{title}</h3>
        {open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function CheckboxGroup({ items, selected, onToggle }: { items: string[]; selected: Set<string>; onToggle: (item: string) => void }) {
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <label key={item} className={`flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors ${selected.has(item) ? 'bg-accent' : 'hover:bg-muted/50'}`}>
          <input
            type="checkbox"
            checked={selected.has(item)}
            onChange={() => onToggle(item)}
            className="h-3.5 w-3.5 rounded border-input accent-primary"
          />
          <span className="text-sm text-foreground">{item}</span>
        </label>
      ))}
    </div>
  );
}

export default function Revision() {
  const [brand, setBrand] = useState('SwiftLift');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [revisionType, setRevisionType] = useState<'client' | 'designer' | 'quickfix'>('client');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removeCredit, setRemoveCredit] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [output, setOutput] = useState('');

  const toggle = (item: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  const handleGenerate = () => {
    const lines: string[] = [];
    lines.push('REVISION PROMPT');
    lines.push('');
    lines.push(`Brand: ${brand}`);
    if (websiteUrl) lines.push(`Website: ${websiteUrl}`);
    lines.push(`Revision Type: ${revisionType === 'client' ? 'Client Feedback' : revisionType === 'designer' ? 'Designer Adjustment' : 'Quick Fix'}`);
    lines.push('');

    const allSelected = Array.from(selected);
    if (allSelected.length > 0) {
      lines.push('SELECTED FIXES:');
      allSelected.forEach(fix => lines.push(`- ${fix}`));
      lines.push('');
    }

    if (removeCredit) {
      lines.push('BRAND CREDIT:');
      lines.push('- Remove web design credit from footer');
      lines.push('');
    }

    if (customInstructions.trim()) {
      lines.push('CUSTOM INSTRUCTIONS:');
      lines.push(customInstructions.trim());
      lines.push('');
    }

    lines.push('Apply all selected revisions to the current website build.');
    lines.push('Preserve all existing content and functionality unless explicitly modified above.');

    setOutput(lines.join('\n'));
  };

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Revision Prompt Builder" />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel */}
        <aside className="w-[340px] shrink-0 border-r border-border bg-card overflow-y-auto p-5 space-y-4">

          <CollapsibleSection title="Project Reference">
            <div className="space-y-3">
              <div>
                <label className="control-label">Project Brand</label>
                <select value={brand} onChange={e => setBrand(e.target.value)} className="control-input">
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="control-label">Website URL</label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={e => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="control-input"
                />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Revision Type">
            <div className="space-y-1.5">
              {([['client', 'Client Feedback'], ['designer', 'Designer Adjustment'], ['quickfix', 'Quick Fix']] as const).map(([val, label]) => (
                <label key={val} className={`flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors ${revisionType === val ? 'bg-accent' : 'hover:bg-muted/50'}`}>
                  <input
                    type="radio"
                    name="revisionType"
                    checked={revisionType === val}
                    onChange={() => setRevisionType(val)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Layout Fixes">
            <CheckboxGroup items={layoutFixes} selected={selected} onToggle={toggle} />
          </CollapsibleSection>

          <CollapsibleSection title="Header / Footer Fixes">
            <CheckboxGroup items={headerFooterFixes} selected={selected} onToggle={toggle} />
          </CollapsibleSection>

          <CollapsibleSection title="Mobile Fixes">
            <CheckboxGroup items={mobileFixes} selected={selected} onToggle={toggle} />
          </CollapsibleSection>

          <CollapsibleSection title="Content / Section Fixes">
            <CheckboxGroup items={contentFixes} selected={selected} onToggle={toggle} />
          </CollapsibleSection>

          <CollapsibleSection title="Technical Fixes">
            <CheckboxGroup items={technicalFixes} selected={selected} onToggle={toggle} />
          </CollapsibleSection>

          <CollapsibleSection title="Brand Credit Control">
            <label className={`flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors ${removeCredit ? 'bg-accent' : 'hover:bg-muted/50'}`}>
              <input
                type="checkbox"
                checked={removeCredit}
                onChange={() => setRemoveCredit(!removeCredit)}
                className="h-3.5 w-3.5 rounded border-input accent-primary"
              />
              <span className="text-sm text-foreground">Remove Web Design credit</span>
            </label>
          </CollapsibleSection>

          <CollapsibleSection title="Custom Revision Instructions">
            <textarea
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder="Describe any additional revisions needed."
              rows={5}
              className="control-input resize-none text-sm"
            />
          </CollapsibleSection>

          <button
            onClick={handleGenerate}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Generate Revision Prompt
          </button>
        </aside>

        {/* Right Panel */}
        <main className="flex-1 flex flex-col p-5 overflow-y-auto">
          <PromptOutputPanel title="Generated Revision Prompt" content={output} />
        </main>
      </div>
    </div>
  );
}

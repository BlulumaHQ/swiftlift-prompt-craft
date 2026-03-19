import { useState, useCallback } from 'react';
import NavHeader from '@/components/NavHeader';
import PromptOutputPanel from '@/components/PromptOutputPanel';
import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const BRAND_OPTIONS = ['SwiftLift', 'Bluluma', 'Sonykun', 'SwiftSite'] as const;

const OVERRIDE_MODULES: Record<string, { label: string; prompt: string }> = {
  forceImageReplacement: {
    label: 'Force Image Replacement',
    prompt: `
--------------------------------------------------
OVERRIDE: FORCE IMAGE REPLACEMENT
--------------------------------------------------
- Replace ALL non-source images with source business images
- Prioritize real photos over stock
- Ignore conditional logic
- Every hero, section, and card image must use actual business photography
- Use {{DOMAIN}} as fallback image source if source images are insufficient
`,
  },
  forceHeaderSimplification: {
    label: 'Force Header Simplification',
    prompt: `
--------------------------------------------------
OVERRIDE: FORCE HEADER SIMPLIFICATION
--------------------------------------------------
- Reduce top-level navigation items
- Group pages aggressively into dropdowns
- Ensure no overflow or wrapping
- Prioritize clarity over completeness
- Maximum 5-6 top-level items
`,
  },
  forceConversionLayout: {
    label: 'Force Conversion Layout Adjustment',
    prompt: `
--------------------------------------------------
OVERRIDE: FORCE CONVERSION LAYOUT
--------------------------------------------------
- Reorganize page sections for conversion
- Move primary CTA higher in page flow
- Add trust signals earlier in scroll order
- Improve lead capture flow
- Ensure sticky CTA on mobile
`,
  },
  forceSectionRebuild: {
    label: 'Force Section Rebuild',
    prompt: `
--------------------------------------------------
OVERRIDE: FORCE SECTION REBUILD
--------------------------------------------------
- Rebuild weak or poorly structured sections
- Improve layout hierarchy and visual weight
- Maintain original content meaning
- Do not remove information, only restructure presentation
`,
  },
  removeWebDesignCredit: {
    label: 'Remove Web Design Credit',
    prompt: `
--------------------------------------------------
OVERRIDE: REMOVE WEB DESIGN CREDIT
--------------------------------------------------
- Remove "by Bluluma" line completely from footer
- Keep only:
  © 2026 {{BRAND_NAME}}. All rights reserved.
- Do not add any builder credit
- This overrides the COPYRIGHT RULE in the base prompt
`,
  },
};

const OVERRIDE_KEYS = Object.keys(OVERRIDE_MODULES);

const IMAGE_QA_BLOCK = `
--------------------------------------------------
IMAGE QA SYSTEM
--------------------------------------------------
Evaluate all images across the website.

IF:
- images are missing
- images are generic
- images are irrelevant

THEN:
- attempt to reuse extracted source images first
- DO NOT replace valid, relevant existing images
- if insufficient, fetch relevant images from {{DOMAIN}}
- prioritize real business images from the domain
- avoid generic stock images unless no alternative exists

ELSE:
- preserve existing images
`;

const DATA_AUTHORITY_BLOCK = `
--------------------------------------------------
DATA AUTHORITY RULE
--------------------------------------------------
Strict data priority order:
1. Extracted Source Data (highest priority)
2. DOMAIN fallback ({{DOMAIN}})
3. Generated content (last resort)

STRICT RULES:
- AI must NOT generate or infer missing data before checking DOMAIN
- AI must NOT hallucinate business details, services, or visuals
- DOMAIN must be used as secondary truth source before any generation
`;

const DOMAIN_VALIDATION_BLOCK = `
--------------------------------------------------
DOMAIN VALIDATION SAFETY
--------------------------------------------------
IF DOMAIN is unreachable, invalid, or empty:
- Skip DOMAIN fallback entirely
- Proceed using only extracted source data
- Allow generation ONLY as final fallback
- Do NOT halt the revision process
`;

function normalizeDomain(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel-section">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full">
        <h3 className="panel-section-title mb-0">{title}</h3>
        {open ? (
          <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

const QA_PROMPT_ID = '58bd2c0f-305d-4432-b13c-43e31e60e75f';

export default function Revision() {
  const isMobile = useIsMobile();
  const [brandName, setBrandName] = useState<string>('SwiftLift');
  const [domain, setDomain] = useState('');
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const [customInstructions, setCustomInstructions] = useState('');
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [mobileTab, setMobileTab] = useState<'controls' | 'output'>('controls');

  const toggleOverride = useCallback((key: string) => {
    setOverrides((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!domain.trim()) {
      toast.error('Website Domain is required');
      return;
    }

    setGenerating(true);
    if (isMobile) setMobileTab('output');

    try {
      const { data: promptRow, error } = await supabase
        .from('prompts')
        .select('content')
        .eq('id', QA_PROMPT_ID)
        .single();

      if (error || !promptRow) {
        throw new Error('Could not load QA Master Prompt from library');
      }

      const effectiveBrand = brandName;
      const normalizedDomain = normalizeDomain(domain);

      let compiled = promptRow.content
        .replace(/\{\{COMPANY_NAME\}\}/g, effectiveBrand)
        .replace(/\{\{BRAND_NAME\}\}/g, effectiveBrand)
        .replace(/\{\{DOMAIN\}\}/g, normalizedDomain || '(not provided)');

      compiled += IMAGE_QA_BLOCK.replace(/\{\{DOMAIN\}\}/g, normalizedDomain || '(not provided)');
      compiled += DATA_AUTHORITY_BLOCK.replace(/\{\{DOMAIN\}\}/g, normalizedDomain || '(not provided)');
      compiled += DOMAIN_VALIDATION_BLOCK;

      for (const key of OVERRIDE_KEYS) {
        if (overrides.has(key)) {
          let moduleText = OVERRIDE_MODULES[key].prompt;
          moduleText = moduleText
            .replace(/\{\{BRAND_NAME\}\}/g, effectiveBrand)
            .replace(/\{\{COMPANY_NAME\}\}/g, effectiveBrand)
            .replace(/\{\{DOMAIN\}\}/g, normalizedDomain || '(not provided)');
          compiled += moduleText;
        }
      }

      if (customInstructions.trim()) {
        compiled += `
--------------------------------------------------
CUSTOM REVISION INSTRUCTION (HIGHEST PRIORITY)
--------------------------------------------------
${customInstructions.trim()}

This instruction takes precedence over all other rules when a conflict exists.
`;
      }

      setOutput(compiled);
      toast.success('Revision prompt generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  }, [brandName, domain, overrides, customInstructions, isMobile]);

  const controlsPanel = (
    <div className={`${isMobile ? '' : 'w-[340px] shrink-0 border-r border-border'} bg-card overflow-y-auto p-5 space-y-4`}>
      <CollapsibleSection title="Brand & Data Source">
        <div className="space-y-3">
          <div>
            <label className="control-label">Brand Name <span className="text-destructive">*</span></label>
            <select value={brandName} onChange={(e) => setBrandName(e.target.value)} className="control-input">
              {BRAND_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="control-label">Website Domain <span className="text-destructive">*</span></label>
            <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
              onBlur={() => { if (domain.trim()) setDomain(normalizeDomain(domain)); }}
              placeholder="https://example.com" className="control-input" />
            <p className="text-xs text-muted-foreground mt-1">Used for image fallback and content reference if needed</p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Revision Engine">
        <div className="flex items-start gap-2.5 px-3 py-2 rounded-md bg-accent">
          <ShieldCheck size={16} className="text-primary mt-0.5 shrink-0" />
          <div>
            <span className="text-sm font-medium text-foreground">QA First Revision</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Always active — automatically audits and fixes structural, visual, branding, and layout issues without breaking correct sections.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Override Modules (Optional)">
        <div className="space-y-1.5">
          {OVERRIDE_KEYS.map((key) => (
            <label key={key}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                overrides.has(key) ? 'bg-accent' : 'hover:bg-muted/50'
              }`}>
              <input type="checkbox" checked={overrides.has(key)} onChange={() => toggleOverride(key)}
                className="h-3.5 w-3.5 rounded border-input accent-primary" />
              <span className="text-sm text-foreground">{OVERRIDE_MODULES[key].label}</span>
            </label>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Custom Revision Instruction">
        <textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="Add any specific revision instructions here. These take highest priority."
          rows={5} className="control-input resize-none text-sm" />
      </CollapsibleSection>

      <button onClick={handleGenerate} disabled={generating}
        className="w-full py-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
        {generating ? 'Generating…' : 'Generate Revision Prompt'}
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <NavHeader title="Revision Prompt Builder" />
        <div className="flex border-b border-border bg-card shrink-0">
          <button onClick={() => setMobileTab('controls')}
            className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${mobileTab === 'controls' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            Controls
          </button>
          <button onClick={() => setMobileTab('output')}
            className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${mobileTab === 'output' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            Output
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mobileTab === 'controls' ? controlsPanel : (
            <div className="p-4">
              <PromptOutputPanel title="Generated Revision Prompt" content={output} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Revision Prompt Builder" />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="w-[340px] shrink-0 border-r border-border bg-card overflow-y-auto p-5 space-y-4">
          {controlsPanel}
        </aside>
        <main className="flex-1 flex flex-col p-5 overflow-y-auto">
          <PromptOutputPanel title="Generated Revision Prompt" content={output} />
        </main>
      </div>
    </div>
  );
}

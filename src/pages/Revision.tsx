import { useState, useCallback } from 'react';
import NavHeader from '@/components/NavHeader';
import PromptOutputPanel from '@/components/PromptOutputPanel';
import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Brand options                                                     */
/* ------------------------------------------------------------------ */

const BRAND_OPTIONS = ['SwiftLift', 'Bluluma', 'Sonykun', 'SwiftSite'] as const;

/* ------------------------------------------------------------------ */
/*  Override module definitions                                       */
/* ------------------------------------------------------------------ */

const OVERRIDE_MODULES: Record<string, { label: string; prompt: string }> = {
  forceImageReplacement: {
    label: 'Force Image Replacement',
    prompt: `\n--------------------------------------------------\nOVERRIDE: FORCE IMAGE REPLACEMENT\n--------------------------------------------------\n- Replace ALL non-source images with source business images\n- Prioritize real photos over stock\n- Ignore conditional logic\n- Every hero, section, and card image must use actual business photography\n- Use {{DOMAIN}} as fallback image source if source images are insufficient\n`,
  },
  forceHeaderSimplification: {
    label: 'Force Header Simplification',
    prompt: `\n--------------------------------------------------\nOVERRIDE: FORCE HEADER SIMPLIFICATION\n--------------------------------------------------\n- Reduce top-level navigation items\n- Group pages aggressively into dropdowns\n- Ensure no overflow or wrapping\n- Prioritize clarity over completeness\n- Maximum 5-6 top-level items\n`,
  },
  forceConversionLayout: {
    label: 'Force Conversion Layout Adjustment',
    prompt: `\n--------------------------------------------------\nOVERRIDE: FORCE CONVERSION LAYOUT\n--------------------------------------------------\n- Reorganize page sections for conversion\n- Move primary CTA higher in page flow\n- Add trust signals earlier in scroll order\n- Improve lead capture flow\n- Ensure sticky CTA on mobile\n`,
  },
  forceSectionRebuild: {
    label: 'Force Section Rebuild',
    prompt: `\n--------------------------------------------------\nOVERRIDE: FORCE SECTION REBUILD\n--------------------------------------------------\n- Rebuild weak or poorly structured sections\n- Improve layout hierarchy and visual weight\n- Maintain original content meaning\n- Do not remove information, only restructure presentation\n`,
  },
  removeWebDesignCredit: {
    label: 'Remove Web Design Credit',
    prompt: `\n--------------------------------------------------\nOVERRIDE: REMOVE WEB DESIGN CREDIT\n--------------------------------------------------\n- Remove "by Bluluma" line completely from footer\n- Keep only:\n  © 2026 {{BRAND_NAME}}. All rights reserved.\n- Do not add any builder credit\n- This overrides the COPYRIGHT RULE in the base prompt\n`,
  },
};

const OVERRIDE_KEYS = Object.keys(OVERRIDE_MODULES);

/* ------------------------------------------------------------------ */
/*  Image QA & Data Authority blocks                                  */
/* ------------------------------------------------------------------ */

const IMAGE_QA_BLOCK = `\n--------------------------------------------------\nIMAGE QA SYSTEM\n--------------------------------------------------\nEvaluate all images across the website.\n\nIF:\n- images are missing\n- images are generic\n- images are irrelevant\n\nTHEN:\n- attempt to reuse extracted source images first\n- DO NOT replace valid, relevant existing images\n- if insufficient, fetch relevant images from {{DOMAIN}}\n- prioritize real business images from the domain\n- avoid generic stock images unless no alternative exists\n\nELSE:\n- preserve existing images\n`;

const DATA_AUTHORITY_BLOCK = `\n--------------------------------------------------\nDATA AUTHORITY RULE\n--------------------------------------------------\nStrict data priority order:\n1. Extracted Source Data (highest priority)\n2. DOMAIN fallback ({{DOMAIN}})\n3. Generated content (last resort)\n\nSTRICT RULES:\n- AI must NOT generate or infer missing data before checking DOMAIN\n- AI must NOT hallucinate business details, services, or visuals\n- DOMAIN must be used as secondary truth source before any generation\n`;

const DOMAIN_VALIDATION_BLOCK = `\n--------------------------------------------------\nDOMAIN VALIDATION SAFETY\n--------------------------------------------------\nIF DOMAIN is unreachable, invalid, or empty:\n- Skip DOMAIN fallback entirely\n- Proceed using only extracted source data\n- Allow generation ONLY as final fallback\n- Do NOT halt the revision process\n`;

/* ------------------------------------------------------------------ */
/*  Domain normalization                                              */
/* ------------------------------------------------------------------ */

function normalizeDomain(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/* ------------------------------------------------------------------ */
/*  Collapsible UI                                                    */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

const QA_PROMPT_ID = '58bd2c0f-305d-4432-b13c-43e31e60e75f';

export default function Revision() {
  // Required inputs
  const [brandName, setBrandName] = useState<string>('SwiftLift');
  const [domain, setDomain] = useState('');

  // Overrides
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const [customInstructions, setCustomInstructions] = useState('');

  // Output
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);

  const toggleOverride = useCallback((key: string) => {
    setOverrides((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  /* ---- Generate ---- */
  const handleGenerate = useCallback(async () => {
    if (!domain.trim()) {
      toast.error('Website Domain is required');
      return;
    }

    setGenerating(true);

    try {
      // 1. Fetch QA Master Prompt from Prompt Library
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

      // 2. Inject context into master prompt — remove any leftover {{COMPANY_NAME}} refs
      let compiled = promptRow.content
        .replace(/\{\{COMPANY_NAME\}\}/g, effectiveBrand)
        .replace(/\{\{BRAND_NAME\}\}/g, effectiveBrand)
        .replace(/\{\{DOMAIN\}\}/g, normalizedDomain || '(not provided)');

      // 3. Append Image QA System block
      compiled += IMAGE_QA_BLOCK.replace(/\{\{DOMAIN\}\}/g, normalizedDomain || '(not provided)');

      // 4. Append Data Authority block
      compiled += DATA_AUTHORITY_BLOCK.replace(/\{\{DOMAIN\}\}/g, normalizedDomain || '(not provided)');

      // 5. Append Domain Validation Safety
      compiled += DOMAIN_VALIDATION_BLOCK;

      // 6. Append selected override modules
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

      // 7. Append custom instruction
      if (customInstructions.trim()) {
        compiled += `\n--------------------------------------------------\nCUSTOM REVISION INSTRUCTION (HIGHEST PRIORITY)\n--------------------------------------------------\n${customInstructions.trim()}\n\nThis instruction takes precedence over all other rules when a conflict exists.\n`;
      }

      setOutput(compiled);
      toast.success('Revision prompt generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  }, [brandName, domain, overrides, customInstructions]);

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Revision Prompt Builder" />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel */}
        <aside className="w-[340px] shrink-0 border-r border-border bg-card overflow-y-auto p-5 space-y-4">

          {/* --- Brand & Data Source --- */}
          <CollapsibleSection title="Brand & Data Source">
            <div className="space-y-3">
              <div>
                <label className="control-label">
                  Brand Name <span className="text-destructive">*</span>
                </label>
                <select
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="control-input"
                >
                  {BRAND_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="control-label">
                  Website Domain <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onBlur={() => {
                    if (domain.trim()) setDomain(normalizeDomain(domain));
                  }}
                  placeholder="https://example.com"
                  className="control-input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for image fallback and content reference if needed
                </p>
              </div>
            </div>
          </CollapsibleSection>

          {/* --- QA First Revision (always on) --- */}
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

          {/* --- Override Modules --- */}
          <CollapsibleSection title="Override Modules (Optional)">
            <div className="space-y-1.5">
              {OVERRIDE_KEYS.map((key) => (
                <label
                  key={key}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                    overrides.has(key) ? 'bg-accent' : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={overrides.has(key)}
                    onChange={() => toggleOverride(key)}
                    className="h-3.5 w-3.5 rounded border-input accent-primary"
                  />
                  <span className="text-sm text-foreground">{OVERRIDE_MODULES[key].label}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

          {/* --- Custom Instructions --- */}
          <CollapsibleSection title="Custom Revision Instruction">
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Add any specific revision instructions here. These take highest priority."
              rows={5}
              className="control-input resize-none text-sm"
            />
          </CollapsibleSection>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate Revision Prompt'}
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

import { useState } from 'react';
import NavHeader from '@/components/NavHeader';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const previewModes = ['Cold Reach Preview', 'Client Preview'] as const;
const priceTiers = [
  { value: '350', label: '350 Standard' },
  { value: '450', label: '450 Conversion Preview' },
  { value: '550', label: '550 Professional' },
  { value: '750', label: '750 Premium Conversion' },
] as const;
const lockStrengths = ['Soft Lock', 'Medium Lock', 'Strong Lock'] as const;
const visibilityOptions = [
  'Homepage Fully Visible',
  'Blur Internal Pages',
  'Show Watermark',
  'Show Preview Top Bar',
  'Show Center Lock Window',
  'Lock CTA Interaction',
  'Lock Language Switch',
] as const;

const LockPreview = () => {
  const [previewMode, setPreviewMode] = useState<string>('Cold Reach Preview');
  const [priceTier, setPriceTier] = useState('350');
  const [lockStrength, setLockStrength] = useState('Soft Lock');
  const [visibility, setVisibility] = useState<Set<string>>(new Set(['Homepage Fully Visible', 'Show Preview Top Bar']));
  const [pricingUrl, setPricingUrl] = useState('');
  const [unlockUrl, setUnlockUrl] = useState('');
  const [output, setOutput] = useState('');

  const toggleVisibility = (item: string) => {
    setVisibility(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  const handleGenerate = () => {
    const lines: string[] = [
      'LOCK PREVIEW PROMPT',
      '='.repeat(40),
      '',
      `Preview Mode: ${previewMode}`,
      `Price Tier: ${priceTiers.find(t => t.value === priceTier)?.label}`,
      `Lock Strength: ${lockStrength}`,
      '',
      'PREVIEW VISIBILITY RULES',
      '-'.repeat(30),
    ];

    if (visibility.size > 0) {
      Array.from(visibility).forEach(v => lines.push(`- ${v}`));
    } else {
      lines.push('No visibility rules selected.');
    }

    lines.push('', 'CTA ROUTING', '-'.repeat(30));
    if (pricingUrl) lines.push(`Pricing Page URL: ${pricingUrl}`);
    if (unlockUrl) lines.push(`Unlock Website URL: ${unlockUrl}`);
    if (!pricingUrl && !unlockUrl) lines.push('No CTA routing URLs provided.');

    lines.push('', '='.repeat(40), 'END LOCK PREVIEW PROMPT');

    setOutput(lines.join('\n'));
    toast({ title: 'Lock preview prompt generated' });
  };

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      toast({ title: 'Copied to clipboard' });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Lock Preview" />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel */}
        <aside className="w-[400px] shrink-0 border-r border-border bg-card overflow-y-auto p-5">
          <div className="space-y-6">
            {/* Preview Mode */}
            <section className="console-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Preview Mode</h3>
              <RadioGroup value={previewMode} onValueChange={setPreviewMode} className="space-y-2">
                {previewModes.map(mode => (
                  <div key={mode} className="flex items-center gap-2">
                    <RadioGroupItem value={mode} id={`pm-${mode}`} />
                    <Label htmlFor={`pm-${mode}`} className="text-sm cursor-pointer">{mode}</Label>
                  </div>
                ))}
              </RadioGroup>
            </section>

            {/* Price Tier */}
            <section className="console-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Price Tier</h3>
              <RadioGroup value={priceTier} onValueChange={setPriceTier} className="space-y-2">
                {priceTiers.map(tier => (
                  <div key={tier.value} className="flex items-center gap-2">
                    <RadioGroupItem value={tier.value} id={`pt-${tier.value}`} />
                    <Label htmlFor={`pt-${tier.value}`} className="text-sm cursor-pointer">{tier.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </section>

            {/* Lock Strength */}
            <section className="console-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Lock Strength</h3>
              <RadioGroup value={lockStrength} onValueChange={setLockStrength} className="space-y-2">
                {lockStrengths.map(strength => (
                  <div key={strength} className="flex items-center gap-2">
                    <RadioGroupItem value={strength} id={`ls-${strength}`} />
                    <Label htmlFor={`ls-${strength}`} className="text-sm cursor-pointer">{strength}</Label>
                  </div>
                ))}
              </RadioGroup>
            </section>

            {/* Preview Visibility Rules */}
            <section className="console-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Preview Visibility Rules</h3>
              <div className="space-y-2">
                {visibilityOptions.map(opt => (
                  <div key={opt} className="flex items-center gap-2">
                    <Checkbox
                      id={`vis-${opt}`}
                      checked={visibility.has(opt)}
                      onCheckedChange={() => toggleVisibility(opt)}
                    />
                    <Label htmlFor={`vis-${opt}`} className="text-sm cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA Routing */}
            <section className="console-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">CTA Routing</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Pricing Page URL</Label>
                  <Input value={pricingUrl} onChange={e => setPricingUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Unlock Website URL</Label>
                  <Input value={unlockUrl} onChange={e => setUnlockUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </section>

            {/* Generate */}
            <Button onClick={handleGenerate} className="w-full gap-2">
              <Lock size={14} /> Generate Lock Preview Prompt
            </Button>
          </div>
        </aside>

        {/* Right Panel */}
        <main className="flex-1 flex flex-col min-w-0 bg-background">
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Lock Preview Prompt Output</h2>
            {output && (
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                <Copy size={14} /> Copy
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="console-card p-5 min-h-[300px]">
              {output ? (
                <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">{output}</pre>
              ) : (
                <p className="text-sm text-muted-foreground italic">Lock preview prompt will appear here after generation.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LockPreview;

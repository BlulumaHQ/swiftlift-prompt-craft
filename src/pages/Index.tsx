import { useState } from 'react';
import NavHeader from '@/components/NavHeader';
import ControlPanel from '@/components/ControlPanel';
import PromptOutputPanel from '@/components/PromptOutputPanel';
import { Trash2, Save, FilePlus, Loader2 } from 'lucide-react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

const LOADING_STEPS = [
  'Scraping Source URL...',
  'Structuring source content...',
  'Building Prompt A...',
  'Building Prompt B...',
];

const Index = () => {
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [tier, setTier] = useState<'350' | '550'>('550');
  const [clearSignal, setClearSignal] = useState(0);
  const [saveSignal, setSaveSignal] = useState(0);
  const [newSignal, setNewSignal] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [claudeError, setClaudeError] = useState('');

  const handlePromptsGenerated = (a: string, b: string, t: '350' | '550') => {
    setPromptA(a);
    setPromptB(b);
    setTier(t);
    setGenerating(false);
    setClaudeError('');
  };

  const handleGenerateStart = (t: '350' | '550') => {
    setGenerating(true);
    setLoadingStep(0);
    setPromptA('');
    setPromptB('');
    setClaudeError('');
    setTier(t);

    // Cycle through loading steps
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < LOADING_STEPS.length) {
        setLoadingStep(step);
      } else {
        clearInterval(interval);
      }
    }, 3000);

    // Store interval ID for cleanup
    (window as any).__generateInterval = interval;
  };

  const handleGenerateError = (error: string) => {
    setGenerating(false);
    setClaudeError(error);
    if ((window as any).__generateInterval) {
      clearInterval((window as any).__generateInterval);
    }
  };

  const handleClear = () => {
    setPromptA('');
    setPromptB('');
    setClaudeError('');
    setGenerating(false);
  };

  const tierLabels = tier === '350'
    ? { a: 'Prompt A — $350 Standard Layout', b: 'Prompt B — $450 Premium Conversion Layout' }
    : { a: 'Prompt A — $550 Standard Layout', b: 'Prompt B — $750 Premium Conversion Layout' };

  const actionButtons = (
    <div className="flex items-center gap-2">
      <button onClick={() => setClearSignal(s => s + 1)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
        <Trash2 size={14} /> Clear
      </button>
      <button onClick={() => setSaveSignal(s => s + 1)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
        <Save size={14} /> Save
      </button>
      <button onClick={() => setNewSignal(s => s + 1)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
        <FilePlus size={14} /> New
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Basic Builder" rightContent={actionButtons} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="w-[400px] shrink-0 border-r border-border bg-card overflow-y-auto p-5">
          <ControlPanel
            onPromptsGenerated={handlePromptsGenerated}
            onGenerateStart={handleGenerateStart}
            onGenerateError={handleGenerateError}
            onClear={handleClear}
            clearSignal={clearSignal}
            saveSignal={saveSignal}
            newSignal={newSignal}
          />
        </aside>

        <main className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto">
          {/* Loading State */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={36} className="animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {LOADING_STEPS[loadingStep]}
                </p>
                <div className="flex gap-1.5 justify-center">
                  {LOADING_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-8 rounded-full transition-colors ${
                        i <= loadingStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  This may take 15–30 seconds
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {claudeError && !generating && (
            <div className="px-4 py-3 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm">
              <strong>Error:</strong> {claudeError}
            </div>
          )}

          {/* Prompt A/B Output (only when not generating) */}
          {!generating && (
            <>
              <PromptOutputPanel title={tierLabels.a} content={promptA} />
              <PromptOutputPanel title={tierLabels.b} content={promptB} />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;

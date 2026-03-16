import { useState } from 'react';
import NavHeader from '@/components/NavHeader';
import ControlPanel from '@/components/ControlPanel';
import PromptOutputPanel from '@/components/PromptOutputPanel';
import { Trash2, Save, FilePlus } from 'lucide-react';

const Index = () => {
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [tier, setTier] = useState<'350' | '550'>('550');
  const [clearSignal, setClearSignal] = useState(0);
  const [saveSignal, setSaveSignal] = useState(0);
  const [newSignal, setNewSignal] = useState(0);

  // Claude generation state
  const [finalPrompt, setFinalPrompt] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [claudeError, setClaudeError] = useState('');

  const handlePromptsGenerated = (a: string, b: string, t: '350' | '550') => {
    setPromptA(a); setPromptB(b); setTier(t);
  };

  const handleClaudeGenerated = (fp: string, data: any, error?: string) => {
    setFinalPrompt(fp || '');
    setExtractedData(data || null);
    setClaudeError(error || '');
  };

  const handleClear = () => {
    setPromptA(''); setPromptB('');
    setFinalPrompt(''); setExtractedData(null); setClaudeError('');
  };

  const tierLabels = tier === '350'
    ? { a: 'Prompt A — $350 Standard Layout Preview', b: 'Prompt B — $475 Conversion Style Layout Preview' }
    : { a: 'Prompt A — $550 Standard Layout Preview', b: 'Prompt B — $750 Conversion Style Layout Preview' };

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
            onClear={handleClear}
            onClaudeGenerated={handleClaudeGenerated}
            clearSignal={clearSignal}
            saveSignal={saveSignal}
            newSignal={newSignal}
          />
        </aside>

        <main className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto">
          {/* Claude Final Prompt Output */}
          <PromptOutputPanel title="Final Lovable Build Prompt" content={finalPrompt} />

          {/* Claude Error */}
          {claudeError && (
            <div className="px-4 py-3 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm">
              <strong>Error:</strong> {claudeError}
            </div>
          )}

          {/* Extraction Preview JSON */}
          <PromptOutputPanel
            title="Extraction Preview JSON"
            content={extractedData ? JSON.stringify(extractedData, null, 2) : ''}
          />

          {/* Legacy Prompt A/B */}
          <PromptOutputPanel title={tierLabels.a} content={promptA} />
          <PromptOutputPanel title={tierLabels.b} content={promptB} />
        </main>
      </div>
    </div>
  );
};

export default Index;

import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/swiftlift-logo.svg';
import ControlPanel from '@/components/ControlPanel';
import PromptOutputPanel from '@/components/PromptOutputPanel';
import { FolderOpen } from 'lucide-react';

const Index = () => {
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [tier, setTier] = useState<'350' | '550'>('350');

  const handlePromptsGenerated = (a: string, b: string, t: '350' | '550') => {
    setPromptA(a); setPromptB(b); setTier(t);
  };

  const handleClear = () => {
    setPromptA(''); setPromptB('');
  };

  const tierLabels = tier === '350'
    ? { a: 'Prompt A — $350 Standard', b: 'Prompt B — $475 Premium' }
    : { a: 'Prompt A — $550 Standard', b: 'Prompt B — $750 Premium' };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="console-header flex items-center justify-between px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="SwiftLift" className="h-8" />
          <div className="h-5 w-px bg-foreground/20" />
          <h1 className="text-sm font-semibold tracking-tight text-[hsl(var(--console-header-foreground))]">
            Prompt Generator Console
          </h1>
        </div>
        <Link to="/projects"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[hsl(var(--console-header-foreground)/0.1)] text-[hsl(var(--console-header-foreground))] hover:bg-[hsl(var(--console-header-foreground)/0.15)] transition-colors">
          <FolderOpen size={14} /> Projects
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — Control Panel */}
        <aside className="w-[400px] shrink-0 border-r border-border bg-card overflow-y-auto p-5">
          <ControlPanel onPromptsGenerated={handlePromptsGenerated} onClear={handleClear} />
        </aside>

        {/* Right — Prompt Outputs */}
        <main className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto">
          <PromptOutputPanel title={tierLabels.a} content={promptA} />
          <PromptOutputPanel title={tierLabels.b} content={promptB} />
        </main>
      </div>
    </div>
  );
};

export default Index;

import { useState } from 'react';
import NavHeader from '@/components/NavHeader';
import { MessageSquare, StickyNote, Wrench, Check } from 'lucide-react';

type RevisionMode = 'client_feedback' | 'internal_notes' | 'quick_fix';

const quickFixes = [
  { id: 'reduce_hero', label: 'Reduce hero height' },
  { id: 'section_spacing', label: 'Improve section spacing' },
  { id: 'column_alignment', label: 'Fix column alignment' },
  { id: 'mobile_spacing', label: 'Fix mobile spacing' },
  { id: 'sticky_cta', label: 'Fix sticky CTA overlap' },
  { id: 'anchor_links', label: 'Fix anchor links' },
  { id: 'footer_layout', label: 'Fix footer layout' },
  { id: 'routing_404', label: 'Fix routing / 404' },
  { id: 'meta_description', label: 'Fix meta description' },
  { id: 'remove_credit', label: 'Remove web design credit' },
];

const modes: { id: RevisionMode; label: string; icon: typeof MessageSquare; description: string }[] = [
  { id: 'client_feedback', label: 'Client Feedback', icon: MessageSquare, description: 'Enter revision notes from client communication' },
  { id: 'internal_notes', label: 'Internal Notes', icon: StickyNote, description: 'Add internal team notes and observations' },
  { id: 'quick_fix', label: 'Quick Fix Tools', icon: Wrench, description: 'Select common fixes to generate revision prompts' },
];

export default function Revision() {
  const [activeMode, setActiveMode] = useState<RevisionMode>('client_feedback');
  const [feedbackText, setFeedbackText] = useState('');
  const [notesText, setNotesText] = useState('');
  const [selectedFixes, setSelectedFixes] = useState<string[]>([]);

  const toggleFix = (id: string) => {
    setSelectedFixes(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Revision" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Revision Tools</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage revisions across client feedback, internal notes, and quick fixes.</p>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2 mb-6">
            {modes.map(mode => (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeMode === mode.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-foreground hover:bg-muted'
                }`}
              >
                <mode.icon size={16} />
                {mode.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="panel-section">
            {activeMode === 'client_feedback' && (
              <div className="space-y-4">
                <div>
                  <h3 className="panel-section-title">Client Feedback</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Paste or type client revision requests. These will be compiled into revision prompts.
                  </p>
                </div>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Enter client feedback here... e.g., 'Make the hero section larger, change the CTA text to Contact Us Now'"
                  rows={12}
                  className="control-input resize-none font-mono text-sm"
                />
                <div className="flex justify-end">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors opacity-50 cursor-not-allowed">
                    Generate Revision Prompt
                  </button>
                </div>
              </div>
            )}

            {activeMode === 'internal_notes' && (
              <div className="space-y-4">
                <div>
                  <h3 className="panel-section-title">Internal Notes</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Record internal observations, QA notes, or design decisions for the revision cycle.
                  </p>
                </div>
                <textarea
                  value={notesText}
                  onChange={e => setNotesText(e.target.value)}
                  placeholder="Add internal team notes... e.g., 'Hero image needs replacing, footer links are broken on mobile'"
                  rows={12}
                  className="control-input resize-none font-mono text-sm"
                />
                <div className="flex justify-end">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors opacity-50 cursor-not-allowed">
                    Generate Revision Prompt
                  </button>
                </div>
              </div>
            )}

            {activeMode === 'quick_fix' && (
              <div className="space-y-4">
                <div>
                  <h3 className="panel-section-title">Quick Fix Tools</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select common fixes below. Selected items will generate targeted revision prompts.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {quickFixes.map(fix => (
                    <label
                      key={fix.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFixes.includes(fix.id)
                          ? 'border-primary bg-accent'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                        selectedFixes.includes(fix.id)
                          ? 'bg-primary border-primary'
                          : 'border-input'
                      }`}>
                        {selectedFixes.includes(fix.id) && <Check size={12} className="text-primary-foreground" />}
                      </div>
                      <span className="text-sm text-foreground">{fix.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    {selectedFixes.length} fix{selectedFixes.length !== 1 ? 'es' : ''} selected
                  </p>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors opacity-50 cursor-not-allowed">
                    Generate Revision Prompt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

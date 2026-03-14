import NavHeader from '@/components/NavHeader';
import { Palette, Bot, Hammer, SlidersHorizontal, FileOutput, Rocket } from 'lucide-react';

const sections = [
  { id: 'brand_presets', label: 'Brand Presets', icon: Palette, description: 'Manage saved brand configurations and color palettes for quick application.' },
  { id: 'ai_provider', label: 'AI Provider', icon: Bot, description: 'Configure AI model providers, API keys, and processing preferences.' },
  { id: 'builder_default', label: 'Builder Default', icon: Hammer, description: 'Set default builder type, package tier, and initial configuration.' },
  { id: 'field_defaults', label: 'Field Defaults', icon: SlidersHorizontal, description: 'Configure default values for form fields, modules, and overrides.' },
  { id: 'output_rules', label: 'Output Rules', icon: FileOutput, description: 'Define prompt output formatting, structure rules, and compilation settings.' },
  { id: 'deployment', label: 'Deployment Settings', icon: Rocket, description: 'Configure deployment targets, staging environments, and publish workflows.' },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Settings" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Settings</h2>
            <p className="text-sm text-muted-foreground mt-1">System configuration and preferences.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map(section => (
              <div key={section.id} className="panel-section flex items-start gap-4 opacity-60">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <section.icon size={20} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-muted text-muted-foreground">
                    Coming Soon
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

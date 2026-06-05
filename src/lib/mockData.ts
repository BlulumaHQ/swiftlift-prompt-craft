export const sortOptions = ['Recently Added', 'A–Z', 'Industry'];

export const googleFonts = [
  'Inter', 'Montserrat', 'Poppins', 'Plus Jakarta Sans',
  'Playfair Display', 'Lora', 'Cormorant Garamond', 'Merriweather', 'Libre Baskerville',
  'Sora', 'Space Grotesk', 'Syne', 'Archivo Black', 'Clash Display', 'General Sans'
];

export const contentModules = [
  { id: 'portfolio_demo_cms', label: 'Portfolio / Projects — BluLuma Demo CMS' },
  { id: 'blog_demo_cms', label: 'Blog — BluLuma Demo CMS' },
  { id: 'gallery_demo_cms', label: 'Gallery — BluLuma Demo CMS' },
  { id: 'multilanguage', label: 'Multi-language' },
  { id: 'team_demo_cms', label: 'Team — BluLuma Demo CMS' },
  { id: 'testimonials_demo_cms', label: 'Testimonials — BluLuma Demo CMS' },
  { id: 'faq_demo_cms', label: 'FAQ — BluLuma Demo CMS' },
  { id: 'services_demo_cms', label: 'Services — BluLuma Demo CMS' },
];

export const advancedModules = [
  { id: 'lead_capture', label: 'Lead Capture Upgrade' },
  { id: 'conversion_layout', label: 'Conversion Layout' },
  { id: 'trust_badges', label: 'Trust Badge Section' },
  { id: 'service_comparison', label: 'Service Comparison' },
  { id: 'case_study', label: 'Case Study Section' },
  { id: 'full_seo', label: 'Full SEO Package' },
];

export interface SavedProject {
  id: string;
  name: string;
  sourceUrl: string;
  referenceLayout: string;
  referenceUrl: string;
  packageTier: '350' | '550';
  modules: string[];
  addons: string[];
  primaryColor: string;
  secondaryColor: string;
  primaryFont: string;
  specialInstructions: string;
  promptA: string;
  promptB: string;
  dateCreated: string;
  lastModified?: string;
  producedBy?: string;
  projectName?: string;
  clientName?: string;
  industry?: string;
  region?: string;
  language?: string;
  accentColor?: string;
  fontWeight?: string;
  advancedModules?: string[];
  // Prompt A theme overrides
  promptAPrimaryColor?: string;
  promptASecondaryColor?: string;
  promptAPrimaryFont?: string;
  promptAFontWeight?: string;
  promptAThemeMode?: string;
  // Prompt B theme overrides
  promptBPrimaryColor?: string;
  promptBSecondaryColor?: string;
  promptBPrimaryFont?: string;
  promptBFontWeight?: string;
  promptBThemeMode?: string;
}

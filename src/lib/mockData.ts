// Re-export reference types from the new store for backward compatibility
export type { ReferenceEntry as ReferenceLayout } from '@/lib/referenceStore';
export { getReferences as getReferenceLayouts, industries as categories } from '@/lib/referenceStore';

export const sortOptions = ['Recently Added', 'A–Z', 'Industry'];

export const googleFonts = [
  'Inter', 'Montserrat', 'Poppins', 'DM Sans', 'Manrope', 'Outfit',
  'Plus Jakarta Sans', 'Open Sans', 'Lato', 'Nunito Sans',
  'Playfair Display', 'Lora', 'Cormorant Garamond', 'Merriweather', 'Libre Baskerville'
];

export const contentModules = [
  { id: 'portfolio_login', label: 'Portfolio / Projects — With Login' },
  { id: 'portfolio_nologin', label: 'Portfolio / Projects — Without Login' },
  { id: 'blog_login', label: 'Blog — With Login' },
  { id: 'blog_nologin', label: 'Blog — Without Login' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'multilanguage', label: 'Multi-language' },
];

export const advancedModules = [
  { id: 'lead_capture', label: 'Lead Capture Upgrade' },
  { id: 'conversion_layout', label: 'Conversion Layout' },
  { id: 'trust_badges', label: 'Trust Badge Section' },
  { id: 'service_comparison', label: 'Service Comparison' },
  { id: 'case_study', label: 'Case Study Section' },
  { id: 'full_seo', label: 'Full SEO Package' },
];

export const premiumAddons = [
  { id: 'conversion', label: 'Conversion Strategy Layout' },
  { id: 'hero', label: 'Premium Hero Structure' },
  { id: 'luxury', label: 'Luxury Visual Direction' },
];

export const industryOptions = [
  'Dental', 'Construction', 'Restaurant', 'Real Estate',
  'Professional Services', 'Luxury Service', 'Ecommerce',
  'Healthcare', 'Legal', 'Technology', 'Education', 'Other'
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
  // New fields
  producedBy?: string;
  projectName?: string;
  clientName?: string;
  industry?: string;
  region?: string;
  language?: string;
  accentColor?: string;
  fontWeight?: string;
  advancedModules?: string[];
}

export const exampleProjects: SavedProject[] = [
  {
    id: '1', name: 'Ming Pao Canada', sourceUrl: 'https://mingpaocanada.com',
    referenceLayout: 'Professional Services Layout', referenceUrl: '',
    packageTier: '550', modules: ['blog_nologin', 'multilanguage'], addons: ['conversion'],
    primaryColor: '#1a365d', secondaryColor: '#c53030', primaryFont: 'Inter',
    specialInstructions: 'Focus on bilingual content structure. Ensure Chinese and English sections are clearly separated.',
    promptA: '', promptB: '', dateCreated: '2026-03-05',
  },
  {
    id: '2', name: 'Friendly Dental', sourceUrl: 'https://friendlydental.ca',
    referenceLayout: 'Dental Layout A', referenceUrl: '',
    packageTier: '350', modules: ['portfolio_nologin'], addons: ['hero'],
    primaryColor: '#2b6cb0', secondaryColor: '#38a169', primaryFont: 'DM Sans',
    specialInstructions: 'Emphasize family-friendly atmosphere. Highlight new patient specials.',
    promptA: '', promptB: '', dateCreated: '2026-03-03',
  },
  {
    id: '3', name: 'KChen Construction', sourceUrl: 'https://kchenconstruction.com',
    referenceLayout: 'Construction Layout A', referenceUrl: '',
    packageTier: '550', modules: ['portfolio_nologin', 'gallery'], addons: ['hero', 'luxury'],
    primaryColor: '#dd6b20', secondaryColor: '#1a202c', primaryFont: 'Montserrat',
    specialInstructions: 'Showcase large commercial projects. Include before/after galleries.',
    promptA: '', promptB: '', dateCreated: '2026-02-28',
  },
  {
    id: '4', name: 'BTN Real Estate', sourceUrl: 'https://btnrealestate.com',
    referenceLayout: 'Real Estate Layout', referenceUrl: '',
    packageTier: '550', modules: ['blog_nologin', 'portfolio_nologin', 'gallery'], addons: ['conversion', 'luxury'],
    primaryColor: '#2c5282', secondaryColor: '#d69e2e', primaryFont: 'Playfair Display',
    specialInstructions: 'Focus on luxury listings. Include market report section and virtual tour integration.',
    promptA: '', promptB: '', dateCreated: '2026-02-25',
  },
];

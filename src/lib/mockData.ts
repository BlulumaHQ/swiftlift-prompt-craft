import dentalA from '@/assets/previews/dental-a.jpg';
import dentalB from '@/assets/previews/dental-b.jpg';
import constructionA from '@/assets/previews/construction-a.jpg';
import constructionB from '@/assets/previews/construction-b.jpg';
import luxuryService from '@/assets/previews/luxury-service.jpg';
import restaurant from '@/assets/previews/restaurant.jpg';
import onePageService from '@/assets/previews/one-page-service.jpg';
import realEstate from '@/assets/previews/real-estate.jpg';
import professionalServices from '@/assets/previews/professional-services.jpg';

export interface ReferenceLayout {
  id: string;
  name: string;
  industry: string;
  category: string;
  image: string;
  addedDate: string;
  lastUsed: string;
}

export const referenceLayouts: ReferenceLayout[] = [
  { id: '1', name: 'Dental Layout A', industry: 'Dental', category: 'Dental', image: dentalA, addedDate: '2026-03-01', lastUsed: '2026-03-07' },
  { id: '2', name: 'Dental Layout B', industry: 'Dental', category: 'Dental', image: dentalB, addedDate: '2026-02-20', lastUsed: '2026-03-05' },
  { id: '3', name: 'Construction Layout A', industry: 'Construction', category: 'Construction', image: constructionA, addedDate: '2026-02-15', lastUsed: '2026-03-06' },
  { id: '4', name: 'Construction Layout B', industry: 'Construction', category: 'Construction', image: constructionB, addedDate: '2026-02-10', lastUsed: '2026-03-04' },
  { id: '5', name: 'Luxury Service Layout', industry: 'Luxury Service', category: 'Luxury Service', image: luxuryService, addedDate: '2026-01-28', lastUsed: '2026-03-03' },
  { id: '6', name: 'Restaurant Layout', industry: 'Restaurant', category: 'Restaurant', image: restaurant, addedDate: '2026-01-20', lastUsed: '2026-03-02' },
  { id: '7', name: 'One Page Service Layout', industry: 'Professional Services', category: 'One Page Design', image: onePageService, addedDate: '2026-01-15', lastUsed: '2026-02-28' },
  { id: '8', name: 'Real Estate Layout', industry: 'Real Estate', category: 'Real Estate', image: realEstate, addedDate: '2026-01-10', lastUsed: '2026-02-25' },
  { id: '9', name: 'Professional Services Layout', industry: 'Professional Services', category: 'Professional Services', image: professionalServices, addedDate: '2026-01-05', lastUsed: '2026-02-20' },
];

export const categories = ['All', 'Dental', 'Construction', 'Restaurant', 'Real Estate', 'Luxury Service', 'Professional Services', 'One Page Design'];

export const sortOptions = ['Recently Added', 'Recently Used', 'A–Z', 'Industry'];

export const googleFonts = [
  'Inter', 'Montserrat', 'Poppins', 'DM Sans', 'Manrope', 'Outfit',
  'Plus Jakarta Sans', 'Open Sans', 'Lato', 'Nunito Sans',
  'Playfair Display', 'Lora', 'Cormorant Garamond', 'Merriweather', 'Libre Baskerville'
];

export const contentModules = [
  { id: 'team', label: 'Team' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'faq', label: 'FAQ' },
  { id: 'portfolio', label: 'Portfolio / Projects' },
  { id: 'multilanguage', label: 'Multi-language' },
  { id: 'blog', label: 'Blog' },
];

export const premiumAddons = [
  { id: 'conversion', label: 'Conversion Strategy Layout' },
  { id: 'hero', label: 'Premium Hero Structure' },
  { id: 'luxury', label: 'Luxury Visual Direction' },
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
}

export const exampleProjects: SavedProject[] = [
  {
    id: '1', name: 'Ming Pao Canada', sourceUrl: 'https://mingpaocanada.com',
    referenceLayout: 'Professional Services Layout', referenceUrl: '',
    packageTier: '550', modules: ['team', 'blog', 'multilanguage'], addons: ['conversion'],
    primaryColor: '#1a365d', secondaryColor: '#c53030', primaryFont: 'Inter',
    specialInstructions: 'Focus on bilingual content structure. Ensure Chinese and English sections are clearly separated.',
    promptA: '', promptB: '', dateCreated: '2026-03-05',
  },
  {
    id: '2', name: 'Friendly Dental', sourceUrl: 'https://friendlydental.ca',
    referenceLayout: 'Dental Layout A', referenceUrl: '',
    packageTier: '350', modules: ['team', 'testimonials', 'faq'], addons: ['hero'],
    primaryColor: '#2b6cb0', secondaryColor: '#38a169', primaryFont: 'DM Sans',
    specialInstructions: 'Emphasize family-friendly atmosphere. Highlight new patient specials.',
    promptA: '', promptB: '', dateCreated: '2026-03-03',
  },
  {
    id: '3', name: 'KChen Construction', sourceUrl: 'https://kchenconstruction.com',
    referenceLayout: 'Construction Layout A', referenceUrl: '',
    packageTier: '550', modules: ['portfolio', 'testimonials', 'team'], addons: ['hero', 'luxury'],
    primaryColor: '#dd6b20', secondaryColor: '#1a202c', primaryFont: 'Montserrat',
    specialInstructions: 'Showcase large commercial projects. Include before/after galleries.',
    promptA: '', promptB: '', dateCreated: '2026-02-28',
  },
  {
    id: '4', name: 'BTN Real Estate', sourceUrl: 'https://btnrealestate.com',
    referenceLayout: 'Real Estate Layout', referenceUrl: '',
    packageTier: '550', modules: ['team', 'testimonials', 'blog', 'portfolio'], addons: ['conversion', 'luxury'],
    primaryColor: '#2c5282', secondaryColor: '#d69e2e', primaryFont: 'Playfair Display',
    specialInstructions: 'Focus on luxury listings. Include market report section and virtual tour integration.',
    promptA: '', promptB: '', dateCreated: '2026-02-25',
  },
];

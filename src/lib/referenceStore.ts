// Reference Library Store - manages reference layouts with role system

const STORAGE_KEY = 'swiftlift_references_v2';

export type ReferenceRole = 'style' | 'conversion_layout';

export interface ReferenceScreenshots {
  desktop_hero: string;
  desktop_full: string;
  mobile_hero: string;
  mobile_full: string;
}

export interface StyleTokens {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family_heading: string;
  font_family_body: string;
  font_sizes: {
    hero_title: string;
    page_title: string;
    section_title: string;
    body_text: string;
    button_text: string;
  };
  font_weights: {
    hero_title: string;
    page_title: string;
    section_title: string;
    body_text: string;
    button_text: string;
  };
}

export interface LayoutTokens {
  section_order: string[];
  hero_type: string;
  cta_pattern: string;
  trust_block_position: string;
  card_style: string;
  nav_style: string;
  footer_style: string;
}

export interface ReferenceEntry {
  id: string;
  reference_name: string;
  industry: string;
  reference_role: ReferenceRole;
  live_url: string;
  theme_mode: 'light' | 'dark';
  preview_image: string;
  screenshots: ReferenceScreenshots;
  style_tokens: StyleTokens;
  layout_tokens: LayoutTokens;
  notes: string;
  added_date: string;
  last_used: string;
}

export const industries = [
  'Dental',
  'Construction',
  'Restaurant',
  'Real Estate',
  'Professional Services',
  'Luxury Service',
  'One Page Design',
  'Other'
];

function emptyStyleTokens(): StyleTokens {
  return {
    primary_color: '', secondary_color: '', accent_color: '',
    font_family_heading: '', font_family_body: '',
    font_sizes: { hero_title: '', page_title: '', section_title: '', body_text: '', button_text: '' },
    font_weights: { hero_title: '', page_title: '', section_title: '', body_text: '', button_text: '' },
  };
}

function emptyLayoutTokens(): LayoutTokens {
  return {
    section_order: [], hero_type: '', cta_pattern: '',
    trust_block_position: '', card_style: '', nav_style: '', footer_style: '',
  };
}

function emptyScreenshots(): ReferenceScreenshots {
  return { desktop_hero: '', desktop_full: '', mobile_hero: '', mobile_full: '' };
}

export function createEmptyReference(overrides: Partial<ReferenceEntry> = {}): ReferenceEntry {
  return {
    id: crypto.randomUUID(),
    reference_name: '',
    industry: 'Professional Services',
    reference_role: 'style',
    live_url: '',
    theme_mode: 'light',
    preview_image: '',
    screenshots: emptyScreenshots(),
    style_tokens: emptyStyleTokens(),
    layout_tokens: emptyLayoutTokens(),
    notes: '',
    added_date: new Date().toISOString().slice(0, 10),
    last_used: '',
    ...overrides,
  };
}

function getStoredReferences(): ReferenceEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Start with empty library — no fake data
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  return [];
}

function persist(refs: ReferenceEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
}

export function getReferences(): ReferenceEntry[] {
  return getStoredReferences();
}

export function getReference(id: string): ReferenceEntry | undefined {
  return getStoredReferences().find(r => r.id === id);
}

export function getReferencesByRole(role: ReferenceRole): ReferenceEntry[] {
  return getStoredReferences().filter(r => r.reference_role === role);
}

export function saveReference(ref: ReferenceEntry): void {
  const refs = getStoredReferences();
  const idx = refs.findIndex(r => r.id === ref.id);
  if (idx >= 0) {
    refs[idx] = ref;
  } else {
    refs.unshift(ref);
  }
  persist(refs);
}

export function deleteReference(id: string): void {
  const refs = getStoredReferences().filter(r => r.id !== id);
  persist(refs);
}

export function updateLastUsed(id: string): void {
  const refs = getStoredReferences();
  const idx = refs.findIndex(r => r.id === id);
  if (idx >= 0) {
    refs[idx].last_used = new Date().toISOString().slice(0, 10);
    persist(refs);
  }
}

export function generatePreviewPlaceholder(industry: string): string {
  const colors: Record<string, string> = {
    'Dental': '2B6CB0', 'Construction': 'DD6B20', 'Restaurant': 'C53030',
    'Real Estate': '2C5282', 'Professional Services': '4A5568',
    'Luxury Service': '1A202C', 'One Page Design': '6B46C1', 'Other': '718096'
  };
  const color = colors[industry] || '718096';
  return `https://placehold.co/600x400/${color}/ffffff?text=${encodeURIComponent(industry)}`;
}

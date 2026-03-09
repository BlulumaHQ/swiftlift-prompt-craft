// Reference Library Store - manages reference layouts

import dentalA from '@/assets/previews/dental-a.jpg';
import dentalB from '@/assets/previews/dental-b.jpg';
import constructionA from '@/assets/previews/construction-a.jpg';
import constructionB from '@/assets/previews/construction-b.jpg';
import luxuryService from '@/assets/previews/luxury-service.jpg';
import restaurant from '@/assets/previews/restaurant.jpg';
import onePageService from '@/assets/previews/one-page-service.jpg';
import realEstate from '@/assets/previews/real-estate.jpg';
import professionalServices from '@/assets/previews/professional-services.jpg';

const STORAGE_KEY = 'swiftlift_references';

export interface ReferenceLayout {
  id: string;
  name: string;
  industry: string;
  category: string;
  image: string;
  referenceUrl: string;
  addedDate: string;
  lastUsed: string;
}

export const industries = [
  'Dental',
  'Construction', 
  'Restaurant',
  'Real Estate',
  'Professional Services',
  'Luxury Service',
  'One Page Design'
];

const defaultReferences: ReferenceLayout[] = [
  { id: '1', name: 'Dental Layout A', industry: 'Dental', category: 'Dental', image: dentalA, referenceUrl: 'https://example-dental-a.com', addedDate: '2026-03-01', lastUsed: '2026-03-07' },
  { id: '2', name: 'Dental Layout B', industry: 'Dental', category: 'Dental', image: dentalB, referenceUrl: 'https://example-dental-b.com', addedDate: '2026-02-20', lastUsed: '2026-03-05' },
  { id: '3', name: 'Construction Layout A', industry: 'Construction', category: 'Construction', image: constructionA, referenceUrl: 'https://example-construction-a.com', addedDate: '2026-02-15', lastUsed: '2026-03-06' },
  { id: '4', name: 'Construction Layout B', industry: 'Construction', category: 'Construction', image: constructionB, referenceUrl: 'https://example-construction-b.com', addedDate: '2026-02-10', lastUsed: '2026-03-04' },
  { id: '5', name: 'Luxury Service Layout', industry: 'Luxury Service', category: 'Luxury Service', image: luxuryService, referenceUrl: 'https://example-luxury.com', addedDate: '2026-01-28', lastUsed: '2026-03-03' },
  { id: '6', name: 'Restaurant Layout', industry: 'Restaurant', category: 'Restaurant', image: restaurant, referenceUrl: 'https://example-restaurant.com', addedDate: '2026-01-20', lastUsed: '2026-03-02' },
  { id: '7', name: 'One Page Service Layout', industry: 'Professional Services', category: 'One Page Design', image: onePageService, referenceUrl: 'https://example-onepage.com', addedDate: '2026-01-15', lastUsed: '2026-02-28' },
  { id: '8', name: 'Real Estate Layout', industry: 'Real Estate', category: 'Real Estate', image: realEstate, referenceUrl: 'https://example-realestate.com', addedDate: '2026-01-10', lastUsed: '2026-02-25' },
  { id: '9', name: 'Professional Services Layout', industry: 'Professional Services', category: 'Professional Services', image: professionalServices, referenceUrl: 'https://example-professional.com', addedDate: '2026-01-05', lastUsed: '2026-02-20' },
];

function getStoredReferences(): ReferenceLayout[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultReferences));
  return defaultReferences;
}

export function getReferences(): ReferenceLayout[] {
  return getStoredReferences();
}

export function getReference(id: string): ReferenceLayout | undefined {
  return getStoredReferences().find(r => r.id === id);
}

export function saveReference(ref: ReferenceLayout): void {
  const refs = getStoredReferences();
  const idx = refs.findIndex(r => r.id === ref.id);
  if (idx >= 0) {
    refs[idx] = ref;
  } else {
    refs.unshift(ref);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
}

export function deleteReference(id: string): void {
  const refs = getStoredReferences().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
}

export function updateLastUsed(id: string): void {
  const refs = getStoredReferences();
  const idx = refs.findIndex(r => r.id === id);
  if (idx >= 0) {
    refs[idx].lastUsed = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
  }
}

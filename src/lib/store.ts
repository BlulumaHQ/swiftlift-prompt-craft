import { SavedProject } from './mockData';

const STORAGE_KEY = 'swiftlift_projects';

function getStoredProjects(): SavedProject[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  return [];
}

export function getProjects(): SavedProject[] {
  return getStoredProjects();
}

export function saveProject(project: SavedProject): void {
  const projects = getStoredProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = { ...project, lastModified: new Date().toISOString().slice(0, 10) };
  } else {
    projects.unshift(project);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): void {
  const projects = getStoredProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProject(id: string): SavedProject | undefined {
  return getStoredProjects().find(p => p.id === id);
}

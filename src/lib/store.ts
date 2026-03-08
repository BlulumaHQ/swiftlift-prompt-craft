import { SavedProject, exampleProjects } from './mockData';

const STORAGE_KEY = 'swiftlift_projects';

function getStoredProjects(): SavedProject[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Initialize with example projects
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exampleProjects));
  return exampleProjects;
}

export function getProjects(): SavedProject[] {
  return getStoredProjects();
}

export function saveProject(project: SavedProject): void {
  const projects = getStoredProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.unshift(project);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProject(id: string): SavedProject | undefined {
  return getStoredProjects().find(p => p.id === id);
}

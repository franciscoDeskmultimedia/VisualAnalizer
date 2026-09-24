import fs from 'fs';
import path from 'path';
import { Project, Run, DEFAULT_BREAKPOINTS, DEFAULT_PROJECT_SETTINGS } from '@/types';

interface StoreData {
  projects: Project[];
  runs: Run[];
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const STORAGE_DIR = isServerless ? '/tmp/visual-analizar' : path.join(process.cwd(), '.visual-analizar');
const DATA_FILE = path.join(STORAGE_DIR, 'data.json');

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj_stripe_sample',
    name: 'Stripe Payment Suite',
    baseUrl: 'https://stripe.com',
    pages: [
      { id: 'page_1', name: 'Home Landing', path: '/' },
      { id: 'page_2', name: 'Pricing & Plans', path: '/pricing' },
      { id: 'page_3', name: 'Product Overview', path: '/payments' },
    ],
    breakpoints: [
      { id: 'desktop', name: 'Desktop Display', width: 1440, height: 900, icon: 'desktop' },
      { id: 'tablet', name: 'Tablet (iPad)', width: 768, height: 1024, icon: 'tablet' },
      { id: 'mobile', name: 'Mobile (iPhone)', width: 375, height: 812, icon: 'smartphone' },
    ],
    baselineRunId: null,
    settings: {
      ...DEFAULT_PROJECT_SETTINGS,
      waitTimeMs: 1500,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj_example_sample',
    name: 'Example Domain QA',
    baseUrl: 'https://example.com',
    pages: [
      { id: 'page_ex_1', name: 'Default Home', path: '/' },
    ],
    breakpoints: [
      { id: 'desktop', name: 'Desktop (1440px)', width: 1440, height: 850, icon: 'desktop' },
      { id: 'mobile', name: 'Mobile (390px)', width: 390, height: 844, icon: 'smartphone' },
    ],
    baselineRunId: null,
    settings: DEFAULT_PROJECT_SETTINGS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

function ensureDirExists() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export function readStore(): StoreData {
  try {
    ensureDirExists();
    if (!fs.existsSync(DATA_FILE)) {
      const initial: StoreData = {
        projects: INITIAL_PROJECTS,
        runs: [],
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      projects: parsed.projects || [],
      runs: parsed.runs || [],
    };
  } catch (error) {
    console.error('Error reading store:', error);
    return {
      projects: INITIAL_PROJECTS,
      runs: [],
    };
  }
}

export function writeStore(data: StoreData): void {
  try {
    ensureDirExists();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing store:', error);
  }
}

export function getProjects(): Project[] {
  const data = readStore();
  return data.projects;
}

export function getProjectById(id: string): Project | undefined {
  const data = readStore();
  return data.projects.find((p) => p.id === id);
}

export function saveProject(project: Project): Project {
  const data = readStore();
  const existingIdx = data.projects.findIndex((p) => p.id === project.id);
  if (existingIdx >= 0) {
    data.projects[existingIdx] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    data.projects.push({
      ...project,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  writeStore(data);
  return project;
}

export function deleteProject(id: string): boolean {
  const data = readStore();
  data.projects = data.projects.filter((p) => p.id !== id);
  data.runs = data.runs.filter((r) => r.projectId !== id);
  writeStore(data);
  return true;
}

export function getRunsByProjectId(projectId: string): Run[] {
  const data = readStore();
  return data.runs
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getRunById(runId: string): Run | undefined {
  const data = readStore();
  return data.runs.find((r) => r.id === runId);
}

export function saveRun(run: Run): Run {
  const data = readStore();
  const existingIdx = data.runs.findIndex((r) => r.id === run.id);
  if (existingIdx >= 0) {
    data.runs[existingIdx] = run;
  } else {
    data.runs.unshift(run);
  }
  writeStore(data);
  return run;
}

export function setProjectBaselineRun(projectId: string, runId: string): boolean {
  const data = readStore();
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return false;

  project.baselineRunId = runId;
  project.updatedAt = new Date().toISOString();

  // Update runs isBaseline flags
  data.runs.forEach((r) => {
    if (r.projectId === projectId) {
      r.isBaseline = r.id === runId;
    }
  });

  writeStore(data);
  return true;
}

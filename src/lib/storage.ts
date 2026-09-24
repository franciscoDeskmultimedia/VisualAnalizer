import fs from 'fs';
import path from 'path';
import { Project, Run, ProjectMember, User, DEFAULT_BREAKPOINTS, DEFAULT_PROJECT_SETTINGS } from '@/types';

interface StoreData {
  projects: Project[];
  runs: Run[];
  users?: any[];
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const STORAGE_DIR = isServerless ? '/tmp/visual-analizar' : path.join(process.cwd(), '.visual-analizar');
const DATA_FILE = path.join(STORAGE_DIR, 'data.json');

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj_stripe_sample',
    name: 'Stripe Payment Suite',
    baseUrl: 'https://stripe.com',
    ownerId: 'usr_demo',
    ownerEmail: 'demo@visualanalizar.com',
    members: [],
    inviteToken: 'inv_stripe_sample',
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
      fullPage: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj_example_sample',
    name: 'Example Domain QA',
    baseUrl: 'https://example.com',
    ownerId: 'usr_demo',
    ownerEmail: 'demo@visualanalizar.com',
    members: [],
    inviteToken: 'inv_example_sample',
    pages: [
      { id: 'page_ex_1', name: 'Default Home', path: '/' },
    ],
    breakpoints: [
      { id: 'desktop', name: 'Desktop (1440px)', width: 1440, height: 850, icon: 'desktop' },
      { id: 'mobile', name: 'Mobile (390px)', width: 390, height: 844, icon: 'smartphone' },
    ],
    baselineRunId: null,
    settings: {
      ...DEFAULT_PROJECT_SETTINGS,
      fullPage: true,
    },
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
        users: [],
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      projects: parsed.projects || [],
      runs: parsed.runs || [],
      users: parsed.users || [],
    };
  } catch (error) {
    console.error('Error reading store:', error);
    return {
      projects: INITIAL_PROJECTS,
      runs: [],
      users: [],
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

export function getProjects(userId?: string): Project[] {
  const data = readStore();
  if (!userId) {
    return data.projects;
  }

  // Filter projects owned by this user or shared with this user's id/email
  return data.projects.filter((p) => {
    if (!p.ownerId) return true; // Legacy/sample projects accessible to all
    if (p.ownerId === userId) return true;
    if (p.members?.some((m) => m.userId === userId)) return true;
    return false;
  });
}

export function getProjectById(id: string): Project | undefined {
  const data = readStore();
  return data.projects.find((p) => p.id === id);
}

export function getProjectByInviteToken(token: string): Project | undefined {
  const data = readStore();
  return data.projects.find((p) => p.inviteToken === token);
}

export function saveProject(project: Project): Project {
  const data = readStore();
  // Ensure inviteToken exists for team sharing
  if (!project.inviteToken) {
    project.inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  if (!project.members) {
    project.members = [];
  }

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

export function addProjectMember(
  projectId: string,
  member: { userId?: string; email: string; name?: string; role: 'editor' | 'viewer' }
): Project | null {
  const data = readStore();
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return null;

  if (!project.members) {
    project.members = [];
  }

  const existingMember = project.members.find(
    (m) => m.email.toLowerCase() === member.email.toLowerCase()
  );

  if (existingMember) {
    existingMember.role = member.role;
  } else {
    project.members.push({
      userId: member.userId || `usr_invited_${Date.now()}`,
      email: member.email.toLowerCase().trim(),
      name: member.name || member.email.split('@')[0],
      role: member.role,
      joinedAt: new Date().toISOString(),
    });
  }

  project.updatedAt = new Date().toISOString();
  writeStore(data);
  return project;
}

export function removeProjectMember(projectId: string, memberEmailOrId: string): Project | null {
  const data = readStore();
  const project = data.projects.find((p) => p.id === projectId);
  if (!project || !project.members) return null;

  project.members = project.members.filter(
    (m) => m.userId !== memberEmailOrId && m.email.toLowerCase() !== memberEmailOrId.toLowerCase()
  );
  project.updatedAt = new Date().toISOString();
  writeStore(data);
  return project;
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

  // Find the run being promoted to baseline
  const baselineRun = data.runs.find((r) => r.id === runId && r.projectId === projectId);

  data.runs.forEach((r) => {
    if (r.projectId === projectId) {
      const isThisBaseline = r.id === runId;
      r.isBaseline = isThisBaseline;

      if (isThisBaseline) {
        // For the baseline run itself, all screenshots are now the baseline reference!
        // Its baselineImage becomes its currentImage, diff is 0, status is identical
        r.comparisons.forEach((c) => {
          c.baselineImage = c.currentImage;
          c.diffImage = undefined;
          c.diffPixelCount = 0;
          c.diffPercentage = 0;
          c.status = 'identical';
          delete c.errorMessage;
        });
        r.passedChecks = r.comparisons.length;
        r.changedChecks = 0;
        r.newChecks = 0;
      } else if (baselineRun) {
        // For other runs in this project, update their baselineImage reference to point
        // to the newly promoted baseline's screenshots
        r.comparisons.forEach((c) => {
          const match = baselineRun.screenshots.find(
            (s) =>
              (s.pageId === c.pageId || s.pagePath === c.pagePath) &&
              (s.breakpointId === c.breakpointId || s.width === c.width)
          );
          if (match && match.imageData) {
            c.baselineImage = match.imageData;
          }
        });
      }
    }
  });

  writeStore(data);
  return true;
}

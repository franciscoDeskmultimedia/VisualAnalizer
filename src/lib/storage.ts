import fs from 'fs';
import path from 'path';
import { Project, Run, ProjectMember, Screenshot, ComparisonItem, DEFAULT_BREAKPOINTS, DEFAULT_PROJECT_SETTINGS } from '@/types';
import { prisma, isDbConfigured } from './prisma';

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
    console.error('Error reading local file store:', error);
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
    console.error('Error writing local file store:', error);
  }
}

function mapDbProject(p: any): Project {
  return {
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    ownerId: p.ownerId || undefined,
    ownerEmail: p.ownerEmail || undefined,
    inviteToken: p.inviteToken,
    baselineRunId: p.baselineRunId,
    settings: p.settings as any,
    pages: (p.pages || []).map((pg: any) => ({
      id: pg.id,
      name: pg.name,
      path: pg.path,
    })),
    breakpoints: (p.breakpoints || []).map((bp: any) => ({
      id: bp.id,
      name: bp.name,
      width: bp.width,
      height: bp.height,
      icon: bp.icon as any,
    })),
    members: (p.members || []).map((m: any) => ({
      userId: m.userId || m.id,
      email: m.email,
      name: m.name || undefined,
      role: m.role as any,
      joinedAt: m.joinedAt.toISOString(),
    })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function mapDbRun(r: any): Run {
  return {
    id: r.id,
    projectId: r.projectId,
    createdAt: r.createdAt.toISOString(),
    status: r.status as any,
    isBaseline: r.isBaseline,
    totalChecks: r.totalChecks,
    passedChecks: r.passedChecks,
    changedChecks: r.changedChecks,
    newChecks: r.newChecks,
    screenshots: (r.screenshots || []).map((s: any) => ({
      id: s.id,
      pageId: s.pageId,
      pageName: s.pageName,
      pagePath: s.pagePath,
      breakpointId: s.breakpointId,
      breakpointName: s.breakpointName,
      width: s.width,
      height: s.height,
      fullUrl: s.fullUrl,
      imageData: s.imageBlob?.imageData || '',
      capturedAt: s.capturedAt.toISOString(),
    })),
    comparisons: (r.comparisons || []).map((c: any) => ({
      id: c.id,
      pageId: c.pageId,
      pageName: c.pageName,
      pagePath: c.pagePath,
      breakpointId: c.breakpointId,
      breakpointName: c.breakpointName,
      width: c.width,
      height: c.height,
      fullUrl: c.fullUrl,
      baselineImage: c.images?.baselineImage || undefined,
      currentImage: c.images?.currentImage || '',
      diffImage: c.images?.diffImage || undefined,
      diffPixelCount: c.diffPixelCount,
      totalPixelCount: c.totalPixelCount,
      diffPercentage: c.diffPercentage,
      status: c.status as any,
      errorMessage: c.errorMessage || undefined,
    })),
  };
}

export async function getProjects(userId?: string): Promise<Project[]> {
  if (isDbConfigured) {
    try {
      const dbProjects = await prisma.project.findMany({
        include: {
          pages: { orderBy: { order: 'asc' } },
          breakpoints: { orderBy: { order: 'asc' } },
          members: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const mapped = dbProjects.map(mapDbProject);

      if (!userId) {
        return mapped;
      }

      return mapped.filter((p) => {
        if (!p.ownerId) return true;
        if (p.ownerId === userId) return true;
        if (p.members?.some((m) => m.userId === userId)) return true;
        return false;
      });
    } catch (err) {
      console.error('Error fetching projects from PostgreSQL, falling back to local storage:', err);
    }
  }

  const data = readStore();
  if (!userId) {
    return data.projects;
  }

  return data.projects.filter((p) => {
    if (!p.ownerId) return true;
    if (p.ownerId === userId) return true;
    if (p.members?.some((m) => m.userId === userId)) return true;
    return false;
  });
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  if (isDbConfigured) {
    try {
      const p = await prisma.project.findUnique({
        where: { id },
        include: {
          pages: { orderBy: { order: 'asc' } },
          breakpoints: { orderBy: { order: 'asc' } },
          members: true,
        },
      });
      if (p) return mapDbProject(p);
    } catch (err) {
      console.error('Error fetching project by id from PostgreSQL:', err);
    }
  }

  const data = readStore();
  return data.projects.find((p) => p.id === id);
}

export async function getProjectByInviteToken(token: string): Promise<Project | undefined> {
  if (isDbConfigured) {
    try {
      const p = await prisma.project.findUnique({
        where: { inviteToken: token },
        include: {
          pages: { orderBy: { order: 'asc' } },
          breakpoints: { orderBy: { order: 'asc' } },
          members: true,
        },
      });
      if (p) return mapDbProject(p);
    } catch (err) {
      console.error('Error fetching project by inviteToken from PostgreSQL:', err);
    }
  }

  const data = readStore();
  return data.projects.find((p) => p.inviteToken === token);
}

export async function saveProject(project: Project): Promise<Project> {
  if (!project.inviteToken) {
    project.inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  if (!project.members) {
    project.members = [];
  }

  if (isDbConfigured) {
    try {
      await prisma.$transaction(async (tx) => {
        // Upsert project
        await tx.project.upsert({
          where: { id: project.id },
          create: {
            id: project.id,
            name: project.name,
            baseUrl: project.baseUrl,
            ownerId: project.ownerId || null,
            ownerEmail: project.ownerEmail || null,
            inviteToken: project.inviteToken!,
            baselineRunId: project.baselineRunId || null,
            settings: project.settings as any,
          },
          update: {
            name: project.name,
            baseUrl: project.baseUrl,
            ownerId: project.ownerId || null,
            ownerEmail: project.ownerEmail || null,
            baselineRunId: project.baselineRunId || null,
            settings: project.settings as any,
          },
        });

        // Sync pages
        await tx.projectPage.deleteMany({ where: { projectId: project.id } });
        if (project.pages && project.pages.length > 0) {
          await tx.projectPage.createMany({
            data: project.pages.map((pg, idx) => ({
              id: pg.id || `pg_${Date.now()}_${idx}`,
              projectId: project.id,
              name: pg.name,
              path: pg.path,
              order: idx,
            })),
          });
        }

        // Sync breakpoints
        await tx.breakpoint.deleteMany({ where: { projectId: project.id } });
        if (project.breakpoints && project.breakpoints.length > 0) {
          await tx.breakpoint.createMany({
            data: project.breakpoints.map((bp, idx) => ({
              id: bp.id || `bp_${Date.now()}_${idx}`,
              projectId: project.id,
              name: bp.name,
              width: bp.width,
              height: bp.height,
              icon: bp.icon || 'desktop',
              order: idx,
            })),
          });
        }
      });

      return project;
    } catch (err) {
      console.error('Error saving project to PostgreSQL, falling back to local file storage:', err);
    }
  }

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

export async function deleteProject(id: string): Promise<boolean> {
  if (isDbConfigured) {
    try {
      await prisma.project.delete({ where: { id } });
      return true;
    } catch (err) {
      console.error('Error deleting project from PostgreSQL:', err);
    }
  }

  const data = readStore();
  data.projects = data.projects.filter((p) => p.id !== id);
  data.runs = data.runs.filter((r) => r.projectId !== id);
  writeStore(data);
  return true;
}

export async function addProjectMember(
  projectId: string,
  member: { userId?: string; email: string; name?: string; role: 'owner' | 'editor' | 'viewer' }
): Promise<Project | null> {
  if (isDbConfigured) {
    try {
      const cleanEmail = member.email.toLowerCase().trim();
      await prisma.projectMember.upsert({
        where: {
          projectId_email: {
            projectId,
            email: cleanEmail,
          },
        },
        create: {
          projectId,
          userId: member.userId || null,
          email: cleanEmail,
          name: member.name || cleanEmail.split('@')[0],
          role: member.role,
        },
        update: {
          role: member.role,
          name: member.name || undefined,
          userId: member.userId || undefined,
        },
      });

      return await getProjectById(projectId) || null;
    } catch (err) {
      console.error('Error adding project member to PostgreSQL:', err);
    }
  }

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

export async function removeProjectMember(projectId: string, memberEmailOrId: string): Promise<Project | null> {
  if (isDbConfigured) {
    try {
      await prisma.projectMember.deleteMany({
        where: {
          projectId,
          OR: [
            { userId: memberEmailOrId },
            { email: memberEmailOrId.toLowerCase() },
          ],
        },
      });
      return await getProjectById(projectId) || null;
    } catch (err) {
      console.error('Error removing project member in PostgreSQL:', err);
    }
  }

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

export async function getRunsByProjectId(projectId: string): Promise<Run[]> {
  if (isDbConfigured) {
    try {
      const dbRuns = await prisma.run.findMany({
        where: { projectId },
        include: {
          screenshots: {
            include: { imageBlob: true },
          },
          comparisons: {
            include: { images: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return dbRuns.map(mapDbRun);
    } catch (err) {
      console.error('Error getting runs from PostgreSQL:', err);
    }
  }

  const data = readStore();
  return data.runs
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getRunById(runId: string, includeImages = true): Promise<Run | undefined> {
  if (isDbConfigured) {
    try {
      const r = await prisma.run.findUnique({
        where: { id: runId },
        include: {
          screenshots: includeImages ? { include: { imageBlob: true } } : true,
          comparisons: includeImages ? { include: { images: true } } : true,
        },
      });
      if (r) return mapDbRun(r);
    } catch (err) {
      console.error('Error getting run by id from PostgreSQL:', err);
    }
  }

  const data = readStore();
  return data.runs.find((r) => r.id === runId);
}

export async function saveRun(run: Run): Promise<Run> {
  if (isDbConfigured) {
    try {
      await prisma.$transaction(async (tx) => {
        // Upsert Run
        await tx.run.upsert({
          where: { id: run.id },
          create: {
            id: run.id,
            projectId: run.projectId,
            createdAt: new Date(run.createdAt),
            status: run.status,
            isBaseline: run.isBaseline,
            totalChecks: run.totalChecks,
            passedChecks: run.passedChecks,
            changedChecks: run.changedChecks,
            newChecks: run.newChecks,
          },
          update: {
            status: run.status,
            isBaseline: run.isBaseline,
            totalChecks: run.totalChecks,
            passedChecks: run.passedChecks,
            changedChecks: run.changedChecks,
            newChecks: run.newChecks,
          },
        });

        // Insert / Upsert Screenshots
        for (const s of run.screenshots) {
          await tx.screenshot.upsert({
            where: { id: s.id },
            create: {
              id: s.id,
              runId: run.id,
              pageId: s.pageId,
              pageName: s.pageName,
              pagePath: s.pagePath,
              breakpointId: s.breakpointId,
              breakpointName: s.breakpointName,
              width: s.width,
              height: s.height,
              fullUrl: s.fullUrl,
              capturedAt: new Date(s.capturedAt),
              imageBlob: s.imageData
                ? {
                    create: {
                      imageData: s.imageData,
                    },
                  }
                : undefined,
            },
            update: {
              width: s.width,
              height: s.height,
              imageBlob: s.imageData
                ? {
                    upsert: {
                      create: { imageData: s.imageData },
                      update: { imageData: s.imageData },
                    },
                  }
                : undefined,
            },
          });
        }

        // Insert / Upsert Comparisons
        for (const c of run.comparisons) {
          await tx.comparisonItem.upsert({
            where: { id: c.id },
            create: {
              id: c.id,
              runId: run.id,
              pageId: c.pageId,
              pageName: c.pageName,
              pagePath: c.pagePath,
              breakpointId: c.breakpointId,
              breakpointName: c.breakpointName,
              width: c.width,
              height: c.height,
              fullUrl: c.fullUrl,
              diffPixelCount: c.diffPixelCount,
              totalPixelCount: c.totalPixelCount,
              diffPercentage: c.diffPercentage,
              status: c.status,
              errorMessage: c.errorMessage || null,
              images: {
                create: {
                  baselineImage: c.baselineImage || null,
                  currentImage: c.currentImage,
                  diffImage: c.diffImage || null,
                },
              },
            },
            update: {
              diffPixelCount: c.diffPixelCount,
              totalPixelCount: c.totalPixelCount,
              diffPercentage: c.diffPercentage,
              status: c.status,
              errorMessage: c.errorMessage || null,
              images: {
                upsert: {
                  create: {
                    baselineImage: c.baselineImage || null,
                    currentImage: c.currentImage,
                    diffImage: c.diffImage || null,
                  },
                  update: {
                    baselineImage: c.baselineImage || null,
                    currentImage: c.currentImage,
                    diffImage: c.diffImage || null,
                  },
                },
              },
            },
          });
        }
      });

      return run;
    } catch (err) {
      console.error('Error saving run to PostgreSQL, falling back to local file storage:', err);
    }
  }

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

export async function setProjectBaselineRun(projectId: string, runId: string): Promise<boolean> {
  if (isDbConfigured) {
    try {
      await prisma.$transaction(async (tx) => {
        // Set project baselineRunId
        await tx.project.update({
          where: { id: projectId },
          data: { baselineRunId: runId },
        });

        // Set isBaseline flags
        await tx.run.updateMany({
          where: { projectId },
          data: { isBaseline: false },
        });

        await tx.run.update({
          where: { id: runId },
          data: { isBaseline: true },
        });

        // Fetch the newly promoted baseline run's screenshots
        const baselineScreenshots = await tx.screenshot.findMany({
          where: { runId },
          include: { imageBlob: true },
        });

        // Update the baseline run itself: baselineImage becomes currentImage, diff is 0, status is identical
        const baselineComparisons = await tx.comparisonItem.findMany({
          where: { runId },
          include: { images: true },
        });

        for (const c of baselineComparisons) {
          if (c.images) {
            await tx.comparisonImages.update({
              where: { comparisonId: c.id },
              data: {
                baselineImage: c.images.currentImage,
                diffImage: null,
              },
            });
          }
          await tx.comparisonItem.update({
            where: { id: c.id },
            data: {
              diffPixelCount: 0,
              diffPercentage: 0,
              status: 'identical',
              errorMessage: null,
            },
          });
        }

        await tx.run.update({
          where: { id: runId },
          data: {
            passedChecks: baselineComparisons.length,
            changedChecks: 0,
            newChecks: 0,
          },
        });

        // Update other runs in this project to point to the newly promoted baseline's images
        const otherRuns = await tx.run.findMany({
          where: { projectId, id: { not: runId } },
          include: {
            comparisons: {
              include: { images: true },
            },
          },
        });

        for (const r of otherRuns) {
          for (const c of r.comparisons) {
            const match = baselineScreenshots.find(
              (s) =>
                (s.pageId === c.pageId || s.pagePath === c.pagePath) &&
                (s.breakpointId === c.breakpointId || s.width === c.width)
            );
            if (match?.imageBlob?.imageData && c.images) {
              await tx.comparisonImages.update({
                where: { comparisonId: c.id },
                data: {
                  baselineImage: match.imageBlob.imageData,
                },
              });
            }
          }
        }
      });

      return true;
    } catch (err) {
      console.error('Error promoting baseline run in PostgreSQL:', err);
    }
  }

  const data = readStore();
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return false;

  project.baselineRunId = runId;
  project.updatedAt = new Date().toISOString();

  const baselineRun = data.runs.find((r) => r.id === runId && r.projectId === projectId);

  data.runs.forEach((r) => {
    if (r.projectId === projectId) {
      const isThisBaseline = r.id === runId;
      r.isBaseline = isThisBaseline;

      if (isThisBaseline) {
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

/**
 * Script to migrate existing local JSON data (.visual-analizar/data.json)
 * into PostgreSQL via Prisma.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." node scripts/migrate-local-to-postgres.js
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DATA_FILE = path.join(process.cwd(), '.visual-analizar', 'data.json');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not defined.');
    process.exit(1);
  }

  if (!fs.existsSync(DATA_FILE)) {
    console.log(`No local data file found at ${DATA_FILE}. Nothing to migrate.`);
    return;
  }

  console.log(`Reading local data from ${DATA_FILE}...`);
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);

  const users = data.users || [];
  const projects = data.projects || [];
  const runs = data.runs || [];

  console.log(`Found ${users.length} users, ${projects.length} projects, and ${runs.length} runs to migrate.`);

  // 1. Migrate Users
  console.log('\n--- Migrating Users ---');
  for (const u of users) {
    try {
      await prisma.user.upsert({
        where: { email: u.email.toLowerCase().trim() },
        create: {
          id: u.id,
          email: u.email.toLowerCase().trim(),
          name: u.name,
          passwordHash: u.passwordHash,
          createdAt: new Date(u.createdAt || Date.now()),
        },
        update: {
          name: u.name,
          passwordHash: u.passwordHash,
        },
      });
      console.log(`✓ User migrated: ${u.email}`);
    } catch (err) {
      console.error(`✗ Error migrating user ${u.email}:`, err.message);
    }
  }

  // 2. Migrate Projects
  console.log('\n--- Migrating Projects ---');
  for (const p of projects) {
    try {
      let ownerId = p.ownerId || null;
      let ownerEmail = p.ownerEmail || null;
      if (!ownerId) {
        if (p.name.toLowerCase().includes('walmart')) {
          ownerId = 'usr_1790363272089_q70eq';
          ownerEmail = 'francisco.deskmultimedia@gmail.com';
        } else {
          ownerId = 'usr_1790282476672_61j9b';
          ownerEmail = 'demo@visualanalizar.com';
        }
      }

      await prisma.project.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          name: p.name,
          baseUrl: p.baseUrl,
          ownerId,
          ownerEmail,
          inviteToken: p.inviteToken || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          baselineRunId: p.baselineRunId || null,
          settings: p.settings,
          createdAt: new Date(p.createdAt || Date.now()),
          updatedAt: new Date(p.updatedAt || Date.now()),
        },
        update: {
          name: p.name,
          baseUrl: p.baseUrl,
          ownerId,
          ownerEmail,
          baselineRunId: p.baselineRunId || null,
          settings: p.settings,
        },
      });

      // Pages
      await prisma.projectPage.deleteMany({ where: { projectId: p.id } });
      if (p.pages && p.pages.length > 0) {
        await prisma.projectPage.createMany({
          data: p.pages.map((pg, idx) => ({
            id: pg.id?.startsWith(p.id) ? pg.id : `${p.id}_${pg.id || idx}`,
            projectId: p.id,
            name: pg.name,
            path: pg.path,
            order: idx,
          })),
        });
      }

      // Breakpoints
      await prisma.breakpoint.deleteMany({ where: { projectId: p.id } });
      if (p.breakpoints && p.breakpoints.length > 0) {
        await prisma.breakpoint.createMany({
          data: p.breakpoints.map((bp, idx) => ({
            id: bp.id?.startsWith(p.id) ? bp.id : `${p.id}_${bp.id || idx}`,
            projectId: p.id,
            name: bp.name,
            width: bp.width,
            height: bp.height,
            icon: bp.icon || 'desktop',
            order: idx,
          })),
        });
      }

      // Members
      const membersList = p.members && p.members.length > 0 ? [...p.members] : [];
      if (ownerId && ownerEmail && !membersList.some((m) => m.email.toLowerCase() === ownerEmail.toLowerCase())) {
        membersList.push({
          userId: ownerId,
          email: ownerEmail,
          name: ownerEmail === 'francisco.deskmultimedia@gmail.com' ? 'Francisco Cornejo' : 'Demo User',
          role: 'owner',
          joinedAt: new Date(p.createdAt || Date.now()).toISOString(),
        });
      }

      for (const m of membersList) {
        await prisma.projectMember.upsert({
          where: {
            projectId_email: {
              projectId: p.id,
              email: m.email.toLowerCase().trim(),
            },
          },
          create: {
            projectId: p.id,
            userId: m.userId || null,
            email: m.email.toLowerCase().trim(),
            name: m.name || null,
            role: m.role || 'viewer',
            joinedAt: new Date(m.joinedAt || Date.now()),
          },
          update: {
            role: m.role || 'viewer',
          },
        });
      }

      console.log(`✓ Project migrated: ${p.name} (${p.pages?.length || 0} pages, ${p.breakpoints?.length || 0} breakpoints)`);
    } catch (err) {
      console.error(`✗ Error migrating project ${p.name}:`, err.message);
    }
  }

  // 3. Migrate Runs
  console.log('\n--- Migrating Runs and Screenshots ---');
  for (const r of runs) {
    try {
      // Ensure project exists
      const projectExists = await prisma.project.findUnique({ where: { id: r.projectId } });
      if (!projectExists) {
        console.warn(`Skipping run ${r.id} because parent project ${r.projectId} was not found.`);
        continue;
      }

      await prisma.run.upsert({
        where: { id: r.id },
        create: {
          id: r.id,
          projectId: r.projectId,
          createdAt: new Date(r.createdAt || Date.now()),
          status: r.status || 'completed',
          isBaseline: Boolean(r.isBaseline),
          totalChecks: r.totalChecks || 0,
          passedChecks: r.passedChecks || 0,
          changedChecks: r.changedChecks || 0,
          newChecks: r.newChecks || 0,
        },
        update: {
          isBaseline: Boolean(r.isBaseline),
          totalChecks: r.totalChecks || 0,
          passedChecks: r.passedChecks || 0,
          changedChecks: r.changedChecks || 0,
          newChecks: r.newChecks || 0,
        },
      });

      // Migrate screenshots with image blobs
      for (const s of r.screenshots || []) {
        await prisma.screenshot.upsert({
          where: { id: s.id },
          create: {
            id: s.id,
            runId: r.id,
            pageId: s.pageId,
            pageName: s.pageName,
            pagePath: s.pagePath,
            breakpointId: s.breakpointId,
            breakpointName: s.breakpointName,
            width: s.width,
            height: s.height,
            fullUrl: s.fullUrl,
            capturedAt: new Date(s.capturedAt || Date.now()),
            imageBlob: s.imageData ? { create: { imageData: s.imageData } } : undefined,
          },
          update: {
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

      // Migrate comparisons with image blobs
      for (const c of r.comparisons || []) {
        await prisma.comparisonItem.upsert({
          where: { id: c.id },
          create: {
            id: c.id,
            runId: r.id,
            pageId: c.pageId,
            pageName: c.pageName,
            pagePath: c.pagePath,
            breakpointId: c.breakpointId,
            breakpointName: c.breakpointName,
            width: c.width,
            height: c.height,
            fullUrl: c.fullUrl,
            diffPixelCount: c.diffPixelCount || 0,
            totalPixelCount: c.totalPixelCount || 0,
            diffPercentage: c.diffPercentage || 0,
            status: c.status || 'identical',
            errorMessage: c.errorMessage || null,
            images: {
              create: {
                baselineImage: c.baselineImage || null,
                currentImage: c.currentImage || '',
                diffImage: c.diffImage || null,
              },
            },
          },
          update: {
            diffPixelCount: c.diffPixelCount || 0,
            totalPixelCount: c.totalPixelCount || 0,
            diffPercentage: c.diffPercentage || 0,
            status: c.status || 'identical',
            images: {
              upsert: {
                create: {
                  baselineImage: c.baselineImage || null,
                  currentImage: c.currentImage || '',
                  diffImage: c.diffImage || null,
                },
                update: {
                  baselineImage: c.baselineImage || null,
                  currentImage: c.currentImage || '',
                  diffImage: c.diffImage || null,
                },
              },
            },
          },
        });
      }

      console.log(`✓ Run migrated: ${r.id} (${r.comparisons?.length || 0} comparisons)`);
    } catch (err) {
      console.error(`✗ Error migrating run ${r.id}:`, err.message);
    }
  }

  console.log('\n🎉 Migration to PostgreSQL completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

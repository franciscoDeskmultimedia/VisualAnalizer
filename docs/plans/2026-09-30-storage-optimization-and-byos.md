# Storage Optimization, WebP Compression & User BYOS Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate PostgreSQL storage exhaustion by compressing screenshots with WebP, deduplicating diff images, implementing automated run retention pruning, and providing a "Bring Your Own Storage" (BYOS) S3/Cloudflare R2 connection in Project Settings.

**Architecture:** A unified storage provider layer (`src/lib/storage-provider.ts`) abstracts image storage between compressed database base64 and external S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, Supabase). Project settings store the user's storage config securely in the project's JSON settings column. During test runs, screenshots and diffs are compressed to high-efficiency WebP using `sharp`, uploaded through the storage provider, and older test runs are automatically pruned according to the project's retention policy.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Sharp (native WebP compression), `@aws-sdk/client-s3` (S3 compatible client), Prisma 6, Tailwind CSS 4.

---

### Task 1: Install AWS SDK S3 Client

**Files:**
- Modify: `package.json`

**Step 1: Install package**
Run: `npm install @aws-sdk/client-s3`

**Step 2: Verify installation**
Run: `node -e "require('@aws-sdk/client-s3'); console.log('S3 Client ready');"`
Expected: "S3 Client ready"

---

### Task 2: Update Types for Storage & Retention Settings

**Files:**
- Modify: `src/types/index.ts:30-50`

**Step 1: Add S3Config and StorageSettings types**
```typescript
export interface S3StorageConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;         // e.g. for Cloudflare R2, MinIO, or Supabase
  publicUrlPrefix?: string;  // e.g. https://cdn.example.com
}

export interface ProjectSettings {
  waitTimeMs: number;
  fullPage: boolean;
  diffThreshold: number;
  diffColor: string;
  // Storage & retention additions
  storageProvider?: 'database' | 's3';
  s3Config?: S3StorageConfig;
  retentionRunsCount?: number; // default: 15
  imageFormat?: 'webp' | 'png'; // default: 'webp'
  imageQuality?: number; // 50-100, default: 80
}
```

**Step 2: Update `DEFAULT_PROJECT_SETTINGS` in `src/types/index.ts`**
Include:
```typescript
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  waitTimeMs: 1000,
  fullPage: true,
  diffThreshold: 0.1,
  diffColor: '#ef4444',
  storageProvider: 'database',
  retentionRunsCount: 15,
  imageFormat: 'webp',
  imageQuality: 80,
};
```

---

### Task 3: Image Processing & Compression Service

**Files:**
- Create: `src/lib/image-processing.ts`

**Step 1: Implement WebP conversion and buffer utilities using sharp**
- `compressToWebp(buffer: Buffer, quality = 80): Promise<Buffer>`
- `ensureWebpDataUri(input: string | Buffer, quality = 80): Promise<string>`
- `bufferToDataUri(buffer: Buffer, mimeType: string): string`

**Step 2: Add quick unit validation script to verify compression ratio**
Verify that a raw PNG converts to WebP and yields 70-85% size reduction.

---

### Task 4: Storage Provider Layer (Database vs S3/R2)

**Files:**
- Create: `src/lib/storage-provider.ts`

**Step 1: Implement S3 connection tester and uploader**
- `testS3Connection(config: S3StorageConfig): Promise<{ success: boolean; error?: string }>`
- `uploadRunImage(options: { projectId: string; runId: string; filename: string; buffer: Buffer; mimeType: string; settings: ProjectSettings }): Promise<string>`
  - If `settings.storageProvider === 's3'` and `settings.s3Config` has bucket and keys:
    - Uses `S3Client` with endpoint and credentials.
    - Sends `PutObjectCommand`.
    - Returns public URL or CDN URL.
  - Else:
    - Returns `data:${mimeType};base64,...`

---

### Task 5: Automated Run Retention & Pruning

**Files:**
- Modify: `src/lib/storage.ts`

**Step 1: Implement `pruneOldRuns(projectId: string, retentionCount: number): Promise<number>`**
- In PostgreSQL:
  - Query all runs for the project ordered by `createdAt desc`.
  - Exclude baseline run (`isBaseline: true` or `project.baselineRunId`).
  - For runs beyond the `retentionCount` threshold, delete associated `ScreenshotImage` and `ComparisonImages` blobs or delete the old runs.
- In Local JSON storage:
  - Prune `data.runs` for the project beyond `retentionCount`.

**Step 2: Optimize comparison saving**
- In `saveRun`, skip saving `diffImage` when `c.status === 'identical'` or `c.diffPixelCount === 0`.
- Call `pruneOldRuns` automatically after saving a run.

---

### Task 6: Storage Test API Endpoint

**Files:**
- Create: `src/app/api/projects/[id]/storage/test/route.ts`

**Step 1: Handle POST request**
- Receive `s3Config` in request body.
- Call `testS3Connection(s3Config)`.
- Return `{ success: true, message: "Connected successfully to bucket <bucket>" }` or `{ success: false, error: err.message }`.

---

### Task 7: Project Settings UI — "Storage & Retention" Tab

**Files:**
- Modify: `src/components/ProjectSettingsModal.tsx`

**Step 1: Add 'storage' tab to active tab state**
- Tab icons & label: Database / Cloud icon ("Storage & Retention")

**Step 2: Storage Configuration UI Controls**
- **Storage Provider Selector**: Toggle between "PostgreSQL (Default)" and "Custom S3 / Cloudflare R2 (BYOS)".
- **When S3 Selected**:
  - Provider presets helper: "AWS S3", "Cloudflare R2", "Supabase Storage", "MinIO".
  - Inputs for:
    - Bucket Name
    - Region (e.g. `us-east-1` or `auto`)
    - Endpoint URL (optional, for Cloudflare R2 / MinIO)
    - Access Key ID
    - Secret Access Key
    - Public / CDN URL Prefix
  - "Test Connection" button with live status badge (testing, success, error).
- **Run Retention Policy**:
  - Number input / presets: Keep 10, 15, 25, 50 runs.
  - Explanation: "Automatically frees image storage from older test runs while preserving test history and baseline."
- **Image Compression Setting**:
  - Image Format: WebP (Recommended, ~80% smaller) vs Lossless PNG.
  - Quality slider: 60% - 100% (default 80%).

---

### Task 8: Integrate Compression & Storage Provider into Run Capture Pipeline

**Files:**
- Modify: `src/app/api/projects/[id]/runs/route.ts`
- Modify: `src/lib/screenshot.ts`

**Step 1: Integrate WebP compression in screenshot capture and comparison saving**
- Use WebP format by default based on project settings.
- Upload images through `uploadRunImage`.
- Return URLs or lightweight data URIs to the client.

---

### Task 9: Verification & Testing

**Step 1: Test WebP compression savings**
- Run a comparison test and verify image size reduction.
**Step 2: Test Retention Pruning**
- Verify that older runs have their image blobs safely pruned without breaking history.
**Step 3: Test S3 Configuration & Connection Endpoint**
- Validate that the S3 test endpoint handles valid and invalid credentials properly.

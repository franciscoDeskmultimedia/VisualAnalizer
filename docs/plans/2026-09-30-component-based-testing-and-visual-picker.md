# Component-Based Visual Regression Testing & Interactive Element Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to select specific DOM components on any page (via an interactive visual point-and-click picker or CSS selector), test their interactive states (`default`, `hover`, `active`, `focus`), and run isolated, zero-flakiness visual regression comparisons alongside full-page tests.

**Architecture:** 
1. **Data Model**: Project pages can optionally have `components: PageComponent[]`, where each component specifies a CSS selector, display name, and states to test. Comparisons and screenshots store component metadata (`isComponent`, `componentName`, `componentState`).
2. **Visual Inspector & Proxy**: An inspection endpoint (`/api/projects/[id]/inspect`) proxies the target webpage with stripped frame-ancestors/CSP headers and injects a visual highlighter script that communicates with an interactive element picker modal via `postMessage`.
3. **Capture Engine**: Puppeteer element-level capture (`elementHandle.screenshot`) with simulated user actions (`page.hover`, `page.focus`, mouse down) to capture states cropped exactly to the component's bounding box in compressed WebP format.
4. **Viewer & Filtering**: Comparison Grid and Viewer UI gain component state badges (`[:hover]`, `[:active]`) and filter tabs ("All Checks", "Full Pages", "Components").

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Puppeteer, Sharp, Prisma 6 (PostgreSQL / Neon), Tailwind CSS 4, Lucide icons.

---

### Task 1: Data Model & Type Definitions

**Files:**
- Modify: `prisma/schema.prisma:55-154`
- Modify: `src/types/index.ts:1-120`
- Modify: `src/lib/storage.ts`

**Step 1: Update `src/types/index.ts`**
```typescript
export type ComponentState = 'default' | 'hover' | 'active' | 'focus';

export interface PageComponent {
  id: string;
  name: string;             // e.g. "Primary CTA Button", "Navigation Bar"
  selector: string;         // e.g. "button.hero-cta", "#main-nav"
  states: ComponentState[]; // e.g. ['default', 'hover', 'active']
}

export interface ProjectPage {
  id: string;
  name: string;
  path: string;
  components?: PageComponent[];
}

export interface Screenshot {
  // ... existing fields
  isComponent?: boolean;
  componentId?: string;
  componentName?: string;
  componentState?: ComponentState;
}

export interface ComparisonItem {
  // ... existing fields
  isComponent?: boolean;
  componentId?: string;
  componentName?: string;
  componentState?: ComponentState;
}
```

**Step 2: Update `prisma/schema.prisma`**
- Add `components Json?` or `PageComponent` model linked to `ProjectPage`.
- Add `isComponent Boolean @default(false)`, `componentName String?`, `componentState String?` to `Screenshot` and `ComparisonItem`.

**Step 3: Run Database Migration**
Run: `npx prisma db push`
Expected: Database synchronized and Prisma Client regenerated.

---

### Task 2: Puppeteer Component & State Capture Engine

**Files:**
- Modify: `src/lib/screenshot.ts`

**Step 1: Implement `captureComponentState`**
```typescript
export interface CaptureComponentOptions {
  url: string;
  width: number;
  height: number;
  selector: string;
  state: 'default' | 'hover' | 'active' | 'focus';
  waitTimeMs?: number;
}

export async function captureComponentState(options: CaptureComponentOptions): Promise<{
  imageData: string; // base64 or URL
  width: number;
  height: number;
}>
```
- Launches Puppeteer with specified viewport (`width`, `height`).
- Navigates to `url` with `networkidle2`.
- Waits for `selector` to be visible (`page.waitForSelector(selector, { timeout: 8000 })`).
- If `state === 'hover'`: runs `await page.hover(selector); await delay(150);`.
- If `state === 'focus'`: runs `await page.focus(selector); await delay(100);`.
- If `state === 'active'`: moves mouse to element center and fires `await page.mouse.down(); await delay(100);`.
- Captures element screenshot:
  `const buffer = await elementHandle.screenshot({ type: 'webp', quality: 80 });`
- Returns image buffer and dimensions.

---

### Task 3: Live Visual Inspector & Proxy API

**Files:**
- Create: `src/app/api/projects/[id]/inspect/route.ts`

**Step 1: Implement the Web Inspection Proxy**
- Receives target URL and page path.
- Fetches HTML from the live site.
- Rewrites `<base href="...">` and relative resources so images/CSS load properly.
- Strips frame-busting scripts and CSP / X-Frame-Options headers.
- Injects an interactive inspector script into the `<head>`:
  - On `mouseover`: adds glowing outline and tooltip with tag + class name (`button.btn-primary`).
  - On `click`: cancels default link navigation, calculates the unique CSS selector path (e.g. `header > div > button.cta`), and sends `window.parent.postMessage({ type: 'ELEMENT_SELECTED', selector, tagName, text, innerHtml }, '*')`.

---

### Task 4: Interactive Element Picker Modal UI

**Files:**
- Create: `src/components/ElementPickerModal.tsx`
- Modify: `src/components/ProjectSettingsModal.tsx`

**Step 1: Create `ElementPickerModal.tsx`**
- Visual modal displaying the interactive preview of the page inside an iframe via `/api/projects/[id]/inspect?url=...`.
- Responsive viewport toggles (Desktop 1440px, Tablet 768px, Mobile 375px).
- Bottom inspector drawer showing:
  - Selected Element: `button.hero-cta`
  - Suggested Name: "Button: Start Free Trial"
  - Interactive States Checkboxes: `[x] Default`, `[x] Hover`, `[x] Active`, `[x] Focus`
  - "Confirm & Save Component" button.

**Step 2: Update `ProjectSettingsModal.tsx`**
- In the "Inner Pages" tab, add an expandable component management section for each page:
  - Displays count badge: `2 components configured`.
  - Button: **"🎯 Pick Element from Live Page"** (opens `ElementPickerModal`).
  - Button: **"+ Manual CSS Selector"**.
  - List of configured components with badge tags for active states (`:hover`, `:active`, `:focus`) and remove button.

---

### Task 5: Integrate Component Runs into Capture & Diff Engine

**Files:**
- Modify: `src/app/api/projects/[id]/runs/route.ts`
- Modify: `src/lib/storage.ts`

**Step 1: Run execution logic in `route.ts`**
- For each page:
  - Capture full-page screenshot & diff (existing logic).
  - If `page.components && page.components.length > 0`:
    - For each component:
      - For each state (`default`, `hover`, etc.):
        - Capture component state across breakpoints via `captureComponentState`.
        - Compress with WebP & upload via `uploadRunImage`.
        - Compare against matching component state in `baselineRun`.
        - Push comparison item with `isComponent: true`, `componentName`, `componentState`.

---

### Task 6: Comparison Grid & Viewer Component Badges

**Files:**
- Modify: `src/components/ComparisonGrid.tsx`
- Modify: `src/components/ComparisonViewer.tsx`

**Step 1: Filtering & Presentation**
- Add filter tabs in `ComparisonGrid.tsx`:
  - `All Checks (${total})`
  - `Full Pages (${pageChecksCount})`
  - `Components (${componentChecksCount})`
- Display component badges on comparison cards:
  - `[Component]` badge in purple/indigo.
  - `[:hover]` / `[:active]` / `[:focus]` badge in amber/emerald.
- In `ComparisonViewer.tsx`:
  - Proper scaling / centering for small cropped component images so buttons and cards look sharp without being stretched across full viewport width.

---

### Task 7: Verification & End-to-End Testing

**Step 1: Run TypeScript compiler and production build**
- `npx tsc --noEmit`
- `npm run build`

**Step 2: Functional verification**
- Verify adding a component manually via CSS selector.
- Verify element picking via inspection proxy.
- Verify capturing `:hover` and `:active` states in a test run.

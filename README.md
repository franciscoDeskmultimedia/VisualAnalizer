# VisualAnalizar 🔍

**Automated Multi-Device Visual Regression Testing & Full-Page Comparison Engine** built with **Next.js (App Router)**, **Tailwind CSS**, and **Pixelmatch**.

VisualAnalizar allows you to save web projects (e.g. `example.com`), configure a list of inner routes (`/`, `/pricing`, `/about`, etc.), capture pixel-perfect screenshots across user-configurable breakpoints (**Desktop**, **Tablet**, **Mobile**, and custom resolutions), set baseline references, and automatically detect visual regressions anywhere on the page—including far below the fold.

---

## 🌟 Key Features test

- 📁 **Multi-Project Management**:
  - Save different projects with their base domain (e.g. `https://example.com`, `https://stripe.com`).
  - Configure any list of inner pages to be monitored.
  - Export and import project configurations as JSON.

- 📱 **User-Configurable Responsive Breakpoints**:
  - **Desktop**: e.g., 1440×900, 1920×1080 (customizable width and height in px).
  - **Tablet**: e.g., 768×1024, 1024×1366.
  - **Mobile**: e.g., 375×812, 393×852.
  - Add any custom breakpoint or viewport resolution.

- 📜 **Full-Page & Below-the-Fold Scrolling Comparisons**:
  - Automatically scrolls down the page before capture to trigger dynamic lazy loading, intersection observers, and below-the-fold assets.
  - Captures the complete, full-length document height (header down to footer).
  - **Synchronized Scrolling**: Dual panes scroll together in lockstep in side-by-side mode.
  - **Sticky Comparison Controls**: Pinned status badges and floating scrubber bar so you can swipe between Baseline and Current at any scroll depth.
  - Quick jump buttons (`Top`, `50%`, `Bottom`) to easily navigate tall full-page captures.

- 🎯 **Baseline Management**:
  - Set any run as the **Default / Base Reference**.
  - Subsequent runs automatically compare against this baseline.
  - Promote any new run to become the new baseline with a single click.

- 🔬 **4 Interactive Comparison Modes**:
  1. **Split Slider (2-Up Swipe)**: Drag a vertical divider bar with cursor or touch to inspect exact changes.
  2. **Side-by-Side (2-Up)**: Dual simulated browser windows with synchronized scrolling.
  3. **Diff Heatmap**: Highlights modified pixels in vibrant red with exact pixel mismatch count and percentage.
  4. **Onion Skin**: Smooth 0% to 100% opacity slider overlay.

- ⚡ **Vercel-Ready & Serverless Compatible**:
  - Puppeteer with local Chrome for fast local development.
  - Serverless Chromium (`@sparticuz/chromium` + `puppeteer-core`) with automatic fallback to high-fidelity screenshot service for seamless deployment on Vercel without bundle size limits.

---

## 🚀 Getting Started

### 1. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Running a Visual Check

1. Select or create a project from the top dropdown.
2. Click **Settings** to add inner routes or tweak your Desktop / Tablet / Mobile breakpoints.
3. Click **Run Visual Check**.
4. The initial run is automatically saved as your **Baseline**.
5. On subsequent checks, the system compares against the baseline and reveals all visual diffs!

---

## 🗄️ Persistent Database Setup (PostgreSQL with Prisma)

VisualAnalizar uses **Prisma ORM** with **PostgreSQL** (e.g. Neon, Vercel Postgres, Supabase) for persistent user authentication, projects, breakpoints, and test runs across Vercel serverless deployments.

### 1. Environment Variables

Create a `.env` (or set environment variables in Vercel):

```env
# Pooled connection string (Neon / Vercel Postgres / Supabase PgBouncer)
DATABASE_URL="postgres://user:password@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Direct connection string for migrations (required if using connection pooler)
DIRECT_URL="postgres://user:password@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Random secret key for signing user session tokens
AUTH_SECRET="your-super-secret-random-key"
```

### 2. Push Schema to Database

```bash
# Push Prisma schema directly to your PostgreSQL database
npm run db:push
```

### 3. (Optional) Import Existing Local Data into PostgreSQL

If you already have existing local runs and projects in `.visual-analizar/data.json`, import them into your PostgreSQL database with:

```bash
npm run db:import
```

---

## ☁️ Deploying to Vercel

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: add persistent PostgreSQL with Prisma"
   git push origin main
   ```
2. Import the project into [Vercel](https://vercel.com/new).
3. Under **Environment Variables**, add:
   - `DATABASE_URL` (from Neon / Vercel Postgres / Supabase)
   - `DIRECT_URL` (optional, for migrations)
   - `AUTH_SECRET`
4. Click **Deploy**. Vercel will automatically run `prisma generate` during `postinstall`!

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database & ORM**: PostgreSQL + Prisma ORM (with lazy-loaded screenshot image blobs)
- **Styling**: Tailwind CSS
- **Comparison Engine**: `pixelmatch` + `pngjs`
- **Headless Browser**: `puppeteer-core` & `@sparticuz/chromium`
- **Icons**: Lucide React

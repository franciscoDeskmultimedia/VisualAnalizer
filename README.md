# VisualAnalizar 🔍

**Automated Multi-Device Visual Regression Testing & Full-Page Comparison Engine** built with **Next.js (App Router)**, **Tailwind CSS**, and **Pixelmatch**.

VisualAnalizar allows you to save web projects (e.g. `example.com`), configure a list of inner routes (`/`, `/pricing`, `/about`, etc.), capture pixel-perfect screenshots across user-configurable breakpoints (**Desktop**, **Tablet**, **Mobile**, and custom resolutions), set baseline references, and automatically detect visual regressions anywhere on the page—including far below the fold.

---

## 🌟 Key Features

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

## ☁️ Deploying to Vercel

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit for VisualAnalizar"
   git push origin main
   ```
2. Import the project into [Vercel](https://vercel.com/new).
3. Framework preset: **Next.js**.
4. Click **Deploy**. No additional environment variables required!

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS
- **Comparison Engine**: `pixelmatch` + `pngjs`
- **Headless Browser**: `puppeteer-core` & `@sparticuz/chromium`
- **Icons**: Lucide React

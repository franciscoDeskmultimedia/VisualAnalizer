export interface Breakpoint {
  id: string;
  name: string;
  width: number;
  height: number;
  icon?: 'desktop' | 'tablet' | 'smartphone';
}

export interface ProjectPage {
  id: string;
  name: string;
  path: string;
}

export interface ProjectSettings {
  waitTimeMs: number;
  fullPage: boolean;
  diffThreshold: number; // 0.05 to 0.5 (sensitivity)
  diffColor: string; // e.g. '#ff0055' or 'magenta'
}

export interface Project {
  id: string;
  name: string;
  baseUrl: string;
  pages: ProjectPage[];
  breakpoints: Breakpoint[];
  baselineRunId?: string | null;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Screenshot {
  id: string;
  pageId: string;
  pageName: string;
  pagePath: string;
  breakpointId: string;
  breakpointName: string;
  width: number;
  height: number;
  fullUrl: string;
  imageData: string; // base64 data URI (data:image/png;base64,...)
  capturedAt: string;
}

export interface ComparisonItem {
  id: string;
  pageId: string;
  pageName: string;
  pagePath: string;
  breakpointId: string;
  breakpointName: string;
  width: number;
  height: number;
  fullUrl: string;
  baselineImage?: string; // base64 data URI
  currentImage: string;   // base64 data URI
  diffImage?: string;     // base64 data URI
  diffPixelCount: number;
  totalPixelCount: number;
  diffPercentage: number; // 0 to 100
  status: 'identical' | 'changed' | 'new' | 'error';
  errorMessage?: string;
}

export interface Run {
  id: string;
  projectId: string;
  createdAt: string;
  status: 'running' | 'completed' | 'failed';
  isBaseline: boolean;
  totalChecks: number;
  passedChecks: number;
  changedChecks: number;
  newChecks: number;
  screenshots: Screenshot[];
  comparisons: ComparisonItem[];
}

export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { id: 'desktop', name: 'Desktop', width: 1440, height: 900, icon: 'desktop' },
  { id: 'tablet', name: 'Tablet', width: 768, height: 1024, icon: 'tablet' },
  { id: 'mobile', name: 'Mobile', width: 375, height: 812, icon: 'smartphone' },
];

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  waitTimeMs: 1500,
  fullPage: true,
  diffThreshold: 0.1,
  diffColor: '#ef4444', // Red-500
};

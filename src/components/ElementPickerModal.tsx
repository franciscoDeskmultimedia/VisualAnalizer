'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PageComponent, ComponentState } from '@/types';
import {
  X,
  Crosshair,
  Monitor,
  Tablet,
  Smartphone,
  Check,
  Sparkles,
  RefreshCw,
  Loader2,
  MousePointerClick
} from 'lucide-react';

interface ElementPickerModalProps {
  projectId: string;
  pageName: string;
  pagePath: string;
  fullUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectComponent: (component: PageComponent) => void;
}

export function ElementPickerModal({
  projectId,
  pageName,
  pagePath,
  fullUrl,
  isOpen,
  onClose,
  onSelectComponent,
}: ElementPickerModalProps) {
  const [viewportWidth, setViewportWidth] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedSelector, setSelectedSelector] = useState('');
  const [componentName, setComponentName] = useState('');
  const [selectedStates, setSelectedStates] = useState<ComponentState[]>(['default', 'hover']);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewDims, setPreviewDims] = useState<{ width: number; height: number } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const widthPixels = viewportWidth === 'desktop' ? 1280 : viewportWidth === 'tablet' ? 768 : 390;

  // Listen for messages from injected inspector script
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (e: MessageEvent) => {
      if (e.data && e.data.type === 'VISUAL_ANALIZAR_ELEMENT_PICKED') {
        const { selector, name, width, height } = e.data;
        setSelectedSelector(selector);
        setComponentName(name || `Component: ${selector}`);
        setPreviewDims({ width, height });

        // Trigger quick preview snapshot
        fetchPreview(selector);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, fullUrl, projectId]);

  const fetchPreview = async (selector: string) => {
    if (!selector.trim()) return;
    setIsLoadingPreview(true);
    setPreviewImage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fullUrl,
          selector: selector.trim(),
          width: widthPixels,
          height: 800,
        }),
      });
      const data = await res.json();
      if (data.success && data.imageData) {
        setPreviewImage(data.imageData);
        if (data.width && data.height) {
          setPreviewDims({ width: data.width, height: data.height });
        }
      }
    } catch (err) {
      console.warn('Failed to load element preview thumbnail:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleToggleState = (st: ComponentState) => {
    if (st === 'default') return; // Default is always required
    if (selectedStates.includes(st)) {
      setSelectedStates(selectedStates.filter((s) => s !== st));
    } else {
      setSelectedStates([...selectedStates, st]);
    }
  };

  const handleConfirm = () => {
    if (!selectedSelector.trim() || !componentName.trim()) return;

    const newComponent: PageComponent = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: componentName.trim(),
      selector: selectedSelector.trim(),
      states: selectedStates,
    };

    onSelectComponent(newComponent);
    onClose();
  };

  if (!isOpen) return null;

  const inspectProxyUrl = `/api/projects/${projectId}/inspect?url=${encodeURIComponent(fullUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Visual Element Inspector</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {pageName} ({pagePath})
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hover over any button, navbar, or section to inspect. Click to capture selector and test states.
              </p>
            </div>
          </div>

          {/* Viewport Width Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setViewportWidth('desktop')}
                className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-all ${
                  viewportWidth === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Desktop Viewport (1280px)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportWidth('tablet')}
                className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-all ${
                  viewportWidth === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Tablet Viewport (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportWidth('mobile')}
                className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-all ${
                  viewportWidth === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Mobile Viewport (390px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Mobile</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reload Preview Frame"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Website Preview Frame */}
        <div className="flex-1 bg-slate-950 overflow-auto flex justify-center items-start p-4">
          <div
            style={{ width: `${widthPixels}px` }}
            className="h-full max-h-full rounded-xl overflow-hidden border border-slate-800 bg-white shadow-2xl transition-all relative flex flex-col"
          >
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={inspectProxyUrl}
              className="w-full flex-1 border-0"
              title="Visual Element Inspector Frame"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          </div>
        </div>

        {/* Bottom Inspector Control Drawer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex flex-col md:flex-row items-center justify-between gap-4">
          {!selectedSelector ? (
            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                <MousePointerClick className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-white">Click any element above</span> to automatically capture its selector, dimensions, and configure states.
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row items-center gap-4 w-full">
              {/* Thumbnail / Dimensions Badge */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-16 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden relative">
                  {isLoadingPreview ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  ) : previewImage ? (
                    <img
                      src={previewImage}
                      alt="Element Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
                {previewDims && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    <div>{previewDims.width} × {previewDims.height} px</div>
                    <div className="text-emerald-400 font-sans font-semibold">Element Selected</div>
                  </div>
                )}
              </div>

              {/* Component Name & Selector Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 w-full">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Component Display Name
                  </label>
                  <input
                    type="text"
                    value={componentName}
                    onChange={(e) => setComponentName(e.target.value)}
                    placeholder="e.g. Primary Hero Button"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    CSS Selector
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={selectedSelector}
                      onChange={(e) => setSelectedSelector(e.target.value)}
                      placeholder="#cta-button"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => fetchPreview(selectedSelector)}
                      disabled={isLoadingPreview}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      title="Test selector and refresh preview"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* State Selection Badges */}
              <div className="flex-shrink-0">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  States to Compare
                </div>
                <div className="flex items-center gap-1.5">
                  {(['default', 'hover', 'active', 'focus'] as ComponentState[]).map((st) => {
                    const isSelected = selectedStates.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleToggleState(st)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {st === 'default' ? 'Default' : `:${st}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedSelector.trim() || !componentName.trim()}
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Component Target</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

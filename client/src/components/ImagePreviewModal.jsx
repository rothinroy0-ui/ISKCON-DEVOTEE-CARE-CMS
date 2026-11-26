import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

const ImagePreviewContext = createContext(null);

function getHighResUrl(url) {
  if (!url) return '';
  if (url.includes('drive.google.com/thumbnail') && url.includes('sz=w200')) {
    return url.replace('sz=w200', 'sz=w1000');
  }
  return url;
}

export function ImagePreviewProvider({ children }) {
  const [preview, setPreview] = useState(null);

  const openImage = useCallback((url, title = '', subtitle = '') => {
    if (!url) return;
    setPreview({
      url: getHighResUrl(url),
      title,
      subtitle,
    });
  }, []);

  const closeImage = useCallback(() => {
    setPreview(null);
  }, []);

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeImage();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preview, closeImage]);

  return (
    <ImagePreviewContext.Provider value={{ openImage, closeImage }}>
      {children}
      {preview && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-sm"
          onClick={closeImage}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-900">
                  {preview.title || 'Devotee Photo'}
                </h3>
                {preview.subtitle && (
                  <p className="truncate font-mono text-xs text-slate-500">
                    {preview.subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={closeImage}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close image window"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex max-h-[75vh] items-center justify-center bg-slate-50 p-4">
              <img
                src={preview.url}
                alt={preview.title || 'Devotee Photo'}
                className="max-h-[68vh] w-auto rounded-xl object-contain shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </ImagePreviewContext.Provider>
  );
}

export function useImagePreview() {
  const ctx = useContext(ImagePreviewContext);
  if (!ctx) {
    return {
      openImage: () => {},
      closeImage: () => {},
    };
  }
  return ctx;
}

import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

import { Loader2, ZoomIn, ZoomOut, AlertCircle, ExternalLink } from 'lucide-react';

try {
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }
} catch (e) {
  console.warn('Worker configuration notice:', e);
}

interface PdfCanvasViewerProps {
  dataUri: string;
  title: string;
  fileName?: string;
  id?: string;
}

export default function PdfCanvasViewer({ dataUri, title, fileName, id }: PdfCanvasViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  
  // Per-file zoom retained in localStorage keyed by file id / title
  const fileKey = id || fileName || title || 'default_file';
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`pd_zoom_${fileKey}`);
      return saved ? Number(saved) : 100;
    } catch {
      return 100;
    }
  });

  const [isImage, setIsImage] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(`pd_zoom_${fileKey}`, String(zoom));
    } catch {}
  }, [zoom, fileKey]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pd_zoom_${fileKey}`);
      setZoom(saved ? Number(saved) : 100);
    } catch {
      setZoom(100);
    }
  }, [fileKey]);

  useEffect(() => {
    if (!dataUri) return;
    const lower = (fileName || title || dataUri).toLowerCase();
    const isImg =
      dataUri.startsWith('data:image/') ||
      dataUri.includes('image/') ||
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.svg') ||
      lower.endsWith('.bmp');
    setIsImage(isImg);
  }, [dataUri, fileName, title]);

  useEffect(() => {
    if (isImage || !dataUri) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    let doc: any = null;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        let uint8Array: Uint8Array;

        if (dataUri.startsWith('data:')) {
          const base64Index = dataUri.indexOf(';base64,');
          if (base64Index !== -1) {
            const base64 = dataUri.substring(base64Index + 8).replace(/[\n\r\s]/g, '');
            const binaryString = atob(base64);
            const len = binaryString.length;
            uint8Array = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              uint8Array[i] = binaryString.charCodeAt(i);
            }
          } else {
            const commaIndex = dataUri.indexOf(',');
            const decoded = decodeURIComponent(dataUri.substring(commaIndex + 1));
            uint8Array = new TextEncoder().encode(decoded);
          }
        } else if (dataUri.startsWith('blob:')) {
          const res = await fetch(dataUri);
          const buf = await res.arrayBuffer();
          uint8Array = new Uint8Array(buf);
        } else {
          setLoading(false);
          return;
        }

        const isPdfMagic =
          uint8Array.length >= 4 &&
          uint8Array[0] === 0x25 &&
          uint8Array[1] === 0x50 &&
          uint8Array[2] === 0x44 &&
          uint8Array[3] === 0x46;

        if (!isPdfMagic) {
          if (!isCancelled) {
            setIsImage(true);
            setLoading(false);
          }
          return;
        }

        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        doc = await loadingTask.promise;

        if (isCancelled) {
          doc.destroy?.();
          return;
        }

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          setIsImage(true);
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
      if (doc) doc.destroy?.();
    };
  }, [dataUri, isImage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [dataUri]);

  const scaleFactor = zoom / 100;

  return (
    <div className="w-full h-full bg-neutral-950 relative flex flex-col items-center justify-start overflow-hidden select-none">
      <div
        ref={scrollRef}
        className="w-full h-full overflow-auto py-12 px-6 flex flex-col items-center justify-start pb-28"
      >
        {loading && (
          <div className="my-auto flex flex-col items-center justify-center p-8 bg-neutral-900/80 rounded-2xl border border-neutral-800 text-white text-center space-y-3 shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">Loading Document...</p>
          </div>
        )}

        {error && !loading && (
          <div className="my-auto flex flex-col items-center justify-center p-6 bg-neutral-900 rounded-2xl border border-rose-900 text-neutral-300 text-center space-y-3 shadow-2xl">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p className="text-xs font-bold text-white">{error}</p>
            <a href={dataUri} target="_blank" rel="noreferrer" className="px-4 py-2 bg-neutral-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-neutral-700 transition-colors">
              <span>Open Direct Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Image Viewer Mode (Centered horizontally, top-aligned vertically) */}
        {!loading && !error && isImage && (
          <div
            className="flex flex-col items-center mx-auto my-0 transition-transform duration-150 origin-top"
            style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'top center' }}
          >
            <div className="overflow-hidden max-w-2xl w-full flex justify-center shadow-2xl rounded-lg mx-auto bg-white">
              <img src={dataUri} alt={title} className="w-full h-auto object-contain block rounded-lg mx-auto" />
            </div>
          </div>
        )}

        {/* PDF Multi-Page Canvas Viewer Mode (Centered horizontally, top-aligned vertically) */}
        {!loading && !error && !isImage && pdfDoc && (
          <div
            className="flex flex-col items-center mx-auto space-y-6 my-0 transition-transform duration-150 origin-top"
            style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'top center' }}
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pNum) => (
              <PdfPageItem key={pNum} pdfDoc={pdfDoc} pageNumber={pNum} />
            ))}
          </div>
        )}
      </div>

      {/* Zoom Controls Overlay (Centered at bottom, increments of 5%) */}
      <div className="absolute bottom-4 inset-x-0 z-30 flex items-center justify-center gap-2 pointer-events-none">
        <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(50, z - 5))}
            className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-xl cursor-pointer transition-colors"
            title="Zoom Out (5%)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-black uppercase tracking-wider px-2 text-blue-400">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(300, z + 5))}
            className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-xl cursor-pointer transition-colors"
            title="Zoom In (5%)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component for rendering individual PDF pages onto canvas
const PdfPageItem: React.FC<{ pdfDoc: any; pageNumber: number }> = ({ pdfDoc, pageNumber }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled || !canvasRef.current) return;

      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      if (!cancelled) setRendered(true);
    };
    render();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNumber]);

  return (
    <div className="overflow-hidden max-w-2xl w-full relative flex justify-center shadow-2xl rounded-lg bg-white mx-auto">
      <canvas ref={canvasRef} className="w-full h-auto object-contain block rounded-lg mx-auto" style={{ display: rendered ? 'block' : 'none' }} />
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/60 text-neutral-300">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
      )}
    </div>
  );
};

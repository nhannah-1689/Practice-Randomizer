import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Shuffle,
  X,
  RefreshCw,
  Sun,
  Moon,
  FileSpreadsheet,
  Layers,
  BookOpen,
  Palette,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { defaultPracticeDataset, PracticeItem, MasterTier } from './data/pianoData';
import { defaultReferencePdfs, ReferencePdf } from './data/samplePdfs';
import { parseCSV } from './utils/csvParser';
import { getStoredPdfs, saveStoredPdfs } from './utils/pdfStorage';
import PdfCanvasViewer from './components/PdfCanvasViewer';

const MASTER_TIERS: { id: MasterTier; label: string; icon: React.ReactNode }[] = [
  { id: 'Technique', label: 'Tech', icon: <Layers className="w-4 h-4 shrink-0" /> },
  { id: 'Repertoire', label: 'Rep', icon: <BookOpen className="w-4 h-4 shrink-0" /> },
  { id: 'Improvisation', label: 'Improv', icon: <Palette className="w-4 h-4 shrink-0" /> }
];

export default function App() {
  const [items, setItems] = useState<PracticeItem[]>(defaultPracticeDataset);
  const [tierSelections, setTierSelections] = useState<Record<MasterTier, PracticeItem[]>>({
    Technique: [],
    Repertoire: [],
    Improvisation: []
  });

  const [activeTier, setActiveTier] = useState<MasterTier>('Technique');
  const [selectedItemForModal, setSelectedItemForModal] = useState<PracticeItem | null>(null);
  const [seeAllCategoryForModal, setSeeAllCategoryForModal] = useState<{ tier: MasterTier; category: string } | null>(null);
  const [selectedSeeAllItemForModal, setSelectedSeeAllItemForModal] = useState<PracticeItem | null>(null);
  const [customPdfs, setCustomPdfs] = useState<ReferencePdf[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSelectPdf = (pdf: ReferencePdf) => {
    const timestamp = Date.now();
    setCustomPdfs(prev => {
      const updated = prev.map(p => p.id === pdf.id ? { ...p, lastViewed: timestamp } : p)
        .sort((a, b) => (b.lastViewed || 0) - (a.lastViewed || 0));
      saveStoredPdfs(updated).catch(() => {});
      return updated;
    });
    setSelectedPdfForFullscreen({ ...pdf, lastViewed: timestamp });
  };

  useEffect(() => {
    getStoredPdfs().then(pdfs => {
      if (pdfs && pdfs.length > 0) {
        const sorted = [...pdfs].sort((a, b) => (b.lastViewed || 0) - (a.lastViewed || 0));
        setCustomPdfs(sorted);
      }
    }).catch(() => {});
  }, []);
  const [selectedPdfForFullscreen, setSelectedPdfForFullscreen] = useState<ReferencePdf | null>(null);
  const [pdfToDelete, setPdfToDelete] = useState<ReferencePdf | null>(null);
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'sheets' | 'pdfs' | 'subcategories'>('sheets');
  const [hiddenSubcategories, setHiddenSubcategories] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('pd_hidden_subcategories');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [lockedSubcategories, setLockedSubcategories] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('pd_locked_subcategories');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [boostedItems, setBoostedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('pd_boosted_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isDarkMode, setIsDarkMode] = useState(true);

  // CSV live sync states
  const [csvUrl, setCsvUrl] = useState('');
  const [isLoadingCsv, setIsLoadingCsv] = useState(false);
  const [csvStatus, setCsvStatus] = useState<{ message: string; isError: boolean } | null>(null);



  const initializedRef = useRef(false);

  // Apply dark class to root html
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handleContainerPressStart = (key: string) => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setLockedSubcategories(prev => {
        const next = { ...prev, [key]: !prev[key] };
        localStorage.setItem('pd_locked_subcategories', JSON.stringify(next));
        return next;
      });
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleContainerPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const itemLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isItemLongPressRef = useRef(false);

  const handleItemPressStart = (item: PracticeItem) => {
    isItemLongPressRef.current = false;
    itemLongPressTimerRef.current = setTimeout(() => {
      isItemLongPressRef.current = true;
      const boostKey = item.id;
      setBoostedItems(prev => {
        const next = { ...prev, [boostKey]: !prev[boostKey] };
        localStorage.setItem('pd_boosted_items', JSON.stringify(next));
        return next;
      });
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleItemPressEnd = () => {
    if (itemLongPressTimerRef.current) {
      clearTimeout(itemLongPressTimerRef.current);
      itemLongPressTimerRef.current = null;
    }
  };

  // Generate selections for all tiers
  const generateSelections = (currentDataset: PracticeItem[] = items, forceRandom = false) => {
    const savedSelections = localStorage.getItem('pd_session_selections');
    let existingSelections: Record<MasterTier, PracticeItem[]> | null = null;
    if (savedSelections) {
      try {
        existingSelections = JSON.parse(savedSelections);
      } catch {}
    }

    if (!forceRandom && existingSelections && !initializedRef.current) {
      if (existingSelections && Object.keys(existingSelections).length > 0) {
        setTierSelections(existingSelections);
        initializedRef.current = true;
        return;
      }
    }

    const newSelections: Record<MasterTier, PracticeItem[]> = {
      Technique: [],
      Repertoire: [],
      Improvisation: []
    };

    const currentMap = new Map<MasterTier, Map<string, PracticeItem[]>>();
    MASTER_TIERS.forEach(t => currentMap.set(t.id, new Map()));

    currentDataset.forEach(item => {
      const catMap = currentMap.get(item.tier);
      if (catMap) {
        const catName = item.category.trim();
        if (!catMap.has(catName)) {
          catMap.set(catName, []);
        }
        const list = catMap.get(catName)!;
        list.push(item);
        const isBoosted = boostedItems[item.id] || boostedItems[`${item.tier}:${item.category}:${item.name}`];
        if (isBoosted) {
          for (let i = 0; i < 4; i++) {
            list.push({ ...item, id: `${item.id}-boost-${i}` });
          }
        }
      }
    });

    const currentActiveSelections = tierSelections;

    MASTER_TIERS.forEach(({ id: tier }) => {
      const catMap = currentMap.get(tier);
      if (!catMap) return;

      const tierItemsList: PracticeItem[] = [];
      catMap.forEach((catItems, catName) => {
        if (catItems.length === 0) return;
        const containerKey = `${tier}:${catName}`;
        const isLocked = lockedSubcategories[containerKey];

        if (isLocked) {
          const existingItem = (currentActiveSelections[tier] || []).find(i => i.category.trim() === catName)
            || (existingSelections && existingSelections[tier] ? existingSelections[tier].find(i => i.category.trim() === catName) : null);
          if (existingItem) {
            tierItemsList.push({ ...existingItem });
            return;
          }
        }

        const randomIndex = Math.floor(Math.random() * catItems.length);
        const selected = { ...catItems[randomIndex] };

        tierItemsList.push(selected);
      });

      newSelections[tier] = tierItemsList;
    });

    setTierSelections(newSelections);
    localStorage.setItem('pd_session_selections', JSON.stringify(newSelections));
    initializedRef.current = true;
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('fpp_sheets_csv_url');
    const cached = localStorage.getItem('pd_cached_csv_items');

    if (cached) {
      try {
        const parsedCached = JSON.parse(cached);
        if (parsedCached && parsedCached.length > 0) {
          setItems(parsedCached);
          generateSelections(parsedCached, false);
        }
      } catch {}
    } else {
      generateSelections(items, false);
    }

    if (savedUrl) {
      setCsvUrl(savedUrl);
      fetchCsvData(savedUrl, false);
    }
  }, []);

  const fetchCsvData = async (url: string, showFeedback = true) => {
    if (!url.trim()) {
      setItems(defaultPracticeDataset);
      generateSelections(defaultPracticeDataset, true);
      if (showFeedback) setCsvStatus({ message: 'Loaded default built-in dataset.', isError: false });
      return;
    }

    setIsLoadingCsv(true);
    setCsvStatus(null);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const text = await response.text();
      const parsedItems = parseCSV(text);

      if (parsedItems.length > 0) {
        setItems(parsedItems);
        localStorage.setItem('pd_cached_csv_items', JSON.stringify(parsedItems));
        generateSelections(parsedItems, true);
        if (showFeedback) {
          setCsvStatus({
            message: `Successfully synced ${parsedItems.length} practice items!`,
            isError: false
          });
        }
      } else {
        throw new Error('No valid items found in CSV.');
      }
    } catch (err: any) {
      console.warn('Network fetch error or offline. Checking local cache...', err);
      const cached = localStorage.getItem('pd_cached_csv_items');
      if (cached) {
        try {
          const parsedCached = JSON.parse(cached);
          if (parsedCached && parsedCached.length > 0) {
            setItems(parsedCached);
            generateSelections(parsedCached, false);
            if (showFeedback) {
              setCsvStatus({
                message: `Offline mode: Loaded ${parsedCached.length} items from local cache.`,
                isError: false
              });
            }
            return;
          }
        } catch {}
      }

      setItems(defaultPracticeDataset);
      generateSelections(defaultPracticeDataset, true);
      if (showFeedback) {
        setCsvStatus({
          message: 'Offline: No cached Google Sheet data found. Using built-in database.',
          isError: true
        });
      }
    } finally {
      setIsLoadingCsv(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('fpp_sheets_csv_url', csvUrl);
    fetchCsvData(csvUrl, true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    const fileArray = Array.from(files);
    let loadedCount = 0;
    const newPdfs: ReferencePdf[] = [];

    fileArray.forEach((file) => {
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .trim() || file.name;

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUri = uploadEvent.target?.result as string;
        if (dataUri) {
          newPdfs.push({
            id: `custom-pdf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: cleanTitle,
            category: 'Uploaded Charts',
            description: `Uploaded document chart: ${file.name}`,
            fileName: file.name,
            fileSize: `${Math.round(file.size / 1024)} KB`,
            dataUri,
            pages: [
              {
                pageNumber: 1,
                heading: cleanTitle,
                content: [
                  "Uploaded document chart.",
                  `File name: ${file.name}`,
                  `File size: ${Math.round(file.size / 1024)} KB`
                ]
              }
            ]
          });
        }

        loadedCount++;
        if (loadedCount === fileArray.length && newPdfs.length > 0) {
          setCustomPdfs(prev => {
            const updated = [...prev, ...newPdfs];
            saveStoredPdfs(updated).catch(err => {
              setUploadError(err.message || 'Storage error. Please try uploading fewer or smaller files.');
            });
            return updated;
          });
        }
      };

      reader.onerror = () => {
        loadedCount++;
        setUploadError(`Failed to read file: ${file.name}`);
      };

      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) {
      try {
        const commaIndex = url.indexOf(',');
        const header = url.substring(0, commaIndex);
        const dataPart = url.substring(commaIndex + 1);
        const mimeMatch = header.match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        
        let blob: Blob;
        if (header.includes('base64')) {
          const cleanBase64 = dataPart.replace(/[\n\r\s]/g, '');
          try {
            const binaryString = atob(cleanBase64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            blob = new Blob([bytes], { type: mime });
          } catch (e) {
            blob = new Blob([dataPart], { type: mime });
          }
        } else {
          blob = new Blob([decodeURIComponent(dataPart)], { type: mime });
        }
        return URL.createObjectURL(blob);
      } catch {
        return url;
      }
    }
    // Convert Google Drive view links to preview links
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return url;
  };

  const handleAddExternalPdf = (e: React.FormEvent) => {
    e.preventDefault();
    const url = newPdfUrl.trim();
    if (!url) return;

    let extractedName = 'PDF Document.pdf';
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const segments = pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && !lastSegment.includes('file') && !lastSegment.includes('d') && !lastSegment.includes('view')) {
        extractedName = decodeURIComponent(lastSegment);
      } else if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          extractedName = `Google Drive File ${match[1].substring(0, 8)}.pdf`;
        }
      }
    } catch {
      const parts = url.split('/');
      const last = parts[parts.length - 1]?.split('?')[0];
      if (last) {
        extractedName = decodeURIComponent(last);
      }
    }

    const cleanTitle = extractedName
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim() || `Reference PDF ${Date.now()}`;

    const newPdf: ReferencePdf = {
      id: `external-pdf-${Date.now()}`,
      title: cleanTitle,
      category: 'External Link',
      description: `External reference PDF: ${url}`,
      fileName: extractedName,
      fileSize: 'External Link',
      dataUri: url,
      pages: [
        {
          pageNumber: 1,
          heading: cleanTitle,
          content: [
            "External linked PDF document.",
            `Source URL: ${url}`,
            "Click title to view fullscreen."
          ]
        }
      ]
    };

    const updated = [...customPdfs, newPdf];
    setCustomPdfs(updated);
    saveStoredPdfs(updated).catch(err => {
      setUploadError(err.message || 'Storage error');
    });
    setNewPdfUrl('');
    handleSelectPdf(newPdf);
  };

  const handleOpenPdfTab = (pdf: ReferencePdf) => {
    try {
      if (pdf.dataUri && pdf.dataUri.startsWith('data:')) {
        const commaIndex = pdf.dataUri.indexOf(',');
        const header = pdf.dataUri.substring(0, commaIndex);
        const dataPart = pdf.dataUri.substring(commaIndex + 1);
        const mimeMatch = header.match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';

        let blob: Blob;
        if (header.includes('base64')) {
          try {
            const cleanBase64 = dataPart.replace(/[\n\r\s]/g, '');
            const binaryString = atob(cleanBase64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            blob = new Blob([bytes], { type: mime });
          } catch (e) {
            blob = new Blob([dataPart], { type: mime });
          }
        } else {
          blob = new Blob([decodeURIComponent(dataPart)], { type: mime });
        }

        const blobUrl = URL.createObjectURL(blob);
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
          const link = document.createElement('a');
          link.href = blobUrl;
          link.target = '_blank';
          link.download = pdf.fileName || 'document.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else if (pdf.dataUri) {
        window.open(pdf.dataUri, '_blank');
      }
    } catch (err) {
      console.error('Failed to open PDF tab:', err);
      alert('Unable to open PDF. Please try again.');
    }
  };

  // Theme-aware pleasant colors
  const primaryBlue = isDarkMode ? '#3B82F6' : '#2563EB';
  const subcategoryColor = isDarkMode ? 'text-[#60A5FA]' : 'text-[#1D4ED8]';

  const rawTierItems = tierSelections[activeTier] || [];
  const currentTierItems = rawTierItems.filter(item => !hiddenSubcategories[`${item.tier}:${item.category.trim()}`]);

  return (
    <div className={`fixed inset-0 w-screen h-screen overflow-hidden flex flex-col font-sora antialiased transition-colors duration-150 ${
      isDarkMode 
        ? 'bg-[#121212] text-[#F3F4F6] selection:bg-blue-500/30 selection:text-white' 
        : 'bg-[#F4F5F7] text-[#1F2937] selection:bg-blue-500/20 selection:text-blue-900'
    }`} style={{ height: '100dvh', maxHeight: '100dvh', width: '100vw', boxSizing: 'border-box' }}>
      {/* Top Header */}
      <header className="h-12 shrink-0 px-4 sm:px-6 flex items-center justify-between bg-transparent">
        <h1 className={`text-sm font-bold tracking-wider uppercase ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
          {activeTier}
        </h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg border transition-all active:scale-95 ${
              isDarkMode 
                ? 'bg-[#1E1E1E] border-[#2A2A2A] text-[#A0A0A0] hover:text-white' 
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 shadow-sm'
            }`}
            title="Toggle light/dark mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              setCsvStatus(null);
              setIsSettingsOpen(true);
            }}
            className={`p-2 rounded-lg border transition-all active:scale-95 ${
              isDarkMode 
                ? 'bg-[#1E1E1E] border-[#2A2A2A] text-[#A0A0A0] hover:text-white' 
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 shadow-sm'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Area: Active Category Section with Zero Scrolling */}
      <main className="flex-1 min-h-0 px-4 sm:px-6 pb-2 max-w-3xl w-full mx-auto flex flex-col overflow-hidden">
        <section
          className={`h-full border rounded-2xl p-4 sm:p-6 flex flex-col overflow-hidden shadow-xl transition-all ${
            isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30]' : 'bg-white border-slate-200/80 shadow-slate-200/50'
          }`}
        >
          {/* Subcategories & Randomized Items List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 sm:space-y-4 my-auto no-scrollbar">
            {(() => {
              const renderSubcategoryCard = (item: PracticeItem, containerKey: string) => {
                const isLocked = lockedSubcategories[containerKey];

                return (
                  <div
                    key={containerKey}
                    onMouseDown={() => handleContainerPressStart(containerKey)}
                    onMouseUp={handleContainerPressEnd}
                    onMouseLeave={handleContainerPressEnd}
                    onTouchStart={() => handleContainerPressStart(containerKey)}
                    onTouchEnd={handleContainerPressEnd}
                    onTouchCancel={handleContainerPressEnd}
                    onClick={() => {
                      if (isLongPressRef.current) {
                        isLongPressRef.current = false;
                        return;
                      }
                      setSelectedItemForModal(item);
                    }}
                    className={`group p-4 sm:p-5 rounded-xl cursor-pointer transition-all active:scale-[0.99] min-w-0 ${
                      isLocked
                        ? isDarkMode
                          ? 'bg-[#25252B] border-2 border-blue-500 border-dashed shadow-md'
                          : 'bg-slate-100 border-2 border-blue-600 border-dashed shadow-md'
                        : isDarkMode
                          ? 'hover:bg-[#25252B] bg-[#222226]/80 border border-white/5'
                          : 'hover:bg-slate-50 bg-slate-50/90 border border-slate-200/70'
                    }`}
                  >
                    <span className={`text-xs font-mono-sub tracking-wider uppercase block mb-1 whitespace-normal break-words ${subcategoryColor}`}>
                      {item.category}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight whitespace-normal break-words transition-colors">
                      {item.name}
                    </h3>
                  </div>
                );
              };

              if (activeTier === 'Repertoire') {
                const repSource = hiddenSubcategories['Repertoire:Repertoire Sources'] ? null : currentTierItems.find(i => i.category.trim() === 'Repertoire Sources');
                const pageItem = hiddenSubcategories['Repertoire:Page #'] ? null : currentTierItems.find(i => i.category.trim() === 'Page #');
                const otherItems = currentTierItems.filter(i => {
                  const c = i.category.trim();
                  return c !== 'Repertoire Sources' && c !== 'Page #';
                });

                return (
                  <>
                    {repSource && pageItem ? (
                      <div className="grid grid-cols-1 sm:grid-cols-[4fr_1fr] gap-3 items-stretch">
                        {renderSubcategoryCard(repSource, "Repertoire:Repertoire Sources")}
                        {renderSubcategoryCard(pageItem || {
                          id: `${repSource.id}-page`,
                          tier: 'Repertoire',
                          category: 'Page #',
                          name: repSource.pageNumber || 'Page 1',
                          description: `Specific page reference for ${repSource.name}`
                        }, "Repertoire:Page #")}
                      </div>
                    ) : repSource ? (
                      renderSubcategoryCard(repSource, "Repertoire:Repertoire Sources")
                    ) : pageItem ? (
                      renderSubcategoryCard(pageItem, "Repertoire:Page #")
                    ) : null}

                    {otherItems.map((item) => renderSubcategoryCard(item, `Repertoire:${item.category.trim()}`))}
                  </>
                );
              } else {
                return currentTierItems.map((item) => renderSubcategoryCard(item, `${item.tier}:${item.category.trim()}`));
              }
            })()}
          </div>
        </section>
      </main>

      {/* Bottom Footer: Navigation Tabs & Shuffle Button */}
      <footer className={`h-20 shrink-0 px-4 sm:px-6 border-t flex items-center justify-between gap-3 transition-colors z-20 relative ${
        isDarkMode ? 'bg-[#121212] border-[#222228]' : 'bg-white border-slate-200 shadow-lg'
      }`}>
        <div className={`flex-1 grid grid-cols-3 gap-1 p-1 rounded-xl border ${
          isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30]' : 'bg-slate-100 border-slate-200'
        }`}>
          {MASTER_TIERS.map(({ id, label, icon }) => {
            const isActive = activeTier === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTier(id)}
                className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate ${
                  isActive
                    ? 'text-white shadow-md'
                    : isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                style={isActive ? { backgroundColor: primaryBlue } : {}}
              >
                {icon}
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => generateSelections(items, true)}
          style={{ backgroundColor: primaryBlue }}
          className="py-2.5 px-4 sm:px-6 rounded-xl text-white font-bold text-xs sm:text-sm tracking-wide flex items-center gap-2 active:scale-[0.99] transition-all cursor-pointer shadow-lg shrink-0"
        >
          <Shuffle className="w-4 h-4" />
          <span className="hidden sm:inline">Shuffle</span>
        </button>
      </footer>

      {/* Item Detail Modal */}
      {selectedItemForModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedItemForModal(null)}
        >
          <div
            className={`border rounded-2xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl space-y-5 ${
              isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedItemForModal(null)}
              className={`absolute top-5 right-5 p-2 rounded-xl border transition-colors ${
                isDarkMode ? 'bg-[#121212] border-[#2A2A30] text-neutral-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className={`text-xs font-mono-sub uppercase tracking-wider block mb-1.5 whitespace-normal break-words ${subcategoryColor}`}>
                {selectedItemForModal.category}
              </span>
              <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-4 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                {selectedItemForModal.name}
              </h3>
              <p className={`text-base sm:text-lg leading-relaxed mb-3 ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                {selectedItemForModal.description || 'No description provided.'}
              </p>
              {selectedItemForModal.example && (
                <p className={`text-xs sm:text-sm tracking-wide ${isDarkMode ? 'text-neutral-400 opacity-60' : 'text-slate-500 opacity-70'}`}>
                  {selectedItemForModal.example}
                </p>
              )}
            </div>

            <div className="pt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const cat = selectedItemForModal.category.trim();
                  const tier = selectedItemForModal.tier;
                  setSelectedItemForModal(null);
                  setSeeAllCategoryForModal({ tier, category: cat });
                }}
                className={`text-xs font-bold transition-colors hover:underline cursor-pointer ${subcategoryColor}`}
              >
                See All {selectedItemForModal.category}
              </button>

              <button
                onClick={() => setSelectedItemForModal(null)}
                style={{ backgroundColor: primaryBlue }}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all shadow-md cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* See All Category Items Modal */}
      {seeAllCategoryForModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSeeAllCategoryForModal(null)}
        >
          <div
            className={`border rounded-2xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-xs font-mono-sub uppercase tracking-wider block mb-1 ${subcategoryColor}`}>
                  {seeAllCategoryForModal.category}
                </span>
                <h3 className="text-xl font-bold tracking-tight">
                  All {seeAllCategoryForModal.category} Items
                </h3>
              </div>
              <button
                onClick={() => setSeeAllCategoryForModal(null)}
                className={`p-2 rounded-xl border transition-colors ${
                  isDarkMode ? 'bg-[#121212] border-[#2A2A30] text-neutral-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto pr-1 space-y-2 no-scrollbar">
              {items
                .filter(i => i.tier === seeAllCategoryForModal.tier && i.category.trim() === seeAllCategoryForModal.category.trim())
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(item => {
                  const isBoosted = boostedItems[item.id];
                  return (
                    <div
                      key={item.id}
                      onMouseDown={() => handleItemPressStart(item)}
                      onMouseUp={handleItemPressEnd}
                      onMouseLeave={handleItemPressEnd}
                      onTouchStart={() => handleItemPressStart(item)}
                      onTouchEnd={handleItemPressEnd}
                      onTouchCancel={handleItemPressEnd}
                      onClick={() => {
                        if (isItemLongPressRef.current) {
                          isItemLongPressRef.current = false;
                          return;
                        }
                        setSeeAllCategoryForModal(null);
                        setSelectedSeeAllItemForModal(item);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isBoosted
                          ? isDarkMode
                            ? 'bg-blue-950/30 border-blue-500/60 shadow-md'
                            : 'bg-blue-50/80 border-blue-400 shadow-sm'
                          : isDarkMode
                            ? 'hover:bg-[#25252B] bg-[#222226] border-white/5'
                            : 'hover:bg-slate-100 bg-slate-50 border-slate-200'
                      }`}
                    >
                      <h4 className="font-bold text-sm">{item.name}</h4>
                      {isBoosted && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                          5x Boosted
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSeeAllCategoryForModal(null)}
                style={{ backgroundColor: primaryBlue }}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all shadow-md cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* See All Item Detail Modal (Without See All Button) */}
      {selectedSeeAllItemForModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            const item = selectedSeeAllItemForModal;
            setSelectedSeeAllItemForModal(null);
            setSeeAllCategoryForModal({ tier: item.tier, category: item.category.trim() });
          }}
        >
          <div
            className={`border rounded-2xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl space-y-5 ${
              isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                const item = selectedSeeAllItemForModal;
                setSelectedSeeAllItemForModal(null);
                setSeeAllCategoryForModal({ tier: item.tier, category: item.category.trim() });
              }}
              className={`absolute top-5 right-5 p-2 rounded-xl border transition-colors ${
                isDarkMode ? 'bg-[#121212] border-[#2A2A30] text-neutral-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div>
              <span className={`text-xs font-mono-sub uppercase tracking-wider block mb-1.5 whitespace-normal break-words ${subcategoryColor}`}>
                {selectedSeeAllItemForModal.category}
              </span>
              <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-4 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                {selectedSeeAllItemForModal.name}
              </h3>
              <p className={`text-base sm:text-lg leading-relaxed mb-3 ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                {selectedSeeAllItemForModal.description || 'No description provided.'}
              </p>
              {selectedSeeAllItemForModal.example && (
                <p className={`text-xs sm:text-sm tracking-wide ${isDarkMode ? 'text-neutral-400 opacity-60' : 'text-slate-500 opacity-70'}`}>
                  {selectedSeeAllItemForModal.example}
                </p>
              )}
            </div>

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => {
                  const item = selectedSeeAllItemForModal;
                  setSelectedSeeAllItemForModal(null);
                  setSeeAllCategoryForModal({ tier: item.tier, category: item.category.trim() });
                }}
                style={{ backgroundColor: primaryBlue }}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all shadow-md cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings / Preferences Modal */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className={`border rounded-2xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl space-y-5 ${
              isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Settings className={`w-5 h-5 ${subcategoryColor}`} />
                <span>Preferences &amp; Library</span>
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className={`p-2 rounded-xl border transition-colors ${
                  isDarkMode ? 'bg-[#121212] border-[#2A2A30] text-neutral-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${
              isDarkMode ? 'bg-[#121212] border-[#2A2A30]' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setSettingsTab('sheets')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  settingsTab === 'sheets'
                    ? 'text-white shadow-md'
                    : isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                style={settingsTab === 'sheets' ? { backgroundColor: primaryBlue } : {}}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Sheets</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('pdfs')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  settingsTab === 'pdfs'
                    ? 'text-white shadow-md'
                    : isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                style={settingsTab === 'pdfs' ? { backgroundColor: primaryBlue } : {}}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDFs</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('subcategories')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  settingsTab === 'subcategories'
                    ? 'text-white shadow-md'
                    : isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                style={settingsTab === 'subcategories' ? { backgroundColor: primaryBlue } : {}}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Subcategories</span>
              </button>
            </div>

            {settingsTab === 'sheets' ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-700'}`}>
                      Published Google Sheets CSV URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                      value={csvUrl}
                      onChange={(e) => setCsvUrl(e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-[#121212] border-[#2A2A30] text-white placeholder-neutral-600' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {csvStatus && (
                    <div
                      className={`p-3 rounded-xl border text-sm ${
                        csvStatus.isError
                          ? 'bg-red-950/30 border-red-900/50 text-red-400'
                          : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
                      }`}
                    >
                      {csvStatus.message}
                    </div>
                  )}

                  <div className={`border rounded-xl p-4 text-xs space-y-2 leading-relaxed ${
                    isDarkMode ? 'bg-[#121212] border-[#2A2A30] text-neutral-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <p className="font-bold text-sm">4-Column CSV Formatting:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Col A:</strong> Tier (Technique, Repertoire, Improvisation)</li>
                      <li><strong>Col B:</strong> Category</li>
                      <li><strong>Col C:</strong> Lesson Item</li>
                      <li><strong>Col D:</strong> Description</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCsvUrl('');
                        localStorage.removeItem('fpp_sheets_csv_url');
                        setItems(defaultPracticeDataset);
                        generateSelections(defaultPracticeDataset, true);
                        setCsvStatus({ message: 'Reset to default dataset.', isError: false });
                      }}
                      className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                        isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Reset to Default
                    </button>

                    <button
                      type="submit"
                      disabled={isLoadingCsv}
                      style={{ backgroundColor: primaryBlue }}
                      className="px-6 py-2.5 rounded-xl text-white font-bold text-sm tracking-wide flex items-center gap-2 disabled:opacity-50 transition-colors shadow-md cursor-pointer"
                    >
                      {isLoadingCsv ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                      <span>Save &amp; Sync</span>
                    </button>
                  </div>
                </form>
              </div>
             ) : settingsTab === 'pdfs' ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                {uploadError && (
                  <div className="p-3 rounded-xl border bg-red-950/30 border-red-900/50 text-red-400 text-xs">
                    {uploadError}
                  </div>
                )}
                <div className={`border rounded-xl p-4 flex justify-center ${
                  isDarkMode ? 'bg-[#121212] border-[#2A2A30]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label
                    style={{ backgroundColor: primaryBlue }}
                    className="px-6 py-3 rounded-xl text-white font-bold text-sm flex items-center gap-2 hover:opacity-95 transition-opacity cursor-pointer shadow-md"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Upload Reference File</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp,.gif"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Vertical list of uploaded PDFs/files with single container per item filling width, hugging text height */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {customPdfs.map(pdf => (
                    <div
                      key={pdf.id}
                      onClick={() => handleSelectPdf(pdf)}
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border w-full cursor-pointer ${
                        isDarkMode ? 'bg-[#121212] border-[#2A2A30] hover:bg-black/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                      } transition-colors`}
                    >
                      <span
                        className="text-sm font-medium truncate flex-1"
                        title={pdf.title}
                      >
                        {pdf.title}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPdfToDelete(pdf);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                        title="Delete File"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {customPdfs.length === 0 && (
                    <p className={`text-xs text-center py-6 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      No reference files uploaded yet.
                    </p>
                  )}
                </div>
              </div>
             ) : (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {MASTER_TIERS.map(({ id: tierId, label: tierLabel }) => {
                    const tierItems = items.filter(i => i.tier === tierId);
                    const uniqueCats = Array.from(new Set(tierItems.map(i => i.category)));
                    if (uniqueCats.length === 0) return null;

                    return (
                      <div key={tierId} className="space-y-2">
                        <h5 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                          {tierLabel} Categories
                        </h5>
                        <div className={`border rounded-xl p-3 space-y-2 ${
                          isDarkMode ? 'bg-[#121212] border-[#2A2A30]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          {uniqueCats.map((cat) => {
                            const catTrimmed = cat.trim();
                            const key = `${tierId}:${catTrimmed}`;
                            const isVisible = !hiddenSubcategories[key];

                            return (
                              <label
                                key={cat}
                                className="flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              >
                                <span className="text-sm font-medium">{cat}</span>
                                <input
                                  type="checkbox"
                                  checked={isVisible}
                                  onChange={(e) => {
                                    const newHidden = {
                                      ...hiddenSubcategories,
                                      [key]: !e.target.checked
                                    };
                                    setHiddenSubcategories(newHidden);
                                    localStorage.setItem('pd_hidden_subcategories', JSON.stringify(newHidden));
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}



      {/* Fullscreen PDF Viewer Modal */}
      {selectedPdfForFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-150">
          <div className="h-14 bg-[#1A1A1E] border-b border-[#2A2A30] px-4 flex items-center justify-between shrink-0">
            <div className="min-w-0 pr-4">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {selectedPdfForFullscreen.title}
              </h3>
              <p className="text-xs text-neutral-400 truncate">
                {selectedPdfForFullscreen.category} • Fullscreen Viewer
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPdfForFullscreen(null)}
                className="p-2 rounded-lg bg-[#2A2A30] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-neutral-900 w-full h-full relative overflow-hidden">
            <PdfCanvasViewer
              dataUri={selectedPdfForFullscreen.dataUri}
              title={selectedPdfForFullscreen.title}
              fileName={selectedPdfForFullscreen.fileName}
            />

            {/* Floating Navigation Toggle at bottom right */}
            {(() => {
              const allPdfs = customPdfs;
              const currentIndex = allPdfs.findIndex(p => p.id === selectedPdfForFullscreen.id);
              if (allPdfs.length <= 1) return null;

              const hasPrev = currentIndex > 0;
              const hasNext = currentIndex < allPdfs.length - 1;

              if (!hasPrev && !hasNext) return null;

              return (
                <div className="absolute bottom-6 right-6 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#1A1A1E]/90 border border-[#2A2A30] shadow-2xl backdrop-blur-md">
                  {hasPrev && (
                    <button
                      type="button"
                      onClick={() => handleSelectPdf(allPdfs[currentIndex - 1])}
                      className="p-2.5 rounded-xl bg-[#2A2A30] text-white hover:bg-[#3A3A40] transition-colors cursor-pointer flex items-center justify-center shadow"
                      title="Previous PDF"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {hasNext && (
                    <button
                      type="button"
                      onClick={() => handleSelectPdf(allPdfs[currentIndex + 1])}
                      className="p-2.5 rounded-xl bg-[#2A2A30] text-white hover:bg-[#3A3A40] transition-colors cursor-pointer flex items-center justify-center shadow"
                      title="Next PDF"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* PDF Delete Confirmation Modal */}
      {pdfToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPdfToDelete(null)}
        >
          <div
            className={`border rounded-2xl max-w-sm w-full p-6 relative shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-bold">Delete PDF?</h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Are you sure you want to delete &ldquo;{pdfToDelete.title}&rdquo;? This action cannot be easily undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPdfToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isDarkMode ? 'bg-[#2A2A30] text-neutral-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomPdfs(prev => {
                    const updated = prev.filter(cp => cp.id !== pdfToDelete.id);
                    saveStoredPdfs(updated).catch(err => {
                      setUploadError(err.message || 'Storage error');
                    });
                    return updated;
                  });
                  setPdfToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-md cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

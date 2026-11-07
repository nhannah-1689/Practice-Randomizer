import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  X,
  RefreshCw,
  Sun,
  Moon,
  Layers,
  BookOpen,
  Palette,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Check,
  Play,
  Pause,
  RotateCcw,
  Info
} from 'lucide-react';
import { defaultPracticeDataset, PracticeItem, MasterTier, getItemType } from './data/pianoData';
import { ReferencePdf } from './data/samplePdfs';
import { parseCSV } from './utils/csvParser';
import { getStoredPdfs, saveStoredPdfs } from './utils/pdfStorage';
import PdfCanvasViewer from './components/PdfCanvasViewer';
import {
  TierSectionState,
  GlobalRegimenProgress,
  generateAnchor,
  getRegimenList,
  getExerciseCategoriesForTier,
  getExercisesForCategory,
  isExerciseCompleted,
  handleToggleExerciseProgress,
  resetAnchorProgress
} from './utils/sectionManager';

const MASTER_TIERS: { id: MasterTier; label: string; icon: React.ReactNode }[] = [
  { id: 'Technique', label: 'Tech', icon: <Layers className="w-4 h-4 shrink-0" /> },
  { id: 'Repertoire', label: 'Rep', icon: <BookOpen className="w-4 h-4 shrink-0" /> },
  { id: 'Improvisation', label: 'Improv', icon: <Palette className="w-4 h-4 shrink-0" /> }
];

export default function App() {
  const [items, setItems] = useState<PracticeItem[]>(defaultPracticeDataset);

  // Section state for each tier: Active Anchor + Deterministic Regimen Progress { [anchorId]: { [exerciseId]: boolean } }
  const [sectionStates, setSectionStates] = useState<Record<MasterTier, TierSectionState>>(() => {
    try {
      const saved = localStorage.getItem('pd_section_states');
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrateProgress = (raw: any): GlobalRegimenProgress => {
          if (!raw || typeof raw !== 'object') return {};
          const normalized: GlobalRegimenProgress = {};
          for (const [aId, val] of Object.entries(raw)) {
            if (Array.isArray(val)) {
              normalized[aId] = {};
              for (const exId of val) normalized[aId][exId] = true;
            } else if (val && typeof val === 'object') {
              normalized[aId] = { ...(val as Record<string, boolean>) };
            }
          }
          return normalized;
        };

        const migrated: Record<MasterTier, TierSectionState> = {
          Technique: {
            activeAnchor: parsed.Technique?.activeAnchor || null,
            regimenProgress: migrateProgress(parsed.Technique?.regimenProgress),
            isAnchorLocked: !!parsed.Technique?.isAnchorLocked
          },
          Repertoire: {
            activeAnchor: parsed.Repertoire?.activeAnchor || null,
            regimenProgress: migrateProgress(parsed.Repertoire?.regimenProgress),
            isAnchorLocked: !!parsed.Repertoire?.isAnchorLocked
          },
          Improvisation: {
            activeAnchor: parsed.Improvisation?.activeAnchor || null,
            regimenProgress: migrateProgress(parsed.Improvisation?.regimenProgress),
            isAnchorLocked: !!parsed.Improvisation?.isAnchorLocked
          }
        };
        return migrated;
      }
    } catch {}
    return {
      Technique: { activeAnchor: null, regimenProgress: {}, isAnchorLocked: false },
      Repertoire: { activeAnchor: null, regimenProgress: {}, isAnchorLocked: false },
      Improvisation: { activeAnchor: null, regimenProgress: {}, isAnchorLocked: false }
    };
  });

  // Active target for each subcategory: { [tier:category]: exerciseId }
  const [selectedCategoryTargets, setSelectedCategoryTargets] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('pd_selected_category_targets');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Active Subcategory Selection Drawer / Modal
  const [drawerCategory, setDrawerCategory] = useState<string | null>(null);

  const [activeTier, setActiveTier] = useState<MasterTier>('Technique');
  const [selectedItemForModal, setSelectedItemForModal] = useState<PracticeItem | null>(null);
  const [seeAllCategoryForModal, setSeeAllCategoryForModal] = useState<{ tier: MasterTier; category: string } | null>(null);
  const [customPdfs, setCustomPdfs] = useState<ReferencePdf[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [anchorAnimKey, setAnchorAnimKey] = useState(0);

  // 5-minute section countdown timer (300 seconds)
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleToggleTimer = () => {
    if (timerSeconds === 0) {
      setTimerSeconds(300);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(prev => !prev);
    }
  };

  const handleResetTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTimerRunning(false);
    setTimerSeconds(300);
  };

  const handleSelectPdf = (pdf: ReferencePdf) => {
    setSelectedPdfForFullscreen(pdf);
  };

  useEffect(() => {
    getStoredPdfs().then(pdfs => {
      if (pdfs && pdfs.length > 0) {
        const sorted = [...pdfs].sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: 'accent', numeric: true })
        );
        setCustomPdfs(sorted);
      }
    }).catch(() => {});
  }, []);

  const [selectedPdfForFullscreen, setSelectedPdfForFullscreen] = useState<ReferencePdf | null>(null);
  const [pdfToDelete, setPdfToDelete] = useState<ReferencePdf | null>(null);
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

  // Apply dark class to root html
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Persist section states whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('pd_section_states', JSON.stringify(sectionStates));
    } catch {}
  }, [sectionStates]);

  // Long press on Anchor card toggles lock
  const anchorLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAnchorLongPressRef = useRef(false);

  const handleAnchorPressStart = () => {
    isAnchorLongPressRef.current = false;
    anchorLongPressTimerRef.current = setTimeout(() => {
      isAnchorLongPressRef.current = true;
      handleToggleAnchorLock();
    }, 500);
  };

  const handleAnchorPressEnd = () => {
    if (anchorLongPressTimerRef.current) {
      clearTimeout(anchorLongPressTimerRef.current);
      anchorLongPressTimerRef.current = null;
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

  // Populate missing anchors for each tier
  const ensureSectionPopulated = (currentDataset: PracticeItem[]) => {
    setSectionStates(prev => {
      let changed = false;
      const updated: Record<MasterTier, TierSectionState> = { ...prev };

      MASTER_TIERS.forEach(({ id: tier }) => {
        const currentTierState = updated[tier] || {
          activeAnchor: null,
          regimenProgress: {},
          isAnchorLocked: false
        };

        let newAnchor = currentTierState.activeAnchor;
        if (!newAnchor) {
          newAnchor = generateAnchor(tier, currentDataset, boostedItems, hiddenSubcategories);
          changed = true;
        }

        updated[tier] = {
          ...currentTierState,
          activeAnchor: newAnchor
        };
      });

      return changed ? updated : prev;
    });
  };

  // Load cached CSV or default dataset on initial mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('fpp_sheets_csv_url');
    const cached = localStorage.getItem('pd_cached_csv_items');

    if (cached) {
      try {
        const parsedCached = JSON.parse(cached);
        if (parsedCached && parsedCached.length > 0) {
          const merged = defaultPracticeDataset.map(defItem => {
            return {
              ...defItem,
              type: defItem.type || getItemType(defItem)
            };
          });
          setItems(merged);
          ensureSectionPopulated(merged);
        } else {
          setItems(defaultPracticeDataset);
          ensureSectionPopulated(defaultPracticeDataset);
        }
      } catch {
        setItems(defaultPracticeDataset);
        ensureSectionPopulated(defaultPracticeDataset);
      }
    } else {
      setItems(defaultPracticeDataset);
      ensureSectionPopulated(defaultPracticeDataset);
    }

    if (savedUrl) {
      setCsvUrl(savedUrl);
      fetchCsvData(savedUrl, false);
    }
  }, []);

  const fetchCsvData = async (url: string, showFeedback = true) => {
    if (!url.trim()) {
      setItems(defaultPracticeDataset);
      ensureSectionPopulated(defaultPracticeDataset);
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
        ensureSectionPopulated(parsedItems);
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
            ensureSectionPopulated(parsedCached);
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
      ensureSectionPopulated(defaultPracticeDataset);
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

  // Re-roll only the anchor for the active tier (preserves per-anchor progress)
  const handleShuffleAnchor = () => {
    const currentTierState = sectionStates[activeTier];
    if (currentTierState?.isAnchorLocked) return;

    if (navigator.vibrate) {
      navigator.vibrate(35);
    }
    setAnchorAnimKey(prev => prev + 1);

    const newAnchor = generateAnchor(activeTier, items, boostedItems, hiddenSubcategories);
    setSectionStates(prev => ({
      ...prev,
      [activeTier]: {
        ...prev[activeTier],
        activeAnchor: newAnchor
      }
    }));
  };

  // Toggle lock state for active tier's anchor
  const handleToggleAnchorLock = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    setSectionStates(prev => ({
      ...prev,
      [activeTier]: {
        ...prev[activeTier],
        isAnchorLocked: !prev[activeTier]?.isAnchorLocked
      }
    }));
  };

  // Reset progress checkmarks for the active anchor
  const handleResetAnchorProgress = () => {
    const currentTierState = sectionStates[activeTier];
    const currentAnchor = currentTierState?.activeAnchor;
    if (!currentAnchor) return;

    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
    setSectionStates(prev => {
      const currentProgress = prev[activeTier]?.regimenProgress || {};
      return {
        ...prev,
        [activeTier]: {
          ...prev[activeTier],
          regimenProgress: resetAnchorProgress(currentProgress, currentAnchor.id)
        }
      };
    });
  };

  // Toggle completion checkbox on an exercise row under the active anchor
  const handleToggleExercise = (exerciseId: string) => {
    const currentTierState = sectionStates[activeTier];
    const currentAnchor = currentTierState?.activeAnchor || generateAnchor(activeTier, items, boostedItems, hiddenSubcategories);
    if (!currentAnchor) return;

    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
    setSectionStates(prev => {
      const currentProgress = prev[activeTier]?.regimenProgress || {};
      const updatedProgress = handleToggleExerciseProgress(currentProgress, currentAnchor.id, exerciseId);
      return {
        ...prev,
        [activeTier]: {
          ...prev[activeTier],
          activeAnchor: currentAnchor,
          regimenProgress: updatedProgress
        }
      };
    });
  };

  // Select an exercise from the subcategory selection drawer as active checklist target
  const handleSelectCategoryTarget = (category: string, exerciseId: string) => {
    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
    setSelectedCategoryTargets(prev => {
      const next = { ...prev, [`${activeTier}:${category}`]: exerciseId };
      try {
        localStorage.setItem('pd_selected_category_targets', JSON.stringify(next));
      } catch {}
      return next;
    });
    setDrawerCategory(null);
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
            const updated = [...prev, ...newPdfs].sort((a, b) =>
              a.title.localeCompare(b.title, undefined, { sensitivity: 'accent', numeric: true })
            );
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

  const primaryBlue = isDarkMode ? '#3B82F6' : '#2563EB';
  const subcategoryColor = isDarkMode ? 'text-[#60A5FA]' : 'text-[#1D4ED8]';

  const currentTierState = sectionStates[activeTier] || {
    activeAnchor: null,
    regimenProgress: {},
    isAnchorLocked: false
  };

  const activeAnchor = currentTierState.activeAnchor || generateAnchor(activeTier, items, boostedItems, hiddenSubcategories);
  const anchorId = activeAnchor?.id || 'default';
  const isAnchorLocked = currentTierState.isAnchorLocked;

  // Subcategories for the active tier in deterministic CSV order
  const activeCategories = getExerciseCategoriesForTier(activeTier, items, hiddenSubcategories);

  // Each subcategory maps to its active target exercise
  const checklistSubcategoryRows = activeCategories.map(category => {
    const categoryExercises = getExercisesForCategory(activeTier, category, items);
    const savedTargetId = selectedCategoryTargets[`${activeTier}:${category}`];
    const targetItem = categoryExercises.find(ex => ex.id === savedTargetId) || categoryExercises[0] || null;
    return {
      category,
      categoryExercises,
      targetItem
    };
  }).filter((row): row is { category: string; categoryExercises: PracticeItem[]; targetItem: PracticeItem } => row.targetItem !== null);

  // Format timer MM:SS
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const timerRadius = 13;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerStrokeDashoffset = timerCircumference * (1 - timerSeconds / 300);

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
            aria-label="Toggle light/dark mode"
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
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Area: Primary Anchor Card + Flat Progressive Regimen List */}
      <main className="flex-1 min-h-0 px-4 sm:px-6 pb-2 max-w-3xl w-full mx-auto flex flex-col overflow-hidden">
        <section
          className={`h-full border rounded-2xl p-4 sm:p-5 flex flex-col overflow-hidden shadow-xl transition-all ${
            isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30]' : 'bg-white border-slate-200/80 shadow-slate-200/50'
          }`}
        >
          {/* Top Primary Anchor Card */}
          {activeAnchor && (
            <div
              key={anchorAnimKey}
              onMouseDown={handleAnchorPressStart}
              onMouseUp={handleAnchorPressEnd}
              onMouseLeave={handleAnchorPressEnd}
              onTouchStart={handleAnchorPressStart}
              onTouchEnd={handleAnchorPressEnd}
              onTouchCancel={handleAnchorPressEnd}
              onClick={() => {
                if (isAnchorLongPressRef.current) {
                  isAnchorLongPressRef.current = false;
                  return;
                }
                setSelectedItemForModal(activeAnchor);
              }}
              className={`shrink-0 p-4 sm:p-5 rounded-xl cursor-pointer transition-all select-none mb-3 min-w-0 ${
                isAnchorLocked
                  ? isDarkMode
                    ? 'bg-[#25252B] border-2 border-blue-500 border-dashed shadow-md ring-1 ring-blue-500/30'
                    : 'bg-blue-50/50 border-2 border-blue-600 border-dashed shadow-md ring-1 ring-blue-500/20'
                  : isDarkMode
                    ? 'bg-[#222226] border border-white/10 hover:border-white/20'
                    : 'bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] sm:text-[11px] font-mono-sub tracking-wider uppercase font-bold truncate ${subcategoryColor}`}>
                    {activeAnchor.category}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                    Anchor
                  </span>
                </div>

                {/* Anchor Actions: Reset Anchor Progress, Lock Toggle, Shuffle Anchor */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetAnchorProgress();
                    }}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isDarkMode
                        ? 'bg-[#1E1E22] text-neutral-400 hover:text-white border-white/10 active:scale-95'
                        : 'bg-white text-slate-500 hover:text-slate-900 border-slate-200 shadow-xs active:scale-95'
                    }`}
                    title="Reset Progress for this Anchor"
                    aria-label="Reset Progress for this Anchor"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAnchorLock();
                    }}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isAnchorLocked
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        : isDarkMode
                          ? 'bg-[#1E1E22] text-neutral-400 hover:text-white border-white/10'
                          : 'bg-white text-slate-500 hover:text-slate-900 border-slate-200 shadow-xs'
                    }`}
                    title={isAnchorLocked ? 'Anchor Locked (Click to Unlock)' : 'Lock Anchor'}
                    aria-label={isAnchorLocked ? 'Unlock Anchor' : 'Lock Anchor'}
                  >
                    {isAnchorLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShuffleAnchor();
                    }}
                    disabled={isAnchorLocked}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isAnchorLocked
                        ? 'opacity-40 cursor-not-allowed border-transparent text-neutral-500'
                        : isDarkMode
                          ? 'bg-[#1E1E22] text-neutral-300 hover:text-white border-white/10 active:scale-95'
                          : 'bg-white text-slate-700 hover:text-slate-950 border-slate-200 shadow-xs active:scale-95'
                    }`}
                    title={isAnchorLocked ? 'Unlock to Shuffle Anchor' : 'Shuffle Anchor'}
                    aria-label="Shuffle Anchor"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight whitespace-normal break-words leading-tight">
                {activeAnchor.name}
              </h2>
            </div>
          )}

          {/* Clean Flat List Regimen View */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Flat List Container: No card boxes, clean subtle divider lines */}
            <div className="flex-1 overflow-y-auto pr-1 divide-y divide-white/5 dark:divide-white/5 divide-slate-200/60 no-scrollbar">
              {checklistSubcategoryRows.map(({ category, targetItem }) => {
                const isCompleted = isExerciseCompleted(currentTierState.regimenProgress, anchorId, targetItem.id);
                const isBoosted = boostedItems[targetItem.id] || boostedItems[`${targetItem.tier}:${targetItem.category}:${targetItem.name}`];

                return (
                  <div
                    key={`${category}-${targetItem.id}`}
                    onClick={() => handleToggleExercise(targetItem.id)}
                    className={`py-3 px-2 sm:px-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-all rounded-lg ${
                      isBoosted 
                        ? isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50/70' 
                        : 'hover:bg-white/[0.03] dark:hover:bg-white/[0.03] hover:bg-black/[0.02]'
                    } ${isCompleted ? 'opacity-50' : 'opacity-100'}`}
                  >
                    {/* Left: Interactive Checkbox Toggle */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleExercise(targetItem.id);
                        }}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                          isCompleted
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : isDarkMode
                              ? 'border-neutral-600 hover:border-neutral-400 bg-transparent'
                              : 'border-slate-300 hover:border-slate-400 bg-transparent'
                        }`}
                        aria-label={isCompleted ? `Mark ${targetItem.name} incomplete` : `Mark ${targetItem.name} completed`}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      {/* Center: Subcategory label with dropdown trigger above Lesson Item title */}
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerCategory(category);
                          }}
                          className={`group inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono-sub tracking-wider uppercase leading-tight truncate hover:underline cursor-pointer ${subcategoryColor}`}
                          title={`Select target from ${category}`}
                        >
                          <span>{category}</span>
                          <ChevronDown className="w-3 h-3 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <h4 className={`text-[16px] sm:text-[18px] font-bold tracking-tight leading-snug break-words transition-all ${
                          isCompleted
                            ? 'line-through text-neutral-400 dark:text-neutral-500'
                            : isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {targetItem.name}
                        </h4>
                      </div>
                    </div>

                    {/* Right: Detail ℹ️ info button */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemForModal(targetItem);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title="View Details"
                        aria-label="View Details"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {checklistSubcategoryRows.length === 0 && (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No exercises available for this tier.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Footer: Navigation Tabs & Section Timer (All exercise randomization removed) */}
      <footer className={`h-16 sm:h-20 shrink-0 px-4 sm:px-6 border-t flex items-center justify-between gap-3 transition-colors z-20 relative ${
        isDarkMode ? 'bg-[#121212] border-[#222228]' : 'bg-white border-slate-200 shadow-lg'
      }`}>
        {/* Tier Selector Tabs */}
        <div className={`grid grid-cols-3 gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-xl border shrink-0 ${
          isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30]' : 'bg-slate-100 border-slate-200'
        }`}>
          {MASTER_TIERS.map(({ id, label, icon }) => {
            const isActive = activeTier === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTier(id)}
                className={`py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate ${
                  isActive
                    ? 'text-white shadow-md'
                    : isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                style={isActive ? { backgroundColor: primaryBlue } : {}}
              >
                <span className="hidden sm:inline shrink-0">{icon}</span>
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Section Countdown Timer (5-min countdown with progress ring) */}
        <div
          onClick={handleToggleTimer}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl border cursor-pointer select-none transition-all shadow-sm shrink-0 ${
            isDarkMode 
              ? 'bg-[#1A1A1E] border-[#2A2A30] hover:bg-[#222226]' 
              : 'bg-slate-100 border-slate-200 hover:bg-slate-200/70'
          }`}
          title={isTimerRunning ? 'Pause Section Timer' : 'Start 5-Minute Timer'}
          aria-label="Section Timer"
        >
          {/* Circular Progress Ring */}
          <div className="relative w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r={timerRadius}
                fill="none"
                stroke={isDarkMode ? '#2A2A30' : '#E2E8F0'}
                strokeWidth="2.5"
              />
              <circle
                cx="16"
                cy="16"
                r={timerRadius}
                fill="none"
                stroke={primaryBlue}
                strokeWidth="2.5"
                strokeDasharray={timerCircumference}
                strokeDashoffset={timerStrokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs">
              {isTimerRunning ? (
                <Pause className="w-2.5 h-2.5 fill-current" />
              ) : (
                <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
              )}
            </div>
          </div>

          <span className="text-xs sm:text-sm font-mono font-bold tracking-tight">
            {formatTimer(timerSeconds)}
          </span>

          {timerSeconds !== 300 && (
            <button
              type="button"
              onClick={handleResetTimer}
              className="p-0.5 sm:p-1 rounded-md text-neutral-400 hover:text-white hover:bg-black/20 transition-colors"
              title="Reset Timer to 5:00"
              aria-label="Reset Timer"
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          )}
        </div>
      </footer>

      {/* Subcategory Selection Drawer / Modal */}
      {drawerCategory && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setDrawerCategory(null)}
        >
          <div
            className={`w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl border shadow-2xl overflow-hidden transition-all ${
              isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? 'border-white/10 bg-[#16161A]' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono-sub tracking-wider uppercase font-bold ${subcategoryColor}`}>
                  {drawerCategory}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {getExercisesForCategory(activeTier, drawerCategory, items).length} items
                </span>
              </div>
              <button
                onClick={() => setDrawerCategory(null)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDarkMode ? 'bg-[#121212] border-white/10 text-neutral-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-950'
                }`}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Exercise List in simple-to-complex CSV order */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 dark:divide-white/5 divide-slate-100 p-2 sm:p-3 no-scrollbar">
              {getExercisesForCategory(activeTier, drawerCategory, items).map((exercise) => {
                const currentSelectedId = selectedCategoryTargets[`${activeTier}:${drawerCategory}`] || getExercisesForCategory(activeTier, drawerCategory, items)[0]?.id;
                const isSelected = currentSelectedId === exercise.id;
                const isDone = isExerciseCompleted(currentTierState.regimenProgress, anchorId, exercise.id);

                return (
                  <div
                    key={exercise.id}
                    onClick={() => handleSelectCategoryTarget(drawerCategory, exercise.id)}
                    className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? isDarkMode ? 'bg-blue-600/20 border border-blue-500/40 shadow-xs' : 'bg-blue-50 border border-blue-200 shadow-xs'
                        : isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                        isDone
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : isDarkMode ? 'border-neutral-700 bg-transparent text-transparent' : 'border-slate-300 bg-transparent text-transparent'
                      }`}>
                        {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm sm:text-base font-bold truncate ${
                            isSelected ? 'text-blue-400' : isDone ? 'text-neutral-400 line-through' : isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {exercise.name}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemForModal(exercise);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title="View Details"
                        aria-label="View Details"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItemForModal && (() => {
        const modalItem = items.find(i => i.id === selectedItemForModal.id) || selectedItemForModal;
        return (
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
                aria-label="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className={`text-sm font-mono-sub uppercase tracking-wider block mb-1.5 whitespace-normal break-words ${subcategoryColor}`}>
                  {modalItem.category}
                </span>
                <h3 className={`text-3xl sm:text-4xl font-bold tracking-tight mb-4 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                  {modalItem.name}
                </h3>
                <p className={`text-lg sm:text-xl leading-relaxed mb-3 ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                  {modalItem.description || 'No description provided.'}
                </p>
                {modalItem.example && (
                  <p className={`text-sm sm:text-base tracking-wide ${isDarkMode ? 'text-neutral-400 opacity-60' : 'text-slate-500 opacity-70'}`}>
                    {modalItem.example}
                  </p>
                )}
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const cat = modalItem.category.trim();
                    const tier = modalItem.tier;
                    setSelectedItemForModal(null);
                    setSeeAllCategoryForModal({ tier, category: cat });
                  }}
                  className={`text-xs font-bold transition-colors hover:underline cursor-pointer ${subcategoryColor}`}
                >
                  See All <span className="italic">{modalItem.category}</span>
                </button>

                <div className="flex items-center gap-3">
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
          </div>
        );
      })()}

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
                aria-label="Close Category View"
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
                        setSelectedItemForModal(item);
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
                      <h4 className="font-bold text-base">{item.name}</h4>
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



      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className={`border rounded-2xl max-w-lg w-full p-6 relative shadow-2xl space-y-5 ${
              isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-bold tracking-tight">Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className={`p-2 rounded-xl border transition-colors ${
                  isDarkMode ? 'bg-[#121212] border-[#2A2A30] text-neutral-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                aria-label="Close Settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Settings Tabs */}
            <div className="flex items-center gap-2 border-b pb-2">
              <button
                onClick={() => setSettingsTab('sheets')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  settingsTab === 'sheets'
                    ? 'bg-blue-600 text-white'
                    : isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Google Sheets CSV
              </button>
              <button
                onClick={() => setSettingsTab('pdfs')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  settingsTab === 'pdfs'
                    ? 'bg-blue-600 text-white'
                    : isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reference PDFs
              </button>
              <button
                onClick={() => setSettingsTab('subcategories')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  settingsTab === 'subcategories'
                    ? 'bg-blue-600 text-white'
                    : isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Visibility
              </button>
            </div>

            {settingsTab === 'sheets' ? (
              <div className="space-y-4">
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  Sync your practice catalog live from a published Google Sheet CSV URL (Schema: <code>Tier, Category, Type, Lesson Item, Description, Example</code>).
                </p>

                <form onSubmit={handleSaveSettings} className="space-y-3">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                      Google Sheet Published CSV URL
                    </label>
                    <input
                      type="url"
                      value={csvUrl}
                      onChange={(e) => setCsvUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                      className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-[#121212] border-[#2A2A30] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {csvStatus && (
                    <div className={`p-3 rounded-xl border text-xs ${
                      csvStatus.isError
                        ? 'bg-red-950/30 border-red-900/50 text-red-400'
                        : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
                    }`}>
                      {csvStatus.message}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
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
              <div className="space-y-4">
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

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {customPdfs.map(pdf => (
                    <div
                      key={pdf.id}
                      onClick={() => handleSelectPdf(pdf)}
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border w-full cursor-pointer ${
                        isDarkMode ? 'bg-[#121212] border-[#2A2A30] hover:bg-black/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                      } transition-colors`}
                    >
                      <span className="text-sm font-medium truncate flex-1" title={pdf.title}>
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
                        aria-label={`Delete ${pdf.title}`}
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
              <div className="space-y-4">
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {MASTER_TIERS.map(({ id: tierId, label: tierLabel }) => {
                    const tierItems = items.filter(i => i.tier === tierId);
                    const uniqueCats: string[] = Array.from(new Set(tierItems.map(i => i.category)));
                    if (uniqueCats.length === 0) return null;

                    return (
                      <div key={tierId} className="space-y-2">
                        <h5 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                          {tierLabel} Categories
                        </h5>
                        <div className={`border rounded-xl p-3 space-y-2 ${
                          isDarkMode ? 'bg-[#121212] border-[#2A2A30]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          {uniqueCats.map((cat: string) => {
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
                aria-label="Close Fullscreen Viewer"
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
              id={selectedPdfForFullscreen.id}
            />

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
                      aria-label="Previous PDF"
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
                      aria-label="Next PDF"
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

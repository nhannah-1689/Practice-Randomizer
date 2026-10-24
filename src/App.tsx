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
  FolderOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { defaultPracticeDataset, PracticeItem, MasterTier } from './data/pianoData';
import { defaultReferencePdfs, ReferencePdf } from './data/samplePdfs';
import { parseCSV } from './utils/csvParser';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
  const [customPdfs, setCustomPdfs] = useState<ReferencePdf[]>(() => {
    try {
      const saved = localStorage.getItem('pd_custom_pdfs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
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
  const [isDarkMode, setIsDarkMode] = useState(true);

  // CSV live sync states
  const [csvUrl, setCsvUrl] = useState('');
  const [isLoadingCsv, setIsLoadingCsv] = useState(false);
  const [csvStatus, setCsvStatus] = useState<{ message: string; isError: boolean } | null>(null);

  // Google Drive integration states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [driveFiles, setDriveFiles] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [isDriveBrowserOpen, setIsDriveBrowserOpen] = useState(false);
  const [selectedDriveFileIds, setSelectedDriveFileIds] = useState<Record<string, boolean>>({});
  const [driveImportCategory, setDriveImportCategory] = useState<string>('Google Drive');
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [driveLinkTitle, setDriveLinkTitle] = useState('');

  const handleAddDriveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveLinkInput.trim()) return;

    let fileId = driveLinkInput.trim();
    if (fileId.includes('/d/')) {
      const parts = fileId.split('/d/');
      if (parts[1]) {
        fileId = parts[1].split('/')[0];
      }
    } else if (fileId.includes('id=')) {
      const urlParams = new URLSearchParams(fileId.split('?')[1] || '');
      const id = urlParams.get('id');
      if (id) fileId = id;
    }

    const title = driveLinkTitle.trim() || `Google Drive PDF (${fileId.substring(0, 8)})`;
    const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;

    const newPdf: ReferencePdf = {
      id: `drive-link-${Date.now()}`,
      title: title,
      category: 'Google Drive',
      description: `Hosted on Google Drive (ID: ${fileId})`,
      fileName: `${title}.pdf`,
      fileSize: 'Google Drive',
      dataUri: previewUrl,
      pages: [
        {
          pageNumber: 1,
          heading: title,
          content: [
            "Google Drive hosted PDF document.",
            `File ID: ${fileId}`,
            "File remains hosted on Google Drive and is viewed via secure embed."
          ]
        }
      ]
    };

    const updated = [...customPdfs, newPdf];
    setCustomPdfs(updated);
    localStorage.setItem('pd_custom_pdfs', JSON.stringify(updated));
    setDriveLinkInput('');
    setDriveLinkTitle('');
    setSelectedPdfForFullscreen(newPdf);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setGoogleUser(user);
        try {
          await user.getIdTokenResult();
        } catch {}
      } else {
        setGoogleUser(null);
        setGoogleAccessToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = () => {
    setIsGoogleSigningIn(true);
    setDriveError(null);

    if (!window.google?.accounts?.oauth2) {
      setIsGoogleSigningIn(false);
      setDriveError('Google Identity Services client not loaded. Please try again.');
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: firebaseConfig.oAuthClientId || "704775200040-im0hlq67k76lahrlitf15kjpdjcspmh0.apps.googleusercontent.com",
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response) => {
          setIsGoogleSigningIn(false);
          if (response.access_token) {
            setGoogleAccessToken(response.access_token);
            setGoogleUser({
              uid: 'gdrive-user',
              email: 'google-drive@user.local',
              displayName: 'Google Drive User'
            } as any);
            fetchDriveFiles(response.access_token);
            setIsDriveBrowserOpen(true);
          } else {
            setDriveError('Failed to obtain Google Drive access token.');
          }
        },
      });
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      setIsGoogleSigningIn(false);
      console.error('Google sign in error:', err);
      setDriveError(err.message || 'Failed to sign in with Google Drive.');
    }
  };

  const fetchDriveFiles = async (token?: string) => {
    const activeToken = token || googleAccessToken;
    if (!activeToken) return;

    setIsLoadingDrive(true);
    setDriveError(null);
    try {
      const res = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fpdf%27&pageSize=100",
        {
          headers: { Authorization: `Bearer ${activeToken}` }
        }
      );
      if (!res.ok) throw new Error(`Google Drive API error: ${res.status}`);
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      console.error('Failed to fetch Drive files:', err);
      setDriveError('Failed to load PDFs from Google Drive.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleBatchImportDriveFiles = () => {
    const filesToImport = driveFiles.filter(f => selectedDriveFileIds[f.id]);
    if (filesToImport.length === 0) return;

    const newPdfs: ReferencePdf[] = filesToImport.map(file => {
      const previewUrl = `https://drive.google.com/file/d/${file.id}/preview`;
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .trim() || file.name;

      return {
        id: `drive-pdf-${file.id}`,
        title: cleanTitle,
        category: driveImportCategory,
        description: `Hosted on Google Drive: ${file.name}`,
        fileName: file.name,
        fileSize: 'Google Drive',
        dataUri: previewUrl,
        pages: [
          {
            pageNumber: 1,
            heading: cleanTitle,
            content: [
              "Google Drive hosted PDF document.",
              `File ID: ${file.id}`,
              "File remains hosted on Google Drive and is viewed via secure embed."
            ]
          }
        ]
      };
    });

    const updated = [...customPdfs];
    newPdfs.forEach(np => {
      if (!updated.some(cp => cp.id === np.id)) {
        updated.push(np);
      }
    });

    setCustomPdfs(updated);
    localStorage.setItem('pd_custom_pdfs', JSON.stringify(updated));
    setSelectedDriveFileIds({});
    setIsDriveBrowserOpen(false);
    if (newPdfs.length > 0) {
      setSelectedPdfForFullscreen(newPdfs[0]);
    }
  };

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
        catMap.get(catName)!.push(item);
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
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      const newPdf: ReferencePdf = {
        id: `custom-pdf-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        category: 'Custom Upload',
        description: `Uploaded custom PDF reference document: ${file.name}`,
        fileName: file.name,
        fileSize: `${Math.round(file.size / 1024)} KB`,
        dataUri: dataUri,
        pages: [
          {
            pageNumber: 1,
            heading: file.name,
            content: [
              "Custom uploaded reference document.",
              `File size: ${Math.round(file.size / 1024)} KB`,
              "Click 'Fullscreen' to view the full document."
            ]
          }
        ]
      };

      const updated = [...customPdfs, newPdf];
      setCustomPdfs(updated);
      localStorage.setItem('pd_custom_pdfs', JSON.stringify(updated));
      setSelectedPdfForFullscreen(newPdf);
    };
    reader.readAsDataURL(file);
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
    localStorage.setItem('pd_custom_pdfs', JSON.stringify(updated));
    setNewPdfUrl('');
    setSelectedPdfForFullscreen(newPdf);
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
                .map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSeeAllCategoryForModal(null);
                      setSelectedSeeAllItemForModal(item);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isDarkMode
                        ? 'hover:bg-[#25252B] bg-[#222226] border-white/5'
                        : 'hover:bg-slate-100 bg-slate-50 border-slate-200'
                    }`}
                  >
                    <h4 className="font-bold text-sm">{item.name}</h4>
                  </div>
                ))}
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
                {/* Google Drive Integration & Link Importer */}
                <div className={`border rounded-xl p-4 space-y-3 ${
                  isDarkMode ? 'bg-[#121212] border-[#2A2A30]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <FolderOpen className={`w-4 h-4 ${subcategoryColor}`} />
                        <span>Google Drive Cloud Sync</span>
                      </h4>
                      <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                        Paste a Google Drive shareable link or file ID to instantly view PDFs hosted on Google Drive.
                      </p>
                    </div>
                  </div>

                  {/* Direct Link Importer (Bypasses OAuth origin mismatch restrictions) */}
                  <form onSubmit={handleAddDriveLink} className="space-y-2 pt-1 border-t border-slate-200 dark:border-neutral-800">
                    <label className="text-[11px] font-medium block text-slate-600 dark:text-neutral-400">
                      Add Google Drive PDF via Shareable Link or File ID:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={driveLinkInput}
                        onChange={(e) => setDriveLinkInput(e.target.value)}
                        placeholder="https://drive.google.com/file/d/... or file ID"
                        className={`flex-1 px-3 py-2 rounded-xl text-xs border outline-none ${
                          isDarkMode
                            ? 'bg-[#1A1A1E] border-neutral-700 text-white placeholder-neutral-500 focus:border-neutral-500'
                            : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-slate-500'
                        }`}
                      />
                      <input
                        type="text"
                        value={driveLinkTitle}
                        onChange={(e) => setDriveLinkTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className={`w-32 px-3 py-2 rounded-xl text-xs border outline-none ${
                          isDarkMode
                            ? 'bg-[#1A1A1E] border-neutral-700 text-white placeholder-neutral-500 focus:border-neutral-500'
                            : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-slate-500'
                        }`}
                      />
                      <button
                        type="submit"
                        style={{ backgroundColor: primaryBlue }}
                        className="px-3 py-2 rounded-xl text-white font-bold text-xs shrink-0 hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                </div>

                {/* PDFs grouped by categories matching Subcategories style */}
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {['Technique', 'Repertoire', 'Improvisation', 'Google Drive', 'Custom Upload', 'External Link'].map((catName) => {
                    const categoryPdfs = customPdfs.filter(p => (p.category || 'Google Drive') === catName);
                    if (categoryPdfs.length === 0) return null;

                    return (
                      <div key={catName} className="space-y-2">
                        <h5 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                          {catName} PDFs
                        </h5>
                        <div className={`border rounded-xl p-3 space-y-2 ${
                          isDarkMode ? 'bg-[#121212] border-[#2A2A30]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          {categoryPdfs.map(pdf => (
                            <div
                              key={pdf.id}
                              className="flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                              <span
                                className="text-sm font-medium truncate flex-1"
                                onClick={() => setSelectedPdfForFullscreen(pdf)}
                                title={pdf.title}
                              >
                                {pdf.title}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPdfToDelete(pdf)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                                title="Delete PDF"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {customPdfs.length === 0 && (
                    <p className={`text-xs text-center py-6 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      No custom PDFs added yet. Add a Google Drive PDF link above.
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

      {/* Google Drive Folder & File Browser Multi-Select Modal */}
      {isDriveBrowserOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsDriveBrowserOpen(false)}
        >
          <div
            className={`border rounded-2xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FolderOpen className={`w-4 h-4 ${subcategoryColor}`} />
                <span>Select PDFs from Google Drive</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDriveBrowserOpen(false)}
                className={`p-2 rounded-xl border transition-colors ${
                  isDarkMode ? 'bg-[#121212] border-[#2A2A30] text-neutral-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Check files to import in batch:</span>
                <button
                  type="button"
                  onClick={() => fetchDriveFiles()}
                  disabled={isLoadingDrive}
                  className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {isLoadingDrive ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                  <span>Refresh Files</span>
                </button>
              </div>

              {driveFiles.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {driveFiles.map(file => {
                    const isChecked = !!selectedDriveFileIds[file.id];
                    return (
                      <label
                        key={file.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          isChecked
                            ? isDarkMode ? 'bg-blue-500/20 border-blue-500/50' : 'bg-blue-50 border-blue-300'
                            : isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setSelectedDriveFileIds(prev => ({
                                ...prev,
                                [file.id]: e.target.checked
                              }));
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-medium truncate">{file.name}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 py-8 text-center">
                  {isLoadingDrive ? 'Loading PDF files from Google Drive...' : 'No PDF files found in Google Drive.'}
                </p>
              )}

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-700'}`}>
                  Assign Category for Selected Files
                </label>
                <select
                  value={driveImportCategory}
                  onChange={(e) => setDriveImportCategory(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-[#121212] border-[#2A2A30] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="Technique">Technique</option>
                  <option value="Repertoire">Repertoire</option>
                  <option value="Improvisation">Improvisation</option>
                  <option value="Google Drive">Google Drive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDriveBrowserOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isDarkMode ? 'bg-[#2A2A30] text-neutral-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBatchImportDriveFiles}
                  disabled={Object.values(selectedDriveFileIds).filter(Boolean).length === 0}
                  style={{ backgroundColor: primaryBlue }}
                  className="px-5 py-2.5 rounded-xl text-white text-xs font-bold disabled:opacity-50 shadow-md cursor-pointer"
                >
                  Import Selected ({Object.values(selectedDriveFileIds).filter(Boolean).length})
                </button>
              </div>
            </div>
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
                onClick={() => handleOpenPdfTab(selectedPdfForFullscreen)}
                className="px-3 py-1.5 rounded-lg bg-[#2A2A30] text-white text-xs font-bold hover:bg-[#3A3A40] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </button>
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
            {(() => {
              const url = selectedPdfForFullscreen.dataUri;
              const embedUrl = getEmbedUrl(url);
              return (
                <iframe
                  src={embedUrl}
                  className="w-full h-full border-0"
                  title={selectedPdfForFullscreen.title}
                />
              );
            })()}

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
                      onClick={() => setSelectedPdfForFullscreen(allPdfs[currentIndex - 1])}
                      className="p-2.5 rounded-xl bg-[#2A2A30] text-white hover:bg-[#3A3A40] transition-colors cursor-pointer flex items-center justify-center shadow"
                      title="Previous PDF"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {hasNext && (
                    <button
                      type="button"
                      onClick={() => setSelectedPdfForFullscreen(allPdfs[currentIndex + 1])}
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
                  const updated = customPdfs.filter(cp => cp.id !== pdfToDelete.id);
                  setCustomPdfs(updated);
                  localStorage.setItem('pd_custom_pdfs', JSON.stringify(updated));
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

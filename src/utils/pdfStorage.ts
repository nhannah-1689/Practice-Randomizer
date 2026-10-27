import { ReferencePdf } from '../data/samplePdfs';

const DB_NAME = 'PianoPracticeApp_DB';
const STORE_NAME = 'customPdfs';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function getStoredPdfs(): Promise<ReferencePdf[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let pdfs = request.result as ReferencePdf[];
        if (pdfs && pdfs.length > 0) {
          pdfs = pdfs.map(pdf => {
            if (pdf.blob) {
              try {
                pdf.dataUri = URL.createObjectURL(pdf.blob);
              } catch {}
            }
            return pdf;
          });
        } else {
          // Fallback or migration from localStorage if IndexedDB is empty
          try {
            const local = localStorage.getItem('pd_custom_pdfs');
            if (local) {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed) && parsed.length > 0) {
                pdfs = parsed;
                localStorage.removeItem('pd_custom_pdfs');
                saveStoredPdfs(pdfs).catch(() => {});
              }
            }
          } catch {}
        }
        resolve(pdfs || []);
      };
    });
  } catch (err) {
    console.warn('IndexedDB read failed', err);
    try {
      const local = localStorage.getItem('pd_custom_pdfs');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  }
}

export async function saveStoredPdfs(pdfs: ReferencePdf[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      pdfs.forEach(pdf => {
        const toStore = { ...pdf };
        if (toStore.dataUri && toStore.dataUri.startsWith('blob:')) {
          toStore.dataUri = '';
        }
        store.put(toStore);
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err: any) {
    console.error('IndexedDB write failed:', err);
    throw new Error('Storage limit reached or IndexedDB error. Please delete some files and try again.');
  }
}

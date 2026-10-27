export interface PdfPage {
  pageNumber: number;
  heading: string;
  content: string[];
  musicalExample?: {
    title: string;
    notes: string;
    chords?: string;
  };
}

export interface ReferencePdf {
  id: string;
  title: string;
  category: string;
  description: string;
  fileName: string;
  fileSize: string;
  dataUri: string;
  blob?: Blob;
  pages: PdfPage[];
}

export const defaultReferencePdfs: ReferencePdf[] = [];

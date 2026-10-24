import { PracticeItem, MasterTier } from '../data/pianoData';

export function inferTierFromCategory(category: string, rawTier?: string): MasterTier {
  if (rawTier) {
    const t = rawTier.toLowerCase().trim();
    if (t.includes('tech') || t.includes('scale') || t.includes('exercise') || t.includes('pattern') || t.includes('arpegg')) {
      return 'Technique';
    }
    if (t.includes('rep') || t.includes('tune') || t.includes('comp') || t.includes('melody') || t.includes('hymn')) {
      return 'Repertoire';
    }
    if (t.includes('improv') || t.includes('chord') || t.includes('voicing') || t.includes('reharm') || t.includes('solo')) {
      return 'Improvisation';
    }
  }

  const cat = category.toLowerCase().trim();
  if (cat.includes('scale') || cat.includes('pattern') || cat.includes('exercise') || cat.includes('arpegg') || cat.includes('drill')) {
    return 'Technique';
  }
  if (cat.includes('rep') || cat.includes('tune') || cat.includes('comp') || cat.includes('melody') || cat.includes('hymn') || cat.includes('psalter')) {
    return 'Repertoire';
  }
  return 'Improvisation';
}

function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCol = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCol += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCol.trim());
      currentCol = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCol.trim());
      currentCol = '';
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCol += char;
    }
  }

  if (currentCol.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCol.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parseCSV(csvText: string): PracticeItem[] {
  const rawRows = parseCSVRows(csvText);
  const items: PracticeItem[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row.length === 0) continue;

    const firstCol = (row[0] || '').toLowerCase();
    const secondCol = (row[1] || '').toLowerCase();
    if (i === 0 && (firstCol.includes('tier') || firstCol.includes('category') || secondCol.includes('category') || secondCol.includes('item'))) {
      continue;
    }

    let tier: MasterTier;
    let category: string;
    let name: string;
    let description: string;
    let pageNumber: string | undefined;
    let example: string | undefined;

    if (row.length >= 6) {
      const rawTier = row[0];
      category = row[1] || 'General';
      name = row[2] || 'Untitled Item';
      description = row[3] || '';
      const rawPage = row[4];
      const rawExample = row[5];
      if (rawPage) {
        pageNumber = rawPage.toLowerCase().startsWith('page') ? rawPage : `Page ${rawPage}`;
      }
      if (rawExample) {
        example = rawExample;
      }
      tier = inferTierFromCategory(category, rawTier);
    } else if (row.length === 5) {
      const rawTier = row[0];
      category = row[1] || 'General';
      name = row[2] || 'Untitled Item';
      description = row[3] || '';
      const col4 = row[4];
      if (col4) {
        if (/^(page\s*|\p\.?\s*)?\d+/i.test(col4) || col4.toLowerCase().includes('page')) {
          pageNumber = col4.toLowerCase().startsWith('page') ? col4 : `Page ${col4}`;
        } else {
          example = col4;
        }
      }
      tier = inferTierFromCategory(category, rawTier);
    } else if (row.length === 4) {
      const rawTier = row[0];
      category = row[1] || 'General';
      name = row[2] || 'Untitled Item';
      const col3 = row[3] || '';
      if (/^(page\s*|\p\.?\s*)?\d+/i.test(col3) && (category.toLowerCase().includes('source') || rawTier.toLowerCase().includes('rep'))) {
        pageNumber = col3.toLowerCase().startsWith('page') ? col3 : `Page ${col3}`;
        description = '';
      } else {
        description = col3;
        const pageMatch = description.match(/(page\s*|p\.?\s*)(\d+)/i);
        if (pageMatch) {
          pageNumber = `Page ${pageMatch[2]}`;
        }
      }
      tier = inferTierFromCategory(category, rawTier);
    } else if (row.length === 3) {
      category = row[0] || 'General';
      name = row[1] || 'Untitled Item';
      description = row[2] || '';
      const pageMatch = description.match(/(page\s*|p\.?\s*)(\d+)/i);
      if (pageMatch) {
        pageNumber = `Page ${pageMatch[2]}`;
      }
      tier = inferTierFromCategory(category);
    } else if (row.length === 2) {
      category = row[0] || 'General';
      name = row[1] || 'Untitled Item';
      description = '';
      tier = inferTierFromCategory(category);
    } else {
      category = 'General';
      name = row[0] || 'Untitled Item';
      description = '';
      tier = 'Technique';
    }

    // Clean name from embedded page numbers if any
    const namePageMatch = name.match(/(?:\s*[-–—:]\s*|\s*\()\s*(?:page\s*|p\.?\s*)(\d+)\s*\)?/i);
    if (namePageMatch) {
      if (!pageNumber) {
        pageNumber = `Page ${namePageMatch[1]}`;
      }
      name = name.replace(namePageMatch[0], '').trim();
    }

    if (name && name !== 'Lesson Item' && name !== 'Item') {
      items.push({
        id: `csv-${i}-${name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || Math.random().toString(36).substring(2, 7)}`,
        tier,
        category,
        name,
        description,
        ...(pageNumber ? { pageNumber } : {}),
        ...(example ? { example } : {})
      });
    }
  }

  return items;
}

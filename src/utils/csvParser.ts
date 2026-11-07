import { PracticeItem, MasterTier, getItemType } from '../data/pianoData';

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
  if (rawRows.length === 0) return items;

  let headerMap: { [key: string]: number } | null = null;
  const firstRow = rawRows[0].map(c => c.trim().toLowerCase());

  // Check if first row is a header row
  const isHeaderRow = firstRow.some(col => 
    col.includes('tier') || 
    col.includes('category') || 
    col.includes('type') || 
    col.includes('item') || 
    col.includes('lesson') ||
    col.includes('description')
  );

  let startIndex = 0;
  if (isHeaderRow) {
    headerMap = {};
    firstRow.forEach((col, idx) => {
      if (col.includes('tier')) headerMap!['tier'] = idx;
      else if (col.includes('category') || col.includes('subcat')) headerMap!['category'] = idx;
      else if (col === 'type' || col.includes('item type')) headerMap!['type'] = idx;
      else if (col.includes('item') || col.includes('name') || col.includes('title') || col.includes('lesson')) headerMap!['name'] = idx;
      else if (col.includes('desc')) headerMap!['description'] = idx;
      else if (col.includes('exam')) headerMap!['example'] = idx;
      else if (col.includes('page')) headerMap!['page'] = idx;
    });
    startIndex = 1;
  }

  for (let i = startIndex; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row.length === 0 || row.every(cell => !cell.trim())) continue;

    let rawTier: string = '';
    let category: string = 'General';
    let rawType: string = '';
    let name: string = 'Untitled Item';
    let description: string = '';
    let pageNumber: string | undefined;
    let example: string | undefined;

    if (headerMap && (headerMap['name'] !== undefined || headerMap['category'] !== undefined)) {
      if (headerMap['tier'] !== undefined) rawTier = row[headerMap['tier']] || '';
      if (headerMap['category'] !== undefined) category = row[headerMap['category']] || 'General';
      if (headerMap['type'] !== undefined) rawType = row[headerMap['type']] || '';
      if (headerMap['name'] !== undefined) name = row[headerMap['name']] || 'Untitled Item';
      if (headerMap['description'] !== undefined) description = row[headerMap['description']] || '';
      if (headerMap['example'] !== undefined) example = row[headerMap['example']];
      if (headerMap['page'] !== undefined) pageNumber = row[headerMap['page']];
    } else {
      // Positional parsing fallback
      // Check if row[2] looks like a Type ('Anchor' | 'Exercise')
      const col2Lower = (row[2] || '').trim().toLowerCase();
      const hasTypeInCol2 = col2Lower === 'anchor' || col2Lower === 'exercise';

      if (row.length >= 6 && hasTypeInCol2) {
        // Updated schema: Tier, Category, Type, Lesson Item, Description, Example
        rawTier = row[0];
        category = row[1] || 'General';
        rawType = row[2];
        name = row[3] || 'Untitled Item';
        description = row[4] || '';
        example = row[5];
      } else if (row.length >= 6) {
        // Legacy 6-column: Tier, Category, Lesson Item, Description, Page #, Example
        rawTier = row[0];
        category = row[1] || 'General';
        name = row[2] || 'Untitled Item';
        description = row[3] || '';
        const rawPage = row[4];
        const rawExample = row[5];
        if (rawPage) pageNumber = rawPage.toLowerCase().startsWith('page') ? rawPage : `Page ${rawPage}`;
        if (rawExample) example = rawExample;
      } else if (row.length === 5) {
        rawTier = row[0];
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
      } else if (row.length === 4) {
        rawTier = row[0];
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
      } else if (row.length === 3) {
        category = row[0] || 'General';
        name = row[1] || 'Untitled Item';
        description = row[2] || '';
        const pageMatch = description.match(/(page\s*|p\.?\s*)(\d+)/i);
        if (pageMatch) {
          pageNumber = `Page ${pageMatch[2]}`;
        }
      } else if (row.length === 2) {
        category = row[0] || 'General';
        name = row[1] || 'Untitled Item';
        description = '';
      } else {
        category = 'General';
        name = row[0] || 'Untitled Item';
        description = '';
      }
    }

    const tier = inferTierFromCategory(category, rawTier);

    // Clean name from embedded page numbers if any
    const namePageMatch = name.match(/(?:\s*[-–—:]\s*|\s*\()\s*(?:page\s*|p\.?\s*)(\d+)\s*\)?/i);
    if (namePageMatch) {
      if (!pageNumber) {
        pageNumber = `Page ${namePageMatch[1]}`;
      }
      name = name.replace(namePageMatch[0], '').trim();
    }

    let parsedType: 'Anchor' | 'Exercise' | undefined;
    const cleanRawType = rawType.trim().toLowerCase();
    if (cleanRawType === 'anchor') {
      parsedType = 'Anchor';
    } else if (cleanRawType === 'exercise') {
      parsedType = 'Exercise';
    }

    if (name && name !== 'Lesson Item' && name !== 'Item' && name !== 'Untitled Item') {
      const item: PracticeItem = {
        id: `csv-${i}-${name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || Math.random().toString(36).substring(2, 7)}`,
        tier,
        category,
        name,
        description,
        ...(pageNumber ? { pageNumber } : {}),
        ...(example ? { example } : {})
      };

      if (parsedType) {
        item.type = parsedType;
      } else {
        item.type = getItemType(item);
      }

      items.push(item);
    }
  }

  return items;
}

import React from 'react';
import { X, Printer, Layers, BookOpen, Palette, FileText } from 'lucide-react';
import { MasterTier, PracticeItem } from '../data/pianoData';
import { getCategoriesForTier, getItemsForCategory } from '../utils/sectionManager';

interface PrintCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PracticeItem[];
  hiddenSubcategories: Record<string, boolean>;
  isDarkMode: boolean;
}

const MASTER_TIERS_CONFIG: { tier: MasterTier; primaryCategory: string; label: string; icon: React.ReactNode }[] = [
  { tier: 'Technique', primaryCategory: 'Key', label: '1. Technique & Key Mastery', icon: <Layers className="w-5 h-5 text-blue-500" /> },
  { tier: 'Repertoire', primaryCategory: 'Repertoire', label: '2. Repertoire & Song Studies', icon: <BookOpen className="w-5 h-5 text-blue-500" /> },
  { tier: 'Improvisation', primaryCategory: 'Improvisation', label: '3. Improvisation & Chord Progressions', icon: <Palette className="w-5 h-5 text-blue-500" /> }
];

export default function PrintCategoryModal({
  isOpen,
  onClose,
  items,
  hiddenSubcategories,
  isDarkMode
}: PrintCategoryModalProps) {
  if (!isOpen) return null;

  const generateHtmlForTier = (tierKey?: MasterTier) => {
    const selectedConfigs = tierKey 
      ? MASTER_TIERS_CONFIG.filter(c => c.tier === tierKey)
      : MASTER_TIERS_CONFIG;

    let tiersHtml = '';

    selectedConfigs.forEach(({ tier, primaryCategory, label }) => {
      const categories = getCategoriesForTier(tier, items, hiddenSubcategories);
      const secondaryCategories = categories.filter(c => c.toLowerCase() !== primaryCategory.toLowerCase());

      let logLinesHtml = '';
      for (let i = 1; i <= 10; i++) {
        logLinesHtml += `
          <div class="log-line">
            <span class="log-num">${i}.</span>
            <div class="checkbox"></div>
            <span class="log-text">Starting ${primaryCategory}: _____________________________________________</span>
          </div>
        `;
      }

      let subCategoriesHtml = '';
      secondaryCategories.forEach(subCategory => {
        const subItems = getItemsForCategory(tier, subCategory, items);
        if (subItems.length === 0) return;

        let itemsHtml = '';
        subItems.forEach(item => {
          itemsHtml += `
            <div class="item-row">
              <div class="checkbox"></div>
              <span class="item-name">${item.name}</span>
            </div>
          `;
        });

        subCategoriesHtml += `
          <div class="sub-box">
            <div class="sub-title">${subCategory}</div>
            <div class="sub-items">${itemsHtml}</div>
          </div>
        `;
      });

      tiersHtml += `
        <div class="tier-page">
          <div class="tier-header">
            <div class="tier-title">${label}</div>
            <div class="tier-sub">Primary Category: <strong>${primaryCategory.toUpperCase()}</strong></div>
          </div>

          <div class="section-block">
            <h3>Practice Log (10 Starting ${primaryCategory} Entries)</h3>
            <div class="log-grid">${logLinesHtml}</div>
          </div>

          <div class="section-block" style="margin-top: 16px;">
            <h3>Subcategory Checklists</h3>
            <div class="sub-grid">${subCategoriesHtml}</div>
          </div>
        </div>
      `;
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Piano Practice Curriculum Worksheet</title>
  <style>
    @page { size: letter portrait; margin: 0.5in; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; color: #111; background: #fff; max-width: 8.5in; margin: 0 auto; font-size: 11px; line-height: 1.3; }
    .print-bar { background: #f0f4ff; border: 1px solid #bfdbfe; padding: 12px 20px; border-radius: 8px; text-align: center; margin-bottom: 24px; display: flex; gap: 12px; justify-content: center; align-items: center; }
    .print-btn { background: #2563eb; color: #fff; border: none; padding: 8px 20px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; }
    h1 { text-align: center; font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0; }
    p.sub { text-align: center; font-size: 12px; color: #555; margin: 0 0 20px 0; }
    .tier-page { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; page-break-after: always; break-after: page; }
    .tier-header { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: baseline; }
    .tier-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #1d4ed8; }
    .tier-sub { font-size: 12px; color: #555; }
    h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 0 0 8px 0; color: #1e293b; }
    .log-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 16px; }
    .log-line { display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed #cbd5e1; padding: 5px 4px; font-size: 11px; }
    .log-num { font-family: monospace; color: #64748b; width: 16px; font-weight: bold; }
    .log-text { color: #334155; font-style: italic; flex: 1; }
    .sub-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .sub-box { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; background: #fafafa; }
    .sub-title { font-weight: 800; text-transform: uppercase; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; color: #1e293b; }
    .item-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 11px; }
    .item-name { font-weight: 600; color: #0f172a; }
    .checkbox { width: 12px; height: 12px; border: 1.5px solid #475569; border-radius: 2px; flex-shrink: 0; }
    @media print {
      body { padding: 0; }
      .print-bar { display: none; }
      .tier-page { page-break-after: always; break-after: page; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <span style="font-size: 13px; font-weight: 600; color: #1e40af;">Clean Printable Worksheet:</span>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div>
    <h1>Piano Practice Curriculum Worksheet</h1>
    <p class="sub">Student Assignment & Progress Log</p>
  </div>
  ${tiersHtml}
</body>
</html>`;
  };

  const handleOpenPrintTab = (tierKey?: MasterTier) => {
    const html = generateHtmlForTier(tierKey);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-6 ${
        isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A30] text-[#F3F4F6]' : 'bg-white border-slate-200 text-slate-900'
      }`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-500" />
            <h3 className="text-base font-bold">Print Practice Worksheet</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          Select a category to print a clean, standard portrait worksheet featuring 10 write-in practice lines at the top and subcategory checklists below.
        </p>

        <div className="space-y-2.5">
          {MASTER_TIERS_CONFIG.map(({ tier, label, icon }) => (
            <button
              key={tier}
              onClick={() => handleOpenPrintTab(tier)}
              className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer group ${
                isDarkMode 
                  ? 'bg-[#16161A] border-[#2A2A30] hover:bg-[#1E1E24] hover:border-blue-500/50 text-white' 
                  : 'bg-slate-50 border-slate-200 hover:bg-blue-50/50 hover:border-blue-300 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {icon}
                <div className="text-left">
                  <div className="font-bold text-sm group-hover:text-blue-500 transition-colors">{label}</div>
                  <div className="text-[10px] text-neutral-400">Portrait Format (10 Practice Lines + Checklists)</div>
                </div>
              </div>
              <Printer className="w-4 h-4 text-neutral-400 group-hover:text-blue-500 transition-colors" />
            </button>
          ))}

          <button
            onClick={() => handleOpenPrintTab(undefined)}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer group ${
              isDarkMode 
                ? 'bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/20 text-blue-400' 
                : 'bg-blue-50 border-blue-200 hover:bg-blue-100/60 text-blue-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-500" />
              <div className="text-left">
                <div className="font-bold text-sm">Print All Categories (Complete Workbook)</div>
                <div className="text-[10px] opacity-80">Technique, Repertoire, & Improvisation</div>
              </div>
            </div>
            <Printer className="w-4 h-4 text-blue-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

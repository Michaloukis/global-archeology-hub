/**
 * Parse PDF or Word documents to infer form structure (labels and input fields)
 * for use as report templates. Uses heuristics: lines/paragraphs ending with ":"
 * as labels, blank or underline lines as fields.
 */
import * as pdfjsLib from 'pdfjs-dist';
// Worker from the installed package so it's served by Vite (no CDN/CORS issues)
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

const LABEL_END = /:\s*$/;
const UNDERLINE_FIELD = /^[\s_\-\.]+$/;
const MAX_LABEL_LENGTH = 80;
const MIN_LABEL_LENGTH = 1;

/**
 * Normalize a label (strip colon, trim, limit length).
 */
function normalizeLabel(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\s*:\s*$/, '').trim().slice(0, MAX_LABEL_LENGTH) || 'Field';
}

/**
 * Infer field type from label text (date-like -> date, long labels often textarea).
 */
function inferFieldType(label) {
  const lower = label.toLowerCase();
  if (/\b(date|when|dob)\b/.test(lower)) return 'date';
  if (/\b(notes?|comments?|description|summary|observations|activities|findings)\b/.test(lower)) return 'textarea';
  return 'text';
}

/**
 * Extract form-like structure from lines: pairs of (label, field).
 * Lines ending with ":" are labels; next line or blank/underline is the field.
 */
function linesToFields(lines) {
  const fields = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (LABEL_END.test(line)) {
      const label = normalizeLabel(line);
      if (label.length >= MIN_LABEL_LENGTH) {
        const next = lines[i + 1];
        const looksLikeField = !next || next.trim() === '' || UNDERLINE_FIELD.test(next.trim());
        fields.push({
          label,
          type: inferFieldType(label),
        });
        if (looksLikeField && next !== undefined) i++;
      }
    }
  }
  return fields;
}

/**
 * Parse PDF buffer: get text with positions, group by line, run heuristic.
 * @param {ArrayBuffer} buffer
 * @returns {Promise<{ name: string, fields: Array<{ key: string, label: string, type: string }> }>}
 */
export async function parsePdfForm(buffer) {
  const doc = await pdfjsLib.getDocument({ data: buffer, useSystemFonts: true, disableFontFace: true }).promise;
  const numPages = doc.numPages;
  const allItems = [];

  for (let p = 1; p <= Math.min(numPages, 5); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    // Group text items by approximate y (line). PDF y is from bottom.
    const byLine = {};
    for (const item of content.items) {
      if (!item.str) continue;
      const tx = item.transform;
      const y = tx[5] ?? 0;
      const lineKey = Math.round(y / 4) * 4;
      if (!byLine[lineKey]) byLine[lineKey] = [];
      byLine[lineKey].push(item.str);
    }

    const sortedY = Object.keys(byLine).map(Number).sort((a, b) => b - a);
    for (const y of sortedY) {
      const parts = byLine[y];
      if (parts && parts.length) allItems.push(parts.join(' '));
    }
  }

  const fields = linesToFields(allItems);
  const withKeys = fields.map((f, i) => ({
    key: `field_${i + 1}_${f.label.toLowerCase().replace(/\W+/g, '_').slice(0, 24)}`,
    label: f.label,
    type: f.type,
  }));

  return {
    name: 'Imported PDF form',
    fields: withKeys.length ? withKeys : [{ key: 'notes', label: 'Notes', type: 'textarea' }],
  };
}

/**
 * Parse DOCX buffer: unzip, read word/document.xml, extract paragraph texts, run heuristic.
 * @param {ArrayBuffer} buffer
 * @returns {Promise<{ name: string, fields: Array<{ key: string, label: string, type: string }> }>}
 */
export async function parseDocxForm(buffer) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) {
    return { name: 'Imported form', fields: [{ key: 'notes', label: 'Notes', type: 'textarea' }] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'application/xml');
  const ns = { w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' };
  const paragraphs = doc.getElementsByTagNameNS(ns.w, 'p');
  const lines = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const texts = p.getElementsByTagNameNS(ns.w, 't');
    let line = '';
    for (let j = 0; j < texts.length; j++) line += (texts[j].textContent || '');
    line = line.trim();
    if (line) lines.push(line);
    else lines.push('');
  }

  const fields = linesToFields(lines);
  const withKeys = fields.map((f, i) => ({
    key: `field_${i + 1}_${f.label.toLowerCase().replace(/\W+/g, '_').slice(0, 24)}`,
    label: f.label,
    type: f.type,
  }));

  return {
    name: 'Imported Word form',
    fields: withKeys.length ? withKeys : [{ key: 'notes', label: 'Notes', type: 'textarea' }],
  };
}

/**
 * Parse a form document from a File. Dispatches to PDF or DOCX based on type.
 * @param {File} file
 * @returns {Promise<{ name: string, fields: Array<{ key: string, label: string, type: string }> }>}
 */
export async function parseFormDocument(file) {
  const buffer = await file.arrayBuffer();
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return parsePdfForm(buffer);
  }
  if (
    type.includes('wordprocessingml') ||
    type.includes('msword') ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    return parseDocxForm(buffer);
  }

  throw new Error('Unsupported format. Please use a PDF or Word (.docx) document.');
}

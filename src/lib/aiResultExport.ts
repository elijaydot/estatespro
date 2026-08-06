import { downloadTextFile } from './download';

export function slugifyAiExportName(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56)
    .replace(/-+$/g, '');

  return slug || 'portfolio-result';
}

export function buildAiExportBaseName(mode: string, query: string) {
  return `fishgate-${slugifyAiExportName(mode)}-${slugifyAiExportName(query)}`;
}

function escapeCsvCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function tableRowsToCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\n');
}

export function exportHtmlTableToCsv(table: HTMLTableElement, filename: string) {
  const rows = Array.from(table.rows).map((row) =>
    Array.from(row.cells).map((cell) => cell.textContent?.trim() || ''),
  );
  downloadTextFile(filename, tableRowsToCsv(rows), 'text/csv;charset=utf-8');
}

type PrintAiResultOptions = {
  title: string;
  query: string;
  resultElement: HTMLElement;
  documentTitle: string;
};

export function printAiResult({ title, query, resultElement, documentTitle }: PrintAiResultOptions) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const printDocument = iframe.contentDocument;
  const printWindow = iframe.contentWindow;
  if (!printDocument || !printWindow) {
    iframe.remove();
    throw new Error('Print preview is unavailable');
  }

  printDocument.title = documentTitle;
  const style = printDocument.createElement('style');
  style.textContent = `
    @page { margin: 16mm; }
    body { color: #111827; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.55; margin: 0; }
    h1 { font-size: 20pt; margin: 0 0 4px; }
    .meta { color: #64748b; font-size: 9pt; margin: 0 0 24px; }
    h2, h3, h4 { break-after: avoid; margin: 18px 0 8px; }
    p { margin: 0 0 10px; }
    ul, ol { margin: 0 0 12px; padding-left: 22px; }
    table { border-collapse: collapse; font-size: 9pt; margin: 14px 0; width: 100%; }
    thead { background: #f1f5f9; }
    th, td { border: 1px solid #cbd5e1; padding: 7px; text-align: left; vertical-align: top; }
    tr { break-inside: avoid; }
    blockquote { border-left: 3px solid #84cc16; color: #475569; margin: 12px 0; padding: 6px 12px; }
    code { background: #f1f5f9; border-radius: 3px; padding: 1px 3px; }
    [data-ai-export-control] { display: none !important; }
  `;
  printDocument.head.appendChild(style);

  const heading = printDocument.createElement('h1');
  heading.textContent = title;
  const meta = printDocument.createElement('p');
  meta.className = 'meta';
  meta.textContent = `${query} | Generated ${new Date().toLocaleString()}`;
  const content = resultElement.cloneNode(true) as HTMLElement;
  content.querySelectorAll('[data-ai-export-control]').forEach((control) => control.remove());
  printDocument.body.append(heading, meta, content);

  printWindow.onafterprint = () => iframe.remove();
  printWindow.focus();
  printWindow.print();
}
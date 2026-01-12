type Primitive = string | number | boolean | null | undefined | Date;

export type CsvRecord = Record<string, Primitive>;

function formatValue(value: Primitive): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function escapeCsv(value: string): string {
  // Quote if it contains a comma, quote, or newline.
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: CsvRecord[]): string {
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );

  if (headers.length === 0) return "";

  const lines: string[] = [];
  lines.push(headers.map(escapeCsv).join(","));

  for (const row of rows) {
    const line = headers
      .map((h) => escapeCsv(formatValue(row[h])))
      .join(",");
    lines.push(line);
  }

  return lines.join("\n");
}

export function downloadTextFile(filename: string, text: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: CsvRecord[]) {
  downloadTextFile(filename, toCsv(rows), "text/csv;charset=utf-8");
}

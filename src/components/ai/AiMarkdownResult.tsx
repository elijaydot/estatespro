import { useRef, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { exportHtmlTableToCsv } from '../../lib/aiResultExport';

function ExportableTable({ children, filename, exportEnabled }: { children: ReactNode; filename: string; exportEnabled: boolean }) {
  const tableRef = useRef<HTMLTableElement>(null);

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border">
      {exportEnabled ? <div className="flex items-center justify-end border-b border-border bg-muted/40 px-2 py-1.5" data-ai-export-control>
        <button
          type="button"
          className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => tableRef.current && exportHtmlTableToCsv(tableRef.current, filename)}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div> : null}
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-[560px] border-collapse text-left text-xs sm:text-sm">{children}</table>
      </div>
    </div>
  );
}

export function AiMarkdownResult({ content, filenameBase = 'fishgate-ai-result', exportEnabled = true }: { content: string; filenameBase?: string; exportEnabled?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h2 className="mb-3 mt-1 text-lg font-semibold">{children}</h2>,
        h2: ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold first:mt-0">{children}</h3>,
        h3: ({ children }) => <h4 className="mb-2 mt-4 text-sm font-semibold">{children}</h4>,
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 marker:text-primary">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 marker:font-semibold marker:text-primary">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-primary bg-primary/5 px-3 py-2 text-muted-foreground">{children}</blockquote>,
        table: ({ children, node }) => <ExportableTable filename={`${filenameBase}-table-${node?.position?.start.line || 1}.csv`} exportEnabled={exportEnabled}>{children}</ExportableTable>,
        thead: ({ children }) => <thead className="bg-muted/70">{children}</thead>,
        th: ({ children }) => <th className="whitespace-nowrap border-b border-border px-3 py-2.5 font-semibold text-foreground">{children}</th>,
        td: ({ children }) => <td className="border-b border-border/60 px-3 py-2.5 align-top last:[tr:last-child_&]:border-b-0">{children}</td>,
        tr: ({ children }) => <tr className="transition-colors even:bg-muted/20 hover:bg-muted/40">{children}</tr>,
        code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</code>,
        hr: () => <hr className="my-5 border-border" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
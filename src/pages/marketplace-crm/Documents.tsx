import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmDocument, useCrmDocuments } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmDocumentsPage() {
  const { activeCompanyId } = useActiveCompany();
  const documentsQuery = useCrmDocuments(activeCompanyId);
  const createDocument = useCreateCrmDocument(activeCompanyId);

  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [storagePath, setStoragePath] = useState('');

  const rows = useMemo(() => {
    const records = documentsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.title} ${row.storage_path} ${row.related_type}`).toLowerCase().includes(query));
  }, [documentsQuery.data, search]);

  const create = () => {
    if (!title.trim() || !storagePath.trim()) return;
    createDocument.mutate({
      title: title.trim(),
      related_type: 'deal',
      related_id: null,
      storage_path: storagePath.trim(),
      mime_type: null,
      uploaded_by: null,
    });
    setTitle('');
    setStoragePath('');
  };

  return (
    <CrmWorkspace title="Documents" subtitle="Record-linked documents for compliance, sales, and operations.">
      <CrmDataCard title="Add Document Reference" description="Attach a storage path to CRM records.">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input className="h-9 rounded-md border border-input px-3 text-sm" placeholder="Document title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <input className="h-9 rounded-md border border-input px-3 text-sm" placeholder="storage/path/file.pdf" value={storagePath} onChange={(event) => setStoragePath(event.target.value)} />
          <button className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground" onClick={create} disabled={createDocument.isPending}>Save</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Document Index" description="CRM-linked document references.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Title</th><th className="px-3 py-2">Related Type</th><th className="px-3 py-2">Storage Path</th><th className="px-3 py-2">Created</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.title}</td>
                  <td className="px-3 py-2">{row.related_type}</td>
                  <td className="px-3 py-2 text-muted-foreground break-all">{row.storage_path}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No document references yet." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}

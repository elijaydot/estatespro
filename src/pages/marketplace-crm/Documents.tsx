import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmDocument, useCrmDocuments, useUpdateCrmDocument } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmDocumentsPage() {
  const { activeCompanyId } = useActiveCompany();
  const documentsQuery = useCrmDocuments(activeCompanyId);
  const createDocument = useCreateCrmDocument(activeCompanyId);
  const updateDocument = useUpdateCrmDocument(activeCompanyId);

  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState('draft');
  const [draftCompliance, setDraftCompliance] = useState('pending');
  const [draftExpiresAt, setDraftExpiresAt] = useState('');
  const [draftReviewNotes, setDraftReviewNotes] = useState('');

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
      status: 'draft',
      compliance_state: 'pending',
      version_no: 1,
      expires_at: null,
      reviewed_at: null,
      review_notes: null,
      mime_type: null,
      uploaded_by: null,
    });
    setTitle('');
    setStoragePath('');
  };

  const editDocument = (documentId: string, status: string, complianceState: string, expiresAt: string | null, reviewNotes: string | null) => {
    setActiveDocId(documentId);
    setDraftStatus(status);
    setDraftCompliance(complianceState);
    setDraftExpiresAt(expiresAt ? expiresAt.slice(0, 10) : '');
    setDraftReviewNotes(reviewNotes || '');
  };

  const saveDocument = (documentId: string) => {
    const isReviewed = draftStatus === 'approved' || draftStatus === 'rejected';
    updateDocument.mutate({
      id: documentId,
      payload: {
        status: draftStatus,
        compliance_state: draftCompliance,
        expires_at: draftExpiresAt ? `${draftExpiresAt}T00:00:00.000Z` : null,
        reviewed_at: isReviewed ? new Date().toISOString() : null,
        review_notes: draftReviewNotes.trim() || null,
      },
    });
    setActiveDocId(null);
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
              <tr><th className="px-3 py-2">Title</th><th className="px-3 py-2">Related Type</th><th className="px-3 py-2">Storage Path</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Compliance</th><th className="px-3 py-2">Expires</th><th className="px-3 py-2">Review Notes</th><th className="px-3 py-2">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.title}</td>
                  <td className="px-3 py-2">{row.related_type}</td>
                  <td className="px-3 py-2 text-muted-foreground break-all">{row.storage_path}</td>
                  <td className="px-3 py-2">{activeDocId === row.id ? (
                    <select className="h-8 rounded border border-input px-2 text-xs" value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}>
                      <option value="draft">draft</option>
                      <option value="under_review">under_review</option>
                      <option value="approved">approved</option>
                      <option value="rejected">rejected</option>
                      <option value="archived">archived</option>
                    </select>
                  ) : row.status}</td>
                  <td className="px-3 py-2">{activeDocId === row.id ? (
                    <select className="h-8 rounded border border-input px-2 text-xs" value={draftCompliance} onChange={(event) => setDraftCompliance(event.target.value)}>
                      <option value="pending">pending</option>
                      <option value="verified">verified</option>
                      <option value="expired">expired</option>
                      <option value="rejected">rejected</option>
                    </select>
                  ) : row.compliance_state}</td>
                  <td className="px-3 py-2">{activeDocId === row.id ? (
                    <input className="h-8 rounded border border-input px-2 text-xs" type="date" value={draftExpiresAt} onChange={(event) => setDraftExpiresAt(event.target.value)} />
                  ) : (row.expires_at ? row.expires_at.slice(0, 10) : '-')}</td>
                  <td className="px-3 py-2">{activeDocId === row.id ? (
                    <input className="h-8 w-48 rounded border border-input px-2 text-xs" value={draftReviewNotes} onChange={(event) => setDraftReviewNotes(event.target.value)} />
                  ) : (row.review_notes || '-')}</td>
                  <td className="px-3 py-2">
                    {activeDocId === row.id ? (
                      <div className="flex gap-2">
                        <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => saveDocument(row.id)} disabled={updateDocument.isPending}>Save</button>
                        <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => setActiveDocId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        className="rounded border border-border px-2 py-1 text-xs"
                        onClick={() => editDocument(row.id, row.status, row.compliance_state, row.expires_at, row.review_notes)}
                      >
                        Review
                      </button>
                    )}
                  </td>
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

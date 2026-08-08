import { useMemo, useState } from 'react';
import { Download, ExternalLink, FilePlus2, FileText, MessageSquare } from 'lucide-react';
import { DocumentUploader } from '@/components/marketplace-crm/DocumentUploader';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { StatusPill } from '@/components/shared/StatusPill';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmAssignableUsers, useCrmLeads } from '@/hooks/useMarketplace';
import { useCreateCrmDocument, useCreateCrmDocumentComment, useCrmAccounts, useCrmContacts, useCrmDeals, useCrmDocumentComments, useCrmDocuments, useUpdateCrmDocument } from '@/hooks/useMarketplaceCrm';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { supabase } from '@/integrations/supabase/client';

const DOCUMENT_STATUSES = ['draft', 'under_review', 'approved', 'rejected', 'archived'] as const;
const COMPLIANCE_STATES = ['pending', 'verified', 'expired', 'rejected'] as const;
const RELATED_TYPES = ['general', 'deal', 'lead', 'account', 'contact'] as const;

function readableFileName(path: string) {
  const fileName = path.split('/').pop() || 'Document';
  return fileName.replace(/^\d+_/, '').replace(/_/g, ' ');
}

function readableFileType(mimeType: string | null, path: string) {
  if (mimeType === 'application/pdf' || path.toLowerCase().endsWith('.pdf')) return 'PDF';
  if (mimeType?.startsWith('image/')) return mimeType.split('/')[1].toUpperCase();
  if (mimeType?.includes('word') || path.match(/\.docx?$/i)) return 'Word';
  if (mimeType?.includes('sheet') || mimeType?.includes('excel') || path.match(/\.xlsx?$/i)) return 'Excel';
  if (mimeType === 'text/csv' || path.toLowerCase().endsWith('.csv')) return 'CSV';
  if (mimeType === 'text/plain' || path.toLowerCase().endsWith('.txt')) return 'Text';
  return 'File';
}

function statusVariant(status: string) {
  if (status === 'approved') return 'success' as const;
  if (status === 'rejected') return 'destructive' as const;
  if (status === 'under_review') return 'warning' as const;
  return 'neutral' as const;
}

function complianceVariant(state: string) {
  if (state === 'verified') return 'success' as const;
  if (state === 'expired' || state === 'rejected') return 'destructive' as const;
  return 'warning' as const;
}

export default function MarketplaceCrmDocumentsPage() {
  const { activeCompanyId } = useActiveCompany();
  const documentsQuery = useCrmDocuments(activeCompanyId);
  const dealsQuery = useCrmDeals(activeCompanyId);
  const leadsQuery = useCrmLeads(activeCompanyId);
  const accountsQuery = useCrmAccounts(activeCompanyId);
  const contactsQuery = useCrmContacts(activeCompanyId);
  const usersQuery = useCrmAssignableUsers(activeCompanyId);
  const createDocument = useCreateCrmDocument(activeCompanyId);
  const updateDocument = useUpdateCrmDocument(activeCompanyId);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [complianceFilter, setComplianceFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [relatedType, setRelatedType] = useState<(typeof RELATED_TYPES)[number]>('general');
  const [relatedId, setRelatedId] = useState('');
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [uploadResetKey, setUploadResetKey] = useState(0);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<(typeof DOCUMENT_STATUSES)[number]>('draft');
  const [reviewCompliance, setReviewCompliance] = useState<(typeof COMPLIANCE_STATES)[number]>('pending');
  const [reviewExpiresAt, setReviewExpiresAt] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [viewDocumentId, setViewDocumentId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');

  const viewDocument = (documentsQuery.data || []).find((row) => row.id === viewDocumentId) || null;
  const { signedUrl: viewUrl, isLoading: viewLoading, error: viewError } = useSignedUrl('crm-documents', viewDocument?.storage_path || null);
  const commentsQuery = useCrmDocumentComments(activeCompanyId, viewDocumentId);
  const createComment = useCreateCrmDocumentComment(activeCompanyId, viewDocumentId);

  const rows = useMemo(() => {
    const query = search.toLowerCase().trim();
    return (documentsQuery.data || []).filter((row) => (
      (!query || `${row.title} ${readableFileName(row.storage_path)} ${row.related_type}`.toLowerCase().includes(query))
      && (statusFilter === 'all' || row.status === statusFilter)
      && (complianceFilter === 'all' || row.compliance_state === complianceFilter)
    ));
  }, [complianceFilter, documentsQuery.data, search, statusFilter]);

  const relatedOptions = useMemo(() => {
    if (relatedType === 'deal') return (dealsQuery.data || []).map((row) => ({ id: row.id, label: row.deal_name }));
    if (relatedType === 'lead') return (leadsQuery.data || []).map((row) => ({ id: row.id, label: row.contact_name || row.contact_email || row.listing_title || 'Lead' }));
    if (relatedType === 'account') return (accountsQuery.data || []).map((row) => ({ id: row.id, label: row.name }));
    if (relatedType === 'contact') return (contactsQuery.data || []).map((row) => ({ id: row.id, label: row.full_name }));
    return [];
  }, [accountsQuery.data, contactsQuery.data, dealsQuery.data, leadsQuery.data, relatedType]);

  const relatedLabels = useMemo(() => new Map([
    ...(dealsQuery.data || []).map((row) => [row.id, row.deal_name] as const),
    ...(leadsQuery.data || []).map((row) => [row.id, row.contact_name || row.contact_email || row.listing_title || 'Lead'] as const),
    ...(accountsQuery.data || []).map((row) => [row.id, row.name] as const),
    ...(contactsQuery.data || []).map((row) => [row.id, row.full_name] as const),
  ]), [accountsQuery.data, contactsQuery.data, dealsQuery.data, leadsQuery.data]);
  const authorNames = useMemo(() => new Map((usersQuery.data || []).map((row) => [row.user_id, row.name || 'Team member'])), [usersQuery.data]);

  const resetCreate = () => {
    setTitle(''); setRelatedType('general'); setRelatedId(''); setStoragePath(null); setMimeType(null);
    setUploadResetKey((current) => current + 1); setCreateOpen(false);
  };

  const closeCreate = async () => {
    const abandonedPath = storagePath;
    resetCreate();
    if (abandonedPath) {
      const { error } = await supabase.storage.from('crm-documents').remove([abandonedPath]);
      if (error) toast({ title: 'Upload cleanup failed', description: error.message, variant: 'destructive' });
    }
  };

  const create = () => {
    if (!title.trim() || !storagePath || (relatedType !== 'general' && !relatedId)) return;
    createDocument.mutate({
      title: title.trim(), related_type: relatedType, related_id: relatedType === 'general' ? null : relatedId,
      storage_path: storagePath, status: 'draft', compliance_state: 'pending', version_no: 1,
      expires_at: null, reviewed_at: null, review_notes: null, mime_type: mimeType, uploaded_by: null,
    }, { onSuccess: resetCreate });
  };

  const openReview = (row: NonNullable<typeof documentsQuery.data>[number]) => {
    setReviewId(row.id); setReviewStatus(row.status); setReviewCompliance(row.compliance_state);
    setReviewExpiresAt(row.expires_at?.slice(0, 10) || ''); setReviewNotes(row.review_notes || '');
  };

  const saveReview = () => {
    if (!reviewId) return;
    const reviewed = reviewStatus === 'approved' || reviewStatus === 'rejected';
    updateDocument.mutate({ id: reviewId, payload: {
      status: reviewStatus, compliance_state: reviewCompliance,
      expires_at: reviewExpiresAt ? `${reviewExpiresAt}T00:00:00.000Z` : null,
      reviewed_at: reviewed ? new Date().toISOString() : null, review_notes: reviewNotes.trim() || null,
    } }, { onSuccess: () => setReviewId(null) });
  };

  const addComment = () => {
    if (!commentBody.trim()) return;
    createComment.mutate(commentBody, { onSuccess: () => setCommentBody('') });
  };

  return <CrmWorkspace title="Documents" subtitle="Record-linked documents for compliance, sales, and operations.">
    <CrmDataCard title="Document Register" description="Find, preview, classify, and review private CRM files." action={<Button onClick={() => setCreateOpen(true)}><FilePlus2 className="mr-2 h-4 w-4" />New document</Button>}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="flex flex-wrap gap-2">
          <select aria-label="Filter document status" className="h-9 rounded-md border border-input bg-background px-3 text-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{DOCUMENT_STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}</select>
          <select aria-label="Filter compliance state" className="h-9 rounded-md border border-input bg-background px-3 text-xs" value={complianceFilter} onChange={(event) => setComplianceFilter(event.target.value)}><option value="all">All compliance</option>{COMPLIANCE_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border/70"><table className="w-full min-w-[980px] text-sm"><thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2.5">Document</th><th className="px-3 py-2.5">Linked record</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Compliance</th><th className="px-3 py-2.5">Version</th><th className="px-3 py-2.5">Expires</th><th className="px-3 py-2.5">Updated</th><th className="px-3 py-2.5">Actions</th></tr></thead><tbody>
        {rows.map((row) => <tr key={row.id} className="border-t border-border/60 hover:bg-muted/20"><td className="px-3 py-3"><div className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="font-medium">{row.title}</p><p className="max-w-64 truncate text-xs text-muted-foreground" title={readableFileName(row.storage_path)}>{readableFileName(row.storage_path)} · {readableFileType(row.mime_type, row.storage_path)}</p></div></div></td><td className="px-3 py-3"><p className="capitalize">{row.related_type}</p><p className="max-w-48 truncate text-xs text-muted-foreground">{row.related_id ? relatedLabels.get(row.related_id) || 'Record unavailable' : 'Company library'}</p></td><td className="px-3 py-3"><StatusPill variant={statusVariant(row.status)} className="capitalize">{row.status.replace(/_/g, ' ')}</StatusPill></td><td className="px-3 py-3"><StatusPill variant={complianceVariant(row.compliance_state)} className="capitalize">{row.compliance_state}</StatusPill></td><td className="px-3 py-3">v{row.version_no}</td><td className="px-3 py-3">{row.expires_at ? new Date(row.expires_at).toLocaleDateString() : 'No expiry'}</td><td className="px-3 py-3">{new Date(row.updated_at || row.created_at).toLocaleDateString()}</td><td className="px-3 py-3"><div className="flex gap-2"><Button size="sm" variant="outline" className="h-8" onClick={() => setViewDocumentId(row.id)}>View</Button><Button size="sm" variant="outline" className="h-8" onClick={() => openReview(row)}>Review</Button></div></td></tr>)}
      </tbody></table>{rows.length === 0 ? <div className="p-6"><EmptyState icon={FileText} label="No documents found" description={(documentsQuery.data || []).length ? 'Adjust the search or filters to see more files.' : 'Upload your first CRM document to start the private company library.'} /></div> : null}</div>
    </CrmDataCard>

    <Dialog open={createOpen} onOpenChange={(open) => { if (!open) void closeCreate(); }}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Add document</DialogTitle><DialogDescription>Upload a private file, give it a useful business name, and attach it to the correct CRM record.</DialogDescription></DialogHeader><div className="space-y-4">
      <label className="block space-y-1.5 text-sm"><span>Document name</span><input aria-label="Document name" className="h-10 w-full rounded-md border border-input px-3" placeholder="e.g. Signed tenancy offer" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm"><span>Category</span><select aria-label="Document category" className="h-10 w-full rounded-md border border-input bg-background px-3" value={relatedType} onChange={(event) => { setRelatedType(event.target.value as typeof relatedType); setRelatedId(''); }}>{RELATED_TYPES.map((type) => <option key={type} value={type}>{type === 'general' ? 'Company library' : type[0].toUpperCase() + type.slice(1)}</option>)}</select></label>{relatedType !== 'general' ? <label className="space-y-1.5 text-sm"><span>Linked record</span><select aria-label="Linked record" className="h-10 w-full rounded-md border border-input bg-background px-3" value={relatedId} onChange={(event) => setRelatedId(event.target.value)}><option value="">Select {relatedType}</option>{relatedOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> : null}</div>
      <div className="space-y-1.5"><p className="text-sm font-medium">File</p><p className="text-xs text-muted-foreground">PDF, image, Word, Excel, CSV, or text file up to 10 MB. Files remain private and open through expiring links.</p><DocumentUploader bucket="crm-documents" pathPrefix={`${activeCompanyId || 'unknown-company'}/${relatedType}`} acceptedMimeTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/plain']} maxFileSizeBytes={10 * 1024 * 1024} resetKey={String(uploadResetKey)} uploadLabel="Choose file" disabled={!activeCompanyId || createDocument.isPending} onUploaded={(path, type) => { setStoragePath(path); setMimeType(type); }} onCleared={() => { setStoragePath(null); setMimeType(null); }} /></div>
    </div><DialogFooter><Button variant="outline" onClick={() => void closeCreate()}>Cancel</Button><Button onClick={create} disabled={!title.trim() || !storagePath || (relatedType !== 'general' && !relatedId) || createDocument.isPending}>Add document</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={!!reviewId} onOpenChange={(open) => { if (!open) setReviewId(null); }}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Review document</DialogTitle><DialogDescription>Update lifecycle, compliance, expiry, and the audit note for this file.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm"><span>Status</span><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as typeof reviewStatus)}>{DOCUMENT_STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}</select></label><label className="space-y-1.5 text-sm"><span>Compliance</span><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={reviewCompliance} onChange={(event) => setReviewCompliance(event.target.value as typeof reviewCompliance)}>{COMPLIANCE_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></label><label className="space-y-1.5 text-sm sm:col-span-2"><span>Expiry date</span><input className="h-10 w-full rounded-md border border-input px-3" type="date" value={reviewExpiresAt} onChange={(event) => setReviewExpiresAt(event.target.value)} /></label><label className="space-y-1.5 text-sm sm:col-span-2"><span>Review notes</span><textarea className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2" placeholder="Decision, missing information, or required follow-up" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} /></label></div><DialogFooter><Button variant="outline" onClick={() => setReviewId(null)}>Cancel</Button><Button onClick={saveReview} disabled={updateDocument.isPending}>Save review</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={!!viewDocumentId} onOpenChange={(open) => { if (!open) { setViewDocumentId(null); setCommentBody(''); } }}><DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>{viewDocument?.title || 'Document'}</DialogTitle><DialogDescription>{viewDocument ? `${readableFileName(viewDocument.storage_path)} · ${readableFileType(viewDocument.mime_type, viewDocument.storage_path)} · Version ${viewDocument.version_no}` : 'Private CRM document'}</DialogDescription></DialogHeader><div className="grid min-h-[480px] gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]">
      <div className="flex min-h-96 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/20">{viewLoading ? <p className="text-sm text-muted-foreground">Preparing secure preview...</p> : viewError || !viewUrl ? <p className="text-sm text-destructive">This file could not be opened.</p> : viewDocument?.mime_type?.startsWith('image/') ? <img src={viewUrl} alt={viewDocument.title} className="max-h-[65vh] max-w-full object-contain" /> : viewDocument?.mime_type === 'application/pdf' || viewDocument?.storage_path.toLowerCase().endsWith('.pdf') ? <iframe title={viewDocument.title} src={viewUrl} className="h-[65vh] w-full" /> : <div className="max-w-sm space-y-4 p-6 text-center"><FileText className="mx-auto h-10 w-10 text-muted-foreground" /><div><p className="font-medium">Inline preview is not available for this file type.</p><p className="mt-1 text-sm text-muted-foreground">Open it securely in the matching desktop or browser application.</p></div><Button asChild><a href={viewUrl} target="_blank" rel="noreferrer">Open or download<Download className="ml-2 h-4 w-4" /></a></Button></div>}</div>
      <aside className="flex min-h-0 flex-col rounded-md border border-border"><div className="border-b border-border px-4 py-3"><p className="flex items-center gap-2 font-medium"><MessageSquare className="h-4 w-4" />Comments</p><p className="text-xs text-muted-foreground">Company-only discussion for this document.</p></div><div className="max-h-[430px] flex-1 space-y-3 overflow-y-auto p-4">{commentsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading comments...</p> : (commentsQuery.data || []).length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : (commentsQuery.data || []).map((comment) => <div key={comment.id} className="rounded-md border border-border/70 bg-background p-3"><div className="mb-1 flex items-center justify-between gap-2"><span className="text-xs font-medium">{authorNames.get(comment.author_user_id) || 'Team member'}</span><time className="text-[11px] text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</time></div><p className="whitespace-pre-wrap text-sm">{comment.body}</p></div>)}</div><div className="space-y-2 border-t border-border p-4"><textarea aria-label="Document comment" className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Add context, a question, or a review comment" maxLength={4000} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} /><div className="flex justify-end"><Button size="sm" onClick={addComment} disabled={!commentBody.trim() || createComment.isPending}>Add comment</Button></div></div></aside>
    </div><DialogFooter><Button variant="outline" onClick={() => setViewDocumentId(null)}>Close</Button>{viewUrl ? <Button asChild><a href={viewUrl} target="_blank" rel="noreferrer">Open separately<ExternalLink className="ml-2 h-4 w-4" /></a></Button> : null}</DialogFooter></DialogContent></Dialog>
  </CrmWorkspace>;
}

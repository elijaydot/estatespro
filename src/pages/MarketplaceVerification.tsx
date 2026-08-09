import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChevronDown, FileUp, Loader2, ShieldCheck, ShieldQuestion, ShieldX } from 'lucide-react';
import { DocumentUploader } from '@/components/marketplace-crm/DocumentUploader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useAddVerificationDocument,
  useEvaluatePublisherAutoTrust,
  usePublisherVerification,
  useSubmitPublisherVerification,
  useVerificationDocuments,
  type VerificationDocument,
} from '@/hooks/useMarketplace';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';

const DOCUMENT_TYPES: Array<{ value: VerificationDocument['document_type']; label: string }> = [
  { value: 'id_card', label: 'Government ID' },
  { value: 'business_registration', label: 'Business Registration' },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'other', label: 'Other Supporting Document' },
];

function VerificationStateBadge({ state }: { state?: string | null }) {
  const current = state ?? 'pending';

  if (current === 'verified') {
    return (
      <StatusPill variant="success" className="gap-1">
        <ShieldCheck className="h-3.5 w-3.5" /> Verified
      </StatusPill>
    );
  }

  if (current === 'rejected') {
    return (
      <StatusPill variant="destructive" className="gap-1">
        <ShieldX className="h-3.5 w-3.5" /> Rejected
      </StatusPill>
    );
  }

  if (current === 'needs_review') {
    return (
      <StatusPill variant="warning" className="gap-1">
        <ShieldQuestion className="h-3.5 w-3.5" /> Needs Review
      </StatusPill>
    );
  }

  return (
    <StatusPill className="gap-1">
      <ShieldQuestion className="h-3.5 w-3.5" /> Pending
    </StatusPill>
  );
}

export default function MarketplaceVerification() {
  const { activeCompanyId, companies } = useActiveCompany();
  const { isLandlord, isPropertyManager, isSuperAdmin } = useUserRole();

  const verificationQuery = usePublisherVerification(activeCompanyId);
  const evaluateTrust = useEvaluatePublisherAutoTrust(activeCompanyId);
  const submitVerification = useSubmitPublisherVerification(activeCompanyId);
  const addDocument = useAddVerificationDocument(activeCompanyId);

  const verificationId = verificationQuery.data?.id ?? null;
  const documentsQuery = useVerificationDocuments(verificationId);

  const [documentType, setDocumentType] = useState<VerificationDocument['document_type']>('id_card');
  const [documentPath, setDocumentPath] = useState<string | null>(null);
  const [documentMimeType, setDocumentMimeType] = useState<string | null>(null);
  const [documentUploadResetKey, setDocumentUploadResetKey] = useState(0);
  const [documentsOpen, setDocumentsOpen] = useState(false);

  useEffect(() => {
    if (activeCompanyId) evaluateTrust.mutate();
  // The mutation is intentionally run once per active company, not whenever its callback identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const acceptedMimeTypesByDocumentType: Record<VerificationDocument['document_type'], string[]> = {
    id_card: ['application/pdf', 'image/jpeg', 'image/png'],
    business_registration: ['application/pdf', 'image/jpeg', 'image/png'],
    utility_bill: ['application/pdf', 'image/jpeg', 'image/png'],
    other: ['application/pdf', 'image/jpeg', 'image/png'],
  };

  const companyName = useMemo(
    () => companies.find((company) => company.id === activeCompanyId)?.name ?? 'Active company',
    [activeCompanyId, companies],
  );

  if (!isLandlord && !isPropertyManager && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const canSubmit = isLandlord;
  const verification = verificationQuery.data;
  const trust = evaluateTrust.data;
  const isAutomaticallyVerified = verification?.state === 'verified' && verification.verified_by === null;
  const showManualReview = verification?.state !== 'verified';

  const documentsPanel = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-4 w-4" /> Verification Documents
        </CardTitle>
        <CardDescription>
          {showManualReview ? 'Add supporting evidence for manual review.' : 'Optional evidence can strengthen your record ahead of a dispute.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select value={documentType} onValueChange={(value) => setDocumentType(value as VerificationDocument['document_type'])}>
            <SelectTrigger><SelectValue placeholder="Document type" /></SelectTrigger>
            <SelectContent>{DOCUMENT_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="md:col-span-2">
            <DocumentUploader
              bucket="verification-documents"
              pathPrefix={`${activeCompanyId || 'unknown-company'}/${verificationId || 'pending-verification'}`}
              acceptedMimeTypes={acceptedMimeTypesByDocumentType[documentType]}
              maxFileSizeBytes={8 * 1024 * 1024}
              disabled={!canSubmit || !verificationId}
              resetKey={`${documentUploadResetKey}`}
              uploadLabel="Upload verification file"
              onUploaded={(storagePath, mimeType) => { setDocumentPath(storagePath); setDocumentMimeType(mimeType); }}
            />
          </div>
        </div>

        <Button
          disabled={!canSubmit || !verificationId || !documentPath || addDocument.isPending}
          onClick={() => {
            if (!verificationId) return;
            addDocument.mutate({ verificationId, documentType, storagePath: documentPath });
            setDocumentPath(null);
            setDocumentMimeType(null);
            setDocumentUploadResetKey((current) => current + 1);
          }}
        >
          {addDocument.isPending ? 'Adding...' : 'Add Document'}
        </Button>

        {documentPath && <p className="text-xs text-muted-foreground">Ready to attach: {documentPath} {documentMimeType ? `(${documentMimeType})` : ''}</p>}
        {!verificationId && <p className="text-xs text-muted-foreground">Start verification first to enable document attachments.</p>}

        <div className="space-y-2">
          {(documentsQuery.data ?? []).map((doc) => (
            <div key={doc.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{doc.document_type}</span>
                <StatusPill variant={doc.state === 'approved' ? 'success' : doc.state === 'rejected' ? 'destructive' : 'neutral'}>{doc.state}</StatusPill>
              </div>
              <p className="break-all text-xs text-muted-foreground">{doc.storage_path}</p>
              {doc.rejection_reason && <p className="text-xs text-muted-foreground">Reason: {doc.rejection_reason}</p>}
            </div>
          ))}
          {!documentsQuery.isLoading && (documentsQuery.data ?? []).length === 0 && <EmptyState icon={FileUp} title="No verification documents" description={showManualReview ? 'Upload a supporting document for the reviewer.' : 'No optional documents have been added.'} />}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Publisher Trust Center" title="Marketplace Verification" description={`Manage verification readiness for ${companyName}.`} action={<VerificationStateBadge state={verificationQuery.data?.state} />} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Verification Status
            {verificationQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <CardDescription>
            FishGate first checks account history automatically. Manual review is reserved for accounts without enough history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Current state:</span>
            <VerificationStateBadge state={verificationQuery.data?.state} />
          </div>

          {verification?.rejection_reason && (
            <p className="text-muted-foreground">Rejection reason: {verification.rejection_reason}</p>
          )}

          {isAutomaticallyVerified && (
            <div className="rounded-lg border border-success/30 bg-success/5 p-4">
              <p className="font-medium text-success">Verified · qualified automatically on {verification.verified_at ? new Date(verification.verified_at).toLocaleDateString() : 'today'}</p>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <span>{trust?.has_active_paid_plan ? 'Active paid subscription · instant qualification' : 'Free plan · standard qualification'}</span>
                <span>{trust?.property_count ?? 0} properties on file</span>
                <span>Account age: {trust?.account_age_days ?? 0} days</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Tenancy history confirmed. No document or reviewer action was required.</p>
            </div>
          )}

          {showManualReview && verification?.state !== 'rejected' && (
            <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-muted-foreground">
              Your account does not have enough platform history for instant verification yet. Add a document for manual review, or qualify automatically once tenancy history is on file and the account reaches {trust?.min_account_age_days ?? 7} days. Active paid plans skip only the age wait.
            </p>
          )}

          {showManualReview && <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => submitVerification.mutate()}
              disabled={!canSubmit || submitVerification.isPending}
            >
              {submitVerification.isPending ? 'Submitting...' : verification ? 'Resubmit Verification' : 'Start Verification'}
            </Button>

            {!canSubmit && (
              <Badge variant="outline">Landlord only action</Badge>
            )}
          </div>}

        </CardContent>
      </Card>

      {showManualReview ? documentsPanel : (
        <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">Verification documents <ChevronDown className="h-4 w-4" /></Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">{documentsPanel}</CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

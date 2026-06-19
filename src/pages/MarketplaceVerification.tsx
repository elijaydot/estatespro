import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, ShieldCheck, ShieldX, ShieldQuestion, FileUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useAddVerificationDocument,
  usePublisherVerification,
  useSubmitPublisherVerification,
  useVerificationDocuments,
  type VerificationDocument,
} from '@/hooks/useMarketplace';

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
      <Badge variant="default" className="gap-1">
        <ShieldCheck className="h-3.5 w-3.5" /> Verified
      </Badge>
    );
  }

  if (current === 'rejected') {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldX className="h-3.5 w-3.5" /> Rejected
      </Badge>
    );
  }

  if (current === 'needs_review') {
    return (
      <Badge variant="secondary" className="gap-1">
        <ShieldQuestion className="h-3.5 w-3.5" /> Needs Review
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <ShieldQuestion className="h-3.5 w-3.5" /> Pending
    </Badge>
  );
}

export default function MarketplaceVerification() {
  const { activeCompanyId, companies } = useActiveCompany();
  const { isLandlord, isPropertyManager } = useUserRole();

  const verificationQuery = usePublisherVerification(activeCompanyId);
  const submitVerification = useSubmitPublisherVerification(activeCompanyId);
  const addDocument = useAddVerificationDocument(activeCompanyId);

  const verificationId = verificationQuery.data?.id ?? null;
  const documentsQuery = useVerificationDocuments(verificationId);

  const [documentType, setDocumentType] = useState<VerificationDocument['document_type']>('id_card');
  const [documentPath, setDocumentPath] = useState('');

  const companyName = useMemo(
    () => companies.find((company) => company.id === activeCompanyId)?.name ?? 'Active company',
    [activeCompanyId, companies],
  );

  if (!isLandlord && !isPropertyManager) {
    return <Navigate to="/dashboard" replace />;
  }

  const canManage = isLandlord;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/60 bg-gradient-to-r from-sky-500/10 via-cyan-500/10 to-emerald-500/10 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Publisher Trust Center</p>
        <h1 className="text-2xl font-semibold">Marketplace Verification</h1>
        <p className="text-sm text-muted-foreground">Manage verification readiness for {companyName}.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Verification Status
            {verificationQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <CardDescription>
            Publishing live listings is restricted to verified publishers and landlord role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Current state:</span>
            <VerificationStateBadge state={verificationQuery.data?.state} />
          </div>

          {verificationQuery.data?.rejection_reason && (
            <p className="text-muted-foreground">Rejection reason: {verificationQuery.data.rejection_reason}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => submitVerification.mutate()}
              disabled={!canManage || submitVerification.isPending}
            >
              {submitVerification.isPending ? 'Submitting...' : verificationQuery.data ? 'Resubmit Verification' : 'Start Verification'}
            </Button>

            {!canManage && (
              <Badge variant="outline">Landlord only action</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-4 w-4" /> Verification Documents
          </CardTitle>
          <CardDescription>
            Attach secure storage paths for verification artifacts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select value={documentType} onValueChange={(value) => setDocumentType(value as VerificationDocument['document_type'])}>
              <SelectTrigger>
                <SelectValue placeholder="Document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              className="md:col-span-2"
              placeholder="storage/path/to/document.pdf"
              value={documentPath}
              onChange={(event) => setDocumentPath(event.target.value)}
            />
          </div>

          <Button
            disabled={!canManage || !verificationId || !documentPath.trim() || addDocument.isPending}
            onClick={() => {
              if (!verificationId) return;
              addDocument.mutate({
                verificationId,
                documentType,
                storagePath: documentPath.trim(),
              });
              setDocumentPath('');
            }}
          >
            {addDocument.isPending ? 'Adding...' : 'Add Document'}
          </Button>

          {!verificationId && (
            <p className="text-xs text-muted-foreground">Start verification first to enable document attachments.</p>
          )}

          <div className="space-y-2">
            {(documentsQuery.data ?? []).map((doc) => (
              <div key={doc.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{doc.document_type}</span>
                  <Badge variant={doc.state === 'approved' ? 'default' : doc.state === 'rejected' ? 'destructive' : 'secondary'}>
                    {doc.state}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground break-all">{doc.storage_path}</p>
                {doc.rejection_reason && (
                  <p className="text-xs text-muted-foreground">Reason: {doc.rejection_reason}</p>
                )}
              </div>
            ))}

            {!documentsQuery.isLoading && (documentsQuery.data ?? []).length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                No verification documents added yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

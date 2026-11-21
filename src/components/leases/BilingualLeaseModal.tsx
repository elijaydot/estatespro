import { Printer, ShieldCheck, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { compileBilingualLease, BilingualLeaseInput } from '@/lib/bilingualLeaseAgreement';

interface BilingualLeaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaseData: BilingualLeaseInput | null;
}

export function BilingualLeaseModal({
  open,
  onOpenChange,
  leaseData,
}: BilingualLeaseModalProps) {
  if (!leaseData) return null;

  const contract = compileBilingualLease(leaseData);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-card text-foreground p-0 border border-border/80 shadow-2xl">
        <DialogHeader className="bg-primary/10 border-b border-border/80 px-6 py-4 sticky top-0 backdrop-blur-md z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Bilingual Lease Agreement · Amasezerano y'Ubukode
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Statutory Tenancy Agreement (Republic of Rwanda · Law No. 59/2008 & RRA Guidelines)
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-xs">
                UPI: {contract.propertyUpi}
              </Badge>
              <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs">
                15-Day RRA Filing Required
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Legal contract presentation */}
        <div className="p-6 space-y-6 text-xs leading-relaxed">
          {/* Header */}
          <div className="text-center border-b border-border/60 pb-4 space-y-1">
            <p className="text-sm font-bold tracking-wider uppercase text-foreground">
              REPUBLIKA Y'U RWANDA / REPUBLIC OF RWANDA
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
              AMASEZERANO Y'UBUKODE BW'INZU / RESIDENTIAL LEASE AGREEMENT
            </p>
            <p className="text-[11px] text-muted-foreground">
              Reference: <span className="font-mono font-bold text-foreground">{contract.leaseNumber}</span>
            </p>
          </div>

          {/* Parties identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-border/60">
            <div>
              <p className="font-bold text-primary mb-1 uppercase text-[11px]">1. NYIR'INZU / THE LANDLORD</p>
              <p><span className="text-muted-foreground">Amazina/Name:</span> {leaseData.landlordName}</p>
              {leaseData.landlordTin && <p><span className="text-muted-foreground">TIN:</span> {leaseData.landlordTin}</p>}
              {leaseData.landlordPhone && <p><span className="text-muted-foreground">Telefone:</span> {leaseData.landlordPhone}</p>}
            </div>
            <div>
              <p className="font-bold text-primary mb-1 uppercase text-[11px]">2. UMUKODESHA / THE TENANT</p>
              <p><span className="text-muted-foreground">Amazina/Name:</span> {leaseData.tenantName}</p>
              <p><span className="text-muted-foreground">Indangamuntu/ID:</span> {leaseData.tenantNationalId}</p>
              <p><span className="text-muted-foreground">Telefone:</span> {leaseData.tenantPhone}</p>
            </div>
          </div>

          {/* Bilingual Clauses Table */}
          <div className="space-y-4">
            {contract.clauses.map((clause) => (
              <div key={clause.clauseNumber} className="border border-border/70 rounded-lg overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 bg-muted/50 border-b border-border/60 px-4 py-2 font-bold text-[11px]">
                  <div className="text-primary">{clause.titleRw}</div>
                  <div className="text-foreground">{clause.titleEn}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 p-4 gap-4 text-justify">
                  <div className="text-muted-foreground">{clause.textRw}</div>
                  <div className="text-foreground">{clause.textEn}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Statutory RRA Filing Declaration */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-400 text-xs">
                ICYO AMATEGEKO ATEGANYA (RRA STATUTORY DECLARATION)
              </p>
              <p className="text-[11px] text-muted-foreground">
                {contract.rraFilingDeclaration}
              </p>
            </div>
          </div>

          {/* Signature blocks */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-border/80">
            <div className="space-y-6">
              <p className="font-bold text-[11px]">UMUKODEZACYANE / THE LANDLORD</p>
              <div className="border-b border-dashed border-border/80 h-10" />
              <p className="text-[10px] text-muted-foreground">Itariki / Date & Siniyati / Signature</p>
            </div>
            <div className="space-y-6">
              <p className="font-bold text-[11px]">UMUKODESHA / THE TENANT</p>
              <div className="border-b border-dashed border-border/80 h-10" />
              <p className="text-[10px] text-muted-foreground">Itariki / Date & Siniyati / Signature</p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-card border-t border-border/80 sticky bottom-0 backdrop-blur-md flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              Print Bilingual Contract
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

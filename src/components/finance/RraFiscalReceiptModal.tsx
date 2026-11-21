import { useState } from 'react';
import { Printer, QrCode, ShieldCheck, CheckCircle2, Download, ExternalLink, RefreshCw, MessageCircle } from 'lucide-react';
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
import { RraEbmFiscalReceipt, verifyRraReceiptOnline } from '@/lib/rraEbmVsdc';

interface RraFiscalReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: RraEbmFiscalReceipt | null;
}

export function RraFiscalReceiptModal({
  open,
  onOpenChange,
  receipt,
}: RraFiscalReceiptModalProps) {
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleVerifyOnline = async () => {
    setVerifying(true);
    try {
      const res = await verifyRraReceiptOnline(receipt.receiptNumber, receipt.sdcId);
      setVerificationResult(res.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `*Official RRA EBM v2 Fiscal Receipt*\n` +
      `• Receipt Number: ${receipt.receiptNumber}\n` +
      `• Entity: ${receipt.companyName} (TIN: ${receipt.companyTin})\n` +
      `• Tenant: ${receipt.tenantName}\n` +
      `• Total Paid: ${receipt.currency} ${receipt.grossAmount.toLocaleString()}\n` +
      `• Payment Method: ${receipt.paymentMethod}\n` +
      `• Certified Date: ${new Date(receipt.certifiedAt).toLocaleString()}\n` +
      `• Online Verification: ${receipt.qrCodeUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // QR Code generator URL using public standard QR service with offline fallback
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(receipt.qrCodeUrl)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card text-foreground p-0 overflow-hidden border border-border/80 shadow-2xl">
        <DialogHeader className="bg-emerald-600/10 border-b border-emerald-500/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <DialogTitle className="text-base font-bold text-foreground">
                Official RRA EBM v2 Fiscal Receipt
              </DialogTitle>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
              VSDC Certified
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Rwanda Revenue Authority Electronic Billing Machine (VSDC) Verification
          </DialogDescription>
        </DialogHeader>

        {/* Paper receipt presentation */}
        <div className="p-6 font-mono text-xs space-y-4 bg-background/50 border-b border-border/60">
          <div className="text-center space-y-1">
            <p className="font-bold text-sm tracking-wide">REPUBLIKA Y'U RWANDA</p>
            <p className="text-[11px] text-muted-foreground">RWANDA REVENUE AUTHORITY</p>
            <p className="font-semibold text-xs pt-1">{receipt.companyName}</p>
            <p className="text-[11px] text-muted-foreground">TIN: {receipt.companyTin}</p>
            <p className="text-[10px] text-muted-foreground">MRC: {receipt.mrc} · SDC: {receipt.sdcId}</p>
          </div>

          <div className="border-t border-b border-dashed border-border/80 py-2 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">RECEIPT NUMBER:</span>
              <span className="font-bold">{receipt.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CERTIFIED DATE:</span>
              <span>{new Date(receipt.certifiedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PARCEL UPI:</span>
              <span className="font-bold">{receipt.propertyUpi}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">TENANT TIN / ID:</span>
              <span>{receipt.tenantTin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">TENANT NAME:</span>
              <span>{receipt.tenantName}</span>
            </div>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between font-semibold">
              <span>DESCRIPTION</span>
              <span>TOTAL ({receipt.currency})</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Rent & Property Fee</span>
              <span>{receipt.grossAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Statutory Rental Tax ({receipt.taxRatePercent}%)</span>
              <span>{receipt.taxAmount.toLocaleString()}</span>
            </div>
            <div className="border-t border-dashed border-border/80 pt-1 flex justify-between font-bold text-sm">
              <span>TOTAL PAID</span>
              <span>{receipt.currency} {receipt.grossAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>PAYMENT METHOD:</span>
              <span className="uppercase">{receipt.paymentMethod}</span>
            </div>
          </div>

          {/* Verification QR Code Visual & Internal Signature */}
          <div className="text-center pt-2 space-y-2 border-t border-dashed border-border/80">
            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-border/80 inline-block">
                <img
                  src={qrImageSrc}
                  alt="RRA EBM QR Code"
                  className="w-24 h-24 object-contain"
                  onError={(e) => {
                    // Fallback if offline
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">Scan with RRA EBM Checker or Smartphone Camera</span>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>DIGITALLY SIGNED BY RRA VSDC</span>
            </div>
            <p className="text-[9px] text-muted-foreground break-all">
              INTERNAL SIGNATURE: {receipt.internalDataHash}
            </p>
            {verificationResult && (
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400">
                {verificationResult}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-card flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              className="gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyOnline}
              disabled={verifying}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${verifying ? 'animate-spin' : ''}`} />
              Verify RRA
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              Print Receipt
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

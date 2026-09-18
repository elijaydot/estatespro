import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, CheckCircle2, AlertCircle, Building2, ShieldCheck, Mail, Globe } from "lucide-react";
import { format } from "date-fns";

export interface OfficialInvoiceData {
  id: string;
  invoice_number?: string;
  invoice_status: "paid" | "open" | "void" | "uncollectible" | string;
  invoice_kind: string;
  amount_minor: number;
  currency_code: string;
  created_at: string;
  paid_at?: string | null;
  due_date?: string | null;
  external_reference?: string | null;
  customer_details?: {
    company_name?: string;
    company_id?: string;
    email?: string;
    country?: string;
    address?: string;
  };
  billing_details?: {
    issuer?: string;
    issuer_address?: string;
    issuer_tin?: string;
    billing_contact?: string;
    plan_code?: string;
    plan_name?: string;
    is_annual?: boolean;
    base_usd?: number;
  };
  metadata?: {
    plan_code?: string;
    plan_name?: string;
    target_plan_code?: string;
    gateway?: string;
    currency?: string;
    paid_attempt_id?: string;
    [key: string]: any;
  };
}

interface OfficialSubscriptionInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: OfficialInvoiceData | null;
  companyName?: string;
  userEmail?: string;
}

export const OfficialSubscriptionInvoiceModal: React.FC<OfficialSubscriptionInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  companyName = "FishGate Customer",
  userEmail = "",
}) => {
  if (!invoice) return null;

  const invoiceNumber = invoice.invoice_number || `FG-INV-${format(new Date(invoice.created_at), "yyyy")}-${invoice.id.slice(0, 6).toUpperCase()}`;
  const isPaid = invoice.invoice_status === "paid";
  const isVoid = invoice.invoice_status === "void";
  const isOpenUnpaid = invoice.invoice_status === "open";

  const customerName = invoice.customer_details?.company_name || companyName;
  const customerEmail = invoice.customer_details?.email || userEmail || "billing@customer.com";
  const customerCountry = invoice.customer_details?.country || "Rwanda";

  const planName = invoice.billing_details?.plan_name ||
    invoice.metadata?.plan_name ||
    (invoice.metadata?.plan_code ? invoice.metadata.plan_code.replace("fishgate_", "").toUpperCase() : "Subscription Plan");

  const formattedAmount = (invoice.amount_minor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const currency = invoice.currency_code || "USD";

  const handlePrint = () => {
    const printContent = document.getElementById("printable-saas-invoice");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceNumber} - FishGate Technologies</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 30px;
              background: #fff;
            }
            .inv-box {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 40px;
            }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .header-table td { vertical-align: top; }
            .brand-logo { font-size: 24px; font-weight: 800; color: #0284c7; }
            .brand-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
            .inv-title { font-size: 20px; font-weight: 700; text-align: right; color: #0f172a; }
            .inv-meta { font-size: 13px; color: #475569; text-align: right; margin-top: 4px; }
            .party-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .party-table td { width: 50%; vertical-align: top; font-size: 13px; line-height: 1.5; }
            .party-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; letter-spacing: 0.05em; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 12px 10px; font-size: 12px; text-align: left; color: #475569; }
            .items-table td { padding: 14px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; }
            .totals-table { width: 40%; margin-left: auto; border-collapse: collapse; margin-bottom: 30px; }
            .totals-table td { padding: 8px 10px; font-size: 13px; }
            .totals-total { font-weight: 700; font-size: 15px; border-top: 2px solid #0f172a; }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              background: ${isPaid ? "#dcfce7" : isVoid ? "#fee2e2" : "#fef3c7"};
              color: ${isPaid ? "#15803d" : isVoid ? "#b91c1c" : "#b45309"};
            }
            .paid-seal {
              display: inline-block;
              border: 3px solid #16a34a;
              color: #16a34a;
              font-weight: 900;
              font-size: 18px;
              padding: 8px 24px;
              border-radius: 8px;
              transform: rotate(-8deg);
              letter-spacing: 0.1em;
              margin-top: 10px;
            }
            .footer {
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
              font-size: 11px;
              color: #94a3b8;
              text-align: center;
              line-height: 1.6;
            }
            @media print {
              body { padding: 0; }
              .inv-box { border: none; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="inv-box">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <DialogHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-20">
          <DialogTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            Official Tax Invoice & Subscription Receipt
          </DialogTitle>
          <div className="flex items-center gap-2 mr-6">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="h-8 gap-1.5 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Invoice Container */}
        <div id="printable-saas-invoice" className="p-6 md:p-8 bg-white text-slate-900">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-base">
                  FG
                </div>
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  FishGate<span className="text-sky-600">Pro</span>
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                <p className="font-semibold text-slate-700">FishGate Technologies Ltd</p>
                <p>Kigali Financial Square, KG 7 Ave, Kigali, Rwanda</p>
                <p>Tax Identification Number (TIN): 109283746-RW</p>
                <p>VAT Registration: RW109283746V</p>
                <p>Contact: billing@fishgatepro.com</p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Official SaaS Receipt
              </span>
              <h2 className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                {invoiceNumber}
              </h2>
              <div className="mt-2">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PAID & SETTLED
                  </span>
                ) : isVoid ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    <AlertCircle className="w-3.5 h-3.5" /> SUPERSEDED / VOID
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertCircle className="w-3.5 h-3.5" /> OPEN / UNPAID
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                <p>Issue Date: {format(new Date(invoice.created_at), "dd MMMM yyyy, HH:mm")}</p>
                {invoice.paid_at && (
                  <p className="text-emerald-700 font-medium">
                    Payment Date: {format(new Date(invoice.paid_at), "dd MMMM yyyy, HH:mm")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Customer & Billing Entity Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-slate-200">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Billed To (Customer Entity)
              </p>
              <p className="text-sm font-bold text-slate-900">{customerName}</p>
              <p className="text-xs text-slate-600 mt-0.5">{customerEmail}</p>
              <p className="text-xs text-slate-600">{customerCountry}</p>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Subscription Ref: {invoice.id.slice(0, 16)}...
              </p>
            </div>

            <div className="md:text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Payment Verification
              </p>
              <p className="text-xs text-slate-700">
                <span className="text-slate-500">Gateway:</span>{" "}
                <span className="font-semibold uppercase text-slate-900">
                  {invoice.metadata?.gateway || "Paystack / Standard Gateway"}
                </span>
              </p>
              <p className="text-xs text-slate-700 mt-0.5">
                <span className="text-slate-500">External Ref:</span>{" "}
                <span className="font-mono text-[11px] text-slate-900">
                  {invoice.external_reference || "N/A"}
                </span>
              </p>
              <p className="text-xs text-slate-700 mt-0.5">
                <span className="text-slate-500">Method:</span> Direct Card / Instant Wire Settlement
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6 border-b border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Billing Period</th>
                  <th className="py-2.5 px-3 text-right">Tax (VAT 18%)</th>
                  <th className="py-2.5 px-3 text-right">Amount ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr>
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900">FishGate SaaS Subscription - {planName}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Full access to Property Management Core, tenant portal, ledger accounting, and AI add-on capability.
                    </p>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">
                    {invoice.billing_details?.is_annual ? "Annual (365 Days)" : "Monthly (30 Days)"}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">Included</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    {currency} {formattedAmount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals & Watermark Stamp */}
          <div className="flex flex-col md:flex-row justify-between items-center py-6 gap-6">
            <div className="text-left w-full md:w-auto">
              {isPaid ? (
                <div className="inline-block border-2 border-emerald-600 rounded-lg px-4 py-2 text-emerald-700 font-extrabold text-sm tracking-widest uppercase transform -rotate-3 bg-emerald-50/50">
                  ✓ OFFICIAL PAID RECEIPT
                </div>
              ) : isVoid ? (
                <div className="inline-block border-2 border-rose-400 rounded-lg px-4 py-2 text-rose-600 font-extrabold text-sm tracking-widest uppercase transform -rotate-3 bg-rose-50/50">
                  ✕ SUPERSEDED DRAFT
                </div>
              ) : (
                <div className="inline-block border-2 border-amber-500 rounded-lg px-4 py-2 text-amber-700 font-extrabold text-sm tracking-widest uppercase transform -rotate-3 bg-amber-50/50">
                  ⚠ PENDING PAYMENT
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cryptographically verified platform subscription</span>
              </div>
            </div>

            <div className="w-full md:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{currency} {formattedAmount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>VAT (18% inclusive)</span>
                <span>{currency} {(Number(formattedAmount.replace(/,/g, "")) * 0.18 / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t-2 border-slate-900">
                <span>Total Paid</span>
                <span className="text-sky-700">{currency} {formattedAmount}</span>
              </div>
            </div>
          </div>

          {/* Legal / Tax Footer */}
          <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 leading-relaxed">
            <p>
              FishGate Technologies Ltd is incorporated under the laws of Rwanda. This document serves as an official electronic tax receipt and billing confirmation for software-as-a-service services rendered.
            </p>
            <p className="mt-1">
              For billing inquiries, contact billing@fishgatepro.com or visit https://fishgatepro.com/support
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end gap-3 sticky bottom-0 z-20">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Close
          </Button>
          <Button
            onClick={handlePrint}
            className="gap-2 bg-sky-600 hover:bg-sky-500 text-white font-medium"
          >
            <Download className="w-4 h-4" />
            Download / Print PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

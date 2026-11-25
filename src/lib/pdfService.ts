// src/lib/pdfService.ts
// FishGate Design Constitution v1.0 - Resilient Enterprise PDF & Print Engine
// Dual-mode execution: invokes Edge Function first; seamlessly falls back to client-side HTML generator.

import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

function escapeHtml(str: unknown): string {
  const value = String(str ?? '');
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Opens an isolated print window with @media print CSS and triggers native print/save-as-PDF dialog.
 * If popup blockers prevent window.open, falls back to a hidden iframe print approach.
 */
export function openPrintHtml(html: string, title: string = 'Document'): void {
  const htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const htmlUrl = URL.createObjectURL(htmlBlob);

  const printWindow = window.open(htmlUrl, '_blank');
  if (printWindow) {
    printWindow.addEventListener(
      'load',
      () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch (_) {}
          URL.revokeObjectURL(htmlUrl);
        }, 400);
      },
      { once: true }
    );
  } else {
    // Popup blocked: fallback to hidden iframe print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = htmlUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(htmlUrl);
          }, 2000);
        }
      }, 400);
    };
  }
}

/**
 * Generates statutory, executive-ready HTML for a lease agreement.
 */
export function generateLeaseHtml(lease: any, branding?: { companyName?: string; logoUrl?: string }): string {
  const companyName = branding?.companyName || lease.properties?.companies?.name || 'FishGate Real Estate Rwanda Ltd';
  const logoUrl = branding?.logoUrl || '';
  const leaseNumber = lease.lease_number || 'LS-AGREEMENT';
  const tenantName = lease.tenants?.name || 'Valued Resident';
  const tenantEmail = lease.tenants?.email || '';
  const tenantPhone = lease.tenants?.phone || '';
  const propertyName = lease.properties?.name || 'Estate Property';
  const propertyAddress = lease.properties?.address ? `${lease.properties.address}, ${lease.properties.city || ''}` : lease.properties?.city || 'Kigali, Rwanda';
  const unitNumber = lease.units?.unit_number || 'N/A';
  const startDate = lease.start_date ? format(new Date(lease.start_date), 'MMMM d, yyyy') : 'N/A';
  const endDate = lease.end_date ? format(new Date(lease.end_date), 'MMMM d, yyyy') : 'N/A';
  const rentFormatted = Number(lease.monthly_rent || 0).toLocaleString();
  const depositFormatted = Number(lease.security_deposit || 0).toLocaleString();
  const currency = lease.currency || 'RWF';
  const noticePeriod = lease.notice_period_days || 30;
  const gracePeriod = lease.grace_period_days || 5;
  const termsText = lease.terms || 'Standard statutory residential tenancy terms apply in full.';
  const specialConditions = lease.special_conditions || '';
  const landlordSigned = Boolean(lease.landlord_signed_at);
  const tenantSigned = Boolean(lease.tenant_signed_at);
  const landlordSignedDate = lease.landlord_signed_at ? format(new Date(lease.landlord_signed_at), 'MMM d, yyyy') : '';
  const tenantSignedDate = lease.tenant_signed_at ? format(new Date(lease.tenant_signed_at), 'MMM d, yyyy') : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lease Agreement - ${escapeHtml(leaseNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #1a202c;
      padding: 40px 48px;
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header {
      text-align: center;
      padding: 24px;
      margin-bottom: 28px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      border-top: 4px solid #1e3a8a;
    }
    .company-title {
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #475569;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .header h1 {
      font-size: 20pt;
      color: #0f172a;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .ref-badge {
      display: inline-block;
      font-family: monospace;
      font-size: 9.5pt;
      background: #e2e8f0;
      color: #1e293b;
      padding: 2px 10px;
      border-radius: 4px;
      margin-top: 6px;
      font-weight: bold;
    }
    .section {
      margin-bottom: 22px;
    }
    .section-title {
      font-size: 11.5pt;
      font-weight: bold;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.75px;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #2563eb;
      padding: 10px 14px;
      border-radius: 4px;
    }
    .info-label {
      font-size: 8.5pt;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 10.5pt;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }
    .financial-banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 14px 20px;
      display: flex;
      justify-content: space-around;
      text-align: center;
      margin: 14px 0;
    }
    .fin-item .amount {
      font-size: 15pt;
      font-weight: bold;
      color: #1e40af;
    }
    .fin-item .lbl {
      font-size: 8.5pt;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
      margin-top: 2px;
    }
    .terms-box {
      background: #fafafa;
      border: 1px solid #e2e8f0;
      padding: 16px;
      border-radius: 6px;
      font-size: 9.5pt;
      white-space: pre-wrap;
      line-height: 1.6;
      color: #334155;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 28px;
      page-break-inside: avoid;
    }
    .sig-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 16px;
      background: #f8fafc;
      min-height: 130px;
      display: flex;
      flex-col;
      justify-content: space-between;
    }
    .sig-img {
      max-height: 50px;
      margin: 8px 0;
    }
    .sig-line {
      border-top: 1px solid #94a3b8;
      margin-top: 40px;
      padding-top: 6px;
      font-size: 9pt;
      color: #64748b;
    }
    .footer {
      margin-top: 36px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 8.5pt;
      color: #94a3b8;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0 !important; }
      @page { margin: 1.6cm; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="position: sticky; top: 0; z-index: 1000; background: #0f172a; color: #ffffff; padding: 12px 24px; margin: -40px -48px 24px -48px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="font-weight: 600; font-size: 14px;">FishGate Official Lease Agreement</div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #2563eb; color: #ffffff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;">Print / Save as PDF</button>
      <button onclick="window.close()" style="background: #334155; color: #ffffff; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px;">Close</button>
    </div>
  </div>

  <div class="header">
    <div class="company-title">${escapeHtml(companyName)}</div>
    <h1>RESIDENTIAL LEASE AGREEMENT</h1>
    <div class="ref-badge">Agreement Ref: ${escapeHtml(leaseNumber)}</div>
  </div>

  <div class="section">
    <div class="section-title">1. Contracting Parties & Premises</div>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Landlord / Property Manager</div>
        <div class="info-value">${escapeHtml(companyName)}</div>
        <div style="font-size: 9pt; color: #64748b; margin-top: 2px;">Managing Agent for ${escapeHtml(propertyName)}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Resident / Tenant</div>
        <div class="info-value">${escapeHtml(tenantName)}</div>
        <div style="font-size: 9pt; color: #64748b; margin-top: 2px;">${escapeHtml(tenantEmail)} ${escapeHtml(tenantPhone)}</div>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Property & Space Allocation</div>
        <div class="info-value">${escapeHtml(propertyName)} — Unit ${escapeHtml(unitNumber)}</div>
        <div style="font-size: 9pt; color: #64748b; margin-top: 2px;">${escapeHtml(propertyAddress)}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Lease Classification</div>
        <div class="info-value">${escapeHtml(lease.lease_type || 'Residential')} Tenancy</div>
        <div style="font-size: 9pt; color: #64748b; margin-top: 2px;">Notice Period: ${escapeHtml(noticePeriod)} Days • Grace Period: ${escapeHtml(gracePeriod)} Days</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. Term Duration & Handover Horizon</div>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Commencement Date</div>
        <div class="info-value">${escapeHtml(startDate)}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Expiration Date</div>
        <div class="info-value">${escapeHtml(endDate)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">3. Financial Terms & Security Deposit</div>
    <div class="financial-banner">
      <div class="fin-item">
        <div class="amount">${escapeHtml(currency)} ${escapeHtml(rentFormatted)}</div>
        <div class="lbl">Agreed Monthly Rent</div>
      </div>
      <div class="fin-item">
        <div class="amount">${escapeHtml(currency)} ${escapeHtml(depositFormatted)}</div>
        <div class="lbl">Security Deposit Held</div>
      </div>
      <div class="fin-item">
        <div class="amount">${escapeHtml(lease.billing_frequency || 'Monthly')}</div>
        <div class="lbl">Billing Cadence</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">4. Terms, Covenants & Statutory Conditions</div>
    <div class="terms-box">${escapeHtml(termsText)}</div>
  </div>

  ${specialConditions ? `
  <div class="section">
    <div class="section-title">5. Special Stipulations & Community Rules</div>
    <div class="terms-box">${escapeHtml(specialConditions)}</div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Execution & Signatures</div>
    <div class="signatures-grid">
      <div class="sig-box">
        <div class="info-label">Signed on behalf of Landlord</div>
        ${lease.landlord_signature_url ? `<img src="${escapeHtml(lease.landlord_signature_url)}" class="sig-img" alt="Landlord Signature" />` : ''}
        <div class="sig-line">
          ${landlordSigned ? `Signed Digitally • ${escapeHtml(landlordSignedDate)}` : 'Signature / Authorized Stamp'}
        </div>
      </div>
      <div class="sig-box">
        <div class="info-label">Resident Signature</div>
        ${lease.tenant_signature_url ? `<img src="${escapeHtml(lease.tenant_signature_url)}" class="sig-img" alt="Tenant Signature" />` : ''}
        <div class="sig-line">
          ${tenantSigned ? `Signed Digitally • ${escapeHtml(tenantSignedDate)}` : 'Signature of Resident'}
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    FishGate Digital Lease Record • Reference ${escapeHtml(leaseNumber)} • Generated ${format(new Date(), 'PPpp')}
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 500);
    });
  </script>
</body>
</html>`;
}

/**
 * Generates statutory, executive-ready HTML for a billing invoice.
 */
export function generateInvoiceHtml(invoice: any, branding?: { companyName?: string }): string {
  const companyName = branding?.companyName || invoice.properties?.companies?.name || 'FishGate Real Estate Rwanda Ltd';
  const invoiceNumber = invoice.invoice_number || `INV-${String(invoice.id || '').slice(0, 8)}`;
  const tenantName = invoice.tenants?.name || invoice.guest_name || 'Valued Resident';
  const tenantEmail = invoice.tenants?.email || invoice.guest_email || '';
  const propertyName = invoice.properties?.name || 'Estate Property';
  const unitNumber = invoice.units?.unit_number || 'N/A';
  const dueDate = invoice.due_date ? format(new Date(invoice.due_date), 'MMMM d, yyyy') : 'Upon Receipt';
  const createdAt = invoice.created_at ? format(new Date(invoice.created_at), 'MMMM d, yyyy') : format(new Date(), 'MMMM d, yyyy');
  const amount = Number(invoice.amount || 0);
  const paidAmount = Number(invoice.paid_amount || 0);
  const balance = Math.max(0, amount - paidAmount);
  const currency = invoice.currency || 'RWF';
  const status = invoice.status || 'pending';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${escapeHtml(invoiceNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1e293b;
      padding: 40px 48px;
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
    }
    .brand h2 { font-size: 16pt; font-weight: 800; color: #0f172a; }
    .brand p { font-size: 9.5pt; color: #64748b; margin-top: 2px; }
    .inv-meta { text-align: right; }
    .inv-meta h1 { font-size: 20pt; font-weight: 800; color: #2563eb; }
    .inv-meta p { font-size: 9.5pt; color: #64748b; margin-top: 2px; }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    .details-box {
      background: #f8fafc;
      padding: 14px 18px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .box-title { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .box-name { font-size: 12pt; font-weight: 700; color: #0f172a; }
    .box-sub { font-size: 9.5pt; color: #475569; margin-top: 2px; }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .items-table th {
      background: #f1f5f9;
      text-align: left;
      padding: 10px 14px;
      font-size: 9pt;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }
    .items-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 10pt;
    }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 28px;
    }
    .totals-table {
      width: 280px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 6px 10px;
      font-size: 10pt;
    }
    .totals-table .total-row td {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      border-top: 2px solid #cbd5e1;
      padding-top: 10px;
    }
    .payment-instructions {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 14px 18px;
      font-size: 9.5pt;
      margin-bottom: 24px;
    }
    .footer {
      text-align: center;
      font-size: 8.5pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0 !important; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="position: sticky; top: 0; z-index: 1000; background: #0f172a; color: #ffffff; padding: 12px 24px; margin: -40px -40px 24px -40px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="font-weight: 600; font-size: 14px;">FishGate Official Tax Invoice</div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #2563eb; color: #ffffff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;">Print / Save as PDF</button>
      <button onclick="window.close()" style="background: #334155; color: #ffffff; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px;">Close</button>
    </div>
  </div>

  <div class="header">
    <div class="brand">
      <h2>${escapeHtml(companyName)}</h2>
      <p>Property Asset Management & Leasing Services</p>
      <p>${escapeHtml(propertyName)}</p>
    </div>
    <div class="inv-meta">
      <h1>TAX INVOICE</h1>
      <p><strong>Invoice #:</strong> ${escapeHtml(invoiceNumber)}</p>
      <p><strong>Issue Date:</strong> ${escapeHtml(createdAt)}</p>
      <p><strong>Due Date:</strong> ${escapeHtml(dueDate)}</p>
    </div>
  </div>

  <div class="details-grid">
    <div class="details-box">
      <div class="box-title">Billed To</div>
      <div class="box-name">${escapeHtml(tenantName)}</div>
      <div class="box-sub">${escapeHtml(propertyName)} • Unit ${escapeHtml(unitNumber)}</div>
      <div class="box-sub">${escapeHtml(tenantEmail)}</div>
    </div>
    <div class="details-box">
      <div class="box-title">Invoice Status</div>
      <div class="box-name" style="text-transform: capitalize; color: ${status === 'paid' ? '#10b981' : '#f59e0b'};">
        ${escapeHtml(status)}
      </div>
      <div class="box-sub">Due on or before ${escapeHtml(dueDate)}</div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>${escapeHtml(invoice.description || 'Rental Occupancy Fee')}</strong>
          <div style="font-size: 9pt; color: #64748b; margin-top: 2px;">
            Unit ${escapeHtml(unitNumber)} • Tenancy billing cycle
          </div>
        </td>
        <td style="text-align: right; font-weight: 600;">
          ${escapeHtml(currency)} ${amount.toLocaleString()}
        </td>
      </tr>
    </tbody>
  </table>

  <div class="totals-area">
    <table class="totals-table">
      <tr>
        <td>Subtotal:</td>
        <td style="text-align: right;">${escapeHtml(currency)} ${amount.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Paid to Date:</td>
        <td style="text-align: right; color: #10b981;">-${escapeHtml(currency)} ${paidAmount.toLocaleString()}</td>
      </tr>
      <tr class="total-row">
        <td>Total Due:</td>
        <td style="text-align: right; color: ${balance > 0 ? '#dc2626' : '#10b981'};">
          ${escapeHtml(currency)} ${balance.toLocaleString()}
        </td>
      </tr>
    </table>
  </div>

  <div class="payment-instructions">
    <strong>Payment Settlement Channels:</strong>
    <p style="margin-top: 4px;">
      Mobile Money (MTN MoMo): Dial *182*8*1# • Bank Transfer: Available on request. Include Invoice Ref <strong>${escapeHtml(invoiceNumber)}</strong> on remittance.
    </p>
  </div>

  <div class="footer">
    FishGate Billing System • Generated ${format(new Date(), 'PPpp')}
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 500);
    });
  </script>
</body>
</html>`;
}

/**
 * Generates an official payment receipt HTML.
 */
export function generateReceiptHtml(payment: any, branding?: { companyName?: string }): string {
  const companyName = branding?.companyName || payment.properties?.companies?.name || 'FishGate Real Estate Rwanda Ltd';
  const receiptNumber = payment.receipt_number || `REC-${String(payment.id || '').slice(0, 8)}`;
  const tenantName = payment.tenants?.name || payment.payer_name || 'Valued Resident';
  const amount = Number(payment.amount || 0);
  const currency = payment.currency || 'RWF';
  const dateFormatted = payment.created_at ? format(new Date(payment.created_at), 'MMMM d, yyyy h:mm a') : format(new Date(), 'MMMM d, yyyy');
  const method = String(payment.method || 'Electronic Transfer').toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${escapeHtml(receiptNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #0f172a;
      padding: 40px;
      max-width: 700px;
      margin: 0 auto;
      background: #ffffff;
    }
    .receipt-card {
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 32px;
      background: #ffffff;
      border-top: 6px solid #10b981;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #dcfce7;
      color: #15803d;
      font-weight: 700;
      border-radius: 9999px;
      font-size: 9pt;
      text-transform: uppercase;
    }
    .amount-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 18px;
      text-align: center;
      margin: 20px 0;
    }
    .amount-num {
      font-size: 24pt;
      font-weight: 800;
      color: #166534;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 10pt;
    }
    .info-row .lbl { color: #64748b; }
    .info-row .val { font-weight: 600; color: #0f172a; }
    .stamp-area {
      text-align: center;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
      font-size: 8.5pt;
      color: #94a3b8;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0 !important; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="position: sticky; top: 0; z-index: 1000; background: #0f172a; color: #ffffff; padding: 12px 24px; margin: -40px -40px 24px -40px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="font-weight: 600; font-size: 14px;">FishGate Official Receipt</div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #16a34a; color: #ffffff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;">Print / Save as PDF</button>
      <button onclick="window.close()" style="background: #334155; color: #ffffff; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px;">Close</button>
    </div>
  </div>

  <div class="receipt-card">
    <div class="header">
      <div>
        <h2 style="font-size: 14pt; font-weight: 800;">${escapeHtml(companyName)}</h2>
        <p style="font-size: 9pt; color: #64748b;">Official Payment Receipt</p>
      </div>
      <div style="text-align: right;">
        <span class="badge">Payment Confirmed</span>
        <p style="font-size: 9pt; font-mono; color: #64748b; margin-top: 4px;">Ref: ${escapeHtml(receiptNumber)}</p>
      </div>
    </div>

    <div class="amount-banner">
      <div style="font-size: 9pt; text-transform: uppercase; font-weight: 600; color: #15803d;">Total Amount Paid</div>
      <div class="amount-num">${escapeHtml(currency)} ${amount.toLocaleString()}</div>
    </div>

    <div class="info-row">
      <span class="lbl">Payer / Resident:</span>
      <span class="val">${escapeHtml(tenantName)}</span>
    </div>
    <div class="info-row">
      <span class="lbl">Transaction Date:</span>
      <span class="val">${escapeHtml(dateFormatted)}</span>
    </div>
    <div class="info-row">
      <span class="lbl">Payment Method:</span>
      <span class="val">${escapeHtml(method)}</span>
    </div>
    <div class="info-row">
      <span class="lbl">Receipt Reference:</span>
      <span class="val" style="font-family: monospace;">${escapeHtml(receiptNumber)}</span>
    </div>

    <div class="stamp-area">
      FishGate Verified Digital Receipt • Valid for statutory tax & tenant record retention
    </div>
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 500);
    });
  </script>
</body>
</html>`;
}

/**
 * Resilient Lease PDF Download Dispatcher:
 * 1. Tries Edge Function 'generate-lease-pdf'.
 * 2. If it succeeds, opens the returned HTML.
 * 3. If the Edge Function fails for ANY reason (network, missing deployment, 404),
 *    catches the error gracefully, generates the high-fidelity HTML directly on the client,
 *    and triggers native browser print / save-to-PDF!
 */
export async function downloadLeasePdf(params: {
  leaseId: string;
  companyId?: string;
  leaseData?: any;
}): Promise<void> {
  const { leaseId, companyId, leaseData } = params;

  // 1. Try invoking Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('generate-lease-pdf', {
      body: { leaseId, companyId },
    });

    if (!error && data) {
      const html = typeof data === 'string' ? data : await new Response(data).text();
      if (html && html.includes('<html')) {
        openPrintHtml(html, `Lease-${leaseId}`);
        return;
      }
    }
  } catch (err) {
    console.warn('Edge function generate-lease-pdf unavailable, switching to client generator:', err);
  }

  // 2. Seamless Client-Side Fallback Generator
  let lease = leaseData;
  if (!lease || !lease.properties || !lease.tenants) {
    const { data: fetchedLease } = await supabase
      .from('leases')
      .select(`
        *,
        tenants:tenant_id(id, name, email, phone),
        properties:property_id(id, name, address, city, company_id, companies:company_id(id, name)),
        units:unit_id(id, unit_number)
      `)
      .eq('id', leaseId)
      .single();

    if (fetchedLease) {
      lease = fetchedLease;
    }
  }

  if (!lease) {
    throw new Error('Could not load lease details for document generation.');
  }

  const html = generateLeaseHtml(lease);
  openPrintHtml(html, `Lease-${lease.lease_number || leaseId}`);
}

/**
 * Resilient Invoice PDF Download Dispatcher:
 * 1. Tries Edge Function 'generate-invoice-pdf'.
 * 2. If it fails, seamlessly generates client-side printable invoice without throwing error.
 */
export async function downloadInvoicePdf(params: {
  invoiceId: string;
  companyId?: string;
  invoiceData?: any;
}): Promise<void> {
  const { invoiceId, companyId, invoiceData } = params;

  try {
    const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
      body: { invoiceId, companyId },
    });

    if (!error && data) {
      const html = typeof data === 'string' ? data : await new Response(data).text();
      if (html && html.includes('<html')) {
        openPrintHtml(html, `Invoice-${invoiceId}`);
        return;
      }
    }
  } catch (err) {
    console.warn('Edge function generate-invoice-pdf unavailable, switching to client generator:', err);
  }

  // Client-Side Fallback
  let invoice = invoiceData;
  if (!invoice || !invoice.properties || !invoice.tenants) {
    const { data: fetchedInvoice } = await supabase
      .from('invoices')
      .select(`
        *,
        tenants:tenant_id(id, name, email, phone),
        properties:property_id(id, name, address, city, company_id, companies:company_id(id, name)),
        units:unit_id(id, unit_number)
      `)
      .eq('id', invoiceId)
      .single();

    if (fetchedInvoice) {
      invoice = fetchedInvoice;
    }
  }

  if (!invoice) {
    throw new Error('Could not load invoice details for PDF generation.');
  }

  const html = generateInvoiceHtml(invoice);
  openPrintHtml(html, `Invoice-${invoice.invoice_number || invoiceId}`);
}

/**
 * Resilient Payment Receipt PDF Download Dispatcher:
 * Generates an official payment receipt and triggers print / save as PDF.
 */
export async function downloadReceiptPdf(params: {
  paymentId: string;
  companyId?: string;
  paymentData?: any;
}): Promise<void> {
  const { paymentId, paymentData } = params;

  let payment = paymentData;
  if (!payment) {
    const { data: fetchedPayment } = await supabase
      .from('payments')
      .select(`
        *,
        tenants:tenant_id(id, name, email, phone),
        properties:property_id(id, name, address, city, company_id, companies:company_id(id, name))
      `)
      .eq('id', paymentId)
      .single();

    if (fetchedPayment) {
      payment = fetchedPayment;
    }
  }

  if (!payment) {
    throw new Error('Payment record not found.');
  }

  const html = generateReceiptHtml(payment);
  openPrintHtml(html, `Receipt-${payment.receipt_number || paymentId}`);
}

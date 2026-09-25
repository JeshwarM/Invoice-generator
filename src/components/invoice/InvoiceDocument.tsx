import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatDisplayDate } from '../../utils/date';
import { formatCurrency, paiseToRupees, isWeightUnit } from '../../utils/calculations';
import type { Invoice } from '../../types';
import IronvalleyLogo from '../common/IronvalleyLogo';

interface InvoiceDocumentProps {
  invoice: Invoice;
  className?: string;
  id?: string;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  invoice,
  className = '',
  id = 'invoice-document-root',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const supplier = invoice.supplierSnapshot;
  const hotel = invoice.hotelSnapshot;

  const upiId = invoice.payment?.upiId || 'ironvalleyagronomy@idfcbank';
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    supplier.companyName || 'IRONVALLEY AGRONOMY'
  )}&am=${paiseToRupees(invoice.grandTotal)}&cu=INR`;

  useEffect(() => {
    QRCode.toDataURL(upiPayUrl, {
      width: 130,
      margin: 1,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [upiPayUrl]);

  return (
    <div
      id={id}
      className={`invoice-exact-sheet ${className}`}
      style={{
        backgroundColor: '#ffffff',
        color: '#18181b',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        maxWidth: 820,
        margin: '0 auto',
        padding: '36px 42px',
        boxSizing: 'border-box',
      }}
    >
      {/* ===== HEADER ROW ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1
            style={{
              color: '#583eb5',
              fontSize: '32px',
              fontWeight: 600,
              margin: '0 0 16px 0',
              letterSpacing: '-0.3px',
            }}
          >
            Sales Invoice
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '13.5px' }}>
            <div style={{ display: 'flex' }}>
              <span style={{ color: '#6b7280', width: 125 }}>Invoice No #</span>
              <span style={{ color: '#18181b', fontWeight: 600 }}>{invoice.invoiceNumber}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ color: '#6b7280', width: 125 }}>Invoice Date</span>
              <span style={{ color: '#18181b', fontWeight: 600 }}>{formatDisplayDate(invoice.invoiceDate)}</span>
            </div>
          </div>
        </div>

        <div>
          <IronvalleyLogo width={100} height={118} />
        </div>
      </div>

      {/* ===== BILLED BY / BILLED TO CARDS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 26 }}>
        {/* Billed By */}
        <div
          style={{
            backgroundColor: '#f1f3fa',
            borderRadius: 10,
            padding: '16px 20px',
            fontSize: '12px',
            lineHeight: 1.45,
          }}
        >
          <div style={{ color: '#583eb5', fontSize: '15px', fontWeight: 600, marginBottom: 6 }}>Billed By</div>
          <div style={{ fontWeight: 700, color: '#111827', fontSize: '12.5px', marginBottom: 3 }}>
            {supplier.companyName || 'IRONVALLEY AGRONOMY PRIVATE LIMITED'}
          </div>
          <div style={{ color: '#374151' }}>
            {[supplier.address, supplier.city, supplier.state].filter(Boolean).join(', ') || 'Tamil Nadu, India'}
          </div>
          {supplier.gstin && <div style={{ color: '#1f2937' }}>GSTIN: {supplier.gstin}</div>}
          {supplier.pan && <div style={{ color: '#1f2937' }}>PAN: {supplier.pan}</div>}
          {supplier.fssai && <div style={{ color: '#1f2937' }}>FSSAI: {supplier.fssai}</div>}
        </div>

        {/* Billed To */}
        <div
          style={{
            backgroundColor: '#f1f3fa',
            borderRadius: 10,
            padding: '16px 20px',
            fontSize: '12px',
            lineHeight: 1.45,
          }}
        >
          <div style={{ color: '#583eb5', fontSize: '15px', fontWeight: 600, marginBottom: 6 }}>Billed To</div>
          <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px', marginBottom: 3 }}>
            {hotel.hotelName || 'TAJ Coromandel Hotel'}
          </div>
          {hotel.address && (
            <div style={{ color: '#374151', whiteSpace: 'pre-line' }}>{hotel.address}</div>
          )}
          {hotel.city && (
            <div style={{ color: '#374151' }}>
              {hotel.city}
              {hotel.pincode ? `, ${hotel.pincode}` : ''}
            </div>
          )}
          {hotel.country && <div style={{ color: '#374151' }}>{hotel.country} {hotel.pincode && !hotel.city ? `- ${hotel.pincode}` : ''}</div>}
          {/* Note: GSTIN/PAN/FSSAI only rendered if available */}
          {hotel.gstin ? <div style={{ color: '#1f2937' }}>GSTIN: {hotel.gstin}</div> : null}
          {hotel.pan ? <div style={{ color: '#1f2937' }}>PAN: {hotel.pan}</div> : null}
          {hotel.fssai ? <div style={{ color: '#1f2937' }}>FSSAI: {hotel.fssai}</div> : null}
        </div>
      </div>

      {/* ===== ITEMS TABLE ===== */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
          marginBottom: 24,
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: '#5439a8',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              textAlign: 'left',
              height: 38,
            }}
          >
            <th style={{ padding: '8px 14px', borderRadius: '4px 0 0 0', width: '31%' }}>Item</th>
            <th style={{ padding: '8px 6px', textAlign: 'center', width: '12%', lineHeight: 1.2 }}>
              Delivered<br />on
            </th>
            <th style={{ padding: '8px 8px', textAlign: 'center', width: '10%' }}>Quantity</th>
            <th style={{ padding: '8px 8px', textAlign: 'center', width: '8%' }}>Unit</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', width: '11%' }}>Rate</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', width: '10%' }}>IGST</th>
            <th style={{ padding: '8px 12px', textAlign: 'right', width: '12%' }}>Total</th>
            <th style={{ padding: '8px 14px', textAlign: 'right', borderRadius: '0 4px 0 0', width: '13%' }}>
              DELIVERY TIME
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => {
            const isEven = idx % 2 === 0;
            const displayUnit = item.unit === 'kg' ? 'kgs' : item.unit;
            const displayQty = isWeightUnit(item.unit) ? item.quantityGrams / 1000 : item.quantity;
            return (
              <tr
                key={idx}
                style={{
                  backgroundColor: isEven ? '#ffffff' : '#f7f8fd',
                  borderBottom: '1px solid #edf0f8',
                  color: '#27272a',
                }}
              >
                {/* Item */}
                <td style={{ padding: '8px 14px', fontWeight: 500 }}>
                  <span style={{ display: 'inline-block', width: 22, color: '#4b5563' }}>{idx + 1}.</span>
                  <span style={{ textTransform: 'uppercase' }}>{item.productNameSnapshot}</span>
                </td>

                {/* Delivered on (Light purple background on every row) */}
                <td
                  style={{
                    padding: '8px 6px',
                    textAlign: 'center',
                    backgroundColor: '#eef1fa',
                    color: '#374151',
                    fontSize: '11.5px',
                  }}
                >
                  {item.deliveryDate ? formatDisplayDate(item.deliveryDate) : ''}
                </td>

                {/* Quantity */}
                <td style={{ padding: '8px 8px', textAlign: 'center' }}>{displayQty}</td>

                {/* Unit */}
                <td style={{ padding: '8px 8px', textAlign: 'center', color: '#4b5563' }}>{displayUnit}</td>

                {/* Rate */}
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                  ₹{paiseToRupees(item.finalBillingRate).toLocaleString('en-IN')}
                </td>

                {/* IGST */}
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#4b5563' }}>
                  {formatCurrency(item.igstAmount)}
                </td>

                {/* Total */}
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>
                  {formatCurrency(item.lineTotal)}
                </td>

                {/* Delivery Time */}
                <td style={{ padding: '8px 14px', textAlign: 'right', color: '#6b7280', fontSize: '11.5px' }}>
                  {item.deliveryTime || ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ===== TOTALS & WORDS SECTION ===== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          gap: 20,
        }}
      >
        {/* Total in words */}
        <div style={{ flex: 1, maxWidth: '58%', fontSize: '11.5px', lineHeight: 1.5, color: '#18181b' }}>
          <strong>Total (in words) :</strong>{' '}
          <span style={{ fontWeight: 600 }}>{invoice.totalInWords}</span>
        </div>

        {/* Financial Calculation Block */}
        <div style={{ width: 250, fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#374151' }}>
            <span>Amount</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#374151' }}>
            <span>IGST</span>
            <span>{formatCurrency(invoice.tax.taxAmount)}</span>
          </div>
          <div
            style={{
              borderTop: '1.5px solid #18181b',
              borderBottom: '1.5px solid #18181b',
              padding: '6px 0',
              marginTop: 6,
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '13.5px',
              color: '#18181b',
            }}
          >
            <span>Total (INR)</span>
            <span>{formatCurrency(invoice.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* ===== UPI PAYMENT SECTION ===== */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ color: '#583eb5', fontSize: '13.5px', fontWeight: 600, marginBottom: 2 }}>
          Scan to pay via UPI
        </div>
        <div style={{ color: '#6b7280', fontSize: '9.5px', maxWidth: 180, lineHeight: 1.35, marginBottom: 8 }}>
          Maximum of 1 lakh can be transferred via upi in a single day
        </div>
        {qrDataUrl && (
          <div style={{ marginBottom: 6 }}>
            <img src={qrDataUrl} alt="UPI QR Code" style={{ width: 105, height: 105, display: 'block' }} />
          </div>
        )}
        <div style={{ fontWeight: 700, fontSize: '12px', color: '#18181b' }}>{upiId}</div>
      </div>

      {/* ===== TERMS AND CONDITIONS ===== */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: '#583eb5', fontSize: '13.5px', fontWeight: 600, marginBottom: 6 }}>
          Terms and Conditions
        </div>
        <div style={{ fontSize: '10.5px', color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
          {invoice.termsAndConditions ||
            `1. Please pay within 2 days from the date of invoice\n2. Please use the UPI ID in the invoice to remit the amount\n3. In an highly unlikely case, if you're not satisfied with our product delivered to you and you don't want to pay, we respect it and we'd love to have your feedback @ +91 9600458450`}
        </div>
      </div>

      {/* ===== BOTTOM FOOTER ===== */}
      <div
        style={{
          borderTop: '1px solid #f3f4f6',
          paddingTop: 16,
          textAlign: 'center',
          fontSize: '11px',
          color: '#4b5563',
        }}
      >
        For any enquiry, reach out via email at{' '}
        <span style={{ color: '#1f2937', fontWeight: 500 }}>{supplier.email || 'info@ironvalleyagro.in'}</span>, call
        on <span style={{ color: '#1f2937', fontWeight: 500 }}>{supplier.phone || '+91 96004 58450'}</span>
      </div>
    </div>
  );
};

export default InvoiceDocument;

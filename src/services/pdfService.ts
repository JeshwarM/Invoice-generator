import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from '../types';
import { formatCurrency, paiseToRupees, isWeightUnit } from '../utils/calculations';
import { formatDisplayDate } from '../utils/date';

const PURPLE = '#5b3e96';
const LIGHT_PURPLE = '#f8f7fc';

/**
 * Generate a professional PDF invoice matching the sample invoice's visual hierarchy.
 * High-fidelity dynamic reproduction with proper multi-page support.
 */
export async function generateInvoicePDF(invoice: Invoice): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pdf.internal.pageSize.getHeight() - 20) {
      pdf.addPage();
      y = margin;
    }
  };

  // ===== HEADER =====
  pdf.setFillColor(PURPLE);
  pdf.rect(0, 0, pageWidth, 35, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SALES INVOICE', pageWidth / 2, 18, { align: 'center' });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Invoice No: ${invoice.invoiceNumber}`, margin, 28);
  pdf.text(`Invoice Date: ${formatDisplayDate(invoice.invoiceDate)}`, pageWidth - margin, 28, { align: 'right' });

  y = 42;
  pdf.setTextColor(0, 0, 0);

  // ===== BILLED BY / BILLED TO =====
  const supplier = invoice.supplierSnapshot;
  const hotel = invoice.hotelSnapshot;
  const colWidth = (contentWidth - 6) / 2;

  // Billed By box
  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(248, 247, 252);
  pdf.roundedRect(margin, y, colWidth, 45, 2, 2, 'FD');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(91, 62, 150);
  pdf.text('Billed By', margin + 4, y + 7);
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(supplier.companyName || '', margin + 4, y + 14);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  let billedByY = y + 19;
  const supplierAddr = [supplier.address, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ');
  if (supplierAddr) { pdf.text(supplierAddr, margin + 4, billedByY); billedByY += 4; }
  if (supplier.gstin) { pdf.text(`GSTIN: ${supplier.gstin}`, margin + 4, billedByY); billedByY += 4; }
  if (supplier.pan) { pdf.text(`PAN: ${supplier.pan}`, margin + 4, billedByY); billedByY += 4; }
  if (supplier.fssai) { pdf.text(`FSSAI: ${supplier.fssai}`, margin + 4, billedByY); billedByY += 4; }
  if (supplier.phone) { pdf.text(`Phone: ${supplier.phone}`, margin + 4, billedByY); billedByY += 4; }
  if (supplier.email) { pdf.text(`Email: ${supplier.email}`, margin + 4, billedByY); }

  // Billed To box
  const rightX = margin + colWidth + 6;
  pdf.setFillColor(248, 247, 252);
  pdf.roundedRect(rightX, y, colWidth, 45, 2, 2, 'FD');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(91, 62, 150);
  pdf.text('Billed To', rightX + 4, y + 7);
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(hotel.hotelName || '', rightX + 4, y + 14);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  let billedToY = y + 19;
  const hotelAddr = [hotel.address, hotel.city, hotel.state, hotel.pincode].filter(Boolean).join(', ');
  if (hotelAddr) { pdf.text(hotelAddr, rightX + 4, billedToY); billedToY += 4; }
  if (hotel.gstin) { pdf.text(`GSTIN: ${hotel.gstin}`, rightX + 4, billedToY); billedToY += 4; }
  if (hotel.pan) { pdf.text(`PAN: ${hotel.pan}`, rightX + 4, billedToY); billedToY += 4; }
  if (hotel.fssai) { pdf.text(`FSSAI: ${hotel.fssai}`, rightX + 4, billedToY); billedToY += 4; }
  if (hotel.contactPerson) { pdf.text(`Contact: ${hotel.contactPerson}`, rightX + 4, billedToY); }

  y += 52;

  // ===== ITEMS TABLE =====
  const tableData = invoice.items.map((item, idx) => [
    (idx + 1).toString(),
    item.productNameSnapshot.toUpperCase(),
    formatDisplayDate(item.deliveryDate),
    isWeightUnit(item.unit) ? (item.quantityGrams / 1000).toString() : item.quantity.toString(),
    item.unit,
    formatCurrency(item.finalBillingRate),
    formatCurrency(item.igstAmount),
    formatCurrency(item.lineTotal),
    item.deliveryTime || '-',
  ]);

  autoTable(pdf, {
    startY: y,
    head: [['#', 'Item', 'Delivered On', 'Qty', 'Unit', 'Rate', 'IGST', 'Total', 'Delivery Time']],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [91, 62, 150],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 247, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      3: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      // Repeat header on new pages
      if (data.pageNumber > 1) {
        pdf.setFillColor(PURPLE);
        pdf.rect(0, 0, pageWidth, 12, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.text(`${invoice.invoiceNumber} — Page ${data.pageNumber}`, margin, 8);
        pdf.setTextColor(0, 0, 0);
      }
    },
  });

  // Get final Y after table
  const autoTableState = pdf as unknown as { lastAutoTable?: { finalY?: number } };
  y = autoTableState.lastAutoTable?.finalY ?? (y + 20);
  y += 5;

  // ===== TOTAL IN WORDS =====
  addNewPageIfNeeded(40);
  pdf.setFillColor(248, 247, 252);
  pdf.roundedRect(margin, y, contentWidth, 10, 1, 1, 'F');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Total (in words): ${invoice.totalInWords}`, margin + 3, y + 6);
  y += 14;

  // ===== UPI SECTION =====
  if (invoice.payment.upiId) {
    addNewPageIfNeeded(30);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Scan to pay via UPI', margin, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text(`UPI ID: ${invoice.payment.upiId}`, margin, y);
    y += 4;
    if (invoice.payment.upiName) {
      pdf.text(`UPI Name: ${invoice.payment.upiName}`, margin, y);
      y += 4;
    }
    pdf.text('Maximum of 1 lakh can be transferred via UPI in a single day.', margin, y);
    y += 8;
  }

  // ===== TOTALS =====
  addNewPageIfNeeded(30);
  const totalsX = pageWidth - margin - 70;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Amount:', totalsX, y);
  pdf.text(formatCurrency(invoice.subtotal), pageWidth - margin, y, { align: 'right' });
  y += 5;
  pdf.text('IGST:', totalsX, y);
  pdf.text(formatCurrency(invoice.tax.taxAmount), pageWidth - margin, y, { align: 'right' });
  y += 2;
  pdf.setDrawColor(91, 62, 150);
  pdf.line(totalsX, y, pageWidth - margin, y);
  y += 5;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total (INR):', totalsX, y);
  pdf.setTextColor(91, 62, 150);
  pdf.text(formatCurrency(invoice.grandTotal), pageWidth - margin, y, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
  y += 10;

  // ===== TERMS =====
  if (invoice.termsAndConditions) {
    addNewPageIfNeeded(20);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Terms & Conditions:', margin, y);
    y += 4;
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(invoice.termsAndConditions, contentWidth);
    lines.forEach((line: string) => {
      addNewPageIfNeeded(5);
      pdf.text(line, margin, y);
      y += 3.5;
    });
    y += 3;
  }

  // ===== FOOTER =====
  if (supplier.phone || supplier.email) {
    addNewPageIfNeeded(10);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(128, 128, 128);
    const contactLine = [`Phone: ${supplier.phone}`, `Email: ${supplier.email}`].filter(v => !v.endsWith(': ')).join(' | ');
    pdf.text(contactLine, pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  // Save
  pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
}

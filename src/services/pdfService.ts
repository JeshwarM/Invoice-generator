import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { Invoice } from '../types';
import { formatCurrency, paiseToRupees, isWeightUnit } from '../utils/calculations';
import { formatDisplayDate } from '../utils/date';

const PURPLE = '#5439a8';
const TEXT_PURPLE = '#583eb5';
const LIGHT_CARD_BG = [241, 243, 250] as [number, number, number];

/**
 * Generate a high-fidelity PDF invoice matching the exact sample invoice.
 * Tries high-resolution html2canvas capture from the DOM if available,
 * with vector jsPDF fallback.
 */
export async function generateInvoicePDF(invoice: Invoice, targetElementId?: string): Promise<void> {
  const elementId = targetElementId || 'invoice-document-root';
  const element = document.getElementById(elementId);

  if (element) {
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Retinal high-resolution quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
      return;
    } catch (err) {
      console.warn('html2canvas capture failed, falling back to programmatic jsPDF renderer:', err);
    }
  }

  // Programmatic vector jsPDF fallback
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(88, 62, 181);
  pdf.text('Sales Invoice', margin, y + 8);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Invoice No #', margin, y + 16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(24, 24, 27);
  pdf.text(invoice.invoiceNumber, margin + 28, y + 16);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Invoice Date', margin, y + 22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(24, 24, 27);
  pdf.text(formatDisplayDate(invoice.invoiceDate), margin + 28, y + 22);

  y += 28;

  // Billed By & Billed To Cards
  const supplier = invoice.supplierSnapshot;
  const hotel = invoice.hotelSnapshot;
  const cardWidth = (contentWidth - 6) / 2;

  // Billed By
  pdf.setFillColor(...LIGHT_CARD_BG);
  pdf.roundedRect(margin, y, cardWidth, 42, 2, 2, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(88, 62, 181);
  pdf.text('Billed By', margin + 4, y + 6);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text(supplier.companyName || 'IRONVALLEY AGRONOMY PRIVATE LIMITED', margin + 4, y + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(55, 65, 81);
  pdf.text(supplier.address || 'Tamil Nadu, India', margin + 4, y + 17);
  pdf.text(`GSTIN: ${supplier.gstin || ''}`, margin + 4, y + 22);
  pdf.text(`PAN: ${supplier.pan || ''}`, margin + 4, y + 27);
  pdf.text(`FSSAI: ${supplier.fssai || ''}`, margin + 4, y + 32);

  // Billed To
  const rightX = margin + cardWidth + 6;
  pdf.setFillColor(...LIGHT_CARD_BG);
  pdf.roundedRect(rightX, y, cardWidth, 42, 2, 2, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(88, 62, 181);
  pdf.text('Billed To', rightX + 4, y + 6);

  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text(hotel.hotelName || 'TAJ Coromandel Hotel', rightX + 4, y + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(55, 65, 81);
  const hotelLines = pdf.splitTextToSize(
    `${hotel.address || ''}\n${hotel.city || ''} ${hotel.country || ''} ${hotel.pincode || ''}`.trim(),
    cardWidth - 8
  );
  pdf.text(hotelLines, rightX + 4, y + 17);

  y += 48;

  // Table
  const tableData = invoice.items.map((item, idx) => [
    `${idx + 1}.  ${item.productNameSnapshot.toUpperCase()}`,
    item.deliveryDate ? formatDisplayDate(item.deliveryDate) : '',
    isWeightUnit(item.unit) ? (item.quantityGrams / 1000).toString() : item.quantity.toString(),
    item.unit === 'kg' ? 'kgs' : item.unit,
    `₹${paiseToRupees(item.finalBillingRate).toLocaleString('en-IN')}`,
    formatCurrency(item.igstAmount),
    formatCurrency(item.lineTotal),
    item.deliveryTime || '',
  ]);

  autoTable(pdf, {
    startY: y,
    head: [['Item', 'Delivered\non', 'Quantity', 'Unit', 'Rate', 'IGST', 'Total', 'DELIVERY TIME']],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [84, 57, 168],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [247, 248, 253],
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 22, halign: 'center', fillColor: [238, 241, 250] },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 19, halign: 'right' },
    },
  });

  const autoTableState = pdf as unknown as { lastAutoTable?: { finalY?: number } };
  y = autoTableState.lastAutoTable?.finalY ?? (y + 30);
  y += 6;

  // Financial summary & words
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(24, 24, 27);
  pdf.text(`Total (in words) : ${invoice.totalInWords}`, margin, y, { maxWidth: contentWidth * 0.58 });

  const totalsX = pageWidth - margin - 60;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Amount', totalsX, y);
  pdf.text(formatCurrency(invoice.subtotal), pageWidth - margin, y, { align: 'right' });
  y += 4.5;
  pdf.text('IGST', totalsX, y);
  pdf.text(formatCurrency(invoice.tax.taxAmount), pageWidth - margin, y, { align: 'right' });
  y += 2;
  pdf.setDrawColor(24, 24, 27);
  pdf.line(totalsX, y, pageWidth - margin, y);
  y += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total (INR)', totalsX, y);
  pdf.text(formatCurrency(invoice.grandTotal), pageWidth - margin, y, { align: 'right' });
  y += 2;
  pdf.line(totalsX, y, pageWidth - margin, y);

  y += 10;
  // UPI
  pdf.setFontSize(8.5);
  pdf.setTextColor(88, 62, 181);
  pdf.text('Scan to pay via UPI', margin, y);
  y += 3.5;
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Maximum of 1 lakh can be transferred via upi in a single day', margin, y);
  y += 4;
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(24, 24, 27);
  pdf.text(invoice.payment?.upiId || 'ironvalleyagronomy@idfcbank', margin, y);

  y += 8;
  // Terms
  pdf.setFontSize(8.5);
  pdf.setTextColor(88, 62, 181);
  pdf.text('Terms and Conditions', margin, y);
  y += 4;
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  const termsLines = pdf.splitTextToSize(
    invoice.termsAndConditions ||
      '1. Please pay within 2 days from the date of invoice\n2. Please use the UPI ID in the invoice to remit the amount',
    contentWidth
  );
  pdf.text(termsLines, margin, y);

  pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
}

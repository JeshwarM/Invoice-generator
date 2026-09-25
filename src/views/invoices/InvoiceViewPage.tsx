import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CCard, CCardBody, CCardHeader, CButton, CRow, CCol, CTable, CTableHead,
  CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CAlert,
  CFormTextarea, CFormLabel,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload, cilArrowLeft } from '@coreui/icons';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getInvoice, cancelInvoice } from '../../services/invoiceService';
import { createAuditLog } from '../../services/auditService';
import { formatDisplayDate } from '../../utils/date';
import { formatCurrency, paiseToRupees, isWeightUnit } from '../../utils/calculations';
import type { Invoice } from '../../types';
import { generateInvoicePDF } from '../../services/pdfService';

const InvoiceViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile, isController } = useAuth();
  const { addToast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const inv = await getInvoice(id);
        setInvoice(inv);
      } catch {
        addToast('error', 'Error', 'Failed to load invoice.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, addToast]);

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      await generateInvoicePDF(invoice);
      addToast('success', 'Downloaded', 'Invoice PDF downloaded.');
    } catch (err) {
      addToast('error', 'Error', 'Failed to generate PDF.');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCancel = async () => {
    if (!invoice || !cancelReason.trim()) {
      addToast('error', 'Error', 'Cancellation reason is required.');
      return;
    }
    setCancelling(true);
    try {
      await cancelInvoice(invoice.id, cancelReason.trim(), userProfile?.uid || '');
      await createAuditLog('invoice_cancelled', 'invoice', invoice.id,
        userProfile?.uid || '', userProfile?.name || '',
        { invoiceNumber: invoice.invoiceNumber, reason: cancelReason.trim() });
      setInvoice({ ...invoice, status: 'cancelled', cancellationReason: cancelReason.trim() });
      addToast('success', 'Cancelled', 'Invoice has been cancelled.');
    } catch (err) {
      addToast('error', 'Error', err instanceof Error ? err.message : 'Failed to cancel invoice.');
    } finally {
      setCancelling(false);
      setCancelModal(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!invoice) return <CAlert color="danger">Invoice not found.</CAlert>;

  const supplier = invoice.supplierSnapshot;
  const hotel = invoice.hotelSnapshot;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <CButton color="link" onClick={() => navigate('/invoices')} className="ps-0">
            <CIcon icon={cilArrowLeft} className="me-1" />Back to Invoices
          </CButton>
          <h4 className="mb-0">Invoice: {invoice.invoiceNumber} <StatusBadge status={invoice.status} /></h4>
        </div>
        <div className="d-flex gap-2">
          <CButton color="success" onClick={handleDownloadPDF} disabled={downloading}>
            <CIcon icon={cilCloudDownload} className="me-1" />{downloading ? 'Generating...' : 'Download PDF'}
          </CButton>
          {isController && invoice.status === 'finalized' && (
            <CButton color="danger" variant="outline" onClick={() => setCancelModal(true)}>Cancel Invoice</CButton>
          )}
        </div>
      </div>

      {invoice.status === 'cancelled' && invoice.cancellationReason && (
        <CAlert color="danger" className="mb-3">
          <strong>Cancelled:</strong> {invoice.cancellationReason}
        </CAlert>
      )}

      {/* Invoice Rendering */}
      <CCard>
        <CCardBody>
          <div className="border rounded p-4 bg-white" id="invoice-content">
            {/* Header */}
            <div className="text-center mb-4">
              <h3 className="text-uppercase" style={{ color: '#5b3e96', letterSpacing: 2 }}>Sales Invoice</h3>
              <CRow className="justify-content-center">
                <CCol md={4} className="text-start"><strong>Invoice No:</strong> {invoice.invoiceNumber}</CCol>
                <CCol md={4} className="text-end"><strong>Invoice Date:</strong> {formatDisplayDate(invoice.invoiceDate)}</CCol>
              </CRow>
            </div>

            {/* Billed By / Billed To */}
            <CRow className="g-3 mb-4">
              <CCol md={6}>
                <div className="p-3 border rounded" style={{ backgroundColor: '#f8f7fc' }}>
                  <h6 style={{ color: '#5b3e96' }}>Billed By</h6>
                  {supplier.companyLogo && <img src={supplier.companyLogo} alt="Company Logo" style={{ maxHeight: 50, marginBottom: 8 }} />}
                  <p className="mb-1"><strong>{supplier.companyName}</strong></p>
                  <p className="mb-1 small">{supplier.address}{supplier.city ? `, ${supplier.city}` : ''}{supplier.state ? `, ${supplier.state}` : ''} {supplier.pincode}</p>
                  {supplier.gstin && <p className="mb-1 small"><strong>GSTIN:</strong> {supplier.gstin}</p>}
                  {supplier.pan && <p className="mb-1 small"><strong>PAN:</strong> {supplier.pan}</p>}
                  {supplier.fssai && <p className="mb-1 small"><strong>FSSAI:</strong> {supplier.fssai}</p>}
                </div>
              </CCol>
              <CCol md={6}>
                <div className="p-3 border rounded" style={{ backgroundColor: '#f8f7fc' }}>
                  <h6 style={{ color: '#5b3e96' }}>Billed To</h6>
                  {hotel.hotelLogo && <img src={hotel.hotelLogo} alt="Hotel Logo" style={{ maxHeight: 50, marginBottom: 8 }} />}
                  <p className="mb-1"><strong>{hotel.hotelName}</strong></p>
                  <p className="mb-1 small">{hotel.address}{hotel.city ? `, ${hotel.city}` : ''}{hotel.state ? `, ${hotel.state}` : ''} {hotel.pincode}</p>
                  {hotel.gstin && <p className="mb-1 small"><strong>GSTIN:</strong> {hotel.gstin}</p>}
                  {hotel.pan && <p className="mb-1 small"><strong>PAN:</strong> {hotel.pan}</p>}
                  {hotel.fssai && <p className="mb-1 small"><strong>FSSAI:</strong> {hotel.fssai}</p>}
                </div>
              </CCol>
            </CRow>

            {/* Items Table */}
            <CTable bordered small className="mb-3">
              <CTableHead>
                <CTableRow style={{ backgroundColor: '#5b3e96', color: 'white' }}>
                  <CTableHeaderCell style={{ width: 40 }}>#</CTableHeaderCell>
                  <CTableHeaderCell>Item</CTableHeaderCell>
                  <CTableHeaderCell>Delivered On</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Qty</CTableHeaderCell>
                  <CTableHeaderCell>Unit</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Rate</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">IGST</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                  <CTableHeaderCell>Delivery Time</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {invoice.items.map((item, idx) => (
                  <CTableRow key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f8f7fc' : 'white' }}>
                    <CTableDataCell>{idx + 1}</CTableDataCell>
                    <CTableDataCell>
                      <strong>{item.productNameSnapshot.toUpperCase()}</strong>
                      {item.rateOverridden && <span className="ms-1 text-warning" title={item.rateOverrideReason}>⚠️</span>}
                    </CTableDataCell>
                    <CTableDataCell>{formatDisplayDate(item.deliveryDate)}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {isWeightUnit(item.unit) ? (item.quantityGrams / 1000) : item.quantity}
                    </CTableDataCell>
                    <CTableDataCell>{item.unit}</CTableDataCell>
                    <CTableDataCell className="text-end">{formatCurrency(item.finalBillingRate)}</CTableDataCell>
                    <CTableDataCell className="text-end">{formatCurrency(item.igstAmount)}</CTableDataCell>
                    <CTableDataCell className="text-end"><strong>{formatCurrency(item.lineTotal)}</strong></CTableDataCell>
                    <CTableDataCell>{item.deliveryTime || '—'}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            {/* Total in words */}
            <div className="p-2 bg-light rounded mb-3 small">
              <strong>Total (in words):</strong> {invoice.totalInWords}
            </div>

            {/* UPI */}
            {invoice.payment.upiId && (
              <div className="text-center mb-3 p-3 border rounded">
                <strong>Scan to pay via UPI</strong>
                {invoice.payment.upiQrUrl && (
                  <div className="my-2"><img src={invoice.payment.upiQrUrl} alt="UPI QR" style={{ maxWidth: 150 }} /></div>
                )}
                <p className="mb-0 small">UPI ID: <strong>{invoice.payment.upiId}</strong></p>
              </div>
            )}

            {/* Totals */}
            <CRow>
              <CCol md={{ offset: 7, span: 5 }}>
                <div className="d-flex justify-content-between mb-1"><span>Amount:</span><span>{formatCurrency(invoice.subtotal)}</span></div>
                <div className="d-flex justify-content-between mb-1"><span>IGST:</span><span>{formatCurrency(invoice.tax.taxAmount)}</span></div>
                <hr className="my-1" />
                <div className="d-flex justify-content-between fw-bold fs-5">
                  <span>Total (INR):</span><span className="text-primary">{formatCurrency(invoice.grandTotal)}</span>
                </div>
              </CCol>
            </CRow>

            {/* Terms */}
            {invoice.termsAndConditions && (
              <div className="mt-4 small text-body-secondary">
                <strong>Terms & Conditions:</strong>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>{invoice.termsAndConditions}</pre>
              </div>
            )}
          </div>
        </CCardBody>
      </CCard>

      {/* Cancel Modal */}
      <ConfirmDialog
        visible={cancelModal}
        title="Cancel Invoice"
        message="Are you sure you want to cancel this invoice? This action cannot be undone."
        confirmLabel="Cancel Invoice"
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelModal(false)}
      >
        <CFormLabel className="mt-2">Cancellation Reason *</CFormLabel>
        <CFormTextarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Reason for cancellation..." rows={3} />
      </ConfirmDialog>
    </>
  );
};

export default InvoiceViewPage;

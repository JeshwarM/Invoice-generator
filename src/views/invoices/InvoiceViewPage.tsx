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
import InvoiceDocument from '../../components/invoice/InvoiceDocument';

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
      <CCard className="shadow-sm">
        <CCardBody className="p-3 p-md-4 bg-light">
          <div className="bg-white rounded shadow-sm border p-2 p-md-4" style={{ overflowX: 'auto' }}>
            <InvoiceDocument invoice={invoice} id="invoice-document-root" />
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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CCard, CCardBody, CCardHeader, CTable, CTableHead, CTableRow,
  CTableHeaderCell, CTableBody, CTableDataCell, CButton, CFormInput,
  CFormSelect, CRow, CCol, CInputGroup, CInputGroupText,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSearch, cilCloudDownload, cilZoom } from '@coreui/icons';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { getInvoices } from '../../services/invoiceService';
import { formatDisplayDate } from '../../utils/date';
import { formatCurrency } from '../../utils/calculations';
import type { Invoice, InvoiceStatus } from '../../types';

const InvoiceListPage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');

  useEffect(() => {
    const load = async () => {
      try {
        const inv = await getInvoices(
          statusFilter ? { status: statusFilter, hotelName: search || undefined } : { hotelName: search || undefined }
        );
        setInvoices(inv);
      } catch {
        // Error handled silently — empty list shown
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [statusFilter, search]);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <>
      <h4 className="mb-4">Invoices</h4>
      <CCard>
        <CCardHeader>
          <CRow className="align-items-center g-2">
            <CCol md={4}>
              <CInputGroup size="sm">
                <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
                <CFormInput placeholder="Search by invoice # or hotel..." value={search}
                  onChange={(e) => setSearch(e.target.value)} />
              </CInputGroup>
            </CCol>
            <CCol md={3}>
              <CFormSelect size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}>
                <option value="">All Statuses</option>
                <option value="finalized">Finalized</option>
                <option value="cancelled">Cancelled</option>
              </CFormSelect>
            </CCol>
            <CCol md={5} className="text-end">
              <CButton color="primary" size="sm" onClick={() => navigate('/billing')}>Create New Bill</CButton>
            </CCol>
          </CRow>
        </CCardHeader>
        <CCardBody>
          {invoices.length === 0 ? (
            <EmptyState title="No invoices found" message="No invoices match your search criteria."
              actionLabel="Create Bill" onAction={() => navigate('/billing')} />
          ) : (
            <div className="table-responsive">
              <CTable hover align="middle">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Invoice Number</CTableHeaderCell>
                    <CTableHeaderCell>Hotel</CTableHeaderCell>
                    <CTableHeaderCell>Invoice Date</CTableHeaderCell>
                    <CTableHeaderCell>Delivery Date</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
                    <CTableHeaderCell>Created By</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {invoices.map((inv) => (
                    <CTableRow key={inv.id}>
                      <CTableDataCell><strong>{inv.invoiceNumber}</strong></CTableDataCell>
                      <CTableDataCell>{inv.hotelSnapshot.hotelName}</CTableDataCell>
                      <CTableDataCell>{formatDisplayDate(inv.invoiceDate)}</CTableDataCell>
                      <CTableDataCell>{formatDisplayDate(inv.deliveryDate)}</CTableDataCell>
                      <CTableDataCell className="text-end">{formatCurrency(inv.grandTotal)}</CTableDataCell>
                      <CTableDataCell>{inv.createdByName}</CTableDataCell>
                      <CTableDataCell><StatusBadge status={inv.status} /></CTableDataCell>
                      <CTableDataCell>
                        <CButton color="primary" variant="ghost" size="sm" className="me-1"
                          onClick={() => navigate(`/invoices/${inv.id}`)} title="View">
                          <CIcon icon={cilZoom} />
                        </CButton>
                        <CButton color="success" variant="ghost" size="sm" title="Download PDF"
                          onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <CIcon icon={cilCloudDownload} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  );
};

export default InvoiceListPage;

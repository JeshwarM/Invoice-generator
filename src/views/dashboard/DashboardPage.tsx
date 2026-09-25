import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CRow, CCol, CCard, CCardBody, CCardHeader, CTable, CTableHead,
  CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CButton,
  CAlert,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilZoom, cilCloudDownload, cilWarning } from '@coreui/icons';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { getHotels } from '../../services/hotelService';
import { getActiveContracts, getExpiringContracts } from '../../services/contractService';
import { getInvoices, getInvoiceCountThisMonth, getTotalBillingThisMonth } from '../../services/invoiceService';
import { getPendingRequestCount } from '../../services/employeeService';
import { formatDisplayDate, daysUntil, formatDaysRemaining } from '../../utils/date';
import { formatCurrency } from '../../utils/calculations';
import type { Invoice, Contract } from '../../types';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isController } = useAuth();
  const [loading, setLoading] = useState(true);

  // KPI data
  const [activeHotels, setActiveHotels] = useState(0);
  const [activeContracts, setActiveContracts] = useState(0);
  const [invoicesThisMonth, setInvoicesThisMonth] = useState(0);
  const [totalBilling, setTotalBilling] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [hotels, contracts, invCount, billing, invoices, expiring] = await Promise.all([
          getHotels(true),
          getActiveContracts(),
          getInvoiceCountThisMonth(),
          getTotalBillingThisMonth(),
          getInvoices(),
          getExpiringContracts(30),
        ]);
        setActiveHotels(hotels.length);
        setActiveContracts(contracts.length);
        setInvoicesThisMonth(invCount);
        setTotalBilling(billing);
        setRecentInvoices(invoices.slice(0, 10));
        setExpiringContracts(expiring);

        if (isController) {
          const pending = await getPendingRequestCount();
          setPendingRequests(pending);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isController]);

  if (loading) return <LoadingSpinner fullPage message="Loading dashboard..." />;

  return (
    <>
      <h4 className="mb-4">Dashboard</h4>

      {/* KPI Cards */}
      <CRow>
        <CCol sm={6} lg={3}>
          <CCard className="mb-4 border-top-primary border-top-3" style={{ cursor: 'pointer' }} onClick={() => navigate('/hotels')}>
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold mb-1">Active Hotels</div>
              <div className="fs-4 fw-bold">{activeHotels}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={3}>
          <CCard className="mb-4 border-top-success border-top-3" style={{ cursor: 'pointer' }} onClick={() => navigate('/contracts')}>
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold mb-1">Active Contracts</div>
              <div className="fs-4 fw-bold">{activeContracts}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={3}>
          <CCard className="mb-4 border-top-warning border-top-3" style={{ cursor: 'pointer' }} onClick={() => navigate('/invoices')}>
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold mb-1">Invoices This Month</div>
              <div className="fs-4 fw-bold">{invoicesThisMonth}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={3}>
          <CCard className="mb-4 border-top-danger border-top-3">
            <CCardBody>
              <div className="text-body-secondary small text-uppercase fw-semibold mb-1">Total Billing This Month</div>
              <div className="fs-4 fw-bold">{formatCurrency(totalBilling)}</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Controller: Pending Requests */}
      {isController && pendingRequests > 0 && (
        <CAlert color="warning" className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <CIcon icon={cilWarning} className="me-2" />
            <strong>{pendingRequests}</strong> pending employee access request{pendingRequests > 1 ? 's' : ''}.
          </div>
          <CButton color="warning" size="sm" onClick={() => navigate('/employees')}>View Requests</CButton>
        </CAlert>
      )}

      {/* Contract Expiry Alerts */}
      {expiringContracts.length > 0 && (
        <CCard className="mb-4">
          <CCardHeader className="bg-warning-subtle">
            <strong>⚠️ Contract Expiry Alerts</strong>
          </CCardHeader>
          <CCardBody>
            {expiringContracts.map((c) => (
              <CAlert key={c.id} color="warning" className="mb-2">
                Contract for <strong>{c.hotelName}</strong> ({c.contractNumber}) — {formatDaysRemaining(daysUntil(c.endDate))}
              </CAlert>
            ))}
          </CCardBody>
        </CCard>
      )}

      {/* Recent Invoices */}
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Recent Invoices</strong>
          <CButton color="primary" size="sm" onClick={() => navigate('/invoices')}>View All</CButton>
        </CCardHeader>
        <CCardBody>
          {recentInvoices.length === 0 ? (
            <p className="text-body-secondary text-center py-3">No invoices generated yet.</p>
          ) : (
            <div className="table-responsive">
              <CTable hover align="middle" small>
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
                  {recentInvoices.map((inv) => (
                    <CTableRow key={inv.id}>
                      <CTableDataCell><strong>{inv.invoiceNumber}</strong></CTableDataCell>
                      <CTableDataCell>{inv.hotelSnapshot.hotelName}</CTableDataCell>
                      <CTableDataCell>{formatDisplayDate(inv.invoiceDate)}</CTableDataCell>
                      <CTableDataCell>{formatDisplayDate(inv.deliveryDate)}</CTableDataCell>
                      <CTableDataCell className="text-end">{formatCurrency(inv.grandTotal)}</CTableDataCell>
                      <CTableDataCell>{inv.createdByName}</CTableDataCell>
                      <CTableDataCell><StatusBadge status={inv.status} /></CTableDataCell>
                      <CTableDataCell>
                        <CButton color="primary" variant="ghost" size="sm" onClick={() => navigate(`/invoices/${inv.id}`)}><CIcon icon={cilZoom} /></CButton>
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

export default DashboardPage;

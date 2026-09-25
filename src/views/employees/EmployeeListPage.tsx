import React, { useState, useEffect } from 'react';
import {
  CCard, CCardBody, CCardHeader, CTable, CTableHead, CTableRow,
  CTableHeaderCell, CTableBody, CTableDataCell, CButton, CRow, CCol,
  CFormSelect, CNav, CNavItem, CNavLink, CTabContent, CTabPane,
  CFormTextarea, CFormLabel,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilXCircle, cilBan, cilReload } from '@coreui/icons';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getAccessRequests, approveAccessRequest, rejectAccessRequest, getUsers, updateUserStatus } from '../../services/employeeService';
import { createAuditLog } from '../../services/auditService';
import { formatDisplayDate } from '../../utils/date';
import type { AccessRequest, User } from '../../types';

const EmployeeListPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState(1);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Disable confirm
  const [disableConfirm, setDisableConfirm] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [reqs, usrs] = await Promise.all([getAccessRequests(), getUsers()]);
        setRequests(reqs);
        setUsers(usrs);
      } catch {
        addToast('error', 'Error', 'Failed to load employee data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  const handleApprove = async (requestId: string, name: string, email: string) => {
    setActionLoading(true);
    try {
      await approveAccessRequest(requestId, userProfile?.uid || '');
      await createAuditLog('employee_approved', 'user', requestId, userProfile?.uid || '', userProfile?.name || '', { name, email });
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: 'approved' as const } : r));
      addToast('success', 'Approved', `Access approved for ${name}. They will receive an invitation email.`);
    } catch {
      addToast('error', 'Error', 'Failed to approve access request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(true);
    try {
      const req = requests.find((r) => r.id === rejectModal);
      await rejectAccessRequest(rejectModal, userProfile?.uid || '', rejectReason);
      await createAuditLog('employee_rejected', 'user', rejectModal, userProfile?.uid || '', userProfile?.name || '', { name: req?.name, reason: rejectReason });
      setRequests((prev) => prev.map((r) => r.id === rejectModal ? { ...r, status: 'rejected' as const } : r));
      addToast('info', 'Rejected', 'Access request rejected.');
    } catch {
      addToast('error', 'Error', 'Failed to reject request.');
    } finally {
      setActionLoading(false);
      setRejectModal(null);
      setRejectReason('');
    }
  };

  const handleDisable = async () => {
    if (!disableConfirm) return;
    setActionLoading(true);
    try {
      await updateUserStatus(disableConfirm, 'disabled');
      await createAuditLog('employee_disabled', 'user', disableConfirm, userProfile?.uid || '', userProfile?.name || '', {});
      setUsers((prev) => prev.map((u) => u.uid === disableConfirm ? { ...u, status: 'disabled' as const } : u));
      addToast('info', 'Disabled', 'Employee account disabled.');
    } catch {
      addToast('error', 'Error', 'Failed to disable employee.');
    } finally {
      setActionLoading(false);
      setDisableConfirm(null);
    }
  };

  const handleReactivate = async (uid: string) => {
    setActionLoading(true);
    try {
      await updateUserStatus(uid, 'active');
      await createAuditLog('employee_reactivated', 'user', uid, userProfile?.uid || '', userProfile?.name || '', {});
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, status: 'active' as const } : u));
      addToast('success', 'Reactivated', 'Employee account reactivated.');
    } catch {
      addToast('error', 'Error', 'Failed to reactivate employee.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const employees = users.filter((u) => u.role !== 'controller');

  return (
    <>
      <h4 className="mb-4">Employee Management</h4>
      <CNav variant="tabs" className="mb-3">
        <CNavItem><CNavLink active={activeTab === 1} onClick={() => setActiveTab(1)}>
          Access Requests {pendingRequests.length > 0 && <span className="badge bg-warning ms-1">{pendingRequests.length}</span>}
        </CNavLink></CNavItem>
        <CNavItem><CNavLink active={activeTab === 2} onClick={() => setActiveTab(2)}>Employees</CNavLink></CNavItem>
      </CNav>

      <CTabContent>
        <CTabPane visible={activeTab === 1}>
          <CCard>
            <CCardHeader><strong>Pending Access Requests</strong></CCardHeader>
            <CCardBody>
              {pendingRequests.length === 0 ? (
                <EmptyState title="No pending requests" message="All access requests have been processed." />
              ) : (
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Email</CTableHeaderCell>
                      <CTableHeaderCell>Request Date</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {pendingRequests.map((req) => (
                      <CTableRow key={req.id}>
                        <CTableDataCell><strong>{req.name}</strong></CTableDataCell>
                        <CTableDataCell>{req.email}</CTableDataCell>
                        <CTableDataCell>{formatDisplayDate(req.requestedAt)}</CTableDataCell>
                        <CTableDataCell><StatusBadge status={req.status} /></CTableDataCell>
                        <CTableDataCell>
                          <CButton color="success" size="sm" className="me-1" disabled={actionLoading}
                            onClick={() => handleApprove(req.id, req.name, req.email)}>
                            <CIcon icon={cilCheckCircle} className="me-1" />Approve
                          </CButton>
                          <CButton color="danger" size="sm" disabled={actionLoading}
                            onClick={() => setRejectModal(req.id)}>
                            <CIcon icon={cilXCircle} className="me-1" />Reject
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CTabPane>

        <CTabPane visible={activeTab === 2}>
          <CCard>
            <CCardHeader><strong>All Employees</strong></CCardHeader>
            <CCardBody>
              {employees.length === 0 ? (
                <EmptyState title="No employees" message="No employee accounts found." />
              ) : (
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Email</CTableHeaderCell>
                      <CTableHeaderCell>Role</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Last Login</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {employees.map((user) => (
                      <CTableRow key={user.uid}>
                        <CTableDataCell><strong>{user.name}</strong></CTableDataCell>
                        <CTableDataCell>{user.email}</CTableDataCell>
                        <CTableDataCell>{user.role}</CTableDataCell>
                        <CTableDataCell><StatusBadge status={user.status} /></CTableDataCell>
                        <CTableDataCell>{user.lastLoginAt ? formatDisplayDate(user.lastLoginAt) : '—'}</CTableDataCell>
                        <CTableDataCell>
                          {user.status === 'active' && (
                            <CButton color="warning" size="sm" disabled={actionLoading}
                              onClick={() => setDisableConfirm(user.uid)}>
                              <CIcon icon={cilBan} className="me-1" />Disable
                            </CButton>
                          )}
                          {user.status === 'disabled' && (
                            <CButton color="success" size="sm" disabled={actionLoading}
                              onClick={() => handleReactivate(user.uid)}>
                              <CIcon icon={cilReload} className="me-1" />Reactivate
                            </CButton>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CTabPane>
      </CTabContent>

      {/* Reject Modal */}
      <ConfirmDialog
        visible={!!rejectModal}
        title="Reject Access Request"
        message="Are you sure you want to reject this access request?"
        confirmLabel="Reject"
        loading={actionLoading}
        onConfirm={handleReject}
        onCancel={() => { setRejectModal(null); setRejectReason(''); }}
      >
        <CFormLabel className="mt-2">Reason (optional)</CFormLabel>
        <CFormTextarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
      </ConfirmDialog>

      {/* Disable Confirm */}
      <ConfirmDialog
        visible={!!disableConfirm}
        title="Disable Employee"
        message="Are you sure you want to disable this employee? They will be unable to access the application."
        confirmLabel="Disable"
        loading={actionLoading}
        onConfirm={handleDisable}
        onCancel={() => setDisableConfirm(null)}
      />
    </>
  );
};

export default EmployeeListPage;

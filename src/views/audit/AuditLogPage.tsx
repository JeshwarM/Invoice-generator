import React, { useState, useEffect } from 'react';
import {
  CCard, CCardBody, CCardHeader, CTable, CTableHead, CTableRow,
  CTableHeaderCell, CTableBody, CTableDataCell, CBadge,
} from '@coreui/react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { getAuditLogs } from '../../services/auditService';
import { formatDisplayDate } from '../../utils/date';

const actionLabels: Record<string, { label: string; color: string }> = {
  employee_approved: { label: 'Employee Approved', color: 'success' },
  employee_rejected: { label: 'Employee Rejected', color: 'danger' },
  employee_disabled: { label: 'Employee Disabled', color: 'warning' },
  employee_reactivated: { label: 'Employee Reactivated', color: 'info' },
  hotel_created: { label: 'Hotel Created', color: 'primary' },
  hotel_edited: { label: 'Hotel Edited', color: 'info' },
  product_created: { label: 'Product Created', color: 'primary' },
  product_edited: { label: 'Product Edited', color: 'info' },
  contract_created: { label: 'Contract Created', color: 'primary' },
  contract_edited: { label: 'Contract Edited', color: 'info' },
  contract_renewed: { label: 'Contract Renewed', color: 'success' },
  rate_overridden: { label: 'Rate Overridden', color: 'warning' },
  draft_created: { label: 'Draft Created', color: 'secondary' },
  draft_updated: { label: 'Draft Updated', color: 'secondary' },
  invoice_finalized: { label: 'Invoice Finalized', color: 'success' },
  invoice_cancelled: { label: 'Invoice Cancelled', color: 'danger' },
  settings_changed: { label: 'Settings Changed', color: 'info' },
};

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAuditLogs(200);
        setLogs(data);
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <>
      <h4 className="mb-4">Audit Logs</h4>
      <CCard>
        <CCardHeader><strong>Recent Activity</strong></CCardHeader>
        <CCardBody>
          {logs.length === 0 ? (
            <EmptyState title="No audit logs" message="No activity has been recorded yet." />
          ) : (
            <div className="table-responsive">
              <CTable hover small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Timestamp</CTableHeaderCell>
                    <CTableHeaderCell>Action</CTableHeaderCell>
                    <CTableHeaderCell>Entity</CTableHeaderCell>
                    <CTableHeaderCell>Performed By</CTableHeaderCell>
                    <CTableHeaderCell>Details</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {logs.map((log) => {
                    const action = actionLabels[log.action as string] || { label: log.action as string, color: 'secondary' };
                    return (
                      <CTableRow key={log.id as string}>
                        <CTableDataCell className="small">
                          {log.timestamp instanceof Date ? formatDisplayDate(log.timestamp) : String(log.timestamp)}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={action.color} shape="rounded-pill">{action.label}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="small">
                          {String(log.entityType || '')} / {String(log.entityId || '').substring(0, 8)}...
                        </CTableDataCell>
                        <CTableDataCell className="small">{String(log.performedByName || '')}</CTableDataCell>
                        <CTableDataCell className="small">
                          {log.metadata ? (
                            <code className="small">{JSON.stringify(log.metadata, null, 0).substring(0, 100)}</code>
                          ) : '—'}
                        </CTableDataCell>
                      </CTableRow>
                    );
                  })}
                </CTableBody>
              </CTable>
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  );
};

export default AuditLogPage;

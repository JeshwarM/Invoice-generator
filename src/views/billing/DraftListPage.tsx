import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CCard, CCardBody, CCardHeader, CTable, CTableHead, CTableRow,
  CTableHeaderCell, CTableBody, CTableDataCell, CButton,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash } from '@coreui/icons';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getDrafts, deleteDraft } from '../../services/draftService';
import { formatDisplayDate } from '../../utils/date';
import { formatCurrency } from '../../utils/calculations';
import type { DraftBill } from '../../types';

const DraftListPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, isController } = useAuth();
  const { addToast } = useToast();
  const [drafts, setDrafts] = useState<DraftBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const d = isController ? await getDrafts() : await getDrafts(userProfile?.uid);
        setDrafts(d);
      } catch {
        addToast('error', 'Error', 'Failed to load draft bills.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userProfile, isController, addToast]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteDraft(deleteConfirm);
      setDrafts((prev) => prev.filter((d) => d.id !== deleteConfirm));
      addToast('success', 'Deleted', 'Draft bill deleted.');
    } catch {
      addToast('error', 'Error', 'Failed to delete draft.');
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <>
      <h4 className="mb-4">Draft Bills</h4>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Saved Drafts</strong>
          <CButton color="primary" size="sm" onClick={() => navigate('/billing')}>Create New Bill</CButton>
        </CCardHeader>
        <CCardBody>
          {drafts.length === 0 ? (
            <EmptyState title="No draft bills" message="No saved draft bills found." actionLabel="Create Bill" onAction={() => navigate('/billing')} />
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Hotel</CTableHeaderCell>
                  <CTableHeaderCell>Contract</CTableHeaderCell>
                  <CTableHeaderCell>Delivery Date</CTableHeaderCell>
                  <CTableHeaderCell>Items</CTableHeaderCell>
                  <CTableHeaderCell>Total</CTableHeaderCell>
                  <CTableHeaderCell>Last Updated</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {drafts.map((draft) => (
                  <CTableRow key={draft.id}>
                    <CTableDataCell>{draft.hotelName}</CTableDataCell>
                    <CTableDataCell>{draft.contractNumber}</CTableDataCell>
                    <CTableDataCell>{formatDisplayDate(draft.deliveryDate)}</CTableDataCell>
                    <CTableDataCell>{draft.items.length}</CTableDataCell>
                    <CTableDataCell>{formatCurrency(draft.grandTotal)}</CTableDataCell>
                    <CTableDataCell>{formatDisplayDate(draft.updatedAt)}</CTableDataCell>
                    <CTableDataCell>
                      <CButton color="primary" variant="ghost" size="sm" className="me-1" title="Continue editing"
                        onClick={() => navigate(`/billing?draft=${draft.id}`)}>
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton color="danger" variant="ghost" size="sm" title="Delete" onClick={() => setDeleteConfirm(draft.id)}>
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
      <ConfirmDialog
        visible={!!deleteConfirm}
        title="Delete Draft"
        message="Are you sure you want to delete this draft bill?"
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
};

export default DraftListPage;

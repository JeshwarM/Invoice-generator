import React from 'react';
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton } from '@coreui/react';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'danger',
  loading = false,
  onConfirm,
  onCancel,
  children,
}) => {
  return (
    <CModal visible={visible} onClose={onCancel} alignment="center">
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p>{message}</p>
        {children}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </CButton>
        <CButton color={confirmColor} onClick={onConfirm} disabled={loading}>
          {loading ? 'Processing...' : confirmLabel}
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default ConfirmDialog;

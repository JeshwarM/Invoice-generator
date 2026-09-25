import React from 'react';
import { CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus } from '@coreui/icons';

interface EmptyStateProps {
  icon?: string[];
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, message, actionLabel, onAction }) => {
  return (
    <div className="text-center py-5">
      <div className="mb-3">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light"
          style={{ width: 80, height: 80 }}
        >
          <span style={{ fontSize: '2rem' }}>📋</span>
        </div>
      </div>
      <h5 className="text-body-secondary">{title}</h5>
      <p className="text-body-secondary mb-3">{message}</p>
      {actionLabel && onAction && (
        <CButton color="primary" onClick={onAction}>
          <CIcon icon={cilPlus} className="me-1" />
          {actionLabel}
        </CButton>
      )}
    </div>
  );
};

export default EmptyState;

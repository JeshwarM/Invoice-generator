import React from 'react';
import { CBadge } from '@coreui/react';

type StatusType = 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'disabled' |
  'draft' | 'finalized' | 'cancelled' | 'expired' | 'renewed';

const statusConfig: Record<StatusType, { color: string; label: string }> = {
  active: { color: 'success', label: 'Active' },
  inactive: { color: 'secondary', label: 'Inactive' },
  pending: { color: 'warning', label: 'Pending' },
  approved: { color: 'success', label: 'Approved' },
  rejected: { color: 'danger', label: 'Rejected' },
  disabled: { color: 'dark', label: 'Disabled' },
  draft: { color: 'info', label: 'Draft' },
  finalized: { color: 'success', label: 'Finalized' },
  cancelled: { color: 'danger', label: 'Cancelled' },
  expired: { color: 'secondary', label: 'Expired' },
  renewed: { color: 'primary', label: 'Renewed' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | undefined;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size }) => {
  const config = statusConfig[status as StatusType] || { color: 'secondary', label: status };
  return (
    <CBadge color={config.color} shape="rounded-pill" size={size}>
      {config.label}
    </CBadge>
  );
};

export default StatusBadge;

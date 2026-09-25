import React from 'react';
import { CToaster, CToast, CToastHeader, CToastBody, CCloseButton } from '@coreui/react';
import { useToast } from '../../context/ToastContext';

const typeColors: Record<string, string> = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'info',
};

const AppToaster: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <CToaster className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999 }}>
      {toasts.map((toast) => (
        <CToast key={toast.id} visible color={typeColors[toast.type]} className="text-white">
          <CToastHeader className="d-flex justify-content-between">
            <strong>{toast.title}</strong>
            <CCloseButton className="ms-2" white onClick={() => removeToast(toast.id)} />
          </CToastHeader>
          <CToastBody>{toast.message}</CToastBody>
        </CToast>
      ))}
    </CToaster>
  );
};

export default AppToaster;

import React from 'react';
import { CSpinner } from '@coreui/react';

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...', fullPage = false }) => {
  if (fullPage) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <CSpinner color="primary" className="mb-3" />
        <p className="text-body-secondary">{message}</p>
      </div>
    );
  }
  return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <CSpinner color="primary" size="sm" className="me-2" />
      <span className="text-body-secondary">{message}</span>
    </div>
  );
};

export default LoadingSpinner;

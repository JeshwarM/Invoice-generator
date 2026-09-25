import React from 'react';
import { CFooter } from '@coreui/react';

const AppFooter: React.FC = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span className="fw-semibold">AgroBill</span>
        <span className="ms-1">&copy; {new Date().getFullYear()}</span>
      </div>
      <div className="ms-auto">
        <span className="text-body-secondary">Enterprise Billing &amp; Invoice Management</span>
      </div>
    </CFooter>
  );
};

export default AppFooter;

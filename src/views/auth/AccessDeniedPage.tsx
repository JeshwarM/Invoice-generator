import React from 'react';
import { Link } from 'react-router-dom';
import { CContainer, CRow, CCol, CCard, CCardBody, CButton } from '@coreui/react';

const AccessDeniedPage: React.FC = () => {
  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6}>
            <CCard className="p-4">
              <CCardBody className="text-center">
                <div className="mb-3" style={{ fontSize: '4rem' }}>🚫</div>
                <h2>Access Denied</h2>
                <p className="text-body-secondary mb-4">
                  You don't have permission to access this page. Please contact the administrator
                  if you believe this is an error.
                </p>
                <Link to="/dashboard">
                  <CButton color="primary">Go to Dashboard</CButton>
                </Link>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default AccessDeniedPage;

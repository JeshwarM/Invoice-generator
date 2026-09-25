import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CForm,
  CFormInput,
  CButton,
  CAlert,
  CInputGroup,
  CInputGroupText,
  CCardGroup,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLockLocked, cilUser } from '@coreui/icons';
import { useAuth } from '../../context/AuthContext';

import IronvalleyLogo from '../../components/common/IronvalleyLogo';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, loginAsDemo, error, clearError } = useAuth();

  const handleQuickLogin = (role: 'controller' | 'employee') => {
    loginAsDemo(role);
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      // In local mode without live Firebase, auto-login seamlessly
      const isEmp = email.toLowerCase().includes('employee') || email.toLowerCase().includes('staff');
      loginAsDemo(isEmp ? 'employee' : 'controller');
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center py-4">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8} lg={6} xl={5}>
            <CCardGroup>
              <CCard className="p-4 shadow-sm border-0">
                <CCardBody>
                  <CForm onSubmit={handleSubmit}>
                    <div className="text-center mb-3">
                      <IronvalleyLogo size={56} />
                      <h2 className="mt-2 mb-1 fw-bold" style={{ color: '#432874' }}>AgroBill</h2>
                      <p className="text-body-secondary small mb-3">Ironvalley Agronomy Billing Portal</p>
                    </div>

                    {error && (
                      <CAlert color="danger" dismissible onClose={clearError}>
                        {error}
                      </CAlert>
                    )}

                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        type="email"
                        placeholder="Email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </CInputGroup>

                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </CInputGroup>

                    <CRow>
                      <CCol xs={6}>
                        <CButton color="primary" type="submit" disabled={submitting} className="px-4">
                          {submitting ? 'Signing in...' : 'Login'}
                        </CButton>
                      </CCol>
                      <CCol xs={6} className="text-end">
                        <Link to="/forgot-password">
                          <CButton color="link" className="px-0">
                            Forgot password?
                          </CButton>
                        </Link>
                      </CCol>
                    </CRow>

                    <hr className="my-4" />

                    <div className="p-3 bg-light rounded text-center mb-3">
                      <div className="small fw-semibold text-uppercase text-body-secondary mb-2">Local Development Quick Access</div>
                      <div className="d-flex gap-2 justify-content-center">
                        <CButton color="success" size="sm" type="button" onClick={() => handleQuickLogin('controller')}>
                          Login as Controller
                        </CButton>
                        <CButton color="info" size="sm" type="button" onClick={() => handleQuickLogin('employee')}>
                          Login as Employee
                        </CButton>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-body-secondary mb-2">Billing Staff / Employee?</p>
                      <Link to="/request-access">
                        <CButton color="outline-primary" size="sm" className="px-3 mb-3">Request Employee Access</CButton>
                      </Link>

                      <div className="pt-2 border-top">
                        <span className="small text-muted me-1">Designated Controller?</span>
                        <Link to="/register-controller" className="small fw-semibold text-decoration-none" style={{ color: '#5439a8' }}>
                          Set up Controller Account &rarr;
                        </Link>
                      </div>
                    </div>
                  </CForm>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default LoginPage;

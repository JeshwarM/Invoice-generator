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
  CBadge,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilEnvelopeClosed, cilLockLocked, cilCheckCircle } from '@coreui/icons';
import { useAuth } from '../../context/AuthContext';
import IronvalleyLogo from '../../components/common/IronvalleyLogo';

const ActivateAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { activateEmployee, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim()) {
      setFormError('Please enter your approved email address.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await activateEmployee(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Account activation failed.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const currentError = formError || authError;

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center py-4">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8} lg={6} xl={5}>
            <CCard className="p-4 shadow-sm border-0">
              <CCardBody>
                <div className="text-center mb-4">
                  <div className="d-flex justify-content-center mb-3">
                    <IronvalleyLogo size={70} />
                  </div>
                  <h3 className="mb-1 fw-bold" style={{ color: '#432874' }}>AgroBill</h3>
                  <div className="d-flex justify-content-center align-items-center gap-1 mt-2">
                    <CIcon icon={cilCheckCircle} className="text-success" />
                    <CBadge color="success" className="px-2 py-1">
                      Staff Account Activation
                    </CBadge>
                  </div>
                  <p className="text-body-secondary small mt-2 mb-3">
                    Once your access request has been approved by the Administrator, set your password below to activate your account.
                  </p>
                </div>

                {currentError && (
                  <CAlert color="danger" dismissible onClose={() => { setFormError(null); clearError(); }}>
                    {currentError}
                  </CAlert>
                )}

                <CForm onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Approved Staff Email</label>
                    <CInputGroup>
                      <CInputGroupText><CIcon icon={cilEnvelopeClosed} /></CInputGroupText>
                      <CFormInput
                        type="email"
                        placeholder="e.g. employee@ironvalleyagro.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </CInputGroup>
                    <div className="form-text small text-muted">
                      Must match the email approved by the Administrator.
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Create Password</label>
                    <CInputGroup>
                      <CInputGroupText><CIcon icon={cilLockLocked} /></CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </CInputGroup>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-semibold text-secondary">Confirm Password</label>
                    <CInputGroup>
                      <CInputGroupText><CIcon icon={cilLockLocked} /></CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </CInputGroup>
                  </div>

                  <CButton
                    color="primary"
                    type="submit"
                    className="w-100 py-2 fw-semibold"
                    style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
                    disabled={submitting}
                  >
                    {submitting ? 'Activating Account...' : 'Set Password & Activate'}
                  </CButton>

                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                    <Link to="/request-access" className="small text-decoration-none">
                      &larr; Request Access
                    </Link>
                    <Link to="/login" className="small fw-semibold text-decoration-none">
                      Already active? Sign In
                    </Link>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default ActivateAccountPage;

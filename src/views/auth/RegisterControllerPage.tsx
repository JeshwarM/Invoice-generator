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
import { cilUser, cilEnvelopeClosed, cilLockLocked, cilShieldAlt } from '@coreui/icons';
import { useAuth } from '../../context/AuthContext';
import { isDesignatedControllerEmail, DESIGNATED_CONTROLLER_EMAILS } from '../../config/authConfig';
import IronvalleyLogo from '../../components/common/IronvalleyLogo';

const RegisterControllerPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerController, error: authError, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    if (!isDesignatedControllerEmail(email)) {
      setFormError(
        'This email address is not in the Authorized Controller Whitelist. Only designated controllers can register directly. If you are a staff member, please use Request Access.'
      );
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
      await registerController(name.trim(), email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
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
                    <CIcon icon={cilShieldAlt} className="text-warning" />
                    <CBadge color="warning" className="text-dark px-2 py-1">
                      Controller / Admin Setup
                    </CBadge>
                  </div>
                  <p className="text-body-secondary small mt-2 mb-3">
                    Direct account setup for designated controllers and business owners.
                  </p>
                </div>

                {currentError && (
                  <CAlert color="danger" dismissible onClose={() => { setFormError(null); clearError(); }}>
                    {currentError}
                  </CAlert>
                )}

                <CForm onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Full Name</label>
                    <CInputGroup>
                      <CInputGroupText><CIcon icon={cilUser} /></CInputGroupText>
                      <CFormInput
                        type="text"
                        placeholder="e.g. Jeshwar M (Admin)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </CInputGroup>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Authorized Controller Email</label>
                    <CInputGroup>
                      <CInputGroupText><CIcon icon={cilEnvelopeClosed} /></CInputGroupText>
                      <CFormInput
                        type="email"
                        placeholder="e.g. info@ironvalleyagro.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </CInputGroup>
                    <div className="form-text small text-muted">
                      Must match one of the designated admin emails.
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
                    style={{ backgroundColor: '#5439a8', borderColor: '#5439a8' }}
                    disabled={submitting}
                  >
                    {submitting ? 'Setting up Controller Account...' : 'Set Up Controller Account'}
                  </CButton>

                  <div className="text-center mt-3 pt-2 border-top">
                    <span className="small text-body-secondary me-2">Already have an account?</span>
                    <Link to="/login" className="small fw-semibold text-decoration-none">
                      Sign In
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

export default RegisterControllerPage;

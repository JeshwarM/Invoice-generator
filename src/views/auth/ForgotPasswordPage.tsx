import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilEnvelopeClosed } from '@coreui/icons';
import { useAuth } from '../../context/AuthContext';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
        <CContainer>
          <CRow className="justify-content-center">
            <CCol md={8} lg={6} xl={5}>
              <CCard className="p-4">
                <CCardBody className="text-center">
                  <div className="mb-3" style={{ fontSize: '3rem' }}>📧</div>
                  <h4>Check Your Email</h4>
                  <p className="text-body-secondary mb-4">
                    If an account with that email exists, we've sent a password reset link.
                    Please check your inbox and follow the instructions.
                  </p>
                  <Link to="/login">
                    <CButton color="primary">Back to Login</CButton>
                  </Link>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </CContainer>
      </div>
    );
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8} lg={6} xl={5}>
            <CCard className="p-4">
              <CCardBody>
                <CForm onSubmit={handleSubmit}>
                  <h2 className="mb-1">Reset Password</h2>
                  <p className="text-body-secondary mb-4">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>

                  {error && (
                    <CAlert color="danger" dismissible onClose={() => setError(null)}>
                      {error}
                    </CAlert>
                  )}

                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilEnvelopeClosed} />
                    </CInputGroupText>
                    <CFormInput
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </CInputGroup>

                  <CButton color="primary" type="submit" disabled={submitting} className="w-100 mb-3">
                    {submitting ? 'Sending...' : 'Send Reset Link'}
                  </CButton>

                  <div className="text-center">
                    <Link to="/login">
                      <CButton color="link">Back to Login</CButton>
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

export default ForgotPasswordPage;

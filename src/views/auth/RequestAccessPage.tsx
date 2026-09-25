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
import { cilUser, cilEnvelopeClosed } from '@coreui/icons';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { isValidEmail, isRequired } from '../../utils/validators';

const RequestAccessPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isRequired(name)) {
      setError('Name is required.');
      return;
    }
    if (!isRequired(email) || !isValidEmail(email)) {
      setError('A valid email address is required.');
      return;
    }

    setSubmitting(true);
    try {
      // Check if a request already exists for this email
      const existingQuery = query(
        collection(db, 'accessRequests'),
        where('email', '==', email.toLowerCase().trim())
      );
      const existingSnap = await getDocs(existingQuery);
      if (!existingSnap.empty) {
        const existing = existingSnap.docs[0].data();
        if (existing.status === 'pending') {
          setError('A request with this email is already pending.');
          return;
        }
        if (existing.status === 'approved') {
          setError('This email has already been approved. Please log in.');
          return;
        }
      }

      await addDoc(collection(db, 'accessRequests'), {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        status: 'pending',
        requestedAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
      });
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting access request:', err);
      setError('Failed to submit your request. Please try again.');
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
                  <div className="mb-3" style={{ fontSize: '3rem' }}>✅</div>
                  <h4>Request Submitted</h4>
                  <p className="text-body-secondary mb-4">
                    Your access request has been submitted successfully. You will receive an email
                    when your account is approved by the administrator.
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
                  <h2 className="mb-1">Request Access</h2>
                  <p className="text-body-secondary mb-4">
                    Submit your details to request access to AgroBill.
                  </p>

                  {error && (
                    <CAlert color="danger" dismissible onClose={() => setError(null)}>
                      {error}
                    </CAlert>
                  )}

                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </CInputGroup>

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
                    {submitting ? 'Submitting...' : 'Submit Request'}
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

export default RequestAccessPage;

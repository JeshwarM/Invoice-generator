import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CCol,
  CButton,
  CAlert,
  CFormFeedback,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSave, cilArrowLeft, cilPlus } from '@coreui/icons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getHotel, createHotel, updateHotel, validateLogoFile } from '../../services/hotelService';
import { createAuditLog } from '../../services/auditService';
import { validateHotel } from '../../utils/validators';
import type { Hotel } from '../../types';

const HotelFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    hotelName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    gstin: '',
    pan: '',
    fssai: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHotel = async () => {
      if (!isEditMode || !id) return;

      try {
        const hotel = await getHotel(id);
        if (!hotel) {
          addToast('error', 'Error', 'Hotel not found');
          navigate('/hotels');
          return;
        }
        setFormData({
          hotelName: hotel.hotelName || '',
          contactPerson: hotel.contactPerson || '',
          phone: hotel.phone || '',
          email: hotel.email || '',
          address: hotel.address || '',
          city: hotel.city || '',
          state: hotel.state || '',
          pincode: hotel.pincode || '',
          country: hotel.country || 'India',
          gstin: hotel.gstin || '',
          pan: hotel.pan || '',
          fssai: hotel.fssai || '',
        });
        if (hotel.logoUrl) {
          setLogoPreview(hotel.logoUrl);
        }
      } catch (err: unknown) {
        addToast('error', 'Error', 'Failed to fetch hotel details');
        console.error(err);
        navigate('/hotels');
      } finally {
        setLoading(false);
      }
    };

    fetchHotel();
  }, [id, isEditMode, navigate, addToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateLogoFile(file);
      if (validationError) {
        setErrors((prev) => ({ ...prev, logo: validationError }));
        return;
      }

      setLogoFile(file);
      setErrors((prev) => ({ ...prev, logo: '' }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, proceedToContract: boolean = false) => {
    if (e) e.preventDefault();
    setGlobalError(null);

    const validationList = validateHotel(formData);
    if (validationList.length > 0) {
      const errMap: Record<string, string> = {};
      validationList.forEach((v) => {
        errMap[v.field] = v.message;
      });
      setErrors(errMap);
      return;
    }

    setSubmitting(true);

    try {
      let savedHotelId = id;
      if (isEditMode && id) {
        await updateHotel(id, formData, logoFile || undefined);
        await createAuditLog(
          'hotel_edited',
          'hotel',
          id,
          userProfile?.uid || '',
          userProfile?.name || '',
          { hotelName: formData.hotelName }
        );
        addToast('success', 'Updated', 'Hotel updated successfully');
      } else {
        const newHotelId = await createHotel(formData, userProfile?.uid || '', logoFile || undefined);
        savedHotelId = newHotelId;
        await createAuditLog(
          'hotel_created',
          'hotel',
          newHotelId,
          userProfile?.uid || '',
          userProfile?.name || '',
          { hotelName: formData.hotelName }
        );
        addToast('success', 'Created', 'Hotel created successfully');
      }

      if (proceedToContract && savedHotelId) {
        navigate('/contracts/create', { state: { hotelId: savedHotelId } });
      } else {
        navigate('/hotels');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving the hotel.';
      setGlobalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Loading hotel details..." />;
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <CButton color="link" onClick={() => navigate('/hotels')} className="ps-0">
            <CIcon icon={cilArrowLeft} className="me-1" />Back to Hotels
          </CButton>
          <h4 className="mb-0">{isEditMode ? 'Edit Hotel' : 'Create Hotel'}</h4>
        </div>
      </div>

      {globalError && <CAlert color="danger" dismissible onClose={() => setGlobalError(null)}>{globalError}</CAlert>}

      <CForm onSubmit={handleSubmit}>
        {/* Basic Info */}
        <CCard className="mb-4">
          <CCardHeader><strong>Basic Information</strong></CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Hotel Name *</CFormLabel>
                <CFormInput
                  name="hotelName"
                  value={formData.hotelName}
                  onChange={handleChange}
                  invalid={!!errors.hotelName}
                  disabled={submitting}
                  required
                />
                <CFormFeedback invalid>{errors.hotelName}</CFormFeedback>
              </CCol>

              <CCol md={6}>
                <CFormLabel>Contact Person</CFormLabel>
                <CFormInput
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel>Phone Number</CFormLabel>
                <CFormInput
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  invalid={!!errors.phone}
                  disabled={submitting}
                  placeholder="e.g. 9876543210"
                />
                <CFormFeedback invalid>{errors.phone}</CFormFeedback>
              </CCol>

              <CCol md={6}>
                <CFormLabel>Email Address</CFormLabel>
                <CFormInput
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  invalid={!!errors.email}
                  disabled={submitting}
                />
                <CFormFeedback invalid>{errors.email}</CFormFeedback>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {/* Address */}
        <CCard className="mb-4">
          <CCardHeader><strong>Address & Location</strong></CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel>Address *</CFormLabel>
                <CFormInput
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  invalid={!!errors.address}
                  disabled={submitting}
                  required
                />
                <CFormFeedback invalid>{errors.address}</CFormFeedback>
              </CCol>

              <CCol md={4}>
                <CFormLabel>City</CFormLabel>
                <CFormInput
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel>State</CFormLabel>
                <CFormInput
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel>Pincode</CFormLabel>
                <CFormInput
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  invalid={!!errors.pincode}
                  disabled={submitting}
                />
                <CFormFeedback invalid>{errors.pincode}</CFormFeedback>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {/* Compliance & Logo */}
        <CCard className="mb-4">
          <CCardHeader><strong>Tax Compliance & Branding</strong></CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>GSTIN</CFormLabel>
                <CFormInput
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  invalid={!!errors.gstin}
                  disabled={submitting}
                  placeholder="15-digit GSTIN"
                />
                <CFormFeedback invalid>{errors.gstin}</CFormFeedback>
              </CCol>

              <CCol md={4}>
                <CFormLabel>PAN</CFormLabel>
                <CFormInput
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  invalid={!!errors.pan}
                  disabled={submitting}
                  placeholder="10-digit PAN"
                />
                <CFormFeedback invalid>{errors.pan}</CFormFeedback>
              </CCol>

              <CCol md={4}>
                <CFormLabel>FSSAI License</CFormLabel>
                <CFormInput
                  name="fssai"
                  value={formData.fssai}
                  onChange={handleChange}
                  invalid={!!errors.fssai}
                  disabled={submitting}
                  placeholder="14-digit FSSAI"
                />
                <CFormFeedback invalid>{errors.fssai}</CFormFeedback>
              </CCol>

              <CCol md={12}>
                <CFormLabel>Hotel Logo</CFormLabel>
                {logoPreview && (
                  <div className="mb-2">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      style={{ maxHeight: 80, borderRadius: 4, objectFit: 'contain' }}
                    />
                  </div>
                )}
                <CFormInput
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleLogoChange}
                  invalid={!!errors.logo}
                  disabled={submitting}
                />
                <CFormFeedback invalid>{errors.logo}</CFormFeedback>
                <div className="form-text">JPEG, PNG, WebP or SVG up to 5MB.</div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <div className="d-flex gap-2 flex-wrap">
          <CButton color="primary" type="submit" disabled={submitting}>
            <CIcon icon={cilSave} className="me-1" />
            {submitting ? 'Saving...' : isEditMode ? 'Update Hotel' : 'Create Hotel'}
          </CButton>
          <CButton
            color="success"
            type="button"
            onClick={() => handleSubmit(undefined, true)}
            disabled={submitting}
          >
            <CIcon icon={cilPlus} className="me-1" />
            {isEditMode ? 'Save & Edit Vegetable Prices' : 'Save & Set Vegetable Prices (Contract)'}
          </CButton>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/hotels')} disabled={submitting}>
            Cancel
          </CButton>
        </div>
      </CForm>
    </>
  );
};

export default HotelFormPage;

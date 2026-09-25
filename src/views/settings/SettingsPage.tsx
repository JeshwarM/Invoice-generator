import React, { useState, useEffect } from 'react';
import {
  CCard, CCardBody, CCardHeader, CRow, CCol, CButton, CForm,
  CFormInput, CFormLabel, CFormTextarea, CNav, CNavItem, CNavLink,
  CTabContent, CTabPane, CAlert,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSave } from '@coreui/icons';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getCompanySettings, updateCompanySettings } from '../../services/settingsService';
import { createAuditLog } from '../../services/auditService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { validateLogoFile } from '../../services/hotelService';
import type { CompanySettings } from '../../types';

const SettingsPage: React.FC = () => {
  const { userProfile, isController } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState(1);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getCompanySettings();
        setSettings(s);
      } catch {
        addToast('error', 'Error', 'Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  const updateField = (field: keyof CompanySettings, value: unknown) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = async () => {
    if (!settings || !userProfile) return;
    setSaving(true);
    try {
      const updates: Partial<CompanySettings> = { ...settings };

      // Upload logo if changed
      if (logoFile) {
        const error = validateLogoFile(logoFile);
        if (error) { addToast('error', 'Error', error); setSaving(false); return; }
        const ext = logoFile.name.split('.').pop() || 'png';
        const storageRef = ref(storage, `company/logo.${ext}`);
        await uploadBytes(storageRef, logoFile, { contentType: logoFile.type });
        updates.companyLogo = await getDownloadURL(storageRef);
      }

      // Upload QR if changed
      if (qrFile) {
        const ext = qrFile.name.split('.').pop() || 'png';
        const storageRef = ref(storage, `upi/qr.${ext}`);
        await uploadBytes(storageRef, qrFile, { contentType: qrFile.type });
        updates.upiQrUrl = await getDownloadURL(storageRef);
      }

      await updateCompanySettings(updates, userProfile.uid);
      await createAuditLog('settings_changed', 'settings', 'main', userProfile.uid, userProfile.name, {});
      addToast('success', 'Saved', 'Settings updated successfully.');
      setLogoFile(null);
      setQrFile(null);
    } catch {
      addToast('error', 'Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <LoadingSpinner fullPage />;

  const readOnly = !isController;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Settings</h4>
        {isController && (
          <CButton color="primary" onClick={handleSave} disabled={saving}>
            <CIcon icon={cilSave} className="me-1" />{saving ? 'Saving...' : 'Save Settings'}
          </CButton>
        )}
      </div>

      {readOnly && <CAlert color="info">Only the controller can modify settings.</CAlert>}

      <CNav variant="tabs" className="mb-3">
        <CNavItem><CNavLink active={activeTab === 1} onClick={() => setActiveTab(1)}>Company Info</CNavLink></CNavItem>
        <CNavItem><CNavLink active={activeTab === 2} onClick={() => setActiveTab(2)}>Invoice Settings</CNavLink></CNavItem>
        <CNavItem><CNavLink active={activeTab === 3} onClick={() => setActiveTab(3)}>Payment / UPI</CNavLink></CNavItem>
      </CNav>

      <CTabContent>
        <CTabPane visible={activeTab === 1}>
          <CCard>
            <CCardHeader><strong>Company Information</strong></CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Company Name *</CFormLabel>
                  <CFormInput value={settings.companyName} onChange={(e) => updateField('companyName', e.target.value)} disabled={readOnly} />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Company Logo</CFormLabel>
                  {settings.companyLogo && <div className="mb-2"><img src={settings.companyLogo} alt="Logo" style={{ maxHeight: 60 }} /></div>}
                  <CFormInput type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} disabled={readOnly} />
                </CCol>
                <CCol md={12}><CFormLabel>Address *</CFormLabel>
                  <CFormInput value={settings.address} onChange={(e) => updateField('address', e.target.value)} disabled={readOnly} /></CCol>
                <CCol md={4}><CFormLabel>City</CFormLabel>
                  <CFormInput value={settings.city} onChange={(e) => updateField('city', e.target.value)} disabled={readOnly} /></CCol>
                <CCol md={4}><CFormLabel>State</CFormLabel>
                  <CFormInput value={settings.state} onChange={(e) => updateField('state', e.target.value)} disabled={readOnly} /></CCol>
                <CCol md={4}><CFormLabel>Pincode</CFormLabel>
                  <CFormInput value={settings.pincode} onChange={(e) => updateField('pincode', e.target.value)} disabled={readOnly} /></CCol>
                <CCol md={4}><CFormLabel>GSTIN</CFormLabel>
                  <CFormInput value={settings.gstin} onChange={(e) => updateField('gstin', e.target.value.toUpperCase())} disabled={readOnly} /></CCol>
                <CCol md={4}><CFormLabel>PAN</CFormLabel>
                  <CFormInput value={settings.pan} onChange={(e) => updateField('pan', e.target.value.toUpperCase())} disabled={readOnly} /></CCol>
                <CCol md={4}><CFormLabel>FSSAI</CFormLabel>
                  <CFormInput value={settings.fssai} onChange={(e) => updateField('fssai', e.target.value)} disabled={readOnly} /></CCol>
                <CCol md={6}><CFormLabel>Phone</CFormLabel>
                  <CFormInput value={settings.phone} onChange={(e) => updateField('phone', e.target.value)} disabled={readOnly} /></CCol>
                <CCol md={6}><CFormLabel>Email</CFormLabel>
                  <CFormInput type="email" value={settings.email} onChange={(e) => updateField('email', e.target.value)} disabled={readOnly} /></CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CTabPane>

        <CTabPane visible={activeTab === 2}>
          <CCard>
            <CCardHeader><strong>Invoice Settings</strong></CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={4}><CFormLabel>Invoice Prefix</CFormLabel>
                  <CFormInput value={settings.invoicePrefix} onChange={(e) => updateField('invoicePrefix', e.target.value.toUpperCase())} disabled={readOnly} /></CCol>
                <CCol md={4}><CFormLabel>Default IGST Rate (%)</CFormLabel>
                  <CFormInput type="number" min="0" max="100" value={settings.defaultIgstRate} onChange={(e) => updateField('defaultIgstRate', Number(e.target.value))} disabled={readOnly} /></CCol>
                <CCol md={4}><CFormLabel>Fiscal Year Start Month</CFormLabel>
                  <CFormInput type="number" min="1" max="12" value={settings.fiscalYearStart} onChange={(e) => updateField('fiscalYearStart', Number(e.target.value))} disabled={readOnly} /></CCol>
                <CCol md={12}><CFormLabel>Terms & Conditions</CFormLabel>
                  <CFormTextarea value={settings.termsAndConditions} onChange={(e) => updateField('termsAndConditions', e.target.value)} rows={6} disabled={readOnly} /></CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CTabPane>

        <CTabPane visible={activeTab === 3}>
          <CCard>
            <CCardHeader><strong>Payment / UPI Settings</strong></CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={6}><CFormLabel>UPI ID</CFormLabel>
                  <CFormInput value={settings.upiId} onChange={(e) => updateField('upiId', e.target.value)} disabled={readOnly} placeholder="e.g. company@bank" /></CCol>
                <CCol md={6}><CFormLabel>UPI Name</CFormLabel>
                  <CFormInput value={settings.upiName} onChange={(e) => updateField('upiName', e.target.value)} disabled={readOnly} /></CCol>
                <CCol md={6}>
                  <CFormLabel>UPI QR Code</CFormLabel>
                  {settings.upiQrUrl && <div className="mb-2"><img src={settings.upiQrUrl} alt="UPI QR" style={{ maxWidth: 150 }} /></div>}
                  <CFormInput type="file" accept="image/*" onChange={(e) => setQrFile(e.target.files?.[0] || null)} disabled={readOnly} />
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CTabPane>
      </CTabContent>
    </>
  );
};

export default SettingsPage;

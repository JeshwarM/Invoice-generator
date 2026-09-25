import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CCard, CCardBody, CCardHeader, CRow, CCol, CButton, CFormSelect,
  CFormInput, CFormLabel, CTable, CTableHead, CTableRow, CTableHeaderCell,
  CTableBody, CTableDataCell, CAlert, CModal, CModalHeader, CModalTitle,
  CModalBody, CModalFooter, CForm, CFormTextarea, CInputGroup, CInputGroupText,
  CProgress, CBadge,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSave, cilMediaPlay, cilTrash, cilWarning } from '@coreui/icons';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getHotels } from '../../services/hotelService';
import { findActiveContractForDate, getContractItems } from '../../services/contractService';
import { getCompanySettings } from '../../services/settingsService';
import { saveDraft } from '../../services/draftService';
import { finalizeInvoice } from '../../services/invoiceService';
import { createAuditLog } from '../../services/auditService';
import { getHotel } from '../../services/hotelService';
import {
  isWeightUnit, toGrams, calculateLineTotal, calculateIgst,
  calculateSubtotal, calculateTotalIgst, calculateGrandTotal,
  formatCurrency, paiseToRupees, rupeesToPaise,
} from '../../utils/calculations';
import { numberToIndianWords } from '../../utils/currency';
import { formatInputDate, formatDisplayDate } from '../../utils/date';
import type { Hotel, Contract, ContractItem, BillItem, CompanySettings } from '../../types';

type BillingStep = 'select-hotel' | 'enter-items' | 'invoice-details' | 'preview' | 'finalized';

const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, isController } = useAuth();
  const { addToast } = useToast();

  // Step state
  const [step, setStep] = useState<BillingStep>('select-hotel');

  // Hotel/Contract
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(formatInputDate(new Date()));
  const [invoiceDate, setInvoiceDate] = useState(formatInputDate(new Date()));
  const [contract, setContract] = useState<Contract | null>(null);
  const [contractItems, setContractItems] = useState<ContractItem[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  // Bill items
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [igstRate, setIgstRate] = useState(0);

  // UI state
  const [loading, setLoading] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Override modal
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideIndex, setOverrideIndex] = useState(-1);
  const [overrideRate, setOverrideRate] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Finalize confirm
  const [finalizeConfirm, setFinalizeConfirm] = useState(false);

  // Result
  const [finalizedInvoice, setFinalizedInvoice] = useState<{ invoiceId: string; invoiceNumber: string } | null>(null);

  // Load hotels on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [h, cs] = await Promise.all([getHotels(true), getCompanySettings()]);
        setHotels(h);
        setCompanySettings(cs);
        setIgstRate(cs.defaultIgstRate || 0);
      } catch {
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Find contract when hotel or delivery date changes
  const loadContract = useCallback(async () => {
    if (!selectedHotelId || !deliveryDate) return;
    setContractLoading(true);
    setError(null);
    setContract(null);
    setContractItems([]);
    setBillItems([]);
    try {
      const hotel = await getHotel(selectedHotelId);
      setSelectedHotel(hotel);
      const dd = new Date(deliveryDate);
      const c = await findActiveContractForDate(selectedHotelId, dd);
      if (!c) {
        setError('No active contract exists for this hotel on the selected delivery date.');
        return;
      }
      setContract(c);
      const items = await getContractItems(c.id);
      setContractItems(items);
      // Initialize bill items from contract items
      const bi: BillItem[] = items.filter(i => i.active).map((ci) => ({
        productId: ci.productId,
        productName: ci.productName,
        contractItemId: ci.id,
        quantity: 0,
        quantityGrams: 0,
        unit: ci.unit,
        contractRate: ci.rate,
        finalRate: ci.rate,
        rateOverridden: false,
        rateOverrideReason: '',
        rateOverriddenBy: '',
        rateOverriddenAt: null,
        igstRate: igstRate,
        igstAmount: 0,
        lineTotal: 0,
        deliveryDate: dd,
        deliveryTime: '',
      }));
      setBillItems(bi);
    } catch {
      setError('Failed to load contract data.');
    } finally {
      setContractLoading(false);
    }
  }, [selectedHotelId, deliveryDate, igstRate]);

  // Recalculate totals
  const recalculate = useCallback((items: BillItem[]): BillItem[] => {
    return items.map((item) => {
      const lineTotal = calculateLineTotal(item.unit, item.quantity, item.quantityGrams, item.finalRate);
      const igstAmount = calculateIgst(lineTotal, item.igstRate);
      return { ...item, lineTotal, igstAmount };
    });
  }, []);

  const updateItemQuantity = (index: number, value: string, isGrams: boolean = false) => {
    setBillItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (isWeightUnit(item.unit)) {
        if (isGrams) {
          item.quantityGrams = Math.round(Number(value) || 0);
          item.quantity = item.quantityGrams / 1000;
        } else {
          const kg = Number(value) || 0;
          item.quantityGrams = toGrams(kg, 'kg');
          item.quantity = kg;
        }
      } else {
        item.quantity = Number(value) || 0;
      }
      updated[index] = item;
      return recalculate(updated);
    });
  };

  const updateItemDeliveryTime = (index: number, value: string) => {
    setBillItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], deliveryTime: value };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setBillItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return recalculate(updated);
    });
  };

  // Rate override
  const openOverrideModal = (index: number) => {
    setOverrideIndex(index);
    setOverrideRate(paiseToRupees(billItems[index].finalRate).toString());
    setOverrideReason(billItems[index].rateOverrideReason);
    setOverrideModal(true);
  };

  const applyOverride = () => {
    if (!overrideReason.trim()) {
      addToast('error', 'Error', 'Override reason is required.');
      return;
    }
    setBillItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[overrideIndex] };
      item.finalRate = rupeesToPaise(Number(overrideRate) || 0);
      item.rateOverridden = item.finalRate !== item.contractRate;
      item.rateOverrideReason = overrideReason.trim();
      item.rateOverriddenBy = userProfile?.uid || '';
      item.rateOverriddenAt = new Date();
      updated[overrideIndex] = item;
      return recalculate(updated);
    });
    setOverrideModal(false);
  };

  // Calculations
  const activeItems = billItems.filter((i) => (isWeightUnit(i.unit) ? i.quantityGrams > 0 : i.quantity > 0));
  const subtotal = calculateSubtotal(activeItems);
  const totalIgst = calculateTotalIgst(activeItems);
  const grandTotal = calculateGrandTotal(subtotal, totalIgst);

  // Save draft
  const handleSaveDraft = async () => {
    if (!selectedHotel || !contract) return;
    setSubmitting(true);
    try {
      await saveDraft({
        hotelId: selectedHotelId,
        hotelName: selectedHotel.hotelName,
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        deliveryDate: new Date(deliveryDate),
        invoiceDate: new Date(invoiceDate),
        items: billItems,
        subtotal, igstTotal: totalIgst, grandTotal,
      }, userProfile?.uid || '');
      addToast('success', 'Saved', 'Draft bill saved successfully.');
      await createAuditLog('draft_created', 'draft', '', userProfile?.uid || '', userProfile?.name || '', {
        hotelName: selectedHotel.hotelName,
      });
    } catch {
      addToast('error', 'Error', 'Failed to save draft.');
    } finally {
      setSubmitting(false);
    }
  };

  // Finalize
  const handleFinalize = async () => {
    if (!selectedHotel || !contract || !companySettings) return;
    setSubmitting(true);
    try {
      const result = await finalizeInvoice({
        billItems: activeItems,
        hotel: selectedHotel,
        companySettings,
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        invoiceDate: new Date(invoiceDate),
        deliveryDate: new Date(deliveryDate),
        igstRate,
        subtotal, igstTotal: totalIgst, grandTotal,
        createdBy: userProfile?.uid || '',
        createdByName: userProfile?.name || '',
      });
      setFinalizedInvoice(result);
      setStep('finalized');
      addToast('success', 'Invoice Generated', `Invoice ${result.invoiceNumber} generated successfully.`);
      await createAuditLog('invoice_finalized', 'invoice', result.invoiceId, userProfile?.uid || '', userProfile?.name || '', {
        invoiceNumber: result.invoiceNumber,
        hotelName: selectedHotel.hotelName,
        grandTotal,
      });
    } catch (err) {
      addToast('error', 'Error', err instanceof Error ? err.message : 'Failed to finalize invoice.');
    } finally {
      setSubmitting(false);
      setFinalizeConfirm(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage message="Loading billing data..." />;

  // STEP: Finalized
  if (step === 'finalized' && finalizedInvoice) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <div style={{ fontSize: '4rem' }} className="mb-3">✅</div>
          <h3>Invoice Generated Successfully</h3>
          <p className="text-body-secondary fs-5">Invoice Number: <strong>{finalizedInvoice.invoiceNumber}</strong></p>
          <div className="d-flex justify-content-center gap-3 mt-4">
            <CButton color="primary" onClick={() => navigate(`/invoices/${finalizedInvoice.invoiceId}`)}>
              View Invoice
            </CButton>
            <CButton color="outline-primary" onClick={() => navigate('/invoices')}>
              All Invoices
            </CButton>
            <CButton color="outline-secondary" onClick={() => { setStep('select-hotel'); setFinalizedInvoice(null); setBillItems([]); setContract(null); setSelectedHotelId(''); }}>
              Create Another Bill
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    );
  }

  // Progress bar
  const steps = ['select-hotel', 'enter-items', 'invoice-details', 'preview'];
  const stepIndex = steps.indexOf(step);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    <>
      <h4 className="mb-3">Billing</h4>
      <CProgress value={progress} className="mb-4" color="primary" />
      <div className="mb-3 d-flex gap-2">
        {['Select Hotel', 'Enter Items', 'Invoice Details', 'Preview'].map((label, i) => (
          <CBadge key={i} color={i <= stepIndex ? 'primary' : 'secondary'} className="px-3 py-2">{label}</CBadge>
        ))}
      </div>

      {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}

      {/* STEP 1: SELECT HOTEL */}
      {step === 'select-hotel' && (
        <CCard>
          <CCardHeader><strong>Select Hotel & Delivery Date</strong></CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Hotel *</CFormLabel>
                <CFormSelect value={selectedHotelId} onChange={(e) => setSelectedHotelId(e.target.value)}>
                  <option value="">-- Select Hotel --</option>
                  {hotels.map((h) => <option key={h.id} value={h.id}>{h.hotelName}</option>)}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Delivery Date *</CFormLabel>
                <CFormInput type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Invoice Date</CFormLabel>
                <CFormInput type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </CCol>
            </CRow>
            <div className="mt-4">
              <CButton color="primary" disabled={!selectedHotelId || !deliveryDate || contractLoading}
                onClick={async () => { await loadContract(); if (!error) setStep('enter-items'); }}>
                {contractLoading ? 'Loading Contract...' : 'Continue'}
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* STEP 2: ENTER ITEMS */}
      {step === 'enter-items' && contract && (
        <CCard>
          <CCardHeader>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Enter Quantities</strong>
                <div className="small text-body-secondary">
                  {selectedHotel?.hotelName} — Contract: {contract.contractNumber} — Delivery: {formatDisplayDate(deliveryDate)}
                </div>
              </div>
              <div className="d-flex gap-2">
                <CButton color="outline-secondary" size="sm" onClick={() => setStep('select-hotel')}>Back</CButton>
                <CButton color="outline-info" size="sm" onClick={handleSaveDraft} disabled={submitting}>
                  <CIcon icon={cilSave} className="me-1" />Save Draft
                </CButton>
              </div>
            </div>
          </CCardHeader>
          <CCardBody>
            <div className="table-responsive">
              <CTable bordered hover align="middle" className="mb-0">
                <CTableHead color="dark">
                  <CTableRow>
                    <CTableHeaderCell>Item</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: 130 }}>Quantity</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: 80 }}>Unit</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: 130 }}>Rate (₹)</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: 100 }}>IGST</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: 130 }}>Total</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: 120 }}>Delivery Time</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: 100 }}>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {billItems.map((item, idx) => (
                    <CTableRow key={idx}>
                      <CTableDataCell>
                        <strong>{item.productName}</strong>
                        {item.rateOverridden && (
                          <div className="small text-warning">Rate overridden: {item.rateOverrideReason}</div>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          type="number"
                          min="0"
                          step={isWeightUnit(item.unit) ? '0.001' : '1'}
                          value={isWeightUnit(item.unit) ? (item.quantityGrams > 0 ? item.quantity : '') : (item.quantity > 0 ? item.quantity : '')}
                          onChange={(e) => updateItemQuantity(idx, e.target.value)}
                          placeholder="0"
                          size="sm"
                        />
                      </CTableDataCell>
                      <CTableDataCell>{item.unit}</CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex align-items-center gap-1">
                          <span>{formatCurrency(item.finalRate)}</span>
                          <CButton color="link" size="sm" className="p-0" onClick={() => openOverrideModal(idx)}
                            title="Override rate">✏️</CButton>
                        </div>
                        {item.rateOverridden && (
                          <small className="text-body-secondary">Contract: {formatCurrency(item.contractRate)}</small>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>{formatCurrency(item.igstAmount)}</CTableDataCell>
                      <CTableDataCell><strong>{formatCurrency(item.lineTotal)}</strong></CTableDataCell>
                      <CTableDataCell>
                        <CFormInput type="time" value={item.deliveryTime} onChange={(e) => updateItemDeliveryTime(idx, e.target.value)} size="sm" />
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton color="danger" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
            <CRow className="mt-4">
              <CCol md={{ offset: 7, span: 5 }}>
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal:</span><strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>IGST ({igstRate}%):</span><strong>{formatCurrency(totalIgst)}</strong>
                </div>
                <hr />
                <div className="d-flex justify-content-between fs-5">
                  <strong>Grand Total:</strong><strong className="text-primary">{formatCurrency(grandTotal)}</strong>
                </div>
              </CCol>
            </CRow>
            <div className="mt-4 d-flex gap-2">
              <CButton color="primary" onClick={() => setStep('invoice-details')} disabled={activeItems.length === 0}>
                Continue to Invoice Details
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* STEP 3: INVOICE DETAILS */}
      {step === 'invoice-details' && selectedHotel && companySettings && contract && (
        <CCard>
          <CCardHeader>
            <div className="d-flex justify-content-between">
              <strong>Invoice Details — Verify Before Preview</strong>
              <CButton color="outline-secondary" size="sm" onClick={() => setStep('enter-items')}>Back</CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-4">
              <CCol md={6}>
                <CCard className="h-100">
                  <CCardHeader className="bg-light"><strong>Billed By (Supplier)</strong></CCardHeader>
                  <CCardBody>
                    <p className="mb-1"><strong>{companySettings.companyName || '—'}</strong></p>
                    <p className="mb-1 small">{companySettings.address}, {companySettings.city}, {companySettings.state} {companySettings.pincode}</p>
                    {companySettings.gstin && <p className="mb-1 small">GSTIN: {companySettings.gstin}</p>}
                    {companySettings.pan && <p className="mb-1 small">PAN: {companySettings.pan}</p>}
                    {companySettings.fssai && <p className="mb-1 small">FSSAI: {companySettings.fssai}</p>}
                    {companySettings.phone && <p className="mb-1 small">Phone: {companySettings.phone}</p>}
                    {companySettings.email && <p className="mb-1 small">Email: {companySettings.email}</p>}
                    {!companySettings.companyName && <CAlert color="warning" className="mt-2">Company name is not configured. Go to Settings.</CAlert>}
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={6}>
                <CCard className="h-100">
                  <CCardHeader className="bg-light"><strong>Billed To (Hotel)</strong></CCardHeader>
                  <CCardBody>
                    <p className="mb-1"><strong>{selectedHotel.hotelName}</strong></p>
                    <p className="mb-1 small">{selectedHotel.address}, {selectedHotel.city}, {selectedHotel.state} {selectedHotel.pincode}</p>
                    {selectedHotel.gstin && <p className="mb-1 small">GSTIN: {selectedHotel.gstin}</p>}
                    {selectedHotel.pan && <p className="mb-1 small">PAN: {selectedHotel.pan}</p>}
                    {selectedHotel.fssai && <p className="mb-1 small">FSSAI: {selectedHotel.fssai}</p>}
                    {selectedHotel.contactPerson && <p className="mb-1 small">Contact: {selectedHotel.contactPerson}</p>}
                    {selectedHotel.phone && <p className="mb-1 small">Phone: {selectedHotel.phone}</p>}
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
            <CRow className="g-4 mt-2">
              <CCol md={4}>
                <CCard>
                  <CCardHeader className="bg-light"><strong>Invoice Information</strong></CCardHeader>
                  <CCardBody>
                    <p className="mb-1 small">Invoice Number: <em>Assigned on finalization</em></p>
                    <p className="mb-1 small">Invoice Date: {formatDisplayDate(invoiceDate)}</p>
                    <p className="mb-1 small">Delivery Date: {formatDisplayDate(deliveryDate)}</p>
                    <p className="mb-1 small">Contract: {contract.contractNumber}</p>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={4}>
                <CCard>
                  <CCardHeader className="bg-light"><strong>Tax Information</strong></CCardHeader>
                  <CCardBody>
                    <p className="mb-1 small">Tax Type: IGST</p>
                    <p className="mb-1 small">IGST Rate: {igstRate}%</p>
                    <p className="mb-1 small">Taxable Amount: {formatCurrency(subtotal)}</p>
                    <p className="mb-1 small">IGST Amount: {formatCurrency(totalIgst)}</p>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={4}>
                <CCard>
                  <CCardHeader className="bg-light"><strong>Payment Information</strong></CCardHeader>
                  <CCardBody>
                    {companySettings.upiId ? (
                      <>
                        <p className="mb-1 small">UPI ID: {companySettings.upiId}</p>
                        {companySettings.upiName && <p className="mb-1 small">UPI Name: {companySettings.upiName}</p>}
                      </>
                    ) : (
                      <p className="mb-1 small text-body-secondary">UPI not configured.</p>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
            <CRow className="mt-4">
              <CCol md={{ offset: 7, span: 5 }}>
                <div className="d-flex justify-content-between mb-2"><span>Subtotal:</span><strong>{formatCurrency(subtotal)}</strong></div>
                <div className="d-flex justify-content-between mb-2"><span>IGST ({igstRate}%):</span><strong>{formatCurrency(totalIgst)}</strong></div>
                <hr />
                <div className="d-flex justify-content-between fs-5"><strong>Grand Total:</strong><strong className="text-primary">{formatCurrency(grandTotal)}</strong></div>
                <p className="small text-body-secondary mt-1">{numberToIndianWords(paiseToRupees(grandTotal))}</p>
              </CCol>
            </CRow>
            <div className="mt-4 d-flex gap-2">
              <CButton color="primary" onClick={() => setStep('preview')}>Continue to Invoice Preview</CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* STEP 4: PREVIEW */}
      {step === 'preview' && selectedHotel && companySettings && contract && (
        <CCard>
          <CCardHeader>
            <div className="d-flex justify-content-between">
              <strong>Invoice Preview</strong>
              <CButton color="outline-secondary" size="sm" onClick={() => setStep('invoice-details')}>Back & Edit</CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {/* Invoice Preview Rendering */}
            <div className="border rounded p-4 bg-white" style={{ maxWidth: 800, margin: '0 auto' }}>
              <div className="text-center mb-4">
                <h3 className="text-uppercase" style={{ color: '#5b3e96' }}>Sales Invoice</h3>
                <p className="mb-0 small">Invoice Number: <em>Will be assigned on finalization</em></p>
                <p className="small">Invoice Date: {formatDisplayDate(invoiceDate)}</p>
              </div>
              <CRow className="g-3 mb-4">
                <CCol md={6}>
                  <div className="p-3 border rounded bg-light">
                    <h6 style={{ color: '#5b3e96' }}>Billed By</h6>
                    <strong>{companySettings.companyName}</strong>
                    <p className="mb-0 small">{companySettings.address}, {companySettings.city}, {companySettings.state} {companySettings.pincode}</p>
                    {companySettings.gstin && <p className="mb-0 small">GSTIN: {companySettings.gstin}</p>}
                    {companySettings.pan && <p className="mb-0 small">PAN: {companySettings.pan}</p>}
                    {companySettings.fssai && <p className="mb-0 small">FSSAI: {companySettings.fssai}</p>}
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="p-3 border rounded bg-light">
                    <h6 style={{ color: '#5b3e96' }}>Billed To</h6>
                    <strong>{selectedHotel.hotelName}</strong>
                    <p className="mb-0 small">{selectedHotel.address}, {selectedHotel.city}, {selectedHotel.state} {selectedHotel.pincode}</p>
                    {selectedHotel.gstin && <p className="mb-0 small">GSTIN: {selectedHotel.gstin}</p>}
                    {selectedHotel.pan && <p className="mb-0 small">PAN: {selectedHotel.pan}</p>}
                  </div>
                </CCol>
              </CRow>
              <CTable bordered small className="mb-3">
                <CTableHead>
                  <CTableRow style={{ backgroundColor: '#5b3e96', color: 'white' }}>
                    <CTableHeaderCell>#</CTableHeaderCell>
                    <CTableHeaderCell>Item</CTableHeaderCell>
                    <CTableHeaderCell>Delivered On</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Qty</CTableHeaderCell>
                    <CTableHeaderCell>Unit</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Rate</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">IGST</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                    <CTableHeaderCell>Delivery Time</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {activeItems.map((item, idx) => (
                    <CTableRow key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f8f7fc' : 'white' }}>
                      <CTableDataCell>{idx + 1}</CTableDataCell>
                      <CTableDataCell>
                        <strong>{item.productName.toUpperCase()}</strong>
                        {item.rateOverridden && <span className="ms-1 text-warning" title={item.rateOverrideReason}>⚠️</span>}
                      </CTableDataCell>
                      <CTableDataCell>{formatDisplayDate(deliveryDate)}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        {isWeightUnit(item.unit) ? item.quantity : item.quantity}
                      </CTableDataCell>
                      <CTableDataCell>{item.unit}</CTableDataCell>
                      <CTableDataCell className="text-end">{formatCurrency(item.finalRate)}</CTableDataCell>
                      <CTableDataCell className="text-end">{formatCurrency(item.igstAmount)}</CTableDataCell>
                      <CTableDataCell className="text-end"><strong>{formatCurrency(item.lineTotal)}</strong></CTableDataCell>
                      <CTableDataCell>{item.deliveryTime || '—'}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
              <div className="mb-3 p-2 bg-light rounded small">
                <strong>Total (in words):</strong> {numberToIndianWords(paiseToRupees(grandTotal))}
              </div>
              <CRow>
                <CCol md={{ offset: 7, span: 5 }}>
                  <div className="d-flex justify-content-between mb-1 small"><span>Amount:</span><span>{formatCurrency(subtotal)}</span></div>
                  <div className="d-flex justify-content-between mb-1 small"><span>IGST:</span><span>{formatCurrency(totalIgst)}</span></div>
                  <hr className="my-1" />
                  <div className="d-flex justify-content-between fw-bold"><span>Total (INR):</span><span className="text-primary">{formatCurrency(grandTotal)}</span></div>
                </CCol>
              </CRow>
              {companySettings.upiId && (
                <div className="mt-3 p-2 border rounded text-center small">
                  <strong>UPI Payment:</strong> {companySettings.upiId}
                </div>
              )}
              {companySettings.termsAndConditions && (
                <div className="mt-3 small text-body-secondary">
                  <strong>Terms & Conditions:</strong>
                  <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>{companySettings.termsAndConditions}</pre>
                </div>
              )}
            </div>
            <div className="mt-4 d-flex gap-2 justify-content-center">
              <CButton color="outline-secondary" onClick={() => setStep('invoice-details')}>Back & Edit</CButton>
              <CButton color="success" onClick={() => setFinalizeConfirm(true)} disabled={submitting}>
                <CIcon icon={cilMediaPlay} className="me-1" />Generate Final Invoice
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* Rate Override Modal */}
      <CModal visible={overrideModal} onClose={() => setOverrideModal(false)} alignment="center">
        <CModalHeader><CModalTitle>Override Rate</CModalTitle></CModalHeader>
        <CModalBody>
          {overrideIndex >= 0 && billItems[overrideIndex] && (
            <>
              <p>Product: <strong>{billItems[overrideIndex].productName}</strong></p>
              <p>Contract Rate: {formatCurrency(billItems[overrideIndex].contractRate)}</p>
              <CFormLabel>New Rate (₹)</CFormLabel>
              <CInputGroup className="mb-3">
                <CInputGroupText>₹</CInputGroupText>
                <CFormInput type="number" min="0" step="0.01" value={overrideRate} onChange={(e) => setOverrideRate(e.target.value)} />
              </CInputGroup>
              <CFormLabel>Reason *</CFormLabel>
              <CFormTextarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Reason for rate override..." rows={2} />
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setOverrideModal(false)}>Cancel</CButton>
          <CButton color="warning" onClick={applyOverride}>Apply Override</CButton>
        </CModalFooter>
      </CModal>

      {/* Finalize Confirmation */}
      <ConfirmDialog
        visible={finalizeConfirm}
        title="Finalize Invoice"
        message="Once finalized, this invoice cannot be edited. The invoice number will be assigned permanently. Continue?"
        confirmLabel="Finalize Invoice"
        confirmColor="success"
        loading={submitting}
        onConfirm={handleFinalize}
        onCancel={() => setFinalizeConfirm(false)}
      />
    </>
  );
};

export default BillingPage;

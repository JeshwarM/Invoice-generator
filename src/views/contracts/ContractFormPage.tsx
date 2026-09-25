import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormSelect,
  CFormInput,
  CFormLabel,
  CFormCheck,
  CRow,
  CCol,
  CButton,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CInputGroup,
  CInputGroupText,
  CAlert,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilTrash, cilSave, cilArrowLeft } from '@coreui/icons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getHotels } from '../../services/hotelService';
import { getProducts, PRODUCT_UNITS } from '../../services/productService';
import { createContract, addContractItem } from '../../services/contractService';
import { createAuditLog } from '../../services/auditService';
import { calculateEndDate, formatInputDate } from '../../utils/date';
import { rupeesToPaise } from '../../utils/calculations';
import type { Hotel, Product, ProductUnit, ContractDuration } from '../../types';

interface SelectedProduct {
  productId: string;
  productName: string;
  unit: ProductUnit;
  rateInRupees: number;
}

const ContractFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [hotelId, setHotelId] = useState('');
  const [duration, setDuration] = useState<ContractDuration>(12);
  const [startDate, setStartDate] = useState(formatInputDate(new Date()));
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalProductId, setModalProductId] = useState('');
  const [modalUnit, setModalUnit] = useState<ProductUnit>('kg');
  const [modalRate, setModalRate] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activeHotels, activeProducts] = await Promise.all([
          getHotels(true),
          getProducts(true),
        ]);
        setHotels(activeHotels);
        setProducts(activeProducts);

        // Pre-select hotel if passed in state (e.g. from Renew)
        const stateHotelId = (location.state as { hotelId?: string })?.hotelId;
        if (stateHotelId) {
          setHotelId(stateHotelId);
        }
      } catch (err: unknown) {
        console.error('Error fetching data:', err);
        addToast('error', 'Error', 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [location.state, addToast]);

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setModalProductId(pId);
    const prod = products.find((p) => p.id === pId);
    if (prod) {
      setModalUnit(prod.defaultUnit || 'kg');
    }
  };

  const openAddProductModal = () => {
    setModalProductId('');
    setModalUnit('kg');
    setModalRate('');
    setModalVisible(true);
  };

  const handleAddProduct = () => {
    if (!modalProductId) {
      addToast('error', 'Error', 'Please select a product');
      return;
    }
    const rateNum = Number(modalRate);
    if (!modalRate || isNaN(rateNum) || rateNum <= 0) {
      addToast('error', 'Error', 'Please enter a valid rate greater than 0');
      return;
    }
    const prod = products.find((p) => p.id === modalProductId);
    if (!prod) return;

    setSelectedProducts((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        unit: modalUnit,
        rateInRupees: rateNum,
      },
    ]);
    setModalVisible(false);
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hotelId) {
      setError('Please select a hotel.');
      return;
    }
    if (!startDate) {
      setError('Please select a start date.');
      return;
    }
    if (selectedProducts.length === 0) {
      setError('Please add at least one product with its contract rate.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedHotel = hotels.find((h) => h.id === hotelId);
      if (!selectedHotel) throw new Error('Selected hotel not found');

      const start = new Date(startDate);
      const endDate = calculateEndDate(start, duration);

      const contractId = await createContract(
        {
          hotelId,
          hotelName: selectedHotel.hotelName,
          startDate: start,
          endDate,
          duration,
        },
        userProfile?.uid || ''
      );

      // Add all products with rates converted to paise
      for (const item of selectedProducts) {
        await addContractItem(contractId, {
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          rate: rupeesToPaise(item.rateInRupees),
        });
      }

      await createAuditLog(
        'contract_created',
        'contract',
        contractId,
        userProfile?.uid || '',
        userProfile?.name || '',
        {
          hotelName: selectedHotel.hotelName,
          itemCount: selectedProducts.length,
          duration: `${duration} months`,
        }
      );

      addToast('success', 'Created', 'Contract created successfully.');
      navigate(`/contracts/${contractId}`);
    } catch (err: unknown) {
      console.error('Error creating contract:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create contract.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage message="Loading hotels and products..." />;

  // Exclude products already added
  const availableProducts = products.filter(
    (p) => !selectedProducts.some((sp) => sp.productId === p.id)
  );

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <CButton color="link" onClick={() => navigate('/contracts')} className="ps-0">
            <CIcon icon={cilArrowLeft} className="me-1" />Back to Contracts
          </CButton>
          <h4 className="mb-0">Create Contract</h4>
        </div>
      </div>

      {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}

      <CForm onSubmit={handleSubmit}>
        {/* Step 1 & 2: Hotel & Duration */}
        <CCard className="mb-4">
          <CCardHeader><strong>Contract Details</strong></CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Hotel *</CFormLabel>
                <CFormSelect
                  value={hotelId}
                  onChange={(e) => setHotelId(e.target.value)}
                  disabled={submitting}
                  required
                >
                  <option value="">-- Select a hotel --</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.hotelName} ({h.city || 'No city'})
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={6}>
                <CFormLabel>Contract Duration</CFormLabel>
                <div className="d-flex gap-4 pt-2">
                  <CFormCheck
                    type="radio"
                    name="duration"
                    id="duration6"
                    label="6 Months"
                    checked={duration === 6}
                    onChange={() => setDuration(6)}
                    disabled={submitting}
                  />
                  <CFormCheck
                    type="radio"
                    name="duration"
                    id="duration12"
                    label="12 Months"
                    checked={duration === 12}
                    onChange={() => setDuration(12)}
                    disabled={submitting}
                  />
                </div>
              </CCol>

              <CCol md={6}>
                <CFormLabel>Start Date *</CFormLabel>
                <CFormInput
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={submitting}
                  required
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel>Calculated End Date</CFormLabel>
                <CFormInput
                  type="date"
                  value={formatInputDate(calculateEndDate(new Date(startDate || new Date()), duration))}
                  disabled
                  readOnly
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {/* Step 3: Product Pricing */}
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Contract Product Pricing ({selectedProducts.length} items)</strong>
            <CButton
              color="primary"
              size="sm"
              onClick={openAddProductModal}
              disabled={submitting || availableProducts.length === 0}
            >
              <CIcon icon={cilPlus} className="me-1" />Add Product
            </CButton>
          </CCardHeader>
          <CCardBody>
            {selectedProducts.length === 0 ? (
              <p className="text-body-secondary text-center py-4">
                No products added yet. Click &quot;Add Product&quot; above to specify hotel-specific rates.
              </p>
            ) : (
              <div className="table-responsive">
                <CTable hover align="middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>#</CTableHeaderCell>
                      <CTableHeaderCell>Product</CTableHeaderCell>
                      <CTableHeaderCell>Unit</CTableHeaderCell>
                      <CTableHeaderCell>Agreed Rate (₹)</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {selectedProducts.map((item, idx) => (
                      <CTableRow key={item.productId}>
                        <CTableDataCell>{idx + 1}</CTableDataCell>
                        <CTableDataCell><strong>{item.productName}</strong></CTableDataCell>
                        <CTableDataCell>{item.unit}</CTableDataCell>
                        <CTableDataCell>₹{item.rateInRupees.toFixed(2)}</CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProduct(idx)}
                            disabled={submitting}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>
            )}
          </CCardBody>
        </CCard>

        <div className="d-flex gap-2">
          <CButton color="primary" type="submit" disabled={submitting || selectedProducts.length === 0}>
            <CIcon icon={cilSave} className="me-1" />
            {submitting ? 'Creating Contract...' : 'Create Contract'}
          </CButton>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/contracts')} disabled={submitting}>
            Cancel
          </CButton>
        </div>
      </CForm>

      {/* Add Product Modal */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} alignment="center">
        <CModalHeader>
          <CModalTitle>Add Product to Contract</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Product *</CFormLabel>
            <CFormSelect value={modalProductId} onChange={handleProductSelect}>
              <option value="">-- Select Product --</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </CFormSelect>
          </div>

          <div className="mb-3">
            <CFormLabel>Unit</CFormLabel>
            <CFormSelect
              value={modalUnit}
              onChange={(e) => setModalUnit(e.target.value as ProductUnit)}
            >
              {PRODUCT_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </CFormSelect>
          </div>

          <div className="mb-3">
            <CFormLabel>Agreed Rate (₹) *</CFormLabel>
            <CInputGroup>
              <CInputGroupText>₹</CInputGroupText>
              <CFormInput
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={modalRate}
                onChange={(e) => setModalRate(e.target.value)}
              />
            </CInputGroup>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setModalVisible(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleAddProduct}>
            Add to Contract
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default ContractFormPage;

import React, { useState, useEffect } from 'react';
import {
  CCard, CCardBody, CCardHeader, CTable, CTableHead, CTableRow,
  CTableHeaderCell, CTableBody, CTableDataCell, CButton, CFormInput,
  CFormSelect, CFormLabel, CModal, CModalHeader, CModalTitle, CModalBody,
  CModalFooter, CForm, CRow, CCol, CInputGroup, CInputGroupText, CAlert,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilSearch } from '@coreui/icons';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getProducts, createProduct, updateProduct, toggleProductActive, PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../../services/productService';
import { createAuditLog } from '../../services/auditService';
import type { Product, ProductCategory, ProductUnit } from '../../types';

const ProductListPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('vegetables');
  const [formUnit, setFormUnit] = useState<ProductUnit>('kg');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch {
      addToast('error', 'Error', 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setFormName('');
    setFormCategory('vegetables');
    setFormUnit('kg');
    setFormError(null);
    setModal(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormUnit(p.defaultUnit);
    setFormError(null);
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { setFormError('Product name is required.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editId) {
        await updateProduct(editId, { name: formName.trim(), category: formCategory, defaultUnit: formUnit });
        await createAuditLog('product_edited', 'product', editId, userProfile?.uid || '', userProfile?.name || '', { name: formName });
        addToast('success', 'Updated', 'Product updated.');
      } else {
        const id = await createProduct({ name: formName.trim(), category: formCategory, defaultUnit: formUnit }, userProfile?.uid || '');
        await createAuditLog('product_created', 'product', id, userProfile?.uid || '', userProfile?.name || '', { name: formName });
        addToast('success', 'Created', 'Product created.');
      }
      setModal(false);
      await loadProducts();
    } catch {
      setFormError('Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (p: Product) => {
    try {
      await toggleProductActive(p.id, !p.active);
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !x.active } : x));
      addToast('info', 'Updated', `Product ${p.active ? 'deactivated' : 'activated'}.`);
    } catch {
      addToast('error', 'Error', 'Failed to update product.');
    }
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Products</h4>
        <CButton color="primary" onClick={openCreate}><CIcon icon={cilPlus} className="me-1" />Add Product</CButton>
      </div>

      <CCard>
        <CCardHeader>
          <CInputGroup size="sm" style={{ maxWidth: 300 }}>
            <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
            <CFormInput placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </CInputGroup>
        </CCardHeader>
        <CCardBody>
          {filtered.length === 0 ? (
            <EmptyState title="No products" message="No products found." actionLabel="Add Product" onAction={openCreate} />
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Category</CTableHeaderCell>
                  <CTableHeaderCell>Unit</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filtered.map((p) => (
                  <CTableRow key={p.id}>
                    <CTableDataCell><strong>{p.name}</strong></CTableDataCell>
                    <CTableDataCell>{PRODUCT_CATEGORIES.find((c) => c.value === p.category)?.label || p.category}</CTableDataCell>
                    <CTableDataCell>{PRODUCT_UNITS.find((u) => u.value === p.defaultUnit)?.label || p.defaultUnit}</CTableDataCell>
                    <CTableDataCell><StatusBadge status={p.active ? 'active' : 'inactive'} /></CTableDataCell>
                    <CTableDataCell>
                      <CButton color="primary" variant="ghost" size="sm" className="me-1" onClick={() => openEdit(p)}>
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton color={p.active ? 'warning' : 'success'} size="sm" variant="outline"
                        onClick={() => handleToggle(p)}>
                        {p.active ? 'Deactivate' : 'Activate'}
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      {/* Create/Edit Modal */}
      <CModal visible={modal} onClose={() => setModal(false)} alignment="center">
        <CModalHeader><CModalTitle>{editId ? 'Edit Product' : 'Add Product'}</CModalTitle></CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            {formError && <CAlert color="danger">{formError}</CAlert>}
            <div className="mb-3">
              <CFormLabel>Product Name *</CFormLabel>
              <CFormInput value={formName} onChange={(e) => setFormName(e.target.value)} required disabled={submitting} />
            </div>
            <div className="mb-3">
              <CFormLabel>Category</CFormLabel>
              <CFormSelect value={formCategory} onChange={(e) => setFormCategory(e.target.value as ProductCategory)} disabled={submitting}>
                {PRODUCT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormLabel>Default Unit</CFormLabel>
              <CFormSelect value={formUnit} onChange={(e) => setFormUnit(e.target.value as ProductUnit)} disabled={submitting}>
                {PRODUCT_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </CFormSelect>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setModal(false)} disabled={submitting}>Cancel</CButton>
            <CButton color="primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : (editId ? 'Update' : 'Create')}</CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  );
};

export default ProductListPage;

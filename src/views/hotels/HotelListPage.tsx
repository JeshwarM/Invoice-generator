import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CCard, CCardBody, CCardHeader, CTable, CTableHead, CTableRow,
  CTableHeaderCell, CTableBody, CTableDataCell, CButton, CFormInput,
  CInputGroup, CInputGroupText,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilZoom, cilSearch } from '@coreui/icons';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getHotels, toggleHotelActive } from '../../services/hotelService';
import { createAuditLog } from '../../services/auditService';
import type { Hotel } from '../../types';

const HotelListPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { addToast } = useToast();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getHotels();
        setHotels(data);
      } catch {
        addToast('error', 'Error', 'Failed to load hotels.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  const handleToggle = async (hotel: Hotel) => {
    try {
      await toggleHotelActive(hotel.id, !hotel.active);
      await createAuditLog('hotel_edited', 'hotel', hotel.id, userProfile?.uid || '', userProfile?.name || '', {
        action: hotel.active ? 'deactivated' : 'activated', hotelName: hotel.hotelName,
      });
      setHotels((prev) => prev.map((h) => h.id === hotel.id ? { ...h, active: !h.active } : h));
      addToast('info', 'Updated', `Hotel ${hotel.active ? 'deactivated' : 'activated'}.`);
    } catch {
      addToast('error', 'Error', 'Failed to update hotel.');
    }
  };

  const filtered = hotels.filter((h) => h.hotelName.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Hotels</h4>
        <CButton color="primary" onClick={() => navigate('/hotels/create')}>
          <CIcon icon={cilPlus} className="me-1" />Add Hotel
        </CButton>
      </div>

      <CCard>
        <CCardHeader>
          <CInputGroup size="sm" style={{ maxWidth: 300 }}>
            <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
            <CFormInput placeholder="Search hotels..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </CInputGroup>
        </CCardHeader>
        <CCardBody>
          {filtered.length === 0 ? (
            <EmptyState title="No hotels" message="No hotels found." actionLabel="Add Hotel" onAction={() => navigate('/hotels/create')} />
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 50 }}>Logo</CTableHeaderCell>
                  <CTableHeaderCell>Hotel Name</CTableHeaderCell>
                  <CTableHeaderCell>City</CTableHeaderCell>
                  <CTableHeaderCell>Contact Person</CTableHeaderCell>
                  <CTableHeaderCell>Phone</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filtered.map((hotel) => (
                  <CTableRow key={hotel.id}>
                    <CTableDataCell>
                      {hotel.logoUrl ? (
                        <img src={hotel.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏨</div>
                      )}
                    </CTableDataCell>
                    <CTableDataCell><strong>{hotel.hotelName}</strong></CTableDataCell>
                    <CTableDataCell>{hotel.city || '—'}</CTableDataCell>
                    <CTableDataCell>{hotel.contactPerson || '—'}</CTableDataCell>
                    <CTableDataCell>{hotel.phone || '—'}</CTableDataCell>
                    <CTableDataCell><StatusBadge status={hotel.active ? 'active' : 'inactive'} /></CTableDataCell>
                    <CTableDataCell>
                      <CButton color="primary" variant="ghost" size="sm" className="me-1" onClick={() => navigate(`/hotels/${hotel.id}/edit`)}>
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton color={hotel.active ? 'warning' : 'success'} variant="outline" size="sm"
                        onClick={() => handleToggle(hotel)}>
                        {hotel.active ? 'Deactivate' : 'Activate'}
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
    </>
  );
};

export default HotelListPage;

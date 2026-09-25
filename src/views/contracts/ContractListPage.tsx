import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CButtonGroup,
  CPagination,
  CPaginationItem,
  CSpinner,
} from '@coreui/react';
import { getContracts } from '../../services/contractService';
import { Contract } from '../../types';
import { formatDisplayDate } from '../../utils/date';
import StatusBadge from '../../components/common/StatusBadge';

const ContractListPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Expired' | 'Cancelled'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      try {
        const data = await getContracts();
        setContracts(data);
      } catch (error) {
        console.error('Failed to fetch contracts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const filteredContracts = contracts.filter((c) => {
    if (filter === 'All') return true;
    if (filter === 'Active') return c.status === 'active';
    if (filter === 'Expired') return c.status === 'expired';
    if (filter === 'Cancelled') return c.status === 'cancelled';
    return true;
  });

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const currentContracts = filteredContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Contracts</strong>
            <CButton color="primary" onClick={() => navigate('/contracts/create')}>
              Create Contract
            </CButton>
          </CCardHeader>
          <CCardBody>
            <div className="mb-3">
              <CButtonGroup>
                {['All', 'Active', 'Expired', 'Cancelled'].map((f) => (
                  <CButton
                    key={f}
                    color={filter === f ? 'primary' : 'outline-primary'}
                    onClick={() => {
                      setFilter(f as any);
                      setCurrentPage(1);
                    }}
                  >
                    {f}
                  </CButton>
                ))}
              </CButtonGroup>
            </div>

            {loading ? (
              <div className="text-center my-5">
                <CSpinner color="primary" />
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="text-center my-5">
                <p>No contracts found.</p>
              </div>
            ) : (
              <>
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Contract Number</CTableHeaderCell>
                      <CTableHeaderCell>Hotel</CTableHeaderCell>
                      <CTableHeaderCell>Start Date</CTableHeaderCell>
                      <CTableHeaderCell>End Date</CTableHeaderCell>
                      <CTableHeaderCell>Duration</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {currentContracts.map((contract) => (
                      <CTableRow key={contract.id}>
                        <CTableDataCell>{contract.contractNumber}</CTableDataCell>
                        <CTableDataCell>{contract.hotelName || contract.hotelId}</CTableDataCell>
                        <CTableDataCell>{formatDisplayDate(contract.startDate)}</CTableDataCell>
                        <CTableDataCell>{formatDisplayDate(contract.endDate)}</CTableDataCell>
                        <CTableDataCell>
                          {contract.duration === 6 ? '6 months' : '12 months'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <StatusBadge status={contract.status} />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/contracts/${contract.id}`)}
                          >
                            View Details
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>

                {totalPages > 1 && (
                  <CPagination align="end">
                    <CPaginationItem
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </CPaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <CPaginationItem
                        key={page}
                        active={page === currentPage}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </CPaginationItem>
                    ))}
                    <CPaginationItem
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </CPaginationItem>
                  </CPagination>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default ContractListPage;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CSpinner,
} from '@coreui/react';
import { getContract, getContractItems } from '../../services/contractService';
import { Contract, ContractItem } from '../../types';
import { formatDisplayDate } from '../../utils/date';
import { paiseToRupees } from '../../utils/calculations';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';

const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile, isController } = useAuth();

  const [contract, setContract] = useState<Contract | null>(null);
  const [items, setItems] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [contractData, itemsData] = await Promise.all([
          getContract(id),
          getContractItems(id),
        ]);
        setContract(contractData as Contract);
        setItems(itemsData);
      } catch (error) {
        console.error('Failed to fetch contract details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center my-5">
        <CSpinner color="primary" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center my-5">
        <h4>Contract not found.</h4>
        <CButton color="primary" onClick={() => navigate('/contracts')}>
          Back to Contracts
        </CButton>
      </div>
    );
  }

  return (
    <CRow>
      <CCol xs={12}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <CButton color="secondary" variant="outline" onClick={() => navigate('/contracts')}>
            &larr; Back to Contracts
          </CButton>
          {isController && (
            <CButton
              color="primary"
              onClick={() => navigate('/contracts/create', { state: { hotelId: contract.hotelId } })}
            >
              Renew Contract
            </CButton>
          )}
        </div>

        <CCard className="mb-4">
          <CCardHeader>
            <strong>Contract Info</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={3}>
                <strong>Contract Number:</strong>
                <div>{contract.contractNumber}</div>
              </CCol>
              <CCol md={3}>
                <strong>Hotel:</strong>
                <div>{contract.hotelName || contract.hotelId}</div>
              </CCol>
              <CCol md={3}>
                <strong>Status:</strong>
                <div>
                  <StatusBadge status={contract.status} />
                </div>
              </CCol>
              <CCol md={3}>
                <strong>Duration:</strong>
                <div>{contract.duration} months</div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={3}>
                <strong>Start Date:</strong>
                <div>{formatDisplayDate(contract.startDate)}</div>
              </CCol>
              <CCol md={3}>
                <strong>End Date:</strong>
                <div>{formatDisplayDate(contract.endDate)}</div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <CCard>
          <CCardHeader>
            <strong>Contract Items</strong>
          </CCardHeader>
          <CCardBody>
            {items.length === 0 ? (
              <p>No products found for this contract.</p>
            ) : (
              <CTable hover responsive bordered>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Product</CTableHeaderCell>
                    <CTableHeaderCell>Unit</CTableHeaderCell>
                    <CTableHeaderCell>Rate</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {items.map((item) => (
                    <CTableRow key={item.id}>
                      <CTableDataCell>{item.productName}</CTableDataCell>
                      <CTableDataCell>{item.unit}</CTableDataCell>
                      <CTableDataCell>
                        ₹{paiseToRupees(item.rate).toFixed(2)}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default ContractDetailPage;

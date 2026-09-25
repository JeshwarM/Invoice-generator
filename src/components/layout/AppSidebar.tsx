import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  CSidebar,
  CSidebarBrand,
  CSidebarNav,
  CSidebarToggler,
  CNavItem,
  CBadge,
  CSidebarHeader,
  CSidebarFooter,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilAccountLogout } from '@coreui/icons';
import { useAuth } from '../../context/AuthContext';
import { getFilteredNavItems } from '../../routes/nav';

interface AppSidebarProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ visible, onVisibleChange }) => {
  const { userProfile, logout } = useAuth();

  const filteredItems = userProfile ? getFilteredNavItems(userProfile.role) : [];

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
  };

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      visible={visible}
      onVisibleChange={onVisibleChange}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand className="d-flex align-items-center text-decoration-none">
          <span className="fs-5 fw-semibold ms-2">AgroBill</span>
        </CSidebarBrand>
      </CSidebarHeader>
      <CSidebarNav>
        {filteredItems.map((item) => (
          <CNavItem key={item.to}>
            <NavLink to={item.to} className="nav-link">
              <CIcon customClassName="nav-icon" icon={item.icon} />
              {item.name}
              {item.badge && (
                <CBadge color={item.badge.color} className="ms-auto">
                  {item.badge.text}
                </CBadge>
              )}
            </NavLink>
          </CNavItem>
        ))}
        <CNavItem>
          <a href="#" className="nav-link" onClick={handleLogout}>
            <CIcon customClassName="nav-icon" icon={cilAccountLogout} />
            Logout
          </a>
        </CNavItem>
      </CSidebarNav>
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler />
      </CSidebarFooter>
    </CSidebar>
  );
};

export default AppSidebar;

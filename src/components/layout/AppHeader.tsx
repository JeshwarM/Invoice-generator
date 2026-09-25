import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import {
  CContainer,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CBreadcrumb,
  CBreadcrumbItem,
  CNavItem,
  CBadge,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CDropdownDivider,
  CHeaderBrand,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMenu, cilUser, cilAccountLogout, cilSettings } from '@coreui/icons';
import { useAuth } from '../../context/AuthContext';

interface AppHeaderProps {
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
}

// Map routes to breadcrumb names
const routeNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/hotels': 'Hotels',
  '/hotels/create': 'Create Hotel',
  '/contracts': 'Contracts',
  '/contracts/create': 'Create Contract',
  '/products': 'Products',
  '/billing': 'Billing',
  '/billing/drafts': 'Draft Bills',
  '/invoices': 'Invoices',
  '/employees': 'Employees',
  '/audit-logs': 'Audit Logs',
  '/settings': 'Settings',
};

const AppHeader: React.FC<AppHeaderProps> = ({ onToggleSidebar }) => {
  const { userProfile, logout } = useAuth();
  const location = useLocation();

  // Build breadcrumbs from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs: { name: string; path: string }[] = [];
  let currentPath = '';
  for (const segment of pathSegments) {
    currentPath += `/${segment}`;
    const name = routeNames[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ name, path: currentPath });
  }

  const handleLogout = async () => {
    await logout();
  };

  const roleBadgeColor = userProfile?.role === 'controller' ? 'danger' : 'info';

  return (
    <CHeader position="sticky" className="mb-2 p-0">
      <CContainer fluid className="px-4">
        <CHeaderToggler onClick={onToggleSidebar}>
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        <CHeaderBrand className="d-md-none">AgroBill</CHeaderBrand>
        <CHeaderNav className="ms-auto d-flex align-items-center">
          {userProfile && (
            <CDropdown variant="nav-item" alignment="end">
              <CDropdownToggle caret={false} className="d-flex align-items-center">
                <CIcon icon={cilUser} size="lg" className="me-2" />
                <span className="d-none d-md-inline me-2">{userProfile.name}</span>
                <CBadge color={roleBadgeColor} shape="rounded-pill" size="sm">
                  {userProfile.role.toUpperCase()}
                </CBadge>
              </CDropdownToggle>
              <CDropdownMenu>
                <CDropdownItem disabled>
                  <strong>{userProfile.name}</strong>
                  <br />
                  <small className="text-body-secondary">{userProfile.email}</small>
                </CDropdownItem>
                <CDropdownDivider />
                <CDropdownItem as={NavLink} to="/settings">
                  <CIcon icon={cilSettings} className="me-2" />
                  Settings
                </CDropdownItem>
                <CDropdownDivider />
                <CDropdownItem onClick={handleLogout} style={{ cursor: 'pointer' }}>
                  <CIcon icon={cilAccountLogout} className="me-2" />
                  Logout
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          )}
        </CHeaderNav>
      </CContainer>
      <CContainer fluid className="px-4">
        <CBreadcrumb className="my-0">
          <CBreadcrumbItem>
            <NavLink to="/dashboard">Home</NavLink>
          </CBreadcrumbItem>
          {breadcrumbs.map((crumb, index) => (
            <CBreadcrumbItem
              key={crumb.path}
              active={index === breadcrumbs.length - 1}
            >
              {index === breadcrumbs.length - 1 ? (
                crumb.name
              ) : (
                <NavLink to={crumb.path}>{crumb.name}</NavLink>
              )}
            </CBreadcrumbItem>
          ))}
        </CBreadcrumb>
      </CContainer>
    </CHeader>
  );
};

export default AppHeader;

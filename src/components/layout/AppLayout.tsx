import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CContainer } from '@coreui/react';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import AppToaster from './AppToaster';

const AppLayout: React.FC = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);

  return (
    <div>
      <AppSidebar visible={sidebarVisible} onVisibleChange={setSidebarVisible} />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader
          sidebarVisible={sidebarVisible}
          onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        />
        <div className="body flex-grow-1">
          <CContainer lg className="px-4 py-3">
            <Outlet />
          </CContainer>
        </div>
        <AppFooter />
      </div>
      <AppToaster />
    </div>
  );
};

export default AppLayout;

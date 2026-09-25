import {
  cilSpeedometer,
  cilBuilding,
  cilDescription,
  cilCart,
  cilFile,
  cilBasket,
  cilPeople,
  cilList,
  cilSettings,
  cilAccountLogout,
} from '@coreui/icons';
import type { UserRole } from '../types';

export interface NavItem {
  name: string;
  to: string;
  icon: string[];
  badge?: { color: string; text: string };
  roles?: UserRole[]; // If not set, accessible to all authenticated users
}

export interface NavGroup {
  name: string;
  items: NavItem[];
  roles?: UserRole[];
}

export type NavEntry = NavItem | NavGroup;

export const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    to: '/dashboard',
    icon: cilSpeedometer,
  },
  {
    name: 'Hotels',
    to: '/hotels',
    icon: cilBuilding,
  },
  {
    name: 'Contracts',
    to: '/contracts',
    icon: cilDescription,
  },
  {
    name: 'Products',
    to: '/products',
    icon: cilBasket,
  },
  {
    name: 'Billing',
    to: '/billing',
    icon: cilCart,
  },
  {
    name: 'Invoices',
    to: '/invoices',
    icon: cilFile,
  },
  {
    name: 'Employees',
    to: '/employees',
    icon: cilPeople,
    roles: ['controller'],
  },
  {
    name: 'Audit Logs',
    to: '/audit-logs',
    icon: cilList,
    roles: ['controller'],
  },
  {
    name: 'Settings',
    to: '/settings',
    icon: cilSettings,
  },
];

export const logoutItem: NavItem = {
  name: 'Logout',
  to: '/logout',
  icon: cilAccountLogout,
};

export function getFilteredNavItems(role: UserRole): NavItem[] {
  return navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  });
}

import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { BranchContext } from '../../context/BranchContext';
import { ROLES } from '../../utils/constants';
import {
  HomeIcon,
  CubeIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowUpTrayIcon,
  InboxStackIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user } = useContext(AuthContext);
  const { activeBranchId } = useContext(BranchContext);

  const navigation = [
    // Manager / Admin only
    { name: 'Dashboard', href: '/', icon: HomeIcon, roles: [ROLES.ADMIN, ROLES.MANAGER], requireBranch: false },
    { name: 'Inventory', href: '/inventory', icon: CubeIcon, roles: [ROLES.ADMIN, ROLES.MANAGER], requireBranch: true },
    { name: 'Issue Materials', href: '/issue', icon: ArrowUpTrayIcon, roles: [ROLES.ADMIN, ROLES.MANAGER], requireBranch: true },
    { name: 'Issue History', href: '/approvals', icon: ClipboardDocumentCheckIcon, roles: [ROLES.ADMIN, ROLES.MANAGER], requireBranch: true },
    { name: 'Transactions', href: '/transactions', icon: ClockIcon, roles: [ROLES.ADMIN, ROLES.MANAGER], requireBranch: true },
    { name: 'Suppliers', href: '/suppliers', icon: UsersIcon, roles: [ROLES.ADMIN, ROLES.MANAGER], requireBranch: true },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, roles: [ROLES.ADMIN, ROLES.MANAGER], requireBranch: true },
    { name: 'Contractor Analytics', href: '/contractor-analytics', icon: UserGroupIcon, roles: [ROLES.ADMIN, ROLES.MANAGER], requireBranch: true },
    // Admin only
    { name: 'Branch Management', href: '/branches', icon: BuildingOffice2Icon, roles: [ROLES.ADMIN], requireBranch: false, allBranchesOnly: true },
    // Shared
    { name: 'Reports', href: '/reports', icon: DocumentTextIcon, roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CONTRACTOR], requireBranch: false },
    // Contractor only
    { name: 'My Issued Materials', href: '/my-issues', icon: InboxStackIcon, roles: [ROLES.CONTRACTOR], requireBranch: true },
  ];

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles.includes(user?.role)) return false;
    // Hide branch-specific pages if admin is viewing "All Branches"
    if (user?.role === 'admin' && !activeBranchId && item.requireBranch) return false;
    // Hide all-branches-only pages (like Branch Management) if admin is viewing a specific branch
    if (user?.role === 'admin' && activeBranchId && item.allBranchesOnly) return false;
    return true;
  });

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-primary-950 to-primary-900 text-white transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 shadow-xl border-r border-white/5 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 shrink-0 items-center px-6 bg-white/5 backdrop-blur-sm border-b border-white/5">
          <CubeIcon className="h-8 w-8 text-primary-500 mr-2" />
          <span className="text-xl font-bold tracking-tight">CMMS</span>
        </div>

        <nav className="flex flex-1 flex-col px-4 py-6 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                `group flex items-center px-3 py-2.5 text-sm font-medium rounded-r-lg transition-all duration-300 border-l-4 ${
                  isActive
                    ? 'bg-primary-500/10 text-primary-300 border-primary-500 shadow-glow'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white border-transparent hover:border-white/20'
                }`
              }
              onClick={() => setIsOpen(false)}
            >
              <item.icon
                className="mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-300 text-slate-400 group-hover:text-white"
                aria-hidden="true"
              />
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 bg-white/5 backdrop-blur-sm mt-auto border-t border-white/5">
          <div className="flex items-center text-sm">
            <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center mr-3 font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="font-medium truncate max-w-[150px]">{user?.name}</p>
              <p className="text-slate-400 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

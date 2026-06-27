import React, { useContext, Fragment } from 'react';
import { Bars3Icon, ArrowRightOnRectangleIcon, BellIcon, BuildingOffice2Icon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../../context/AuthContext';
import { BranchContext } from '../../context/BranchContext';
import { Menu, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';

const Header = ({ setIsOpen }) => {
  const { user, logout } = useContext(AuthContext);
  const { branches, selectedBranch, setSelectedBranch } = useContext(BranchContext);
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch);
    if (branch) {
      navigate(`/admin/branches/${branch._id}/dashboard`);
    } else {
      navigate('/admin/branches');
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-slate-700 lg:hidden focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
        onClick={() => setIsOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="h-6 w-px bg-slate-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center justify-between">

        {/* Branch Selector — Admin only */}
        {isAdmin && (
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              <BuildingOffice2Icon className="h-4 w-4 text-primary-600" />
              <span className="max-w-[180px] truncate">
                {selectedBranch ? selectedBranch.branchName : 'All Branches'}
              </span>
              <ChevronDownIcon className="h-4 w-4 text-slate-400" />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute left-0 z-20 mt-2 w-64 origin-top-left rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-900/10 focus:outline-none">
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Select Branch
                </div>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => handleBranchSelect(null)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-primary-50 text-primary-700' : 'text-slate-700'} ${!selectedBranch ? 'font-semibold text-primary-600' : ''}`}
                    >
                      <BuildingOffice2Icon className="h-4 w-4 text-slate-400" />
                      All Branches
                    </button>
                  )}
                </Menu.Item>
                {branches.map((branch) => (
                  <Menu.Item key={branch._id}>
                    {({ active }) => (
                      <button
                        onClick={() => handleBranchSelect(branch)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-primary-50 text-primary-700' : 'text-slate-700'} ${selectedBranch?._id === branch._id ? 'font-semibold text-primary-600' : ''}`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${branch.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />
                        <span className="truncate">{branch.branchName}</span>
                        <span className="ml-auto text-xs text-slate-400">{branch.location}</span>
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>
        )}

        {/* Manager: show branch name as a badge */}
        {!isAdmin && user?.branchId && (
          <div className="flex items-center gap-2 rounded-lg bg-primary-50 border border-primary-100 px-3 py-1.5 text-sm text-primary-700">
            <BuildingOffice2Icon className="h-4 w-4" />
            <span className="font-medium">{user.branchId.branchName || 'My Branch'}</span>
          </div>
        )}

        <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
          {/* Notification Button */}
          <button type="button" className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500">
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-slate-200" aria-hidden="true" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5">
              <span className="sr-only">Open user menu</span>
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-3 text-sm font-semibold leading-6 text-slate-900" aria-hidden="true">
                  {user?.name}
                </span>
              </span>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-slate-900/5 focus:outline-none">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
                  <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                </div>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={logout}
                      className={`${active ? 'bg-slate-50' : ''} flex w-full items-center px-4 py-2 text-sm text-red-600 font-medium`}
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
};

export default Header;

import React, { useContext } from 'react';
import { Bars3Icon, ArrowRightOnRectangleIcon, BellIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../../context/AuthContext';
import { Menu, Transition } from '@headlessui/react';

const Header = ({ setIsOpen }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-slate-700 lg:hidden focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
        onClick={() => setIsOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator for mobile */}
      <div className="h-6 w-px bg-slate-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          
          {/* Notification Button */}
          <button type="button" className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500">
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
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
              as={React.Fragment}
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
                      className={`
                        ${active ? 'bg-slate-50' : ''}
                        flex w-full items-center px-4 py-2 text-sm text-red-600 font-medium
                      `}
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

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  HomeIcon, 
  ClockIcon, 
  UserIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function BottomNav() {
  const { getHomeRoute } = useAuth();
  const homeRoute = getHomeRoute();

  const navItems = [
    {
      to: homeRoute,
      label: 'Home',
      icon: <HomeIcon />,
    },
    {
      to: '/transactions',
      label: 'Statements',
      icon: <DocumentTextIcon />,
    },
    {
      to: '/profile',
      label: 'Profile',
      icon: <UserIcon />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors
              ${isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`
            }
          >
            <div className="mb-0.5">
              {React.cloneElement(item.icon, { className: 'h-5 w-5' })}
            </div>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

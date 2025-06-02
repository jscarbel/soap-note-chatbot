'use client';

import Link from 'next/link';
import { useState } from 'react';

const publicNav = [
  {
    key: 'logo',
    href: '/',
    label: 'logo',
    imgSrc: '/images/SoapNotesLg.png',
  },
  {
    key: 'About',
    href: '/about',
    label: 'About',
  },
  {
    key: 'Contact',
    href: '/contact',
    label: 'Contact',
  },
  {
    key: 'Login',
    href: '/login',
    label: 'Log in',
    iconClass: 'bg-navButton rounded-full text-hero py-2 px-4',
  },
] as const;

const authenticatedNav = [
  {
    key: 'avatar',
    label: 'J',
    iconClass:
      'bg-gray-500 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold',
  },
  {
    key: 'FAQ',
    href: '/faq',
    label: 'FAQ',
  },
  {
    key: 'Contact',
    href: '/contact',
    label: 'Contact',
  },
  {
    key: 'Logout',
    href: '/logout',
    label: 'Log out',
    iconClass:
      'bg-buttonBackground-400 text-customFont py-2 px-4 rounded hover:bg-buttonBackground-600',
  },
] as const;

export default function Nav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginLogout = () => {
    setIsLoggedIn(!isLoggedIn);
  };

  const navMenuShow = isLoggedIn ? authenticatedNav : publicNav;

  // Helper function to render the left side item
  const renderLeftItem = (
    item: typeof navMenuShow[number]
  ) => {
    switch (item.key) {
      case 'avatar':
        return (
          <div className={item.iconClass}>{item.label}</div>
        );
      case 'logo':
        return (
          <Link href={item.href!}>
            <img src={item.imgSrc} alt="Logo" className="w-12 h-12" />
          </Link>
        );
      default:
        return (
          <Link href={item.href!}>
            <span className="text-2xl font-bold">{item.label}</span>
          </Link>
        );
    }
  };

  // Helper function to render menu items
  const renderMenuItem = (
    item: typeof navMenuShow[number]
  ) => {
    if (item.key === 'avatar' || item.key === 'logo') {
      return null;
    }

    switch (item.key) {
      case 'Login':
      case 'Logout':
        return (
          <button
            onClick={handleLoginLogout}
            className={`${item.iconClass} hover:bg-blue-600`}
          >
            {item.label}
          </button>
        );
      default:
        if ('href' in item) {
          return (
            <Link href={item.href!}>
              <span className="hover:text-gray-400 cursor-pointer">
                {item.label}
              </span>
            </Link>
          );
        }
        return null;
    }
  };

  return (
    <nav className="bg-navBackground-800 border-b border-navBorder-300 p-6 text-customFont w-full top-0 left-0 z-50">
      <div className="flex justify-between items-center max-w-8xl mx-auto">
        {/* Left Side: Logo or Avatar */}
        <div className="flex justify-start items-center space-x-4">
          {renderLeftItem(navMenuShow[0])}
        </div>

        {/* Right Side: Menu Items */}
        <ul className="flex space-x-6">
          {navMenuShow.map((item) => (
            <li key={item.key}>{renderMenuItem(item)}</li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

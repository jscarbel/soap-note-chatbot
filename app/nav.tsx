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
    iconClass: 'bg-soap-gray-800 rounded-full text-soap-gray-50 py-2 px-4',
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
      'bg-soap-slate-100 text-soap-slate-800 py-2 px-4 rounded hover:bg-soap-slate-200',
  },
] as const;

export default function Nav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginLogout = () => {
    setIsLoggedIn(!isLoggedIn);
  };

  const navMenuShow = isLoggedIn ? authenticatedNav : publicNav;

  const renderLeftItem = (item: (typeof navMenuShow)[number]) => {
    switch (item.key) {
      case 'avatar':
        return <div className={item.iconClass}>{item.label}</div>;
      case 'logo':
        return (
          <Link href={item.href!}>
            <img src={item.imgSrc} alt="Logo" className="h-12 w-12" />
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

  const renderMenuItem = (item: (typeof navMenuShow)[number]) => {
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
              <span className="cursor-pointer hover:text-gray-400">
                {item.label}
              </span>
            </Link>
          );
        }
        return null;
    }
  };

  return (
    <nav className="bg-soap-white border-soap-gray-200 left-0 top-0 z-50 w-full border-b p-6 text-soap-slate-800">
      <div className="max-w-8xl mx-auto flex items-center justify-between">
        {/* Left Side: Logo or Avatar */}
        <div className="flex items-center justify-start space-x-4">
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

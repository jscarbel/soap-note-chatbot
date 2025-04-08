'use client';

import Link from 'next/link';
import { useState } from 'react';

const publicNav = [
  {
    key: 'logo',
    href: '/images/SoapNotesLg.png',
    label: 'logo',
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
];

//update with dynamic user data someday
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
];

export default function Nav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginLogout = () => {
    setIsLoggedIn(!isLoggedIn);
  };

  const navMenuShow = isLoggedIn ? authenticatedNav : publicNav;

  return (
    <nav className="bg-navBackground-800 p-8 text-customFont w-full top-0 left-0 z-50">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        {/* Left Side: Logo or Avatar */}
        <div className="flex justify-start items-center space-x-4">
          {navMenuShow[0].key === 'avatar' ? (
            <div className={navMenuShow[0].iconClass}>
              {navMenuShow[0].label}
            </div>
          ) : navMenuShow[0].key === 'logo' ? (
            // Render the favicon image when it's the logo
            <Link href={navMenuShow[0].href || '/'}>
              <img src={navMenuShow[0].href} alt="Logo" className="w-8 h-8" />
            </Link>
          ) : (
            <Link href={navMenuShow[0].href || '/'}>
              <span className="text-2xl font-bold">{navMenuShow[0].label}</span>
            </Link>
          )}
        </div>

        {/* Right Side: Menu Items */}
        <ul className="flex space-x-6">
          {navMenuShow.map((item) => {
            if (item.key === 'avatar' || item.key === 'logo') {
              // Skip rendering avatar as a link
              return null;
            }

            return (
              <li key={item.key}>
                {item.key === 'Login' || item.key === 'Logout' ? (
                  <button
                    onClick={handleLoginLogout}
                    className={`${item.iconClass} hover:bg-blue-600`}
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="hover:text-gray-400">{item.label}</span> // Just text for now
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

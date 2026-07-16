import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

/**
 * Main Layout Component
 * Provides the base layout structure for all pages
 */
const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar className="fixed top-0 w-full z-50" />
      <main className="flex-grow pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
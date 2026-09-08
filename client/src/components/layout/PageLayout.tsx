import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MayaWidget } from '../maya/MayaWidget';

interface PageLayoutProps {
  children?: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col selection:bg-sky-100 selection:text-sky-700">
      {/* Show standard Apple navbar on all pages except the immersive HomePage */}
      {!isHomePage && <Navbar />}
      
      <main className="flex-1 w-full">
        {children ? children : <Outlet />}
      </main>
      
      <Footer />

      {/* Maya Scientific Assistant */}
      <MayaWidget />
    </div>
  );
};

export default PageLayout;

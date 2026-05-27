import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './assets/Logo.png'

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-bg-rose-white">
      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile Top Header (hidden on large displays) */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-primary-mauve/10 lg:hidden shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-dark hover:bg-bg-rose-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center">
              <img  className="block -mr-2" src={Logo}  style={{width:"50px", height:"40px",paddingRight:"0px",margin:"-12px"}}/>
              <span className="font-sans font-extrabold text-lg tracking-tight text-text-dark" style={{paddingRight:"0px"}}>
                aterna<span className="text-primary-mauve">AI</span>
              </span>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-secondary-blush/20 flex items-center justify-center text-sm font-bold text-primary-mauve">
            {user?.role === 'clinician' ? '🩺' : '🤰'}
          </div>
        </header>

        {/* Dynamic Page Canvas */}
        <main className="flex-1 overflow-y-auto focus:outline-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

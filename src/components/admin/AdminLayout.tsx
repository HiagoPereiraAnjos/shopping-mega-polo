import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-paper">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:text-brand-dark focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-xl focus:border focus:border-brand-dark/20"
      >
        Pular para o conteúdo administrativo
      </a>
      <div className="flex min-h-screen overflow-x-clip">
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="flex-1 min-w-0">
          <AdminHeader onOpenSidebar={() => setIsSidebarOpen(true)} />
          <main id="admin-main-content" tabIndex={-1} className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

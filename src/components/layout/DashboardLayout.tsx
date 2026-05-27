import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  BarChart3,
  Store,
  ImageIcon, 
  PlusSquare, 
  BookOpen, 
  Users, 
  PieChart, 
  LogOut, 
  Menu, 
  Bell,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { ImageWithFallback } from '../ui/ImageWithFallback';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
  key?: string;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: SidebarItemProps) => (
  <button 
    onClick={onClick}
    aria-label={label}
    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-[10px] tracking-brand font-bold uppercase transition-all relative group ${
      active ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-white/40 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-white/40 group-hover:text-white transition-colors'}`} />
    {!collapsed && <span>{label}</span>}
    {collapsed && (
      <div className="absolute left-full ml-4 px-3 py-2 bg-brand-dark text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
        {label}
      </div>
    )}
  </button>
);

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function DashboardLayout({ children, activeTab, setActiveTab }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();

  const menuItems = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'store-data', label: 'Dados da Loja', icon: Store },
    { id: 'vitrine', label: 'Fotos e Vitrine', icon: ImageIcon },
    { id: 'launches', label: 'Lançamentos', icon: PlusSquare },
    { id: 'catalog', label: 'Catálogo', icon: BookOpen },
    { id: 'leads', label: 'Leads Recebidos', icon: Users },
    { id: 'stats', label: 'Estatísticas', icon: PieChart },
  ];

  const handleLogout = async () => {
    setLogoutError(null);
    const result = await signOut();

    if (result.error) {
      setLogoutError(result.error);
      return;
    }

    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex overflow-hidden">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside id="dashboard-sidebar" className={`fixed inset-y-0 left-0 z-50 w-72 bg-brand-dark transform transition-transform duration-300 lg:translate-x-0 lg:static lg:block ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col justify-between py-10 px-8">
          <div className="space-y-12">
            <Link to="/" className="block">
              <ImageWithFallback
                src="/images/logo-mega-polo.png" 
                alt="Mega Polo Moda" 
                className="h-16 w-auto object-contain brightness-0 invert"
                width={220}
                height={64}
                loading="eager"
              />
              <span className="block text-[8px] tracking-[0.3em] uppercase -mt-1 text-brand-gold font-bold italic">Portal do Lojista</span>
            </Link>

            <nav className="space-y-2">
              {menuItems.map((item) => (
                <SidebarItem 
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                />
              ))}
            </nav>
          </div>

          <div className="space-y-3">
            {logoutError && (
              <p className="text-[10px] text-red-300 font-bold uppercase tracking-brand px-4" role="alert">
                {logoutError}
              </p>
            )}
            <button 
              onClick={handleLogout}
              aria-label="Sair do portal do lojista"
              className="flex items-center gap-4 px-4 py-3 text-white/40 hover:text-brand-red transition-all text-[10px] tracking-brand font-bold uppercase"
            >
              <LogOut className="w-5 h-5" />
              Sair do Portal
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-grow flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-brand-dark/5 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 lg:hidden"
              aria-label="Abrir menu lateral"
              aria-expanded={isSidebarOpen}
              aria-controls="dashboard-sidebar"
            >
              <Menu className="w-6 h-6 text-brand-dark" />
            </button>
            <div className="relative hidden md:block">
              <label htmlFor="dashboard-search" className="sr-only">Buscar por pedidos ou leads</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/20" />
              <input 
                id="dashboard-search"
                type="text" 
                placeholder="Busca por pedidos, leads..." 
                className="bg-brand-paper py-2.5 pl-10 pr-6 rounded-full text-xs font-sans focus:outline-none focus:ring-1 focus:ring-brand-red/10 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-8">
             <div className="flex items-center gap-2">
                <button className="p-2.5 bg-brand-paper hover:bg-brand-red/5 rounded-full relative transition-all group" aria-label="Notificações">
                  <Bell className="w-5 h-5 text-brand-dark/40 group-hover:text-brand-red transition-colors" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-brand-red rounded-full" />
                </button>
             </div>
             
              <div className="flex items-center gap-4 pl-4 lg:pl-8 border-l border-brand-dark/5">
                 <div className="text-right hidden sm:block">
                   <p className="text-xs font-bold text-brand-dark">{profile?.name ?? user?.email ?? 'Usuário'}</p>
                   <p className="text-xs text-brand-dark/60 font-sans tracking-tight uppercase">
                     {profile?.role ?? 'Administrador'}
                   </p>
                 </div>
                <div className="w-10 h-10 bg-brand-red text-white flex items-center justify-center font-serif text-lg rounded-full shadow-lg border-2 border-white">
                   RF
                </div>
             </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-grow overflow-y-auto p-6 lg:p-12">
           {children}
        </main>
      </div>
    </div>
  );
}

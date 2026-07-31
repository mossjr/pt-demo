import React from 'react';
import { LogOut, LayoutGrid, ChevronRight, BarChart3, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentModule: string | null; // null = Main Hub, string = Module Title
  onBackToHub: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentModule, onBackToHub, onLogout }) => {
  return (
    <header className="bg-[#0d2045] border-b border-[#3f7abb]/30 sticky top-0 z-30 shadow-md text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo & Navigation Breadcrumb */}
        <div className="flex items-center space-x-4">
          <button
            id="brand-logo-btn"
            onClick={onBackToHub}
            className="flex items-center space-x-3 hover:opacity-90 transition-opacity focus:outline-none"
            title="Return to Main Ecosystem Hub"
          >
            <img
              src="https://profitabletradie.com/wp-content/uploads/2023/10/logo-100-41.svg"
              alt="Profitable Tradie Logo"
              className="h-9 w-auto object-contain"
            />
          </button>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-300 border-l border-[#3f7abb]/30 pl-4">
            <button
              id="breadcrumb-hub-btn"
              onClick={onBackToHub}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded transition-colors ${
                !currentModule ? 'bg-[#3f7abb]/30 text-white font-semibold' : 'hover:bg-[#3f7abb]/20 text-slate-300'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#ecdf51]" />
              <span>App Hub</span>
            </button>

            {currentModule && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#3f7abb] text-white font-semibold">
                  <BarChart3 className="w-3.5 h-3.5 text-[#ecdf51]" />
                  <span>{currentModule}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Security Status & Logout */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-[#122852] border border-[#3f7abb]/40 rounded-full text-xs text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-[#ecdf51]" />
            <span>Protected (`APP_PASSWORD`)</span>
          </div>

          <button
            id="logout-btn"
            onClick={onLogout}
            className="px-3 py-1.5 bg-[#122852] hover:bg-red-500/20 hover:border-red-500/50 border border-[#3f7abb]/40 text-slate-200 hover:text-red-300 rounded-lg transition-all text-xs font-medium flex items-center space-x-1.5 focus:outline-none"
            title="Lock application and return to login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

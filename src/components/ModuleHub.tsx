import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  PieChart,
  FileText,
  ArrowRight,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ModuleInfo } from '../types';

interface ModuleHubProps {
  onSelectModule: (moduleId: string) => void;
  onSelectDummyModule: (module: ModuleInfo) => void;
}

const MODULES_DATA: ModuleInfo[] = [
  {
    id: 'sales-pipeline',
    title: 'Sales Pipeline Analysis',
    description: 'Dynamic CSV pipeline parser, sales rep quota tracking, stalled deal warnings & stage bottleneck analytics.',
    iconName: 'TrendingUp',
    category: 'Sales & Revenue',
    isActive: true,
    statsPreview: '46 Deals Active • Live CSV Parser',
  },
  {
    id: 'financials',
    title: 'Financials & Profit Margins',
    description: 'Real-time job cost accounting, overhead allocation, gross profit margin analysis & cash flow forecasting.',
    iconName: 'DollarSign',
    category: 'Finance & Accounting',
    isActive: false,
    badge: 'Coming Soon',
    statsPreview: 'Q3 Financial Engine • In Development',
  },
  {
    id: 'job-scheduling',
    title: 'Job Scheduling & Dispatch',
    description: 'Interactive fleet dispatch, tradie field routing, drag-and-drop site calendar & real-time travel updates.',
    iconName: 'Calendar',
    category: 'Operations',
    isActive: false,
    badge: 'Coming Soon',
    statsPreview: 'GPS & Route Optimizer • In Development',
  },
  {
    id: 'marketing-roi',
    title: 'Marketing ROI & Lead Attribution',
    description: 'Track lead source channels (Google, Meta, Word of Mouth), customer acquisition cost & campaign ROI.',
    iconName: 'PieChart',
    category: 'Growth & Marketing',
    isActive: false,
    badge: 'Coming Soon',
    statsPreview: 'Channel Attribution • In Development',
  },
  {
    id: 'client-portal',
    title: 'Client Portal & Automated Quoting',
    description: 'Instant mobile quotes, digital client approval signatures, deposit collection & automated job invoicing.',
    iconName: 'FileText',
    category: 'Client Experience',
    isActive: false,
    badge: 'Coming Soon',
    statsPreview: 'E-Signatures & Invoicing • In Development',
  },
];

export const ModuleHub: React.FC<ModuleHubProps> = ({
  onSelectModule,
  onSelectDummyModule,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const filteredModules = MODULES_DATA.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'TrendingUp':
        return <TrendingUp className="w-6 h-6 text-[#ecdf51]" />;
      case 'DollarSign':
        return <DollarSign className="w-6 h-6 text-[#3f7abb]" />;
      case 'Calendar':
        return <Calendar className="w-6 h-6 text-[#3f7abb]" />;
      case 'PieChart':
        return <PieChart className="w-6 h-6 text-[#3f7abb]" />;
      case 'FileText':
        return <FileText className="w-6 h-6 text-[#3f7abb]" />;
      default:
        return <TrendingUp className="w-6 h-6 text-[#ecdf51]" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Ecosystem Hero Banner */}
      <div className="bg-[#0d2045] rounded-3xl p-8 border border-[#3f7abb]/40 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#3f7abb]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-60 h-60 bg-[#ecdf51]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#3f7abb]/30 border border-[#3f7abb]/50 rounded-full text-xs font-semibold text-[#ecdf51]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Profitable Tradie Ecosystem v2.4</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Business Management Hub
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Centralized platform for trade business intelligence. Select a module below to launch its dedicated suite.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#122852] p-4 rounded-2xl border border-[#3f7abb]/30 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search modules..."
            className="w-full pl-10 pr-4 py-2 bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#3f7abb]"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'Sales & Revenue', 'Finance & Accounting', 'Operations', 'Growth & Marketing'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#3f7abb] text-white shadow-md'
                  : 'bg-[#0d2045] text-slate-300 hover:bg-[#1f3a6e]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map((module) => (
          <div
            key={module.id}
            id={`module-card-${module.id}`}
            onClick={() => {
              if (module.isActive) {
                onSelectModule(module.id);
              } else {
                onSelectDummyModule(module);
              }
            }}
            className={`group rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden border ${
              module.isActive
                ? 'bg-[#122852] border-[#3f7abb] hover:border-[#ecdf51] shadow-xl hover:shadow-[#3f7abb]/20 hover:-translate-y-1'
                : 'bg-[#0d2045]/80 border-[#3f7abb]/20 hover:border-[#3f7abb]/50 opacity-80 hover:opacity-100'
            }`}
          >
            {/* Top Row: Icon & Status Badge */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-xl ${
                    module.isActive
                      ? 'bg-[#0d2045] border border-[#3f7abb]/50 shadow-inner'
                      : 'bg-[#122852] border border-[#3f7abb]/30'
                  }`}
                >
                  {getModuleIcon(module.iconName)}
                </div>

                {module.isActive ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#ecdf51]/20 border border-[#ecdf51]/50 text-[#ecdf51]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active Suite</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#3f7abb]/20 border border-[#3f7abb]/40 text-[#3f7abb]">
                    <Clock className="w-3 h-3 text-[#ecdf51]" />
                    <span>{module.badge || 'Coming Soon'}</span>
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#ecdf51] transition-colors flex items-center space-x-2">
                <span>{module.title}</span>
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed mb-4">
                {module.description}
              </p>
            </div>

            {/* Bottom Row: Stats Preview & Action CTA */}
            <div className="pt-4 border-t border-[#3f7abb]/20 flex items-center justify-between mt-2">
              <span className="text-[11px] font-medium text-slate-400">
                {module.statsPreview}
              </span>

              {module.isActive ? (
                <div className="flex items-center space-x-1 text-xs font-bold text-[#ecdf51] group-hover:translate-x-1 transition-transform">
                  <span>Launch Suite</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-xs font-medium text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

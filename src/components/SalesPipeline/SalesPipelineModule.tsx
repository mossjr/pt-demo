import React, { useState, useMemo } from 'react';
import { Deal, FilterState, SalesRepTarget, FxConfig, IMMUTABLE_CANONICAL_STAGES } from '../../types';
import { parseSalesDataCsv, DEFAULT_STAGE_NORMALIZATION } from '../../utils/csvParser';
import {
  computePipelineMetrics,
  computeRepPerformance,
  computeStageSummaries,
  computeReconciliationSummary,
  filterDeals,
  extractAvailableMonths,
  DEFAULT_REP_TARGETS,
  DEFAULT_FX_CONFIG,
} from '../../utils/analytics';
import { FileUploadDropzone } from './FileUploadDropzone';
import { KpiCards } from './KpiCards';
import { RepPerformanceWidget } from './RepPerformanceWidget';
import { StalledDealsWidget } from './StalledDealsWidget';
import { StagePipelineWidget } from './StagePipelineWidget';
import { PipelineSankeyWidget } from './PipelineSankeyWidget';
import { DataExplorerTable } from './DataExplorerTable';
import { SetupTargetsAndFxModal } from './SetupTargetsAndFxModal';
import { DataReconciliationWidget } from './DataReconciliationWidget';
import { PreImportValidationModal } from './PreImportValidationModal';
import {
  Filter,
  BarChart2,
  AlertTriangle,
  Award,
  Layers,
  Database,
  ArrowLeft,
  RotateCcw,
  GitMerge,
  Sliders,
  ShieldCheck,
  UploadCloud,
  FileCheck2,
  ShieldAlert,
  CheckCircle2,
  Table,
  Calendar,
  CalendarDays,
} from 'lucide-react';

interface SalesPipelineModuleProps {
  onBackToHub: () => void;
}

export const SalesPipelineModule: React.FC<SalesPipelineModuleProps> = ({ onBackToHub }) => {
  const [cleanDeals, setCleanDeals] = useState<Deal[]>([]);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Pre-import validation state
  const [pendingCsvContent, setPendingCsvContent] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);

  const [stalledThresholdDays, setStalledThresholdDays] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'sankey' | 'reps' | 'audit' | 'stalled' | 'stages' | 'setup' | 'raw'
  >('overview');

  // Targets & FX State with LocalStorage persistence
  const [targets, setTargets] = useState<SalesRepTarget[]>(() => {
    try {
      const saved = localStorage.getItem('sales_rep_targets');
      return saved ? JSON.parse(saved) : DEFAULT_REP_TARGETS;
    } catch {
      return DEFAULT_REP_TARGETS;
    }
  });

  const [fxConfig, setFxConfig] = useState<FxConfig>(() => {
    try {
      const saved = localStorage.getItem('sales_fx_config');
      return saved ? JSON.parse(saved) : DEFAULT_FX_CONFIG;
    } catch {
      return DEFAULT_FX_CONFIG;
    }
  });

  const [stageMappings, setStageMappings] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('sales_stage_mappings');
      return saved ? JSON.parse(saved) : DEFAULT_STAGE_NORMALIZATION;
    } catch {
      return DEFAULT_STAGE_NORMALIZATION;
    }
  });

  const handleSaveTargets = (newTargets: SalesRepTarget[]) => {
    setTargets(newTargets);
    try {
      localStorage.setItem('sales_rep_targets', JSON.stringify(newTargets));
    } catch (e) {
      console.error('Failed to save targets to localStorage', e);
    }
  };

  const handleSaveFxConfig = (newFxConfig: FxConfig) => {
    setFxConfig(newFxConfig);
    try {
      localStorage.setItem('sales_fx_config', JSON.stringify(newFxConfig));
    } catch (e) {
      console.error('Failed to save fxConfig to localStorage', e);
    }
  };

  const handleSaveStageMappings = (newMappings: Record<string, string>) => {
    setStageMappings(newMappings);
    try {
      localStorage.setItem('sales_stage_mappings', JSON.stringify(newMappings));
    } catch (e) {
      console.error('Failed to save stageMappings to localStorage', e);
    }
  };

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    salesRep: 'ALL',
    currency: 'ALL',
    dealStage: 'ALL',
    dealStatus: 'ALL',
    stalledThresholdDays: 30,
    searchQuery: '',
    selectedMonth: 'ALL',
    startDate: '',
    endDate: '',
    dateField: 'expectedCloseDate',
  });

  // Handle new CSV upload -> Opens Pre-Import Validation Modal
  const handleCsvLoaded = (text: string, name: string) => {
    setPendingCsvContent(text);
    setPendingFileName(name);
    setShowValidationModal(true);
  };

  const handleApproveImport = (approvedDeals: Deal[]) => {
    setCleanDeals(approvedDeals);
    setFileName(pendingFileName);
    setCsvContent(pendingCsvContent);
    setPendingCsvContent(null);
    setPendingFileName(null);
    setShowValidationModal(false);
  };

  const handleCancelImport = () => {
    setPendingCsvContent(null);
    setPendingFileName(null);
    setShowValidationModal(false);
  };

  // Active Deals
  const allDeals: Deal[] = useMemo(() => {
    if (cleanDeals.length > 0) return cleanDeals;
    if (!csvContent) return [];
    return parseSalesDataCsv(csvContent, stalledThresholdDays, stageMappings);
  }, [cleanDeals, csvContent, stalledThresholdDays, stageMappings]);

  // Distinct Filter options
  const repList = useMemo(() => {
    const reps = new Set<string>();
    allDeals.forEach((d) => reps.add(d.salesRep));
    return Array.from(reps).sort();
  }, [allDeals]);

  const currencyList = useMemo(() => {
    const currs = new Set<string>();
    allDeals.forEach((d) => currs.add(d.currency.toUpperCase()));
    return Array.from(currs).sort();
  }, [allDeals]);

  const stageList = useMemo(() => {
    const stages = new Set<string>();
    allDeals.forEach((d) => stages.add(d.dealStage));
    return Array.from(stages).sort();
  }, [allDeals]);

  const availableMonths = useMemo(() => {
    return extractAvailableMonths(allDeals, filters.dateField || 'expectedCloseDate');
  }, [allDeals, filters.dateField]);

  // Filtered Deals
  const filteredDealsList = useMemo(() => {
    return filterDeals(allDeals, filters);
  }, [allDeals, filters]);

  // Active reporting currency
  const activeCurrency =
    filters.currency !== 'ALL' ? filters.currency : fxConfig.baseCurrency || 'AUD';

  // Analytics Computation
  const metrics = useMemo(() => {
    return computePipelineMetrics(filteredDealsList);
  }, [filteredDealsList]);

  const repPerformance = useMemo(() => {
    return computeRepPerformance(filteredDealsList, targets, fxConfig, activeCurrency);
  }, [filteredDealsList, targets, fxConfig, activeCurrency]);

  const stageSummaries = useMemo(() => {
    return computeStageSummaries(filteredDealsList);
  }, [filteredDealsList]);

  const stalledDeals = useMemo(() => {
    return filteredDealsList.filter((d) => d.isStalled);
  }, [filteredDealsList]);

  const reconciliationSummary = useMemo(() => {
    return computeReconciliationSummary(filteredDealsList, fxConfig, activeCurrency);
  }, [filteredDealsList, fxConfig, activeCurrency]);

  const resetFilters = () => {
    setFilters({
      salesRep: 'ALL',
      currency: 'ALL',
      dealStage: 'ALL',
      dealStatus: 'ALL',
      stalledThresholdDays: 30,
      searchQuery: '',
      selectedMonth: 'ALL',
      startDate: '',
      endDate: '',
      dateField: 'expectedCloseDate',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Validation Modal */}
      {showValidationModal && pendingCsvContent && (
        <PreImportValidationModal
          csvContent={pendingCsvContent}
          fileName={pendingFileName || 'Uploaded_Sales_Data.csv'}
          stalledThresholdDays={stalledThresholdDays}
          stageMappings={stageMappings}
          knownReps={targets.map((t) => t.repName)}
          onApproveImport={handleApproveImport}
          onCancelImport={handleCancelImport}
        />
      )}

      {/* Module Navigation Header */}
      <div className="flex flex-col gap-4 bg-[#0d2045] p-5 rounded-2xl border border-[#3f7abb]/30 shadow-lg text-white">
        <div className="flex items-center space-x-3 pb-3 border-b border-[#3f7abb]/20">
          <button
            id="back-to-hub-btn"
            onClick={onBackToHub}
            className="p-2.5 bg-[#122852] hover:bg-[#3f7abb]/30 border border-[#3f7abb]/40 rounded-xl text-[#ecdf51] transition-colors"
            title="Return to Main Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline Analysis</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Dynamic real-time sales pipeline performance, rep quota tracking & stalled deal warnings
            </p>
          </div>
        </div>

        {/* View Tabs - Always accessible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 bg-[#122852] p-2 rounded-xl border border-[#3f7abb]/30 w-full">
          {[
            { id: 'overview', label: 'Executive Dashboard', icon: BarChart2 },
            { id: 'sankey', label: 'Sankey Flow', icon: GitMerge },
            { id: 'reps', label: 'Rep Performance', icon: Award },
            { id: 'audit', label: 'Data Audit', icon: ShieldCheck, badge: reconciliationSummary.flaggedRowsCount },
            { id: 'stalled', label: 'Stalled Deals', icon: AlertTriangle },
            { id: 'stages', label: 'Stages & Funnel', icon: Layers },
            { id: 'setup', label: 'Targets & FX', icon: Sliders },
            { id: 'raw', label: 'Data Explorer', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#3f7abb] text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-[#0d2045]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#ecdf51]' : 'text-slate-400'}`} />
                <span className="truncate">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 bg-[#ecdf51] text-[#0d2045] font-extrabold text-[10px] rounded-full font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CSV Uploader Bar */}
      <FileUploadDropzone
        onCsvLoaded={handleCsvLoaded}
        currentFileName={fileName}
        dealCount={allDeals.length}
      />

      {/* SETUP VIEW (Always accessible even without deals loaded) */}
      {activeTab === 'setup' ? (
        <SetupTargetsAndFxModal
          targets={targets}
          fxConfig={fxConfig}
          stageMappings={stageMappings}
          onSaveTargets={handleSaveTargets}
          onSaveFxConfig={handleSaveFxConfig}
          onSaveStageMappings={handleSaveStageMappings}
        />
      ) : allDeals.length === 0 ? (
        /* UNLOADED INITIAL STATE VIEW */
        <div className="space-y-6">
          <div className="bg-[#122852] border border-[#3f7abb]/40 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 bg-[#0d2045] border border-[#ecdf51]/40 rounded-2xl flex items-center justify-center mx-auto text-[#ecdf51] shadow-lg">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="max-w-xl mx-auto space-y-2">
              <h2 className="text-xl font-extrabold text-white">Upload Sales Pipeline Data</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Upload your pipeline CSV spreadsheet to trigger automated data validation, stage normalization, and multi-currency reporting.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('setup')}
                  className="px-4 py-2 bg-[#0d2045] hover:bg-[#3f7abb]/40 border border-[#ecdf51]/40 text-[#ecdf51] font-bold rounded-xl text-xs inline-flex items-center space-x-2 transition-all shadow-md"
                >
                  <Sliders className="w-4 h-4 text-[#ecdf51]" />
                  <span>Configure Agent Targets, FX Setup & Stages List</span>
                </button>
              </div>
            </div>

            {/* Validation & Import Safeguards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto pt-2">
              <div className="p-4 bg-[#0d2045] border border-[#3f7abb]/30 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-[#ecdf51] text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Immutable Canonical Stages</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Stages are validated against immutable canonical stages (Discovery, Qualified, Proposal Sent, Negotiation, Closed Won, Closed Lost).
                </p>
              </div>

              <div className="p-4 bg-[#0d2045] border border-[#3f7abb]/30 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-[#38bdf8] text-xs font-bold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Pre-Import Data Audit</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Flags missing rep names, negative values, missing closed won contract values, and stage typos before loading.
                </p>
              </div>

              <div className="p-4 bg-[#0d2045] border border-[#3f7abb]/30 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                  <FileCheck2 className="w-4 h-4" />
                  <span>Interactive Error Cleaning</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Each flagged record gives you the option to <strong>Fix Error</strong>, <strong>Ignore Warning</strong>, or <strong>Cancel Run</strong>.
                </p>
              </div>
            </div>

            {/* Expected CSV Columns Reference */}
            <div className="bg-[#0d2045] border border-[#3f7abb]/30 rounded-xl p-4 max-w-4xl mx-auto text-left space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
                <Table className="w-4 h-4 text-[#ecdf51]" />
                <span>Expected CSV Headers & Canonical Stages Reference</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-[#ecdf51] uppercase tracking-wider block mb-1">
                    Expected CSV Column Headers:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Deal ID',
                      'Client Name',
                      'Sales Rep',
                      'Deal Stage',
                      'Deal Value',
                      'Currency',
                      'Date Created',
                      'Date Entered Current Stage',
                      'Expected Close Date',
                      'Last Activity Date',
                      'Deal Status',
                    ].map((hdr) => (
                      <span key={hdr} className="px-2 py-0.5 bg-[#122852] border border-[#3f7abb]/40 rounded text-[11px] font-mono text-slate-200">
                        {hdr}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#ecdf51] uppercase tracking-wider block mb-1">
                    Immutable Canonical Stages:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {IMMUTABLE_CANONICAL_STAGES.map((stg) => (
                      <span key={stg} className="px-2 py-0.5 bg-[#122852] border border-[#ecdf51]/30 rounded text-[11px] font-bold text-emerald-300">
                        {stg}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <>
          {/* Interactive Global Filters Bar */}
          <div className="bg-[#122852] p-4 rounded-2xl border border-[#3f7abb]/30 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-[#3f7abb]/20 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
                <Filter className="w-4 h-4 text-[#ecdf51]" />
                <span>Interactive Filter Controls</span>
              </div>

              <button
                onClick={resetFilters}
                className="text-xs text-slate-300 hover:text-[#ecdf51] flex items-center space-x-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Sales Rep Filter */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Sales Rep:</label>
                <select
                  value={filters.salesRep}
                  onChange={(e) => setFilters({ ...filters, salesRep: e.target.value })}
                  className="w-full bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#3f7abb]"
                >
                  <option value="ALL">All Reps ({repList.length})</option>
                  {repList.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency Filter */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Reporting Currency:</label>
                <select
                  value={filters.currency}
                  onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
                  className="w-full bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#3f7abb]"
                >
                  <option value="ALL">Base ({fxConfig.baseCurrency || 'AUD'})</option>
                  {currencyList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deal Stage Filter */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Deal Stage:</label>
                <select
                  value={filters.dealStage}
                  onChange={(e) => setFilters({ ...filters, dealStage: e.target.value })}
                  className="w-full bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#3f7abb]"
                >
                  <option value="ALL">All Stages</option>
                  {stageList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deal Status Filter */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Deal Status:</label>
                <select
                  value={filters.dealStatus}
                  onChange={(e) => setFilters({ ...filters, dealStatus: e.target.value })}
                  className="w-full bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#3f7abb]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Open">Open Deals</option>
                  <option value="Won">Closed Won</option>
                  <option value="Lost">Closed Lost</option>
                </select>
              </div>
            </div>

            {/* Date Range Isolator & Month Target Manager Controls */}
            <div className="pt-3 border-t border-[#3f7abb]/20 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#ecdf51]">
                  <Calendar className="w-3.5 h-3.5 text-[#ecdf51]" />
                  <span>Date Range Isolator & Monthly Target Manager</span>
                </div>

                {/* Date Field Basis Selector */}
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-300 font-medium">Evaluate Basis:</span>
                  <select
                    value={filters.dateField}
                    onChange={(e) => setFilters({ ...filters, dateField: e.target.value as any })}
                    className="bg-[#0d2045] border border-[#3f7abb]/40 rounded-lg px-2.5 py-1 text-white text-xs font-semibold focus:outline-none"
                  >
                    <option value="expectedCloseDate">Expected Close Date (Default)</option>
                    <option value="dateCreated">Date Created</option>
                    <option value="lastActivityDate">Last Activity Date</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
                {/* Month Isolator */}
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Target Month Isolator:</label>
                  <select
                    value={filters.selectedMonth}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFilters({
                        ...filters,
                        selectedMonth: val,
                        startDate: '',
                        endDate: '',
                      });
                    }}
                    className="w-full bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#3f7abb]"
                  >
                    <option value="ALL">All Months ({availableMonths.length} available)</option>
                    {availableMonths.map((m) => (
                      <option key={m.monthKey} value={m.monthKey}>
                        {m.label} ({m.monthKey})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Start Date */}
                <div>
                  <label className="block text-slate-300 mb-1 font-medium font-mono">Start Date:</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      setFilters({
                        ...filters,
                        startDate: e.target.value,
                        selectedMonth: 'ALL',
                      });
                    }}
                    className="w-full bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-[#3f7abb]"
                  />
                </div>

                {/* Custom End Date */}
                <div>
                  <label className="block text-slate-300 mb-1 font-medium font-mono">End Date:</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      setFilters({
                        ...filters,
                        endDate: e.target.value,
                        selectedMonth: 'ALL',
                      });
                    }}
                    className="w-full bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-[#3f7abb]"
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Quick Date Isolation Presets:</label>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setFilters({ ...filters, selectedMonth: 'ALL', startDate: '', endDate: '' })}
                      className="px-2.5 py-1 bg-[#0d2045] hover:bg-[#3f7abb]/30 border border-[#3f7abb]/40 rounded-lg text-slate-200 text-[11px] font-medium transition-colors"
                    >
                      All Time
                    </button>
                    {availableMonths.slice(0, 3).map((m) => (
                      <button
                        key={m.monthKey}
                        onClick={() => setFilters({ ...filters, selectedMonth: m.monthKey, startDate: '', endDate: '' })}
                        className={`px-2.5 py-1 border rounded-lg text-[11px] font-bold transition-colors ${
                          filters.selectedMonth === m.monthKey
                            ? 'bg-[#3f7abb] text-white border-[#3f7abb]'
                            : 'bg-[#0d2045] text-[#ecdf51] border-[#3f7abb]/40 hover:bg-[#3f7abb]/30'
                        }`}
                      >
                        {m.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Date Isolation Indicator */}
              {(filters.selectedMonth !== 'ALL' || filters.startDate || filters.endDate) && (
                <div className="mt-2 p-2.5 bg-[#0d2045] border border-[#ecdf51]/40 rounded-xl flex items-center justify-between text-xs text-slate-200 shadow-inner">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="w-4 h-4 text-[#ecdf51] shrink-0" />
                    <span>
                      <strong className="text-white">Active Date Isolator:</strong> Filtering by{' '}
                      <span className="text-[#ecdf51] font-semibold">
                        {filters.dateField === 'expectedCloseDate'
                          ? 'Expected Close Date'
                          : filters.dateField === 'dateCreated'
                          ? 'Date Created'
                          : 'Last Activity Date'}
                      </span>{' '}
                      {filters.selectedMonth !== 'ALL' && (
                        <span className="font-mono bg-[#122852] px-2 py-0.5 rounded text-[#ecdf51]">
                          Month: {availableMonths.find((m) => m.monthKey === filters.selectedMonth)?.label || filters.selectedMonth}
                        </span>
                      )}
                      {filters.startDate && <span className="font-mono"> From {filters.startDate}</span>}
                      {filters.endDate && <span className="font-mono"> To {filters.endDate}</span>}
                    </span>
                  </div>
                  <button
                    onClick={() => setFilters({ ...filters, selectedMonth: 'ALL', startDate: '', endDate: '' })}
                    className="text-[11px] font-bold text-[#ecdf51] hover:underline shrink-0 ml-2"
                  >
                    Reset Dates
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Top Level KPI Cards */}
          <KpiCards metrics={metrics} currency={activeCurrency} />

          {/* Main Tab Content View */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <DataReconciliationWidget
                summary={reconciliationSummary}
                currency={activeCurrency}
              />
              <PipelineSankeyWidget
                deals={filteredDealsList}
                currency={activeCurrency}
              />
              <RepPerformanceWidget
                repData={repPerformance}
                deals={filteredDealsList}
                targets={targets}
                fxConfig={fxConfig}
                currency={activeCurrency}
                unassignedCount={reconciliationSummary.unassignedDealsCount}
                unassignedValue={reconciliationSummary.unassignedDealsValueConverted}
                onOpenSetup={() => setActiveTab('setup')}
              />
              <StalledDealsWidget
                stalledDeals={stalledDeals}
                stageSummaries={stageSummaries}
                stalledThresholdDays={stalledThresholdDays}
                onThresholdChange={setStalledThresholdDays}
                currency={activeCurrency}
              />
              <StagePipelineWidget
                stageSummaries={stageSummaries}
                currency={activeCurrency}
              />
            </div>
          )}

          {activeTab === 'sankey' && (
            <PipelineSankeyWidget
              deals={filteredDealsList}
              currency={activeCurrency}
            />
          )}

          {activeTab === 'reps' && (
            <RepPerformanceWidget
              repData={repPerformance}
              deals={filteredDealsList}
              targets={targets}
              fxConfig={fxConfig}
              currency={activeCurrency}
              unassignedCount={reconciliationSummary.unassignedDealsCount}
              unassignedValue={reconciliationSummary.unassignedDealsValueConverted}
              onOpenSetup={() => setActiveTab('setup')}
            />
          )}

          {activeTab === 'audit' && (
            <DataReconciliationWidget
              summary={reconciliationSummary}
              currency={activeCurrency}
            />
          )}

          {activeTab === 'stalled' && (
            <StalledDealsWidget
              stalledDeals={stalledDeals}
              stageSummaries={stageSummaries}
              stalledThresholdDays={stalledThresholdDays}
              onThresholdChange={setStalledThresholdDays}
              currency={activeCurrency}
            />
          )}

          {activeTab === 'stages' && (
            <div className="space-y-6">
              <PipelineSankeyWidget
                deals={filteredDealsList}
                currency={activeCurrency}
              />
              <StagePipelineWidget
                stageSummaries={stageSummaries}
                currency={activeCurrency}
              />
            </div>
          )}

          {activeTab === 'raw' && (
            <DataExplorerTable
              deals={filteredDealsList}
              currency={activeCurrency}
            />
          )}
        </>
      )}
    </div>
  );
};

